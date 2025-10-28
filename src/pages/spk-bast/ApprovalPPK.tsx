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
  [key: string]: string; // tanggal -> kegiatan
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

const fungsiColors: { [key: string]: string } = {
  "Fungsi Sosial": "bg-blue-100 border-blue-400",
  "Fungsi Produksi": "bg-green-100 border-green-400",
  "Fungsi Distribusi": "bg-orange-100 border-orange-400",
  "Fungsi Neraca": "bg-purple-100 border-purple-400",
  "Fungsi IPDS": "bg-yellow-100 border-yellow-400",
  "Pejabat Pembuat Komitmen": "bg-red-100 border-red-400",
  "Bendahara": "bg-gray-100 border-gray-400"
};

// ADOPSI: Fungsi untuk parse date dari spreadsheet
const parseDateFromSpreadsheet = (dateStr: string): Date => {
  if (!dateStr || dateStr.toString().trim() === '') {
    return new Date();
  }

  const str = dateStr.toString().trim();

  // Coba parse format Indonesia
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    try {
      const [day, month, year] = str.split('/').map(part => parseInt(part));
      const parsedDate = new Date(year, month - 1, day);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    } catch (e) {
      console.warn('Failed to parse date with / format:', str, e);
    }
  }

  // Fallback ke Date constructor
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse as Date object:', str, e);
  }

  return new Date();
};

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
  const [searchMitra, setSearchMitra] = useState("");
  const [searchOrganik, setSearchOrganik] = useState("");

  const { toast } = useToast();

  const bulanOptions = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const tahunOptions = [2024, 2025, 2026];

  // ADOPSI: Filter dropdown dengan search
  const filteredAvailableMitra = useMemo(() => {
    if (!searchMitra) return availableMitra;
    const searchLower = searchMitra.toLowerCase();
    return availableMitra.filter(mitra =>
      mitra.nama.toLowerCase().includes(searchLower) ||
      mitra.kecamatan.toLowerCase().includes(searchLower) ||
      mitra.nik.toLowerCase().includes(searchLower)
    );
  }, [availableMitra, searchMitra]);

  const filteredAvailableOrganik = useMemo(() => {
    if (!searchOrganik) return availableOrganik;
    const searchLower = searchOrganik.toLowerCase();
    return availableOrganik.filter(organik =>
      organik.nama.toLowerCase().includes(searchLower) ||
      organik.jabatan.toLowerCase().includes(searchLower) ||
      organik.nip.toLowerCase().includes(searchLower)
    );
  }, [availableOrganik, searchOrganik]);

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
      setUserRole(user.role || "");
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

  // ADOPSI: Load data dengan pattern yang sama dari skrip sukses
  const loadExistingData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1!A:H",
        },
      });

      if (error) throw error;

      const rows = data.values || [];
      const currentMonthIndex = bulanOptions.indexOf(bulan);
      
      const newDataRows: DataRow[] = [];
      
      rows.slice(1).forEach((row: any[], rowIndex: number) => {
        // Filter berdasarkan bulan dan tahun
        const rowTahun = row[1];
        const rowBulan = row[2];
        
        if (rowTahun !== tahun.toString() || rowBulan !== bulan) {
          return;
        }

        const nama = row[4] || "";
        const nik = row[5] || "";
        const kegiatan = row[3] || "";
        const tanggal = row[6] ? row[6].split(',').map((t: string) => t.trim()) : [];
        const penanggungJawab = row[7] || userRole; // Gunakan userRole jika tidak ada di spreadsheet

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

  // ADOPSI: Fungsi save yang lebih robust seperti di skrip sukses
  const saveToSpreadsheet = async (data: DataRow, operation: 'create' | 'update' | 'delete') => {
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
        userRole // PASTIKAN role terekam
      ];

      console.log('Saving to spreadsheet:', { operation, rowData, spreadsheetRowIndex: data.spreadsheetRowIndex });

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
        console.error('Spreadsheet error:', result.error);
        throw new Error(result.error.message || 'Gagal menyimpan ke spreadsheet');
      }

      return result?.data;
    } catch (error: any) {
      console.error('Error in saveToSpreadsheet:', error);
      throw error;
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

    const newRow: DataRow = {
      no: dataRows.length + 1,
      nama: selected.nama,
      nik: selected.nik,
      kecamatan: selected.kecamatan,
      kegiatan: "",
      penanggungJawab: userRole,
      blocks: {},
      isOrganik: false
    };

    try {
      const result = await saveToSpreadsheet(newRow, 'create');
      
      // Update row index dari response
      if (result) {
        const { data: existingData } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "read",
            range: "Sheet1!A:A",
          },
        });
        newRow.spreadsheetRowIndex = existingData?.values ? existingData.values.length : dataRows.length + 2;
      }
      
      const newData = [...dataRows, newRow];
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setAvailableMitra(availableMitra.filter(m => m.nama !== selectedMitra));
      setSelectedMitra("");
      setSearchMitra("");

      toast({
        title: "Sukses",
        description: "Mitra berhasil ditambahkan",
      });
    } catch (error: any) {
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

    const newRow: DataRow = {
      no: dataRows.length + 1,
      nama: selected.nama,
      nik: selected.nip,
      kecamatan: selected.jabatan,
      kegiatan: "",
      penanggungJawab: userRole,
      blocks: {},
      isOrganik: true
    };

    try {
      const result = await saveToSpreadsheet(newRow, 'create');
      
      // Update row index dari response
      if (result) {
        const { data: existingData } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "read",
            range: "Sheet1!A:A",
          },
        });
        newRow.spreadsheetRowIndex = existingData?.values ? existingData.values.length : dataRows.length + 2;
      }
      
      const newData = [...dataRows, newRow];
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setAvailableOrganik(availableOrganik.filter(org => org.nama !== selectedOrganik));
      setSelectedOrganik("");
      setSearchOrganik("");

      toast({
        title: "Sukses",
        description: "Organik berhasil ditambahkan",
      });
    } catch (error: any) {
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
    
    const data = dataRows[dataIndex];
    const monthIndex = bulanOptions.indexOf(bulan);
    
    if (edit && data.blocks) {
      // Hanya tampilkan tanggal yang sesuai dengan bulan dan tahun yang dipilih
      const dates = Object.keys(data.blocks)
        .map(tanggal => new Date(tahun, monthIndex, parseInt(tanggal)))
        .filter(date => isSameMonth(date, new Date(tahun, monthIndex)) && isSameYear(date, new Date(tahun)));
      setSelectedDates(dates);
      setKegiatanInput(data.kegiatan.split(' (')[0]);
    } else {
      setSelectedDates([]);
      setKegiatanInput("");
    }
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

    if (selectedDates.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu tanggal",
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
    
    // Filter hanya tanggal yang sesuai dengan bulan dan tahun
    const monthIndex = bulanOptions.indexOf(bulan);
    const filteredDates = selectedDates.filter(date => 
      isSameMonth(date, new Date(tahun, monthIndex)) && 
      isSameYear(date, new Date(tahun))
    );

    if (filteredDates.length === 0) {
      toast({
        title: "Error",
        description: "Pilih tanggal dalam bulan " + bulan + " " + tahun,
        variant: "destructive",
      });
      return;
    }

    const tanggalStrings = filteredDates.map(date => date.getDate().toString());
    
    // Cek untuk tanggal duplikat pada orang yang sama
    const duplicateDates = tanggalStrings.filter(tanggal => data.blocks[tanggal]);
    
    if (duplicateDates.length > 0 && !editMode) {
      toast({
        title: "Error",
        description: `Tanggal ${duplicateDates.join(', ')} sudah ada untuk ${data.nama}`,
        variant: "destructive",
      });
      return;
    }

    if (editMode) {
      // Clear existing blocks untuk edit mode
      data.blocks = {};
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

    try {
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

  // Fungsi untuk mendapatkan tanggal yang sudah diblokir oleh data tertentu
  const getBlockedDatesForData = (data: DataRow): Date[] => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return Object.keys(data.blocks).map(tanggal => 
      new Date(tahun, monthIndex, parseInt(tanggal))
    );
  };

  // Fungsi untuk menangani perubahan tanggal di calendar
  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) return;
    
    // Filter hanya tanggal yang sesuai dengan bulan dan tahun
    const monthIndex = bulanOptions.indexOf(bulan);
    const filteredDates = dates.filter(date => 
      isSameMonth(date, new Date(tahun, monthIndex)) && 
      isSameYear(date, new Date(tahun))
    );
    
    setSelectedDates(filteredDates);
  };

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

  const dates = generateDates();

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
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari organik..."
                    value={searchOrganik}
                    onChange={(e) => setSearchOrganik(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedOrganik} onValueChange={setSelectedOrganik}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Pilih Organik..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAvailableOrganik.map((organik) => (
                        <SelectItem key={organik.nip} value={organik.nama}>
                          {organik.nama} - {organik.nip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addOrganik} disabled={!selectedOrganik}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah
                  </Button>
                </div>
              </div>
            </div>

            {/* Tambah Mitra */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tambah Mitra</label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari mitra..."
                    value={searchMitra}
                    onChange={(e) => setSearchMitra(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedMitra} onValueChange={setSelectedMitra}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Pilih Mitra..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAvailableMitra.map((mitra) => (
                        <SelectItem key={mitra.nik} value={mitra.nama}>
                          {mitra.nama} - {mitra.kecamatan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addMitra} disabled={!selectedMitra}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah
                  </Button>
                </div>
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
                  <TableHead className="text-center min-w-48">Nama</TableHead>
                  <TableHead className="text-center min-w-32">Jabatan/Kecamatan</TableHead>
                  <TableHead className="text-center min-w-40">Kegiatan</TableHead>
                  <TableHead className="text-center min-w-32">Penanggung Jawab</TableHead>
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
                                      onSelect={handleDateSelect}
                                      className="rounded-md border"
                                      locale={id}
                                      modifiers={{
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
                                      month={new Date(tahun, bulanOptions.indexOf(bulan))}
                                    />
                                    <Input
                                      placeholder="Nama kegiatan"
                                      value={kegiatanInput}
                                      onChange={(e) => setKegiatanInput(e.target.value)}
                                    />
                                    <div className="text-xs text-muted-foreground">
                                      Tanggal terpilih: {selectedDates.map(d => d.getDate()).join(', ')}
                                    </div>
                                    <Button 
                                      onClick={saveDates}
                                      className="w-full"
                                      disabled={selectedDates.length === 0 || !kegiatanInput.trim()}
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
                                      onSelect={handleDateSelect}
                                      className="rounded-md border"
                                      locale={id}
                                      modifiers={{
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
                                      month={new Date(tahun, bulanOptions.indexOf(bulan))}
                                    />
                                    <Input
                                      placeholder="Nama kegiatan"
                                      value={kegiatanInput}
                                      onChange={(e) => setKegiatanInput(e.target.value)}
                                    />
                                    <div className="text-xs text-muted-foreground">
                                      Tanggal terpilih: {selectedDates.map(d => d.getDate()).join(', ')}
                                    </div>
                                    <Button 
                                      onClick={saveDates}
                                      className="w-full"
                                      disabled={selectedDates.length === 0 || !kegiatanInput.trim()}
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