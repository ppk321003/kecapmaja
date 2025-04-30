
import React, { useState, useEffect } from "react";
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

interface PersonHonor {
  id: string;
  personId: string; 
  type: "organik" | "mitra";
  jumlah: string;
  hargaSatuan: string;
}

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
  tanggalSpj: Date | null;
  honorDetails: PersonHonor[];
  pembuatDaftar: string;
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
  tanggalSpj: null,
  honorDetails: [],
  pembuatDaftar: ""
};

// Jenis options
const jenisOptions = ["SPJ Honor Pendataan", "SPJ Honor Pengawasan", "SPJ Honor Instruktur"];

const SPJHonor = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<FormValues>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);
  const [total, setTotal] = useState<number>(0);
  
  // Data queries
  const { data: programs = [] } = usePrograms();
  const { data: kegiatan = [] } = useKegiatan(formValues.program || null);
  const { data: kros = [] } = useKRO(formValues.kegiatan || null);
  const { data: ros = [] } = useRO(formValues.kro || null);
  const { data: komponenOptions = [] } = useKomponen(formValues.ro || null);
  const { data: akuns = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  // Update honor details when selected people change
  useEffect(() => {
    // Create honor details for organik staff
    const organikHonors = selectedOrganik.map(id => ({
      id: `organik-${id}`,
      personId: id,
      type: "organik" as const,
      jumlah: "1",
      hargaSatuan: ""
    }));
    
    // Create honor details for mitra staff
    const mitraHonors = selectedMitra.map(id => ({
      id: `mitra-${id}`,
      personId: id,
      type: "mitra" as const,
      jumlah: "1",
      hargaSatuan: ""
    }));
    
    // Update form values with combined honor details
    setFormValues(prev => ({
      ...prev,
      honorDetails: [...organikHonors, ...mitraHonors]
    }));
  }, [selectedOrganik, selectedMitra]);
  
  // Calculate total whenever honor details change
  useEffect(() => {
    const calculatedTotal = formValues.honorDetails.reduce((sum, detail) => {
      const jumlah = parseFloat(detail.jumlah) || 0;
      const hargaSatuan = parseFloat(detail.hargaSatuan) || 0;
      return sum + (jumlah * hargaSatuan);
    }, 0);
    
    setTotal(calculatedTotal);
  }, [formValues.honorDetails]);

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
  
  const handleHonorDetailChange = (id: string, field: keyof PersonHonor, value: string) => {
    setFormValues(prev => ({
      ...prev,
      honorDetails: prev.honorDetails.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Combine form values with selected staff
      const submitData = {
        ...formValues,
        totalHonor: total
      };
      
      console.log('Form submitted:', submitData);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Dokumen berhasil dibuat",
        description: "SPJ Honor telah tersimpan",
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
  
  const getPersonName = (personId: string, type: "organik" | "mitra") => {
    if (type === "organik") {
      const person = organikList.find(o => o.id === personId);
      return person ? person.name : "";
    } else {
      const person = mitraList.find(m => m.id === personId);
      return person ? `${person.name} - ${person.kecamatan || ""}` : "";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">SPJ Honor</h1>
          <p className="text-sm text-muted-foreground">
            SPJ Honor Pendataan / Pengawasan / Instruktur
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
                          {staff.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mitra Statistik</Label>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {mitraList.map((staff) => (
                      <div key={staff.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mitra-${staff.id}`}
                          checked={selectedMitra.includes(staff.id)}
                          onCheckedChange={(checked) => 
                            handleMitraChange(staff.id, checked === true)
                          }
                        />
                        <Label htmlFor={`mitra-${staff.id}`} className="text-sm">
                          {staff.name} - {staff.kecamatan || ''}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {formValues.honorDetails.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Detail Honorarium</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border px-4 py-2 text-left">Nama</th>
                            <th className="border px-4 py-2 text-right">Jumlah</th>
                            <th className="border px-4 py-2 text-right">Harga Satuan</th>
                            <th className="border px-4 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formValues.honorDetails.map((detail) => {
                            const personName = getPersonName(detail.personId, detail.type);
                            const detailTotal = (parseFloat(detail.jumlah) || 0) * (parseFloat(detail.hargaSatuan) || 0);
                            
                            return (
                              <tr key={detail.id}>
                                <td className="border px-4 py-2">{personName}</td>
                                <td className="border px-4 py-2">
                                  <Input
                                    type="number"
                                    value={detail.jumlah}
                                    onChange={(e) => handleHonorDetailChange(detail.id, 'jumlah', e.target.value)}
                                    className="text-right"
                                  />
                                </td>
                                <td className="border px-4 py-2">
                                  <Input
                                    type="number"
                                    value={detail.hargaSatuan}
                                    onChange={(e) => handleHonorDetailChange(detail.id, 'hargaSatuan', e.target.value)}
                                    className="text-right"
                                  />
                                </td>
                                <td className="border px-4 py-2 text-right">
                                  {detailTotal.toLocaleString('id-ID')}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="font-bold bg-muted">
                            <td colSpan={3} className="border px-4 py-2 text-right">Total</td>
                            <td className="border px-4 py-2 text-right">{total.toLocaleString('id-ID')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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

export default SPJHonor;
