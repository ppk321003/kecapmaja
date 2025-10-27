"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Search, Filter, Download, Loader2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

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
  const [selectedKegiatan, setSelectedKegiatan] = useState<string[]>([]);
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
      console.log('Memulai fetch data...');
      
      const { data: sheetData, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "All-In",
        },
      });

      if (error) {
        console.error('Error dari Supabase:', error);
        throw error;
      }

      console.log('Data dari Supabase:', sheetData);

      const rows = sheetData?.values || [];
      
      if (rows.length === 0) {
        console.warn('Tidak ada data ditemukan di spreadsheet');
        throw new Error('Tidak ada data ditemukan di spreadsheet');
      }

      console.log('Jumlah baris:', rows.length);
      console.log('Header:', rows[0]);

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
          rowData[header] = value ? parseInt(value) || 0 : 0;
        });

        return rowData;
      });

      console.log('Data yang diproses:', processedData);
      setData(processedData);
      setFilteredData(processedData);
      
      // Extract available kegiatan dari semua data
      const baseColumns = ['no', 'bulan', 'tahun', 'namaPetugas', 'namaBank', 'noRekening', 'jumlah'];
      const allKegiatan = [...new Set(processedData.flatMap(item => 
        Object.keys(item).filter(key => !baseColumns.includes(key))
      ))];
      
      console.log('Kegiatan tersedia:', allKegiatan);
      setAvailableKegiatan(allKegiatan);
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal memuat data dari Google Sheets",
        variant: "destructive",
      });
      
      // Set data dummy untuk testing jika fetch gagal
      const dummyData: DataRow[] = [
        {
          no: 1,
          bulan: "Januari",
          tahun: 2024,
          namaPetugas: "John Doe",
          namaBank: "BCA",
          noRekening: "1234567890",
          jumlah: 1000000,
          "Kegiatan A": 500000,
          "Kegiatan B": 500000,
        },
        {
          no: 2,
          bulan: "Januari",
          tahun: 2024,
          namaPetugas: "Jane Smith",
          namaBank: "BRI",
          noRekening: "0987654321",
          jumlah: 1500000,
          "Kegiatan A": 750000,
          "Kegiatan C": 750000,
        }
      ];
      
      setData(dummyData);
      setFilteredData(dummyData);
      setAvailableKegiatan(["Kegiatan A", "Kegiatan B", "Kegiatan C"]);
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

  // Filter data berdasarkan search, bulan, tahun, dan kegiatan
  useEffect(() => {
    let result = data;

    // Filter berdasarkan search term
    if (searchTerm) {
      result = result.filter(item =>
        item.namaPetugas.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter berdasarkan bulan
    if (selectedBulan) {
      result = result.filter(item => item.bulan === selectedBulan);
    }

    // Filter berdasarkan tahun
    if (selectedTahun) {
      result = result.filter(item => item.tahun.toString() === selectedTahun);
    }

    console.log('Data setelah filter:', result);
    setFilteredData(result);
  }, [searchTerm, selectedBulan, selectedTahun, data]);

  // Reset semua filter
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBulan("");
    setSelectedTahun("");
    setSelectedKegiatan([]);
  };

  // Get kolom yang akan ditampilkan di table
  const getDisplayedColumns = () => {
    const baseColumns = ['no', 'namaPetugas', 'namaBank', 'noRekening'];
    
    // Jika tidak ada kegiatan yang dipilih, hanya tampilkan kolom dasar
    if (selectedKegiatan.length === 0) {
      return baseColumns;
    }
    
    // Tampilkan kolom dasar + kegiatan yang dipilih
    return [...baseColumns, ...selectedKegiatan];
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
  };

  // Hitung total untuk setiap kolom
  const calculateTotals = () => {
    const totals: { [key: string]: number } = {};
    
    displayedColumns.forEach(column => {
      if (column !== 'no' && column !== 'namaPetugas' && column !== 'namaBank' && column !== 'noRekening') {
        totals[column] = filteredData.reduce((sum, item) => {
          const value = item[column];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
      }
    });
    
    return totals;
  };

  const handleExport = () => {
    toast({
      title: "Fitur Export",
      description: "Fitur export Excel akan segera tersedia",
    });
  };

  const displayedColumns = getDisplayedColumns();
  const totals = calculateTotals();

  // Dapatkan judul tabel berdasarkan filter
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

  console.log('Rendered dengan:', {
    dataLength: data.length,
    filteredDataLength: filteredData.length,
    displayedColumns,
    selectedKegiatan,
    availableKegiatan
  });

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
        <CardContent className="space-y-4">
          {/* Filter Basic */}
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
              Reset Semua
            </Button>
          </div>

          {/* Filter Kegiatan - Dropdown */}
          <div className="border-t pt-4">
            <label className="text-sm font-medium mb-2 block">
              Pilih Kegiatan yang Ditampilkan:
            </label>
            <Select 
              value="" 
              onValueChange={(value) => {
                if (value && !selectedKegiatan.includes(value)) {
                  setSelectedKegiatan([...selectedKegiatan, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih kegiatan untuk ditampilkan" />
              </SelectTrigger>
              <SelectContent>
                {availableKegiatan.length === 0 ? (
                  <SelectItem value="" disabled>
                    {isLoading ? "Memuat kegiatan..." : "Tidak ada kegiatan tersedia"}
                  </SelectItem>
                ) : (
                  availableKegiatan
                    .filter(kegiatan => !selectedKegiatan.includes(kegiatan))
                    .map((kegiatan) => (
                      <SelectItem key={kegiatan} value={kegiatan}>
                        {kegiatan}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            
            {/* Tampilkan kegiatan yang sudah dipilih */}
            {selectedKegiatan.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Kegiatan yang dipilih ({selectedKegiatan.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedKegiatan.map((kegiatan) => (
                    <Badge key={kegiatan} variant="secondary" className="px-3 py-1 flex items-center gap-1">
                      {kegiatan}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setSelectedKegiatan(selectedKegiatan.filter(k => k !== kegiatan))}
                      />
                    </Badge>
                  ))}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedKegiatan([])} 
                    className="h-6 text-xs"
                  >
                    Hapus Semua
                  </Button>
                </div>
              </div>
            )}
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
            <div className="text-sm text-muted-foreground">
              Total: {filteredData.length} petugas
              {selectedKegiatan.length > 0 && ` • ${selectedKegiatan.length} kegiatan`}
            </div>
          </div>
          <CardDescription>
            Data rekap honor bulanan mitra statistik BPS Kabupaten Majalengka
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
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">Tidak ada data yang ditemukan</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      {displayedColumns.map((column, index) => {
                        const isSticky = index < 4;
                        const stickyWidths = ['80px', '250px', '150px', '180px'];
                        
                        return (
                          <TableHead 
                            key={column}
                            className={`
                              ${isSticky ? 'sticky bg-muted z-10 border-r' : ''}
                              font-medium whitespace-nowrap
                            `}
                            style={
                              isSticky ? { 
                                left: index === 0 ? 0 : `calc(${stickyWidths.slice(0, index).reduce((sum, width) => sum + parseInt(width), 0)}px)`,
                                minWidth: stickyWidths[index] || '200px'
                              } : { minWidth: '150px' }
                            }
                          >
                            {column === 'no' ? 'No' : 
                             column === 'namaPetugas' ? 'Nama Petugas' :
                             column === 'namaBank' ? 'Nama Bank' :
                             column === 'noRekening' ? 'No Rekening' : column}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row, rowIndex) => (
                      <TableRow key={row.no} className="hover:bg-muted/50">
                        {displayedColumns.map((column, colIndex) => {
                          const isSticky = colIndex < 4;
                          const stickyWidths = ['80px', '250px', '150px', '180px'];
                          
                          return (
                            <TableCell 
                              key={column}
                              className={`
                                ${isSticky ? 'sticky bg-background border-r' : ''}
                                ${availableKegiatan.includes(column) ? 'text-right' : ''}
                                whitespace-nowrap
                              `}
                              style={
                                isSticky ? { 
                                  left: colIndex === 0 ? 0 : `calc(${stickyWidths.slice(0, colIndex).reduce((sum, width) => sum + parseInt(width), 0)}px)`,
                                  minWidth: stickyWidths[colIndex] || '200px'
                                } : { minWidth: '150px' }
                              }
                            >
                              {availableKegiatan.includes(column) && typeof row[column] === 'number' 
                                ? formatNumber(Number(row[column]))
                                : row[column]
                              }
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    
                    {/* Baris Total */}
                    <TableRow className="bg-muted/50 font-medium">
                      {displayedColumns.map((column, colIndex) => {
                        const isSticky = colIndex < 4;
                        const stickyWidths = ['80px', '250px', '150px', '180px'];
                        
                        return (
                          <TableCell 
                            key={column}
                            className={`
                              ${isSticky ? 'sticky bg-muted border-r z-10' : ''}
                              ${availableKegiatan.includes(column) ? 'text-right' : ''}
                              font-bold whitespace-nowrap
                            `}
                            style={
                              isSticky ? { 
                                left: colIndex === 0 ? 0 : `calc(${stickyWidths.slice(0, colIndex).reduce((sum, width) => sum + parseInt(width), 0)}px)`,
                                minWidth: stickyWidths[colIndex] || '200px'
                              } : { minWidth: '150px' }
                            }
                          >
                            {column === 'no' ? 'Total' : 
                             column === 'namaPetugas' ? '' :
                             column === 'namaBank' ? '' :
                             column === 'noRekening' ? '' : 
                             availableKegiatan.includes(column) ? formatNumber(totals[column] || 0) : ''}
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