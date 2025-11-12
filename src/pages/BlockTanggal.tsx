"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox"; // PERBAIKAN: Import Checkbox dari shadcn/ui
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Trash2, Building2, MapPin, Edit, Save, FileText, Ban, UserCheck, AlertCircle, Check } from "lucide-react";
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

const SPREADSHEET_ID = "14iyeMPMvlBLlM-JKDDnlPgnx6WGS_U8yOZyMTIu-rn0";
const MASTER_MITRA_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const bulanOptions = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tahunOptions = [2024, 2025, 2026];

// PERBAIKAN: Mapping role ke kolom spreadsheet - DIPERBAIKI untuk menghindari konflik kolom
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

// PERBAIKAN: Kolom khusus - DIPINDAH untuk menghindari konflik
const PENANGGUNG_JAWAB_COL = 126;
const TOTAL_TANGGAL_COL = 127;
const KECAMATAN_JABATAN_COL = 5;

const ALLOWED_ROLES = Object.keys(ROLE_MAPPING);
const DISABLED_ROLES = ['Bendahara', 'Pejabat Pengadaan'];

// Fungsi utility
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

// Komponen Modal Hapus Kegiatan (DIPERBAIKI)
function HapusKegiatanModal({
  isOpen,
  onClose,
  data,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  data: DataRow;
  onSave: (selectedKegiatanIndices: number[]) => void;
}) {
  const [selectedKegiatanIndices, setSelectedKegiatanIndices] = useState<number[]>([]);
  const { toast } = useToast();
  const userRole = localStorage.getItem("simaja_user") ? JSON.parse(localStorage.getItem("simaja_user")!).role : "";
  
  const userKegiatan = getKegiatanByRole(data, userRole);

  useEffect(() => {
    if (isOpen) {
      setSelectedKegiatanIndices([]);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (selectedKegiatanIndices.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu kegiatan untuk dihapus",
        variant: "destructive"
      });
      return;
    }
    
    onSave(selectedKegiatanIndices);
    onClose();
  };

  const toggleKegiatan = (index: number) => {
    setSelectedKegiatanIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectAll = () => {
    if (selectedKegiatanIndices.length === userKegiatan.length) {
      setSelectedKegiatanIndices([]);
    } else {
      setSelectedKegiatanIndices(userKegiatan.map(k => k.index));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Hapus Kegiatan untuk {data.nama}
          </DialogTitle>
          <DialogDescription>
            Pilih kegiatan yang ingin dihapus. Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {userKegiatan.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Tidak ada kegiatan untuk dihapus
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Pilih Kegiatan:</label>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedKegiatanIndices.length === userKegiatan.length ? "Batal Pilih Semua" : "Pilih Semua"}
                </Button>
              </div>
              
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {userKegiatan.map((kegiatan) => (
                  <div 
                    key={kegiatan.index}
                    className={`flex items-center gap-3 p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedKegiatanIndices.includes(kegiatan.index) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleKegiatan(kegiatan.index)}
                  >
                    {/* PERBAIKAN: Gunakan Checkbox dari shadcn/ui */}
                    <Checkbox 
                      checked={selectedKegiatanIndices.includes(kegiatan.index)}
                      onCheckedChange={() => toggleKegiatan(kegiatan.index)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{kegiatan.kegiatan}</div>
                      <div className="text-xs text-muted-foreground">
                        Tanggal: {kegiatan.dates.join(', ')} | Slot {kegiatan.index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Terpilih: {selectedKegiatanIndices.length} dari {userKegiatan.length} kegiatan
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSave} 
            disabled={selectedKegiatanIndices.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus {selectedKegiatanIndices.length > 0 ? `(${selectedKegiatanIndices.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Komponen Modal Edit Tanggal (DIPERBAIKI)
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
        // PERBAIKAN: Otomatis isi dengan nama kegiatan yang sebenarnya
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
                  // PERBAIKAN: Otomatis isi dengan nama kegiatan yang sebenarnya
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

// Komponen Modal Tambah Kegiatan/Tanggal (DIGABUNG)
function TambahKegiatanModal({
  isOpen,
  onClose,
  data,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  data: DataRow;
  onSave: (selectedDates: Date[], kegiatan: string, kegiatanIndex: number, isNewKegiatan: boolean) => void;
}) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [kegiatanInput, setKegiatanInput] = useState("");
  const [selectedKegiatanIndex, setSelectedKegiatanIndex] = useState<number>(-1);
  const [isNewKegiatan, setIsNewKegiatan] = useState(true);
  const { toast } = useToast();
  const userRole = localStorage.getItem("simaja_user") ? JSON.parse(localStorage.getItem("simaja_user")!).role : "";
  const bulan = new Date().toLocaleString('id-ID', { month: 'long' });
  const tahun = new Date().getFullYear();

  const userKegiatan = getKegiatanByRole(data, userRole);
  const availableSlot = getAvailableKegiatanSlot(data, userRole);

  useEffect(() => {
    if (isOpen) {
      setSelectedDates([]);
      setKegiatanInput("");
      setSelectedKegiatanIndex(-1);
      setIsNewKegiatan(true);
    }
  }, [isOpen]);

  const isDateInSelectedMonth = (date: Date) => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return isSameMonth(date, new Date(tahun, monthIndex)) && isSameYear(date, new Date(tahun, monthIndex));
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

    let kegiatanIndexToUse: number;
    
    if (isNewKegiatan) {
      if (availableSlot === -1) {
        toast({
          title: "Error",
          description: "Anda sudah mencapai batas maksimal kegiatan untuk bulan ini",
          variant: "destructive"
        });
        return;
      }
      kegiatanIndexToUse = availableSlot;
    } else {
      if (selectedKegiatanIndex === -1) {
        toast({
          title: "Error",
          description: "Pilih kegiatan yang akan ditambahi tanggal",
          variant: "destructive"
        });
        return;
      }
      kegiatanIndexToUse = selectedKegiatanIndex;
    }
    
    onSave(filteredDates, kegiatanInput, kegiatanIndexToUse, isNewKegiatan);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Tambah Kegiatan/Tanggal untuk {data.nama}
          </DialogTitle>
          <DialogDescription>
            {availableSlot !== -1 ? "Tambah kegiatan baru atau tambah tanggal ke kegiatan yang sudah ada" : "Tambah tanggal ke kegiatan yang sudah ada"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {availableSlot !== -1 && (
            <div>
              <label className="text-sm font-medium">Jenis Penambahan</label>
              <Select 
                value={isNewKegiatan ? "new" : "existing"} 
                onValueChange={(value) => setIsNewKegiatan(value === "new")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Kegiatan Baru</SelectItem>
                  <SelectItem value="existing">Tambah Tanggal ke Kegiatan Existing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!isNewKegiatan && userKegiatan.length > 0 && (
            <div>
              <label className="text-sm font-medium">Pilih Kegiatan Existing</label>
              <Select 
                value={selectedKegiatanIndex.toString()} 
                onValueChange={(value) => {
                  const index = parseInt(value);
                  setSelectedKegiatanIndex(index);
                  const selectedKegiatan = userKegiatan.find(k => k.index === index);
                  if (selectedKegiatan) {
                    setKegiatanInput(selectedKegiatan.kegiatan);
                  }
                }}
              >
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
            <label className="text-sm font-medium">
              {isNewKegiatan ? "Nama Kegiatan Baru" : "Nama Kegiatan"}
            </label>
            <Input 
              value={kegiatanInput} 
              onChange={e => setKegiatanInput(e.target.value)} 
              placeholder={isNewKegiatan ? "Masukkan nama kegiatan baru" : "Nama kegiatan"} 
              className="mt-1" 
              disabled={!isNewKegiatan && selectedKegiatanIndex !== -1}
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
              {isNewKegiatan && availableSlot !== -1 && ` | Slot tersedia: ${availableSlot + 1}`}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" />
            {isNewKegiatan ? 'Tambah Kegiatan' : 'Tambah Tanggal'}
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
  const [showDeleteKegiatanDialog, setShowDeleteKegiatanDialog] = useState(false);
  const [dataToDelete, setDataToDelete] = useState<number | null>(null);
  const [selectedDataForDates, setSelectedDataForDates] = useState<number | null>(null);
  const [searchTermMitra, setSearchTermMitra] = useState("");
  const [searchTermOrganik, setSearchTermOrganik] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTambahKegiatanModal, setShowTambahKegiatanModal] = useState(false);
  const [dataToEdit, setDataToEdit] = useState<DataRow | null>(null);
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

      // PERBAIKAN: Cek duplikasi berdasarkan nama + nik + isOrganik
      const existingIndex = newDataRows.findIndex(item => 
        item.nama === nama && 
        item.nik === nik && 
        item.isOrganik === isOrganik
      );

      const blocks: BlockData = {};
      
      // PERBAIKAN: Hapus kegiatanText karena tidak digunakan dengan benar
      // Kita akan reconstruct kegiatan dari blocks saja

      // Process semua role dan slot kegiatan
      Object.entries(ROLE_MAPPING).forEach(([role, mapping]) => {
        for (let kegiatanIndex = 0; kegiatanIndex < mapping.maxKegiatan; kegiatanIndex++) {
          const kegiatanCol = mapping.kegiatanCols[kegiatanIndex] - 1;
          const tanggalCol = mapping.tanggalCols[kegiatanIndex] - 1;
          
          if (kegiatanCol < row.length && tanggalCol < row.length) {
            const kegiatan = row[kegiatanCol] || "";
            const tanggal = row[tanggalCol] || "";

            if (kegiatan && tanggal) {
              // Process multiple tanggal (dipisah koma)
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
            }
          }
        }
      });

      if (existingIndex === -1) {
        // PERBAIKAN: Buat data baru tanpa menggabungkan
        newDataRows.push({
          no: newDataRows.length + 1,
          nama,
          nik,
          kecamatan: kecamatanJabatan,
          // PERBAIKAN: Kosongkan field kegiatan karena kita akan reconstruct dari blocks
          kegiatan: "",
          penanggungJawab,
          blocks,
          isOrganik,
          spreadsheetRowIndex: rowIndex + 2
        });
      } else {
        // PERBAIKAN: Jika ada duplikat, timpa saja dengan data terbaru
        // Jangan merge karena menyebabkan duplikasi
        newDataRows[existingIndex] = {
          ...newDataRows[existingIndex],
          blocks: { ...blocks }, // Timpa blocks dengan data terbaru
          penanggungJawab // Timpa penanggung jawab dengan data terbaru
        };
      }
    });

    // PERBAIKAN: Reconstruct kegiatan text dari blocks untuk semua data
    newDataRows.forEach(data => {
      const kegiatanMap = new Map<string, string>();
      
      Object.values(data.blocks).forEach(block => {
        const key = `${block.kegiatan}-${block.role}`;
        if (!kegiatanMap.has(key)) {
          kegiatanMap.set(key, `${block.kegiatan} (${block.role})`);
        }
      });
      
      data.kegiatan = Array.from(kegiatanMap.values()).join(' | ');
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

  // PERBAIKAN: Fungsi save yang diperbaiki untuk menghindari konflik kolom
  const saveToSpreadsheet = async (data: DataRow, operation: 'create' | 'update' | 'delete', kegiatanIndex: number = 0) => {
    try {
      if (!canUserTag && operation !== 'delete') {
        throw new Error(`Role ${userRole} tidak diperbolehkan melakukan block tanggal`);
      }

      const roleMapping = ROLE_MAPPING[userRole as keyof typeof ROLE_MAPPING];
      if (!roleMapping && operation !== 'delete') {
        throw new Error(`Role ${userRole} tidak memiliki mapping kolom yang valid`);
      }

      // Baca data existing
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

      // PERBAIKAN: Pastikan data dasar selalu disimpan dengan benar
      if (operation === 'create') {
        rowData[0] = data.no.toString();
        rowData[1] = tahun.toString();
        rowData[2] = bulan;
        rowData[3] = data.nama;
        rowData[4] = data.nik;
        // PERBAIKAN: Simpan Jabatan/Kecamatan di kolom yang benar
        rowData[KECAMATAN_JABATAN_COL - 1] = data.kecamatan;
      }

      if (operation !== 'delete' && roleMapping) {
        if (kegiatanIndex < 0 || kegiatanIndex >= roleMapping.maxKegiatan) {
          throw new Error(`Kegiatan index ${kegiatanIndex} tidak valid untuk role ${userRole}`);
        }

        const kegiatanCol = roleMapping.kegiatanCols[kegiatanIndex] - 1;
        const tanggalCol = roleMapping.tanggalCols[kegiatanIndex] - 1;

        // PERBAIKAN: Pastikan tidak menimpa kolom NIP/NIK (kolom 4)
        if (kegiatanCol === 4) {
          throw new Error(`Konflik kolom: kegiatanCol tidak boleh sama dengan kolom NIP/NIK`);
        }

        // Update kegiatan
        rowData[kegiatanCol] = kegiatanInput || data.kegiatan;

        // Ambil tanggal hanya untuk kegiatan index ini dan role ini
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

      // Update penanggung jawab
      let penanggungJawab = rowData[PENANGGUNG_JAWAB_COL - 1] || data.penanggungJawab;
      if (operation !== 'delete') {
        const currentPJ = penanggungJawab.split(',').map(pj => pj.trim()).filter(pj => pj);
        if (!currentPJ.includes(userRole)) {
          currentPJ.push(userRole);
        }
        penanggungJawab = currentPJ.filter(pj => pj).join(', ');
      }
      rowData[PENANGGUNG_JAWAB_COL - 1] = penanggungJawab;

      // Update jumlah total tanggal terpakai
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

  const deleteKegiatan = async (data: DataRow, kegiatanIndices: number[]) => {
    try {
      if (!canUserTag) {
        throw new Error(`Role ${userRole} tidak diperbolehkan melakukan delete`);
      }

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

      // Hapus data untuk setiap kegiatan index yang dipilih
      kegiatanIndices.forEach(kegiatanIndex => {
        const kegiatanCol = roleMapping.kegiatanCols[kegiatanIndex] - 1;
        const tanggalCol = roleMapping.tanggalCols[kegiatanIndex] - 1;
        
        if (kegiatanCol < rowData.length) rowData[kegiatanCol] = "";
        if (tanggalCol < rowData.length) rowData[tanggalCol] = "";
      });

      // Update jumlah tanggal terpakai
      const remainingBlocks = Object.keys(data.blocks).filter(key => {
        const block = data.blocks[key];
        return !(block.role === userRole && kegiatanIndices.includes(block.kegiatanIndex));
      }).length;
      rowData[TOTAL_TANGGAL_COL - 1] = remainingBlocks.toString();

      // Hapus user role dari penanggung jawab jika semua kegiatan dihapus
      const remainingUserKegiatan = getKegiatanByRole(data, userRole).filter(k => 
        !kegiatanIndices.includes(k.index)
      );
      
      let penanggungJawab = rowData[PENANGGUNG_JAWAB_COL - 1] || "";
      if (remainingUserKegiatan.length === 0) {
        const currentPJ = penanggungJawab.split(',').map(pj => pj.trim()).filter(pj => pj && pj !== userRole);
        penanggungJawab = currentPJ.join(', ');
      }
      rowData[PENANGGUNG_JAWAB_COL - 1] = penanggungJawab;

      // Update spreadsheet
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
        throw new Error(result.error.message || `Gagal delete kegiatan`);
      }

      return 'update';
    } catch (error: any) {
      console.error('❌ Error in deleteKegiatan:', error);
      throw error;
    }
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
      // PERBAIKAN: Simpan kecamatan untuk mitra
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
      // PERBAIKAN: Simpan jabatan untuk organik
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

  const requestDeleteKegiatan = (dataIndex: number) => {
    const data = dataRows[dataIndex];
    if (!canUserEditData(data)) {
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki akses untuk menghapus data ini",
        variant: "destructive"
      });
      return;
    }

    setDataToDelete(dataIndex);
    setShowDeleteKegiatanDialog(true);
  };

  const handleDeleteKegiatan = async (kegiatanIndices: number[]) => {
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

    try {
      await deleteKegiatan(data, kegiatanIndices);
      
      // Reload data untuk update tampilan
      await loadExistingData();
      
      toast({
        title: "Sukses",
        description: `${kegiatanIndices.length} kegiatan berhasil dihapus`
      });

      setShowDeleteKegiatanDialog(false);
      setDataToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menghapus kegiatan: " + error.message,
        variant: "destructive"
      });
    }
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

      // Hapus semua tanggal untuk kegiatan index ini
      Object.keys(data.blocks).forEach(key => {
        const block = data.blocks[key];
        const { kegiatanIndex: existingIndex } = parseBlockKey(key);
        if (block.role === userRole && existingIndex === kegiatanIndex) {
          delete data.blocks[key];
        }
      });

      // Tambahkan tanggal baru
      tanggalStrings.forEach(tanggal => {
        const blockKey = generateBlockKey(tanggal, userRole, kegiatanIndex);
        data.blocks[blockKey] = {
          kegiatan: kegiatan,
          role: userRole,
          kegiatanIndex: kegiatanIndex
        };
      });

      await saveToSpreadsheet(data, 'update', kegiatanIndex);
      
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

  const handleTambahKegiatan = async (selectedDates: Date[], kegiatan: string, kegiatanIndex: number, isNewKegiatan: boolean) => {
    if (!dataToEdit) return;

    const newData = [...dataRows];
    const dataIndex = dataRows.findIndex(d => d.nik === dataToEdit.nik && d.isOrganik === dataToEdit.isOrganik);
    if (dataIndex === -1) return;

    const data = newData[dataIndex];
    const originalData = { ...data, blocks: { ...data.blocks } };

    try {
      const monthIndex = bulanOptions.indexOf(bulan);
      const tanggalStrings = selectedDates.map(date => date.getDate().toString());

      if (isNewKegiatan) {
        // Untuk kegiatan baru, tambahkan semua tanggal
        tanggalStrings.forEach(tanggal => {
          const blockKey = generateBlockKey(tanggal, userRole, kegiatanIndex);
          data.blocks[blockKey] = {
            kegiatan: kegiatan,
            role: userRole,
            kegiatanIndex: kegiatanIndex
          };
        });
      } else {
        // Untuk tambah tanggal ke existing, hanya tambahkan tanggal yang belum ada
        const existingDates = new Set(
          Object.keys(data.blocks)
            .filter(key => {
              const block = data.blocks[key];
              return block.role === userRole && block.kegiatanIndex === kegiatanIndex;
            })
            .map(key => parseBlockKey(key).tanggal)
        );

        tanggalStrings.forEach(tanggal => {
          if (!existingDates.has(tanggal)) {
            const blockKey = generateBlockKey(tanggal, userRole, kegiatanIndex);
            data.blocks[blockKey] = {
              kegiatan: kegiatan,
              role: userRole,
              kegiatanIndex: kegiatanIndex
            };
          }
        });
      }

      await saveToSpreadsheet(data, 'update', kegiatanIndex);
      
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setShowTambahKegiatanModal(false);
      setDataToEdit(null);
      
      toast({
        title: "Sukses",
        description: isNewKegiatan ? "Kegiatan baru berhasil ditambahkan" : "Tanggal berhasil ditambahkan ke kegiatan"
      });
    } catch (error: any) {
      newData[dataIndex] = originalData;
      setDataRows([...newData]);
      
      toast({
        title: "Error",
        description: "Gagal menambah: " + error.message,
        variant: "destructive"
      });
    }
  };

  const isDateInSelectedMonth = (date: Date) => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return isSameMonth(date, new Date(tahun, monthIndex)) && isSameYear(date, new Date(tahun, monthIndex));
  };

  const getBlockedDatesCount = (data: DataRow) => {
    return Object.keys(data.blocks).length;
  };

  const getKegiatanColor = (role: string): string => {
    const mapping = ROLE_MAPPING[role as keyof typeof ROLE_MAPPING];
    return mapping?.color || 'text-gray-600';
  };

  const getKegiatanBgColor = (role: string): string => {
    const mapping = ROLE_MAPPING[role as keyof typeof ROLE_MAPPING];
    return mapping?.bgColor || 'bg-gray-100';
  };

  const getKegiatanBorderColor = (role: string): string => {
    const mapping = ROLE_MAPPING[role as keyof typeof ROLE_MAPPING];
    return mapping?.borderColor || 'border-gray-200';
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
                              {data.isOrganik ? `NIP: ${data.nik}` : `NIK: ${data.nik}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* PERBAIKAN: Tampilkan Jabatan/Kecamatan yang benar */}
                        {data.kecamatan || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[600px]">
                          {allKegiatan.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                              {allKegiatan.map((item, idx) => {
                                const mapping = ROLE_MAPPING[item.role as keyof typeof ROLE_MAPPING];
                                return (
                                  <div key={idx} className={`p-2 rounded-lg border ${mapping?.borderColor || 'border-gray-200'} ${mapping?.bgColor || 'bg-gray-100'}`}>
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium break-words text-gray-800">
                                        {item.kegiatan}
                                      </div>
                                      <div className={`text-xs font-medium ${mapping?.color || 'text-gray-600'}`}>
                                        {item.role} - Tanggal: {item.dates.join(', ')}
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
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-full">
                          {getBlockedDatesCount(data)}
                        </span>
                      </TableCell>
                      {canUserTag && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* PERBAIKAN: Hanya 1 tombol tambah */}
                            {canEditThisData && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-8 w-8" 
                                      onClick={() => openTambahKegiatanModal(index)}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Tambah Kegiatan/Tanggal</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {/* Tombol Edit */}
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

                            {/* Tombol Hapus */}
                            {canEditThisData && userKegiatan.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-8 w-8" 
                                      onClick={() => requestDeleteKegiatan(index)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Hapus Kegiatan</p>
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

      {dataToDelete !== null && (
        <HapusKegiatanModal 
          isOpen={showDeleteKegiatanDialog} 
          onClose={() => {
            setShowDeleteKegiatanDialog(false);
            setDataToDelete(null);
          }} 
          data={dataRows[dataToDelete]} 
          onSave={handleDeleteKegiatan} 
        />
      )}
    </div>
  );
}