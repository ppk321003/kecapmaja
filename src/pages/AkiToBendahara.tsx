"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Search, Filter, Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DataRow {
  no: number;
  bulan: string;
  tahun: number;
  namaPetugas: string;
  namaBank: string;
  noRekening: string;
  jumlah: number;
  [key: string]: string | number;
}

const SPREADSHEET_ID = "1XtWKO61yo5WhtsisPUNO-xsT3z1CfUF2C7B0Kbpnj88";

export default function AkiToBendahara() {
  const [data, setData] = useState<DataRow[]>([]);
  const [filteredData, setFilteredData] = useState<DataRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBulan, setSelectedBulan] = useState("");
  const [selectedTahun, setSelectedTahun] = useState("");
  const [selectedKegiatan, setSelectedKegiatan] = useState("");
  const [availableKegiatan, setAvailableKegiatan] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const bulanOptions = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Fetch data dari Google Sheets menggunakan Supabase function
  const fetchDataFromSheets = async () => {
    try {
      setIsLoading(true);
      
      const { data: sheetData, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "All-In",
        },
      });

      if (error) throw error;

      const rows = sheetData.values || [];
      
      if (rows.length === 0) {
        throw new Error('Tidak ada data ditemukan di spreadsheet');
      }

      // Process data dari Google Sheets
      const headers = rows[0];
      const dataRows = rows.slice(1);

      const processedData: DataRow[] = dataRows.map((row: any[], index: number) => {
        const rowData: DataRow = {
          no: parseInt(row[0]) || index + 1,
          bulan: row[1] || '',
          tahun: parseInt(row[2]) || 0,
          namaPetugas: row[3] || '',
          namaBank: row[4] || '',
          noRekening: row[5] || '',
          jumlah: parseInt(row[6]) || 0,
        };

        // Tambahkan kolom kegiatan dinamis
        headers.slice(7).forEach((header: string, colIndex: number) => {
          const value = row[7 + colIndex];
          rowData[header] = value ? parseInt(value) : 0;
        });

        return rowData;
      });

      setData(processedData);
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal memuat data dari Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFromSheets();
  }, []);

  // Extract tahun unik dari data untuk filter
  const tahunOptions = [...new Set(data.map(item => item.tahun.toString()))]
    .filter(tahun => tahun !== "0")
    .sort((a, b) => parseInt(b) - parseInt(a));

  // Update available kegiatan dan filter data berdasarkan bulan dan tahun
  useEffect(() => {
    let result = data;

    // Filter berdasarkan bulan
    if (selectedBulan) {
      result = result.filter(item => item.bulan === selectedBulan);
    }

    // Filter berdasarkan tahun
    if (selectedTahun) {
      result = result.filter(item => item.tahun.toString() === selectedTahun);
    }

    // Filter berdasarkan search term
    if (searchTerm) {
      result = result.filter(item =>
        item.namaPetugas.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredData(result);

    // Update available kegiatan berdasarkan data yang terfilter
    if (result.length > 0 && (selectedBulan || selectedTahun)) {
      const baseColumns = ['no', 'bulan', 'tahun', 'namaPetugas', 'namaBank', 'noRekening', 'jumlah'];
      
      // Dapatkan kegiatan yang memiliki nilai (tidak semua 0) pada data terfilter
      const kegiatanWithValues: string[] = [];
      const allKegiatan = new Set<string>();

      // Kumpulkan semua kegiatan yang ada
      result.forEach(item => {
        Object.keys(item).forEach(key => {
          if (!baseColumns.includes(key)) {
            allKegiatan.add(key);
          }
        });
      });

      // Filter hanya kegiatan yang memiliki nilai > 0
      allKegiatan.forEach(kegiatan => {
        const hasValue = result.some(item => {
          const value = item[kegiatan];
          return typeof value === 'number' && value > 0;
        });
        if (hasValue) {
          kegiatanWithValues.push(kegiatan);
        }
      });

      setAvailableKegiatan(kegiatanWithValues);
      
      // Reset selectedKegiatan jika tidak ada di availableKegiatan
      if (selectedKegiatan && !kegiatanWithValues.includes(selectedKegiatan)) {
        setSelectedKegiatan("");
      }
    } else {
      setAvailableKegiatan([]);
      setSelectedKegiatan("");
    }
  }, [searchTerm, selectedBulan, selectedTahun, data]);

  // Reset semua filter
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBulan("");
    setSelectedTahun("");
    setSelectedKegiatan("");
  };

  // Format number tanpa currency symbol
  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
  };

  const totalJumlah = filteredData.reduce((sum, item) => sum + item.jumlah, 0);

  // Hitung total untuk setiap kolom kegiatan yang dipilih
  const getTotalForKegiatan = (kegiatan: string) => {
    return filteredData.reduce((sum, item) => sum + (Number(item[kegiatan]) || 0), 0);
  };

  const handleExport = () => {
    toast({
      title: "Fitur Export",
      description: "Fitur export Excel akan segera tersedia",
    });
  };

  // Get kolom yang akan ditampilkan di table
  const getDisplayedColumns = () => {
    const baseColumns = ['no', 'namaPetugas', 'namaBank', 'noRekening', 'jumlah'];
    
    // Jika tidak ada kegiatan yang dipilih, hanya tampilkan kolom dasar
    if (!selectedKegiatan) {
      return baseColumns;
    }
    
    // Tampilkan kolom dasar + kegiatan yang dipilih
    return [...baseColumns, selectedKegiatan];
  };

  const displayedColumns = getDisplayedColumns();
  
  // Buat judul tabel berdasarkan filter
  const getTableTitle = () => {
    let title = "Rekap Honor";
    if (selectedBulan || selectedTahun) {
      title += " - ";
      if (selectedBulan) title += selectedBulan;
      if (selectedBulan && selectedTahun) title += " ";
      if (selectedTahun) title += selectedTahun;
    }
    return title;
  };

  // Cek apakah ada data yang ditampilkan
  const hasDataToShow = filteredData.length > 0 && (selectedBulan || selectedTahun);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Aki to Bendahara</h1>
          <p className="text-muted-foreground mt-2">
            Rekap Honor Bulanan Mitra Statistik BPS Kabupaten Majalengka
          </p>
        </div>
        <Button onClick={handleExport} className="mt-4 sm:mt-0">
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari Nama Petugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedBulan} onValueChange={setSelectedBulan}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                {bulanOptions.map((bulan) => (
                  <SelectItem key={bulan} value={bulan}>
                    {bulan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTahun} onValueChange={setSelectedTahun}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                {tahunOptions.map((tahun) => (
                  <SelectItem key={tahun} value={tahun}>
                    {tahun}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={resetFilters}>
              Reset Filter
            </Button>
          </div>

          {/* Filter Kegiatan */}
          <div className="mt-4">
            <Select value={selectedKegiatan} onValueChange={setSelectedKegiatan}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Kegiatan yang Ditampilkan" />
              </SelectTrigger>
              <SelectContent>
                {availableKegiatan.length === 0 ? (
                  <SelectItem value="" disabled>
                    {selectedBulan || selectedTahun ? "Tidak ada kegiatan tersedia" : "Pilih bulan dan tahun terlebih dahulu"}
                  </SelectItem>
                ) : (
                  availableKegiatan.map((kegiatan) => (
                    <SelectItem key={kegiatan} value={kegiatan}>
                      {kegiatan}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <CardTitle>{getTableTitle()}</CardTitle>
            </div>
            {hasDataToShow && (
              <div className="text-sm text-muted-foreground">
                Total: {filteredData.length} petugas
              </div>
            )}
          </div>
          <CardDescription>
            {hasDataToShow 
              ? "Data rekap honor bulanan mitra statistik BPS Kabupaten Majalengka"
              : "Silakan pilih bulan dan tahun untuk menampilkan data"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground mt-2">Memuat data dari Google Sheets...</p>
              </div>
            </div>
          ) : !hasDataToShow ? (
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <div className="text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Data Belum Ditampilkan</p>
                <p className="text-sm mt-2">Pilih bulan dan tahun terlebih dahulu untuk melihat data rekap honor</p>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">Tidak ada data yang ditemukan untuk filter yang dipilih</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      {displayedColumns.map((column, index) => {
                        const isSticky = index < 4; // Kolom no sampai noRekening sticky
                        const stickyWidths = ['50px', '200px', '80px', '150px'];
                        
                        return (
                          <TableHead 
                            key={column}
                            className={`
                              ${isSticky ? 'sticky bg-muted z-10 border-r' : ''}
                              ${column === 'namaBank' ? 'w-[80px]' : ''}
                              ${column === 'jumlah' || column === selectedKegiatan ? 'text-right' : ''}
                            `}
                            style={
                              isSticky ? { 
                                left: index === 0 ? 0 : `calc(${stickyWidths.slice(0, index).reduce((sum, width) => sum + parseInt(width), 0)}px)`
                              } : {}
                            }
                          >
                            {column === 'no' ? 'No' : 
                             column === 'namaPetugas' ? 'Nama Petugas' :
                             column === 'namaBank' ? 'Nama Bank' :
                             column === 'noRekening' ? 'No Rekening' :
                             column === 'jumlah' ? 'Jumlah' : column}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => (
                      <TableRow key={row.no} className="hover:bg-muted/50">
                        {displayedColumns.map((column, colIndex) => {
                          const isSticky = colIndex < 4;
                          const stickyWidths = ['50px', '200px', '80px', '150px'];
                          
                          return (
                            <TableCell 
                              key={column}
                              className={`
                                ${isSticky ? 'sticky bg-background border-r' : ''}
                                ${column === 'jumlah' || column === selectedKegiatan ? 'font-medium text-right' : ''}
                                ${column === 'namaBank' ? 'w-[80px]' : ''}
                              `}
                              style={
                                isSticky ? { 
                                  left: colIndex === 0 ? 0 : `calc(${stickyWidths.slice(0, colIndex).reduce((sum, width) => sum + parseInt(width), 0)}px)`
                                } : {}
                              }
                            >
                              {column === 'jumlah' || column === selectedKegiatan
                                ? formatNumber(Number(row[column]))
                                : row[column]
                              }
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    
                    {/* Baris Total */}
                    <TableRow className="bg-muted/50 font-bold">
                      {displayedColumns.map((column, colIndex) => {
                        const isSticky = colIndex < 4;
                        const stickyWidths = ['50px', '200px', '80px', '150px'];
                        
                        return (
                          <TableCell 
                            key={column}
                            className={`
                              ${isSticky ? 'sticky bg-muted border-r z-10' : ''}
                              ${column === 'jumlah' || column === selectedKegiatan ? 'text-right font-bold' : ''}
                            `}
                            style={
                              isSticky ? { 
                                left: colIndex === 0 ? 0 : `calc(${stickyWidths.slice(0, colIndex).reduce((sum, width) => sum + parseInt(width), 0)}px)`
                              } : {}
                            }
                          >
                            {column === 'no' ? 'Total' : 
                             column === 'namaPetugas' ? '' :
                             column === 'namaBank' ? '' :
                             column === 'noRekening' ? '' :
                             column === 'jumlah' ? formatNumber(totalJumlah) :
                             column === selectedKegiatan ? formatNumber(getTotalForKegiatan(selectedKegiatan)) : ''}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}