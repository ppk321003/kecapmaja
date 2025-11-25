"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Table as TableIcon, Filter, User, Search, X, Eye, TrendingUp, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Award, BarChart3 } from "lucide-react";
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
  const [filter, setFilter] = useState<string>('all');
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
        
        const dataRows = rows.slice(1)
          .filter((row: any[]) => row && row.length > 0 && row[0] !== "" && !isNaN(parseInt(row[0])))
          .map((row: any[], index: number) => {
            const parseNumber = (value: any): number | null => {
              if (!value || value === '-' || value === '#N/A') return null;
              const num = parseFloat(value);
              return isNaN(num) ? null : num;
            };

            return {
              no: parseInt(row[0]) || index + 1,
              nama: row[1] || "",
              // Triwulan 1: C-I (indeks 2-8)
              triwulan1: {
                kjkJam: parseNumber(row[2]),
                nilaiKjk: parseNumber(row[3]),
                ckp: parseNumber(row[4]),
                nilaiCkp: parseNumber(row[5]),
                prestasi: parseNumber(row[6]),
                akhir: parseNumber(row[7]),
                ranking: parseNumber(row[8])
              },
              // Triwulan 2: K-P (indeks 10-15) - skip kolom J (indeks 9)
              triwulan2: {
                kjkJam: parseNumber(row[10]),
                nilaiKjk: parseNumber(row[11]),
                ckp: parseNumber(row[12]),
                nilaiCkp: parseNumber(row[13]),
                prestasi: parseNumber(row[14]),
                akhir: parseNumber(row[15]),
                ranking: parseNumber(row[16])
              },
              // Triwulan 3: Q-W (indeks 16-22)
              triwulan3: {
                kjkJam: parseNumber(row[17]),
                nilaiKjk: parseNumber(row[18]),
                ckp: parseNumber(row[19]),
                nilaiCkp: parseNumber(row[20]),
                prestasi: parseNumber(row[21]),
                akhir: parseNumber(row[22]),
                ranking: parseNumber(row[23])
              },
              // Triwulan 4: X-AD (indeks 23-29)
              triwulan4: {
                kjkJam: parseNumber(row[24]),
                nilaiKjk: parseNumber(row[25]),
                ckp: parseNumber(row[26]),
                nilaiCkp: parseNumber(row[27]),
                prestasi: parseNumber(row[28]),
                akhir: parseNumber(row[29]),
                ranking: parseNumber(row[30])
              },
              // Nilai dan Ranking Akhir: AE-AF (indeks 30-31)
              nilaiAkhir: parseNumber(row[31]),
              rankingAkhir: parseNumber(row[32])
            } as KinerjaData;
          });
        
        console.log('✅ Mapped data rows:', dataRows);
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

  // Apply filters and sorting
  useEffect(() => {
    let result = [...kinerjaData];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.nama.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (filter === 'top10') {
      result = result.filter(item => item.rankingAkhir && item.rankingAkhir <= 10);
    } else if (filter === 'active') {
      // Filter untuk data dengan triwulan aktif (contoh: triwulan dengan nilai akhir)
      result = result.filter(item => 
        item.triwulan1.akhir !== null || 
        item.triwulan2.akhir !== null || 
        item.triwulan3.akhir !== null || 
        item.triwulan4.akhir !== null
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any = a;
      let bValue: any = b;

      // Navigate nested properties
      const keys = sortConfig.key.split('.');
      keys.forEach(key => {
        aValue = aValue?.[key];
        bValue = bValue?.[key];
      });

      // Handle null values
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
  }, [kinerjaData, sortConfig, filter, searchTerm]);

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleFilter = (type: string) => {
    setFilter(type);
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
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  };

  const getRankingColor = (ranking: number | null) => {
    if (ranking === null) return "bg-gray-100 text-gray-800 border-gray-300";
    if (ranking <= 3) return "bg-green-100 text-green-800 border-green-200";
    if (ranking <= 10) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getNilaiColor = (nilai: number | null) => {
    if (nilai === null) return "text-gray-500";
    if (nilai >= 85) return "text-green-600 font-semibold";
    if (nilai >= 70) return "text-blue-600";
    return "text-orange-600";
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

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={filter} onValueChange={handleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Data</SelectItem>
                  <SelectItem value="top10">Top 10 Ranking</SelectItem>
                  <SelectItem value="active">Triwulan Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label>Cari Karyawan</Label>
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
            
            <div className="space-y-2 flex items-end">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>Total: {filteredData.length} karyawan</span>
              </div>
            </div>
          </div>

          {/* Reset Filter Button */}
          <div className="flex justify-end mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setFilter('all');
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Filter
            </Button>
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
                  {currentItems.map((item) => (
                    <TableRow key={item.no} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-center">{item.no}</TableCell>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell className={`text-right font-semibold ${getNilaiColor(item.nilaiAkhir)}`}>
                        {formatNumber(item.nilaiAkhir)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.rankingAkhir && (
                          <Badge variant="outline" className={`${getRankingColor(item.rankingAkhir)} border text-xs px-2 py-1`}>
                            #{item.rankingAkhir}
                          </Badge>
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

              {/* Pagination */}
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
              <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-semibold">Ranking 2025</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {selectedKaryawan.rankingAkhir ? `#${selectedKaryawan.rankingAkhir}` : '-'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-semibold">Nilai Akhir 2025</div>
                  <div className={`text-2xl font-bold ${getNilaiColor(selectedKaryawan.nilaiAkhir)}`}>
                    {formatNumber(selectedKaryawan.nilaiAkhir)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-semibold">No. Urut</div>
                  <div className="text-2xl font-bold text-blue-800">{selectedKaryawan.no}</div>
                </div>
              </div>

              {/* Triwulan Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Triwulan 1 */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                    <CardTitle className="text-green-800 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Triwulan 1
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Kjk (Jam):</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan1.kjkJam)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Nilai Kjk:</span>
                        <span className={`text-sm font-medium ${getNilaiColor(selectedKaryawan.triwulan1.nilaiKjk)}`}>
                          {formatNumber(selectedKaryawan.triwulan1.nilaiKjk)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">CKP:</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan1.ckp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Nilai CKP:</span>
                        <span className={`text-sm font-medium ${getNilaiColor(selectedKaryawan.triwulan1.nilaiCkp)}`}>
                          {formatNumber(selectedKaryawan.triwulan1.nilaiCkp)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Prestasi:</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan1.prestasi)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-semibold">Akhir (100%):</span>
                        <span className={`text-sm font-semibold ${getNilaiColor(selectedKaryawan.triwulan1.akhir)}`}>
                          {formatNumber(selectedKaryawan.triwulan1.akhir)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Ranking:</span>
                        <Badge variant="outline" className={getRankingColor(selectedKaryawan.triwulan1.ranking)}>
                          {selectedKaryawan.triwulan1.ranking ? `#${selectedKaryawan.triwulan1.ranking}` : '-'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Triwulan 2 */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                    <CardTitle className="text-blue-800 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Triwulan 2
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Kjk (Jam):</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan2.kjkJam)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Nilai Kjk:</span>
                        <span className={`text-sm font-medium ${getNilaiColor(selectedKaryawan.triwulan2.nilaiKjk)}`}>
                          {formatNumber(selectedKaryawan.triwulan2.nilaiKjk)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">CKP:</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan2.ckp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Nilai CKP:</span>
                        <span className={`text-sm font-medium ${getNilaiColor(selectedKaryawan.triwulan2.nilaiCkp)}`}>
                          {formatNumber(selectedKaryawan.triwulan2.nilaiCkp)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Prestasi:</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan2.prestasi)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-semibold">Akhir (100%):</span>
                        <span className={`text-sm font-semibold ${getNilaiColor(selectedKaryawan.triwulan2.akhir)}`}>
                          {formatNumber(selectedKaryawan.triwulan2.akhir)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Ranking:</span>
                        <Badge variant="outline" className={getRankingColor(selectedKaryawan.triwulan2.ranking)}>
                          {selectedKaryawan.triwulan2.ranking ? `#${selectedKaryawan.triwulan2.ranking}` : '-'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Triwulan 3 */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                    <CardTitle className="text-orange-800 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Triwulan 3
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Kjk (Jam):</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan3.kjkJam)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Nilai Kjk:</span>
                        <span className={`text-sm font-medium ${getNilaiColor(selectedKaryawan.triwulan3.nilaiKjk)}`}>
                          {formatNumber(selectedKaryawan.triwulan3.nilaiKjk)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">CKP:</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan3.ckp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Nilai CKP:</span>
                        <span className={`text-sm font-medium ${getNilaiColor(selectedKaryawan.triwulan3.nilaiCkp)}`}>
                          {formatNumber(selectedKaryawan.triwulan3.nilaiCkp)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Prestasi:</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan3.prestasi)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-semibold">Akhir (100%):</span>
                        <span className={`text-sm font-semibold ${getNilaiColor(selectedKaryawan.triwulan3.akhir)}`}>
                          {formatNumber(selectedKaryawan.triwulan3.akhir)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Ranking:</span>
                        <Badge variant="outline" className={getRankingColor(selectedKaryawan.triwulan3.ranking)}>
                          {selectedKaryawan.triwulan3.ranking ? `#${selectedKaryawan.triwulan3.ranking}` : '-'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Triwulan 4 */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                    <CardTitle className="text-purple-800 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Triwulan 4
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Kjk (Jam):</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan4.kjkJam)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Nilai Kjk:</span>
                        <span className={`text-sm font-medium ${getNilaiColor(selectedKaryawan.triwulan4.nilaiKjk)}`}>
                          {formatNumber(selectedKaryawan.triwulan4.nilaiKjk)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">CKP:</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan4.ckp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Nilai CKP:</span>
                        <span className={`text-sm font-medium ${getNilaiColor(selectedKaryawan.triwulan4.nilaiCkp)}`}>
                          {formatNumber(selectedKaryawan.triwulan4.nilaiCkp)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Prestasi:</span>
                        <span className="text-sm">{formatNumber(selectedKaryawan.triwulan4.prestasi)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-semibold">Akhir (100%):</span>
                        <span className={`text-sm font-semibold ${getNilaiColor(selectedKaryawan.triwulan4.akhir)}`}>
                          {formatNumber(selectedKaryawan.triwulan4.akhir)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Ranking:</span>
                        <Badge variant="outline" className={getRankingColor(selectedKaryawan.triwulan4.ranking)}>
                          {selectedKaryawan.triwulan4.ranking ? `#${selectedKaryawan.triwulan4.ranking}` : '-'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}