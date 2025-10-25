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

  // Fungsi untuk mendapatkan sheet ID dari URL
  const getSheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  // URL Google Sheets asli Anda
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1fmSGAb0lE_iszZPH4I9ols1SAUfDeNU-AOBpG5-Tygc/edit?gid=1379521696#gid=1379521696';
  const sheetId = getSheetIdFromUrl(SHEET_URL);

  // URL API untuk mengakses Google Sheets
  const getApiUrl = () => {
    if (!sheetId) return null;
    
    // Opsi 1: Google Sheets API v4 (membutuhkan API key)
    // return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/OUTPUT?key=YOUR_API_KEY`;
    
    // Opsi 2: Publikasikan sebagai CSV (cara termudah)
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=OUTPUT`;
    
    // Opsi 3: Menggunakan sheet.best (fallback)
    // return `https://sheet.best/api/sheets/${sheetId}`;
  };

  // Data dummy untuk testing (hapus ketika sudah berhasil konek ke Google Sheets)
  const dummyData: Document[] = [
    {
      id: '1',
      no: '001',
      namaDokumen: 'SPK Project Website 2024',
      tanggal: '2024-01-15',
      link: 'https://example.com/spk-001.pdf'
    },
    {
      id: '2',
      no: '002',
      namaDokumen: 'BAST Implementasi Sistem',
      tanggal: '2024-01-20',
      link: 'https://example.com/bast-002.pdf'
    },
    {
      id: '3',
      no: '003',
      namaDokumen: 'SPK Maintenance Bulanan',
      tanggal: '2024-02-01',
      link: 'https://example.com/spk-003.pdf'
    }
  ];

  // Fungsi untuk memuat data dari Google Sheets
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = getApiUrl();
      
      if (!apiUrl) {
        throw new Error('URL Google Sheets tidak valid');
      }

      console.log('Mencoba mengakses:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/csv',
        },
      });
      
      if (!response.ok) {
        // Jika gagal, gunakan data dummy untuk demo
        console.warn('Gagal mengambil data dari Google Sheets, menggunakan data dummy');
        setDocuments(dummyData);
        setError('Tidak dapat terhubung ke Google Sheets. Menampilkan data contoh.');
        return;
      }
      
      const csvData = await response.text();
      console.log('Data diterima:', csvData.substring(0, 200));
      
      // Parse data CSV
      const rows = csvData.split('\n').filter(row => row.trim() !== '');
      
      if (rows.length === 0) {
        throw new Error('Tidak ada data yang ditemukan');
      }
      
      const headers = rows[0].split(',').map(header => header.trim().replace(/"/g, ''));
      
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

      console.log('Indeks kolom:', { noIndex, namaIndex, tanggalIndex, linkIndex });
      
      const parsedDocuments: Document[] = [];
      
      // Isi data dokumen (mulai dari baris kedua)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // Parse CSV dengan handling quotes yang benar
        const cells = row.split(',').map(cell => {
          let cleaned = cell.trim().replace(/^"(.*)"$/, '$1');
          return cleaned;
        });
        
        const doc: Document = {
          id: `doc-${i}`,
          no: cells[noIndex] || '-',
          namaDokumen: cells[namaIndex] || '-',
          tanggal: cells[tanggalIndex] || '-',
          link: cells[linkIndex] || ''
        };
        
        parsedDocuments.push(doc);
      }
      
      setDocuments(parsedDocuments.length > 0 ? parsedDocuments : dummyData);
      
    } catch (err) {
      console.error('Error loading data:', err);
      // Fallback ke data dummy jika error
      setDocuments(dummyData);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data. Menampilkan data contoh.');
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
            <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
              <p className="font-medium">Perhatian</p>
              <p className="text-sm mt-1">{error}</p>
              <div className="mt-2 text-xs text-yellow-600">
                <p>Pastikan:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Google Sheets sudah dipublikasikan</li>
                  <li>Sheet name adalah "OUTPUT"</li>
                  <li>Ada kolom: No, Nama Dokumen, Tanggal, Link</li>
                </ul>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-lg">
              <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Memuat data dari Google Sheets...</p>
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
                        {doc.link && doc.link !== '-' ? (
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

      {/* Panduan setup */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Panduan Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800">
          <div className="space-y-2">
            <p className="font-medium">Untuk menghubungkan dengan Google Sheets:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Buka Google Sheets Anda</li>
              <li>Klik <strong>File → Share → Publish to web</strong></li>
              <li>Pilih sheet <strong>"OUTPUT"</strong></li>
              <li>Pilih format <strong>"Comma-separated values (.csv)"</strong></li>
              <li>Klik <strong>"Publish"</strong></li>
              <li>Salin link yang dihasilkan dan ganti SHEET_URL di kode</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}