
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SeedDataButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSeedData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-data');
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Data berhasil ditambahkan",
        description: "Contoh data telah ditambahkan ke database",
      });
    } catch (error) {
      console.error("Error seeding data:", error);
      toast({
        variant: "destructive",
        title: "Gagal menambahkan data",
        description: "Terjadi kesalahan saat menambahkan contoh data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSeedData} 
      disabled={isLoading}
      variant="outline"
      className="w-full mb-4"
    >
      {isLoading ? "Menambahkan Data..." : "Tambahkan Contoh Data"}
    </Button>
  );
};

export default SeedDataButton;
