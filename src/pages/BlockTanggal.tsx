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
import { Calendar, Plus, Trash2, Building2, MapPin, Edit, Save, Ban, UserCheck, AlertCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isSameMonth, isSameYear } from "date-fns";
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
  [key: string]: {
    kegiatan: string;
    role: string;
    kegiatanIndex: number;
  };
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

interface KegiatanToDelete {
  kegiatan: string;
  index: number;
  selected: boolean;
  dates: string[];
}

const SPREADSHEET_ID = "14iyeMPMvlBLlM-JKDDnlPgnx6WGS_U8yOZyMTIu-rn0";
const MASTER_MITRA_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const bulanOptions = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tahunOptions = [2024, 2025, 2026];

const ROLE_MAPPING = {
  'Pejabat Pembuat Komitmen': {
    kegiatanCols: [6, 18, 30, 42, 54, 66, 78, 90, 102, 114],
    tanggalCols: [12, 24, 36, 48, 60, 72, 84, 96, 108, 120],
    maxKegiatan: 10,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200'
  },
  'Fungsi Neraca': {
    kegiatanCols: [7, 19, 31, 43, 55, 67, 79, 91, 103, 115],
    tanggalCols: [13, 25, 37, 49, 61, 73, 85, 97, 109, 121],
    maxKegiatan: 10,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200'
  },
  'Fungsi Distribusi': {
    kegiatanCols: [8, 20, 32, 44, 56, 68, 80, 92, 104, 116],
    tanggalCols: [14, 26, 38, 50, 62, 74, 86, 98, 110, 122],
    maxKegiatan: 10,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200'
  },
  'Fungsi Produksi': {
    kegiatanCols: [9, 21, 33, 45, 57, 69, 81, 93, 105, 117],
    tanggalCols: [15, 27, 39, 51, 63, 75, 87, 99, 111, 123],
    maxKegiatan: 10,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200'
  },
  'Fungsi Sosial': {
    kegiatanCols: [10, 22, 34, 46, 58, 70, 82, 94, 106, 118],
    tanggalCols: [16, 28, 40, 52, 64, 76, 88, 100, 112, 124],
    maxKegiatan: 10,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  },
  'Fungsi IPDS': {
    kegiatanCols: [11, 23, 35, 47, 59, 71, 83, 95, 107, 119],
    tanggalCols: [17, 29, 41, 53, 65, 77, 89, 101, 113, 125],
    maxKegiatan: 10,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200'
  }
};

const PENANGGUNG_JAWAB_COL = 126;
const TOTAL_TANGGAL_COL = 127;
const KECAMATAN_JABATAN_COL = 5;

const ALLOWED_ROLES = Object.keys(ROLE_MAPPING);
const DISABLED_ROLES = ['Bendahara', 'Pejabat Pengadaan'];

const generateBlockKey = (tanggal: string, role: string, kegiatanIndex: number) => {
  return `${tanggal}-${role}-${kegiatanIndex}`;
};

const parseBlockKey = (key: string) => {
  const [tanggal, role, kegiatanIndex] = key.split('-');
  return { tanggal, role, kegiatanIndex: parseInt(kegiatanIndex) };
};

const getAvailableKegiatanSlot = (data: DataRow, role: string): number => {
  const roleMapping = ROLE_MAPPING[role as keyof typeof ROLE_MAPPING];
  if (!roleMapping) return -1;
  
  const existingKegiatanIndices = new Set<number>();
  
  Object.values(data.blocks).forEach(block => {
    if (block.role === role) {
      existingKegiatanIndices.add(block.kegiatanIndex);
    }
  });
  
  for (let i = 0; i < roleMapping.maxKegiatan; i++) {
    if (!existingKegiatanIndices.has(i)) {
      return i;
    }
  }
  
  return -1;
};

const getKegiatanByRole = (data: DataRow, role: string): { kegiatan: string; index: number; dates: string[] }[] => {
  const roleMapping = ROLE_MAPPING[role as keyof typeof ROLE_MAPPING];
  if (!roleMapping) return [];
  
  const kegiatanMap = new Map<number, { kegiatan: string; dates: string[] }>();
  
  Object.entries(data.blocks).forEach(([key, block]) => {
    if (block.role === role) {
      const { tanggal, kegiatanIndex } = parseBlockKey(key);
      
      if (!kegiatanMap.has(kegiatanIndex)) {
        kegiatanMap.set(kegiatanIndex, { 
          kegiatan: block.kegiatan, 
          dates: [] 
        });
      }
      
      kegiatanMap.get(kegiatanIndex)!.dates.push(tanggal);
    }
  });
  
  return Array.from(kegiatanMap.entries())
    .map(([index, { kegiatan, dates }]) => ({
      kegiatan,
      index,
      dates: dates.sort((a, b) => parseInt(a) - parseInt(b))
    }))
    .sort((a, b) => a.index - b.index);
};

function EditTanggalModal({
  isOpen,
  onClose,
  data,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  data: DataRow;
  onSave: (selectedDates: Date[], kegiatan: string, kegiatanIndex: number) => void;
}) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [kegiatanInput, setKegiatanInput] = useState("");
  const [kegiatanIndex, setKegiatanIndex] = useState<number>(0);
  const { toast } = useToast();
  const userRole = localStorage.getItem("simaja_user") ? JSON.parse(localStorage.getItem("simaja_user")!).role : "";
  const bulan = new Date().toLocaleString('id-ID', { month: 'long' });
  const tahun = new Date().getFullYear();

  useEffect(() => {
    if (isOpen) {
      const monthIndex = bulanOptions.indexOf(bulan);
      const userKegiatan = getKegiatanByRole(data, userRole);
      
      if (userKegiatan.length > 0) {
        const firstKegiatan = userKegiatan[0];
        setKegiatanInput(firstKegiatan.kegiatan);
        setKegiatanIndex(firstKegiatan.index);
        
        const datesForKegiatan = firstKegiatan.dates.map(tanggal => 
          new Date(tahun, monthIndex, parseInt(tanggal))
        ).filter(date => isSameMonth(date, new Date(tahun, monthIndex)));
        
        setSelectedDates(datesForKegiatan);
      } else {
        setKegiatanInput("");
        setKegiatanIndex(0);
        setSelectedDates([]);
      }
    }
  }, [isOpen, data, bulan, tahun, userRole]);

  const isDateInSelectedMonth = (date: Date) => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return isSameMonth(date, new Date(tahun, monthIndex)) && isSameYear(date, new Date(tahun, monthIndex));
  };

  const getBlockedByOtherRoles = (): Date[] => {
    const monthIndex = bulanOptions.indexOf(bulan);
    const blockedDates: Date[] = [];
    
    Object.keys(data.blocks).forEach(key => {
      const block = data.blocks[key];
      const { tanggal } = parseBlockKey(key);
      if (block.role !== userRole) {
        const date = new Date(tahun, monthIndex, parseInt(tanggal));
        if (isDateInSelectedMonth(date)) {
          blockedDates.push(date);
        }
      }
    });
    
    return blockedDates;
  };

  const handleSave = () => {
    const filteredDates = selectedDates.filter(isDateInSelectedMonth);
    if (filteredDates.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu tanggal dalam bulan " + bulan,
        variant: "destructive"
      });
      return;
    }
    
    if (!kegiatanInput.trim()) {
      toast({
        title: "Error",
        description: "Masukkan nama kegiatan",
        variant: "destructive"
      });
      return;
    }
    
    onSave(filteredDates, kegiatanInput, kegiatanIndex);
    onClose();
  };

  const blockedByOthers = getBlockedByOtherRoles();
  const userKegiatan = getKegiatanByRole(data, userRole);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Tanggal untuk {data.nama}
          </DialogTitle>
          <DialogDescription>
            Edit tanggal dan kegiatan yang Anda miliki. Tanggal yang sudah di-block oleh role lain tidak dapat diubah.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {userKegiatan.length > 1 && (
            <div>
              <label className="text-sm font-medium">Pilih Kegiatan yang akan Diedit</label>
              <Select value={kegiatanIndex.toString()} onValueChange={(value) => {
                const index = parseInt(value);
                setKegiatanIndex(index);
                const selectedKegiatan = userKegiatan.find(k => k.index === index);
                if (selectedKegiatan) {
                  setKegiatanInput(selectedKegiatan.kegiatan);
                  const monthIndex = bulanOptions.indexOf(bulan);
                  const dates = selectedKegiatan.dates.map(t => 
                    new Date(tahun, monthIndex, parseInt(t))
                  ).filter(date => isDateInSelectedMonth(date));
                  setSelectedDates(dates);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kegiatan" />
                </SelectTrigger>
                <SelectContent>
                  {userKegiatan.map((kegiatan) => (
                    <SelectItem key={kegiatan.index} value={kegiatan.index.toString()}>
                      {kegiatan.kegiatan} (Slot {kegiatan.index + 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium">Nama Kegiatan</label>
            <Input 
              value={kegiatanInput} 
              onChange={e => setKegiatanInput(e.target.value)} 
              placeholder="Masukkan nama kegiatan" 
              className="mt-1" 
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Pilih atau Batalkan Tanggal</label>
            <div className="border rounded-lg mt-1">
              <CalendarComponent 
                mode="multiple" 
                selected={selectedDates} 
                onSelect={setSelectedDates} 
                className="rounded-md" 
                locale={id} 
                month={new Date(tahun, bulanOptions.indexOf(bulan))} 
                disabled={blockedByOthers}
                modifiers={{
                  blocked: blockedByOthers
                }}
                modifiersStyles={{
                  blocked: {
                    backgroundColor: '#f3f4f6',
                    color: '#9ca3af',
                    textDecoration: 'line-through',
                    cursor: 'not-allowed'
                  }
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              • Klik tanggal untuk memilih/membatalkan
              <br />
              • Tanggal abu-abu sudah di-block oleh role lain dan tidak dapat diubah
              <br />
              • Tanggal terpilih: {selectedDates.filter(isDateInSelectedMonth).map(d => d.getDate()).join(', ')}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" />
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TambahKegiatanModal({
  isOpen,
  onClose,
  data,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  data: DataRow;
  onSave: (selectedDates: Date[], kegiatan: string, kegiatanIndex: number) => void;
}) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [kegiatanInput, setKegiatanInput] = useState("");
  const { toast } = useToast();
  const userRole = localStorage.getItem("simaja_user") ? JSON.parse(localStorage.getItem("simaja_user")!).role : "";
  const bulan = new Date().toLocaleString('id-ID', { month: 'long' });
  const tahun = new Date().getFullYear();

  useEffect(() => {
    if (isOpen) {
      setSelectedDates([]);
      setKegiatanInput("");
    }
  }, [isOpen]);

  const isDateInSelectedMonth = (date: Date) => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return isSameMonth(date, new Date(tahun, monthIndex)) && isSameYear(date, new Date(tahun, monthIndex));
  };

  const getAvailableSlot = () => {
    return getAvailableKegiatanSlot(data, userRole);
  };

  const handleSave = () => {
    const filteredDates = selectedDates.filter(isDateInSelectedMonth);
    if (filteredDates.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu tanggal dalam bulan " + bulan,
        variant: "destructive"
      });
      return;
    }
    
    if (!kegiatanInput.trim()) {
      toast({
        title: "Error",
        description: "Masukkan nama kegiatan",
        variant: "destructive"
      });
      return;
    }
    
    const availableSlot = getAvailableSlot();
    if (availableSlot === -1) {
      toast({
        title: "Error",
        description: "Anda sudah mencapai batas maksimal kegiatan untuk bulan ini",
        variant: "destructive"
      });
      return;
    }
    
    onSave(filteredDates, kegiatanInput, availableSlot);
    onClose();
  };

  const availableSlot = getAvailableSlot();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Tambah Kegiatan Baru untuk {data.nama}
          </DialogTitle>
          <DialogDescription>
            Tambahkan kegiatan baru. Slot tersedia: {availableSlot + 1}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nama Kegiatan Baru</label>
            <Input 
              value={kegiatanInput} 
              onChange={e => setKegiatanInput(e.target.value)} 
              placeholder="Masukkan nama kegiatan baru" 
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
              • Tanggal terpilih: {selectedDates.filter(isDateInSelectedMonth).map(d => d.getDate()).join(', ')}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" />
            Tambah Kegiatan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [showDeleteDataDialog, setShowDeleteDataDialog] = useState(false);
  const [dataToDelete, setDataToDelete] = useState<number | null>(null);
  const [selectedDataForDates, setSelectedDataForDates] = useState<number | null>(null);
  const [searchTermMitra, setSearchTermMitra] = useState("");
  const [searchTermOrganik, setSearchTermOrganik] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTambahKegiatanModal, setShowTambahKegiatanModal] = useState(false);
  const [dataToEdit, setDataToEdit] = useState<DataRow | null>(null);
  const [kegiatanToDelete, setKegiatanToDelete] = useState<KegiatanToDelete[]>([]);
  const { toast } = useToast();

  const canUserTag = useMemo(() => {
    return ALLOWED_ROLES.includes(userRole);
  }, [userRole]);

  const isUserRoleDisabled = useMemo(() => {
    return DISABLED_ROLES.includes(userRole);
  }, [userRole]);

  const canUserEditData = (data: DataRow): boolean => {
    if (!canUserTag) return false;
    const penanggungJawabList = data.penanggungJawab.split(',').map(pj => pj.trim());
    return penanggungJawabList.includes(userRole);
  };

  useEffect(() => {
    const userData = localStorage.getItem("simaja_user");
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
          range: "MASTER.MITRA"
        }
      });

      if (error) throw error;

      const rows = data.values || [];
      const mitraData: Mitra[] = rows.slice(1).map((row: any[]) => ({
        nama: row[2] || "",
        nik: row[1] || "",
        kecamatan: row[7] || ""
      }));

      setMitraList(mitraData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data master mitra",
        variant: "destructive"
      });
    }
  };

  const loadMasterOrganik = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_MITRA_SHEET_ID,
          operation: "read",
          range: "MASTER.ORGANIK"
        }
      });

      if (error) throw error;

      const rows = data.values || [];
      const organikData: Organik[] = rows.slice(1).map((row: any[]) => ({
        nama: row[3] || "",
        nip: row[2] || "",
        jabatan: row[4] || ""
      }));

      setOrganikList(organikData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data master organik",
        variant: "destructive"
      });
    }
  };

  const loadExistingData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1!A:DW"
        }
      });

      if (error) throw error;

      const rows = data.values || [];
      const currentData = rows.filter((row: any[]) => row[1] === tahun.toString() && row[2] === bulan);
      const newDataRows: DataRow[] = [];

      currentData.forEach((row: any[], rowIndex: number) => {
        const nama = row[3] || "";
        const nik = row[4] || "";
        const kecamatanJabatan = row[KECAMATAN_JABATAN_COL - 1] || "";
        const penanggungJawab = row[PENANGGUNG_JAWAB_COL - 1] || "";
        const isOrganik = organikList.some(org => org.nama === nama);

        const existingIndex = newDataRows.findIndex(item => item.nama === nama && item.nik === nik);
        const blocks: BlockData = {};
        let kegiatanText = "";

        Object.entries(ROLE_MAPPING).forEach(([role, mapping]) => {
          for (let kegiatanIndex = 0; kegiatanIndex < mapping.maxKegiatan; kegiatanIndex++) {
            const kegiatanCol = mapping.kegiatanCols[kegiatanIndex] - 1;
            const tanggalCol = mapping.tanggalCols[kegiatanIndex] - 1;
            
            if (kegiatanCol < row.length && tanggalCol < row.length) {
              const kegiatan = row[kegiatanCol] || "";
              const tanggal = row[tanggalCol] || "";
              
              if (kegiatan && tanggal) {
                tanggal.split(',').forEach((t: string) => {
                  const trimmedT = t.trim();
                  if (trimmedT) {
                    const blockKey = generateBlockKey(trimmedT, role, kegiatanIndex);
                    blocks[blockKey] = {
                      kegiatan: kegiatan,
                      role: role,
                      kegiatanIndex: kegiatanIndex
                    };
                  }
                });

                if (kegiatanText) {
                  kegiatanText += " | ";
                }
                kegiatanText += `${kegiatan} (${role})`;
              }
            }
          }
        });

        if (existingIndex === -1) {
          newDataRows.push({
            no: newDataRows.length + 1,
            nama,
            nik,
            kecamatan: kecamatanJabatan,
            kegiatan: kegiatanText,
            penanggungJawab,
            blocks,
            isOrganik,
            spreadsheetRowIndex: rowIndex + 2
          });
        } else {
          Object.entries(blocks).forEach(([key, blockData]) => {
            newDataRows[existingIndex].blocks[key] = blockData;
          });
          
          const existingKegiatanList = newDataRows[existingIndex].kegiatan.split(' | ').filter(k => k.trim() !== "");
          const newKegiatanList = kegiatanText.split(' | ').filter(k => k.trim() !== "");
          const combinedKegiatan = [...new Set([...existingKegiatanList, ...newKegiatanList])].join(' | ');
          newDataRows[existingIndex].kegiatan = combinedKegiatan;
          
          const existingPJ = newDataRows[existingIndex].penanggungJawab.split(',').map(pj => pj.trim());
          const newPJ = penanggungJawab.split(',').map(pj => pj.trim());
          const combinedPJ = [...new Set([...existingPJ, ...newPJ])].join(', ');
          newDataRows[existingIndex].penanggungJawab = combinedPJ;
        }
      });

      const sortedData = sortData(newDataRows);
      setDataRows(sortedData);
      updateAvailableData(sortedData);
      setIsLoading(false);
    } catch (error: any) {
      console.error("❌ Error loading data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data existing",
        variant: "destructive"
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

  const saveToSpreadsheet = async (data: DataRow, operation: 'create' | 'update' | 'delete', kegiatanIndex: number = 0, kegiatanNama: string = '') => {
    try {
      if (!canUserTag && operation !== 'delete') {
        throw new Error(`Role ${userRole} tidak diperbolehkan melakukan block tanggal`);
      }

      const roleMapping = ROLE_MAPPING[userRole as keyof typeof ROLE_MAPPING];
      if (!roleMapping && operation !== 'delete') {
        throw new Error(`Role ${userRole} tidak memiliki mapping kolom yang valid`);
      }

      const { data: existingData, error: readError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: `Sheet1!A${data.spreadsheetRowIndex}:DW${data.spreadsheetRowIndex}`
        }
      });

      let existingRow = new Array(127).fill("");
      if (!readError && existingData?.values?.[0]) {
        existingRow = [...existingData.values[0]];
        while (existingRow.length < 127) {
          existingRow.push("");
        }
      }

      const rowData = [...existingRow];

      if (operation === 'create') {
        rowData[0] = data.no.toString();
        rowData[1] = tahun.toString();
        rowData[2] = bulan;
        rowData[3] = data.nama;
        rowData[4] = data.nik;
        rowData[KECAMATAN_JABATAN_COL - 1] = data.kecamatan;
      }

      if (operation !== 'delete' && roleMapping) {
        if (kegiatanIndex < 0 || kegiatanIndex >= roleMapping.maxKegiatan) {
          throw new Error(`Kegiatan index ${kegiatanIndex} tidak valid untuk role ${userRole}`);
        }

        const kegiatanCol = roleMapping.kegiatanCols[kegiatanIndex] - 1;
        const tanggalCol = roleMapping.tanggalCols[kegiatanIndex] - 1;

        if (kegiatanNama) {
          rowData[kegiatanCol] = kegiatanNama;
        } else {
          rowData[kegiatanCol] = kegiatanInput;
        }

        const relevantDates = Object.keys(data.blocks)
          .filter(key => {
            const block = data.blocks[key];
            return block.role === userRole && 
                   block.kegiatanIndex === kegiatanIndex;
          })
          .map(key => parseBlockKey(key).tanggal)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .join(',');

        rowData[tanggalCol] = relevantDates;
      }

      let penanggungJawab = rowData[PENANGGUNG_JAWAB_COL - 1] || data.penanggungJawab;
      if (operation !== 'delete') {
        const currentPJ = penanggungJawab.split(',').map(pj => pj.trim()).filter(pj => pj);
        if (!currentPJ.includes(userRole)) {
          currentPJ.push(userRole);
        }
        penanggungJawab = currentPJ.filter(pj => pj).join(', ');
      }
      rowData[PENANGGUNG_JAWAB_COL - 1] = penanggungJawab;

      const totalTanggal = Object.keys(data.blocks).length;
      rowData[TOTAL_TANGGAL_COL - 1] = totalTanggal.toString();

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
        throw new Error(result.error.message || `Gagal ${operation} data`);
      }

      return result?.data;
    } catch (error: any) {
      console.error('❌ Error saving to spreadsheet:', error);
      throw error;
    }
  };

  const deleteUserRoleData = async (data: DataRow, kegiatanIndex?: number) => {
    try {
      if (!canUserTag) {
        throw new Error(`Role ${userRole} tidak diperbolehkan melakukan delete`);
      }

      if (kegiatanIndex !== undefined) {
        return await deleteSpecificKegiatan(data, kegiatanIndex);
      }

      const rolesInData = new Set();
      Object.values(data.blocks).forEach(block => {
        rolesInData.add(block.role);
      });

      const isOnlyRole = rolesInData.size === 1 && rolesInData.has(userRole);
      if (isOnlyRole) {
        await saveToSpreadsheet(data, 'delete');
        return 'delete';
      } else {
        return await deleteAllUserKegiatan(data);
      }
    } catch (error: any) {
      console.error('❌ Error in deleteUserRoleData:', error);
      throw error;
    }
  };

  const deleteAllUserKegiatan = async (data: DataRow) => {
    const roleMapping = ROLE_MAPPING[userRole as keyof typeof ROLE_MAPPING];
    if (!roleMapping) throw new Error(`Role ${userRole} tidak valid`);

    const { data: existingData, error: readError } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: SPREADSHEET_ID,
        operation: "read",
        range: `Sheet1!A${data.spreadsheetRowIndex}:DW${data.spreadsheetRowIndex}`
      }
    });

    if (readError) throw readError;

    let existingRow = new Array(127).fill("");
    if (existingData?.values?.[0]) {
      existingRow = [...existingData.values[0]];
      while (existingRow.length < 127) {
        existingRow.push("");
      }
    }

    const rowData = [...existingRow];

    for (let i = 0; i < roleMapping.maxKegiatan; i++) {
      const kegiatanCol = roleMapping.kegiatanCols[i] - 1;
      const tanggalCol = roleMapping.tanggalCols[i] - 1;
      
      if (kegiatanCol < rowData.length) rowData[kegiatanCol] = "";
      if (tanggalCol < rowData.length) rowData[tanggalCol] = "";
    }

    let penanggungJawab = rowData[PENANGGUNG_JAWAB_COL - 1] || "";
    const currentPJ = penanggungJawab.split(',').map(pj => pj.trim()).filter(pj => pj && pj !== userRole);
    penanggungJawab = currentPJ.join(', ');
    rowData[PENANGGUNG_JAWAB_COL - 1] = penanggungJawab;

    const remainingBlocks = Object.keys(data.blocks).filter(key => {
      const block = data.blocks[key];
      return block.role !== userRole;
    }).length;
    rowData[TOTAL_TANGGAL_COL - 1] = remainingBlocks.toString();

    const requestBody = {
      spreadsheetId: SPREADSHEET_ID,
      operation: "update",
      rowIndex: data.spreadsheetRowIndex,
      values: [rowData]
    };

    const result = await supabase.functions.invoke("google-sheets", {
      body: requestBody
    });

    if (result?.error) {
      throw new Error(result.error.message || `Gagal update data setelah delete`);
    }

    return 'update';
  };

  const deleteSpecificKegiatan = async (data: DataRow, kegiatanIndex: number) => {
    const roleMapping = ROLE_MAPPING[userRole as keyof typeof ROLE_MAPPING];
    if (!roleMapping) throw new Error(`Role ${userRole} tidak valid`);

    const { data: existingData, error: readError } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: SPREADSHEET_ID,
        operation: "read",
        range: `Sheet1!A${data.spreadsheetRowIndex}:DW${data.spreadsheetRowIndex}`
      }
    });

    if (readError) throw readError;

    let existingRow = new Array(127).fill("");
    if (existingData?.values?.[0]) {
      existingRow = [...existingData.values[0]];
      while (existingRow.length < 127) {
        existingRow.push("");
      }
    }

    const rowData = [...existingRow];

    const kegiatanCol = roleMapping.kegiatanCols[kegiatanIndex] - 1;
    const tanggalCol = roleMapping.tanggalCols[kegiatanIndex] - 1;
    
    if (kegiatanCol < rowData.length) rowData[kegiatanCol] = "";
    if (tanggalCol < rowData.length) rowData[tanggalCol] = "";

    const remainingBlocks = Object.keys(data.blocks).filter(key => {
      const block = data.blocks[key];
      return !(block.role === userRole && block.kegiatanIndex === kegiatanIndex);
    }).length;
    rowData[TOTAL_TANGGAL_COL - 1] = remainingBlocks.toString();

    const requestBody = {
      spreadsheetId: SPREADSHEET_ID,
      operation: "update",
      rowIndex: data.spreadsheetRowIndex,
      values: [rowData]
    };

    const result = await supabase.functions.invoke("google-sheets", {
      body: requestBody
    });

    if (result?.error) {
      throw new Error(result.error.message || `Gagal delete kegiatan spesifik`);
    }

    return 'update';
  };

  const getNextRowIndex = async (): Promise<number> => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1!A:A"
        }
      });

      if (error) throw error;
      return data?.values ? data.values.length + 1 : 2;
    } catch (error) {
      console.error('Error getting next row index:', error);
      return dataRows.length + 2;
    }
  };

  const addMitra = async () => {
    if (!selectedMitra || !kegiatanInput.trim()) {
      toast({
        title: "Peringatan",
        description: "Pilih mitra dan isi nama kegiatan",
        variant: "destructive"
      });
      return;
    }

    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
        variant: "destructive"
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
      kegiatan: kegiatanInput,
      penanggungJawab: userRole,
      blocks: {},
      isOrganik: false,
      spreadsheetRowIndex: nextRowIndex
    };

    try {
      await saveToSpreadsheet(newRow, 'create');
      const newData = [...dataRows, newRow];
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setAvailableMitra(availableMitra.filter(m => m.nama !== selectedMitra));
      setSelectedMitra("");
      
      toast({
        title: "Sukses",
        description: "Mitra berhasil ditambahkan"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menyimpan mitra: " + error.message,
        variant: "destructive"
      });
    }
  };

  const addOrganik = async () => {
    if (!selectedOrganik || !kegiatanInput.trim()) {
      toast({
        title: "Peringatan",
        description: "Pilih organik dan isi nama kegiatan",
        variant: "destructive"
      });
      return;
    }

    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
        variant: "destructive"
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
      kegiatan: kegiatanInput,
      penanggungJawab: userRole,
      blocks: {},
      isOrganik: true,
      spreadsheetRowIndex: nextRowIndex
    };

    try {
      await saveToSpreadsheet(newRow, 'create');
      const newData = [...dataRows, newRow];
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setAvailableOrganik(availableOrganik.filter(org => org.nama !== selectedOrganik));
      setSelectedOrganik("");
      
      toast({
        title: "Sukses",
        description: "Organik berhasil ditambahkan"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menyimpan organik: " + error.message,
        variant: "destructive"
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
    const data = dataRows[dataIndex];
    if (!canUserEditData(data)) {
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki akses untuk menghapus data ini",
        variant: "destructive"
      });
      return;
    }

    // PERBAIKAN: Siapkan daftar kegiatan untuk dipilih
    const userKegiatan = getKegiatanByRole(data, userRole);
    const kegiatanList: KegiatanToDelete[] = userKegiatan.map(kegiatan => ({
      kegiatan: kegiatan.kegiatan,
      index: kegiatan.index,
      dates: kegiatan.dates,
      selected: false
    }));

    setKegiatanToDelete(kegiatanList);
    setDataToDelete(dataIndex);
    setShowDeleteDataDialog(true);
  };

  const toggleKegiatanSelection = (index: number) => {
    setKegiatanToDelete(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAllKegiatan = () => {
    const allSelected = kegiatanToDelete.every(item => item.selected);
    setKegiatanToDelete(prev => 
      prev.map(item => ({ ...item, selected: !allSelected }))
    );
  };

  const deleteData = async () => {
    if (dataToDelete === null) return;

    const data = dataRows[dataToDelete];
    if (!canUserEditData(data)) {
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki akses untuk menghapus data ini",
        variant: "destructive"
      });
      return;
    }

    const selectedKegiatan = kegiatanToDelete.filter(item => item.selected);
    
    if (selectedKegiatan.length === 0) {
      toast({
        title: "Peringatan",
        description: "Pilih minimal satu kegiatan untuk dihapus",
        variant: "destructive"
      });
      return;
    }

    try {
      // PERBAIKAN: Hapus hanya kegiatan yang dipilih
      if (selectedKegiatan.length === kegiatanToDelete.length) {
        // Jika semua kegiatan dipilih, hapus semua data user
        const deleteResult = await deleteUserRoleData(data);
        
        if (deleteResult === 'delete') {
          const newData = [...dataRows];
          newData.splice(dataToDelete, 1);
          const sortedData = sortData(newData);
          setDataRows(sortedData);
          if (data.isOrganik) {
            setAvailableOrganik([...availableOrganik, organikList.find(org => org.nama === data.nama)!]);
          } else {
            setAvailableMitra([...availableMitra, mitraList.find(m => m.nik === data.nik)!]);
          }
          toast({
            title: "Sukses",
            description: "Semua data berhasil dihapus (seluruh baris)"
          });
        } else {
          await loadExistingData();
          toast({
            title: "Sukses",
            description: "Semua kegiatan role Anda berhasil dihapus"
          });
        }
      } else {
        // Hapus hanya kegiatan yang dipilih
        for (const kegiatan of selectedKegiatan) {
          await deleteSpecificKegiatan(data, kegiatan.index);
        }
        await loadExistingData();
        toast({
          title: "Sukses",
          description: `Kegiatan terpilih (${selectedKegiatan.length}) berhasil dihapus`
        });
      }

      setShowDeleteDataDialog(false);
      setDataToDelete(null);
      setKegiatanToDelete([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menghapus data: " + error.message,
        variant: "destructive"
      });
    }
  };

  const openDatePicker = (dataIndex: number) => {
    const data = dataRows[dataIndex];
    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
        variant: "destructive"
      });
      return;
    }
    setSelectedDataForDates(dataIndex);
    setSelectedDates([]);
  };

  const openEditModal = (dataIndex: number) => {
    const data = dataRows[dataIndex];
    if (!canUserEditData(data)) {
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki akses untuk mengedit data ini",
        variant: "destructive"
      });
      return;
    }
    setDataToEdit(data);
    setShowEditModal(true);
  };

  const openTambahKegiatanModal = (dataIndex: number) => {
    const data = dataRows[dataIndex];
    if (!canUserEditData(data)) {
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki akses untuk menambah kegiatan",
        variant: "destructive"
      });
      return;
    }

    const availableSlot = getAvailableKegiatanSlot(data, userRole);
    if (availableSlot === -1) {
      toast({
        title: "Peringatan",
        description: `Anda sudah mencapai batas maksimal ${ROLE_MAPPING[userRole as keyof typeof ROLE_MAPPING]?.maxKegiatan || 10} kegiatan untuk bulan ini`,
        variant: "destructive"
      });
      return;
    }

    setDataToEdit(data);
    setShowTambahKegiatanModal(true);
  };

  const handleEditSave = async (selectedDates: Date[], kegiatan: string, kegiatanIndex: number) => {
    if (!dataToEdit) return;

    const newData = [...dataRows];
    const dataIndex = dataRows.findIndex(d => d.nik === dataToEdit.nik && d.isOrganik === dataToEdit.isOrganik);
    if (dataIndex === -1) return;

    const data = newData[dataIndex];
    const originalData = { ...data, blocks: { ...data.blocks } };

    try {
      const monthIndex = bulanOptions.indexOf(bulan);
      const tanggalStrings = selectedDates.map(date => date.getDate().toString());

      Object.keys(data.blocks).forEach(key => {
        const block = data.blocks[key];
        const { kegiatanIndex: existingIndex } = parseBlockKey(key);
        if (block.role === userRole && existingIndex === kegiatanIndex) {
          delete data.blocks[key];
        }
      });

      tanggalStrings.forEach(tanggal => {
        const blockKey = generateBlockKey(tanggal, userRole, kegiatanIndex);
        data.blocks[blockKey] = {
          kegiatan: kegiatan,
          role: userRole,
          kegiatanIndex: kegiatanIndex
        };
      });

      await saveToSpreadsheet(data, 'update', kegiatanIndex, kegiatan);
      
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setShowEditModal(false);
      setDataToEdit(null);
      
      toast({
        title: "Sukses",
        description: "Kegiatan berhasil diperbarui"
      });
    } catch (error: any) {
      newData[dataIndex] = originalData;
      setDataRows([...newData]);
      
      toast({
        title: "Error",
        description: "Gagal memperbarui kegiatan: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleTambahKegiatan = async (selectedDates: Date[], kegiatan: string, kegiatanIndex: number) => {
    if (!dataToEdit) return;

    const newData = [...dataRows];
    const dataIndex = dataRows.findIndex(d => d.nik === dataToEdit.nik && d.isOrganik === dataToEdit.isOrganik);
    if (dataIndex === -1) return;

    const data = newData[dataIndex];

    try {
      const monthIndex = bulanOptions.indexOf(bulan);
      const tanggalStrings = selectedDates.map(date => date.getDate().toString());

      tanggalStrings.forEach(tanggal => {
        const blockKey = generateBlockKey(tanggal, userRole, kegiatanIndex);
        data.blocks[blockKey] = {
          kegiatan: kegiatan,
          role: userRole,
          kegiatanIndex: kegiatanIndex
        };
      });

      await saveToSpreadsheet(data, 'update', kegiatanIndex, kegiatan);
      
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setShowTambahKegiatanModal(false);
      setDataToEdit(null);
      
      toast({
        title: "Sukses",
        description: "Kegiatan baru berhasil ditambahkan"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menambah kegiatan: " + error.message,
        variant: "destructive"
      });
    }
  };

  const isDateInSelectedMonth = (date: Date) => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return isSameMonth(date, new Date(tahun, monthIndex)) && isSameYear(date, new Date(tahun, monthIndex));
  };

  const saveDates = async () => {
    if (selectedDataForDates === null) {
      toast({
        title: "Error",
        description: "Tidak ada data yang dipilih",
        variant: "destructive"
      });
      return;
    }

    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
        variant: "destructive"
      });
      return;
    }

    const filteredDates = selectedDates.filter(isDateInSelectedMonth);
    if (filteredDates.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu tanggal dalam bulan " + bulan,
        variant: "destructive"
      });
      return;
    }

    if (!kegiatanInput.trim()) {
      toast({
        title: "Error",
        description: "Masukkan nama kegiatan",
        variant: "destructive"
      });
      return;
    }

    const newData = [...dataRows];
    const dataIndex = selectedDataForDates;
    const data = newData[dataIndex];
    const originalData = { ...data, blocks: { ...data.blocks } };

    try {
      const tanggalStrings = filteredDates.map(date => date.getDate().toString());
      const availableSlot = getAvailableKegiatanSlot(data, userRole);

      if (availableSlot === -1) {
        toast({
          title: "Error",
          description: "Tidak ada slot kegiatan tersedia",
          variant: "destructive"
        });
        return;
      }

      const conflictingDates = [];
      for (const tanggal of tanggalStrings) {
        const existingBlock = Object.keys(data.blocks).find(key => {
          const { tanggal: existingTanggal } = parseBlockKey(key);
          return existingTanggal === tanggal;
        });

        if (existingBlock) {
          conflictingDates.push(tanggal);
        }
      }

      if (conflictingDates.length > 0) {
        toast({
          title: "Konflik Tanggal",
          description: `Tanggal ${conflictingDates.join(', ')} sudah digunakan. Silakan pilih tanggal lain`,
          variant: "destructive"
        });
        return;
      }

      tanggalStrings.forEach(tanggal => {
        const blockKey = generateBlockKey(tanggal, userRole, availableSlot);
        data.blocks[blockKey] = {
          kegiatan: kegiatanInput,
          role: userRole,
          kegiatanIndex: availableSlot
        };
      });

      const currentPJ = data.penanggungJawab.split(',').map(pj => pj.trim());
      if (!currentPJ.includes(userRole)) {
        currentPJ.push(userRole);
      }
      data.penanggungJawab = currentPJ.filter(pj => pj).join(', ');

      await saveToSpreadsheet(data, 'update', availableSlot, kegiatanInput);

      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setSelectedDates([]);
      setSelectedDataForDates(null);
      
      toast({
        title: "Sukses",
        description: "Tanggal berhasil disimpan"
      });
    } catch (error: any) {
      newData[dataIndex] = originalData;
      setDataRows([...newData]);
      
      toast({
        title: "Error",
        description: "Gagal menyimpan tanggal: " + error.message,
        variant: "destructive"
      });
    }
  };

  const getBlockedDatesCount = (data: DataRow) => {
    return Object.keys(data.blocks).length;
  };

  const getAllKegiatanFormatted = (data: DataRow) => {
    const allKegiatan: { kegiatan: string; role: string; dates: string[] }[] = [];
    
    Object.entries(ROLE_MAPPING).forEach(([role]) => {
      const roleKegiatan = getKegiatanByRole(data, role);
      roleKegiatan.forEach(kegiatan => {
        allKegiatan.push({
          kegiatan: kegiatan.kegiatan,
          role: role,
          dates: kegiatan.dates
        });
      });
    });

    return allKegiatan;
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
          <h1 className="text-3xl font-bold text-red-500">Block Tanggal Perjalanan Dinas</h1>
          <p className="text-muted-foreground mt-2">
            Sistem tagging tanggal perjalanan dinas untuk organik BPS dan Mitra Statistik Kabupaten Majalengka
          </p>
          <div className="flex items-center gap-2 mt-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Login sebagai: <strong className="text-primary">{userRole}</strong></span>
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
              {bulanOptions.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tahun.toString()} onValueChange={value => setTahun(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              {tahunOptions.map(t => (
                <SelectItem key={t} value={t.toString()}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {canUserTag && (
        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-primary" />
              Tambah Data
            </CardTitle>
            <CardDescription className="text-sm">
              Isi nama kegiatan dan pilih organik atau mitra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Nama Kegiatan
                <span className="text-destructive">*</span>
              </label>
              <Input 
                value={kegiatanInput} 
                onChange={e => setKegiatanInput(e.target.value)} 
                placeholder="Masukkan nama kegiatan..." 
                className="w-full" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tambah Organik</label>
                <Combobox 
                  options={filteredAvailableOrganik.map(org => ({
                    value: org.nama,
                    label: `${org.nama} - ${org.nip}`
                  }))}
                  value={selectedOrganik}
                  onValueChange={setSelectedOrganik}
                  placeholder="Pilih organik..."
                  searchPlaceholder="Cari organik..."
                  emptyText="Tidak ada organik tersedia"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tambah Mitra</label>
                <Combobox 
                  options={filteredAvailableMitra.map(mitra => ({
                    value: mitra.nama,
                    label: `${mitra.nama} - ${mitra.kecamatan}`
                  }))}
                  value={selectedMitra}
                  onValueChange={setSelectedMitra}
                  placeholder="Pilih mitra..."
                  searchPlaceholder="Cari mitra..."
                  emptyText="Tidak ada mitra tersedia"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button 
                onClick={addOrganik} 
                disabled={!selectedOrganik || !kegiatanInput.trim()} 
                className="flex-1" 
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Organik
              </Button>
              <Button 
                onClick={addMitra} 
                disabled={!selectedMitra || !kegiatanInput.trim()} 
                className="flex-1" 
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Mitra
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Kegiatan akan disimpan di kolom <strong className={ROLE_MAPPING[userRole as keyof typeof ROLE_MAPPING]?.color}>{userRole}</strong>
            </p>
          </CardContent>
        </Card>
      )}

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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>
              Daftar Perjalanan Dinas - <span className="text-primary">{bulan}</span> <span className="text-primary">{tahun}</span>
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
                  <TableHead className="min-w-80">Kegiatan</TableHead>
                  <TableHead className="text-center min-w-20">Jumlah</TableHead>
                  {canUserTag && <TableHead className="text-center min-w-40">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataRows.map((data, index) => {
                  const canEditThisData = canUserEditData(data);
                  const userKegiatan = getKegiatanByRole(data, userRole);
                  const availableSlot = getAvailableKegiatanSlot(data, userRole);
                  const allKegiatan = getAllKegiatanFormatted(data);
                  
                  return (
                    <TableRow key={`${data.nik}-${data.isOrganik}`}>
                      <TableCell className="text-center font-medium">
                        {data.no}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {data.isOrganik ? (
                            <Building2 className="h-4 w-4 text-primary" />
                          ) : (
                            <MapPin className="h-4 w-4 text-primary" />
                          )}
                          <div>
                            <div className="font-medium">
                              {data.nama}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {data.isOrganik 
                                ? `NIP: ${organikList.find(org => org.nama === data.nama)?.nip || data.nik}`
                                : `NIK: ${mitraList.find(mitra => mitra.nama === data.nama)?.nik || data.nik}`
                              }
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {data.kecamatan}
                      </TableCell>
<TableCell>
  <div className="max-w-[380px]">
    {allKegiatan.length > 0 ? (
      <div className="space-y-1">
        {/* Tampilkan maksimal 2 kegiatan */}
        {allKegiatan.slice(0, 2).map((item, idx) => {
          const mapping = ROLE_MAPPING[item.role as keyof typeof ROLE_MAPPING];
          const shortName = {
            'Pejabat Pembuat Komitmen': 'PPK',
            'Fungsi Sosial': 'Sosial',
            'Fungsi Neraca': 'Neraca',
            'Fungsi Produksi': 'Produksi',
            'Fungsi Distribusi': 'Distribusi',
            'Fungsi IPDS': 'IPDS'
          }[item.role] || item.role.substring(0, 3).toUpperCase();

          return (
            <TooltipProvider key={idx}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-1 cursor-default select-none ${mapping?.bgColor || 'bg-gray-100'} ${mapping?.borderColor ? 'border' : 'border border-transparent'}`}
                  >
                    <span className={`font-bold ${mapping?.color || 'text-gray-700'}`}>
                      [{shortName}]
                    </span>
                    <span className="truncate max-w-[160px]" title={item.kegiatan}>
                      {item.kegiatan}
                    </span>
                    <span className="text-gray-500">
                      ({item.dates.join(', ')})
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-white border border-gray-200 shadow-lg p-3 max-w-xs">
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold text-gray-900">
                      {item.kegiatan}
                    </div>
                    <div className="text-xs text-gray-600">
                      Role: <span className="font-medium">{item.role}</span>
                    </div>
                    <div className="text-xs font-medium text-green-600">
                      Tanggal: {item.dates.join(', ')}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* Badge +X jika lebih dari 2 */}
        {allKegiatan.length > 2 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs font-medium text-primary hover:bg-primary/10"
              >
                +{allKegiatan.length - 2} lainnya
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <p className="font-semibold text-sm mb-2">Semua Kegiatan:</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto text-xs">
                {allKegiatan.map((item, idx) => {
                  const mapping = ROLE_MAPPING[item.role as keyof typeof ROLE_MAPPING];
                  const shortName = {
                    'Pejabat Pembuat Komitmen': 'PPK',
                    'Fungsi Sosial': 'Sosial',
                    'Fungsi Neraca': 'Neraca',
                    'Fungsi Produksi': 'Produksi',
                    'Fungsi Distribusi': 'Distribusi',
                    'Fungsi IPDS': 'IPDS'
                  }[item.role] || item.role.substring(0, 3).toUpperCase();

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-1.5 rounded px-2 py-1 ${mapping?.bgColor || 'bg-gray-50'}`}
                    >
                      <span className={`font-bold ${mapping?.color || 'text-gray-700'}`}>
                        [{shortName}]
                      </span>
                      <span className="font-medium truncate flex-1" title={item.kegiatan}>
                        {item.kegiatan}
                      </span>
                      <span className="text-gray-500">
                        ({item.dates.join(', ')})
                      </span>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    )}
  </div>
</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-full">
                          {getBlockedDatesCount(data)}
                        </span>
                      </TableCell>
                      {canUserTag && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8" 
                                        onClick={() => openDatePicker(index)}
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-4" align="start">
                                      <div className="space-y-4">
                                        <div className="text-sm font-medium">
                                          {availableSlot !== -1 ? "Tambah Kegiatan untuk" : "Tambah Tanggal untuk"} {data.nama}
                                        </div>
                                        <CalendarComponent 
                                          mode="multiple" 
                                          selected={selectedDates} 
                                          onSelect={setSelectedDates} 
                                          className="rounded-md border" 
                                          locale={id} 
                                          month={new Date(tahun, bulanOptions.indexOf(bulan))}
                                        />
                                        <Input 
                                          placeholder="Nama kegiatan" 
                                          value={kegiatanInput} 
                                          onChange={e => setKegiatanInput(e.target.value)} 
                                        />
                                        <div className="text-xs text-muted-foreground">
                                          Tanggal terpilih: {selectedDates.filter(isDateInSelectedMonth).map(d => d.getDate()).join(', ')}
                                          {availableSlot !== -1 && ` | Slot tersedia: ${availableSlot + 1}`}
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
                                  <p>Tambah Kegiatan/Tanggal</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {userKegiatan.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-8 w-8" 
                                      onClick={() => openEditModal(index)}
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

                            {canEditThisData && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-8 w-8" 
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
                            )}
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

      {dataToEdit && (
        <EditTanggalModal 
          isOpen={showEditModal} 
          onClose={() => {
            setShowEditModal(false);
            setDataToEdit(null);
          }} 
          data={dataToEdit} 
          onSave={handleEditSave} 
        />
      )}

      {dataToEdit && (
        <TambahKegiatanModal 
          isOpen={showTambahKegiatanModal} 
          onClose={() => {
            setShowTambahKegiatanModal(false);
            setDataToEdit(null);
          }} 
          data={dataToEdit} 
          onSave={handleTambahKegiatan} 
        />
      )}

      <Dialog open={showDeleteDataDialog} onOpenChange={setShowDeleteDataDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Hapus Kegiatan
            </DialogTitle>
            <DialogDescription>
              Pilih kegiatan yang ingin dihapus untuk {dataToDelete !== null && dataRows[dataToDelete]?.nama}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {kegiatanToDelete.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Pilih Kegiatan:</label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={selectAllKegiatan}
                    className="text-xs"
                  >
                    {kegiatanToDelete.every(item => item.selected) ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </Button>
                </div>
                
                <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2">
                  {kegiatanToDelete.map((kegiatan, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={kegiatan.selected}
                        onChange={() => toggleKegiatanSelection(index)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {kegiatan.kegiatan}
                        </div>
                        <div className="text-xs text-gray-500">
                          Slot {kegiatan.index + 1} - Tanggal: {kegiatan.dates.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground">
                  • Dipilih: {kegiatanToDelete.filter(item => item.selected).length} dari {kegiatanToDelete.length} kegiatan
                  <br />
                  • {kegiatanToDelete.filter(item => item.selected).length === kegiatanToDelete.length 
                    ? "Seluruh data akan dihapus dari sistem" 
                    : "Hanya kegiatan terpilih yang akan dihapus"}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteDataDialog(false);
              setKegiatanToDelete([]);
            }}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteData}
              disabled={kegiatanToDelete.filter(item => item.selected).length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus ({kegiatanToDelete.filter(item => item.selected).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}