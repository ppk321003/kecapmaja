import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Publikasi {
  no: number;
  tahun: number;
  tanggal: string;
  kategori: string;
  namaPublikasi: string;
  link: string;
  thumbnailUrl: string;
  deskripsi: string;
  status: string;
  tipeFile: string;
}

interface UsePublikasiSheetsProps {
  spreadsheetId: string;
  sheetName?: string;
}

export const usePublikasiSheets = ({ spreadsheetId, sheetName = "Sheet1" }: UsePublikasiSheetsProps) => {
  const [publikasi, setPublikasi] = useState<Publikasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPublikasi = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: spreadsheetId,
            operation: "read",
            range: `${sheetName}!A:J`  // Full range A to J with A1 notation
          }
        });

        if (supabaseError) throw supabaseError;

        console.log('[usePublikasiSheets] API call with:', { spreadsheetId: spreadsheetId.substring(0, 20) + '...', range: `${sheetName}!A:J` });

        const rows = data.values || [];
        
        if (rows.length <= 1) {
          console.log('[usePublikasiSheets] No data (only header or empty)');
          setPublikasi([]);
          return;
        }

        const publikasiData: Publikasi[] = rows.slice(1)
          .filter((row: any[]) => row && row.length > 0 && row[0])
          .map((row: any[], index: number) => ({
            no: parseInt(row[0]) || index + 1,
            tahun: parseInt(row[1]) || new Date().getFullYear(),
            tanggal: String(row[2] || ''),
            kategori: String(row[3] || ''),
            namaPublikasi: String(row[4] || ''),
            link: String(row[5] || ''),
            thumbnailUrl: String(row[6] || ''),
            deskripsi: String(row[7] || ''),
            status: String(row[8] || ''),
            tipeFile: String(row[9] || '')
          }));

        console.log('[usePublikasiSheets] Loaded:', publikasiData.length, 'publikasi');
        setPublikasi(publikasiData);
      } catch (err: any) {
        console.error('Error fetching publikasi:', err);
        setError(err.message || 'Gagal memuat data publikasi');
        toast({
          title: "Error",
          description: "Gagal memuat data publikasi: " + err.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPublikasi();
  }, [spreadsheetId, sheetName]);

  return { publikasi, loading, error };
};
