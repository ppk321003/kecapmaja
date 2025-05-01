
import React from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSeedDatabase } from "@/hooks/use-database";

const SeedDataButton = () => {
  const { mutateAsync: seedDatabase, isPending } = useSeedDatabase();

  const handleSeedData = async () => {
    try {
      await seedDatabase();
      toast.success("Data berhasil ditambahkan", {
        description: "Contoh data telah ditambahkan ke database"
      });
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error("Gagal menambahkan data", {
        description: "Terjadi kesalahan saat menambahkan contoh data"
      });
    }
  };

  return (
    <Button
      onClick={handleSeedData}
      disabled={isPending}
      variant="outline"
      className="ml-2"
    >
      {isPending ? "Menambahkan Data..." : "Tambah Contoh Data"}
    </Button>
  );
};

export default SeedDataButton;
