"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Search, Filter, Loader2, X, RefreshCw, ExternalLink, Download } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { utils, writeFile } from 'xlsx';
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";

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
  const satkerConfig = useSatkerConfigContext();
  const satkerNama = useMemo(() => {
    return satkerConfig?.getUserSatkerConfig()?.satker_nama || 'BPS';
  }, [satkerConfig]);
  
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

  // Get user role from localStorage
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    const userData = localStorage.getItem('simaja_user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // Fungsi untuk mengecek apakah user memiliki akses ke fitur spreadsheet dan download
  const canAccessSpreadsheetAndDownload = () => {
    if (!currentUser) return false;
    const allowedRoles = ['Pejabat Pembuat Komitmen', 'Bendahara', 'Pejabat Pengadaan'];
    return allowedRoles.includes(currentUser.role);
  };

  const bulanOptions = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  // Generate tahun options dari 2024 sampai 2030
  const tahunOptions = Array.from({ length: 7 }, (_, i) => (2024 + i).toString());

  // Filter kegiatan berdasarkan search term dari available kegiatan
  const filteredKegiatan = availableKegiatan.filter(kegiatan => 
    kegiatan.toLowerCase().includes(kegiatanSearchTerm.toLowerCase())
  );

  // Fungsi untuk membuka spreadsheet
  const openSpreadsheet = () => {
    // Check if user has permission
    if (!canAccessSpreadsheetAndDownload()) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${currentUser?.role} tidak memiliki izin untuk membuka spreadsheet`,
        variant: "destructive"
      });
      return;
    }
    window.open(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`, '_blank');
  };

  // Fungsi untuk download data yang ditampilkan dalam format Excel
  const downloadFilteredData = () => {
    // Check if user has permission
    if (!canAccessSpreadsheetAndDownload()) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${currentUser?.role} tidak memiliki izin untuk mendownload data Excel`,
        variant: "destructive"
      });
      return;
    }
    if (filteredData.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data yang bisa diunduh",
        variant: "destructive"
      });
      return;
    }
    try {
      // Buat judul berdasarkan filter
      let judul = "Rekap Honor";
      if (selectedBulan && selectedTahun) {
        judul += ` ${selectedBulan} ${selectedTahun}`;
      } else if (selectedBulan) {
        judul += ` ${selectedBulan}`;
      } else if (selectedTahun) {
        judul += ` ${selectedTahun}`;
      }

      // Siapkan data untuk Excel
      const excelData = [];

      // Baris judul
      const titleRow = [judul];
      excelData.push(titleRow);

      // Baris kosong setelah judul
      excelData.push([]);

      // Header kolom
      const headers = displayedColumns.map(col => {
        if (col === 'no') return 'No';
        if (col === 'bulan') return 'Bulan';
        if (col === 'namaPetugas') return 'Nama Petugas';
        if (col === 'namaBank') return 'Nama Bank';
        if (col === 'noRekening') return 'No Rekening';
        return col;
      });
      excelData.push(headers);

      // Data rows
      filteredData.forEach(row => {
        const dataRow = displayedColumns.map(col => {
          const value = row[col];
          if (availableKegiatan.includes(col) && typeof value === 'number') {
            return Number(value);
          }
          return value;
        });
        excelData.push(dataRow);
      });

      // Baris total
      const totalRow = displayedColumns.map(col => {
        if (col === 'no') return 'Total';
        if (col === 'bulan') return '';
        if (col === 'namaPetugas') return `${filteredData.length} Petugas`;
        if (col === 'namaBank' || col === 'noRekening') return '';
        if (availableKegiatan.includes(col)) {
          return Number(totals[col]);
        }
        return '';
      });
      excelData.push(totalRow);

      // Buat worksheet
      const worksheet = utils.aoa_to_sheet(excelData);

      // Atur lebar kolom
      const colWidths = displayedColumns.map(() => ({ width: 15 }));
      worksheet['!cols'] = colWidths;

      // Merge cell untuk judul
      if (!worksheet['!merges']) worksheet['!merges'] = [];
      worksheet['!merges'].push({
        s: { r: 0, c: 0 },
        e: { r: 0, c: displayedColumns.length - 1 }
      });

      // Style untuk judul (center alignment)
      if (!worksheet['A1'].s) {
        worksheet['A1'].s = {
          alignment: { horizontal: 'center' },
          font: { bold: true, sz: 14 }
        };
      }

      // Buat workbook
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Rekap Honor');

      // Generate nama file
      const bulanTahun = selectedBulan && selectedTahun ? `${selectedBulan}_${selectedTahun}` : 'semua_data';
      const kegiatanSuffix = selectedKegiatan.length > 0 ? `_${selectedKegiatan.length}_kegiatan` : '';
      const fileName = `rekap_honor_${bulanTahun}${kegiatanSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download file
      writeFile(workbook, fileName);
      toast({
        title: "Download berhasil",
        description: `Data ${filteredData.length} petugas berhasil diunduh sebagai Excel`
      });
    } catch (error) {
      console.error('Error downloading data:', error);
      toast({
        title: "Error",
        description: "Gagal mengunduh data",
        variant: "destructive"
      });
    }
  };

  // Fetch data dari Google Sheets menggunakan Supabase function - DIPERBAIKI
  const fetchDataFromSheets = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Memulai fetch data dari Google Sheets...');

      // Coba beberapa range yang mungkin
      const rangesToTry = [
        "All-In!A:ZZ",     // Range spesifik worksheet All-In
        "A:Z",             // Range umum worksheet pertama
        "Sheet1!A:ZZ",     // Range worksheet Sheet1
        "All-In"           // Nama worksheet saja
      ];
      let sheetData = null;
      let error = null;

      // Coba setiap range sampai berhasil
      for (const range of rangesToTry) {
        console.log(`🔍 Mencoba range: ${range}`);
        const result = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "read",
            range: range
          }
        });
        if (!result.error && result.data?.values) {
          sheetData = result.data;
          console.log(`✅ Berhasil dengan range: ${range}`);
          break;
        } else {
          error = result.error;
          console.log(`❌ Gagal dengan range: ${range}`, result.error);
        }
      }
      if (!sheetData) {
        throw error || new Error('Tidak ada data ditemukan di spreadsheet dengan range yang dicoba');
      }
      const rows = sheetData.values || [];
      console.log('📊 Data mentah dari Google Sheets:', rows);
      if (rows.length === 0) {
        throw new Error('Tidak ada data ditemukan di spreadsheet');
      }

      // Debug: Tampilkan headers untuk memastikan struktur
      console.log('📋 Headers:', rows[0]);
      console.log('📈 Jumlah baris data:', rows.length - 1);

      // Process data dari Google Sheets dengan handling yang lebih robust
      const headers = rows[0];
      const dataRows = rows.slice(1);
      const processedData: DataRow[] = dataRows
        .filter((row: any[]) => row && row.length > 0) // Filter baris kosong
        .map((row: any[], index: number) => {
          console.log(`📝 Processing row ${index}:`, row);

          // Cari index kolom secara dinamis berdasarkan header
          const getColumnIndex = (possibleHeaders: string[]) => {
            for (const header of possibleHeaders) {
              const index = headers.findIndex((h: string) => 
                h && h.toString().toLowerCase().includes(header.toLowerCase())
              );
              if (index !== -1) return index;
            }
            return -1;
          };

          const noIndex = getColumnIndex(['no', 'nomor']) || 0;
          const bulanIndex = getColumnIndex(['bulan']) || 1;
          const tahunIndex = getColumnIndex(['tahun']) || 2;
          const namaIndex = getColumnIndex(['nama', 'petugas', 'nama petugas']) || 3;
          const bankIndex = getColumnIndex(['bank', 'nama bank']) || 4;
          const rekeningIndex = getColumnIndex(['rekening', 'no rekening', 'norek']) || 5;
          
          const rowData: DataRow = {
            no: parseInt(row[noIndex]) || index + 1,
            bulan: row[bulanIndex] || '',
            tahun: parseInt(row[tahunIndex]) || new Date().getFullYear(),
            namaPetugas: row[namaIndex] || '',
            namaBank: row[bankIndex] || '',
            noRekening: row[rekeningIndex] || ''
          };

          // Tambahkan kolom kegiatan dinamis (mulai dari kolom 6 atau setelah no rekening)
          const startKegiatanIndex = Math.max(rekeningIndex + 1, 6);
          headers.slice(startKegiatanIndex).forEach((header: string, colIndex: number) => {
            if (header && header.trim() !== '') {
              const value = row[startKegiatanIndex + colIndex];
              // Handle berbagai format nilai
              if (value) {
                if (typeof value === 'number') {
                  rowData[header] = value;
                } else if (typeof value === 'string') {
                  const numericValue = parseFloat(value.replace(/[^\d.-]/g, ''));
                  rowData[header] = isNaN(numericValue) ? 0 : numericValue;
                } else {
                  rowData[header] = 0;
                }
              } else {
                rowData[header] = 0;
              }
            }
          });
          console.log(`✅ Processed row ${index}:`, rowData);
          return rowData;
        });

      console.log('🎉 Data berhasil diproses:', processedData);
      setData(processedData);

      // Extract semua kegiatan yang pernah ada (tidak peduli nilai)
      const baseColumns = ['no', 'bulan', 'tahun', 'namaPetugas', 'namaBank', 'noRekening'];
      const semuaKegiatan = [...new Set(
        processedData.flatMap(item => 
          Object.keys(item).filter(key => !baseColumns.includes(key))
        )
      )];
      setAllKegiatan(semuaKegiatan);
      console.log('📋 Semua kegiatan:', semuaKegiatan);

      // Set available kegiatan awal dari semua data yang memiliki nilai > 0
      const kegiatanDenganNilai = [...new Set(
        processedData.flatMap(item => 
          Object.keys(item).filter(key => 
            !baseColumns.includes(key) && 
            typeof item[key] === 'number' && 
            item[key] > 0
          )
        )
      )];
      setAvailableKegiatan(kegiatanDenganNilai);
      console.log('✅ Kegiatan dengan nilai:', kegiatanDenganNilai);
      
      toast({
        title: "Data berhasil dimuat",
        description: `Berhasil memuat ${processedData.length} data dari Google Sheets`
      });
    } catch (error: any) {
      console.error('❌ Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal memuat data dari Google Sheets",
        variant: "destructive"
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
    const relevantKegiatan = [...new Set(
      filteredByBulanTahun.flatMap(item => 
        Object.keys(item).filter(key => 
          !baseColumns.includes(key) && 
          typeof item[key] === 'number' && 
          item[key] > 0
        )
      )
    )];
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
    const baseColumns = ['no', 'bulan', 'namaPetugas', 'namaBank', 'noRekening'];

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
      } else if (column !== 'bulan' && column !== 'namaPetugas' && column !== 'namaBank' && column !== 'noRekening') {
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
          <h1 className="text-3xl font-bold text-red-500">Kecap to Bendahara</h1>
          <p className="text-muted-foreground mt-2">
            Rekap Honor Bulanan Mitra Statistik {satkerNama}
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button 
            variant="outline" 
            onClick={openSpreadsheet} 
            className="flex items-center gap-2" 
            disabled={!canAccessSpreadsheetAndDownload()}
          >
            <ExternalLink className="h-4 w-4" />
            Buka Spreadsheet
            {!canAccessSpreadsheetAndDownload() && " (Restricted)"}
          </Button>
          <Button 
            onClick={downloadFilteredData} 
            disabled={filteredData.length === 0 || isLoading || !canAccessSpreadsheetAndDownload()} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Excel
            {!canAccessSpreadsheetAndDownload() && " (Restricted)"}
          </Button>
          <Button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2">
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isRefreshing ? "Memuat..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Informasi Akses untuk Role yang Tidak Bisa Akses Spreadsheet/Download */}
      {!canAccessSpreadsheetAndDownload() && currentUser && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Informasi Akses Terbatas
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Anda login sebagai <strong>{currentUser.role}</strong>. Akses fitur spreadsheet/download excel hanya tersedia untuk role Pejabat Pembuat Komitmen, Bendahara, atau Pejabat Pengadaan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-9" 
              />
            </div>

            <Select value={selectedBulan} onValueChange={setSelectedBulan}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                {bulanOptions.map(bulan => (
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
                {tahunOptions.map(tahun => (
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
                onChange={e => setKegiatanSearchTerm(e.target.value)} 
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
                filteredKegiatan.map(kegiatan => (
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
                  {selectedKegiatan.map(kegiatan => (
                    <Badge key={kegiatan} variant="secondary" className="px-2 py-0 text-xs">
                      {kegiatan}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleKegiatan(kegiatan)} />
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
            Data rekap honor bulanan mitra statistik {satkerNama}
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
                      {displayedColumns.map(column => (
                        <TableHead 
                          key={column} 
                          className={`font-bold ${availableKegiatan.includes(column) ? 'text-right' : ''}`}
                        >
                          {column === 'no' ? 'No' : 
                           column === 'bulan' ? 'Bulan' : 
                           column === 'namaPetugas' ? 'Nama Petugas' : 
                           column === 'namaBank' ? 'Nama Bank' : 
                           column === 'noRekening' ? 'No Rekening' : 
                           column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map(row => (
                      <TableRow key={row.no} className="hover:bg-muted/50">
                        {displayedColumns.map(column => (
                          <TableCell 
                            key={column} 
                            className={availableKegiatan.includes(column) ? 'font-medium text-right' : ''}
                          >
                            {column === 'no' ? row[column] : 
                             availableKegiatan.includes(column) && typeof row[column] === 'number' 
                               ? formatPlainNumber(Number(row[column])) // Format plain untuk baris data
                               : row[column]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    
                    {/* Baris Total */}
                    <TableRow className="bg-muted/50 font-bold">
                      {displayedColumns.map(column => (
                        <TableCell 
                          key={`total-${column}`} 
                          className={availableKegiatan.includes(column) ? 'text-right' : ''}
                        >
                          {column === 'no' ? 'Total' : 
                           column === 'bulan' ? '' : 
                           column === 'namaPetugas' ? `${filteredData.length} Petugas` : 
                           column === 'namaBank' || column === 'noRekening' ? '' : 
                           availableKegiatan.includes(column) ? formatNumber(totals[column]) // Format dengan pemisah ribuan untuk total
                           : ''}
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