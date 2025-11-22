import React, { useState, useEffect } from 'react';
import { Eye, Search, RefreshCw, Calendar, FileText, User } from 'lucide-react';
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
  karyawan: {
    nip: string;
    nama: string;
  };
}

const DownloadPAK: React.FC<DownloadPAKProps> = ({ karyawan }) => {
  const [pakData, setPakData] = useState<PAKData[]>([]);
  const [filteredData, setFilteredData] = useState<PAKData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
  const SHEET_NAME = "olah";

  // FUNGSI UTAMA: BISA BUKA SEMUA LINK GOOGLE (Docs, Sheets, Drive, dll)
  const getGoogleViewLink = (url: string): string => {
    if (!url || typeof url !== 'string') return '#';
    if (!url.includes('google.com') && !url.includes('docs.google.com') && !url.includes('drive.google.com')) {
      return url;
    }

    let fileId = '';
    let docType = '';

    // Google Docs / Sheets / Slides / Forms
    if (url.includes('/document/d/')) {
      fileId = url.split('/document/d/')[1]?.split('/')[0] || '';
      docType = 'document';
    } else if (url.includes('/spreadsheets/d/')) {
      fileId = url.split('/spreadsheets/d/')[1]?.split('/')[0] || '';
      docType = 'spreadsheets';
    } else if (url.includes('/presentation/d/')) {
      fileId = url.split('/presentation/d/')[1]?.split('/')[0] || '';
      docType = 'presentation';
    } else if (url.includes('/forms/d/')) {
      fileId = url.split('/forms/d/')[1]?.split('/')[0] || '';
      docType = 'forms';
    }
    // Google Drive File
    else if (url.includes('/file/d/')) {
      fileId = url.split('/file/d/')[1]?.split('/')[0] || '';
      docType = 'file';
    }
    // Format open?id= atau id=
    else if (url.includes('open?id=')) {
      fileId = url.split('open?id=')[1]?.split('&')[0] || '';
    } else if (url.includes('id=')) {
      fileId = url.split('id=')[1]?.split('&')[0] || '';
    }

    if (!fileId) return url;

    if (['document', 'spreadsheets', 'presentation', 'forms'].includes(docType)) {
      return `https://docs.google.com/${docType}/d/${fileId}/edit`;
    } else {
      return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    }
  };

  // FUNGSI FETCH DATA (INI YANG SEBELUMNYA HILANG!)
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

      setPakData(filtered);
      setFilteredData(filtered);
    } catch (err: any) {
      toast({
        title: "Gagal memuat data",
        description: err.message || "Terjadi kesalahan saat mengambil data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data saat komponen mount / karyawan berubah
  useEffect(() => {
    fetchPAKData();
  }, [karyawan.nip, karyawan.nama]);

  // Search filter
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

  // Loading state
  if (loading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardContent className="py-20 text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping"></div>
          </div>
          <p className="mt-6 text-lg font-medium">Memuat dokumen PAK...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                Dokumen PAK
              </CardTitle>
              <CardDescription className="mt-2 flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                {karyawan.nama} <span className="text-muted-foreground">(NIP: {karyawan.nip})</span>
              </CardDescription>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari tahun, periode, nomor PAK..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
              <Button onClick={fetchPAKData} variant="outline" size="icon" title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Daftar Dokumen */}
      {filteredData.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'Tidak ditemukan' : 'Belum ada dokumen PAK'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {searchTerm
                ? 'Coba gunakan kata kunci lain atau refresh data.'
                : `Saat ini belum ada dokumen PAK untuk ${karyawan.nama}.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredData.map((item) => {
            const viewLink = getGoogleViewLink(item.Link);

            return (
              <Card
                key={`${item.ID}-${item.Tahun}`}
                className="group relative overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-0 bg-card/95 backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-3xl font-bold text-primary">{item.Tahun}</p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {item.Jenis_Periode}
                      </Badge>
                    </div>
                    <Calendar className="h-5 w-5 text-muted-foreground opacity-70" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Periode</p>
                    <p className="font-medium">{item.Periode}</p>
                  </div>

                  {item.Nomor_PAK && (
                    <div>
                      <p className="text-sm text-muted-foreground">Nomor PAK</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono block mt-1 break-all">
                        {item.Nomor_PAK}
                      </code>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Update {formatDate(item.Last_Update)}
                    </span>

                    {item.Link ? (
                      <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                        <a
                          href={viewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Lihat Dokumen
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Link tidak ada
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {filteredData.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Menampilkan <strong>{filteredData.length}</strong> dokumen PAK
          {searchTerm && ` untuk pencarian "${searchTerm}"`}
        </div>
      )}
    </div>
  );
};

export default DownloadPAK;