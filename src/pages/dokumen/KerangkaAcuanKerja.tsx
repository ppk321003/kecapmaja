
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

interface FormValues {
  jenisKak: string;
  jenisPaketMeeting: string;
  programPembebanan: string;
  kegiatan: string;
  rincianOutput: string;
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
  rincianOutput: "",
  komponenOutput: "",
  subKomponen: "",
  akun: "",
  paguAnggaran: "",
  jumlahItemKegiatan: ""
};

// Dummy options
const jenisKakOptions = ["Reguler", "Tambahan", "Khusus"];
const jenisPaketMeetingOptions = ["Full Day", "Half Day", "Coffee Break"];
const programPembebananOptions = ["Program 1", "Program 2", "Program 3"];
const kegiatanOptions = {
  "Program 1": ["Kegiatan 1-A", "Kegiatan 1-B"],
  "Program 2": ["Kegiatan 2-A", "Kegiatan 2-B"],
  "Program 3": ["Kegiatan 3-A", "Kegiatan 3-B"]
};
const rincianOutputOptions = ["Rincian Output 1", "Rincian Output 2", "Rincian Output 3"];
const komponenOutputOptions = {
  "Rincian Output 1": ["Komponen 1-A", "Komponen 1-B"],
  "Rincian Output 2": ["Komponen 2-A", "Komponen 2-B"],
  "Rincian Output 3": ["Komponen 3-A", "Komponen 3-B"]
};
const subKomponenOptions = ["PPIS", "Dukman"];
const akunOptions = ["Bahan", "Honor", "Modal", "Paket Meeting", "Perjalanan Dinas"];

const KerangkaAcuanKerja = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<FormValues>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Conditional options based on selections
  const filteredKegiatanOptions = formValues.programPembebanan 
    ? kegiatanOptions[formValues.programPembebanan as keyof typeof kegiatanOptions] || []
    : [];

  const filteredKomponenOptions = formValues.rincianOutput 
    ? komponenOutputOptions[formValues.rincianOutput as keyof typeof komponenOutputOptions] || []
    : [];

  const handleChange = (field: keyof FormValues, value: string) => {
    setFormValues((prev) => {
      const newValues = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === 'programPembebanan') {
        newValues.kegiatan = '';
      }
      if (field === 'rincianOutput') {
        newValues.komponenOutput = '';
      }
      
      return newValues;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Here you would integrate with Google Spreadsheet & Supabase
      // For now, we'll just simulate a submission
      console.log('Form submitted:', formValues);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
                      {programPembebananOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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
                      {filteredKegiatanOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rincianOutput">Rincian Output</Label>
                  <Select 
                    value={formValues.rincianOutput} 
                    onValueChange={(value) => handleChange('rincianOutput', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih rincian output" />
                    </SelectTrigger>
                    <SelectContent>
                      {rincianOutputOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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
                    disabled={!formValues.rincianOutput}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih komponen output" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredKomponenOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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
                      {akunOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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
