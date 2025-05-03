
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
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";

interface FormValues {
  namaKegiatan: string;
  detil: string;
  program: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponen: string;
  akun: string;
  trainingCenter: string;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  tanggalSpj: Date | null;
  organik: string[];
  mitra: string[];
  pembuatDaftar: string;
}

const defaultValues: FormValues = {
  namaKegiatan: "",
  detil: "",
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  trainingCenter: "",
  tanggalMulai: null,
  tanggalSelesai: null,
  tanggalSpj: null,
  organik: [],
  mitra: [],
  pembuatDaftar: ""
};

const trainingCenterOptions = ["Fitra Hotel", "Garden Hotel", "Horison Ultima", "Achiera Hotel"];

const UangHarianTransport = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<FormValues>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);
  
  // Data queries
  const { data: programs = [] } = usePrograms();
  const { data: kegiatan = [] } = useKegiatan(formValues.program || null);
  const { data: kros = [] } = useKRO(formValues.kegiatan || null);
  const { data: ros = [] } = useRO(formValues.kro || null);
  // Fix: Call useKomponen without arguments
  const { data: komponenOptions = [] } = useKomponen();
  const { data: akuns = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  const handleChange = (field: keyof FormValues, value: any) => {
    setFormValues((prev) => {
      const newValues = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === 'program') {
        newValues.kegiatan = '';
        newValues.kro = '';
        newValues.ro = '';
        newValues.komponen = '';
      } else if (field === 'kegiatan') {
        newValues.kro = '';
        newValues.ro = '';
        newValues.komponen = '';
      } else if (field === 'kro') {
        newValues.ro = '';
        newValues.komponen = '';
      } else if (field === 'ro') {
        newValues.komponen = '';
      }
      
      return newValues;
    });
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
      // Combine form values with selected staff
      const submitData = {
        ...formValues,
        organik: selectedOrganik,
        mitra: selectedMitra
      };
      
      console.log('Form submitted:', submitData);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Dokumen berhasil dibuat",
        description: "Uang Harian dan Transport Lokal telah tersimpan",
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
            Formulir Uang Harian dan Transport Lokal Kegiatan
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

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="detil">Detil</Label>
                  <Input
                    id="detil"
                    placeholder="Masukkan detil kegiatan"
                    value={formValues.detil}
                    onChange={(e) => handleChange('detil', e.target.value)}
                  />
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
                    disabled={!formValues.program}
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
                  <Label htmlFor="komponen">Komponen</Label>
                  <Select 
                    value={formValues.komponen} 
                    onValueChange={(value) => handleChange('komponen', value)}
                    disabled={!formValues.ro}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih komponen" />
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
                  <Label htmlFor="trainingCenter">Training Center</Label>
                  <Select 
                    value={formValues.trainingCenter} 
                    onValueChange={(value) => handleChange('trainingCenter', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih training center" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainingCenterOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formValues.tanggalMulai && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formValues.tanggalMulai ? (
                          format(formValues.tanggalMulai, "PPP")
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formValues.tanggalMulai || undefined}
                        onSelect={(date) => handleChange('tanggalMulai', date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formValues.tanggalSelesai && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formValues.tanggalSelesai ? (
                          format(formValues.tanggalSelesai, "PPP")
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formValues.tanggalSelesai || undefined}
                        onSelect={(date) => handleChange('tanggalSelesai', date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal (SPJ)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formValues.tanggalSpj && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formValues.tanggalSpj ? (
                          format(formValues.tanggalSpj, "PPP")
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formValues.tanggalSpj || undefined}
                        onSelect={(date) => handleChange('tanggalSpj', date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pembuatDaftar">Pembuat Daftar</Label>
                  <Select 
                    value={formValues.pembuatDaftar} 
                    onValueChange={(value) => handleChange('pembuatDaftar', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pembuat daftar" />
                    </SelectTrigger>
                    <SelectContent>
                      {organikList.map((organik) => (
                        <SelectItem key={organik.id} value={organik.id}>
                          {organik.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label>Organik BPS</Label>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {organikList.map((staff) => (
                      <div key={staff.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`organik-${staff.id}`}
                          checked={selectedOrganik.includes(staff.id)}
                          onCheckedChange={(checked) => 
                            handleOrganikChange(staff.id, checked === true)
                          }
                        />
                        <Label htmlFor={`organik-${staff.id}`} className="text-sm">
                          {staff.name} {/* Show only name without NIP */}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mitra Statistik</Label>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {mitraList.map((mitra) => (
                      <div key={mitra.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mitra-${mitra.id}`}
                          checked={selectedMitra.includes(mitra.id)}
                          onCheckedChange={(checked) => 
                            handleMitraChange(mitra.id, checked === true)
                          }
                        />
                        <Label htmlFor={`mitra-${mitra.id}`} className="text-sm">
                          {mitra.name} {mitra.kecamatan ? `- ${mitra.kecamatan}` : ''}
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
