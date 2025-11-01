import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";
import { ProgramSelect } from "@/components/ProgramSelect";
import { KomponenSelect } from "@/components/KomponenSelect";
import { KegiatanSelect } from "@/components/KegiatanSelect";
import { KROSelect } from "@/components/KROSelect";
import { ROSelect } from "@/components/ROSelect";
import { AkunSelect } from "@/components/AkunSelect";

const TARGET_SPREADSHEET_ID = "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc";

const KerangkaAcuanKerja = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    program: "",
    kegiatan: "",
    kro: "",
    ro: "",
    komponen: "",
    akun: "",
    paguAnggaran: "",
    keterangan: ""
  });

  const { submitData, isSubmitting } = useSubmitToSheets({
    spreadsheetId: TARGET_SPREADSHEET_ID,
    onSuccess: () => {
      toast({
        title: "Sukses",
        description: "Data KAK berhasil dikirim"
      });
      // Reset form
      setFormData({
        program: "",
        kegiatan: "",
        kro: "",
        ro: "",
        komponen: "",
        akun: "",
        paguAnggaran: "",
        keterangan: ""
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi
    if (!formData.program || !formData.kegiatan || !formData.kro || !formData.ro || !formData.komponen || !formData.akun) {
      toast({
        title: "Validasi Gagal",
        description: "Semua field wajib diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const rowData = [
        timestamp,
        formData.program,
        formData.kegiatan,
        formData.kro,
        formData.ro,
        formData.komponen,
        formData.akun,
        formData.paguAnggaran,
        formData.keterangan
      ];

      await submitData(rowData);
    } catch (error) {
      console.error("Error submitting KAK:", error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Kerangka Acuan Kerja (KAK)</h1>
          <p className="text-muted-foreground mt-2">
            Form pengisian Kerangka Acuan Kerja
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form KAK</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Program Pembebanan</Label>
                  <ProgramSelect
                    value={formData.program}
                    onValueChange={(value) => setFormData({ ...formData, program: value, kegiatan: "", kro: "", ro: "" })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kegiatan</Label>
                  <KegiatanSelect
                    value={formData.kegiatan}
                    onValueChange={(value) => setFormData({ ...formData, kegiatan: value, kro: "", ro: "" })}
                    programId={formData.program}
                    disabled={!formData.program}
                  />
                </div>

                <div className="space-y-2">
                  <Label>KRO</Label>
                  <KROSelect
                    value={formData.kro}
                    onValueChange={(value) => setFormData({ ...formData, kro: value, ro: "" })}
                    kegiatanId={formData.kegiatan}
                    disabled={!formData.kegiatan}
                  />
                </div>

                <div className="space-y-2">
                  <Label>RO</Label>
                  <ROSelect
                    value={formData.ro}
                    onValueChange={(value) => setFormData({ ...formData, ro: value })}
                    kroId={formData.kro}
                    disabled={!formData.kro}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Komponen Output</Label>
                  <KomponenSelect
                    value={formData.komponen}
                    onValueChange={(value) => setFormData({ ...formData, komponen: value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Akun</Label>
                  <AkunSelect
                    value={formData.akun}
                    onValueChange={(value) => setFormData({ ...formData, akun: value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pagu Anggaran</Label>
                  <Input
                    type="number"
                    value={formData.paguAnggaran}
                    onChange={(e) => setFormData({ ...formData, paguAnggaran: e.target.value })}
                    placeholder="Masukkan pagu anggaran"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keterangan</Label>
                  <Input
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    placeholder="Keterangan (opsional)"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default KerangkaAcuanKerja;
