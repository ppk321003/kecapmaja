
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface FormValues {
  namaKegiatan: string;
  detil: string;
  jenis: string;
  program: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponen: string;
  akun: string;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  organik: string[];
  mitra: string[];
  jumlah: string;
  hargaSatuan: string;
  tanggalSpj: Date | null;
  uangHarian: string;
  tc: boolean;
}

const defaultValues: FormValues = {
  namaKegiatan: "",
  detil: "",
  jenis: "",
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  tanggalMulai: null,
  tanggalSelesai: null,
  organik: [],
  mitra: [],
  jumlah: "",
  hargaSatuan: "",
  tanggalSpj: null,
  uangHarian: "",
  tc: false
};

// Dummy data
const jenisOptions = ["Pendataan", "Pemeriksaan", "Supervisi", "Perjalanan Dinas"];
const programOptions = ["Program 1", "Program 2", "Program 3"];

const organikOptions = [
  { id: "1", name: "Organik 1", nip: "198001012010011001" },
  { id: "2", name: "Organik 2", nip: "198001012010011002" },
];

const mitraOptions = [
  { id: "1", name: "Mitra 1" },
  { id: "2", name: "Mitra 2" },
];

const UangHarianTransport = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<FormValues>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);

  const handleChange = (field: keyof FormValues, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOrganikChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedOrganik([...selectedOrganik, id]);
    } else {
      setSelectedOrganik(selectedOrganik.filter(item => item !== id));
    }
  };

  const handleMitraChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedMitra([...selectedMitra, id]);
    } else {
      setSelectedMitra(selectedMitra.filter(item => item !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        ...formValues,
        organik: selectedOrganik,
        mitra: selectedMitra
      };
      
      console.log('Form submitted:', submitData);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Dokumen berhasil dibuat",
        description: "Dokumen uang harian dan transport lokal telah tersimpan",
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
          <h1 className="text-2xl font-bold">Uang Harian dan Transport Lokal</h1>
          <p className="text-sm text-muted-foreground">
            Buat dokumen uang harian dan transport lokal
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="namaKegiatan">Nama Kegiatan</Label>
                  <Input
                    id="namaKegiatan"
                    placeholder="Masukkan nama kegiatan"
                    value={formValues.namaKegiatan}
                    onChange={(e) => handleChange('namaKegiatan', e.target.value)}
                  />
                </div>

                {/* Basic form fields - similar to the previous forms */}
                
                <div className="space-y-2">
                  <Label htmlFor="jenis">Jenis</Label>
                  <Select 
                    value={formValues.jenis} 
                    onValueChange={(value) => handleChange('jenis', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenisOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="program">Program</Label>
                  <Select 
                    value={formValues.program} 
                    onValueChange={(value) => handleChange('program', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unique fields for uang harian */}
                
                <div className="space-y-2">
                  <Label htmlFor="uangHarian">Uang Harian (Rp)</Label>
                  <Input
                    id="uangHarian"
                    type="number"
                    placeholder="Masukkan jumlah uang harian"
                    value={formValues.uangHarian}
                    onChange={(e) => handleChange('uangHarian', e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="tc"
                    checked={formValues.tc}
                    onCheckedChange={(checked) => handleChange('tc', checked === true)}
                  />
                  <Label htmlFor="tc">TC (Training Center)</Label>
                </div>
              </div>

              {/* Staff selection - similar to the previous forms */}
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label>Organik BPS</Label>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {organikOptions.map((staff) => (
                      <div key={staff.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`organik-${staff.id}`}
                          checked={selectedOrganik.includes(staff.id)}
                          onCheckedChange={(checked) => 
                            handleOrganikChange(staff.id, checked === true)
                          }
                        />
                        <Label htmlFor={`organik-${staff.id}`} className="text-sm">
                          {staff.name} - {staff.nip}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mitra Statistik</Label>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {mitraOptions.map((staff) => (
                      <div key={staff.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mitra-${staff.id}`}
                          checked={selectedMitra.includes(staff.id)}
                          onCheckedChange={(checked) => 
                            handleMitraChange(staff.id, checked === true)
                          }
                        />
                        <Label htmlFor={`mitra-${staff.id}`} className="text-sm">
                          {staff.name}
                        </Label>
                      </div>
                    ))}
                  </div>
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

export default UangHarianTransport;
