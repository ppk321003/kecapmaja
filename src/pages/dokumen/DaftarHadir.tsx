import React, { useState, useEffect } from "react";
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
import { GoogleSheetsService } from "@/components/GoogleSheetsService";

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
  mitra: []
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

// Dummy staff data
const organikOptions = [
  { id: "1", name: "Organik 1", nip: "198001012010011001" },
  { id: "2", name: "Organik 2", nip: "198001012010011002" },
  { id: "3", name: "Organik 3", nip: "198001012010011003" },
  { id: "4", name: "Organik 4", nip: "198001012010011004" },
  { id: "5", name: "Organik 5", nip: "198001012010011005" }
];

const mitraOptions = [
  { id: "1", name: "Mitra 1" },
  { id: "2", name: "Mitra 2" },
  { id: "3", name: "Mitra 3" },
  { id: "4", name: "Mitra 4" },
  { id: "5", name: "Mitra 5" }
];

const DaftarHadir = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<FormValues>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);

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

  // Function to save data to Google Sheets
  const saveToGoogleSheets = async (data: any) => {
    try {
      // Format the main data for DaftarHadir sheet
      const mainData = [
        data.namaKegiatan,
        data.detil,
        data.jenis,
        data.program,
        data.kegiatan,
        data.kro,
        data.ro,
        data.komponen,
        data.akun,
        data.tanggalMulai ? format(new Date(data.tanggalMulai), "yyyy-MM-dd") : "",
        data.tanggalSelesai ? format(new Date(data.tanggalSelesai), "yyyy-MM-dd") : "",
        new Date().toISOString() // timestamp
      ];

      // Append main data to DaftarHadir sheet
      const mainResponse = await GoogleSheetsService.appendData({
        sheetName: "DaftarHadir",
        range: "A2:L2",
        values: [mainData]
      });

      // Get the row number that was just inserted
      const updatedRange = mainResponse.updates?.updatedRange || "";
      const rowMatch = updatedRange.match(/(\d+)/);
      const rowNumber = rowMatch ? parseInt(rowMatch[0]) : null;

      if (rowNumber) {
        // Save selected organik data with reference to the main row
        if (data.organik.length > 0) {
          const organikRows = data.organik.map((organikId: string) => {
            const organik = organikOptions.find(org => org.id === organikId);
            return [rowNumber.toString(), organik?.name || "", organik?.nip || ""];
          });

          await GoogleSheetsService.appendData({
            sheetName: "Organik",
            range: "A2:C2",
            values: organikRows
          });
        }

        // Save selected mitra data with reference to the main row
        if (data.mitra.length > 0) {
          const mitraRows = data.mitra.map((mitraId: string) => {
            const mitra = mitraOptions.find(m => m.id === mitraId);
            return [rowNumber.toString(), mitra?.name || ""];
          });

          await GoogleSheetsService.appendData({
            sheetName: "Mitra",
            range: "A2:B2",
            values: mitraRows
          });
        }
      }

      return true;
    } catch (error) {
      console.error("Error saving to Google Sheets:", error);
      throw error;
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
      await saveToGoogleSheets(submitData);
      
      toast({
        title: "Dokumen berhasil dibuat",
        description: "Daftar hadir telah tersimpan ke Google Sheets",
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
                        variant={"outline"}
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
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
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
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

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

export default DaftarHadir;
