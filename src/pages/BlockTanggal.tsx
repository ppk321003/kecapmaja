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
import { Calendar, Plus, Trash2, User, Users, X, CalendarIcon, Building2, MapPin, Edit, Save, Search, Clock, Tag, UserCheck, FileText, Ban } from "lucide-react";
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

// MODAL EDITOR KHUSUS - OPSI B
interface KegiatanEditorProps {
  isOpen: boolean;
  onClose: () => void;
  data: DataRow;
  kegiatan: string;
  onSave: (originalKegiatan: string, updatedKegiatan: string, newDates: Date[]) => void;
}

const SPREADSHEET_ID = "14iyeMPMvlBLlM-JKDDnlPgnx6WGS_U8yOZyMTIu-rn0";
const MASTER_MITRA_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const bulanOptions = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const tahunOptions = [2024, 2025, 2026];

// Mapping role ke kolom spreadsheet
const ROLE_MAPPING = {
  'Pejabat Pembuat Komitmen': { kegiatanCol: 5, tanggalCol: 11 }, // Kolom 6 & 12 (index 5 & 11)
  'Fungsi Neraca': { kegiatanCol: 6, tanggalCol: 12 }, // Kolom 7 & 13
  'Fungsi Distribusi': { kegiatanCol: 7, tanggalCol: 13 }, // Kolom 8 & 14
  'Fungsi Produksi': { kegiatanCol: 8, tanggalCol: 14 }, // Kolom 9 & 15
  'Fungsi Sosial': { kegiatanCol: 9, tanggalCol: 15 }, // Kolom 10 & 16
  'Fungsi IPDS': { kegiatanCol: 10, tanggalCol: 16 }, // Kolom 11 & 17
};

const ALLOWED_ROLES = Object.keys(ROLE_MAPPING);
const DISABLED_ROLES = ['Bendahara', 'Pejabat Pengadaan'];

// KOMPONEN MODAL EDITOR KHUSUS
function KegiatanEditor({ isOpen, onClose, data, kegiatan, onSave }: KegiatanEditorProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [kegiatanInput, setKegiatanInput] = useState(kegiatan);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const bulan = new Date().toLocaleString('id-ID', { month: 'long' });
  const tahun = new Date().getFullYear();

  useEffect(() => {
    if (isOpen) {
      // Load existing dates for this kegiatan
      const monthIndex = bulanOptions.indexOf(bulan);
      const datesForKegiatan = Object.keys(data.blocks)
        .filter(tanggal => data.blocks[tanggal] === kegiatan)
        .map(tanggal => new Date(tahun, monthIndex, parseInt(tanggal)));
      
      setSelectedDates(datesForKegiatan);
      setKegiatanInput(kegiatan);
    }
  }, [isOpen, data, kegiatan, bulan, tahun]);

  const isDateInSelectedMonth = (date: Date) => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return isSameMonth(date, new Date(tahun, monthIndex)) && 
           isSameYear(date, new Date(tahun, monthIndex));
  };

  const handleSave = () => {
    setShowConfirmDialog(true);
  };

  const confirmSave = () => {
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

    onSave(kegiatan, kegiatanInput, filteredDates);
    setShowConfirmDialog(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Kegiatan - {data.nama}
            </DialogTitle>
            <DialogDescription>
              Edit tanggal dan nama kegiatan untuk {kegiatan}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Kegiatan</label>
              <Input
                value={kegiatanInput}
                onChange={(e) => setKegiatanInput(e.target.value)}
                placeholder="Masukkan nama kegiatan"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Pilih Tanggal</label>
              <div className="border rounded-lg mt-1">
                <CalendarComponent
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={setSelectedDates}
                  className="rounded-md"
                  locale={id}
                  month={new Date(tahun, bulanOptions.indexOf(bulan))}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Tanggal terpilih: {selectedDates.filter(isDateInSelectedMonth).map(d => d.getDate()).join(', ')}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menyimpan perubahan pada kegiatan ini?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Batal
            </Button>
            <Button onClick={confirmSave}>
              Ya, Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
  const [editingKegiatan, setEditingKegiatan] = useState<string>("");
  
  // STATE BARU UNTUK MODAL EDITOR
  const [showKegiatanEditor, setShowKegiatanEditor] = useState(false);
  const [selectedKegiatanData, setSelectedKegiatanData] = useState<{data: DataRow, kegiatan: string} | null>(null);

  const { toast } = useToast();

  // Fungsi untuk mengecek apakah user boleh melakukan tagging
  const canUserTag = useMemo(() => {
    return ALLOWED_ROLES.includes(userRole);
  }, [userRole]);

  // Fungsi untuk mengecek apakah user role disabled
  const isUserRoleDisabled = useMemo(() => {
    return DISABLED_ROLES.includes(userRole);
  }, [userRole]);

  // PERBAIKAN 1: Ambil data user dari localStorage yang benar
  useEffect(() => {
    const userData = localStorage.getItem("simaja_user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || "User");
      console.log('👤 User role loaded:', user.role);
    } else {
      console.log('⚠️ No user data found in localStorage');
      setUserRole("User");
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
        const nama = row[3] || "";
        const nik = row[4] || "";
        const kegiatan = row[5] || ""; // Kolom kegiatan sekarang berdasarkan role
        const tanggal = row[11] || ""; // Kolom tanggal sekarang berdasarkan role
        const penanggungJawab = row[17] || ""; // Kolom penanggung jawab pindah

        const isOrganik = organikList.some(org => org.nama === nama);
        
        const existingIndex = newDataRows.findIndex(item => 
          item.nik === nik && item.isOrganik === isOrganik
        );
        
        if (existingIndex === -1) {
          const blocks: BlockData = {};
          if (tanggal) {
            tanggal.split(',').forEach((t: string) => {
              const trimmedT = t.trim();
              if (trimmedT) {
                blocks[trimmedT] = kegiatan;
              }
            });
          }

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
          if (tanggal) {
            tanggal.split(',').forEach((t: string) => {
              const trimmedT = t.trim();
              if (trimmedT) {
                newDataRows[existingIndex].blocks[trimmedT] = kegiatan;
              }
            });
          }
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

  // FUNGSI BARU: Format penyimpanan sesuai struktur kolom baru
  const saveToSpreadsheet = async (data: DataRow, operation: 'create' | 'update' | 'delete') => {
    try {
      // Validasi role user
      if (!ALLOWED_ROLES.includes(userRole) && operation !== 'delete') {
        throw new Error(`Role ${userRole} tidak diperbolehkan melakukan block tanggal`);
      }

      const roleMapping = ROLE_MAPPING[userRole as keyof typeof ROLE_MAPPING];
      if (!roleMapping && operation !== 'delete') {
        throw new Error(`Role ${userRole} tidak memiliki mapping kolom yang valid`);
      }

      const dates = Object.keys(data.blocks)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .join(',');
      
      // Hitung jumlah tanggal terpakai (unique dates)
      const jumlahTanggalTerpakai = Object.keys(data.blocks).length.toString();

      // Siapkan array untuk 18 kolom
      const rowData = new Array(18).fill("");

      // Isi data sesuai struktur kolom baru
      rowData[0] = data.no.toString();                    // No
      rowData[1] = tahun.toString();                      // Tahun  
      rowData[2] = bulan;                                 // Bulan
      rowData[3] = data.nama;                             // Nama Pelaksana
      rowData[4] = data.nik;                              // NIP/NIK
      
      // Kolom kegiatan dan tanggal berdasarkan role (hanya untuk operation create/update)
      if (operation !== 'delete' && roleMapping) {
        rowData[roleMapping.kegiatanCol] = kegiatanInput || data.kegiatan; // Kolom kegiatan berdasarkan role
        rowData[roleMapping.tanggalCol] = dates;                          // Kolom tanggal berdasarkan role
      }
      
      rowData[17] = jumlahTanggalTerpakai;                // Jumlah Tanggal Terpakai (kolom 18)

      console.log('🔄 Menyimpan ke spreadsheet:', { 
        operation, 
        rowData,
        rowIndex: data.spreadsheetRowIndex,
        userRole,
        roleMapping
      });

      let requestBody;

      if (operation === 'create') {
        requestBody = {
          spreadsheetId: SPREADSHEET_ID,
          operation: "append",
          range: "Sheet1",
          values: [rowData]
        };
      } else if (operation === 'update' && data.spreadsheetRowIndex) {
        requestBody = {
          spreadsheetId: SPREADSHEET_ID,
          operation: "update",
          rowIndex: data.spreadsheetRowIndex,
          values: [rowData]
        };
      } else if (operation === 'delete' && data.spreadsheetRowIndex) {
        requestBody = {
          spreadsheetId: SPREADSHEET_ID,
          operation: "delete",
          rowIndex: data.spreadsheetRowIndex
        };
      } else {
        throw new Error(`Invalid operation or missing rowIndex: ${operation}`);
      }

      const result = await supabase.functions.invoke("google-sheets", {
        body: requestBody
      });

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

    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
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

    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
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

      await loadExistingData();

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

  // PERBAIKAN 3: Fungsi untuk membuka modal editor
  const openKegiatanEditor = (dataIndex: number, kegiatan: string) => {
    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
        variant: "destructive",
      });
      return;
    }

    setSelectedKegiatanData({
      data: dataRows[dataIndex],
      kegiatan: kegiatan
    });
    setShowKegiatanEditor(true);
  };

  // PERBAIKAN 4: Fungsi untuk menyimpan perubahan dari modal editor
  const handleSaveKegiatan = async (originalKegiatan: string, updatedKegiatan: string, newDates: Date[]) => {
    if (!selectedKegiatanData) return;

    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
        variant: "destructive",
      });
      return;
    }

    const dataIndex = dataRows.findIndex(d => 
      d.nik === selectedKegiatanData.data.nik && 
      d.isOrganik === selectedKegiatanData.data.isOrganik
    );

    if (dataIndex === -1) return;

    const newData = [...dataRows];
    const data = newData[dataIndex];
    const originalData = { ...data, blocks: { ...data.blocks } };

    try {
      const monthIndex = bulanOptions.indexOf(bulan);
      const tanggalStrings = newDates.map(date => date.getDate().toString());

      // Hapus semua tanggal untuk kegiatan lama
      Object.keys(data.blocks).forEach(tanggal => {
        if (data.blocks[tanggal] === originalKegiatan) {
          delete data.blocks[tanggal];
        }
      });

      // PERBAIKAN 5: Cek konflik hanya untuk orang yang sama
      const conflictingDates = [];
      for (const tanggal of tanggalStrings) {
        const isConflict = dataRows.some(otherData => {
          // HANYA cek konflik untuk orang YANG SAMA
          if (otherData.nik === data.nik && otherData.isOrganik === data.isOrganik) {
            return otherData.blocks[tanggal] !== undefined && 
                   otherData.blocks[tanggal] !== originalKegiatan; // Kecuali kegiatan yang sedang diedit
          }
          return false; // Orang LAIN BOLEH pakai tanggal yang sama
        });
        
        if (isConflict) {
          conflictingDates.push(tanggal);
        }
      }

      if (conflictingDates.length > 0) {
        toast({
          title: "Konflik Tanggal",
          description: `Tanggal ${conflictingDates.join(', ')} sudah digunakan oleh kegiatan lain untuk orang yang sama`,
          variant: "destructive",
        });
        return;
      }

      // Tambahkan tanggal baru untuk kegiatan yang diupdate
      tanggalStrings.forEach(tanggal => {
        data.blocks[tanggal] = updatedKegiatan;
      });

      // Update kegiatan string
      const semuaKegiatan = [...new Set(Object.values(data.blocks))].filter(k => k.trim() !== "");
      data.kegiatan = semuaKegiatan.join(' | ');

      await saveToSpreadsheet(data, 'update');
      
      const sortedData = sortData(newData);
      setDataRows(sortedData);

      toast({
        title: "Sukses",
        description: "Kegiatan berhasil diperbarui",
      });
    } catch (error: any) {
      newData[dataIndex] = originalData;
      setDataRows([...newData]);
      
      console.error('❌ Error updating kegiatan:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui kegiatan: " + error.message,
        variant: "destructive",
      });
    }
  };

  // Fungsi existing untuk tambah tanggal (tetap dipertahankan)
  const openDatePicker = (dataIndex: number, edit: boolean = false, kegiatan?: string) => {
    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
        variant: "destructive",
      });
      return;
    }

    setSelectedDataForDates(dataIndex);
    setEditMode(edit);
    
    if (edit && kegiatan) {
      const data = dataRows[dataIndex];
      const monthIndex = bulanOptions.indexOf(bulan);
      
      const datesForKegiatan = Object.keys(data.blocks)
        .filter(tanggal => data.blocks[tanggal] === kegiatan)
        .map(tanggal => new Date(tahun, monthIndex, parseInt(tanggal)));
      
      setSelectedDates(datesForKegiatan);
      setKegiatanInput(kegiatan);
      setEditingKegiatan(kegiatan);
    } else {
      setSelectedDates([]);
      setKegiatanInput("");
      setEditingKegiatan("");
    }
  };

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

    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
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
      
      if (editMode && editingKegiatan) {
        Object.keys(data.blocks).forEach(tanggal => {
          if (data.blocks[tanggal] === editingKegiatan) {
            delete data.blocks[tanggal];
          }
        });
      }

      // PERBAIKAN 6: Cek konflik hanya untuk orang yang sama
      const conflictingDates = [];
      for (const tanggal of tanggalStrings) {
        const isConflict = dataRows.some(otherData => {
          // HANYA cek konflik untuk orang YANG SAMA
          if (otherData.nik === data.nik && otherData.isOrganik === data.isOrganik) {
            return otherData.blocks[tanggal] !== undefined && 
                   otherData.blocks[tanggal] !== editingKegiatan;
          }
          return false; // Orang LAIN BOLEH pakai tanggal yang sama
        });
        
        if (isConflict) {
          conflictingDates.push(tanggal);
        }
      }

      if (conflictingDates.length > 0) {
        toast({
          title: "Konflik Tanggal",
          description: `Tanggal ${conflictingDates.join(', ')} sudah digunakan oleh kegiatan lain untuk orang yang sama`,
          variant: "destructive",
        });
        return;
      }

      tanggalStrings.forEach(tanggal => {
        data.blocks[tanggal] = kegiatanInput;
      });

      const semuaKegiatan = [...new Set(Object.values(data.blocks))].filter(k => k.trim() !== "");
      data.kegiatan = semuaKegiatan.join(' | ');

      data.penanggungJawab = userRole;

      console.log('💾 Menyimpan tanggal:', {
        nama: data.nama,
        kegiatan: data.kegiatan,
        dates: tanggalStrings,
        editMode,
        editingKegiatan,
        userRole: data.penanggungJawab
      });

      await saveToSpreadsheet(data, 'update');
      
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setKegiatanInput("");
      setSelectedDates([]);
      setSelectedDataForDates(null);
      setEditMode(false);
      setEditingKegiatan("");

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

  const getUniqueKegiatanList = (data: DataRow): string[] => {
    return [...new Set(Object.values(data.blocks))].filter(k => k.trim() !== "");
  };

  const getBlockedDatesForData = (data: DataRow): Date[] => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return Object.keys(data.blocks)
      .map(tanggal => new Date(tahun, monthIndex, parseInt(tanggal)))
      .filter(isDateInSelectedMonth);
  };

  // Fungsi untuk mendapatkan semua tanggal yang diblokir (untuk calendar)
  const getAllBlockedDates = (): Date[] => {
    const monthIndex = bulanOptions.indexOf(bulan);
    const allBlockedDates: Date[] = [];
    
    dataRows.forEach(data => {
      Object.keys(data.blocks).forEach(tanggal => {
        const date = new Date(tahun, monthIndex, parseInt(tanggal));
        if (isDateInSelectedMonth(date)) {
          allBlockedDates.push(date);
        }
      });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Block Tanggal Perjalanan Dinas</h1>
          <p className="text-muted-foreground mt-2">
            Sistem tagging tanggal perjalanan dinas untuk organik BPS dan Mitra Statistik Kabupaten Majalengka
          </p>
          <div className="flex items-center gap-2 mt-2">
            <UserCheck className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">Login sebagai: <strong className="text-blue-600">{userRole}</strong></span>
            {!canUserTag && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md flex items-center gap-1">
                <Ban className="h-3 w-3" />
                Mode View Only
              </span>
            )}
          </div>
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

      {/* Add Data Section - Hanya tampil untuk role yang boleh tagging */}
      {canUserTag && (
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
      )}

      {/* Warning untuk role disabled */}
      {isUserRoleDisabled && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-yellow-800">
              <Ban className="h-5 w-5" />
              <div>
                <p className="font-medium">Akses Terbatas</p>
                <p className="text-sm">Role <strong>{userRole}</strong> hanya dapat melihat data tanpa dapat melakukan perubahan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead className="min-w-60">Kegiatan</TableHead>
                  <TableHead className="min-w-40">Penanggung Jawab</TableHead>
                  <TableHead className="text-center min-w-20">Jumlah</TableHead>
                  {/* Kolom Aksi hanya untuk role yang boleh tagging */}
                  {canUserTag && <TableHead className="text-center min-w-40">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataRows.map((data, index) => {
                  const uniqueKegiatan = getUniqueKegiatanList(data);
                  const blockedDates = getBlockedDatesForData(data);
                  
                  return (
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
                        <div className="max-w-[400px]">
                          {uniqueKegiatan.length > 0 ? (
                            <div className="space-y-1">
                              {uniqueKegiatan.map((kegiatan, idx) => {
                                const datesForKegiatan = Object.keys(data.blocks)
                                  .filter(t => data.blocks[t] === kegiatan)
                                  .sort((a, b) => parseInt(a) - parseInt(b));
                                
                                return (
                                  <div key={idx} className="flex items-start gap-2">
                                    <FileText className="h-3 w-3 text-gray-500 mt-1 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium break-words">{kegiatan}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Tanggal: {datesForKegiatan.join(', ')}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Belum ada kegiatan</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-blue-600">{data.penanggungJawab}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-full">
                          {getBlockedDatesCount(data)}
                        </span>
                      </TableCell>
                      {/* Kolom Aksi hanya untuk role yang boleh tagging */}
                      {canUserTag && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Tombol Tambah Tanggal */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="icon"
                                        className="h-8 w-8 bg-green-50 hover:bg-green-100 border-green-200 text-green-600 hover:text-green-700"
                                        onClick={() => openDatePicker(index, false)}
                                      >
                                        <Plus className="h-3.5 w-3.5" />
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
                                            blocked: getAllBlockedDates()
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
                                          className="w-full bg-green-600 hover:bg-green-700"
                                          disabled={selectedDates.filter(isDateInSelectedMonth).length === 0 || !kegiatanInput.trim()}
                                        >
                                          <Save className="h-4 w-4 mr-2" />
                                          Simpan Tanggal
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

                            {/* Tombol Edit per Kegiatan - MENGGUNAKAN MODAL BARU */}
                            {uniqueKegiatan.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      className="h-8 w-8 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 hover:text-blue-700"
                                      onClick={() => {
                                        // Buka modal untuk pilih kegiatan
                                        if (uniqueKegiatan.length === 1) {
                                          // Jika hanya satu kegiatan, langsung buka editor
                                          openKegiatanEditor(index, uniqueKegiatan[0]);
                                        } else {
                                          // Jika multiple, buka popover untuk pilih
                                          openDatePicker(index, true);
                                        }
                                      }}
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit Kegiatan</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {/* Tombol Hapus Data */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 bg-red-50 hover:bg-red-100 border-red-200 text-red-600 hover:text-red-700"
                                    onClick={() => requestDeleteData(index)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Hapus Data</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Editor Khusus */}
      {selectedKegiatanData && (
        <KegiatanEditor
          isOpen={showKegiatanEditor}
          onClose={() => {
            setShowKegiatanEditor(false);
            setSelectedKegiatanData(null);
          }}
          data={selectedKegiatanData.data}
          kegiatan={selectedKegiatanData.kegiatan}
          onSave={handleSaveKegiatan}
        />
      )}

      {/* Popover untuk pilih kegiatan (jika multiple) */}
      <Popover>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            <div className="text-sm font-medium mb-2">Pilih Kegiatan untuk Edit</div>
            {selectedDataForDates !== null && getUniqueKegiatanList(dataRows[selectedDataForDates]).map((kegiatan, idx) => {
              const datesForKegiatan = Object.keys(dataRows[selectedDataForDates].blocks)
                .filter(t => dataRows[selectedDataForDates].blocks[t] === kegiatan)
                .sort((a, b) => parseInt(a) - parseInt(b));
              
              return (
                <Button
                  key={idx}
                  variant="ghost"
                  className="w-full justify-start h-auto py-2"
                  onClick={() => {
                    openKegiatanEditor(selectedDataForDates, kegiatan);
                    setSelectedDataForDates(null);
                  }}
                >
                  <div className="text-left">
                    <div className="text-sm font-medium">{kegiatan}</div>
                    <div className="text-xs text-muted-foreground">
                      Tanggal: {datesForKegiatan.join(', ')}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

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
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}