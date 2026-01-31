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

const metodePengadaanOptions = ["Pengadaan Langsung", "Penunjukan Langsung", "E-Purchasing"];
const bentukKontrakOptions = ["Kuitansi", "SPK", "Surat Perjanjian", "Bukti Pembelian", "Dokumen Lainnya"];
const jenisKontrakOptions = ["Lumpsum", "Harga Satuan", "Gabungan Lumpsum dan Harga Satuan", "Terima Jadi (Turnkey)", "Kontrak Payung"];
const caraPembayaranOptions = ["Sekaligus", "Bertahap", "Sesuai Progress"];

const defaultValues = {
  namaPaket: "",
  kodeKegiatan: "",
  tanggalMulai: null as Date | null,
  tanggalSelesai: null as Date | null,
  spesifikasiTeknis: "",
  volume: "",
  satuan: "",
  hargaSatuanAwal: "",
  hargaSatuanSetelahNego: "",
  metodePengadaan: "",
  bentukKontrak: "",
  jenisKontrak: "",
  caraPembayaran: "",
  uangMuka: "",
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
          range: `${SHEET_NAME}!A:AC`,
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

    // Filter ID yang sesuai dengan prefix bulan ini
    const currentMonthIds = values
      .slice(1)
      .map((row: any[]) => row[1]) // Kolom B adalah ID
      .filter((id: string) => id && id.startsWith(prefix))
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
      const rowData = [
        sequenceNumber, // Kolom 1: No
        pengadaanId, // Kolom 2: Id (pbj-yymmxxx)
        formValues.kodeKegiatan, // Kolom 3: Kode Kegiatan
        formValues.namaPaket, // Kolom 4: Nama Paket Pengadaan
        formatTanggalIndonesia(formValues.tanggalMulai), // Kolom 5: Tanggal Mulai Pelaksanaan
        formatTanggalIndonesia(formValues.tanggalSelesai), // Kolom 6: Tanggal Selesai Pelaksanaan
        formValues.spesifikasiTeknis, // Kolom 7: Spesifikasi Teknis
        formValues.volume, // Kolom 8: Volume
        formValues.satuan, // Kolom 9: Satuan
        formatCurrency(formValues.hargaSatuanAwal), // Kolom 10: Harga Satuan Awal
        formatCurrency(formValues.hargaSatuanSetelahNego), // Kolom 11: Harga Satuan Setelah Nego
        formValues.metodePengadaan, // Kolom 12: Metode Pengadaan
        formValues.bentukKontrak, // Kolom 13: Bentuk/Bukti Kontrak
        formValues.jenisKontrak, // Kolom 14: Jenis Kontrak
        formValues.caraPembayaran, // Kolom 15: Cara Pembayaran
        formValues.uangMuka, // Kolom 16: Uang Muka
        formValues.nomorFormulirPermintaan, // Kolom 17: Nomor Formulir Permintaan
        formatTanggalIndonesia(formValues.tanggalFormulirPermintaan), // Kolom 18: Tanggal Formulir Permintaan
        formatTanggalIndonesia(formValues.tanggalKak), // Kolom 19: Tanggal Kerangka Acuan Kerja (KAK)
        formValues.nomorKertasKerjaHPS, // Kolom 20: Nomor Kertas Kerja Penyusunan HPS
        formValues.namaPenyedia, // Kolom 21: Penyedia Barang/Jasa
        formValues.namaPerwakilan, // Kolom 22: Nama Perwakilan Penyedia
        formValues.jabatan, // Kolom 23: Jabatan
        formValues.alamatPenyedia, // Kolom 24: Alamat Penyedia
        formValues.namaBank, // Kolom 25: Bank Penyedia
        formValues.nomorRekening, // Kolom 26: No Rek Penyedia
        formValues.atasNamaRekening, // Kolom 27: Atas Nama Rekening
        formValues.npwpPenyedia, // Kolom 28: NPWP Penyedia
        formValues.nomorSuratPenawaranHarga, // Kolom 29: Nomor Surat Penawaran
        formValues.nomorSuratPermintaanPembayaran, // Kolom 30: Nomor Surat Permohonan Pembayaran
        formValues.nomorInvoice // Kolom 31: Nomor Invoice Pembayaran
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
                    <Label htmlFor="namaPaket">Nama Paket Pengadaan</Label>
                    <Input 
                      id="namaPaket" 
                      value={formValues.namaPaket} 
                      onChange={e => handleChange("namaPaket", e.target.value)} 
                      placeholder="Masukkan nama paket pengadaan" 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="kodeKegiatan">Kode Kegiatan (cth: 054.01.GG.2910.QMA.010.051.A.524114)</Label>
                    <Input 
                      id="kodeKegiatan" 
                      value={formValues.kodeKegiatan} 
                      onChange={e => handleChange("kodeKegiatan", e.target.value)} 
                      placeholder="Masukkan kode kegiatan" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tanggal Mulai Pelaksanaan</Label>
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
                    <Label>Tanggal Selesai Pelaksanaan</Label>
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
                    <Label htmlFor="spesifikasiTeknis">Spesifikasi Teknis</Label>
                    <Textarea 
                      id="spesifikasiTeknis" 
                      value={formValues.spesifikasiTeknis} 
                      onChange={e => handleChange("spesifikasiTeknis", e.target.value)} 
                      placeholder="Masukkan spesifikasi teknis" 
                      rows={3} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Penawaran */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-lime-700">Data Penawaran</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="volume">Volume</Label>
                    <Input 
                      id="volume" 
                      value={formValues.volume} 
                      onChange={e => handleChange("volume", e.target.value)} 
                      placeholder="Masukkan volume" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="satuan">Satuan</Label>
                    <Input 
                      id="satuan" 
                      value={formValues.satuan} 
                      onChange={e => handleChange("satuan", e.target.value)} 
                      placeholder="Masukkan satuan" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hargaSatuanAwal">Harga Satuan Awal (Rp)</Label>
                    <Input 
                      id="hargaSatuanAwal" 
                      type="text" 
                      value={formatNumberWithSeparator(formValues.hargaSatuanAwal)} 
                      onChange={e => handleChange("hargaSatuanAwal", parseFormattedNumber(e.target.value))} 
                      placeholder="0" 
                      className="text-right"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hargaSatuanSetelahNego">Harga Satuan Setelah Nego (Rp)</Label>
                    <Input 
                      id="hargaSatuanSetelahNego" 
                      type="text" 
                      value={formatNumberWithSeparator(formValues.hargaSatuanSetelahNego)} 
                      onChange={e => handleChange("hargaSatuanSetelahNego", parseFormattedNumber(e.target.value))} 
                      placeholder="0" 
                      className="text-right"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metodePengadaan">Metode Pengadaan</Label>
                    <Select value={formValues.metodePengadaan} onValueChange={value => handleChange("metodePengadaan", value)}>
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
                    <Label htmlFor="bentukKontrak">Bentuk/Bukti Kontrak</Label>
                    <Select value={formValues.bentukKontrak} onValueChange={value => handleChange("bentukKontrak", value)}>
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
                    <Label htmlFor="jenisKontrak">Jenis Kontrak</Label>
                    <Select value={formValues.jenisKontrak} onValueChange={value => handleChange("jenisKontrak", value)}>
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

                  <div className="space-y-2">
                    <Label htmlFor="caraPembayaran">Cara Pembayaran</Label>
                    <Select value={formValues.caraPembayaran} onValueChange={value => handleChange("caraPembayaran", value)}>
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
                    <Label htmlFor="uangMuka">Uang Muka (%)</Label>
                    <Input 
                      id="uangMuka" 
                      type="number" 
                      value={formValues.uangMuka} 
                      onChange={e => handleChange("uangMuka", e.target.value)} 
                      placeholder="0" 
                      min="0" 
                      max="100" 
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
                    <Label htmlFor="nomorFormulirPermintaan">Nomor Formulir Permintaan</Label>
                    <Input 
                      id="nomorFormulirPermintaan" 
                      value={formValues.nomorFormulirPermintaan} 
                      onChange={e => handleChange("nomorFormulirPermintaan", e.target.value)} 
                      placeholder="Masukkan nomor formulir" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal Formulir Permintaan</Label>
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
                    <Label>Tanggal Kerangka Acuan Kerja (KAK)</Label>
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
                    <Label htmlFor="nomorKertasKerjaHPS">Nomor Kertas Kerja Penyusunan HPS (cth: 001/PPK/3210/PL.300/SSN03/01/2025)</Label>
                    <Input 
                      id="nomorKertasKerjaHPS" 
                      value={formValues.nomorKertasKerjaHPS} 
                      onChange={e => handleChange("nomorKertasKerjaHPS", e.target.value)} 
                      placeholder="Masukkan nomor kertas kerja" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorSuratPenawaranHarga">Nomor Surat Penawaran Harga (Penyedia)</Label>
                    <Input 
                      id="nomorSuratPenawaranHarga" 
                      value={formValues.nomorSuratPenawaranHarga} 
                      onChange={e => handleChange("nomorSuratPenawaranHarga", e.target.value)} 
                      placeholder="Masukkan nomor surat" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorSuratPermintaanPembayaran">Nomor Surat Permohonan Pembayaran (Penyedia)</Label>
                    <Input 
                      id="nomorSuratPermintaanPembayaran" 
                      value={formValues.nomorSuratPermintaanPembayaran} 
                      onChange={e => handleChange("nomorSuratPermintaanPembayaran", e.target.value)} 
                      placeholder="Masukkan nomor surat" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorInvoice">Nomor Invoice Pembayaran (Penyedia)</Label>
                    <Input 
                      id="nomorInvoice" 
                      value={formValues.nomorInvoice} 
                      onChange={e => handleChange("nomorInvoice", e.target.value)} 
                      placeholder="Masukkan nomor invoice" 
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
                    <Label htmlFor="namaPenyedia">Nama Penyedia Barang/Jasa</Label>
                    <Input 
                      id="namaPenyedia" 
                      value={formValues.namaPenyedia} 
                      onChange={e => handleChange("namaPenyedia", e.target.value)} 
                      placeholder="Masukkan nama penyedia" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="namaPerwakilan">Nama Perwakilan Penyedia</Label>
                    <Input 
                      id="namaPerwakilan" 
                      value={formValues.namaPerwakilan} 
                      onChange={e => handleChange("namaPerwakilan", e.target.value)} 
                      placeholder="Masukkan nama perwakilan" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jabatan">Jabatan</Label>
                    <Input 
                      id="jabatan" 
                      value={formValues.jabatan} 
                      onChange={e => handleChange("jabatan", e.target.value)} 
                      placeholder="Masukkan jabatan" 
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="alamatPenyedia">Alamat Penyedia</Label>
                    <Textarea 
                      id="alamatPenyedia" 
                      value={formValues.alamatPenyedia} 
                      onChange={e => handleChange("alamatPenyedia", e.target.value)} 
                      placeholder="Masukkan alamat penyedia" 
                      rows={2} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="namaBank">Nama Bank</Label>
                    <Input 
                      id="namaBank" 
                      value={formValues.namaBank} 
                      onChange={e => handleChange("namaBank", e.target.value)} 
                      placeholder="Masukkan nama bank" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorRekening">Nomor Rekening</Label>
                    <Input 
                      id="nomorRekening" 
                      value={formValues.nomorRekening} 
                      onChange={e => handleChange("nomorRekening", e.target.value)} 
                      placeholder="Masukkan nomor rekening" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="atasNamaRekening">Atas Nama Rekening</Label>
                    <Input 
                      id="atasNamaRekening" 
                      value={formValues.atasNamaRekening} 
                      onChange={e => handleChange("atasNamaRekening", e.target.value)} 
                      placeholder="Masukkan nama pemilik rekening" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="npwpPenyedia">NPWP Penyedia</Label>
                    <Input 
                      id="npwpPenyedia" 
                      value={formValues.npwpPenyedia} 
                      onChange={e => handleChange("npwpPenyedia", e.target.value)} 
                      placeholder="Masukkan NPWP penyedia" 
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