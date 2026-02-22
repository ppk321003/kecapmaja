import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';

export default function GenerateSPKBAST() {
  const { user } = useAuth();
  const { toast } = useToast();
  const satkerConfig = useSatkerConfigContext();
  const [isLoading, setIsLoading] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');

  // Only show for Pejabat Pembuat Komitmen
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  if (!isPPK) {
    return null;
  }

  useEffect(() => {
    // Get spreadsheet ID dari satker config
    if (satkerConfig) {
      const id = satkerConfig.getUserSatkerSheetId('entrikegiatan');
      if (id) {
        setSpreadsheetId(id);
        console.log('📊 Spreadsheet ID dari config:', id.substring(0, 20) + '...');
      }
    }
  }, [satkerConfig]);

  const handleGenerate = () => {
    if (!spreadsheetId) {
      toast({
        title: "❌ Error",
        description: "Spreadsheet ID tidak ditemukan. Pastikan config satker sudah benar.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const APPS_SCRIPT_URL = `https://script.google.com/macros/s/AKfycbzaHb831im2Lx4-YjEOr23gQIOIhEwovPi_q9d59lCqMnBxSPD5GLcO4biDdGl3jubl/exec?spreadsheetId=${encodeURIComponent(spreadsheetId)}`;
      
      // Gunakan Image approach untuk bypass CORS
      const img = new Image();
      img.onload = () => {
        toast({
          title: "✅ Berhasil",
          description: "Proses generation SPK & BAST dimulai. Harap tunggu beberapa menit dan cek Google Drive Anda untuk hasil dokumen di folder periode.",
          variant: "default"
        });
        setIsLoading(false);
      };
      img.onerror = () => {
        toast({
          title: "✅ Request Terkirim",
          description: "Proses generation dimulai. Cek Google Drive Anda dalam 5-10 menit.",
          variant: "default"
        });
        setIsLoading(false);
      };
      
      // Trigger Apps Script dengan image URL (bypass CORS)
      img.src = APPS_SCRIPT_URL;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
      <Button
        onClick={handleGenerate}
        disabled={isLoading}
        variant="default"
        className="bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
      >
        <Zap className="h-4 w-4" />
        {isLoading ? "Generating..." : "Generate"}
      </Button>
  );
}
