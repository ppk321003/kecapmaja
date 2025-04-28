
import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DaftarHadirPeserta = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Daftar Hadir Peserta</h1>
          <p className="text-sm text-muted-foreground">
            Daftar Hadir Peserta Pelatihan / Instruktur / Panitia / Rapat
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="mb-6 text-center text-muted-foreground">
              Formulir ini menggunakan format yang sama seperti "Daftar Hadir" dengan penyesuaian khusus untuk peserta.
            </p>
            <Button onClick={() => navigate("/dokumen/daftar-hadir")}>
              Gunakan Form Daftar Hadir
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DaftarHadirPeserta;
