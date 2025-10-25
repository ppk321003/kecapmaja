import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

// Tipe data untuk dokumen SPK & BAST
interface Document {
  id: string;
  no: string;
  namaDokumen: string;
  tanggal: string;
  link: string;
}

export default function DownloadSPKBAST() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL Google Sheets yang dipublikasikan sebagai CSV
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQfmSGAb0lE_iszZPH4I9ols1SAUfDeNU-AOBpG5-Tygc/pub?gid=1379521696&single=true&output=csv';

  // Fungsi untuk memuat data dari Google Sheets
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(SHEET_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvData = await response.text();
      
      // Parse data CSV
      const rows = csvData.split('\n');
      const headers = rows[0].split(',');
      
      // Cari indeks kolom yang diperlukan
      const noIndex = headers.findIndex(header => 
        header.toLowerCase().includes('no') || header.toLowerCase().includes('nomor')
      );
      const namaIndex = headers.findIndex(header => 
        header.toLowerCase().includes('nama') || header.toLowerCase().includes('dokumen')
      );
      const tanggalIndex = headers.findIndex(header => 
        header.toLowerCase().includes('tanggal') || header.toLowerCase().includes('date')
      );
      const linkIndex = headers.findIndex(header => 
        header.toLowerCase().includes('link') || header.toLowerCase().includes('url')
      );

      // Validasi apakah kolom yang diperlukan ditemukan
      if (noIndex === -1 || namaIndex === -1 || tanggalIndex === -1 || linkIndex === -1) {
        throw new Error('Format data tidak sesuai. Pastikan sheet memiliki kolom: No, Nama Dokumen, Tanggal, dan Link');
      }
      
      const parsedDocuments: Document[] = [];
      
      // Isi data dokumen
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].trim() === '') continue;
        
        const cells = rows[i].split(',');
        
        // Pastikan kita memiliki data yang cukup
        if (cells.length > Math.max(noIndex, namaIndex, tanggalIndex, linkIndex)) {
          const doc: Document = {
            id: `doc-${i}`,
            no: cells[noIndex]?.trim() || '-',
            namaDokumen: cells[namaIndex]?.trim() || '-',
            tanggal: cells[tanggalIndex]?.trim() || '-',
            link: cells[linkIndex]?.trim() || ''
          };
          
          parsedDocuments.push(doc);
        }
      }
      
      setDocuments(parsedDocuments);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  // Muat data saat komponen dimuat
  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Download SPK & BAST</h1>
        <p className="text-muted-foreground mt-2">
          Unduh dokumen Surat Perjanjian Kerja dan Berita Acara Serah Terima
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-6 w-6 text-primary" />
              <CardTitle>Download Dokumen SPK & BAST</CardTitle>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
          <CardDescription>
            Daftar dokumen SPK dan BAST yang tersedia untuk diunduh
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
              <p className="font-medium">Gagal memuat data</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={loadData}
                className="mt-2 px-3 py-1 text-sm bg-destructive text-white rounded hover:bg-destructive/90 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-lg">
              <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Memuat data dari Google Sheets...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-lg">
              <Download className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {error ? 'Tidak dapat memuat data' : 'Tidak ada dokumen tersedia'}
              </p>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Muat Ulang Data
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-sm border-b">No</th>
                    <th className="text-left py-3 px-4 font-medium text-sm border-b">Nama Dokumen</th>
                    <th className="text-left py-3 px-4 font-medium text-sm border-b">Tanggal</th>
                    <th className="text-left py-3 px-4 font-medium text-sm border-b">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 border-b">{doc.no}</td>
                      <td className="py-3 px-4 border-b">{doc.namaDokumen}</td>
                      <td className="py-3 px-4 border-b">{doc.tanggal}</td>
                      <td className="py-3 px-4 border-b">
                        {doc.link ? (
                          <a
                            href={doc.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Download
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">Tidak tersedia</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            <p>Total dokumen: {documents.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Informasi tambahan */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Informasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• SPK (Surat Perjanjian Kerja) adalah dokumen yang berisi kesepakatan kerja antara pihak-pihak terkait.</p>
          <p>• BAST (Berita Acara Serah Terima) adalah dokumen yang mencatat proses serah terima pekerjaan.</p>
          <p>• Data diambil secara langsung dari Google Sheets untuk memastikan informasi selalu terbaru.</p>
        </CardContent>
      </Card>
    </div>
  );
}