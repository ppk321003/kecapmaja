import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search, Filter, Loader2, X, RefreshCw, ExternalLink, Download, Zap } from "lucide-react";
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

interface MitraHonorData {
  no: number;
  namaMitra: string;
  nik: string;
  kecamatan: string;
  pendataan: number;
  pemeriksaan: number;
  pengolahan: number;
  jumlah: number;
  statusTTD: string;
  [key: string]: string | number;
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

  const [data, setData] = useState<MitraHonorData[]>([]);
  const [filteredData, setFilteredData] = useState<MitraHonorData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBulan, setSelectedBulan] = useState(currentMonthName);
  const [selectedTahun, setSelectedTahun] = useState(currentYear);
  const [selectedKegiatan, setSelectedKegiatan] = useState<string[]>([]);
  const [availableKegiatan, setAvailableKegiatan] = useState<string[]>([]);
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
      console.log('🔄 Memulai fetch data SPK dari Google Sheets...');

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
      const namaIndex = getColumnIndex(['nama', 'mitra', 'nama mitra']) || 1;
      const nikIndex = getColumnIndex(['nik']) || 2;
      const kecIndex = getColumnIndex(['kecamatan']) || 3;
      const pendataanIndex = getColumnIndex(['pendataan']) || 4;
      const pemeriksaanIndex = getColumnIndex(['pemeriksaan', 'periksa']) || 5;
      const pengolahIndex = getColumnIndex(['pengolahan', 'olah']) || 6;

      const processedData: MitraHonorData[] = dataRows
        .filter((row: any[]) => row && row.length > 0)
        .map((row: any[], index: number) => {
          const pendataan = parseInt(row[pendataanIndex]) || 0;
          const pemeriksaan = parseInt(row[pemeriksaanIndex]) || 0;
          const pengolahan = parseInt(row[pengolahIndex]) || 0;
          const jumlah = pendataan + pemeriksaan + pengolahan;

          return {
            no: parseInt(row[noIndex]) || index + 1,
            namaMitra: row[namaIndex] || '',
            nik: row[nikIndex] || '',
            kecamatan: row[kecIndex] || '',
            pendataan: pendataan,
            pemeriksaan: pemeriksaan,
            pengolahan: pengolahan,
            jumlah: jumlah,
            statusTTD: 'Belum'
          };
        });

      console.log('✅ Data processed:', processedData.length, 'baris');
      setData(processedData);

      // Extract available kegiatan
      const kegiatanSet = new Set(processedData.map(item => 'Mitra: ' + item.kecamatan));
      setAvailableKegiatan(Array.from(kegiatanSet));

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
        item.namaMitra.toLowerCase().includes(searchLower) ||
        item.nik.toLowerCase().includes(searchLower) ||
        item.kecamatan.toLowerCase().includes(searchLower)
      );
    }

    // Filter berdasarkan kegiatan (kecamatan)
    if (selectedKegiatan.length > 0) {
      filtered = filtered.filter(item =>
        selectedKegiatan.some(k => k.includes(item.kecamatan))
      );
    }

    setFilteredData(filtered);
  }, [data, searchTerm, selectedKegiatan]);

  // Calculate totals
  const totals = filteredData.reduce((acc, item) => ({
    pendataan: (acc.pendataan || 0) + item.pendataan,
    pemeriksaan: (acc.pemeriksaan || 0) + item.pemeriksaan,
    pengolahan: (acc.pengolahan || 0) + item.pengolahan,
    jumlah: (acc.jumlah || 0) + item.jumlah
  }), { pendataan: 0, pemeriksaan: 0, pengolahan: 0, jumlah: 0 });

  // Handle Generate SPJ
  const handleGenerateSPJ = () => {
    if (filteredData.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Pilih mitra terlebih dahulu untuk di-generate SPJ-nya",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Generate SPJ",
      description: `Memulai generate SPJ untuk ${filteredData.length} mitra`
    });

    // TODO: Implementasi generate SPJ akan dikonfigurasi nanti
    console.log('🚀 Generate SPJ untuk data:', filteredData);
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

      const headers = ['No', 'Nama Mitra', 'NIK', 'Kecamatan', 'Pendataan', 'Pemeriksaan', 'Pengolahan', 'Jumlah', 'Status TTD'];
      excelData.push(headers);

      filteredData.forEach((item, idx) => {
        excelData.push([
          idx + 1,
          item.namaMitra,
          item.nik,
          item.kecamatan,
          item.pendataan,
          item.pemeriksaan,
          item.pengolahan,
          item.jumlah,
          item.statusTTD
        ]);
      });

      excelData.push([
        'Total',
        '',
        '',
        '',
        totals.pendataan,
        totals.pemeriksaan,
        totals.pengolahan,
        totals.jumlah,
        ''
      ]);

      const worksheet = utils.aoa_to_sheet(excelData);
      const colWidths = Array(headers.length).fill({ width: 15 });
      worksheet['!cols'] = colWidths;

      if (!worksheet['!merges']) worksheet['!merges'] = [];
      worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'SPJ Honor Mitra');

      const fileName = `spj_honor_mitra_${selectedBulan}_${selectedTahun}_${new Date().toISOString().split('T')[0]}.xlsx`;
      writeFile(workbook, fileName);

      toast({
        title: "Download berhasil",
        description: `Data ${filteredData.length} mitra berhasil diunduh sebagai Excel`
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, NIK, kecamatan..."
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

              {/* Generate SPJ Button */}
              <Button
                onClick={handleGenerateSPJ}
                disabled={isLoading || filteredData.length === 0}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
              >
                <Zap className="h-4 w-4 mr-2" />
                Generate SPJ
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
          <>
            {/* Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Jumlah Mitra</p>
                    <p className="text-2xl font-bold text-foreground">{filteredData.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Total Honor</p>
                    <p className="text-2xl font-bold text-emerald-600">{totals.jumlah.toLocaleString('id-ID')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Pendataan</p>
                    <p className="text-2xl font-bold text-blue-600">{totals.pendataan.toLocaleString('id-ID')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Pemeriksaan</p>
                    <p className="text-2xl font-bold text-purple-600">{totals.pemeriksaan.toLocaleString('id-ID')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Data Mitra SPJ Honor</CardTitle>
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
                        <TableHead className="min-w-[200px]">Nama Mitra</TableHead>
                        <TableHead className="min-w-[120px]">NIK</TableHead>
                        <TableHead className="min-w-[120px]">Kecamatan</TableHead>
                        <TableHead className="min-w-[100px] text-right">Pendataan</TableHead>
                        <TableHead className="min-w-[100px] text-right">Pemeriksaan</TableHead>
                        <TableHead className="min-w-[100px] text-right">Pengolahan</TableHead>
                        <TableHead className="min-w-[100px] text-right font-bold">Jumlah</TableHead>
                        <TableHead className="min-w-[100px]">Status TTD</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.length > 0 ? (
                        <>
                          {filteredData.map((item, index) => (
                            <TableRow key={index} className="hover:bg-muted/50">
                              <TableCell className="text-center font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{item.namaMitra}</TableCell>
                              <TableCell>{item.nik}</TableCell>
                              <TableCell>{item.kecamatan}</TableCell>
                              <TableCell className="text-right text-blue-600">{item.pendataan.toLocaleString('id-ID')}</TableCell>
                              <TableCell className="text-right text-purple-600">{item.pemeriksaan.toLocaleString('id-ID')}</TableCell>
                              <TableCell className="text-right text-orange-600">{item.pengolahan.toLocaleString('id-ID')}</TableCell>
                              <TableCell className="text-right font-bold text-emerald-600">{item.jumlah.toLocaleString('id-ID')}</TableCell>
                              <TableCell>
                                <Badge variant={item.statusTTD === 'Sudah' ? 'default' : 'secondary'}>
                                  {item.statusTTD}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Total Row */}
                          <TableRow className="bg-muted/70 font-bold">
                            <TableCell colSpan={4} className="text-right">
                              TOTAL ({filteredData.length} Mitra)
                            </TableCell>
                            <TableCell className="text-right text-blue-600">{totals.pendataan.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right text-purple-600">{totals.pemeriksaan.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right text-orange-600">{totals.pengolahan.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right text-emerald-600">{totals.jumlah.toLocaleString('id-ID')}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Tidak ada data yang ditampilkan
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
