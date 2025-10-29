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
import { Calendar, Plus, Save, FileText, Building, DollarSign, CheckCircle, ArrowRight, ArrowLeft, ClipboardList, BookOpen, Search, Filter, X, RefreshCw, Edit, Trash2, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [editingData, setEditingData] = useState<PengadaanData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState<PengadaanData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [dataToView, setDataToView] = useState<PengadaanData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState("");
  
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
    { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-800 border-gray-300" },
    { value: "usulan", label: "Usulan", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { value: "proses", label: "Proses", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    { value: "kontrak", label: "Kontrak", color: "bg-orange-50 text-orange-700 border-orange-200" },
    { value: "selesai", label: "Selesai", color: "bg-green-50 text-green-700 border-green-200" },
    { value: "batal", label: "Batal", color: "bg-red-50 text-red-700 border-red-200" }
  ];

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

      const timestamp = new Date().getTime().toString(36);
      const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
      const idPengadaan = `PGD-${formData.tahunAnggaran}-${timestamp}-${randomStr}`;
      
      const nextNo = getNextNumber();
      
      const dataToSave = [
        nextNo.toString(),
        idPengadaan,
        format(formData.tanggalUsulan, 'yyyy-MM-dd'),
        formData.namaProdukBarangJasa,
        JENIS_PENGADAAN.find(j => j.value === formData.jenisPengadaan)?.label || formData.jenisPengadaan,
        formData.namaKegiatanDetilPOK,
        formData.kodePOK,
        parseRupiah(formData.rencanaAnggaranRAB),
        isUsulanOnly ? "" : parseRupiah(formData.nilaiRealisasi),
        isUsulanOnly ? "" : formData.formPermintaanFP,
        isUsulanOnly ? "" : formData.kerangkaAcuanKerjaKAK,
        isUsulanOnly ? "" : (JENIS_DOKUMEN.find(j => j.value === formData.jenisDokumenPengadaan)?.label || formData.jenisDokumenPengadaan),
        isUsulanOnly ? "" : formData.nomorDokumenPengadaan,
        isUsulanOnly ? "" : (formData.tanggalDokumenPengadaan ? format(formData.tanggalDokumenPengadaan, 'yyyy-MM-dd') : ""),
        isUsulanOnly ? "" : formData.namaPenyediaMitra,
        isUsulanOnly ? "" : formData.linkEPurchasingEKatalog,
        isUsulanOnly ? "" : (formData.tanggalPembayaran ? format(formData.tanggalPembayaran, 'yyyy-MM-dd') : ""),
        isUsulanOnly ? "" : formData.nomorBuktiPembayaran,
        isUsulanOnly ? "Usulan" : (STATUS_PENGADAAN.find(s => s.value === formData.statusPengadaan)?.label || "Draft"),
        isUsulanOnly ? "" : formData.keteranganCatatan,
        formData.tahunAnggaran
      ];

      console.log('💾 Data to save:', dataToSave);
      
      if (dataToSave.length !== 21) {
        throw new Error(`Data tidak lengkap. Harus 21 kolom, got ${dataToSave.length}`);
      }

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
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "append",
          range: "Sheet1!A2:U2",
          values: [dataToSave]
        },
      });

      if (error) {
        console.error('❌ Approach 1 failed:', error);
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

  const editData = (data: PengadaanData) => {
    setEditingData(data);
    setFormData({
      tanggalUsulan: new Date(data.tanggalUsulan || new Date()),
      namaProdukBarangJasa: data.namaProdukBarangJasa || "",
      jenisPengadaan: JENIS_PENGADAAN.find(j => j.label === data.jenisPengadaan)?.value || data.jenisPengadaan || "",
      namaKegiatanDetilPOK: data.namaKegiatanDetilPOK || "",
      kodePOK: data.kodePOK || "",
      rencanaAnggaranRAB: data.rencanaAnggaranRAB ? formatRupiah(data.rencanaAnggaranRAB) : "",
      tahunAnggaran: data.tahunAnggaran || new Date().getFullYear().toString(),
      formPermintaanFP: data.formPermintaanFP || "",
      kerangkaAcuanKerjaKAK: data.kerangkaAcuanKerjaKAK || "",
      jenisDokumenPengadaan: JENIS_DOKUMEN.find(j => j.label === data.jenisDokumenPengadaan)?.value || data.jenisDokumenPengadaan || "",
      nomorDokumenPengadaan: data.nomorDokumenPengadaan || "",
      tanggalDokumenPengadaan: data.tanggalDokumenPengadaan ? new Date(data.tanggalDokumenPengadaan) : null,
      namaPenyediaMitra: data.namaPenyediaMitra || "",
      linkEPurchasingEKatalog: data.linkEPurchasingEKatalog || "",
      nilaiRealisasi: data.nilaiRealisasi ? formatRupiah(data.nilaiRealisasi) : "",
      tanggalPembayaran: data.tanggalPembayaran ? new Date(data.tanggalPembayaran) : null,
      nomorBuktiPembayaran: data.nomorBuktiPembayaran || "",
      statusPengadaan: STATUS_PENGADAAN.find(s => s.label === data.statusPengadaan)?.value || "draft",
      keteranganCatatan: data.keteranganCatatan || ""
    });
    setShowForm(true);
  };

  // FUNGSI UPDATE YANG DIPERBAIKI - Mengadopsi dari kode block tanggal
  const updateData = async () => {
    try {
      setSaving(true);

      const validationError = validateForm(false);
      if (validationError) {
        toast({
          title: "Data Belum Lengkap",
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      if (!editingData) return;

      // Get all data to find the correct row
      const allData = await getAllData();
      const rowIndex = allData.findIndex((row: any[]) => 
        row[1] === editingData.id
      );

      if (rowIndex === -1) {
        throw new Error("Data tidak ditemukan di spreadsheet");
      }

      const rowNumber = rowIndex + 2; // +2 karena header dan index 0-based

      const dataToUpdate = [
        editingData.no.toString(),
        editingData.id,
        format(formData.tanggalUsulan, 'yyyy-MM-dd'),
        formData.namaProdukBarangJasa,
        JENIS_PENGADAAN.find(j => j.value === formData.jenisPengadaan)?.label || formData.jenisPengadaan,
        formData.namaKegiatanDetilPOK,
        formData.kodePOK,
        parseRupiah(formData.rencanaAnggaranRAB),
        parseRupiah(formData.nilaiRealisasi),
        formData.formPermintaanFP,
        formData.kerangkaAcuanKerjaKAK,
        JENIS_DOKUMEN.find(j => j.value === formData.jenisDokumenPengadaan)?.label || formData.jenisDokumenPengadaan,
        formData.nomorDokumenPengadaan,
        formData.tanggalDokumenPengadaan ? format(formData.tanggalDokumenPengadaan, 'yyyy-MM-dd') : "",
        formData.namaPenyediaMitra,
        formData.linkEPurchasingEKatalog,
        formData.tanggalPembayaran ? format(formData.tanggalPembayaran, 'yyyy-MM-dd') : "",
        formData.nomorBuktiPembayaran,
        STATUS_PENGADAAN.find(s => s.value === formData.statusPengadaan)?.label || "Draft",
        formData.keteranganCatatan,
        formData.tahunAnggaran
      ];

      console.log('🔄 Updating data at row:', rowNumber);
      console.log('📝 Data to update:', dataToUpdate);

      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "update",
          rowIndex: rowNumber,
          values: [dataToUpdate]
        },
      });

      if (error) {
        console.error('❌ Update error:', error);
        throw error;
      }

      console.log('✅ Update successful:', data);

      toast({
        title: "Berhasil! ✅",
        description: `Data pengadaan ${editingData.id} berhasil diperbarui`,
      });

      resetForm();
      await loadPengadaanData();
      setShowForm(false);
      setEditingData(null);

    } catch (error: any) {
      console.error('❌ Error updating data:', error);
      toast({
        title: "Gagal Memperbarui Data",
        description: error.message || "Terjadi kesalahan saat memperbarui data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getAllData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1!A:U"
        },
      });

      if (error) throw error;
      return data.values || [];
    } catch (error) {
      console.error('Error getting all data:', error);
      return [];
    }
  };

  // FUNGSI DELETE YANG DIPERBAIKI - Mengadopsi dari kode block tanggal
  const deleteData = async (data: PengadaanData) => {
    try {
      setSaving(true);

      // Get all data to find the correct row
      const allData = await getAllData();
      const rowIndex = allData.findIndex((row: any[]) => 
        row[1] === data.id
      );

      if (rowIndex === -1) {
        throw new Error("Data tidak ditemukan di spreadsheet");
      }

      const rowNumber = rowIndex + 2; // +2 karena header dan index 0-based

      console.log('🗑️ Deleting data at row:', rowNumber);

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "delete",
          rowIndex: rowNumber
        },
      });

      if (error) {
        console.error('❌ Delete error:', error);
        throw error;
      }

      toast({
        title: "Berhasil! ✅",
        description: `Data pengadaan ${data.id} berhasil dihapus`,
      });

      await loadPengadaanData();
      setDeleteDialogOpen(false);
      setDataToDelete(null);

    } catch (error: any) {
      console.error('❌ Error deleting data:', error);
      toast({
        title: "Gagal Menghapus Data",
        description: error.message || "Terjadi kesalahan saat menghapus data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (data: PengadaanData) => {
    setDataToDelete(data);
    setDeleteDialogOpen(true);
  };

  const viewData = (data: PengadaanData) => {
    setDataToView(data);
    setViewDialogOpen(true);
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
    setEditingData(null);
  };

  const filteredData = pengadaanData.filter(item => {
    // Filter by bulan and tahun
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
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.namaProdukBarangJasa?.toLowerCase().includes(searchLower) ||
        item.namaKegiatanDetilPOK?.toLowerCase().includes(searchLower) ||
        item.kodePOK?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const goToFirstPage = () => paginate(1);
  const goToLastPage = () => paginate(totalPages);
  const goToNextPage = () => currentPage < totalPages && paginate(currentPage + 1);
  const goToPrevPage = () => currentPage > 1 && paginate(currentPage - 1);

  const totalRAB = filteredData.reduce((sum, item) => {
    const value = parseInt(item.rencanaAnggaranRAB || "0");
    return isNaN(value) ? sum : sum + value;
  }, 0);
  
  const totalRealisasi = filteredData.reduce((sum, item) => {
    const value = parseInt(item.nilaiRealisasi || "0");
    return isNaN(value) ? sum : sum + value;
  }, 0);

  const getStatusColor = (status: string) => {
    const statusObj = STATUS_PENGADAAN.find(s => s.label === status);
    return statusObj?.color || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getBulanName = (value: string) => {
    return BULAN_OPTIONS.find(bulan => bulan.value === value)?.label || "";
  };

  const getTahunName = () => {
    return filterTahun;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return format(date, "dd MMMM yyyy", { locale: id });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: string) => {
    if (!value) return "-";
    const numeric = parseInt(value);
    return isNaN(numeric) ? value : `Rp ${numeric.toLocaleString('id-ID')}`;
  };

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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Bulan</Label>
                  <Select value={filterBulan} onValueChange={(value) => { setFilterBulan(value); setCurrentPage(1); }}>
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
                <div className="space-y-2">
                  <Label>Tahun Anggaran</Label>
                  <Select value={filterTahun} onValueChange={(value) => { setFilterTahun(value); setCurrentPage(1); }}>
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
                <div className="space-y-2">
                  <Label>Cari Data</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Cari nama produk, detil POK, kode POK..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2 flex items-end">
                  <Button 
                    onClick={() => setShowForm(true)} 
                    className="flex items-center gap-2 w-full"
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
              <CardTitle>
                Data Pengadaan -{" "}
                <span className="text-red-500">
                  {filterBulan === "all" ? "Semua Bulan" : getBulanName(filterBulan)} {getTahunName()}
                </span>
              </CardTitle>
              <CardDescription>
                Menampilkan {currentItems.length} dari {filteredData.length} data pengadaan
                {searchTerm && ` untuk pencarian "${searchTerm}"`}
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
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold text-foreground w-16 text-center">No</TableHead>
                        <TableHead className="font-semibold text-foreground w-32">Tanggal Usulan</TableHead>
                        <TableHead className="font-semibold text-foreground w-64">Nama Produk</TableHead>
                        <TableHead className="font-semibold text-foreground w-64">Detil POK</TableHead>
                        <TableHead className="font-semibold text-foreground w-48">Kode POK</TableHead>
                        <TableHead className="font-semibold text-foreground text-right w-32">RAB</TableHead>
                        <TableHead className="font-semibold text-foreground text-right w-32">Realisasi</TableHead>
                        <TableHead className="font-semibold text-foreground text-center w-24">Status</TableHead>
                        <TableHead className="font-semibold text-foreground text-center w-28">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map((item, index) => (
                        <TableRow key={item.id || index} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-center">{item.no || index + 1 + indexOfFirstItem}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{formatDate(item.tanggalUsulan)}</TableCell>
                          <TableCell>
                            <div className="line-clamp-2 text-sm" title={item.namaProdukBarangJasa}>
                              {item.namaProdukBarangJasa || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="line-clamp-2 text-sm" title={item.namaKegiatanDetilPOK}>
                              {item.namaKegiatanDetilPOK || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <div className="truncate" title={item.kodePOK}>
                              {item.kodePOK || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency(item.rencanaAnggaranRAB)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency(item.nilaiRealisasi)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`${getStatusColor(item.statusPengadaan)} border text-xs px-2 py-1`}>
                              {item.statusPengadaan || 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center space-x-1">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => viewData(item)}
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Lihat Detail"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => editData(item)}
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit Data"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => confirmDelete(item)}
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Hapus Data"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredData.length > 0 && (
                        <TableRow className="bg-muted/50 font-bold border-t-2">
                          <TableCell colSpan={5} className="text-right font-bold">TOTAL:</TableCell>
                          <TableCell className="text-right font-bold">Rp {totalRAB.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-right font-bold">Rp {totalRealisasi.toLocaleString('id-ID')}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {filteredData.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Tidak ada data pengadaan ditemukan</p>
                      <p className="text-sm mt-2">
                        {searchTerm 
                          ? `Tidak ada hasil untuk pencarian "${searchTerm}"` 
                          : "Spreadsheet kosong. Tambah data pertama untuk memulai."}
                      </p>
                      <Button 
                        onClick={() => setShowForm(true)} 
                        className="mt-4 flex items-center gap-2 mx-auto"
                      >
                        <Plus className="h-4 w-4" />
                        Tambah Data Pertama
                      </Button>
                    </div>
                  )}

                  {/* Pagination */}
                  {filteredData.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Menampilkan {indexOfFirstItem + 1} sampai {Math.min(indexOfLastItem, filteredData.length)} dari {filteredData.length} data
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToFirstPage}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                          title="Awal"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPrevPage}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                          title="Sebelumnya"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">
                          Halaman {currentPage} dari {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                          title="Berikutnya"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToLastPage}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                          title="Akhir"
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* TAMPILAN FORM INPUT */
        <Card>
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <BookOpen className="h-5 w-5" />
                {editingData ? 'Edit Data Pengadaan' : 'Form Input Pengadaan'}
              </CardTitle>
              <CardDescription className="text-blue-700">
                {editingData ? `Mengedit data ${editingData.id}` : 'Isi data pengadaan sesuai dengan tahapan yang tersedia'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {editingData && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  Edit Mode
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm(); }} disabled={saving}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* TAB NAVIGATION */}
            <div className="flex border-b mb-6">
              <Button
                variant={activeTab === "usulan" ? "default" : "ghost"}
                onClick={() => setActiveTab("usulan")}
                className={`rounded-none border-b-2 ${
                  activeTab === "usulan" 
                    ? "border-blue-600 bg-blue-50 text-blue-700" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Data Usulan
              </Button>
              <Button
                variant={activeTab === "dokumen" ? "default" : "ghost"}
                onClick={() => setActiveTab("dokumen")}
                className={`rounded-none border-b-2 ${
                  activeTab === "dokumen" 
                    ? "border-blue-600 bg-blue-50 text-blue-700" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Dokumen
              </Button>
              <Button
                variant={activeTab === "realisasi" ? "default" : "ghost"}
                onClick={() => setActiveTab("realisasi")}
                className={`rounded-none border-b-2 ${
                  activeTab === "realisasi" 
                    ? "border-blue-600 bg-blue-50 text-blue-700" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Realisasi
              </Button>
            </div>

            {/* TAB 1: DATA USULAN */}
            {activeTab === "usulan" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} disabled={saving}>
                    Kembali ke Tabel
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => editingData ? updateData() : simpanData(true)} 
                      variant="outline" 
                      className="flex items-center gap-2"
                      disabled={saving}
                    >
                      {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? "Menyimpan..." : editingData ? "Update Data" : "Simpan Usulan Saja"}
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="flex justify-between pt-4 border-t">
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setActiveTab("dokumen")} className="flex items-center gap-2" disabled={saving}>
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Dokumen
                  </Button>
                  <Button 
                    onClick={editingData ? updateData : () => simpanData(false)} 
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    disabled={saving}
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Menyimpan..." : editingData ? "Update Data" : "Simpan Semua Data"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Data</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data pengadaan <strong>{dataToDelete?.namaProdukBarangJasa}</strong>?
              Tindakan ini tidak dapat dibatalkan dan data akan dihapus permanen dari spreadsheet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => dataToDelete && deleteData(dataToDelete)}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {saving ? "Menghapus..." : "Hapus Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Data Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg p-6 -m-6 mb-6">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <Eye className="h-6 w-6" />
              Detail Data Pengadaan
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              Informasi lengkap data pengadaan - {dataToView?.namaProdukBarangJasa}
            </DialogDescription>
          </DialogHeader>
          
          {dataToView && (
            <div className="space-y-6">
              {/* Informasi Utama */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-semibold">ID Pengadaan</div>
                  <div className="text-lg font-bold text-blue-800">{dataToView.id}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-semibold">Status</div>
                  <Badge className={`${getStatusColor(dataToView.statusPengadaan)} text-base py-1 px-3`}>
                    {dataToView.statusPengadaan}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-semibold">Tahun Anggaran</div>
                  <div className="text-lg font-bold text-blue-800">{dataToView.tahunAnggaran}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kolom 1 - Data Usulan */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="bg-blue-50 pb-3">
                    <CardTitle className="text-blue-700 text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Data Usulan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Tanggal Usulan</Label>
                      <div className="p-3 bg-gray-50 rounded-md border">{formatDate(dataToView.tanggalUsulan)}</div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Nama Produk Barang/Jasa</Label>
                      <div className="p-3 bg-gray-50 rounded-md border">{dataToView.namaProdukBarangJasa}</div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Jenis Pengadaan</Label>
                      <div className="p-3 bg-gray-50 rounded-md border">{dataToView.jenisPengadaan}</div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Nama Kegiatan/Detil POK</Label>
                      <div className="p-3 bg-gray-50 rounded-md border">{dataToView.namaKegiatanDetilPOK}</div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Kode POK</Label>
                      <div className="p-3 bg-gray-50 rounded-md border font-mono">{dataToView.kodePOK}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Kolom 2 - Anggaran */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="bg-green-50 pb-3">
                    <CardTitle className="text-green-700 text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Informasi Anggaran
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Rencana Anggaran (RAB)</Label>
                      <div className="p-3 bg-green-50 rounded-md border font-bold text-green-800 text-lg">
                        {formatCurrency(dataToView.rencanaAnggaranRAB)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Nilai Realisasi</Label>
                      <div className="p-3 bg-green-50 rounded-md border font-bold text-green-800 text-lg">
                        {formatCurrency(dataToView.nilaiRealisasi)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-600">Selisih</div>
                        <div className={`text-lg font-bold ${
                          parseInt(dataToView.nilaiRealisasi || "0") > parseInt(dataToView.rencanaAnggaranRAB || "0") 
                            ? "text-red-600" 
                            : "text-green-600"
                        }`}>
                          {formatCurrency(
                            (parseInt(dataToView.nilaiRealisasi || "0") - parseInt(dataToView.rencanaAnggaranRAB || "0")).toString()
                          )}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-sm text-purple-600">Efisiensi</div>
                        <div className="text-lg font-bold text-purple-600">
                          {((parseInt(dataToView.rencanaAnggaranRAB || "0") - parseInt(dataToView.nilaiRealisasi || "0")) / parseInt(dataToView.rencanaAnggaranRAB || "1") * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Kolom 3 - Dokumen */}
                <Card className="border-l-4 border-l-orange-500 md:col-span-2">
                  <CardHeader className="bg-orange-50 pb-3">
                    <CardTitle className="text-orange-700 text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Dokumen dan Realisasi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Form Permintaan (FP)</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">{dataToView.formPermintaanFP || '-'}</div>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Kerangka Acuan Kerja (KAK)</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">{dataToView.kerangkaAcuanKerjaKAK || '-'}</div>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Jenis Dokumen Pengadaan</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">{dataToView.jenisDokumenPengadaan || '-'}</div>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Nomor Dokumen Pengadaan</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">{dataToView.nomorDokumenPengadaan || '-'}</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Tanggal Dokumen Pengadaan</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">{formatDate(dataToView.tanggalDokumenPengadaan)}</div>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Nama Penyedia / Mitra</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">{dataToView.namaPenyediaMitra || '-'}</div>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Link E-Purchasing / E-Katalog</Label>
                          <div className="p-3 bg-gray-50 rounded-md border break-words">
                            {dataToView.linkEPurchasingEKatalog ? (
                              <a href={dataToView.linkEPurchasingEKatalog} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {dataToView.linkEPurchasingEKatalog}
                              </a>
                            ) : '-'}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Tanggal Pembayaran</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">{formatDate(dataToView.tanggalPembayaran)}</div>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Nomor Bukti Pembayaran</Label>
                          <div className="p-3 bg-gray-50 rounded-md border">{dataToView.nomorBuktiPembayaran || '-'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label className="font-semibold text-sm">Keterangan / Catatan</Label>
                      <div className="p-3 bg-gray-50 rounded-md border min-h-[80px]">
                        {dataToView.keteranganCatatan || '-'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}