
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useOrganikBPS, useMitraStatistik, useSaveDocument } from "@/hooks/use-database";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

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
  tanggalMulai: null,
  tanggalSelesai: null,
  organik: [],
  mitra: [],
  pembuatDaftar: ""
};

// Dummy data
const jenisOptions = ["Pertemuan", "Pelatihan", "Rapat", "Sosialisasi"];
const programOptions = ["Program 1", "Program 2", "Program 3"];

const kegiatanOptions = {
  "Program 1": ["Kegiatan 1-A", "Kegiatan 1-B"],
  "Program 2": ["Kegiatan 2-A", "Kegiatan 2-B"],
  "Program 3": ["Kegiatan 3-A", "Kegiatan 3-B"]
};

const kroOptions = {
  "Kegiatan 1-A": ["KRO 1-A1", "KRO 1-A2"],
  "Kegiatan 1-B": ["KRO 1-B1", "KRO 1-B2"],
  "Kegiatan 2-A": ["KRO 2-A1", "KRO 2-A2"],
  "Kegiatan 2-B": ["KRO 2-B1", "KRO 2-B2"],
  "Kegiatan 3-A": ["KRO 3-A1", "KRO 3-A2"],
  "Kegiatan 3-B": ["KRO 3-B1", "KRO 3-B2"]
};

const roOptions = {
  "KRO 1-A1": ["RO 1-A1-1", "RO 1-A1-2"],
  "KRO 1-A2": ["RO 1-A2-1", "RO 1-A2-2"],
  "KRO 1-B1": ["RO 1-B1-1", "RO 1-B1-2"],
  "KRO 1-B2": ["RO 1-B2-1", "RO 1-B2-2"],
  "KRO 2-A1": ["RO 2-A1-1", "RO 2-A1-2"],
  "KRO 2-A2": ["RO 2-A2-1", "RO 2-A2-2"],
  "KRO 2-B1": ["RO 2-B1-1", "RO 2-B1-2"],
  "KRO 2-B2": ["RO 2-B2-1", "RO 2-B2-2"],
  "KRO 3-A1": ["RO 3-A1-1", "RO 3-A1-2"],
  "KRO 3-A2": ["RO 3-A2-1", "RO 3-A2-2"],
  "KRO 3-B1": ["RO 3-B1-1", "RO 3-B1-2"],
  "KRO 3-B2": ["RO 3-B2-1", "RO 3-B2-2"]
};

const komponenOptions = {
  "RO 1-A1-1": ["Komponen 1-A1-1-1", "Komponen 1-A1-1-2"],
  "RO 1-A1-2": ["Komponen 1-A1-2-1", "Komponen 1-A1-2-2"],
  // ... continued for each RO
};

const akunOptions = ["Bahan", "Honor", "Modal", "Paket Meeting", "Perjalanan Dinas"];

const DaftarHadir = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<FormValues>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();
  const saveDocument = useSaveDocument();
  
  // Google Sheets submission hook
  const submitToSheets = useSubmitToSheets({ 
    documentType: "DaftarHadir",
    onSuccess: () => {
      // Navigate after successful submission
      navigate("/buat-dokumen");
    }
  });

  // Conditional options based on selections
  const filteredKegiatanOptions = formValues.program 
    ? kegiatanOptions[formValues.program as keyof typeof kegiatanOptions] || []
    : [];
  
  const filteredKroOptions = formValues.kegiatan 
    ? kroOptions[formValues.kegiatan as keyof typeof kroOptions] || []
    : [];

  const filteredRoOptions = formValues.kro 
    ? roOptions[formValues.kro as keyof typeof roOptions] || []
    : [];

  const filteredKomponenOptions = formValues.ro 
    ? komponenOptions[formValues.ro as keyof typeof komponenOptions] || []
    : ["Komponen 1", "Komponen 2"]; // Fallback

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
      
      // First, save to Google Sheets
      await submitToSheets.mutateAsync(submitData);
      
      // Then, save to Supabase
      await saveDocument.mutateAsync({
        jenisId: "6dfd154e-827b-41ad-988c-5c6c78a9b262", // Make sure this is a valid UUID in your jenis table
        title: `Daftar Hadir - ${submitData.namaKegiatan}`,
        data: submitData,
      });
      
      toast({
        title: "Dokumen berhasil dibuat",
        description: "Daftar hadir telah tersimpan",
      });
      
      // No need to navigate here as it's handled in the onSuccess of submitToSheets
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan dokumen",
        description: "Terjadi kesalahan saat menyimpan data",
      });
      setIsSubmitting(false);
    }
  };

  // Generate data for the recap table
  const generateRecapData = () => {
    const recapData = [];
    
    // Add selected organik
    for (const id of selectedOrganik) {
      const organik = organikList.find(org => org.id === id);
      if (organik) {
        recapData.push({
          nama: organik.name,
          kecamatan: "Majalengka", // Default for Organik BPS
          jabatan: "Organik BPS"
        });
      }
    }
    
    // Add selected mitra
    for (const id of selectedMitra) {
      const mitra = mitraList.find(m => m.id === id);
      if (mitra) {
        recapData.push({
          nama: mitra.name,
          kecamatan: mitra.kecamatan || "-",
          jabatan: "Mitra Statistik"
        });
      }
    }
    
    return recapData;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Daftar Hadir</h1>
          <p className="text-sm text-muted-foreground">
            Buat dokumen daftar hadir kegiatan
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
                      <SelectValue placeholder="Pilih jenis kegiatan" />
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
                      {filteredKegiatanOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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
                      {filteredKroOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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
                      {filteredRoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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
                      {filteredKomponenOptions.map((option) => (
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

              {/* Recap Table - Added as requested */}
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-medium">Rekap Daftar Hadir</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kecamatan</TableHead>
                      <TableHead>Jabatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generateRecapData().map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.nama}</TableCell>
                        <TableCell>{item.kecamatan}</TableCell>
                        <TableCell>{item.jabatan}</TableCell>
                      </TableRow>
                    ))}
                    {generateRecapData().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          Belum ada peserta yang dipilih
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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

export default DaftarHadir;
