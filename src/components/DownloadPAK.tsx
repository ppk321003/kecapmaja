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

  // === Google Sheets config ===
  const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
  const SHEET_NAME = "olah";

  const fetchPAKData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: `${SHEET_NAME}!A:AR`,
        },
      });

      if (error) throw error;
      const rows = data.values || [];
      if (rows.length <= 1) {
        setPakData([]);
        setFilteredData([]);
        return;
      }

      const headers = rows[0].map((h: string) => h.trim());
      const dataRows = rows.slice(1);

      const mapped: PAKData[] = dataRows
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

      // Filter berdasarkan karyawan
      const filteredByKaryawan = mapped.filter((item) => {
        const nipMatch = (item.NIP || item.ID).includes(karyawan.nip) || karyawan.nip.includes(item.NIP || '');
        const namaMatch = item.Nama?.toLowerCase().includes(karyawan.nama.toLowerCase());
        return nipMatch || namaMatch;
      });

      setPakData(filteredByKaryawan);
      setFilteredData(filteredByKaryawan);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Gagal memuat data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPAKData();
  }, [karyawan.nip, karyawan.nama]);

  // Search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(pakData);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = pakData.filter(
      (i) =>
        i.Tahun.includes(term) ||
        i.Jenis_Periode.toLowerCase().includes(term) ||
        i.Periode.toLowerCase().includes(term) ||
        i.Nomor_PAK?.toLowerCase().includes(term)
    );
    setFilteredData(filtered);
  }, [searchTerm, pakData]);

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '-';

  if (loading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 animate-ping rounded-full border-4 border-primary"></div>
          </div>
          <p className="mt-6 text-lg font-medium">Memuat dokumen PAK...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Card */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                Dokumen PAK
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {karyawan.nama} <span className="text-muted-foreground">(NIP: {karyawan.nip})</span>
                </span>
              </CardDescription>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari tahun / periode / nomor PAK..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
              <Button onClick={fetchPAKData} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* List Dokumen */}
      {filteredData.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'Dokumen tidak ditemukan' : 'Belum ada dokumen PAK'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {searchTerm
                ? 'Coba kata kunci lain atau refresh data.'
                : `Saat ini belum ada dokumen PAK yang tercatat untuk ${karyawan.nama}.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredData.map((item) => (
            <Card
              key={`${item.ID}-${item.Tahun}`}
              className="group relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 border-0 bg-card/80 backdrop-blur"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-primary">{item.Tahun}</p>
                    <Badge variant="secondary" className="text-xs">
                      {item.Jenis_Periode}
                    </Badge>
                  </div>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
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
                    <code className="text-sm bg-muted px-2 py-1 rounded block mt-1 font-mono">
                      {item.Nomor_PAK}
                    </code>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Update {formatDate(item.Last_Update)}
                  </span>

{item.Link ? (
  <Button
    asChild
    size="sm"
    className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg"
  >
    <a
      href={item.Link.startsWith('http') 
        ? (item.Link.includes('/file/d/') 
          ? item.Link.replace('/open?', '/file/d/').split('/').slice(0,6).join('/') + '/view'  // konversi otomatis
          : item.Link.includes('id=') 
            ? `https://drive.google.com/file/d/${item.Link.split('id=')[1].split('&')[0]}/view`
            : item.Link.includes('uc?') 
              ? item.Link 
              : `https://drive.google.com/uc?export=view&id=${item.Link.split('/').pop()}`
        )
        : `https://drive.google.com/uc?export=view&id=${item.Link}`
      }
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2"
    >
      <Eye className="h-4 w-4" />
      Lihat Dokumen
    </a>
  </Button>
) : (
  <Badge variant="outline">Link tidak tersedia</Badge>
)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer info */}
      {filteredData.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Menampilkan <strong>{filteredData.length}</strong> dokumen PAK
          {searchTerm && ` untuk pencarian “${searchTerm}”`}
        </div>
      )}
    </div>
  );
};

export default DownloadPAK;