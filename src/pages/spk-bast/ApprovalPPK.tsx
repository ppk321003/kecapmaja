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

  // SOLUSI: Coba berbagai format request untuk menemukan yang benar
  const tryDifferentFormats = async (data: DataRow, operation: 'create' | 'update' | 'delete') => {
    const dates = Object.keys(data.blocks).sort((a, b) => parseInt(a) - parseInt(b)).join(',');
    
    const rowData = [
      data.no.toString(),
      tahun.toString(),  
      bulan,
      data.kegiatan || "",
      data.nama,
      data.nik,
      dates,
      userRole
    ];

    console.log('🔄 Mencoba format berbeda untuk:', operation);

    // Format 1: Menggunakan 'operation' dan 'values'
    const format1 = {
      spreadsheetId: SPREADSHEET_ID,
      operation: operation,
      range: operation === 'delete' ? `Sheet1!A${data.spreadsheetRowIndex}:H${data.spreadsheetRowIndex}` : "Sheet1",
      values: operation !== 'delete' ? [rowData] : undefined
    };

    // Format 2: Menggunakan 'action' dan 'data'
    const format2 = {
      spreadsheetId: SPREADSHEET_ID,
      action: operation,
      range: operation === 'delete' ? `Sheet1!A${data.spreadsheetRowIndex}:H${data.spreadsheetRowIndex}` : "Sheet1",
      data: operation !== 'delete' ? rowData : undefined
    };

    // Format 3: Format sederhana untuk delete
    const format3 = {
      spreadsheetId: SPREADSHEET_ID,
      operation: "delete",
      rowIndex: data.spreadsheetRowIndex
    };

    // Format 4: Format dengan sheetName
    const format4 = {
      spreadsheetId: SPREADSHEET_ID,
      operation: operation,
      sheetName: "Sheet1",
      range: operation === 'delete' ? `A${data.spreadsheetRowIndex}:H${data.spreadsheetRowIndex}` : "A:H",
      values: operation !== 'delete' ? [rowData] : undefined
    };

    const formats = [format1, format2, format3, format4];

    for (let i = 0; i < formats.length; i++) {
      try {
        console.log(`🔄 Mencoba format ${i + 1}:`, formats[i]);
        
        const result = await supabase.functions.invoke("google-sheets", {
          body: formats[i]
        });

        if (!result.error) {
          console.log(`✅ Format ${i + 1} berhasil!`);
          return result.data;
        }
        
        console.log(`❌ Format ${i + 1} gagal:`, result.error);
      } catch (error) {
        console.log(`❌ Format ${i + 1} error:`, error);
      }
    }

    throw new Error("Semua format gagal");
  };

  // Fungsi simpan utama dengan fallback
  const saveToSpreadsheet = async (data: DataRow, operation: 'create' | 'update' | 'delete') => {
    try {
      return await tryDifferentFormats(data, operation);
    } catch (error: any) {
      console.error('❌ Semua format gagal:', error);
      throw new Error(`Gagal ${operation} data setelah mencoba semua format`);
    }
  };

  // SOLUSI ALTERNATIF: Gunakan pendekatan langsung untuk operasi sederhana
  const directAppend = async (data: DataRow) => {
    try {
      const dates = Object.keys(data.blocks).sort((a, b) => parseInt(a) - parseInt(b)).join(',');
      
      const rowData = [
        data.no.toString(),
        tahun.toString(),  
        bulan,
        data.kegiatan || "",
        data.nama,
        data.nik,
        dates,
        userRole
      ];

      console.log('➕ Direct append:', rowData);

      // Coba format yang paling umum untuk append
      const result = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "append",
          range: "Sheet1",
          values: [rowData],
        },
      });

      if (result.error) throw result.error;

      return result.data;
    } catch (error) {
      console.error('❌ Direct append gagal:', error);
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
      return dataRows.length + 2;
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
      
      // Coba direct append dulu
      await directAppend(newRow);
      
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
      
      // Fallback: Coba format berbeda
      try {
        await saveToSpreadsheet(newRow, 'create');
        
        const newData = [...dataRows, newRow];
        const sortedData = sortData(newData);
        setDataRows(sortedData);
        setAvailableMitra(availableMitra.filter(m => m.nama !== selectedMitra));
        setSelectedMitra("");

        toast({
          title: "Sukses",
          description: "Mitra berhasil ditambahkan (fallback)",
        });
      } catch (fallbackError: any) {
        toast({
          title: "Error",
          description: "Gagal menyimpan mitra: " + fallbackError.message,
          variant: "destructive",
        });
      }
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
      
      await directAppend(newRow);
      
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
      
      try {
        await saveToSpreadsheet(newRow, 'create');
        
        const newData = [...dataRows, newRow];
        const sortedData = sortData(newData);
        setDataRows(sortedData);
        setAvailableOrganik(availableOrganik.filter(org => org.nama !== selectedOrganik));
        setSelectedOrganik("");

        toast({
          title: "Sukses",
          description: "Organik berhasil ditambahkan (fallback)",
        });
      } catch (fallbackError: any) {
        toast({
          title: "Error",
          description: "Gagal menyimpan organik: " + fallbackError.message,
          variant: "destructive",
        });
      }
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

  // ... (fungsi-fungsi lainnya tetap sama)

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
    
    const originalData = { ...data, blocks: { ...data.blocks } };

    try {
      const tanggalStrings = filteredDates.map(date => date.getDate().toString());
      
      if (editMode) {
        data.blocks = {};
      }

      const duplicateDates = tanggalStrings.filter(tanggal => originalData.blocks[tanggal]);
      
      if (duplicateDates.length > 0 && !editMode) {
        toast({
          title: "Error",
          description: `Tanggal ${duplicateDates.join(', ')} sudah ada untuk ${data.nama}`,
          variant: "destructive",
        });
        return;
      }

      tanggalStrings.forEach(tanggal => {
        data.blocks[tanggal] = kegiatanInput;
      });

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

  const getBlockedDatesForData = (data: DataRow): Date[] => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return Object.keys(data.blocks)
      .map(tanggal => new Date(tahun, monthIndex, parseInt(tanggal)))
      .filter(isDateInSelectedMonth);
  };

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
      {/* UI components tetap sama seperti sebelumnya */}
      {/* ... */}
    </div>
  );
}