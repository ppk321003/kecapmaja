import React, { useState, useEffect } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus, Trash } from "lucide-react";
import { cn } from "@/lib/utils";

const TARGET_SPREADSHEET_ID = "1B2EBK1EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc";

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

interface FormData {
  jenisKak: string;
  jenisPaketMeeting: string;
  program: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponen: string;
  akun: string;
  paguAnggaran: string;
  keterangan: string;
  kegiatanDetails: KegiatanDetail[];
  tanggalMulaiKegiatan: Date | null;
  tanggalAkhirKegiatan: Date | null;
  tanggalPengajuanKAK: Date | null;
  pembuatDaftar: string;
  jumlahGelombang: string;
  waveDates: WaveDate[];
}

// Options dari skrip 2
const jenisKakOptions = ["Belanja Bahan", "Belanja Honor", "Belanja Modal", "Belanja Paket Meeting", "Belanja Perjalanan Dinas"];
const jenisPaketMeetingOptions = ["Halfday", "Fullday", "Fullboard"];
const satuanOptions = ["BLN", "BS", "Desa", "Dok", "Liter", "Lmbr", "M2", "OB", "OH", "OJP", "OK", "OP", "Paket", "Pasar", "RT", "SET", "SLS", "Stel", "Tahun", "Segmen"];

// Format tanggal Indonesia
const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  
  const day = date.getDate();
  const month = date.toLocaleDateString('id-ID', { month: 'long' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

const KerangkaAcuanKerja = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    jenisKak: "",
    jenisPaketMeeting: "",
    program: "",
    kegiatan: "",
    kro: "",
    ro: "",
    komponen: "",
    akun: "",
    paguAnggaran: "",
    keterangan: "",
    kegiatanDetails: [{
      id: `kegiatan-${Date.now()}`,
      namaKegiatan: "",
      volume: "",
      satuan: "",
      hargaSatuan: ""
    }],
    tanggalMulaiKegiatan: null,
    tanggalAkhirKegiatan: null,
    tanggalPengajuanKAK: null,
    pembuatDaftar: "",
    jumlahGelombang: "0",
    waveDates: []
  });

  const { submitData, isSubmitting } = useSubmitToSheets({
    spreadsheetId: TARGET_SPREADSHEET_ID,
    onSuccess: () => {
      toast({
        title: "Sukses",
        description: "Data KAK berhasil dikirim"
      });
      // Reset form ke default values
      setFormData({
        jenisKak: "",
        jenisPaketMeeting: "",
        program: "",
        kegiatan: "",
        kro: "",
        ro: "",
        komponen: "",
        akun: "",
        paguAnggaran: "",
        keterangan: "",
        kegiatanDetails: [{
          id: `kegiatan-${Date.now()}`,
          namaKegiatan: "",
          volume: "",
          satuan: "",
          hargaSatuan: ""
        }],
        tanggalMulaiKegiatan: null,
        tanggalAkhirKegiatan: null,
        tanggalPengajuanKAK: null,
        pembuatDaftar: "",
        jumlahGelombang: "0",
        waveDates: []
      });
    }
  });

  // Effect untuk update wave dates ketika jumlahGelombang berubah (dari skrip 2)
  useEffect(() => {
    const gelombangCount = parseInt(formData.jumlahGelombang) || 0;
    if (gelombangCount > 0) {
      const newWaveDates: WaveDate[] = [];
      for (let i = 0; i < gelombangCount; i++) {
        const existingWave = formData.waveDates[i];
        newWaveDates.push({
          id: existingWave?.id || `wave-${i + 1}-${Date.now()}`,
          startDate: existingWave?.startDate || null,
          endDate: existingWave?.endDate || null
        });
      }
      setFormData(prev => ({
        ...prev,
        waveDates: newWaveDates
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        waveDates: []
      }));
    }
  }, [formData.jumlahGelombang]);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Reset dependent fields (dari skrip 2)
      if (field === 'program') {
        newData.kegiatan = '';
        newData.kro = '';
        newData.ro = '';
        newData.komponen = '';
      } else if (field === 'kegiatan') {
        newData.kro = '';
        newData.ro = '';
        newData.komponen = '';
      } else if (field === 'kro') {
        newData.ro = '';
        newData.komponen = '';
      } else if (field === 'ro') {
        newData.komponen = '';
      } else if (field === 'jenisKak' && value !== 'Belanja Paket Meeting') {
        newData.jenisPaketMeeting = '';
        newData.jumlahGelombang = "0";
        newData.waveDates = [];
      }

      return newData;
    });
  };

  const handleWaveDateChange = (waveId: string, field: 'startDate' | 'endDate', date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      waveDates: prev.waveDates.map(wave => 
        wave.id === waveId ? { ...wave, [field]: date } : wave
      )
    }));
  };

  const handleKegiatanDetailChange = (id: string, field: keyof KegiatanDetail, value: string) => {
    setFormData(prev => ({
      ...prev,
      kegiatanDetails: prev.kegiatanDetails.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addKegiatanDetail = () => {
    setFormData(prev => ({
      ...prev,
      kegiatanDetails: [
        ...prev.kegiatanDetails,
        {
          id: `kegiatan-${Date.now()}`,
          namaKegiatan: "",
          volume: "",
          satuan: "",
          hargaSatuan: ""
        }
      ]
    }));
  };

  const removeKegiatanDetail = (id: string) => {
    if (formData.kegiatanDetails.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      kegiatanDetails: prev.kegiatanDetails.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi dari skrip 2
    if (!formData.jenisKak) {
      toast({
        title: "Validasi Gagal",
        description: "Jenis Kerangka Acuan Kerja wajib diisi",
        variant: "destructive"
      });
      return;
    }

    if (formData.jenisKak === "Belanja Paket Meeting" && !formData.jenisPaketMeeting) {
      toast({
        title: "Validasi Gagal",
        description: "Jenis Paket Meeting wajib diisi",
        variant: "destructive"
      });
      return;
    }

    if (!formData.program || !formData.kegiatan || !formData.kro || !formData.ro || !formData.komponen || !formData.akun) {
      toast({
        title: "Validasi Gagal",
        description: "Semua field program, kegiatan, KRO, RO, komponen, dan akun wajib diisi",
        variant: "destructive"
      });
      return;
    }

    if (!formData.paguAnggaran) {
      toast({
        title: "Validasi Gagal",
        description: "Pagu Anggaran wajib diisi",
        variant: "destructive"
      });
      return;
    }

    // Validasi detail kegiatan
    for (let i = 0; i < formData.kegiatanDetails.length; i++) {
      const detail = formData.kegiatanDetails[i];
      if (!detail.namaKegiatan || !detail.volume || !detail.satuan || !detail.hargaSatuan) {
        toast({
          title: "Validasi Gagal",
          description: `Detail Kegiatan ${i + 1} belum lengkap. Semua field wajib diisi`,
          variant: "destructive"
        });
        return;
      }
    }

    if (!formData.tanggalMulaiKegiatan || !formData.tanggalAkhirKegiatan || !formData.tanggalPengajuanKAK) {
      toast({
        title: "Validasi Gagal",
        description: "Semua tanggal wajib diisi",
        variant: "destructive"
      });
      return;
    }

    if (!formData.pembuatDaftar) {
      toast({
        title: "Validasi Gagal",
        description: "Pembuat Daftar wajib diisi",
        variant: "destructive"
      });
      return;
    }

    // Validasi untuk Belanja Paket Meeting
    if (formData.jenisKak === "Belanja Paket Meeting") {
      if (!formData.jumlahGelombang || parseInt(formData.jumlahGelombang) <= 0) {
        toast({
          title: "Validasi Gagal",
          description: "Jumlah Gelombang wajib diisi dan harus lebih dari 0",
          variant: "destructive"
        });
        return;
      }

      for (let i = 0; i < formData.waveDates.length; i++) {
        const wave = formData.waveDates[i];
        if (!wave.startDate || !wave.endDate) {
          toast({
            title: "Validasi Gagal",
            description: `Tanggal Gelombang ${i + 1} belum lengkap. Tanggal mulai dan akhir wajib diisi`,
            variant: "destructive"
          });
          return;
        }
      }
    }

    // Validasi tanggal
    if (formData.tanggalPengajuanKAK && formData.tanggalMulaiKegiatan && formData.tanggalPengajuanKAK > formData.tanggalMulaiKegiatan) {
      toast({
        title: "Validasi Tanggal Gagal",
        description: "Tanggal pengajuan KAK harus sebelum tanggal mulai kegiatan",
        variant: "destructive"
      });
      return;
    }

    if (formData.tanggalMulaiKegiatan && formData.tanggalAkhirKegiatan && formData.tanggalMulaiKegiatan > formData.tanggalAkhirKegiatan) {
      toast({
        title: "Validasi Tanggal Gagal",
        description: "Tanggal akhir kegiatan harus setelah atau sama dengan tanggal mulai kegiatan",
        variant: "destructive"
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      
      // Format data untuk spreadsheet - mengikuti struktur skrip 1 dengan field tambahan dari skrip 2
      // Setiap detail kegiatan akan menjadi kolom terpisah
      let rowData: any[] = [
        timestamp,
        formData.jenisKak,
        formData.jenisPaketMeeting,
        formData.program,
        formData.kegiatan,
        formData.kro,
        formData.ro,
        formData.komponen,
        formData.akun,
        formData.paguAnggaran,
        formData.keterangan,
        formatTanggalIndonesia(formData.tanggalMulaiKegiatan),
        formatTanggalIndonesia(formData.tanggalAkhirKegiatan),
        formatTanggalIndonesia(formData.tanggalPengajuanKAK),
        formData.pembuatDaftar,
        formData.jumlahGelombang
      ];

      // Tambahkan wave dates ke rowData
      formData.waveDates.forEach(wave => {
        rowData.push(formatTanggalIndonesia(wave.startDate));
        rowData.push(formatTanggalIndonesia(wave.endDate));
      });

      // Tambahkan detail kegiatan ke rowData
      // Untuk kompatibilitas, kita akan mengambil detail pertama atau gabungkan jika multiple
      if (formData.kegiatanDetails.length > 0) {
        const firstDetail = formData.kegiatanDetails[0];
        rowData.push(firstDetail.namaKegiatan);
        rowData.push(firstDetail.volume);
        rowData.push(firstDetail.satuan);
        rowData.push(firstDetail.hargaSatuan);
        
        // Jika ada detail tambahan, tambahkan sebagai set kolom baru
        for (let i = 1; i < formData.kegiatanDetails.length; i++) {
          const detail = formData.kegiatanDetails[i];
          rowData.push(detail.namaKegiatan);
          rowData.push(detail.volume);
          rowData.push(detail.satuan);
          rowData.push(detail.hargaSatuan);
        }
      }

      await submitData(rowData);
    } catch (error) {
      console.error("Error submitting KAK:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengirim data",
        variant: "destructive"
      });
    }
  };

  const shouldShowJenisPaketMeeting = formData.jenisKak === "Belanja Paket Meeting";

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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Field baru dari skrip 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jenis Kerangka Acuan Kerja <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.jenisKak} 
                    onValueChange={(value) => handleChange('jenisKak', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis KAK" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenisKakOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {shouldShowJenisPaketMeeting && (
                  <div className="space-y-2">
                    <Label>Jenis Paket Meeting <span className="text-red-500">*</span></Label>
                    <Select 
                      value={formData.jenisPaketMeeting} 
                      onValueChange={(value) => handleChange('jenisPaketMeeting', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis paket meeting" />
                      </SelectTrigger>
                      <SelectContent>
                        {jenisPaketMeetingOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Program Pembebanan <span className="text-red-500">*</span></Label>
                  <ProgramSelect
                    value={formData.program}
                    onValueChange={(value) => handleChange('program', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kegiatan <span className="text-red-500">*</span></Label>
                  <KegiatanSelect
                    value={formData.kegiatan}
                    onValueChange={(value) => handleChange('kegiatan', value)}
                    programId={formData.program}
                    disabled={!formData.program}
                  />
                </div>

                <div className="space-y-2">
                  <Label>KRO <span className="text-red-500">*</span></Label>
                  <KROSelect
                    value={formData.kro}
                    onValueChange={(value) => handleChange('kro', value)}
                    kegiatanId={formData.kegiatan}
                    disabled={!formData.kegiatan}
                  />
                </div>

                <div className="space-y-2">
                  <Label>RO <span className="text-red-500">*</span></Label>
                  <ROSelect
                    value={formData.ro}
                    onValueChange={(value) => handleChange('ro', value)}
                    kroId={formData.kro}
                    disabled={!formData.kro}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Komponen Output <span className="text-red-500">*</span></Label>
                  <KomponenSelect
                    value={formData.komponen}
                    onValueChange={(value) => handleChange('komponen', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Akun <span className="text-red-500">*</span></Label>
                  <AkunSelect
                    value={formData.akun}
                    onValueChange={(value) => handleChange('akun', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pagu Anggaran <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={formData.paguAnggaran}
                    onChange={(e) => handleChange('paguAnggaran', e.target.value)}
                    placeholder="Masukkan pagu anggaran"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keterangan</Label>
                  <Input
                    value={formData.keterangan}
                    onChange={(e) => handleChange('keterangan', e.target.value)}
                    placeholder="Keterangan (opsional)"
                  />
                </div>

                {/* Field tanggal dari skrip 2 */}
                <div className="space-y-2">
                  <Label>Tanggal Mulai Kegiatan <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.tanggalMulaiKegiatan && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.tanggalMulaiKegiatan ? format(formData.tanggalMulaiKegiatan, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.tanggalMulaiKegiatan || undefined}
                        onSelect={(date) => handleChange('tanggalMulaiKegiatan', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Akhir Kegiatan <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.tanggalAkhirKegiatan && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.tanggalAkhirKegiatan ? format(formData.tanggalAkhirKegiatan, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.tanggalAkhirKegiatan || undefined}
                        onSelect={(date) => handleChange('tanggalAkhirKegiatan', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Pengajuan KAK <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.tanggalPengajuanKAK && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.tanggalPengajuanKAK ? format(formData.tanggalPengajuanKAK, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.tanggalPengajuanKAK || undefined}
                        onSelect={(date) => handleChange('tanggalPengajuanKAK', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Pembuat Daftar <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.pembuatDaftar}
                    onChange={(e) => handleChange('pembuatDaftar', e.target.value)}
                    placeholder="Masukkan nama pembuat daftar"
                    required
                  />
                </div>

                {formData.jenisKak === "Belanja Paket Meeting" && (
                  <div className="space-y-2">
                    <Label>Jumlah Gelombang <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.jumlahGelombang}
                      onChange={(e) => handleChange('jumlahGelombang', e.target.value)}
                      placeholder="Masukkan jumlah gelombang"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Wave Dates untuk Belanja Paket Meeting */}
              {formData.jenisKak === "Belanja Paket Meeting" && formData.waveDates.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Tanggal Gelombang</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.waveDates.map((wave, index) => (
                      <React.Fragment key={wave.id}>
                        <div className="space-y-2">
                          <Label>{`Tanggal Mulai Gelombang ${index + 1} <span className="text-red-500">*</span>`}</Label>
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
                                {wave.startDate ? format(wave.startDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={wave.startDate || undefined}
                                onSelect={(date) => handleWaveDateChange(wave.id, 'startDate', date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>{`Tanggal Akhir Gelombang ${index + 1} <span className="text-red-500">*</span>`}</Label>
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
                                {wave.endDate ? format(wave.endDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={wave.endDate || undefined}
                                onSelect={(date) => handleWaveDateChange(wave.id, 'endDate', date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Detail Kegiatan dari skrip 2 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Detail Kegiatan</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addKegiatanDetail}>
                    <Plus className="mr-1 h-4 w-4" /> Tambah Kegiatan
                  </Button>
                </div>

                {formData.kegiatanDetails.map((kegiatan, index) => (
                  <Card key={kegiatan.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium">Kegiatan {index + 1}</h4>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeKegiatanDetail(kegiatan.id)}
                          disabled={formData.kegiatanDetails.length <= 1}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nama Kegiatan <span className="text-red-500">*</span></Label>
                          <Input
                            value={kegiatan.namaKegiatan}
                            onChange={(e) => handleKegiatanDetailChange(kegiatan.id, 'namaKegiatan', e.target.value)}
                            placeholder="Masukkan nama kegiatan"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Volume <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            value={kegiatan.volume}
                            onChange={(e) => handleKegiatanDetailChange(kegiatan.id, 'volume', e.target.value)}
                            placeholder="Masukkan volume"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Satuan <span className="text-red-500">*</span></Label>
                          <Select
                            value={kegiatan.satuan}
                            onValueChange={(value) => handleKegiatanDetailChange(kegiatan.id, 'satuan', value)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih satuan" />
                            </SelectTrigger>
                            <SelectContent>
                              {satuanOptions.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Harga Satuan <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            value={kegiatan.hargaSatuan}
                            onChange={(e) => handleKegiatanDetailChange(kegiatan.id, 'hargaSatuan', e.target.value)}
                            placeholder="Masukkan harga satuan"
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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