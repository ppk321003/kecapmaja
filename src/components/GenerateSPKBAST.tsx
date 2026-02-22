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

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytFwj0PO3-rmIqX9l_pBRlL_XzLWmyJ29dtd9ATmoOx3220aqWfEF89FiWupxMu8Qb/exec";
      
      const response = await fetch(APPS_SCRIPT_URL);
      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Berhasil",
          description: "Proses generation SPK & BAST dimulai. Harap tunggu beberapa menit dan cek Google Drive Anda.",
          variant: "default"
        });
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "Gagal memulai proses",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Gagal terhubung ke server. Silakan cek koneksi internet Anda.",
        variant: "destructive"
      });
    } finally {
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
