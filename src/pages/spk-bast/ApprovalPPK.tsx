"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Trash2, User, Users, X, CalendarIcon, Building2, MapPin, Edit, Save, Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameMonth, isSameYear } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Combobox } from "@/components/ui/combobox";

interface Mitra {
  nama: string;
  nik: string;
  kecamatan: string;
}

interface Organik {
  nama: string;
  nip: string;
  jabatan: string;
}

interface BlockData {
  [key: string]: string;
}

interface DataRow {
  no: number;
  nama: string;
  nik: string;
  kecamatan: string;
  kegiatan: string;
  penanggungJawab: string;
  blocks: BlockData;
  isOrganik: boolean;
  spreadsheetRowIndex?: number;
}

const SPREADSHEET_ID = "14iyeMPMvlBLlM-JKDDnlPgnx6WGS_U8yOZyMTIu-rn0";
const MASTER_MITRA_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const bulanOptions = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const tahunOptions = [2024, 2025, 2026];

export default function BlockTanggal() {
  const [mitraList, setMitraList] = useState<Mitra[]>([]);
  const [organikList, setOrganikList] = useState<Organik[]>([]);
  const [availableMitra, setAvailableMitra] = useState<Mitra[]>([]);
  const [availableOrganik, setAvailableOrganik] = useState<Organik[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string>("");
  const [selectedOrganik, setSelectedOrganik] = useState<string>("");
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const [bulan, setBulan] = useState<string>(new Date().toLocaleString('id-ID', { month: 'long' }));
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [userRole, setUserRole] = useState<string>("");
  const [kegiatanInput, setKegiatanInput] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteDataDialog, setShowDeleteDataDialog] = useState(false);
  const [dataToDelete, setDataToDelete] = useState<number | null>(null);
  const [selectedDataForDates, setSelectedDataForDates] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [searchTermMitra, setSearchTermMitra] = useState("");
  const [searchTermOrganik, setSearchTermOrganik] = useState("");

  const { toast } = useToast();

  // Get days in month dynamically
  const getDaysInMonth = () => {
    const monthIndex = bulanOptions.indexOf(bulan);
    const date = new Date(tahun, monthIndex + 1, 0);
    return date.getDate();
  };

  const generateDates = () => {
    const daysInMonth = getDaysInMonth();
    return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || "User");
    }
    loadMasterMitra();
    loadMasterOrganik();
  }, []);

  useEffect(() => {
    if (mitraList.length > 0 || organikList.length > 0) {
      loadExistingData();
    }
  }, [bulan, tahun, mitraList, organikList]);

  const loadMasterMitra = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_MITRA_SHEET_ID,
          operation: "read",
          range: "MASTER.MITRA",
        },
      });

      if (error) throw error;

      const rows = data.values || [];
      const mitraData: Mitra[] = rows.slice(1).map((row: any[]) => ({
        nama: row[2] || "",
        nik: row[1] || "",
        kecamatan: row[7] || "",
      }));

      setMitraList(mitraData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data master mitra",
        variant: "destructive",
      });
    }
  };

  const loadMasterOrganik = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_MITRA_SHEET_ID,
          operation: "read",
          range: "MASTER.ORGANIK",
        },
      });

      if (error) throw error;

      const rows = data.values || [];
      const organikData: Organik[] = rows.slice(1).map((row: any[]) => ({
        nama: row[3] || "",
        nip: row[2] || "",
        jabatan: row[4] || "",
      }));

      setOrganikList(organikData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data master organik",
        variant: "destructive",
      });
    }
  };

  const loadExistingData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (error) throw error;

      const rows = data.values || [];
      const currentData = rows.filter((row: any[]) => 
        row[1] === tahun.toString() && row[2] === bulan
      );

      const newDataRows: DataRow[] = [];
      
      currentData.forEach((row: any[], rowIndex: number) => {
        const nama = row[4] || "";
        const nik = row[5] || "";
        const kegiatan = row[3] || "";
        const tanggal = row[6] ? row[6].split(',').map((t: string) => t.trim()) : [];
        const penanggungJawab = row[7] || "";

        const isOrganik = organikList.some(org => org.nama === nama);
        
        const existingIndex = newDataRows.findIndex(item => 
          item.nik === nik && item.isOrganik === isOrganik
        );
        
        if (existingIndex === -1) {
          const blocks: BlockData = {};
          tanggal.forEach((t: string) => {
            blocks[t] = kegiatan;
          });

          newDataRows.push({
            no: newDataRows.length + 1,
            nama: nama,
            nik: nik,
            kecamatan: isOrganik ? 
              organikList.find(org => org.nama === nama)?.jabatan || "" : 
              mitraList.find(m => m.nik === nik)?.kecamatan || "",
            kegiatan: kegiatan,
            penanggungJawab: penanggungJawab,
            blocks,
            isOrganik,
            spreadsheetRowIndex: rowIndex + 2
          });
        } else {
          tanggal.forEach((t: string) => {
            newDataRows[existingIndex].blocks[t] = kegiatan;
          });
        }
      });

      const sortedData = sortData(newDataRows);
      setDataRows(sortedData);
      updateAvailableData(sortedData);
      setIsLoading(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data existing",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const updateAvailableData = (currentData: DataRow[]) => {
    const usedNiks = currentData.map(item => item.nik);
    const usedOrganikNames = currentData.filter(item => item.isOrganik).map(item => item.nama);
    
    const availableMitraData = mitraList.filter(mitra => !usedNiks.includes(mitra.nik));
    const availableOrganikData = organikList.filter(org => !usedOrganikNames.includes(org.nama));
    
    setAvailableMitra(availableMitraData);
    setAvailableOrganik(availableOrganikData);
  };

  // PERBAIKAN UTAMA: Fungsi simpan yang lebih robust
  const saveToSpreadsheet = async (data: DataRow, operation: 'create' | 'update' | 'delete') => {
    try {
      const dates = Object.keys(data.blocks).sort((a, b) => parseInt(a) - parseInt(b)).join(',');
      
      // Format data sesuai dengan header spreadsheet
      const rowData = [
        data.no.toString(),                    // A: No
        tahun.toString(),                      // B: Tahun  
        bulan,                                 // C: Bulan
        data.kegiatan || "",                   // D: Kegiatan
        data.nama,                             // E: Nama Pelaksana
        data.nik,                              // F: NIP/NIK
        dates,                                 // G: Tanggal
        userRole                               // H: Penanggung Jawab Kegiatan
      ];

      console.log('🔄 Menyimpan ke spreadsheet:', { 
        operation, 
        rowData,
        rowIndex: data.spreadsheetRowIndex 
      });

      let result;

      if (operation === 'create') {
        result = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "append",
            range: "Sheet1",
            values: [rowData],
          },
        });
      } else if (operation === 'update' && data.spreadsheetRowIndex) {
        result = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "update",
            range: `Sheet1!A${data.spreadsheetRowIndex}:H${data.spreadsheetRowIndex}`,
            values: [rowData],
          },
        });
      } else if (operation === 'delete' && data.spreadsheetRowIndex) {
        result = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "delete",
            range: `Sheet1!A${data.spreadsheetRowIndex}:H${data.spreadsheetRowIndex}`,
          },
        });
      }

      if (result?.error) {
        console.error('❌ Error spreadsheet:', result.error);
        throw new Error(result.error.message || `Gagal ${operation} data ke spreadsheet`);
      }

      console.log('✅ Simpan berhasil:', result?.data);
      return result?.data;
    } catch (error: any) {
      console.error('❌ Error dalam saveToSpreadsheet:', error);
      throw error;
    }
  };

  // Fungsi untuk mendapatkan row index baru
  const getNextRowIndex = async (): Promise<number> => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1!A:A",
        },
      });

      if (error) throw error;

      const nextIndex = data?.values ? data.values.length + 1 : 2;
      console.log('📊 Next row index:', nextIndex);
      return nextIndex;
    } catch (error) {
      console.error('Error getting next row index:', error);
      return dataRows.length + 2; // Fallback
    }
  };

  const addMitra = async () => {
    if (!selectedMitra) {
      toast({
        title: "Peringatan",
        description: "Pilih mitra terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    const selected = availableMitra.find(m => m.nama === selectedMitra);
    if (!selected) return;

    const nextRowIndex = await getNextRowIndex();
    const newRow: DataRow = {
      no: dataRows.length + 1,
      nama: selected.nama,
      nik: selected.nik,
      kecamatan: selected.kecamatan,
      kegiatan: "",
      penanggungJawab: userRole,
      blocks: {},
      isOrganik: false,
      spreadsheetRowIndex: nextRowIndex
    };

    try {
      console.log('➕ Menambah mitra:', newRow);
      await saveToSpreadsheet(newRow, 'create');
      
      const newData = [...dataRows, newRow];
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setAvailableMitra(availableMitra.filter(m => m.nama !== selectedMitra));
      setSelectedMitra("");

      toast({
        title: "Sukses",
        description: "Mitra berhasil ditambahkan",
      });
    } catch (error: any) {
      console.error('❌ Error adding mitra:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan mitra: " + error.message,
        variant: "destructive",
      });
    }
  };

  const addOrganik = async () => {
    if (!selectedOrganik) {
      toast({
        title: "Peringatan",
        description: "Pilih organik terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    const selected = availableOrganik.find(org => org.nama === selectedOrganik);
    if (!selected) return;

    const nextRowIndex = await getNextRowIndex();
    const newRow: DataRow = {
      no: dataRows.length + 1,
      nama: selected.nama,
      nik: selected.nip,
      kecamatan: selected.jabatan,
      kegiatan: "",
      penanggungJawab: userRole,
      blocks: {},
      isOrganik: true,
      spreadsheetRowIndex: nextRowIndex
    };

    try {
      console.log('➕ Menambah organik:', newRow);
      await saveToSpreadsheet(newRow, 'create');
      
      const newData = [...dataRows, newRow];
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setAvailableOrganik(availableOrganik.filter(org => org.nama !== selectedOrganik));
      setSelectedOrganik("");

      toast({
        title: "Sukses",
        description: "Organik berhasil ditambahkan",
      });
    } catch (error: any) {
      console.error('❌ Error adding organik:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan organik: " + error.message,
        variant: "destructive",
      });
    }
  };

  const sortData = (data: DataRow[]): DataRow[] => {
    const sorted = data.sort((a, b) => {
      if (a.isOrganik !== b.isOrganik) {
        return a.isOrganik ? -1 : 1;
      }
      return a.nama.localeCompare(b.nama);
    });

    return sorted.map((item, index) => ({
      ...item,
      no: index + 1
    }));
  };

  const requestDeleteData = (dataIndex: number) => {
    setDataToDelete(dataIndex);
    setShowDeleteDataDialog(true);
  };

  const deleteData = async () => {
    if (dataToDelete === null) return;

    const data = dataRows[dataToDelete];
    
    try {
      console.log('🗑️ Menghapus data:', data);
      await saveToSpreadsheet(data, 'delete');
      
      const newData = [...dataRows];
      newData.splice(dataToDelete, 1);
      
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      
      if (data.isOrganik) {
        setAvailableOrganik([...availableOrganik, organikList.find(org => org.nama === data.nama)!]);
      } else {
        setAvailableMitra([...availableMitra, mitraList.find(m => m.nik === data.nik)!]);
      }
      
      setShowDeleteDataDialog(false);
      setDataToDelete(null);

      toast({
        title: "Sukses",
        description: "Data berhasil dihapus",
      });
    } catch (error: any) {
      console.error('❌ Error deleting data:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus data: " + error.message,
        variant: "destructive",
      });
    }
  };

  const openDatePicker = (dataIndex: number, edit: boolean = false) => {
    setSelectedDataForDates(dataIndex);
    setEditMode(edit);
    
    if (edit) {
      const data = dataRows[dataIndex];
      const monthIndex = bulanOptions.indexOf(bulan);
      const dates = Object.keys(data.blocks).map(tanggal => 
        new Date(tahun, monthIndex, parseInt(tanggal))
      );
      setSelectedDates(dates);
      setKegiatanInput(data.kegiatan.split(' (')[0]);
    } else {
      setSelectedDates([]);
      setKegiatanInput("");
    }
  };

  // Filter tanggal hanya untuk bulan yang dipilih
  const isDateInSelectedMonth = (date: Date) => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return isSameMonth(date, new Date(tahun, monthIndex)) && 
           isSameYear(date, new Date(tahun, monthIndex));
  };

  const saveDates = async () => {
    if (selectedDataForDates === null) {
      toast({
        title: "Error",
        description: "Tidak ada data yang dipilih",
        variant: "destructive",
      });
      return;
    }

    // Filter hanya tanggal dalam bulan yang dipilih
    const filteredDates = selectedDates.filter(isDateInSelectedMonth);

    if (filteredDates.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu tanggal dalam bulan " + bulan,
        variant: "destructive",
      });
      return;
    }

    if (!kegiatanInput.trim()) {
      toast({
        title: "Error",
        description: "Masukkan nama kegiatan",
        variant: "destructive",
      });
      return;
    }

    const newData = [...dataRows];
    const dataIndex = selectedDataForDates;
    const data = newData[dataIndex];
    
    // Simpan data sebelum perubahan untuk rollback jika perlu
    const originalData = { ...data, blocks: { ...data.blocks } };

    try {
      const tanggalStrings = filteredDates.map(date => date.getDate().toString());
      
      if (editMode) {
        // Dalam mode edit, hapus semua blocks dan buat ulang
        data.blocks = {};
      }

      // Cek untuk tanggal duplikat pada orang yang sama
      const duplicateDates = tanggalStrings.filter(tanggal => originalData.blocks[tanggal]);
      
      if (duplicateDates.length > 0 && !editMode) {
        toast({
          title: "Error",
          description: `Tanggal ${duplicateDates.join(', ')} sudah ada untuk ${data.nama}`,
          variant: "destructive",
        });
        return;
      }

      // Tambahkan blocks untuk setiap tanggal yang dipilih
      tanggalStrings.forEach(tanggal => {
        data.blocks[tanggal] = kegiatanInput;
      });

      // Format kegiatan
      const sortedDates = tanggalStrings.sort((a, b) => parseInt(a) - parseInt(b));
      const kegiatanEntry = `${kegiatanInput} (${sortedDates.join(',')})`;
      
      if (editMode) {
        data.kegiatan = kegiatanEntry;
      } else {
        data.kegiatan = data.kegiatan ? `${data.kegiatan} - ${kegiatanEntry}` : kegiatanEntry;
      }

      data.penanggungJawab = userRole;

      console.log('💾 Menyimpan tanggal:', {
        nama: data.nama,
        kegiatan: data.kegiatan,
        dates: tanggalStrings,
        editMode
      });

      // PERBAIKAN: Pastikan update ke spreadsheet
      await saveToSpreadsheet(data, 'update');
      
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setKegiatanInput("");
      setSelectedDates([]);
      setSelectedDataForDates(null);
      setEditMode(false);

      toast({
        title: "Sukses",
        description: "Tanggal berhasil disimpan",
      });
    } catch (error: any) {
      // Rollback jika gagal
      newData[dataIndex] = originalData;
      setDataRows([...newData]);
      
      console.error('❌ Error saving dates:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan tanggal: " + error.message,
        variant: "destructive",
      });
    }
  };

  const getBlockedDatesCount = (data: DataRow) => {
    return Object.keys(data.blocks).length;
  };

  const getKegiatanDisplay = (data: DataRow) => {
    if (!data.kegiatan) return "Belum ada kegiatan";
    return data.kegiatan;
  };

  // Fungsi untuk mendapatkan tanggal yang diblokir oleh data tertentu saja
  const getBlockedDatesForData = (data: DataRow): Date[] => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return Object.keys(data.blocks)
      .map(tanggal => new Date(tahun, monthIndex, parseInt(tanggal)))
      .filter(isDateInSelectedMonth);
  };

  // Fungsi untuk mendapatkan tanggal yang diblokir oleh orang lain
  const getBlockedDatesByOthers = (currentData: DataRow): Date[] => {
    const monthIndex = bulanOptions.indexOf(bulan);
    const allBlockedDates: Date[] = [];
    
    dataRows.forEach(data => {
      if (data.nik !== currentData.nik || data.isOrganik !== currentData.isOrganik) {
        Object.keys(data.blocks).forEach(tanggal => {
          const date = new Date(tahun, monthIndex, parseInt(tanggal));
          if (isDateInSelectedMonth(date)) {
            allBlockedDates.push(date);
          }
        });
      }
    });
    
    return allBlockedDates;
  };

  // Fungsi untuk dropdown dengan search
  const filteredAvailableMitra = useMemo(() => {
    if (!searchTermMitra) return availableMitra;
    return availableMitra.filter(mitra =>
      mitra.nama.toLowerCase().includes(searchTermMitra.toLowerCase()) ||
      mitra.kecamatan.toLowerCase().includes(searchTermMitra.toLowerCase()) ||
      mitra.nik.toLowerCase().includes(searchTermMitra.toLowerCase())
    );
  }, [availableMitra, searchTermMitra]);

  const filteredAvailableOrganik = useMemo(() => {
    if (!searchTermOrganik) return availableOrganik;
    return availableOrganik.filter(organik =>
      organik.nama.toLowerCase().includes(searchTermOrganik.toLowerCase()) ||
      organik.jabatan.toLowerCase().includes(searchTermOrganik.toLowerCase()) ||
      organik.nip.toLowerCase().includes(searchTermOrganik.toLowerCase())
    );
  }, [availableOrganik, searchTermOrganik]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Block Tanggal Perjalanan Dinas</h1>
          <p className="text-muted-foreground mt-2">
            Sistem tagging tanggal perjalanan dinas untuk organik BPS dan Mitra Statistik Kabupaten Majalengka
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Select value={bulan} onValueChange={setBulan}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {bulanOptions.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tahun.toString()} onValueChange={(value) => setTahun(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              {tahunOptions.map((t) => (
                <SelectItem key={t} value={t.toString()}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Tambah Data
          </CardTitle>
          <CardDescription>
            Pilih organik atau mitra untuk ditambahkan ke daftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tambah Organik */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tambah Organik</label>
              <div className="flex gap-2">
                <Combobox
                  options={filteredAvailableOrganik.map(org => ({
                    value: org.nama,
                    label: `${org.nama} - ${org.nip}`
                  }))}
                  value={selectedOrganik}
                  onValueChange={setSelectedOrganik}
                  placeholder="Pilih atau cari organik..."
                  searchPlaceholder="Cari nama organik..."
                  emptyMessage="Tidak ada organik tersedia"
                  onSearchChange={setSearchTermOrganik}
                />
                <Button onClick={addOrganik} disabled={!selectedOrganik}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah
                </Button>
              </div>
            </div>

            {/* Tambah Mitra */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tambah Mitra</label>
              <div className="flex gap-2">
                <Combobox
                  options={filteredAvailableMitra.map(mitra => ({
                    value: mitra.nama,
                    label: `${mitra.nama} - ${mitra.kecamatan}`
                  }))}
                  value={selectedMitra}
                  onValueChange={setSelectedMitra}
                  placeholder="Pilih atau cari mitra..."
                  searchPlaceholder="Cari nama mitra..."
                  emptyMessage="Tidak ada mitra tersedia"
                  onSearchChange={setSearchTermMitra}
                />
                <Button onClick={addMitra} disabled={!selectedMitra}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>
              Daftar <span className="text-black">Perjalanan Dinas</span> - <span className="text-red-500">{bulan} {tahun}</span>
            </CardTitle>
          </div>
          <CardDescription>
            Kelola tanggal block perjalanan dinas untuk organik dan mitra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-12">No</TableHead>
                  <TableHead className="min-w-48">Nama</TableHead>
                  <TableHead className="min-w-32">Jabatan/Kecamatan</TableHead>
                  <TableHead className="min-w-40">Kegiatan</TableHead>
                  <TableHead className="min-w-32">Penanggung Jawab</TableHead>
                  <TableHead className="text-center min-w-24">Jumlah</TableHead>
                  <TableHead className="text-center min-w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataRows.map((data, index) => (
                  <TableRow key={`${data.nik}-${data.isOrganik}`}>
                    <TableCell className="text-center font-medium">
                      {data.no}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {data.isOrganik ? (
                          <Building2 className="h-4 w-4 text-blue-600" />
                        ) : (
                          <MapPin className="h-4 w-4 text-green-600" />
                        )}
                        <div>
                          <div className="flex items-center gap-1">
                            {data.nama}
                            {data.isOrganik && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Organik</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {data.isOrganik ? `NIP: ${data.nik}` : `NIK: ${data.nik}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {data.kecamatan}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="max-w-[300px] truncate">
                              {getKegiatanDisplay(data)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[400px]">
                            <div className="space-y-1">
                              <p className="font-semibold">Detail Kegiatan:</p>
                              <p>{getKegiatanDisplay(data)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{data.penanggungJawab}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-full">
                        {getBlockedDatesCount(data)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Tombol Tambah Tanggal */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={() => openDatePicker(index, false)}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4" align="start">
                                  <div className="space-y-4">
                                    <div className="text-sm font-medium">Tambah Tanggal untuk {data.nama}</div>
                                    <CalendarComponent
                                      mode="multiple"
                                      selected={selectedDates}
                                      onSelect={setSelectedDates}
                                      className="rounded-md border"
                                      locale={id}
                                      month={new Date(tahun, bulanOptions.indexOf(bulan))}
                                      modifiers={{
                                        // Hanya tampilkan yang sudah diblokir oleh orang ini
                                        blocked: getBlockedDatesForData(data)
                                      }}
                                      modifiersStyles={{
                                        blocked: {
                                          backgroundColor: '#fef2f2',
                                          color: '#dc2626',
                                          fontWeight: 'bold',
                                          border: '2px solid #dc2626'
                                        }
                                      }}
                                    />
                                    <Input
                                      placeholder="Nama kegiatan"
                                      value={kegiatanInput}
                                      onChange={(e) => setKegiatanInput(e.target.value)}
                                    />
                                    <div className="text-xs text-muted-foreground">
                                      Tanggal terpilih: {selectedDates.filter(isDateInSelectedMonth).map(d => d.getDate()).join(', ')}
                                    </div>
                                    <Button 
                                      onClick={saveDates}
                                      className="w-full"
                                      disabled={selectedDates.filter(isDateInSelectedMonth).length === 0 || !kegiatanInput.trim()}
                                    >
                                      <Save className="h-4 w-4 mr-2" />
                                      Simpan
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Tambah Tanggal</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Tombol Edit Tanggal */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={() => openDatePicker(index, true)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4" align="start">
                                  <div className="space-y-4">
                                    <div className="text-sm font-medium">Edit Tanggal untuk {data.nama}</div>
                                    <CalendarComponent
                                      mode="multiple"
                                      selected={selectedDates}
                                      onSelect={setSelectedDates}
                                      className="rounded-md border"
                                      locale={id}
                                      month={new Date(tahun, bulanOptions.indexOf(bulan))}
                                      modifiers={{
                                        // Untuk edit, hanya tampilkan yang diblokir orang lain
                                        blocked: getBlockedDatesByOthers(data)
                                      }}
                                      modifiersStyles={{
                                        blocked: {
                                          backgroundColor: '#fef2f2',
                                          color: '#dc2626',
                                          fontWeight: 'bold',
                                          border: '2px solid #dc2626'
                                        }
                                      }}
                                    />
                                    <Input
                                      placeholder="Nama kegiatan"
                                      value={kegiatanInput}
                                      onChange={(e) => setKegiatanInput(e.target.value)}
                                    />
                                    <div className="text-xs text-muted-foreground">
                                      Tanggal terpilih: {selectedDates.filter(isDateInSelectedMonth).map(d => d.getDate()).join(', ')}
                                    </div>
                                    <Button 
                                      onClick={saveDates}
                                      className="w-full"
                                      disabled={selectedDates.filter(isDateInSelectedMonth).length === 0 || !kegiatanInput.trim()}
                                    >
                                      <Save className="h-4 w-4 mr-2" />
                                      Update
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit Tanggal</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Tombol Hapus Data */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => requestDeleteData(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Hapus Data</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Data Confirmation Dialog */}
      <Dialog open={showDeleteDataDialog} onOpenChange={setShowDeleteDataDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Data</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data ini? Semua data tanggal block akan ikut terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDataDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={deleteData}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}