
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useSaveDocument } from "@/hooks/use-database";

interface FormValues {
  jenisKak: string;
  jenisPaketMeeting: string;
  programPembebanan: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponenOutput: string;
  subKomponen: string;
  akun: string;
  paguAnggaran: string;
  jumlahItemKegiatan: string;
}

const defaultValues: FormValues = {
  jenisKak: "",
  jenisPaketMeeting: "",
  programPembebanan: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponenOutput: "",
  subKomponen: "",
  akun: "",
  paguAnggaran: "",
  jumlahItemKegiatan: ""
};

// Options
const jenisKakOptions = ["Reguler", "Tambahan", "Khusus"];
const jenisPaketMeetingOptions = ["Full Day", "Half Day", "Coffee Break"];
const subKomponenOptions = ["PPIS", "Dukman"];

const KerangkaAcuanKerja = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<FormValues>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data queries
  const { data: programs = [] } = usePrograms();
  const { data: kegiatan = [] } = useKegiatan(formValues.programPembebanan || null);
  const { data: kros = [] } = useKRO(formValues.kegiatan || null);
  const { data: ros = [] } = useRO(formValues.kro || null);
  const { data: komponenOptions = [] } = useKomponen(formValues.ro || null);
  const { data: akuns = [] } = useAkun();
  
  // Mutation to save document
  const saveDocument = useSaveDocument();

  const handleChange = (field: keyof FormValues, value: string) => {
    setFormValues((prev) => {
      const newValues = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === 'programPembebanan') {
        newValues.kegiatan = '';
        newValues.kro = '';
        newValues.ro = '';
        newValues.komponenOutput = '';
      } else if (field === 'kegiatan') {
        newValues.kro = '';
        newValues.ro = '';
        newValues.komponenOutput = '';
      } else if (field === 'kro') {
        newValues.ro = '';
        newValues.komponenOutput = '';
      } else if (field === 'ro') {
        newValues.komponenOutput = '';
      }
      
      return newValues;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save to Supabase
      await saveDocument.mutateAsync({
        jenisId: "00000000-0000-0000-0000-000000000001", // ID for KAK in the jenis table
        title: `KAK - ${formValues.jenisKak} - ${formValues.programPembebanan}`,
        data: formValues,
      });
      
      toast({
        title: "Dokumen berhasil dibuat",
        description: "Kerangka acuan kerja telah tersimpan",
      });
      
      navigate("/buat-dokumen");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan dokumen",
        description: "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Kerangka Acuan Kerja</h1>
          <p className="text-sm text-muted-foreground">
            Buat dokumen kerangka acuan kerja (KAK)
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jenisKak">Jenis Kerangka Acuan Kerja</Label>
                  <Select 
                    value={formValues.jenisKak} 
                    onValueChange={(value) => handleChange('jenisKak', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis KAK" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenisKakOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jenisPaketMeeting">Jenis Paket Meeting</Label>
                  <Select 
                    value={formValues.jenisPaketMeeting} 
                    onValueChange={(value) => handleChange('jenisPaketMeeting', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis paket meeting" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenisPaketMeetingOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="programPembebanan">Program Pembebanan</Label>
                  <Select 
                    value={formValues.programPembebanan} 
                    onValueChange={(value) => handleChange('programPembebanan', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih program pembebanan" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kegiatan">Kegiatan</Label>
                  <Select 
                    value={formValues.kegiatan} 
                    onValueChange={(value) => handleChange('kegiatan', value)}
                    disabled={!formValues.programPembebanan}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kegiatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {kegiatan.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kro">KRO</Label>
                  <Select 
                    value={formValues.kro} 
                    onValueChange={(value) => handleChange('kro', value)}
                    disabled={!formValues.kegiatan}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih KRO" />
                    </SelectTrigger>
                    <SelectContent>
                      {kros.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ro">RO</Label>
                  <Select 
                    value={formValues.ro} 
                    onValueChange={(value) => handleChange('ro', value)}
                    disabled={!formValues.kro}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih RO" />
                    </SelectTrigger>
                    <SelectContent>
                      {ros.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="komponenOutput">Komponen Output</Label>
                  <Select 
                    value={formValues.komponenOutput} 
                    onValueChange={(value) => handleChange('komponenOutput', value)}
                    disabled={!formValues.ro}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih komponen output" />
                    </SelectTrigger>
                    <SelectContent>
                      {komponenOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subKomponen">Sub Komponen</Label>
                  <Select 
                    value={formValues.subKomponen} 
                    onValueChange={(value) => handleChange('subKomponen', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih sub komponen" />
                    </SelectTrigger>
                    <SelectContent>
                      {subKomponenOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="akun">Akun</Label>
                  <Select 
                    value={formValues.akun} 
                    onValueChange={(value) => handleChange('akun', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih akun" />
                    </SelectTrigger>
                    <SelectContent>
                      {akuns.map((akun) => (
                        <SelectItem key={akun.id} value={akun.id}>
                          {akun.name} ({akun.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paguAnggaran">Pagu Anggaran</Label>
                  <Input
                    id="paguAnggaran"
                    type="number"
                    placeholder="Masukkan pagu anggaran"
                    value={formValues.paguAnggaran}
                    onChange={(e) => handleChange('paguAnggaran', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jumlahItemKegiatan">Jumlah Item Kegiatan</Label>
                  <Input
                    id="jumlahItemKegiatan"
                    type="number"
                    placeholder="Masukkan jumlah item kegiatan"
                    value={formValues.jumlahItemKegiatan}
                    onChange={(e) => handleChange('jumlahItemKegiatan', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan Dokumen"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/buat-dokumen")}>
                  Batal
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
