import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { formatNumberWithSeparator, parseFormattedNumber } from "@/lib/formatNumber";

const metodePengadaanOptions = ["E Purchasing", "Pengadaan Langsung", "Penunjukan Langsung", "Tender Cepat", "Tender", "Seleksi", "Dikecualikan"];
const bentukKontrakOptions = ["Bukti Pembelian/Pembayaran", "Kuitansi", "Surat Perintah Kerja (SPK)", "Surat Perjanjian", "Surat Pesanan"];
const jenisKontrakOptions = ["Lumpsum", "Harga Satuan", "Gabungan Lumpsum dan Harga Satuan", "Terima Jadi (Turnkey)", "Kontrak Payung"];
const caraPembayaranOptions = ["Sekaligus", "Bertahap", "Sesuai Progress"];
const jenisPengadaanOptions = ["Barang", "Konstruksi", "Jasa Lainnya", "Konsultansi"];

// Mapping untuk auto-select bentuk kontrak berdasarkan jenis pengadaan dan nilai harga
const getBentukKontrakDefault = (jenisPengadaan: string, hargaSatuanSetelahNego: string): string => {
  const harga = parseInt((hargaSatuanSetelahNego || "").replace(/[^\d]/g, "") || "0");
  
  switch(jenisPengadaan) {
    case "Barang":
      if (harga <= 10000000) return "Bukti Pembelian/Pembayaran";
      if (harga <= 50000000) return "Kuitansi";
      if (harga <= 200000000) return "Surat Perintah Kerja (SPK)";
      return "Surat Perjanjian";
    
    case "Konstruksi":
      if (harga <= 200000000) return "Surat Perintah Kerja (SPK)";
      return "Surat Perjanjian";
    
    case "Jasa Lainnya":
      if (harga <= 10000000) return "Bukti Pembelian/Pembayaran";
      if (harga <= 50000000) return "Kuitansi";
      if (harga <= 200000000) return "Surat Perintah Kerja (SPK)";
      return "Surat Perjanjian";
    
    case "Konsultansi":
      if (harga <= 100000000) return "Surat Perintah Kerja (SPK)";
      return "Surat Perjanjian";
    
    default:
      return "";
  }
};

const defaultValues = {
  namaPaket: "",
  kodeKegiatan: "",
  jenisPengadaan: "",
  tanggalMulai: null as Date | null,
  tanggalSelesai: null as Date | null,
  spesifikasiTeknis: "",
  volume: "",
  satuan: "",
  nilaiPaguAnggaran: "",
  hargaSatuanAwal: "",
  hargaPenawaranPenyedia: "",
  hargaSatuanSetelahNego: "",
  metodePengadaan: "",
  bentukKontrak: "",
  jenisKontrak: "",
  caraPembayaran: "",
  uangMuka: "",
  pphPersentase: "",
  ppnPersentase: "",
  nomorFormulirPermintaan: "",
  tanggalFormulirPermintaan: null as Date | null,
  tanggalKak: null as Date | null,
  nomorKertasKerjaHPS: "",
  namaPenyedia: "",
  namaPerwakilan: "",
  jabatan: "",
  alamatPenyedia: "",
  namaBank: "",
  nomorRekening: "",
  atasNamaRekening: "",
  npwpPenyedia: "",
  nomorSuratPenawaranHarga: "",
  nomorSuratPermintaanPembayaran: "",
  nomorInvoice: ""
};

// Constants
const DEFAULT_TARGET_SPREADSHEET_ID = "1Paf4pvIXyJnCGcl21XunXIGdSafhN-0Apz9aE3bOXhg"; // Fallback for satker 3210
const SHEET_NAME = "DokumenPengadaan";

const getTargetSheetId = (dynamicId: string | null) => dynamicId || DEFAULT_TARGET_SPREADSHEET_ID;

// Custom hook untuk submit data
const useSubmitPengadaanToSheets = (targetSheetId: string) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitData = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      console.log('📤 Submitting pengadaan data to sheets:', data);
      
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: targetSheetId,
          operation: "append",
          range: `${SHEET_NAME}!A:AJ`,
          values: [data]
        }
      });

      if (error) {
        console.error('❌ Error submitting pengadaan:', error);
        throw error;
      }

      console.log('✅ Pengadaan submission successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitData, isSubmitting };
};

// Fungsi untuk mendapatkan nomor urut berikutnya
const getNextSequenceNumber = async (targetId: string = DEFAULT_TARGET_SPREADSHEET_ID): Promise<number> => {
  try {
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: targetId,
        operation: "read",
        range: `${SHEET_NAME}!A:A`
      }
    });

    if (error) {
      console.error("Error fetching sequence numbers:", error);
      throw new Error("Gagal mengambil nomor urut terakhir");
    }

    const values = data?.values || [];
    
    if (values.length <= 1) {
      return 1;
    }

    const sequenceNumbers = values
      .slice(1)
      .map((row: any[]) => {
        const value = row[0];
        if (typeof value === 'string' && value.trim() !== '') {
          const num = parseInt(value);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter(num => num > 0);

    if (sequenceNumbers.length === 0) {
      return 1;
    }

    return Math.max(...sequenceNumbers) + 1;
  } catch (error) {
    console.error("Error generating sequence number:", error);
    throw error;
  }
};

// Fungsi untuk generate ID pengadaan (pbj-yymmxxx)
const generatePengadaanId = async (targetId: string = DEFAULT_TARGET_SPREADSHEET_ID): Promise<string> => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `pbj-${year}${month}`;

    // Ambil semua data untuk mencari nomor terakhir di bulan ini
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: targetId,
        operation: "read",
        range: `${SHEET_NAME}!B:B`
      }
    });

    if (error) {
      console.error("Error fetching pengadaan IDs:", error);
      throw new Error("Gagal mengambil ID pengadaan terakhir");
    }

    const values = data?.values || [];
    
    if (values.length <= 1) {
      return `${prefix}001`;
    }

    // Filter ID yang sesuai dengan prefix bulan ini (baca dari kolom B (row[1]))
    const currentMonthIds = values
      .slice(1)
      .map((row: any[]) => {
        const id = row[0]; // Kolom B adalah ID pengadaan (row[0] karena read hanya kolom B)
        if (!id || typeof id !== 'string') return null;
        return id;
      })
      .filter((id: string | null) => id && id.startsWith(prefix))
      .map((id: string) => {
        const numStr = id.replace(prefix, '');
        const num = parseInt(numStr);
        return isNaN(num) ? 0 : num;
      })
      .filter(num => num > 0);

    if (currentMonthIds.length === 0) {
      return `${prefix}001`;
    }

    const nextNum = Math.max(...currentMonthIds) + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error("Error generating pengadaan ID:", error);
    throw error;
  }
};

const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  
  const day = date.getDate();
  const month = date.toLocaleDateString('id-ID', { month: 'long' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

const DokumenPengadaan = () => {
  const navigate = useNavigate();
  const satkerContext = useSatkerConfigContext();
  const targetSheetId = getTargetSheetId(satkerContext?.getUserSatkerSheetId('dokpengadaan'));
  const [formValues, setFormValues] = useState(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { submitData, isSubmitting: isSubmitLoading } = useSubmitPengadaanToSheets(targetSheetId);

  const handleChange = (field: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (value: string): number => {
    if (!value) return 0;
    const numericValue = value.replace(/[^\d]/g, "");
    return parseInt(numericValue) || 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      console.log("Submitting form data:", formValues);

      // Generate nomor urut baru dan ID pengadaan
      const sequenceNumber = await getNextSequenceNumber(targetSheetId);
      const pengadaanId = await generatePengadaanId(targetSheetId);

      // Format data sesuai dengan header spreadsheet
      const satkerConfig = satkerContext?.getUserSatkerConfig();
      
      const rowData = [
        sequenceNumber, // Kolom 1: No
        pengadaanId, // Kolom 2: Id (pbj-yymmxxx)
        formValues.kodeKegiatan, // Kolom 3: Kode Kegiatan
        formValues.namaPaket, // Kolom 4: Nama Paket Pengadaan
        formValues.jenisPengadaan, // Kolom 5: Jenis Pengadaan
        formatTanggalIndonesia(formValues.tanggalMulai), // Kolom 6: Tanggal Mulai Pelaksanaan
        formatTanggalIndonesia(formValues.tanggalSelesai), // Kolom 7: Tanggal Selesai Pelaksanaan
        formValues.spesifikasiTeknis, // Kolom 8: Spesifikasi Teknis
        formValues.volume, // Kolom 9: Volume
        formValues.satuan, // Kolom 10: Satuan
        formatCurrency(formValues.nilaiPaguAnggaran), // Kolom 11: Nilai Pagu Anggaran
        formatCurrency(formValues.hargaSatuanAwal), // Kolom 12: Harga Perkiraan Sendiri (HPS) (PPK)
        formatCurrency(formValues.hargaPenawaranPenyedia), // Kolom 13: Harga Penawaran (Penyedia)
        formatCurrency(formValues.hargaSatuanSetelahNego), // Kolom 14: Harga Satuan Setelah Nego (PBJ / PPK)
        formValues.metodePengadaan, // Kolom 15: Metode Pengadaan
        formValues.bentukKontrak, // Kolom 16: Bentuk/Bukti Kontrak
        formValues.jenisKontrak, // Kolom 17: Jenis Kontrak
        formValues.caraPembayaran, // Kolom 18: Cara Pembayaran
        formValues.uangMuka, // Kolom 19: Uang Muka
        formValues.pphPersentase, // Kolom 20: PPh (Pajak Penghasilan) (%)
        formValues.ppnPersentase, // Kolom 21: PPN (Pajak Pertambahan Nilai) (%)
        formValues.nomorFormulirPermintaan, // Kolom 21: Nomor Formulir Permintaan
        formatTanggalIndonesia(formValues.tanggalFormulirPermintaan), // Kolom 22: Tanggal Formulir Permintaan
        formatTanggalIndonesia(formValues.tanggalKak), // Kolom 23: Tanggal Kerangka Acuan Kerja (KAK)
        formValues.nomorKertasKerjaHPS, // Kolom 24: Nomor Kertas Kerja Penyusunan HPS
        formValues.namaPenyedia, // Kolom 25: Penyedia Barang/Jasa
        formValues.namaPerwakilan, // Kolom 26: Nama Perwakilan Penyedia
        formValues.jabatan, // Kolom 27: Jabatan
        formValues.alamatPenyedia, // Kolom 28: Alamat Penyedia
        formValues.namaBank, // Kolom 29: Bank Penyedia
        `'${formValues.nomorRekening}`, // Kolom 30: No Rek Penyedia (dengan apostrophe untuk format text di Sheets)
        formValues.atasNamaRekening, // Kolom 31: Atas Nama Rekening
        formValues.npwpPenyedia, // Kolom 32: NPWP Penyedia
        formValues.nomorSuratPenawaranHarga, // Kolom 33: Nomor Surat Penawaran
        formValues.nomorSuratPermintaanPembayaran, // Kolom 34: Nomor Surat Permohonan Pembayaran
        formValues.nomorInvoice // Kolom 35: Nomor Invoice Pembayaran
      ];

      console.log('📋 Final pengadaan data array:', rowData);
      console.log('🔢 Total columns:', rowData.length);
      console.log('🆔 Pengadaan ID:', pengadaanId);

      // Submit data ke spreadsheet
      await submitData(rowData);

      toast({
        title: "Berhasil",
        description: `Dokumen pengadaan berhasil disimpan (ID: ${pengadaanId})`
      });
      navigate("/e-dokumen/buat");

    } catch (error: any) {
      console.error("Error saving document:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan dokumen",
        description: error.message || "Terjadi kesalahan saat menyimpan data"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isSubmitLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">Dokumen Pengadaan</h1>
          <p className="text-sm text-muted-foreground">
            Formulir Dokumen Pengadaan Barang dan Jasa
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="space-y-6">
            {/* Data Umum */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-inherit">Data Umum</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="namaPaket">Nama Paket Pengadaan <span className="text-red-500">*</span></Label>
                    <Input 
                      id="namaPaket" 
                      value={formValues.namaPaket} 
                      onChange={e => handleChange("namaPaket", e.target.value)} 
                      placeholder="Masukkan nama paket pengadaan" 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="kodeKegiatan">Kode Kegiatan <span className="text-red-500">*</span></Label>
                    <Input 
                      id="kodeKegiatan" 
                      value={formValues.kodeKegiatan} 
                      onChange={e => handleChange("kodeKegiatan", e.target.value)} 
                      placeholder="Cth: 054.01.GG.2910.QMA.010.051.A.524114" 
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="jenisPengadaan">Jenis Pengadaan <span className="text-red-500">*</span></Label>
                    <Select value={formValues.jenisPengadaan} onValueChange={value => {
                      handleChange("jenisPengadaan", value);
                      // Auto-select bentuk kontrak dynamically saat jenis pengadaan berubah
                      const defaultBentuk = getBentukKontrakDefault(value, formValues.hargaSatuanSetelahNego);
                      if (defaultBentuk) {
                        handleChange("bentukKontrak", defaultBentuk);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis pengadaan" />
                      </SelectTrigger>
                      <SelectContent>
                        {jenisPengadaanOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tanggal Mulai Pelaksanaan <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formValues.tanggalMulai && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formValues.tanggalMulai ? format(formValues.tanggalMulai, "PPP") : <span>Pilih tanggal</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={formValues.tanggalMulai || undefined} 
                          onSelect={date => handleChange("tanggalMulai", date)} 
                          initialFocus 
                          className="p-3 pointer-events-auto" 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal Selesai Pelaksanaan <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formValues.tanggalSelesai && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formValues.tanggalSelesai ? format(formValues.tanggalSelesai, "PPP") : <span>Pilih tanggal</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={formValues.tanggalSelesai || undefined} 
                          onSelect={date => handleChange("tanggalSelesai", date)} 
                          initialFocus 
                          className="p-3 pointer-events-auto" 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="spesifikasiTeknis">Spesifikasi Teknis <span className="text-red-500">*</span></Label>
                    <Textarea 
                      id="spesifikasiTeknis" 
                      value={formValues.spesifikasiTeknis} 
                      onChange={e => handleChange("spesifikasiTeknis", e.target.value)} 
                      placeholder="Masukkan spesifikasi teknis" 
                      rows={3}
                      required 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Penawaran */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-lime-700">Data Penawaran</h2>
                
                {/* Baris 1: Volume, Satuan, Nilai Pagu */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="volume">Volume <span className="text-red-500">*</span></Label>
                    <Input 
                      id="volume" 
                      value={formValues.volume} 
                      onChange={e => handleChange("volume", e.target.value)} 
                      placeholder="Masukkan volume" 
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="satuan">Satuan <span className="text-red-500">*</span></Label>
                    <Input 
                      id="satuan" 
                      value={formValues.satuan} 
                      onChange={e => handleChange("satuan", e.target.value)} 
                      placeholder="Masukkan satuan"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nilaiPaguAnggaran">Nilai Pagu Anggaran (Rp) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="nilaiPaguAnggaran" 
                      type="text" 
                      value={formatNumberWithSeparator(formValues.nilaiPaguAnggaran)} 
                      onChange={e => handleChange("nilaiPaguAnggaran", parseFormattedNumber(e.target.value))} 
                      placeholder="0" 
                      className="text-right"
                      required
                    />
                  </div>
                </div>

                {/* Baris 2: Harga */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="hargaSatuanAwal">Harga Perkiraan Sendiri (HPS) (PPK) (Rp) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="hargaSatuanAwal" 
                      type="text" 
                      value={formatNumberWithSeparator(formValues.hargaSatuanAwal)} 
                      onChange={e => handleChange("hargaSatuanAwal", parseFormattedNumber(e.target.value))} 
                      placeholder="0" 
                      className="text-right"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hargaPenawaranPenyedia">Harga Penawaran (Penyedia) (Rp) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="hargaPenawaranPenyedia" 
                      type="text" 
                      value={formatNumberWithSeparator(formValues.hargaPenawaranPenyedia)} 
                      onChange={e => handleChange("hargaPenawaranPenyedia", parseFormattedNumber(e.target.value))} 
                      placeholder="0" 
                      className="text-right"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hargaSatuanSetelahNego">Harga Satuan Setelah Nego (PBJ / PPK) (Rp) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="hargaSatuanSetelahNego" 
                      type="text" 
                      value={formatNumberWithSeparator(formValues.hargaSatuanSetelahNego)} 
                      onChange={e => {
                        const newValue = parseFormattedNumber(e.target.value);
                        handleChange("hargaSatuanSetelahNego", newValue);
                        // Auto-select bentuk kontrak dynamically saat harga berubah
                        const defaultBentuk = getBentukKontrakDefault(formValues.jenisPengadaan, newValue);
                        if (defaultBentuk) {
                          handleChange("bentukKontrak", defaultBentuk);
                        }
                      }} 
                      placeholder="0" 
                      className="text-right"
                      required
                    />
                  </div>
                </div>

                {/* Baris 3: Metode, Bentuk, Jenis */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

                  <div className="space-y-2">
                    <Label htmlFor="metodePengadaan">Metode Pengadaan <span className="text-red-500">*</span></Label>
                    <Select value={formValues.metodePengadaan} onValueChange={value => handleChange("metodePengadaan", value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih metode" />
                      </SelectTrigger>
                      <SelectContent>
                        {metodePengadaanOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bentukKontrak">Bentuk/Bukti Kontrak <span className="text-red-500">*</span></Label>
                    <Select value={formValues.bentukKontrak} onValueChange={value => handleChange("bentukKontrak", value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bentuk kontrak" />
                      </SelectTrigger>
                      <SelectContent>
                        {bentukKontrakOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jenisKontrak">Jenis Kontrak <span className="text-red-500">*</span></Label>
                    <Select value={formValues.jenisKontrak} onValueChange={value => handleChange("jenisKontrak", value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis kontrak" />
                      </SelectTrigger>
                      <SelectContent>
                        {jenisKontrakOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Baris 4: Cara Pembayaran, Uang Muka, PPh, PPN (1 baris) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="caraPembayaran">Cara Pembayaran <span className="text-red-500">*</span></Label>
                    <Select value={formValues.caraPembayaran} onValueChange={value => handleChange("caraPembayaran", value)} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih cara pembayaran" />
                      </SelectTrigger>
                      <SelectContent>
                        {caraPembayaranOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uangMuka">Uang Muka (%) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="uangMuka" 
                      type="number" 
                      value={formValues.uangMuka} 
                      onChange={e => handleChange("uangMuka", e.target.value)} 
                      placeholder="0" 
                      min="0" 
                      max="100"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pphPersentase">PPh (Pajak Penghasilan) (%) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="pphPersentase" 
                      type="number" 
                      value={formValues.pphPersentase} 
                      onChange={e => handleChange("pphPersentase", e.target.value)} 
                      placeholder="0" 
                      min="0"
                      required
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ppnPersentase">PPN (Pajak Pertambahan Nilai) (%) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="ppnPersentase" 
                      type="number" 
                      value={formValues.ppnPersentase} 
                      onChange={e => handleChange("ppnPersentase", e.target.value)} 
                      placeholder="0" 
                      min="0"
                      required
                      step="0.01"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Dokumen */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-sky-700">Data Dokumen</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nomorFormulirPermintaan">Nomor Formulir Permintaan <span className="text-red-500">*</span></Label>
                    <Input 
                      id="nomorFormulirPermintaan" 
                      value={formValues.nomorFormulirPermintaan} 
                      onChange={e => handleChange("nomorFormulirPermintaan", e.target.value)} 
                      placeholder="Masukkan nomor formulir"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal Formulir Permintaan <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formValues.tanggalFormulirPermintaan && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formValues.tanggalFormulirPermintaan ? format(formValues.tanggalFormulirPermintaan, "PPP") : <span>Pilih tanggal</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={formValues.tanggalFormulirPermintaan || undefined} 
                          onSelect={date => handleChange("tanggalFormulirPermintaan", date)} 
                          initialFocus 
                          className="p-3 pointer-events-auto" 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal Kerangka Acuan Kerja (KAK) <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formValues.tanggalKak && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formValues.tanggalKak ? format(formValues.tanggalKak, "PPP") : <span>Pilih tanggal</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={formValues.tanggalKak || undefined} 
                          onSelect={date => handleChange("tanggalKak", date)} 
                          initialFocus 
                          className="p-3 pointer-events-auto" 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorKertasKerjaHPS">Nomor Kertas Kerja Penyusunan HPS <span className="text-red-500">*</span></Label>
                    <Input 
                      id="nomorKertasKerjaHPS" 
                      value={formValues.nomorKertasKerjaHPS} 
                      onChange={e => handleChange("nomorKertasKerjaHPS", e.target.value)} 
                      placeholder="Cth: 001/PPK/3210/PL.300/SSN03/01/2025"
                      required 
                    />
                  </div>
                </div>

                {/* Baris 3 Nomor Surat (1 baris) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="nomorSuratPenawaranHarga">Nomor Surat Penawaran Harga (Penyedia) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="nomorSuratPenawaranHarga" 
                      value={formValues.nomorSuratPenawaranHarga} 
                      onChange={e => handleChange("nomorSuratPenawaranHarga", e.target.value)} 
                      placeholder="Masukkan nomor surat"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorSuratPermintaanPembayaran">Nomor Surat Permohonan Pembayaran (Penyedia) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="nomorSuratPermintaanPembayaran" 
                      value={formValues.nomorSuratPermintaanPembayaran} 
                      onChange={e => handleChange("nomorSuratPermintaanPembayaran", e.target.value)} 
                      placeholder="Masukkan nomor surat"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorInvoice">Nomor Invoice Pembayaran (Penyedia) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="nomorInvoice" 
                      value={formValues.nomorInvoice} 
                      onChange={e => handleChange("nomorInvoice", e.target.value)} 
                      placeholder="Masukkan nomor invoice"
                      required 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Penyedia */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-orange-800">Data Penyedia</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="namaPenyedia">Nama Penyedia Barang/Jasa <span className="text-red-500">*</span></Label>
                    <Input 
                      id="namaPenyedia" 
                      value={formValues.namaPenyedia} 
                      onChange={e => handleChange("namaPenyedia", e.target.value)} 
                      placeholder="Masukkan nama penyedia"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="namaPerwakilan">Nama Perwakilan Penyedia <span className="text-red-500">*</span></Label>
                    <Input 
                      id="namaPerwakilan" 
                      value={formValues.namaPerwakilan} 
                      onChange={e => handleChange("namaPerwakilan", e.target.value)} 
                      placeholder="Masukkan nama perwakilan"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jabatan">Jabatan <span className="text-red-500">*</span></Label>
                    <Input 
                      id="jabatan" 
                      value={formValues.jabatan} 
                      onChange={e => handleChange("jabatan", e.target.value)} 
                      placeholder="Masukkan jabatan"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alamatPenyedia">Alamat Penyedia <span className="text-red-500">*</span></Label>
                    <Input
                      id="alamatPenyedia" 
                      value={formValues.alamatPenyedia} 
                      onChange={e => handleChange("alamatPenyedia", e.target.value)} 
                      placeholder="Masukkan alamat penyedia"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="namaBank">Nama Bank <span className="text-red-500">*</span></Label>
                    <Input 
                      id="namaBank" 
                      value={formValues.namaBank} 
                      onChange={e => handleChange("namaBank", e.target.value)} 
                      placeholder="Masukkan nama bank"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorRekening">Nomor Rekening <span className="text-red-500">*</span></Label>
                    <Input 
                      id="nomorRekening" 
                      value={formValues.nomorRekening} 
                      onChange={e => handleChange("nomorRekening", e.target.value)} 
                      placeholder="Masukkan nomor rekening"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="atasNamaRekening">Atas Nama Rekening <span className="text-red-500">*</span></Label>
                    <Input 
                      id="atasNamaRekening" 
                      value={formValues.atasNamaRekening} 
                      onChange={e => handleChange("atasNamaRekening", e.target.value)} 
                      placeholder="Masukkan nama pemilik rekening"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="npwpPenyedia">NPWP Penyedia <span className="text-red-500">*</span></Label>
                    <Input 
                      id="npwpPenyedia" 
                      value={formValues.npwpPenyedia} 
                      onChange={e => handleChange("npwpPenyedia", e.target.value)} 
                      placeholder="Masukkan NPWP penyedia"
                      required 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/e-dokumen/buat")}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Menyimpan..." : "Simpan Dokumen"}
            </Button>
          </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default DokumenPengadaan;