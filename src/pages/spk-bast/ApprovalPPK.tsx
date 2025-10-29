"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Save, FileText, Building, DollarSign, CheckCircle, ArrowRight, ArrowLeft, ClipboardList, BookOpen, Search, Filter, X, RefreshCw } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PengadaanData {
  no: number;
  id: string;
  tanggalUsulan: string;
  namaProdukBarangJasa: string;
  jenisPengadaan: string;
  namaKegiatanDetilPOK: string;
  kodePOK: string;
  rencanaAnggaranRAB: string;
  nilaiRealisasi: string;
  formPermintaanFP: string;
  kerangkaAcuanKerjaKAK: string;
  jenisDokumenPengadaan: string;
  nomorDokumenPengadaan: string;
  tanggalDokumenPengadaan: string;
  namaPenyediaMitra: string;
  linkEPurchasingEKatalog: string;
  tanggalPembayaran: string;
  nomorBuktiPembayaran: string;
  statusPengadaan: string;
  keteranganCatatan: string;
  tahunAnggaran: string;
}

const SPREADSHEET_ID = "1rvJUdX0rc6kEneTUwGK6p-qyPV66PKcYuP5BL58Bc2M";

export default function InputPengadaan() {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("usulan");
  const [pengadaanData, setPengadaanData] = useState<PengadaanData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterBulan, setFilterBulan] = useState("all");
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    tanggalUsulan: new Date(),
    namaProdukBarangJasa: "",
    jenisPengadaan: "",
    namaKegiatanDetilPOK: "",
    kodePOK: "",
    rencanaAnggaranRAB: "",
    tahunAnggaran: new Date().getFullYear().toString(),
    formPermintaanFP: "",
    kerangkaAcuanKerjaKAK: "",
    jenisDokumenPengadaan: "",
    nomorDokumenPengadaan: "",
    tanggalDokumenPengadaan: null as Date | null,
    namaPenyediaMitra: "",
    linkEPurchasingEKatalog: "",
    nilaiRealisasi: "",
    tanggalPembayaran: null as Date | null,
    nomorBuktiPembayaran: "",
    statusPengadaan: "draft",
    keteranganCatatan: ""
  });

  const BULAN_OPTIONS = [
    { value: "all", label: "Semua Bulan" },
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" }
  ];

  const TAHUN_OPTIONS = [
    { value: "2024", label: "2024" },
    { value: "2025", label: "2025" },
    { value: "2026", label: "2026" },
    { value: "2027", label: "2027" },
    { value: "2028", label: "2028" },
    { value: "2029", label: "2029" },
    { value: "2030", label: "2030" }
  ];

  const JENIS_PENGADAAN = [
    { value: "barang", label: "Barang" },
    { value: "jasa", label: "Jasa" },
    { value: "konsultan", label: "Jasa Konsultan" }
  ];

  const JENIS_DOKUMEN = [
    { value: "spk", label: "SPK (Surat Perintah Kerja)" },
    { value: "kontrak", label: "Kontrak" },
    { value: "po", label: "Purchase Order (PO)" },
    { value: "purchase", label: "E-Purchasing" }
  ];

  const STATUS_PENGADAAN = [
    { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-800" },
    { value: "usulan", label: "Usulan", color: "bg-blue-100 text-blue-800" },
    { value: "proses", label: "Proses Pengadaan", color: "bg-yellow-100 text-yellow-800" },
    { value: "kontrak", label: "Kontrak", color: "bg-orange-100 text-orange-800" },
    { value: "selesai", label: "Selesai", color: "bg-green-100 text-green-800" },
    { value: "batal", label: "Batal", color: "bg-red-100 text-red-800" }
  ];

  // Load data dari spreadsheet
  const loadPengadaanData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading pengadaan data...');
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1!A:U"
        },
      });

      if (error) {
        console.error('❌ Error invoking function:', error);
        throw error;
      }

      console.log('📊 Raw data from function:', data);

      const rows = data.values || [];
      console.log('📈 Total rows from spreadsheet:', rows.length);
      
      if (rows.length > 1) {
        const headers = rows[0];
        console.log('📋 Headers:', headers);
        
        const dataRows = rows.slice(1)
          .filter((row: any[]) => row && row.length > 0)
          .map((row: any[], index: number) => {
            return {
              no: parseInt(row[0]) || index + 1,
              id: row[1] || `PGD-${index + 1}`,
              tanggalUsulan: row[2] || "",
              namaProdukBarangJasa: row[3] || "",
              jenisPengadaan: row[4] || "",
              namaKegiatanDetilPOK: row[5] || "",
              kodePOK: row[6] || "",
              rencanaAnggaranRAB: row[7] || "",
              nilaiRealisasi: row[8] || "",
              formPermintaanFP: row[9] || "",
              kerangkaAcuanKerjaKAK: row[10] || "",
              jenisDokumenPengadaan: row[11] || "",
              nomorDokumenPengadaan: row[12] || "",
              tanggalDokumenPengadaan: row[13] || "",
              namaPenyediaMitra: row[14] || "",
              linkEPurchasingEKatalog: row[15] || "",
              tanggalPembayaran: row[16] || "",
              nomorBuktiPembayaran: row[17] || "",
              statusPengadaan: row[18] || "Draft",
              keteranganCatatan: row[19] || "",
              tahunAnggaran: row[20] || new Date().getFullYear().toString()
            } as PengadaanData;
          });
          
        console.log('✅ Mapped data rows:', dataRows);
        setPengadaanData(dataRows);
      } else if (rows.length === 1) {
        console.log('ℹ️ Only headers found, no data rows');
        setPengadaanData([]);
      } else {
        console.log('ℹ️ Spreadsheet is completely empty');
        setPengadaanData([]);
      }
    } catch (error: any) {
      console.error("❌ Error loading data:", error);
      toast({
        title: "Error",
        description: `Gagal memuat data pengadaan: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPengadaanData();
  }, []);

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
    return value.replace(/\D/g, "") || "0";
  };

  const getNextNumber = () => {
    if (pengadaanData.length === 0) return 1;
    const numbers = pengadaanData.map(item => item.no).filter(no => !isNaN(no));
    if (numbers.length === 0) return 1;
    const maxNo = Math.max(...numbers);
    return maxNo + 1;
  };

  const validateForm = (isUsulanOnly: boolean = false): string | null => {
    const requiredFields = [
      'namaProdukBarangJasa',
      'jenisPengadaan', 
      'namaKegiatanDetilPOK',
      'kodePOK'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        const fieldNames: { [key: string]: string } = {
          'namaProdukBarangJasa': 'Nama Produk Barang/Jasa',
          'jenisPengadaan': 'Jenis Pengadaan',
          'namaKegiatanDetilPOK': 'Nama Kegiatan/Detil POK',
          'kodePOK': 'Kode POK'
        };
        return `${fieldNames[field]} harus diisi`;
      }
    }

    return null;
  };

  // SIMPAN DATA - VERSI DIPERBAIKI TANPA UBAH FUNCTION
  const simpanData = async (isUsulanOnly: boolean = false) => {
    try {
      setSaving(true);

      const validationError = validateForm(isUsulanOnly);
      if (validationError) {
        toast({
          title: "Data Belum Lengkap",
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      // Generate ID Pengadaan
      const timestamp = new Date().getTime().toString(36);
      const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
      const idPengadaan = `PGD-${formData.tahunAnggaran}-${timestamp}-${randomStr}`;
      
      const nextNo = getNextNumber();
      
      // Siapkan data dengan approach yang lebih aman
      const dataToSave = [
        nextNo.toString(), // No
        idPengadaan, // id
        format(formData.tanggalUsulan, 'yyyy-MM-dd'), // Tanggal Usulan
        formData.namaProdukBarangJasa, // Nama Produk Barang/Jasa
        JENIS_PENGADAAN.find(j => j.value === formData.jenisPengadaan)?.label || formData.jenisPengadaan, // Jenis Pengadaan
        formData.namaKegiatanDetilPOK, // Nama Kegiatan/Detil POK
        formData.kodePOK, // Kode POK
        parseRupiah(formData.rencanaAnggaranRAB), // Rencana Anggaran (RAB)
        isUsulanOnly ? "" : parseRupiah(formData.nilaiRealisasi), // Nilai Realisasi
        isUsulanOnly ? "" : formData.formPermintaanFP, // Form Permintaan (FP)
        isUsulanOnly ? "" : formData.kerangkaAcuanKerjaKAK, // Kerangka Acuan Kerja (KAK)
        isUsulanOnly ? "" : (JENIS_DOKUMEN.find(j => j.value === formData.jenisDokumenPengadaan)?.label || formData.jenisDokumenPengadaan), // Jenis Dokumen Pengadaan
        isUsulanOnly ? "" : formData.nomorDokumenPengadaan, // Nomor Dokumen Pengadaan
        isUsulanOnly ? "" : (formData.tanggalDokumenPengadaan ? format(formData.tanggalDokumenPengadaan, 'yyyy-MM-dd') : ""), // Tanggal Dokumen Pengadaan
        isUsulanOnly ? "" : formData.namaPenyediaMitra, // Nama Penyedia / Mitra
        isUsulanOnly ? "" : formData.linkEPurchasingEKatalog, // Link E-Purchasing / E-Katalog
        isUsulanOnly ? "" : (formData.tanggalPembayaran ? format(formData.tanggalPembayaran, 'yyyy-MM-dd') : ""), // Tanggal Pembayaran
        isUsulanOnly ? "" : formData.nomorBuktiPembayaran, // Nomor Bukti Pembayaran
        isUsulanOnly ? "Usulan" : (STATUS_PENGADAAN.find(s => s.value === formData.statusPengadaan)?.label || "Draft"), // Status Pengadaan
        isUsulanOnly ? "" : formData.keteranganCatatan, // Keterangan / Catatan
        formData.tahunAnggaran // Tahun Anggaran
      ];

      console.log('💾 Data to save:', dataToSave);
      console.log('🔍 Checking data integrity...');
      
      // Validasi data sebelum dikirim
      if (dataToSave.length !== 21) {
        throw new Error(`Data tidak lengkap. Harus 21 kolom, got ${dataToSave.length}`);
      }

      // Cek koneksi dengan operasi read dulu
      console.log('🔗 Testing connection...');
      const testResult = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1!A1:A1"
        },
      });

      if (testResult.error) {
        console.error('❌ Connection test failed:', testResult.error);
        throw new Error(`Koneksi gagal: ${testResult.error.message}`);
      }

      console.log('✅ Connection OK, sending data...');

      // APPROACH 1: Coba dengan range yang lebih spesifik
      console.log('🚀 Attempting to save data...');
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "append",
          range: "Sheet1!A2:U2", // Coba dengan range yang lebih spesifik
          values: [dataToSave]
        },
      });

      if (error) {
        console.error('❌ Approach 1 failed:', error);
        
        // APPROACH 2: Coba tanpa range spesifik
        console.log('🔄 Trying alternative approach...');
        const { data: data2, error: error2 } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "append",
            values: [dataToSave]
          },
        });

        if (error2) {
          console.error('❌ Approach 2 failed:', error2);
          throw error2;
        }

        console.log('✅ Approach 2 successful:', data2);
      } else {
        console.log('✅ Approach 1 successful:', data);
      }

      toast({
        title: "Berhasil! 🎉",
        description: `Data pengadaan ${idPengadaan} berhasil disimpan`,
      });

      resetForm();
      await loadPengadaanData();
      setShowForm(false);

    } catch (error: any) {
      console.error('❌ Error saving data:', error);
      
      let errorMessage = "Gagal menyimpan data pengadaan";
      let errorDetails = error.message;
      
      // Berikan saran berdasarkan error
      if (error.message?.includes("500")) {
        errorMessage = "Error Server";
        errorDetails = "Spreadsheet mungkin kosong. Coba buat header manual di spreadsheet terlebih dahulu.";
      } else if (error.message?.includes("404")) {
        errorMessage = "Spreadsheet Tidak Ditemukan";
        errorDetails = "Periksa ID spreadsheet dan pastikan dapat diakses";
      } else if (error.message?.includes("403")) {
        errorMessage = "Akses Ditolak";
        errorDetails = "Periksa izin akses service account ke spreadsheet";
      }
      
      toast({
        title: errorMessage,
        description: errorDetails,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tanggalUsulan: new Date(),
      namaProdukBarangJasa: "",
      jenisPengadaan: "",
      namaKegiatanDetilPOK: "",
      kodePOK: "",
      rencanaAnggaranRAB: "",
      tahunAnggaran: new Date().getFullYear().toString(),
      formPermintaanFP: "",
      kerangkaAcuanKerjaKAK: "",
      jenisDokumenPengadaan: "",
      nomorDokumenPengadaan: "",
      tanggalDokumenPengadaan: null,
      namaPenyediaMitra: "",
      linkEPurchasingEKatalog: "",
      nilaiRealisasi: "",
      tanggalPembayaran: null,
      nomorBuktiPembayaran: "",
      statusPengadaan: "draft",
      keteranganCatatan: ""
    });
    setActiveTab("usulan");
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

  const filteredData = pengadaanData.filter(item => {
    if (filterTahun !== "all" && item.tahunAnggaran !== filterTahun) return false;
    if (filterBulan !== "all") {
      try {
        const date = new Date(item.tanggalUsulan);
        const month = (date.getMonth() + 1).toString();
        return month === filterBulan;
      } catch {
        return false;
      }
    }
    return true;
  });

  const totalRAB = filteredData.reduce((sum, item) => {
    const value = parseInt(item.rencanaAnggaranRAB || "0");
    return isNaN(value) ? sum : sum + value;
  }, 0);
  
  const totalRealisasi = filteredData.reduce((sum, item) => {
    const value = parseInt(item.nilaiRealisasi || "0");
    return isNaN(value) ? sum : sum + value;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Input Data Pengadaan
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistem rekam data pengadaan barang/jasa BPS Kabupaten Majalengka
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadPengadaanData} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {!showForm ? (
        /* TAMPILAN TABEL DATA */
        <>
          {/* Filter Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-2 flex-1">
                  <Label>Bulan</Label>
                  <Select value={filterBulan} onValueChange={setFilterBulan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      {BULAN_OPTIONS.map((bulan) => (
                        <SelectItem key={bulan.value} value={bulan.value}>
                          {bulan.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Tahun Anggaran</Label>
                  <Select value={filterTahun} onValueChange={setFilterTahun}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAHUN_OPTIONS.map((tahun) => (
                        <SelectItem key={tahun.value} value={tahun.value}>
                          {tahun.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-end">
                  <Button 
                    onClick={() => setShowForm(true)} 
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Pengadaan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Data Pengadaan</CardTitle>
              <CardDescription>
                Total {filteredData.length} data pengadaan ditemukan
                {pengadaanData.length === 0 && " - Spreadsheet kosong"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Memuat data...</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Tanggal Usulan</TableHead>
                        <TableHead>Nama Produk</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Kegiatan</TableHead>
                        <TableHead>RAB</TableHead>
                        <TableHead>Realisasi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tahun</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell>{item.no || index + 1}</TableCell>
                          <TableCell className="font-medium">{item.id || '-'}</TableCell>
                          <TableCell>{item.tanggalUsulan || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{item.namaProdukBarangJasa || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.jenisPengadaan || '-'}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{item.namaKegiatanDetilPOK || '-'}</TableCell>
                          <TableCell>
                            {item.rencanaAnggaranRAB ? `Rp ${parseInt(item.rencanaAnggaranRAB).toLocaleString('id-ID')}` : '-'}
                          </TableCell>
                          <TableCell>
                            {item.nilaiRealisasi ? `Rp ${parseInt(item.nilaiRealisasi).toLocaleString('id-ID')}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              item.statusPengadaan === "Selesai" ? "bg-green-100 text-green-800" :
                              item.statusPengadaan === "Proses Pengadaan" ? "bg-yellow-100 text-yellow-800" :
                              item.statusPengadaan === "Batal" ? "bg-red-100 text-red-800" :
                              "bg-blue-100 text-blue-800"
                            }>
                              {item.statusPengadaan || 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.tahunAnggaran || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {filteredData.length > 0 && (
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={6} className="text-right">TOTAL:</TableCell>
                          <TableCell>Rp {totalRAB.toLocaleString('id-ID')}</TableCell>
                          <TableCell>Rp {totalRealisasi.toLocaleString('id-ID')}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {filteredData.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Tidak ada data pengadaan ditemukan</p>
                      <p className="text-sm mt-2">Spreadsheet kosong. Tambah data pertama untuk memulai.</p>
                      <Button 
                        onClick={() => setShowForm(true)} 
                        className="mt-4 flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Tambah Data Pertama
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* TAMPILAN FORM INPUT */
        <>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Form Input Pengadaan
                </CardTitle>
                <CardDescription>
                  Isi data pengadaan sesuai dengan tahapan yang tersedia
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} disabled={saving}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {/* TAB 1: DATA USULAN */}
              {activeTab === "usulan" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tanggalUsulan" className="flex items-center gap-1">
                        Tanggal Usulan <span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {format(formData.tanggalUsulan, "PPP", { locale: id })}
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

                    <div className="space-y-2">
                      <Label htmlFor="tahunAnggaran">Tahun Anggaran</Label>
                      <Select 
                        value={formData.tahunAnggaran} 
                        onValueChange={(value) => handleInputChange("tahunAnggaran", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                          {TAHUN_OPTIONS.map((tahun) => (
                            <SelectItem key={tahun.value} value={tahun.value}>
                              {tahun.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="namaProdukBarangJasa" className="flex items-center gap-1">
                        Nama Produk Barang/Jasa <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.namaProdukBarangJasa}
                        onChange={(e) => handleInputChange("namaProdukBarangJasa", e.target.value)}
                        placeholder="Contoh: Pengadaan Komputer Workstation"
                      />
                    </div>

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

                    <div className="space-y-2">
                      <Label htmlFor="kodePOK" className="flex items-center gap-1">
                        Kode POK <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.kodePOK}
                        onChange={(e) => handleInputChange("kodePOK", e.target.value)}
                        placeholder="Contoh: 054.01.06.XXXX.XXX.052.001.A"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="namaKegiatanDetilPOK" className="flex items-center gap-1">
                        Nama Kegiatan/Detil POK <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.namaKegiatanDetilPOK}
                        onChange={(e) => handleInputChange("namaKegiatanDetilPOK", e.target.value)}
                        placeholder="Contoh: Pengadaan Sarana Prasarana Kantor"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rencanaAnggaranRAB" className="flex items-center gap-1">
                        Rencana Anggaran (RAB) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.rencanaAnggaranRAB}
                        onChange={(e) => handleInputChange("rencanaAnggaranRAB", formatRupiah(e.target.value))}
                        placeholder="Rp 0"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                      Kembali ke Tabel
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => simpanData(true)} 
                        variant="outline" 
                        className="flex items-center gap-2"
                        disabled={saving}
                      >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? "Menyimpan..." : "Simpan Usulan Saja"}
                      </Button>
                      <Button 
                        onClick={() => setActiveTab("dokumen")} 
                        className="flex items-center gap-2"
                        disabled={saving}
                      >
                        Lanjut ke Dokumen
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DOKUMEN */}
              {activeTab === "dokumen" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="formPermintaanFP">Form Permintaan (FP)</Label>
                      <Input
                        value={formData.formPermintaanFP}
                        onChange={(e) => handleInputChange("formPermintaanFP", e.target.value)}
                        placeholder="Contoh: FP/2024/001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="kerangkaAcuanKerjaKAK">Kerangka Acuan Kerja (KAK)</Label>
                      <Input
                        value={formData.kerangkaAcuanKerjaKAK}
                        onChange={(e) => handleInputChange("kerangkaAcuanKerjaKAK", e.target.value)}
                        placeholder="Contoh: KAK/2024/001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jenisDokumenPengadaan">Jenis Dokumen Pengadaan</Label>
                      <Select value={formData.jenisDokumenPengadaan} onValueChange={(value) => handleInputChange("jenisDokumenPengadaan", value)}>
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

                    <div className="space-y-2">
                      <Label htmlFor="nomorDokumenPengadaan">Nomor Dokumen Pengadaan</Label>
                      <Input
                        value={formData.nomorDokumenPengadaan}
                        onChange={(e) => handleInputChange("nomorDokumenPengadaan", e.target.value)}
                        placeholder="Contoh: SPK/2024/001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tanggalDokumenPengadaan">Tanggal Dokumen Pengadaan</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.tanggalDokumenPengadaan ? format(formData.tanggalDokumenPengadaan, "PPP", { locale: id }) : "Pilih tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={formData.tanggalDokumenPengadaan || undefined}
                            onSelect={(date) => handleInputChange("tanggalDokumenPengadaan", date)}
                            initialFocus
                            locale={id}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="namaPenyediaMitra">Nama Penyedia / Mitra</Label>
                      <Input
                        value={formData.namaPenyediaMitra}
                        onChange={(e) => handleInputChange("namaPenyediaMitra", e.target.value)}
                        placeholder="Nama perusahaan/kontraktor"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="linkEPurchasingEKatalog">Link E-Purchasing / E-Katalog</Label>
                      <Input
                        value={formData.linkEPurchasingEKatalog}
                        onChange={(e) => handleInputChange("linkEPurchasingEKatalog", e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setActiveTab("usulan")} className="flex items-center gap-2" disabled={saving}>
                      <ArrowLeft className="h-4 w-4" />
                      Kembali ke Usulan
                    </Button>
                    <Button onClick={() => setActiveTab("realisasi")} className="flex items-center gap-2" disabled={saving}>
                      Lanjut ke Realisasi
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 3: REALISASI */}
              {activeTab === "realisasi" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nilaiRealisasi">Nilai Realisasi</Label>
                      <Input
                        value={formData.nilaiRealisasi}
                        onChange={(e) => handleInputChange("nilaiRealisasi", formatRupiah(e.target.value))}
                        placeholder="Rp 0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tanggalPembayaran">Tanggal Pembayaran</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
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

                    <div className="space-y-2">
                      <Label htmlFor="nomorBuktiPembayaran">Nomor Bukti Pembayaran</Label>
                      <Input
                        value={formData.nomorBuktiPembayaran}
                        onChange={(e) => handleInputChange("nomorBuktiPembayaran", e.target.value)}
                        placeholder="Contoh: KWT/2024/001"
                      />
                    </div>

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

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="keteranganCatatan">Keterangan / Catatan</Label>
                      <Textarea
                        value={formData.keteranganCatatan}
                        onChange={(e) => handleInputChange("keteranganCatatan", e.target.value)}
                        placeholder="Catatan tambahan mengenai pengadaan..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setActiveTab("dokumen")} className="flex items-center gap-2" disabled={saving}>
                      <ArrowLeft className="h-4 w-4" />
                      Kembali ke Dokumen
                    </Button>
                    <Button 
                      onClick={() => simpanData(false)} 
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      disabled={saving}
                    >
                      {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? "Menyimpan..." : "Simpan Semua Data"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}