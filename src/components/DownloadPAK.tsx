import React, { useState, useEffect } from 'react';
import { Eye, Search, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PAKData {
  ID: string;
  Tahun: string;
  Jenis_Periode: string;
  Periode: string;
  Link: string;
  Nomor_PAK?: string;
  Last_Update?: string;
  Nama?: string;
  NIP?: string;
}

interface DownloadPAKProps {
  karyawan: { nip: string; nama: string };
}

const DownloadPAK: React.FC<DownloadPAKProps> = ({ karyawan }) => {
  const [pakData, setPakData] = useState<PAKData[]>([]);
  const [filteredData, setFilteredData] = useState<PAKData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
  const SHEET_NAME = "olah";

  const getViewableLink = (url: string): string => {
    if (!url || typeof url !== 'string') return '#';

    let fileId = '';
    let type = '';

    if (url.includes('/document/d/')) {
      fileId = url.split('/document/d/')[1]?.split('/')[0] || '';
      type = 'document';
    } else if (url.includes('/spreadsheets/d/')) {
      fileId = url.split('/spreadsheets/d/')[1]?.split('/')[0] || '';
      type = 'spreadsheets';
    } else if (url.includes('/presentation/d/')) {
      fileId = url.split('/presentation/d/')[1]?.split('/')[0] || '';
      type = 'presentation';
    } else if (url.includes('/file/d/')) {
      fileId = url.split('/file/d/')[1]?.split('/')[0] || '';
      type = 'file';
    } else if (url.includes('open?id=')) {
      fileId = url.split('open?id=')[1]?.split('&')[0] || '';
    } else if (url.includes('id=')) {
      fileId = url.split('id=')[1]?.split('&')[0] || '';
    }

    if (!fileId) return url;

    if (type === 'document' || type === 'spreadsheets' || type === 'presentation') {
      return `https://docs.google.com/${type}/d/${fileId}/edit`;
    } else {
      return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    }
  };

  const fetchPAKData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: `${SHEET_NAME}!A:ZZ`,
        },
      });

      if (error) throw error;
      if (!data?.values || data.values.length <= 1) {
        setPakData([]);
        setFilteredData([]);
        return;
      }

      const headers = data.values[0].map((h: string) => h.trim());
      const rows = data.values.slice(1);

      const mapped: PAKData[] = rows
        .filter((row: any[]) => row.length > 0 && row[0])
        .map((row: any[]) => {
          const get = (name: string) => {
            const i = headers.indexOf(name);
            return i >= 0 && row[i] ? row[i].toString().trim() : '';
          };

          return {
            ID: get('ID') || '',
            Tahun: get('Tahun') || '',
            Jenis_Periode: get('Jenis Periode') || '',
            Periode: get('Periode') || '',
            Link: get('Link') || '',
            Nomor_PAK: get('Nomor PAK') || '',
            Last_Update: get('Last Update') || '',
            Nama: get('Nama') || '',
            NIP: get('NIP') || '',
          };
        });

      const filtered = mapped.filter(item => {
        const nipMatch = (item.NIP || item.ID).includes(karyawan.nip) ||
                        karyawan.nip.includes(item.NIP || item.ID);
        const namaMatch = (item.Nama || '').toLowerCase().includes(karyawan.nama.toLowerCase());
        return nipMatch || namaMatch;
      });

      // SORTING: Tahunan dulu → Semester, lalu tahun terbaru, lalu periode terbaru
      const sorted = filtered.sort((a, b) => {
        // 1. Prioritas Jenis Periode: Tahunan > Semester
        const jenisOrder = { 'Tahunan': 0, 'Semester': 1 };
        const jenisA = a.Jenis_Periode.includes('Tahunan') ? 'Tahunan' : 'Semester';
        const jenisB = b.Jenis_Periode.includes('Tahunan') ? 'Tahunan' : 'Semester';

        if (jenisOrder[jenisA] !== jenisOrder[jenisB]) {
          return jenisOrder[jenisA] - jenisOrder[jenisB];
        }

        // 2. Tahun terbaru
        if (b.Tahun !== a.Tahun) {
          return parseInt(b.Tahun) - parseInt(a.Tahun);
        }

        // 3. Periode terbaru (misal 2024-2 > 2024-1)
        const periodeA = a.Periode.match(/(\d+)$/)?.[1] || '0';
        const periodeB = b.Periode.match(/(\d+)$/)?.[1] || '0';
        return parseInt(periodeB) - parseInt(periodeA);
      });

      setPakData(sorted);
      setFilteredData(sorted);
    } catch (err: any) {
      toast({
        title: "Gagal memuat data",
        description: err.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPAKData();
  }, [karyawan.nip, karyawan.nama]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(pakData);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredData(
      pakData.filter(item =>
        item.Tahun.includes(term) ||
        item.Periode.toLowerCase().includes(term) ||
        item.Nomor_PAK?.toLowerCase().includes(term) ||
        item.Jenis_Periode.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, pakData]);

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

  // Badge warna untuk Jenis Periode
  const getJenisBadge = (jenis: string) => {
    const isTahunan = jenis.toLowerCase().includes('tahunan');
    return (
      <Badge
        className={
          isTahunan
            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
        }
      >
        {jenis}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-24 text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping"></div>
          </div>
          <p className="mt-6 text-lg font-medium text-foreground">Memuat dokumen PAK...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-card to-card/95">
        <CardHeader className="pb-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
            <div className="space-y-1">
              <CardTitle className="text-3xl font-bold flex items-center gap-3 text-primary">
                <FileText className="h-9 w-9" />
                Dokumen Penetapan Angka Kredit (PAK)
              </CardTitle>
              <CardDescription className="text-lg">
                <span className="font-semibold text-foreground">{karyawan.nama}</span>
                <span className="text-muted-foreground ml-2">• NIP {karyawan.nip}</span>
              </CardDescription>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari tahun, periode, nomor PAK..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80 bg-background/80"
                />
              </div>
              <Button onClick={fetchPAKData} variant="outline" size="icon" className="shrink-0">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="h-20 w-20 mx-auto text-muted-foreground/40 mb-5" />
              <h3 className="text-2xl font-semibold mb-2 text-foreground">
                {searchTerm ? 'Dokumen tidak ditemukan' : 'Belum ada dokumen PAK'}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchTerm
                  ? `Tidak ada hasil untuk pencarian "${searchTerm}". Coba kata kunci lain.`
                  : `Saat ini belum ada data PAK yang tersedia untuk ${karyawan.nama}.`}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border bg-card/70 backdrop-blur-sm overflow-hidden shadow-inner">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-muted/80 to-muted/50 hover:bg-muted/90">
                      <TableHead className="font-bold text-foreground">Tahun</TableHead>
                      <TableHead className="font-bold text-foreground">Jenis Periode</TableHead>
                      <TableHead className="font-bold text-foreground">Periode</TableHead>
                      <TableHead className="font-bold text-foreground">Nomor PAK</TableHead>
                      <TableHead className="font-bold text-foreground">Update Terakhir</TableHead>
                      <TableHead className="text-center font-bold text-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => {
                      const viewLink = getViewableLink(item.Link);

                      return (
                        <TableRow
                          key={`${item.ID}-${item.Tahun}-${item.Periode}`}
                          className="hover:bg-muted/40 transition-all duration-200"
                        >
                          <TableCell className="font-bold text-lg text-primary">{item.Tahun}</TableCell>
                          <TableCell>{getJenisBadge(item.Jenis_Periode)}</TableCell>
                          <TableCell className="font-medium">{item.Periode}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.Nomor_PAK || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(item.Last_Update)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.Link ? (
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-10 w-10 p-0 rounded-full hover:bg-primary hover:text-white transition-all"
                              >
                                <a
                                  href={viewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Lihat Dokumen"
                                >
                                  <Eye className="h-5 w-5" />
                                </a>
                              </Button>
                            ) : (
                              <Badge variant="secondary" className="text-xs gap-1 bg-orange-100 text-orange-700">
                                <AlertCircle className="h-3 w-3" />
                                Belum tersedia
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-8 text-center text-sm text-muted-foreground bg-muted/30 py-3 rounded-lg">
                Menampilkan <strong className="text-foreground">{filteredData.length}</strong> dokumen PAK
                {searchTerm && ` untuk pencarian “${searchTerm}”`}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DownloadPAK;