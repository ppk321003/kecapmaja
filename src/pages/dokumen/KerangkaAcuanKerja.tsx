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
import { Calendar as CalendarIcon, Plus, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useSaveDocument, useOrganikBPS } from "@/hooks/use-database";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

interface KegiatanDetail {
  id: string;
  namaKegiatan: string;
  volume: string;
  satuan: string;
  hargaSatuan: string;
}

interface WaveDate {
  id: string;
  startDate: Date | null;
  endDate: Date | null;
}

interface FormValues {
  jenisKak: string;
  jenisPaketMeeting: string;
  programPembebanan: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponenOutput: string;
  akun: string;
  paguAnggaran: string;
  kegiatanDetails: KegiatanDetail[];
  tanggalMulaiKegiatan: Date | null;
  tanggalAkhirKegiatan: Date | null;
  tanggalPengajuanKAK: Date | null;
  pembuatDaftar: string;
  jumlahGelombang: string;
  waveDates: WaveDate[];
}

const defaultValues: FormValues = {
  jenisKak: "",
  jenisPaketMeeting: "",
  programPembebanan: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponenOutput: "",
  akun: "",
  paguAnggaran: "",
  kegiatanDetails: [],
  tanggalMulaiKegiatan: null,
  tanggalAkhirKegiatan: null,
  tanggalPengajuanKAK: null,
  pembuatDaftar: "",
  jumlahGelombang: "0",
  waveDates: []
};

// Options
const jenisKakOptions = ["Reguler", "Tambahan", "Khusus", "Belanja Paket Meeting"];
const jenisPaketMeetingOptions = ["Full Day", "Half Day", "Coffee Break"];
const subKomponenOptions = ["PPIS", "Dukman"];
const satuanOptions = ["OK", "OR", "OB", "OH", "OJ", "Paket", "Laporan", "Dokumen"];

const KerangkaAcuanKerja = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<FormValues>({
    ...defaultValues,
    kegiatanDetails: [{ id: `kegiatan-${Date.now()}`, namaKegiatan: "", volume: "", satuan: "", hargaSatuan: "" }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data queries
  const { data: programs = [] } = usePrograms();
  const { data: kegiatan = [] } = useKegiatan(formValues.programPembebanan || null);
  const { data: kros = [] } = useKRO(formValues.kegiatan || null);
  const { data: ros = [] } = useRO(formValues.kro || null);
  const { data: komponenOptions = [] } = useKomponen(formValues.ro || null);
  const { data: akuns = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  
  // Mutation to save document
  const saveDocument = useSaveDocument();
  
  // Google Sheets submission hook
  const submitToSheets = useSubmitToSheets({
    documentType: "KerangkaAcuanKerja",
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });

  // Effect to update wave dates when jumlahGelombang changes
  useEffect(() => {
    const gelombangCount = parseInt(formValues.jumlahGelombang) || 0;
    if (gelombangCount > 0) {
      // Create or update wave dates array
      const newWaveDates: WaveDate[] = [];
      for (let i = 0; i < gelombangCount; i++) {
        // Try to preserve existing dates if available
        const existingWave = formValues.waveDates[i];
        newWaveDates.push({
          id: existingWave?.id || `wave-${i + 1}-${Date.now()}`,
          startDate: existingWave?.startDate || null,
          endDate: existingWave?.endDate || null
        });
      }
      setFormValues(prev => ({
        ...prev,
        waveDates: newWaveDates
      }));
    } else {
      // Reset wave dates if jumlahGelombang is 0
      setFormValues(prev => ({
        ...prev,
        waveDates: []
      }));
    }
  }, [formValues.jumlahGelombang]);

  const handleChange = (field: keyof FormValues, value: any) => {
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

  const handleWaveDateChange = (waveId: string, field: 'startDate' | 'endDate', date: Date | null) => {
    setFormValues(prev => ({
      ...prev,
      waveDates: prev.waveDates.map(wave => 
        wave.id === waveId ? { ...wave, [field]: date } : wave
      )
    }));
  };

  const handleKegiatanDetailChange = (id: string, field: keyof KegiatanDetail, value: string) => {
    setFormValues(prev => ({
      ...prev,
      kegiatanDetails: prev.kegiatanDetails.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addKegiatanDetail = () => {
    setFormValues(prev => ({
      ...prev,
      kegiatanDetails: [
        ...prev.kegiatanDetails,
        { id: `kegiatan-${Date.now()}`, namaKegiatan: "", volume: "", satuan: "", hargaSatuan: "" }
      ]
    }));
  };

  const removeKegiatanDetail = (id: string) => {
    if (formValues.kegiatanDetails.length <= 1) {
      return; // Keep at least one kegiatan detail
    }
    
    setFormValues(prev => ({
      ...prev,
      kegiatanDetails: prev.kegiatanDetails.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate dates
    if (formValues.tanggalPengajuanKAK && formValues.tanggalMulaiKegiatan && 
        formValues.tanggalPengajuanKAK > formValues.tanggalMulaiKegiatan) {
      toast({
        variant: "destructive",
        title: "Validasi tanggal gagal",
        description: "Tanggal pengajuan KAK harus sebelum tanggal mulai kegiatan",
      });
      setIsSubmitting(false);
      return;
    }

    if (formValues.tanggalMulaiKegiatan && formValues.tanggalAkhirKegiatan && 
        formValues.tanggalMulaiKegiatan > formValues.tanggalAkhirKegiatan) {
      toast({
        variant: "destructive",
        title: "Validasi tanggal gagal",
        description: "Tanggal akhir kegiatan harus setelah atau sama dengan tanggal mulai kegiatan",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // First, submit to Google Sheets
      await submitToSheets.mutateAsync(formValues);
      
      // Then, save to Supabase
      await saveDocument.mutateAsync({
        jenisId: "6dfd154e-827b-41ad-988c-5c6c78a9b262", // Make sure this is a valid UUID in your jenis table
        title: `KAK - ${formValues.jenisKak} - ${formValues.programPembebanan}`,
        data: formValues,
      });
      
      toast({
        title: "Dokumen berhasil dibuat",
        description: "Kerangka acuan kerja telah tersimpan",
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
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Detail Kegiatan</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addKegiatanDetail}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Tambah Kegiatan
                  </Button>
                </div>

                {formValues.kegiatanDetails.map((kegiatan, index) => (
                  <Card key={kegiatan.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Kegiatan {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeKegiatanDetail(kegiatan.id)}
                          disabled={formValues.kegiatanDetails.length <= 1}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`namaKegiatan-${kegiatan.id}`}>Nama Kegiatan</Label>
                          <Input
                            id={`namaKegiatan-${kegiatan.id}`}
                            placeholder="Masukkan nama kegiatan"
                            value={kegiatan.namaKegiatan}
                            onChange={(e) => handleKegiatanDetailChange(kegiatan.id, 'namaKegiatan', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`volume-${kegiatan.id}`}>Volume</Label>
                          <Input
                            id={`volume-${kegiatan.id}`}
                            type="number"
                            placeholder="Masukkan volume"
                            value={kegiatan.volume}
                            onChange={(e) => handleKegiatanDetailChange(kegiatan.id, 'volume', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`satuan-${kegiatan.id}`}>Satuan</Label>
                          <Select
                            value={kegiatan.satuan}
                            onValueChange={(value) => handleKegiatanDetailChange(kegiatan.id, 'satuan', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih satuan" />
                            </SelectTrigger>
                            <SelectContent>
                              {satuanOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`hargaSatuan-${kegiatan.id}`}>Harga Satuan</Label>
                          <Input
                            id={`hargaSatuan-${kegiatan.id}`}
                            type="number"
                            placeholder="Masukkan harga satuan"
                            value={kegiatan.hargaSatuan}
                            onChange={(e) => handleKegiatanDetailChange(kegiatan.id, 'hargaSatuan', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tanggal Mulai Kegiatan</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formValues.tanggalMulaiKegiatan && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formValues.tanggalMulaiKegiatan ? (
                          format(formValues.tanggalMulaiKegiatan, "PPP")
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formValues.tanggalMulaiKegiatan || undefined}
                        onSelect={(date) => handleChange('tanggalMulaiKegiatan', date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Akhir Kegiatan</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formValues.tanggalAkhirKegiatan && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formValues.tanggalAkhirKegiatan ? (
                          format(formValues.tanggalAkhirKegiatan, "PPP")
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formValues.tanggalAkhirKegiatan || undefined}
                        onSelect={(date) => handleChange('tanggalAkhirKegiatan', date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Tanggal Pengajuan KAK</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formValues.tanggalPengajuanKAK && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formValues.tanggalPengajuanKAK ? (
                          format(formValues.tanggalPengajuanKAK, "PPP")
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formValues.tanggalPengajuanKAK || undefined}
                        onSelect={(date) => handleChange('tanggalPengajuanKAK', date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pembuatDaftar">Penanggung Jawab Kegiatan</Label>
                  <Select 
                    value={formValues.pembuatDaftar} 
                    onValueChange={(value) => handleChange('pembuatDaftar', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih penanggung jawab" />
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

              {formValues.jenisKak === "Belanja Paket Meeting" && (
                <div className="grid grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="jumlahGelombang">Jumlah Gelombang</Label>
                    <Input
                      id="jumlahGelombang"
                      type="number"
                      min="0"
                      placeholder="Masukkan jumlah gelombang"
                      value={formValues.jumlahGelombang}
                      onChange={(e) => handleChange('jumlahGelombang', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {formValues.jenisKak === "Belanja Paket Meeting" && formValues.waveDates.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                  {formValues.waveDates.map((wave, index) => (
                    <React.Fragment key={wave.id}>
                      <div className="space-y-2">
                        <Label>{`Tanggal Mulai Gelombang-${index + 1}`}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !wave.startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {wave.startDate ? (
                                format(wave.startDate, "PPP")
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={wave.startDate || undefined}
                              onSelect={(date) => handleWaveDateChange(wave.id, 'startDate', date)}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>{`Tanggal Akhir Gelombang-${index + 1}`}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !wave.endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {wave.endDate ? (
                                format(wave.endDate, "PPP")
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={wave.endDate || undefined}
                              onSelect={(date) => handleWaveDateChange(wave.id, 'endDate', date)}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}

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
