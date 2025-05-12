import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
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
import { useSubmitToPengadaanSheets } from "@/hooks/use-google-sheets-submit-pengadaan";
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
const DokumenPengadaan = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create submission mutation using Google Sheets
  const submitMutation = useSubmitToPengadaanSheets({
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });
  const handleChange = (field: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      console.log("Submitting form data:", formValues);

      // Submit to Google Sheets
      await submitMutation.mutateAsync(formValues);
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
  return <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-700">Dokumen Pengadaan</h1>
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
                    <Input id="namaPaket" value={formValues.namaPaket} onChange={e => handleChange("namaPaket", e.target.value)} placeholder="Masukkan nama paket pengadaan" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="kodeKegiatan">Kode Kegiatan (cth: 054.01.GG.2910.QMA.010.051.A.524114)</Label>
                    <Input id="kodeKegiatan" value={formValues.kodeKegiatan} onChange={e => handleChange("kodeKegiatan", e.target.value)} placeholder="Masukkan kode kegiatan" />
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
                        <Calendar mode="single" selected={formValues.tanggalMulai || undefined} onSelect={date => handleChange("tanggalMulai", date)} initialFocus className="p-3 pointer-events-auto" />
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
                        <Calendar mode="single" selected={formValues.tanggalSelesai || undefined} onSelect={date => handleChange("tanggalSelesai", date)} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="spesifikasiTeknis">Spesifikasi Teknis</Label>
                    <Textarea id="spesifikasiTeknis" value={formValues.spesifikasiTeknis} onChange={e => handleChange("spesifikasiTeknis", e.target.value)} placeholder="Masukkan spesifikasi teknis" rows={3} />
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
                    <Input id="volume" value={formValues.volume} onChange={e => handleChange("volume", e.target.value)} placeholder="Masukkan volume" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="satuan">Satuan</Label>
                    <Input id="satuan" value={formValues.satuan} onChange={e => handleChange("satuan", e.target.value)} placeholder="Masukkan satuan" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hargaSatuanAwal">Harga Satuan Awal (Rp)</Label>
                    <Input id="hargaSatuanAwal" type="number" value={formValues.hargaSatuanAwal} onChange={e => handleChange("hargaSatuanAwal", e.target.value)} placeholder="0" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hargaSatuanSetelahNego">Harga Satuan Setelah Nego (Rp)</Label>
                    <Input id="hargaSatuanSetelahNego" type="number" value={formValues.hargaSatuanSetelahNego} onChange={e => handleChange("hargaSatuanSetelahNego", e.target.value)} placeholder="0" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metodePengadaan">Metode Pengadaan</Label>
                    <Select value={formValues.metodePengadaan} onValueChange={value => handleChange("metodePengadaan", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih metode" />
                      </SelectTrigger>
                      <SelectContent>
                        {metodePengadaanOptions.map(option => <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>)}
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
                        {bentukKontrakOptions.map(option => <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>)}
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
                        {jenisKontrakOptions.map(option => <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>)}
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
                        {caraPembayaranOptions.map(option => <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uangMuka">Uang Muka (%)</Label>
                    <Input id="uangMuka" type="number" value={formValues.uangMuka} onChange={e => handleChange("uangMuka", e.target.value)} placeholder="0" min="0" max="100" />
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
                    <Input id="nomorFormulirPermintaan" value={formValues.nomorFormulirPermintaan} onChange={e => handleChange("nomorFormulirPermintaan", e.target.value)} placeholder="Masukkan nomor formulir" />
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
                        <Calendar mode="single" selected={formValues.tanggalFormulirPermintaan || undefined} onSelect={date => handleChange("tanggalFormulirPermintaan", date)} initialFocus className="p-3 pointer-events-auto" />
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
                        <Calendar mode="single" selected={formValues.tanggalKak || undefined} onSelect={date => handleChange("tanggalKak", date)} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorKertasKerjaHPS">Nomor Kertas Kerja Penyusunan HPS (cth: 001/PPK/3210/PL.300/SSN03/01/2025)
                    </Label>
                    <Input id="nomorKertasKerjaHPS" value={formValues.nomorKertasKerjaHPS} onChange={e => handleChange("nomorKertasKerjaHPS", e.target.value)} placeholder="Masukkan nomor kertas kerja" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorSuratPenawaranHarga">Nomor Surat Penawaran Harga (Penyedia)</Label>
                    <Input id="nomorSuratPenawaranHarga" value={formValues.nomorSuratPenawaranHarga} onChange={e => handleChange("nomorSuratPenawaranHarga", e.target.value)} placeholder="Masukkan nomor surat" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorSuratPermintaanPembayaran">Nomor Surat Permohonan Pembayaran (Penyedia)</Label>
                    <Input id="nomorSuratPermintaanPembayaran" value={formValues.nomorSuratPermintaanPembayaran} onChange={e => handleChange("nomorSuratPermintaanPembayaran", e.target.value)} placeholder="Masukkan nomor surat" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorInvoice">Nomor Invoice Pembayaran (Penyedia)</Label>
                    <Input id="nomorInvoice" value={formValues.nomorInvoice} onChange={e => handleChange("nomorInvoice", e.target.value)} placeholder="Masukkan nomor invoice" />
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
                    <Input id="namaPenyedia" value={formValues.namaPenyedia} onChange={e => handleChange("namaPenyedia", e.target.value)} placeholder="Masukkan nama penyedia" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="namaPerwakilan">Nama Perwakilan Penyedia</Label>
                    <Input id="namaPerwakilan" value={formValues.namaPerwakilan} onChange={e => handleChange("namaPerwakilan", e.target.value)} placeholder="Masukkan nama perwakilan" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jabatan">Jabatan</Label>
                    <Input id="jabatan" value={formValues.jabatan} onChange={e => handleChange("jabatan", e.target.value)} placeholder="Masukkan jabatan" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="alamatPenyedia">Alamat Penyedia</Label>
                    <Textarea id="alamatPenyedia" value={formValues.alamatPenyedia} onChange={e => handleChange("alamatPenyedia", e.target.value)} placeholder="Masukkan alamat penyedia" rows={2} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="namaBank">Nama Bank</Label>
                    <Input id="namaBank" value={formValues.namaBank} onChange={e => handleChange("namaBank", e.target.value)} placeholder="Masukkan nama bank" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomorRekening">Nomor Rekening</Label>
                    <Input id="nomorRekening" value={formValues.nomorRekening} onChange={e => handleChange("nomorRekening", e.target.value)} placeholder="Masukkan nomor rekening" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="atasNamaRekening">Atas Nama Rekening</Label>
                    <Input id="atasNamaRekening" value={formValues.atasNamaRekening} onChange={e => handleChange("atasNamaRekening", e.target.value)} placeholder="Masukkan nama pemilik rekening" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="npwpPenyedia">NPWP Penyedia</Label>
                    <Input id="npwpPenyedia" value={formValues.npwpPenyedia} onChange={e => handleChange("npwpPenyedia", e.target.value)} placeholder="Masukkan NPWP penyedia" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-teal-800 hover:bg-teal-700">
                {isSubmitting ? "Menyimpan..." : "Simpan Dokumen"}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/buat-dokumen")}>
                Batal
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>;
};
export default DokumenPengadaan;