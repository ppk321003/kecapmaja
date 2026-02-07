import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search, Loader2, RefreshCw, Download, Zap, ExternalLink } from "lucide-react";
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

interface KegiatanSPJData {
  no: number;
  namaKegiatan: string;
  penanggungjawab: string;
  jumlahPetugas: number;
  jenisPekerjaan: 'Petugas Pendataan Lapangan' | 'Petugas Pemeriksaan Lapangan' | 'Petugas Pengolahan';
  nilaiRealisasi: number;
  status: 'Kirim PPK' | 'Belum Kirim PPK';
  link?: string;
  [key: string]: string | number | undefined;
}

const TUGAS_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";

export default function GenerateSPJHonorMitra() {
  const satkerConfig = useSatkerConfigContext();
  const satkerNama = useMemo(() => {
    return satkerConfig?.getUserSatkerConfig()?.satker_nama || 'BPS';
  }, [satkerConfig]);

  // Get dynamic sheet ID from satker config
  const dynamicSheetId = useMemo(() => {
    return satkerConfig?.getUserSatkerSheetId('spjhonor') || TUGAS_SPREADSHEET_ID;
  }, [satkerConfig]);

  // Get current month and year
  const currentDate = new Date();
  const currentMonthName = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][currentDate.getMonth()];
  const currentYear = currentDate.getFullYear().toString();

  const [data, setData] = useState<KegiatanSPJData[]>([]);
  const [filteredData, setFilteredData] = useState<KegiatanSPJData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBulan, setSelectedBulan] = useState(currentMonthName);
  const [selectedTahun, setSelectedTahun] = useState(currentYear);
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

  const canAccessFeatures = () => {
    if (!currentUser) return false;
    const allowedRoles = ['Pejabat Pembuat Komitmen', 'Bendahara', 'Pejabat Pengadaan', 'Admin'];
    return allowedRoles.includes(currentUser.role);
  };

  const bulanOptions = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tahunOptions = Array.from({ length: 7 }, (_, i) => (2024 + i).toString());

  // Fetch data dari Google Sheets
  const fetchDataFromSheets = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Memulai fetch data SPJ Honor dari Google Sheets...');

      const rangesToTry = [
        "Rekapitulasi!A:Z",
        "A:Z",
        "Sheet1!A:Z",
        "Rekapitulasi"
      ];

      let sheetData = null;
      let error = null;

      for (const range of rangesToTry) {
        console.log(`🔍 Mencoba range: ${range}`);
        const result = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: dynamicSheetId,
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
        throw error || new Error('Tidak ada data ditemukan di spreadsheet');
      }

      const rows = sheetData.values || [];
      if (rows.length === 0) {
        throw new Error('Tidak ada data ditemukan di spreadsheet');
      }

      console.log('📊 Data mentah dari Google Sheets:', rows);
      console.log('📋 Headers:', rows[0]);

      // Process data
      const headers = rows[0];
      const dataRows = rows.slice(1);

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
      const kegiatanIndex = getColumnIndex(['kegiatan', 'nama kegiatan']) || 1;
      const ppkIndex = getColumnIndex(['ppk', 'penanggungjawab', 'pejabat', 'fungsi']) || 2;
      const petugasIndex = getColumnIndex(['petugas', 'jumlah petugas']) || 3;
      const jenisIndex = getColumnIndex(['jenis', 'pekerjaan']) || 4;
      const nilaiIndex = getColumnIndex(['nilai', 'realisasi', 'nilai realisasi']) || 5;
      const statusIndex = getColumnIndex(['status']) || 6;

      const processedData: KegiatanSPJData[] = dataRows
        .filter((row: any[]) => row && row.length > 0 && row[kegiatanIndex])
        .map((row: any[], index: number) => {
          const jenisPekerjaan = row[jenisIndex]?.toString().toLowerCase() || '';
          let jenis: 'Petugas Pendataan Lapangan' | 'Petugas Pemeriksaan Lapangan' | 'Petugas Pengolahan' = 'Petugas Pengolahan';
          
          if (jenisPekerjaan.includes('pendataan')) {
            jenis = 'Petugas Pendataan Lapangan';
          } else if (jenisPekerjaan.includes('periksa') || jenisPekerjaan.includes('pemeriksaan')) {
            jenis = 'Petugas Pemeriksaan Lapangan';
          }

          const status = row[statusIndex]?.toString().toLowerCase().includes('kirim') ? 'Kirim PPK' : 'Belum Kirim PPK';

          return {
            no: parseInt(row[noIndex]) || index + 1,
            namaKegiatan: row[kegiatanIndex]?.toString() || '',
            penanggungjawab: row[ppkIndex]?.toString() || '',
            jumlahPetugas: parseInt(row[petugasIndex]) || 0,
            jenisPekerjaan: jenis,
            nilaiRealisasi: parseInt(row[nilaiIndex]) || 0,
            status: status,
            link: undefined
          };
        });

      console.log('✅ Data processed:', processedData.length, 'baris');
      setData(processedData);

    } catch (error: any) {
      console.error('❌ Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengambil data dari spreadsheet",
        variant: "destructive"
      });
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFromSheets();
  }, [dynamicSheetId]);

  // Filter data berdasarkan search term dan bulan/tahun
  useEffect(() => {
    let filtered = [...data];

    // Filter berdasarkan search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.namaKegiatan.toLowerCase().includes(searchLower) ||
        item.penanggungjawab.toLowerCase().includes(searchLower) ||
        item.jenisPekerjaan.toLowerCase().includes(searchLower)
      );
    }

    setFilteredData(filtered);
  }, [data, searchTerm]);

  // Calculate totals
  // Calculate totals
  const totals = useMemo(() => ({
    petugas: filteredData.reduce((sum, item) => sum + item.jumlahPetugas, 0),
    nilai: filteredData.reduce((sum, item) => sum + item.nilaiRealisasi, 0)
  }), [filteredData]);

  // Handle Generate SPJ untuk single row
  const handleGenerateSPJ = (item: KegiatanSPJData) => {
    toast({
      title: "Generate SPJ",
      description: `Memproses SPJ untuk kegiatan: ${item.namaKegiatan}`
    });

    // TODO: Implementasi generate SPJ akan dikonfigurasi nanti
    console.log('🚀 Generate SPJ untuk:', item);
  };

  // Download data
  const downloadFilteredData = () => {
    if (!canAccessFeatures()) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${currentUser?.role} tidak memiliki izin untuk mendownload data`,
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
      let judul = "Rekap SPJ Honor Mitra";
      if (selectedBulan && selectedTahun) {
        judul += ` ${selectedBulan} ${selectedTahun}`;
      }

      const excelData = [];
      excelData.push([judul]);
      excelData.push([]);

      const headers = ['No', 'Nama Kegiatan', 'Penanggungjawab', 'Jumlah Petugas', 'Jenis Pekerjaan', 'Nilai Realisasi', 'Status'];
      excelData.push(headers);

      filteredData.forEach((item, idx) => {
        excelData.push([
          idx + 1,
          item.namaKegiatan,
          item.penanggungjawab,
          item.jumlahPetugas,
          item.jenisPekerjaan,
          item.nilaiRealisasi,
          item.status
        ]);
      });

      excelData.push([
        'Total',
        '',
        '',
        totals.petugas,
        '',
        totals.nilai,
        ''
      ]);

      const worksheet = utils.aoa_to_sheet(excelData);
      const colWidths = Array(headers.length).fill({ width: 20 });
      worksheet['!cols'] = colWidths;

      if (!worksheet['!merges']) worksheet['!merges'] = [];
      worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'SPJ Honor Mitra');

      const fileName = `spj_honor_mitra_${selectedBulan}_${selectedTahun}_${new Date().toISOString().split('T')[0]}.xlsx`;
      writeFile(workbook, fileName);

      toast({
        title: "Download berhasil",
        description: `Data ${filteredData.length} kegiatan berhasil diunduh sebagai Excel`
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

  return (
    <div className="min-h-screen bg-background pt-4 pb-16 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <FileText className="text-red-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Generate SPJ Honor Mitra</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola dan generate SPJ honor mitra berdasarkan data SPK dan BAST
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="max-w-7xl mx-auto grid gap-4 mb-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filter Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kegiatan, penanggungjawab..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Bulan */}
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

              {/* Tahun */}
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

              {/* Refresh Button */}
              <Button
                onClick={() => {
                  setIsRefreshing(true);
                  fetchDataFromSheets().finally(() => setIsRefreshing(false));
                }}
                variant="outline"
                disabled={isRefreshing || isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refresh...' : 'Refresh'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Section */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <Card>
            <CardContent className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Memuat data...</span>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Data SPJ Honor Mitra</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredData.length} kegiatan | Total Petugas: {totals.petugas} | Total Nilai: Rp {totals.nilai.toLocaleString('id-ID')}
                </p>
              </div>
              {filteredData.length > 0 && (
                <Button
                  onClick={downloadFilteredData}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Excel
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="min-w-12 text-center">No</TableHead>
                      <TableHead className="min-w-[220px]">Nama Kegiatan</TableHead>
                      <TableHead className="min-w-[180px]">Penanggungjawab Kegiatan</TableHead>
                      <TableHead className="min-w-[120px] text-center">Jumlah Petugas</TableHead>
                      <TableHead className="min-w-[200px]">Jenis Pekerjaan</TableHead>
                      <TableHead className="min-w-[150px] text-right">Nilai Realisasi</TableHead>
                      <TableHead className="min-w-[140px]">Status</TableHead>
                      <TableHead className="min-w-[200px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length > 0 ? (
                      <>
                        {filteredData.map((item, index) => (
                          <TableRow key={index} className="hover:bg-muted/50">
                            <TableCell className="text-center font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">{item.namaKegiatan}</TableCell>
                            <TableCell className="text-sm">{item.penanggungjawab}</TableCell>
                            <TableCell className="text-center">{item.jumlahPetugas}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="whitespace-nowrap">
                                {item.jenisPekerjaan}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              Rp {item.nilaiRealisasi.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'Kirim PPK' ? 'default' : 'secondary'}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 justify-center">
                                <Button
                                  onClick={() => handleGenerateSPJ(item)}
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-xs h-8"
                                >
                                  <Zap className="h-3.5 w-3.5" />
                                  Generate
                                </Button>
                                {item.link && (
                                  <Button
                                    onClick={() => window.open(item.link, '_blank')}
                                    size="sm"
                                    variant="ghost"
                                    className="gap-1 text-xs h-8"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Link
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total Row */}
                        <TableRow className="bg-muted/70 font-bold">
                          <TableCell colSpan={3} className="text-right">
                            TOTAL ({filteredData.length} Kegiatan)
                          </TableCell>
                          <TableCell className="text-center">{totals.petugas}</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right text-emerald-600">
                            Rp {totals.nilai.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Tidak ada data yang ditampilkan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
