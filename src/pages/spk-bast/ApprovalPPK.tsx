"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Save, FileText, Building, DollarSign, CheckCircle, ArrowRight, ArrowLeft, ClipboardList, BookOpen } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";

export default function InputPengadaan() {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState("usulan");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    // Tahap 1: Data Usulan
    tanggalUsulan: new Date(),
    namaProduk: "",
    jenisPengadaan: "",
    namaKegiatan: "",
    kodePOK: "",
    rencanaAnggaran: "",
    tahunAnggaran: new Date().getFullYear().toString(),
    
    // Tahap 2: Dokumen & Pelaksanaan
    nomorFormPermintaan: "",
    nomorKAK: "",
    jenisDokumen: "",
    nomorDokumen: "",
    tanggalDokumen: null as Date | null,
    namaPenyedia: "",
    linkEPurchasing: "",
    
    // Tahap 3: Realisasi & Penyelesaian
    nilaiRealisasi: "",
    tanggalPembayaran: null as Date | null,
    nomorBuktiPembayaran: "",
    statusPengadaan: "draft",
    keterangan: ""
  });

  const JENIS_PENGADAAN = [
    { value: "barang", label: "🛒 Barang", color: "bg-blue-100 text-blue-800" },
    { value: "jasa", label: "🔧 Jasa", color: "bg-green-100 text-green-800" },
    { value: "konsultan", label: "💼 Jasa Konsultan", color: "bg-purple-100 text-purple-800" }
  ];

  const JENIS_DOKUMEN = [
    { value: "spk", label: "📄 SPK (Surat Perintah Kerja)" },
    { value: "kontrak", label: "📑 Kontrak" },
    { value: "po", label: "🛍️ Purchase Order (PO)" },
    { value: "purchase", label: "🖥️ E-Purchasing" }
  ];

  const STATUS_PENGADAAN = [
    { value: "draft", label: "📝 Draft", color: "bg-gray-100 text-gray-800" },
    { value: "usulan", label: "📤 Usulan", color: "bg-blue-100 text-blue-800" },
    { value: "proses", label: "⏳ Proses Pengadaan", color: "bg-yellow-100 text-yellow-800" },
    { value: "kontrak", label: "📋 Kontrak", color: "bg-orange-100 text-orange-800" },
    { value: "selesai", label: "✅ Selesai", color: "bg-green-100 text-green-800" },
    { value: "batal", label: "❌ Batal", color: "bg-red-100 text-red-800" }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatRupiah = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    return numeric ? `Rp ${parseInt(numeric).toLocaleString('id-ID')}` : "";
  };

  const parseRupiah = (value: string) => {
    return value.replace(/\D/g, "");
  };

  const handleSubmit = async () => {
    try {
      // Validasi data wajib
      if (!formData.namaProduk || !formData.jenisPengadaan || !formData.namaKegiatan || !formData.kodePOK) {
        toast({
          title: "Data Belum Lengkap",
          description: "Harap isi semua field yang wajib diisi pada tahap usulan",
          variant: "destructive",
        });
        return;
      }

      // Generate ID Pengadaan otomatis
      const idPengadaan = `PGD/${formData.tahunAnggaran}/${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const finalData = {
        ...formData,
        idPengadaan,
        tanggalUsulan: format(formData.tanggalUsulan, 'yyyy-MM-dd'),
        tanggalDokumen: formData.tanggalDokumen ? format(formData.tanggalDokumen, 'yyyy-MM-dd') : "",
        tanggalPembayaran: formData.tanggalPembayaran ? format(formData.tanggalPembayaran, 'yyyy-MM-dd') : "",
        rencanaAnggaran: parseRupiah(formData.rencanaAnggaran),
        nilaiRealisasi: parseRupiah(formData.nilaiRealisasi)
      };

      // Simulasi penyimpanan
      console.log('Data pengadaan disimpan:', finalData);
      
      toast({
        title: "Berhasil! 🎉",
        description: `Data pengadaan ${idPengadaan} berhasil disimpan`,
      });

      // Reset form
      setFormData({
        tanggalUsulan: new Date(),
        namaProduk: "",
        jenisPengadaan: "",
        namaKegiatan: "",
        kodePOK: "",
        rencanaAnggaran: "",
        tahunAnggaran: new Date().getFullYear().toString(),
        nomorFormPermintaan: "",
        nomorKAK: "",
        jenisDokumen: "",
        nomorDokumen: "",
        tanggalDokumen: null,
        namaPenyedia: "",
        linkEPurchasing: "",
        nilaiRealisasi: "",
        tanggalPembayaran: null,
        nomorBuktiPembayaran: "",
        statusPengadaan: "draft",
        keterangan: ""
      });

      setActiveTab("usulan");

    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data pengadaan",
        variant: "destructive",
      });
    }
  };

  const ProgressStep = ({ number, title, active, completed }: { number: number; title: string; active: boolean; completed: boolean }) => (
    <div className="flex items-center space-x-3">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
        completed 
          ? "bg-green-500 border-green-500 text-white" 
          : active 
          ? "bg-blue-600 border-blue-600 text-white"
          : "border-gray-300 text-gray-500"
      }`}>
        {completed ? <CheckCircle className="h-4 w-4" /> : number}
      </div>
      <span className={`text-sm font-medium ${active || completed ? "text-foreground" : "text-muted-foreground"}`}>
        {title}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          Input Data Pengadaan
        </h1>
        <p className="text-muted-foreground mt-2">
          Sistem rekam data pengadaan barang/jasa BPS Kabupaten Majalengka
        </p>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <ProgressStep number={1} title="Data Usulan" active={activeTab === "usulan"} completed={activeTab !== "usulan"} />
            <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
            <ProgressStep number={2} title="Dokumen" active={activeTab === "dokumen"} completed={activeTab === "realisasi"} />
            <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
            <ProgressStep number={3} title="Realisasi" active={activeTab === "realisasi"} completed={false} />
          </div>
        </CardContent>
      </Card>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Form Input Pengadaan
          </CardTitle>
          <CardDescription>
            Isi data pengadaan sesuai dengan tahapan yang tersedia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="usulan" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Data Usulan
              </TabsTrigger>
              <TabsTrigger value="dokumen" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Dokumen
              </TabsTrigger>
              <TabsTrigger value="realisasi" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Realisasi
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DATA USULAN */}
            <TabsContent value="usulan" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tanggal Usulan */}
                <div className="space-y-2">
                  <Label htmlFor="tanggalUsulan" className="flex items-center gap-1">
                    Tanggal Usulan <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.tanggalUsulan ? format(formData.tanggalUsulan, "PPP", { locale: id }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.tanggalUsulan}
                        onSelect={(date) => date && handleInputChange("tanggalUsulan", date)}
                        initialFocus
                        locale={id}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tahun Anggaran */}
                <div className="space-y-2">
                  <Label htmlFor="tahunAnggaran">Tahun Anggaran</Label>
                  <Input
                    id="tahunAnggaran"
                    value={formData.tahunAnggaran}
                    onChange={(e) => handleInputChange("tahunAnggaran", e.target.value)}
                    placeholder="2024"
                  />
                </div>

                {/* Nama Produk */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="namaProduk" className="flex items-center gap-1">
                    Nama Produk Barang/Jasa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="namaProduk"
                    value={formData.namaProduk}
                    onChange={(e) => handleInputChange("namaProduk", e.target.value)}
                    placeholder="Contoh: Pengadaan Komputer Workstation"
                  />
                </div>

                {/* Jenis Pengadaan */}
                <div className="space-y-2">
                  <Label htmlFor="jenisPengadaan" className="flex items-center gap-1">
                    Jenis Pengadaan <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.jenisPengadaan} onValueChange={(value) => handleInputChange("jenisPengadaan", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis pengadaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_PENGADAAN.map((jenis) => (
                        <SelectItem key={jenis.value} value={jenis.value}>
                          {jenis.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kode POK */}
                <div className="space-y-2">
                  <Label htmlFor="kodePOK" className="flex items-center gap-1">
                    Kode POK <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="kodePOK"
                    value={formData.kodePOK}
                    onChange={(e) => handleInputChange("kodePOK", e.target.value)}
                    placeholder="Contoh: 054.01.06.XXXX.XXX.052.001.A"
                  />
                </div>

                {/* Nama Kegiatan */}
                <div className="space-y-2">
                  <Label htmlFor="namaKegiatan" className="flex items-center gap-1">
                    Nama Kegiatan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="namaKegiatan"
                    value={formData.namaKegiatan}
                    onChange={(e) => handleInputChange("namaKegiatan", e.target.value)}
                    placeholder="Contoh: Pengadaan Sarana Prasarana Kantor"
                  />
                </div>

                {/* Rencana Anggaran */}
                <div className="space-y-2">
                  <Label htmlFor="rencanaAnggaran" className="flex items-center gap-1">
                    Rencana Anggaran (RAB) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rencanaAnggaran"
                    value={formData.rencanaAnggaran}
                    onChange={(e) => handleInputChange("rencanaAnggaran", formatRupiah(e.target.value))}
                    placeholder="Rp 0"
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-end pt-4">
                <Button onClick={() => setActiveTab("dokumen")} className="flex items-center gap-2">
                  Lanjut ke Dokumen
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: DOKUMEN */}
            <TabsContent value="dokumen" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nomor Form Permintaan */}
                <div className="space-y-2">
                  <Label htmlFor="nomorFormPermintaan">Nomor Form Permintaan (FP)</Label>
                  <Input
                    id="nomorFormPermintaan"
                    value={formData.nomorFormPermintaan}
                    onChange={(e) => handleInputChange("nomorFormPermintaan", e.target.value)}
                    placeholder="Contoh: FP/2024/001"
                  />
                </div>

                {/* Nomor KAK */}
                <div className="space-y-2">
                  <Label htmlFor="nomorKAK">Nomor KAK</Label>
                  <Input
                    id="nomorKAK"
                    value={formData.nomorKAK}
                    onChange={(e) => handleInputChange("nomorKAK", e.target.value)}
                    placeholder="Contoh: KAK/2024/001"
                  />
                </div>

                {/* Jenis Dokumen */}
                <div className="space-y-2">
                  <Label htmlFor="jenisDokumen">Jenis Dokumen Pengadaan</Label>
                  <Select value={formData.jenisDokumen} onValueChange={(value) => handleInputChange("jenisDokumen", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis dokumen" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_DOKUMEN.map((dokumen) => (
                        <SelectItem key={dokumen.value} value={dokumen.value}>
                          {dokumen.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nomor Dokumen */}
                <div className="space-y-2">
                  <Label htmlFor="nomorDokumen">Nomor Dokumen Pengadaan</Label>
                  <Input
                    id="nomorDokumen"
                    value={formData.nomorDokumen}
                    onChange={(e) => handleInputChange("nomorDokumen", e.target.value)}
                    placeholder="Contoh: SPK/2024/001"
                  />
                </div>

                {/* Tanggal Dokumen */}
                <div className="space-y-2">
                  <Label htmlFor="tanggalDokumen">Tanggal Dokumen Pengadaan</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.tanggalDokumen ? format(formData.tanggalDokumen, "PPP", { locale: id }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.tanggalDokumen || undefined}
                        onSelect={(date) => handleInputChange("tanggalDokumen", date)}
                        initialFocus
                        locale={id}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Nama Penyedia */}
                <div className="space-y-2">
                  <Label htmlFor="namaPenyedia">Nama Penyedia / Mitra</Label>
                  <Input
                    id="namaPenyedia"
                    value={formData.namaPenyedia}
                    onChange={(e) => handleInputChange("namaPenyedia", e.target.value)}
                    placeholder="Nama perusahaan/kontraktor"
                  />
                </div>

                {/* Link E-Purchasing */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="linkEPurchasing">Link E-Purchasing / E-Katalog</Label>
                  <Input
                    id="linkEPurchasing"
                    value={formData.linkEPurchasing}
                    onChange={(e) => handleInputChange("linkEPurchasing", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab("usulan")} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Usulan
                </Button>
                <Button onClick={() => setActiveTab("realisasi")} className="flex items-center gap-2">
                  Lanjut ke Realisasi
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            {/* TAB 3: REALISASI */}
            <TabsContent value="realisasi" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nilai Realisasi */}
                <div className="space-y-2">
                  <Label htmlFor="nilaiRealisasi">Nilai Realisasi</Label>
                  <Input
                    id="nilaiRealisasi"
                    value={formData.nilaiRealisasi}
                    onChange={(e) => handleInputChange("nilaiRealisasi", formatRupiah(e.target.value))}
                    placeholder="Rp 0"
                  />
                </div>

                {/* Tanggal Pembayaran */}
                <div className="space-y-2">
                  <Label htmlFor="tanggalPembayaran">Tanggal Pembayaran</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.tanggalPembayaran ? format(formData.tanggalPembayaran, "PPP", { locale: id }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.tanggalPembayaran || undefined}
                        onSelect={(date) => handleInputChange("tanggalPembayaran", date)}
                        initialFocus
                        locale={id}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Nomor Bukti Pembayaran */}
                <div className="space-y-2">
                  <Label htmlFor="nomorBuktiPembayaran">Nomor Bukti Pembayaran</Label>
                  <Input
                    id="nomorBuktiPembayaran"
                    value={formData.nomorBuktiPembayaran}
                    onChange={(e) => handleInputChange("nomorBuktiPembayaran", e.target.value)}
                    placeholder="Contoh: KWT/2024/001"
                  />
                </div>

                {/* Status Pengadaan */}
                <div className="space-y-2">
                  <Label htmlFor="statusPengadaan">Status Pengadaan</Label>
                  <Select value={formData.statusPengadaan} onValueChange={(value) => handleInputChange("statusPengadaan", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_PENGADAAN.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Keterangan */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="keterangan">Keterangan / Catatan</Label>
                  <Textarea
                    id="keterangan"
                    value={formData.keterangan}
                    onChange={(e) => handleInputChange("keterangan", e.target.value)}
                    placeholder="Catatan tambahan mengenai pengadaan..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Summary Preview */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm">Ringkasan Pengadaan</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Produk:</span>
                    <span className="font-medium">{formData.namaProduk || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jenis:</span>
                    <Badge variant="outline" className={JENIS_PENGADAAN.find(j => j.value === formData.jenisPengadaan)?.color}>
                      {JENIS_PENGADAAN.find(j => j.value === formData.jenisPengadaan)?.label || "-"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>RAB:</span>
                    <span className="font-medium">{formData.rencanaAnggaran || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant="outline" className={STATUS_PENGADAAN.find(s => s.value === formData.statusPengadaan)?.color}>
                      {STATUS_PENGADAAN.find(s => s.value === formData.statusPengadaan)?.label || "-"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab("dokumen")} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Dokumen
                </Button>
                <Button onClick={handleSubmit} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4" />
                  Simpan Pengadaan
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}