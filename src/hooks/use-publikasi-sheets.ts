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

        console.log('[usePublikasiSheets] Fetching from:', { spreadsheetId: spreadsheetId.substring(0,30) + '...', sheetName });

        // Try simple sheet name first (like Home.tsx does)
        const { data, error: supabaseError } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: spreadsheetId,
            operation: "read",
            range: sheetName  // Use simple name like "Sheet1"
          }
        });

        if (supabaseError) {
          console.error('[usePublikasiSheets] API Error:', supabaseError);
          throw supabaseError;
        }

        console.log('[usePublikasiSheets] API Response:', { 
          hasData: !!data, 
          hasValues: !!data?.values,
          valuesLength: data?.values?.length,
          dataKeys: data ? Object.keys(data) : []
        });

        const rows = data?.values || [];
        
        if (rows.length <= 1) {
          console.log('[usePublikasiSheets] No data rows (header only or empty)');
          setPublikasi([]);
          return;
        }

        console.log('[usePublikasiSheets] Data structure:', {
          headerRow: rows[0],
          firstRow: rows[1],
          totalRows: rows.length
        });

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

        console.log('[usePublikasiSheets] ✅ Successfully loaded:', publikasiData.length, 'publikasi');
        if (publikasiData.length > 0) {
          console.log('[usePublikasiSheets] First item:', publikasiData[0]);
        }
        setPublikasi(publikasiData);
      } catch (err: any) {
        console.error('[usePublikasiSheets] ❌ Error:', err);
        const errorMsg = err.message || 'Gagal memuat data publikasi';
        setError(errorMsg);
        toast({
          title: "Error",
          description: `Gagal memuat data: ${errorMsg}`,
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
