import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function GenerateSPKBAST() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Only show for Pejabat Pembuat Komitmen
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  if (!isPPK) {
    return null;
  }

  const handleGenerate = () => {
    setIsLoading(true);
    try {
      const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytFwj0PO3-rmIqX9l_pBRlL_XzLWmyJ29dtd9ATmoOx3220aqWfEF89FiWupxMu8Qb/exec";
      
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
      className="bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-2"
    >
      <Zap className="h-4 w-4" />
      {isLoading ? "🔄 Generating..." : "⚡ Generate SPK & BAST"}
    </Button>
  );
}
