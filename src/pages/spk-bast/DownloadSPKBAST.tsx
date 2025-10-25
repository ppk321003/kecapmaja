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

  // URL Google Sheets yang sudah dipublikasikan sebagai CSV
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQfmSGAb0lE_iszZPH4I9ols1SAUfDeNU-AOBpG5-Tygc/pub?output=csv';

  // Fungsi untuk memuat data dari Google Sheets
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Mengambil data dari:', SHEET_URL);
      
      const response = await fetch(SHEET_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvData = await response.text();
      console.log('Data CSV diterima:', csvData);
      
      // Parse data CSV
      const rows = csvData.split('\n').filter(row => row.trim() !== '');
      
      if (rows.length === 0) {
        throw new Error('Tidak ada data yang ditemukan di Google Sheets');
      }
      
      const headers = rows[0].split(',').map(header => 
        header.trim().replace(/^"(.*)"$/, '$1').toLowerCase()
      );
      
      console.log('Header kolom:', headers);
      
      // Cari indeks kolom yang diperlukan
      const noIndex = headers.findIndex(header => 
        header.includes('no') || header.includes('nomor')
      );
      const namaIndex = headers.findIndex(header => 
        header.includes('nama') || header.includes('dokumen')
      );
      const tanggalIndex = headers.findIndex(header => 
        header.includes('tanggal') || header.includes('date')
      );
      const linkIndex = headers.findIndex(header => 
        header.includes('link') || header.includes('url')
      );

      console.log('Indeks kolom:', { noIndex, namaIndex, tanggalIndex, linkIndex });

      // Validasi kolom
      if (noIndex === -1 || namaIndex === -1 || tanggalIndex === -1 || linkIndex === -1) {
        throw new Error(
          `Format kolom tidak sesuai. Kolom yang ditemukan: ${headers.join(', ')}. ` +
          `Dibutuhkan kolom: No, Nama Dokumen, Tanggal, Link`
        );
      }
      
      const parsedDocuments: Document[] = [];
      
      // Parse data baris per baris (mulai dari baris 1)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Parse CSV dengan handling quotes
        const cells = row.split(',').map(cell => {
          let cleaned = cell.trim();
          // Remove surrounding quotes if present
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
          }
          return cleaned;
        });
        
        // Hanya tambahkan baris yang memiliki data
        if (cells.some(cell => cell.trim() !== '')) {
          const doc: Document = {
            id: `doc-${i}`,
            no: cells[noIndex] || '-',
            namaDokumen: cells[namaIndex] || '-',
            tanggal: cells[tanggalIndex] || '-',
            link: cells[linkIndex] || ''
          };
          
          parsedDocuments.push(doc);
        }
      }
      
      console.log('Data berhasil diparse:', parsedDocuments);
      setDocuments(parsedDocuments);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data dari Google Sheets');
      setDocuments([]); // Pastikan documents kosong jika error
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
                className="mt-2 px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
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
          ) : documents.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-lg">
              <Download className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Tidak ada dokumen tersedia</p>
              <p className="text-sm text-muted-foreground mt-2">
                Pastikan Google Sheets berisi data dan sudah dipublikasikan
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-sm border-b">No</th>
                    <th className="text-left py-3 px-4 font-medium text-sm border-b">Nama Dokumen</th>
                    <th className="text-left py-3 px-4 font-medium text-sm border-b">Tanggal</th>
                    <th className="text-left py-3 px-4 font-medium text-sm border-b">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, index) => (
                    <tr 
                      key={doc.id} 
                      className={`hover:bg-muted/30 transition-colors ${
                        index < documents.length - 1 ? 'border-b' : ''
                      }`}
                    >
                      <td className="py-3 px-4">{doc.no}</td>
                      <td className="py-3 px-4">{doc.namaDokumen}</td>
                      <td className="py-3 px-4">{doc.tanggal}</td>
                      <td className="py-3 px-4">
                        {doc.link && doc.link !== '-' && doc.link !== '' ? (
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

          {documents.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Total dokumen: {documents.length}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informasi troubleshooting */}
      {error && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">Panduan Penyelesaian Masalah</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Pastikan Google Sheets sudah dipublikasikan (File → Share → Publish to web)</p>
            <p>• Pastikan sheet name adalah "OUTPUT"</p>
            <p>• Pastikan ada kolom: No, Nama Dokumen, Tanggal, Link</p>
            <p>• Format publish pilih: Comma-separated values (.csv)</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}