"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Search, Filter, Loader2, X, RefreshCw, ExternalLink } from "lucide-react";
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
  const [allKegiatan, setAllKegiatan] = useState<string[]>([]);
  const [kegiatanSearchTerm, setKegiatanSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const bulanOptions = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Generate tahun options dari 2024 sampai 2030
  const tahunOptions = Array.from({ length: 7 }, (_, i) => (2024 + i).toString());

  // Filter kegiatan berdasarkan search term dari available kegiatan
  const filteredKegiatan = availableKegiatan.filter(kegiatan =>
    kegiatan.toLowerCase().includes(kegiatanSearchTerm.toLowerCase())
  );

  // Fungsi untuk membuka spreadsheet
  const openSpreadsheet = () => {
    window.open(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`, '_blank');
  };

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
        };

        // Tambahkan kolom kegiatan dinamis (mulai dari kolom 7)
        headers.slice(7).forEach((header: string, colIndex: number) => {
          const value = row[7 + colIndex];
          rowData[header] = value ? parseInt(value) : 0;
        });

        return rowData;
      });

      setData(processedData);
      
      // Extract semua kegiatan yang pernah ada (tidak peduli nilai)
      const baseColumns = ['no', 'bulan', 'tahun', 'namaPetugas', 'namaBank', 'noRekening'];
      const semuaKegiatan = [...new Set(processedData.flatMap(item => 
        Object.keys(item).filter(key => !baseColumns.includes(key))
      ))];
      setAllKegiatan(semuaKegiatan);

      // Set available kegiatan awal dari semua data yang memiliki nilai > 0
      const kegiatanDenganNilai = [...new Set(processedData.flatMap(item => 
        Object.keys(item).filter(key => 
          !baseColumns.includes(key) && 
          typeof item[key] === 'number' && 
          item[key] > 0
        )
      ))];
      setAvailableKegiatan(kegiatanDenganNilai);

      toast({
        title: "Data berhasil dimuat",
        description: `Berhasil memuat ${processedData.length} data dari Google Sheets`,
      });
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal memuat data dari Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fungsi refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDataFromSheets();
  };

  useEffect(() => {
    fetchDataFromSheets();
  }, []);

  // Update available kegiatan berdasarkan bulan dan tahun yang dipilih
  useEffect(() => {
    if (data.length === 0) return;

    let filteredByBulanTahun = data;

    // Filter berdasarkan bulan jika dipilih
    if (selectedBulan) {
      filteredByBulanTahun = filteredByBulanTahun.filter(item => item.bulan === selectedBulan);
    }

    // Filter berdasarkan tahun jika dipilih
    if (selectedTahun) {
      filteredByBulanTahun = filteredByBulanTahun.filter(item => item.tahun.toString() === selectedTahun);
    }

    // Jika tidak ada filter bulan dan tahun, gunakan semua data
    if (!selectedBulan && !selectedTahun) {
      filteredByBulanTahun = data;
    }

    // Dapatkan kegiatan yang memiliki nilai > 0 pada data yang sudah difilter bulan/tahun
    const baseColumns = ['no', 'bulan', 'tahun', 'namaPetugas', 'namaBank', 'noRekening'];
    const relevantKegiatan = [...new Set(filteredByBulanTahun.flatMap(item => 
      Object.keys(item).filter(key => 
        !baseColumns.includes(key) && 
        typeof item[key] === 'number' && 
        item[key] > 0
      )
    ))];

    setAvailableKegiatan(relevantKegiatan);

    // Hapus selectedKegiatan yang tidak relevan lagi dengan filter bulan/tahun
    if (selectedKegiatan.length > 0) {
      const filteredSelectedKegiatan = selectedKegiatan.filter(kegiatan => 
        relevantKegiatan.includes(kegiatan)
      );
      if (filteredSelectedKegiatan.length !== selectedKegiatan.length) {
        setSelectedKegiatan(filteredSelectedKegiatan);
      }
    }
  }, [selectedBulan, selectedTahun, data, selectedKegiatan]);

  // Filter data berdasarkan search, bulan, tahun, dan kegiatan
  useEffect(() => {
    let result = data;

    // Validasi: jika bulan dipilih, tahun harus dipilih
    if (selectedBulan && !selectedTahun) {
      setFilteredData([]);
      return;
    }

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

    // Filter data berdasarkan kegiatan yang dipilih
    if (selectedKegiatan.length > 0) {
      // Hanya tampilkan baris yang memiliki nilai > 0 pada minimal satu kegiatan yang dipilih
      result = result.filter(item => {
        return selectedKegiatan.some(kegiatan => 
          typeof item[kegiatan] === 'number' && item[kegiatan] > 0
        );
      });
    } else {
      // Jika tidak ada kegiatan yang dipilih, tampilkan semua data yang memiliki minimal satu kegiatan dengan nilai > 0
      const baseColumns = ['no', 'bulan', 'tahun', 'namaPetugas', 'namaBank', 'noRekening'];
      result = result.filter(item => {
        const kegiatanColumns = Object.keys(item).filter(key => !baseColumns.includes(key));
        return kegiatanColumns.some(kegiatan => 
          typeof item[kegiatan] === 'number' && item[kegiatan] > 0
        );
      });
    }

    // Update nomor urut secara dinamis
    const resultWithDynamicNo = result.map((item, index) => ({
      ...item,
      no: index + 1
    }));

    setFilteredData(resultWithDynamicNo);

  }, [searchTerm, selectedBulan, selectedTahun, selectedKegiatan, data]);

  // Reset semua filter
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBulan("");
    setSelectedTahun("");
    setSelectedKegiatan([]);
    setKegiatanSearchTerm("");
  };

  // Reset hanya filter kegiatan
  const resetKegiatanFilter = () => {
    setSelectedKegiatan([]);
    setKegiatanSearchTerm("");
  };

  // Toggle kegiatan selection
  const toggleKegiatan = (kegiatan: string) => {
    setSelectedKegiatan(prev => 
      prev.includes(kegiatan) 
        ? prev.filter(k => k !== kegiatan)
        : [...prev, kegiatan]
    );
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

  // Format untuk baris data (tanpa pemisah ribuan)
  const formatPlainNumber = (amount: number) => {
    return amount.toString();
  };

  // Hitung total untuk setiap kolom
  const calculateTotals = () => {
    const totals: { [key: string]: number } = {};
    
    displayedColumns.forEach(column => {
      if (column === 'no') {
        totals[column] = filteredData.length;
      } else if (column !== 'namaPetugas' && column !== 'namaBank' && column !== 'noRekening') {
        totals[column] = filteredData.reduce((sum, item) => {
          const value = item[column];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
      } else {
        totals[column] = 0;
      }
    });
    
    return totals;
  };

  const displayedColumns = getDisplayedColumns();
  const totals = calculateTotals();

  // Hitung total keseluruhan dari semua kolom kegiatan
  const totalKeseluruhan = displayedColumns
    .filter(column => availableKegiatan.includes(column))
    .reduce((sum, column) => sum + totals[column], 0);

  // Dapatkan judul tabel berdasarkan filter dengan warna merah untuk bulan dan tahun
  const getTableTitle = () => {
    let title = "Rekap Honor";
    let hasFilter = false;
    let bulanTahunText = "";
    
    if (selectedBulan && selectedTahun) {
      bulanTahunText = ` ${selectedBulan} ${selectedTahun}`;
      hasFilter = true;
    } else if (selectedBulan) {
      bulanTahunText = ` ${selectedBulan}`;
      hasFilter = true;
    } else if (selectedTahun) {
      bulanTahunText = ` ${selectedTahun}`;
      hasFilter = true;
    }
    
    return { title, bulanTahunText, hasFilter };
  };

  const tableTitle = getTableTitle();

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
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button 
            variant="outline"
            onClick={openSpreadsheet}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Buka Spreadsheet
          </Button>
          <Button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRefreshing ? "Memuat..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filter Data
          </CardTitle>
          {selectedBulan && !selectedTahun && (
            <p className="text-sm text-red-500 font-medium">
              Pilih tahun terlebih dahulu untuk menampilkan data
            </p>
          )}
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

          {/* Filter Kegiatan */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Pilih Kegiatan yang Ditampilkan:</label>
              {selectedKegiatan.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetKegiatanFilter} className="h-8">
                  <X className="h-3 w-3 mr-1" />
                  Hapus Semua
                </Button>
              )}
            </div>

            {/* Search untuk Kegiatan */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kegiatan..."
                value={kegiatanSearchTerm}
                onChange={(e) => setKegiatanSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 min-h-[40px] max-h-32 overflow-y-auto p-1">
              {availableKegiatan.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Memuat kegiatan..." : "Tidak ada kegiatan tersedia untuk filter yang dipilih"}
                </p>
              ) : filteredKegiatan.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tidak ada kegiatan yang cocok dengan pencarian
                </p>
              ) : (
                filteredKegiatan.map((kegiatan) => (
                  <Badge
                    key={kegiatan}
                    variant={selectedKegiatan.includes(kegiatan) ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1"
                    onClick={() => toggleKegiatan(kegiatan)}
                  >
                    {kegiatan}
                  </Badge>
                ))
              )}
            </div>
            
            {selectedKegiatan.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Kegiatan yang dipilih ({selectedKegiatan.length}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedKegiatan.map((kegiatan) => (
                    <Badge key={kegiatan} variant="secondary" className="px-2 py-0 text-xs">
                      {kegiatan}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => toggleKegiatan(kegiatan)}
                      />
                    </Badge>
                  ))}
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
              <CardTitle>
                {tableTitle.title}
                {tableTitle.hasFilter && (
                  <span className="text-red-500 ml-1">{tableTitle.bulanTahunText}</span>
                )}
              </CardTitle>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {filteredData.length} petugas
              {selectedKegiatan.length > 0 && ` • ${selectedKegiatan.length} kegiatan • ${formatNumber(totalKeseluruhan)}`}
            </div>
          </div>
          <CardDescription>
            Data rekap honor bulanan mitra statistik BPS Kabupaten Majalengka
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedBulan && !selectedTahun ? (
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">Pilih tahun terlebih dahulu untuk menampilkan data</p>
            </div>
          ) : isLoading ? (
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
                      {displayedColumns.map((column) => (
                        <TableHead 
                          key={column}
                          className={`font-bold ${availableKegiatan.includes(column) ? 'text-right' : ''}`}
                        >
                          {column === 'no' ? 'No' : 
                           column === 'namaPetugas' ? 'Nama Petugas' :
                           column === 'namaBank' ? 'Nama Bank' :
                           column === 'noRekening' ? 'No Rekening' : column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => (
                      <TableRow key={row.no} className="hover:bg-muted/50">
                        {displayedColumns.map((column) => (
                          <TableCell 
                            key={column}
                            className={availableKegiatan.includes(column) ? 'font-medium text-right' : ''}
                          >
                            {column === 'no' ? row[column] :
                             availableKegiatan.includes(column) && typeof row[column] === 'number'
                              ? formatPlainNumber(Number(row[column])) // Format plain untuk baris data
                              : row[column]
                            }
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    
                    {/* Baris Total */}
                    <TableRow className="bg-muted/50 font-bold">
                      {displayedColumns.map((column) => (
                        <TableCell 
                          key={`total-${column}`}
                          className={availableKegiatan.includes(column) ? 'text-right' : ''}
                        >
                          {column === 'no' ? 'Total' :
                           column === 'namaPetugas' ? `${filteredData.length} Petugas` :
                           column === 'namaBank' || column === 'noRekening' ? '' :
                           availableKegiatan.includes(column) 
                             ? formatNumber(totals[column]) // Format dengan pemisah ribuan untuk total
                             : ''
                          }
                        </TableCell>
                      ))}
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