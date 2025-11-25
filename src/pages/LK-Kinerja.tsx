"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Table as TableIcon, User, Search, Eye, TrendingUp, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Award, BarChart3, Crown, Star, Trophy, Medal } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface KinerjaData {
  no: number;
  nama: string;
  triwulan1: {
    kjkJam: number | null;
    nilaiKjk: number | null;
    ckp: number | null;
    nilaiCkp: number | null;
    prestasi: number | null;
    akhir: number | null;
    ranking: number | null;
  };
  triwulan2: {
    kjkJam: number | null;
    nilaiKjk: number | null;
    ckp: number | null;
    nilaiCkp: number | null;
    prestasi: number | null;
    akhir: number | null;
    ranking: number | null;
  };
  triwulan3: {
    kjkJam: number | null;
    nilaiKjk: number | null;
    ckp: number | null;
    nilaiCkp: number | null;
    prestasi: number | null;
    akhir: number | null;
    ranking: number | null;
  };
  triwulan4: {
    kjkJam: number | null;
    nilaiKjk: number | null;
    ckp: number | null;
    nilaiCkp: number | null;
    prestasi: number | null;
    akhir: number | null;
    ranking: number | null;
  };
  nilaiAkhir: number | null;
  rankingAkhir: number | null;
}

const SPREADSHEET_ID = "1w1wMlrsGpYLNWrkGuPVoGbLffT9HN6GXnZmnbITKEBA";
const SHEET_NAME = "OLAH-KINERJA";

export default function LKKinerja() {
  const [kinerjaData, setKinerjaData] = useState<KinerjaData[]>([]);
  const [filteredData, setFilteredData] = useState<KinerjaData[]>([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState<KinerjaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'rankingAkhir',
    direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  const { toast } = useToast();

  const loadKinerjaData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading data kinerja...');
      
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: `${SHEET_NAME}!A:AF`
        }
      });

      if (error) {
        console.error('❌ Error invoking function:', error);
        throw error;
      }

      console.log('📊 Raw data from function:', data);
      const rows = data.values || [];
      console.log('📈 Total rows from spreadsheet:', rows.length);

      if (rows.length > 1) {
        const headers = rows[0];
        console.log('📋 Headers:', headers);
        
    // PERBAIKAN DI loadKinerjaData function
    const dataRows = rows.slice(1) // Skip header saja
      .filter((row: any[]) => {
        // Filter: harus ada nama di kolom B, nomor valid di kolom A, dan bukan kepala kantor (row 5)
        const rowIndex = rows.indexOf(row) + 1; // Dapatkan nomor row sebenarnya
        const isKepalaKantor = rowIndex === 5; // Head Kantor di row 5
        
        const hasName = row && row.length > 1 && row[1] && row[1].trim() !== "";
        const hasValidNumber = row && row.length > 0 && row[0] && !isNaN(parseInt(row[0]));
        const isNotNamaHeader = row[1] !== "Nama"; // Exclude baris dengan teks "Nama"
        
        return hasName && hasValidNumber && !isKepalaKantor && isNotNamaHeader;
      })
      .map((row: any[], index: number) => {
        const parseNumber = (value: any): number | null => {
          if (!value || value === '-' || value === '#N/A' || value === '' || value === ' ' || value === 'Nama') return null;
          const num = parseFloat(value.toString().replace(',', '.'));
          return isNaN(num) ? null : num;
        };

        console.log(`📝 Processing row ${index + 1}:`, row);

        const kinerjaItem = {
          no: parseInt(row[0]), // Gunakan nomor dari spreadsheet
          nama: row[1] || "",
          
          // TRIWULAN 1: Kolom C-I (indeks 2-8)
          triwulan1: {
            kjkJam: parseNumber(row[2]),
            nilaiKjk: parseNumber(row[3]),
            ckp: parseNumber(row[4]),
            nilaiCkp: parseNumber(row[5]),
            prestasi: parseNumber(row[6]),
            akhir: parseNumber(row[7]),
            ranking: parseNumber(row[8])
          },
          
          // TRIWULAN 2: Kolom J-P (indeks 9-15)
          triwulan2: {
            kjkJam: parseNumber(row[9]),
            nilaiKjk: parseNumber(row[10]),
            ckp: parseNumber(row[11]),
            nilaiCkp: parseNumber(row[12]),
            prestasi: parseNumber(row[13]),
            akhir: parseNumber(row[14]),
            ranking: parseNumber(row[15])
          },
          
          // TRIWULAN 3: Kolom Q-W (indeks 16-22)
          triwulan3: {
            kjkJam: parseNumber(row[16]),
            nilaiKjk: parseNumber(row[17]),
            ckp: parseNumber(row[18]),
            nilaiCkp: parseNumber(row[19]),
            prestasi: parseNumber(row[20]),
            akhir: parseNumber(row[21]),
            ranking: parseNumber(row[22])
          },
          
          // TRIWULAN 4: Kolom X-AD (indeks 23-29)
          triwulan4: {
            kjkJam: parseNumber(row[23]),
            nilaiKjk: parseNumber(row[24]),
            ckp: parseNumber(row[25]),
            nilaiCkp: parseNumber(row[26]),
            prestasi: parseNumber(row[27]),
            akhir: parseNumber(row[28]),
            ranking: parseNumber(row[29])
          },
          
          // NILAI DAN RANKING TAHUNAN: Kolom AE-AF (indeks 30-31)
          nilaiAkhir: parseNumber(row[30]),
          rankingAkhir: parseNumber(row[31])
        } as KinerjaData;

        console.log(`✅ Processed data for ${kinerjaItem.nama}:`, kinerjaItem);
        return kinerjaItem;
      });

        console.log('✅ Final mapped data rows:', dataRows);
        setKinerjaData(dataRows);
        setFilteredData(dataRows);
      } else {
        console.log('ℹ️ No data found in spreadsheet');
        setKinerjaData([]);
        setFilteredData([]);
      }
    } catch (error: any) {
      console.error("❌ Error loading data:", error);
      toast({
        title: "Error",
        description: `Gagal memuat data kinerja: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKinerjaData();
  }, []);

  // Fungsi untuk mendapatkan pegawai terbaik per triwulan (tidak termasuk kepala kantor)
  const getPegawaiTerbaikPerTriwulan = () => {
    const dataKaryawan = kinerjaData; // Sudah tidak termasuk kepala kantor

    const terbaikTriwulan1 = [...dataKaryawan]
      .filter(item => item.triwulan1.ranking === 1 && item.triwulan1.akhir !== 30)
      .map(item => ({
        nama: item.nama,
        nilai: item.triwulan1.akhir,
        triwulan: 1
      }));

    const terbaikTriwulan2 = [...dataKaryawan]
      .filter(item => item.triwulan2.ranking === 1 && item.triwulan2.akhir !== 30)
      .map(item => ({
        nama: item.nama,
        nilai: item.triwulan2.akhir,
        triwulan: 2
      }));

    const terbaikTriwulan3 = [...dataKaryawan]
      .filter(item => item.triwulan3.ranking === 1 && item.triwulan3.akhir !== 30)
      .map(item => ({
        nama: item.nama,
        nilai: item.triwulan3.akhir,
        triwulan: 3
      }));

    const terbaikTriwulan4 = [...dataKaryawan]
      .filter(item => item.triwulan4.ranking === 1 && item.triwulan4.akhir !== 30)
      .map(item => ({
        nama: item.nama,
        nilai: item.triwulan4.akhir,
        triwulan: 4
      }));

    return {
      triwulan1: terbaikTriwulan1[0] || null,
      triwulan2: terbaikTriwulan2[0] || null,
      triwulan3: terbaikTriwulan3[0] || null,
      triwulan4: terbaikTriwulan4[0] || null
    };
  };

  // Fungsi untuk mendapatkan pegawai terbaik tahun 2025 (tidak termasuk kepala kantor)
  const getPegawaiTerbaikTahun = () => {
    return [...kinerjaData]
      .filter(item => item.rankingAkhir === 1 && item.nilaiAkhir !== 30)
      .map(item => ({
        nama: item.nama,
        nilai: item.nilaiAkhir
      }))[0] || null;
  };

  const pegawaiTerbaik = getPegawaiTerbaikPerTriwulan();
  const pegawaiTerbaikTahun = getPegawaiTerbaikTahun();

  // Apply search filter
  useEffect(() => {
    let result = [...kinerjaData];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.nama.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any = a;
      let bValue: any = b;

      const keys = sortConfig.key.split('.');
      keys.forEach(key => {
        aValue = aValue?.[key];
        bValue = bValue?.[key];
      });

      if (aValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue === null) return sortConfig.direction === 'asc' ? -1 : 1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredData(result);
    setCurrentPage(1);
  }, [kinerjaData, sortConfig, searchTerm]);

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const viewData = (data: KinerjaData) => {
    setSelectedKaryawan(data);
    setViewDialogOpen(true);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const goToFirstPage = () => paginate(1);
  const goToLastPage = () => paginate(totalPages);
  const goToNextPage = () => currentPage < totalPages && paginate(currentPage + 1);
  const goToPrevPage = () => currentPage > 1 && paginate(currentPage - 1);

  const formatNumber = (value: number | null): string => {
    if (value === null) return '-';
    if (value === 30) return '-';
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  };

  const getRankingColor = (ranking: number | null) => {
    if (ranking === null) return "bg-gray-100 text-gray-800 border-gray-300";
    if (ranking <= 3) return "bg-green-100 text-green-800 border-green-200";
    if (ranking <= 10) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getNilaiColor = (nilai: number | null) => {
    if (nilai === null || nilai === 30) return "text-gray-500";
    if (nilai >= 85) return "text-green-600 font-semibold";
    if (nilai >= 70) return "text-blue-600";
    return "text-orange-600";
  };

  const hasTriwulanData = (triwulan: any): boolean => {
    return triwulan.nilaiKjk !== null && triwulan.nilaiKjk !== 30 || 
           triwulan.ckp !== null && triwulan.ckp !== 30 || 
           triwulan.akhir !== null && triwulan.akhir !== 30;
  };

  const getTriwulanColor = (triwulan: number) => {
    const colors = {
      1: "from-blue-500 to-blue-600", 
      2: "from-green-500 to-green-600",
      3: "from-orange-500 to-orange-600",
      4: "from-purple-500 to-purple-600"
    };
    return colors[triwulan as keyof typeof colors] || "from-gray-500 to-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-blue-600">
            <BarChart3 className="h-8 w-8" />
            LK Reward and Punishment 2025
          </h1>
          <p className="text-muted-foreground mt-2">
            Dashboard Monitoring Kinerja Karyawan BPS Kabupaten Majalengka
          </p>
        </div>
        <Button variant="outline" onClick={loadKinerjaData} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Dashboard Pegawai Terbaik */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pegawai Terbaik Tahun 2025 */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-yellow-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Trophy className="h-6 w-6" />
              Pegawai Terbaik 2025
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pegawaiTerbaikTahun ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-amber-900">{pegawaiTerbaikTahun.nama}</h3>
                <p className="text-amber-700 font-semibold">
                  Nilai: {formatNumber(pegawaiTerbaikTahun.nilai)}
                </p>
                <Badge className="mt-2 bg-amber-500 text-white">Ranking #1</Badge>
              </div>
            ) : (
              <div className="text-center text-amber-700 py-4">
                <p>Data belum tersedia</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pegawai Terbaik Per Triwulan */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5" />
              Pegawai Terbaik Per Triwulan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((triwulan) => {
                const pegawai = pegawaiTerbaik[`triwulan${triwulan}` as keyof typeof pegawaiTerbaik];
                return (
                  <div key={triwulan} className={`bg-gradient-to-br ${getTriwulanColor(triwulan)} rounded-lg p-4 text-white text-center`}>
                    <div className="flex flex-col items-center">
                      <Star className="h-6 w-6 mb-2" />
                      <h3 className="font-bold text-sm">Triwulan {triwulan}</h3>
                      {pegawai ? (
                        <>
                          <p className="text-xs font-semibold mt-1 truncate w-full">{pegawai.nama}</p>
                          <p className="text-xs opacity-90">{formatNumber(pegawai.nilai)}</p>
                        </>
                      ) : (
                        <p className="text-xs opacity-90 mt-1">-</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Cari Karyawan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Cari nama karyawan..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="pl-10" 
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>Total: {filteredData.length} karyawan</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5" />
            Tabel Master Kinerja Karyawan
          </CardTitle>
          <CardDescription>
            Menampilkan {currentItems.length} dari {filteredData.length} data karyawan
            {searchTerm && ` untuk pencarian "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Memuat data kinerja...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold text-foreground w-16 text-center cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('no')}>
                      No
                    </TableHead>
                    <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('nama')}>
                      Nama Karyawan
                    </TableHead>
                    <TableHead className="font-semibold text-foreground text-center cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('triwulan1.akhir')}>
                      TW 1
                    </TableHead>
                    <TableHead className="font-semibold text-foreground text-center cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('triwulan2.akhir')}>
                      TW 2
                    </TableHead>
                    <TableHead className="font-semibold text-foreground text-center cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('triwulan3.akhir')}>
                      TW 3
                    </TableHead>
                    <TableHead className="font-semibold text-foreground text-center cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('triwulan4.akhir')}>
                      TW 4
                    </TableHead>
                    <TableHead className="font-semibold text-foreground text-right cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('nilaiAkhir')}>
                      Nilai 2025
                    </TableHead>
                    <TableHead className="font-semibold text-foreground text-center cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('rankingAkhir')}>
                      Ranking
                    </TableHead>
                    <TableHead className="font-semibold text-foreground text-center w-28">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((item, index) => (
                    <TableRow key={item.no} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-center">
                        {indexOfFirstItem + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      
                      <TableCell className="text-center">
                        <span className={`text-sm font-medium ${getNilaiColor(item.triwulan1.akhir)}`}>
                          {formatNumber(item.triwulan1.akhir)}
                        </span>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <span className={`text-sm font-medium ${getNilaiColor(item.triwulan2.akhir)}`}>
                          {formatNumber(item.triwulan2.akhir)}
                        </span>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <span className={`text-sm font-medium ${getNilaiColor(item.triwulan3.akhir)}`}>
                          {formatNumber(item.triwulan3.akhir)}
                        </span>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <span className={`text-sm font-medium ${getNilaiColor(item.triwulan4.akhir)}`}>
                          {formatNumber(item.triwulan4.akhir)}
                        </span>
                      </TableCell>
                      
                      <TableCell className={`text-right font-semibold ${getNilaiColor(item.nilaiAkhir)}`}>
                        {formatNumber(item.nilaiAkhir)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.rankingAkhir && item.nilaiAkhir !== 30 ? (
                          <Badge variant="outline" className={`${getRankingColor(item.rankingAkhir)} border text-xs px-2 py-1`}>
                            #{item.rankingAkhir}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => viewData(item)}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                            Detail
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredData.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Tidak ada data kinerja ditemukan</p>
                  <p className="text-sm mt-2">
                    {searchTerm ? `Tidak ada hasil untuk pencarian "${searchTerm}"` : "Data kosong atau sedang dimuat."}
                  </p>
                </div>
              )}

              {filteredData.length > 0 && (
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Menampilkan {indexOfFirstItem + 1} sampai {Math.min(indexOfLastItem, filteredData.length)} dari {filteredData.length} data
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={goToFirstPage} disabled={currentPage === 1} className="h-8 w-8 p-0" title="Awal">
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={currentPage === 1} className="h-8 w-8 p-0" title="Sebelumnya">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages} className="h-8 w-8 p-0" title="Berikutnya">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToLastPage} disabled={currentPage === totalPages} className="h-8 w-8 p-0" title="Akhir">
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-t-lg p-6 -m-6 mb-6">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <User className="h-6 w-6" />
              Detail Kinerja Karyawan
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              {selectedKaryawan?.nama} - LK Reward and Punishment 2025
            </DialogDescription>
          </DialogHeader>
          
          {selectedKaryawan && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-semibold">No. Urut</div>
                  <div className="text-xl font-bold text-blue-800">{selectedKaryawan.no}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-semibold">Nama Karyawan</div>
                  <div className="text-lg font-bold text-blue-800">{selectedKaryawan.nama}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-semibold">Nilai Akhir 2025</div>
                  <div className={`text-xl font-bold ${getNilaiColor(selectedKaryawan.nilaiAkhir)}`}>
                    {formatNumber(selectedKaryawan.nilaiAkhir)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-semibold">Ranking 2025</div>
                  <div className="text-xl font-bold text-blue-800">
                    {selectedKaryawan.rankingAkhir && selectedKaryawan.nilaiAkhir !== 30 ? `#${selectedKaryawan.rankingAkhir}` : '-'}
                  </div>
                </div>
              </div>

              {/* Triwulan Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((triwulan) => {
                  const data = selectedKaryawan[`triwulan${triwulan}` as keyof KinerjaData] as any;
                  const hasData = hasTriwulanData(data);
                  
                  return (
                    <Card key={triwulan}>
                      <CardHeader className={`bg-gradient-to-r ${
                        triwulan === 1 ? 'from-green-50 to-green-100' :
                        triwulan === 2 ? 'from-blue-50 to-blue-100' :
                        triwulan === 3 ? 'from-orange-50 to-orange-100' :
                        'from-purple-50 to-purple-100'
                      } border-b`}>
                        <CardTitle className={`flex items-center gap-2 ${
                          triwulan === 1 ? 'text-green-800' :
                          triwulan === 2 ? 'text-blue-800' :
                          triwulan === 3 ? 'text-orange-800' :
                          'text-purple-800'
                        }`}>
                          <Award className="h-5 w-5" />
                          Triwulan {triwulan}
                          {!hasData && (
                            <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-600">
                              Belum Diinput
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Kjk (Jam):</span>
                            <span className="text-sm font-semibold">{formatNumber(data.kjkJam)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Nilai (30%):</span>
                            <span className={`text-sm font-semibold ${getNilaiColor(data.nilaiKjk)}`}>
                              {formatNumber(data.nilaiKjk)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">CKP (60%):</span>
                            <span className="text-sm font-semibold">{formatNumber(data.ckp)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Nilai (10%):</span>
                            <span className={`text-sm font-semibold ${getNilaiColor(data.nilaiCkp)}`}>
                              {formatNumber(data.nilaiCkp)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Prestasi:</span>
                            <span className="text-sm font-semibold">{formatNumber(data.prestasi)}</span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-2">
                            <span className="text-sm font-bold">Akhir (100%):</span>
                            <span className={`text-sm font-bold ${getNilaiColor(data.akhir)}`}>
                              {formatNumber(data.akhir)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Ranking:</span>
                            <Badge variant="outline" className={getRankingColor(data.ranking)}>
                              {data.ranking && data.akhir !== 30 ? `#${data.ranking}` : '-'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}