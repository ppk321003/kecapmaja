import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, FileText, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PAKData {
  ID: string;
  Tahun: string;
  Jenis_Periode: string;
  Periode: string;
  Link: string;
  Nomor_PAK?: string;
  Status_Dokumen?: string;
  Last_Update?: string;
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
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc' | null;
  }>({
    key: '',
    direction: null
  });
  const { toast } = useToast();

  // Konfigurasi Google Sheets
  const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
  const SHEET_NAME = "olah";

  const fetchPAKData = async () => {
    try {
      setLoading(true);
      
      // Menggunakan Supabase function yang sama seperti di komponen utama
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: `${SHEET_NAME}!A:AR` // Range dari A sampai AR untuk mencakup semua kolom
        }
      });

      if (error) throw error;

      const rows = data.values || [];
      
      if (rows.length <= 1) {
        setPakData([]);
        setFilteredData([]);
        return;
      }

      // Header mapping berdasarkan sheet "olah"
      const headers = rows[0];
      const dataRows = rows.slice(1);

      const mappedData: PAKData[] = dataRows
        .filter((row: any[]) => row.length > 0 && row[0])
        .map((row: any[]) => {
          // Mapping kolom berdasarkan header
          const getColumnValue = (headerName: string) => {
            const index = headers.indexOf(headerName);
            return index >= 0 && row[index] ? row[index].toString() : '';
          };

          return {
            ID: getColumnValue('ID'),
            Tahun: getColumnValue('Tahun'),
            Jenis_Periode: getColumnValue('Jenis Periode'),
            Periode: getColumnValue('Periode'),
            Link: getColumnValue('Link'),
            Nomor_PAK: getColumnValue('Nomor PAK'),
            Status_Dokumen: getColumnValue('Status Dokumen'),
            Last_Update: getColumnValue('Last Update')
          };
        });

      // Filter data berdasarkan NIP karyawan yang sedang login
      const filteredByNIP = mappedData.filter(item => 
        item.ID.includes(karyawan.nip) || 
        karyawan.nama.toLowerCase().includes(item.ID.toLowerCase()) ||
        item.ID.toLowerCase().includes(karyawan.nama.toLowerCase())
      );

      setPakData(filteredByNIP);
      setFilteredData(filteredByNIP);

    } catch (error: any) {
      console.error('Error fetching PAK data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data PAK: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPAKData();
  }, [karyawan.nip]);

  // Filter data berdasarkan search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(pakData);
      return;
    }

    const filtered = pakData.filter(item =>
      item.Tahun.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.Jenis_Periode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.Periode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.Nomor_PAK?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.Status_Dokumen?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredData(filtered);
  }, [searchTerm, pakData]);

  // Sorting function
  const handleSort = (key: keyof PAKData) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }

    setSortConfig({ key, direction });

    if (!direction) {
      setFilteredData([...pakData]);
      return;
    }

    const sortedData = [...filteredData].sort((a, b) => {
      const aValue = a[key] || '';
      const bValue = b[key] || '';

      if (direction === 'asc') {
        return aValue.toString().localeCompare(bValue.toString());
      } else {
        return bValue.toString().localeCompare(aValue.toString());
      }
    });

    setFilteredData(sortedData);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1 inline" /> : 
      <ArrowDown className="h-4 w-4 ml-1 inline" />;
  };

  const getStatusVariant = (status: string = '') => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('selesai') || statusLower.includes('approved') || statusLower.includes('valid')) {
      return 'default';
    }
    if (statusLower.includes('proses') || statusLower.includes('pending') || statusLower.includes('review')) {
      return 'secondary';
    }
    if (statusLower.includes('ditolak') || statusLower.includes('rejected') || statusLower.includes('invalid')) {
      return 'destructive';
    }
    return 'outline';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold">Memuat data PAK...</h3>
            <p className="text-muted-foreground">Sedang mengambil data dari sistem</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Dokumen PAK
          </CardTitle>
          <CardDescription>
            Dokumen Penetapan Angka Kredit (PAK) yang tersedia untuk diunduh
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari berdasarkan tahun, periode, atau nomor PAK..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10" 
              />
            </div>
            <Button 
              onClick={fetchPAKData} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'Tidak ada dokumen PAK ditemukan' : 'Belum ada dokumen PAK'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Coba ubah kata kunci pencarian' 
                  : 'Dokumen PAK akan muncul di sini setelah diproses'
                }
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('Tahun')}>
                      Tahun {getSortIcon('Tahun')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('Jenis_Periode')}>
                      Jenis Periode {getSortIcon('Jenis_Periode')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('Periode')}>
                      Periode {getSortIcon('Periode')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('Nomor_PAK')}>
                      Nomor PAK {getSortIcon('Nomor_PAK')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('Status_Dokumen')}>
                      Status {getSortIcon('Status_Dokumen')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('Last_Update')}>
                      Terakhir Diupdate {getSortIcon('Last_Update')}
                    </TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, index) => (
                    <TableRow key={`${item.ID}-${index}`}>
                      <TableCell className="font-medium">{item.Tahun}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.Jenis_Periode}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.Periode}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {item.Nomor_PAK || '-'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(item.Status_Dokumen) as any}>
                          {item.Status_Dokumen || 'Tidak Tersedia'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(item.Last_Update || '')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {item.Link ? (
                            <>
                              <Button asChild size="sm" variant="outline" className="h-8">
                                <a 
                                  href={item.Link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  title="Pratinjau dokumen"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Lihat
                                </a>
                              </Button>
                              <Button asChild size="sm" className="h-8">
                                <a 
                                  href={item.Link} 
                                  download 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  title="Download dokumen"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Unduh
                                </a>
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" disabled className="h-8">
                              <FileText className="h-3 w-3 mr-1" />
                              Tidak Tersedia
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Menampilkan {filteredData.length} dari {pakData.length} dokumen PAK
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-800">Informasi Dokumen PAK</h4>
                <p className="text-blue-700 text-sm">
                  Dokumen PAK (Penetapan Angka Kredit) berisi penetapan resmi angka kredit yang telah diverifikasi. 
                  Dokumen ini dapat digunakan untuk keperluan administrasi kenaikan pangkat dan jabatan.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DownloadPAK;