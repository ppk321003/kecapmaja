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
import { Calendar, Plus, Trash2, Building2, MapPin, Edit, Save, FileText, Ban, UserCheck, AlertCircle } from "lucide-react";
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

const bulanOptions = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const tahunOptions = [2024, 2025, 2026];

const ROLE_MAPPING = {
  'Pejabat Pembuat Komitmen': { 
    kegiatanCol: 5,
    tanggalCol: 11,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200'
  },
  'Fungsi Neraca': { 
    kegiatanCol: 6,
    tanggalCol: 12,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200'
  },
  'Fungsi Distribusi': { 
    kegiatanCol: 7,
    tanggalCol: 13,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200'
  },
  'Fungsi Produksi': { 
    kegiatanCol: 8,
    tanggalCol: 14,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200'
  },
  'Fungsi Sosial': { 
    kegiatanCol: 9,
    tanggalCol: 15,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  },
  'Fungsi IPDS': { 
    kegiatanCol: 10,
    tanggalCol: 16,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200'
  },
};

const ALLOWED_ROLES = Object.keys(ROLE_MAPPING);
const DISABLED_ROLES = ['Bendahara', 'Pejabat Pengadaan'];

function EditTanggalModal({ 
  isOpen, 
  onClose, 
  data, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  data: DataRow; 
  onSave: (selectedDates: Date[], kegiatan: string) => void; 
}) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [kegiatanInput, setKegiatanInput] = useState("");
  const { toast } = useToast();

  const bulan = new Date().toLocaleString('id-ID', { month: 'long' });
  const tahun = new Date().getFullYear();

  useEffect(() => {
    if (isOpen) {
      const monthIndex = bulanOptions.indexOf(bulan);
      const userRole = localStorage.getItem("simaja_user") ? JSON.parse(localStorage.getItem("simaja_user")!).role : "";
      
      const datesForUserRole = Object.keys(data.blocks)
        .filter(tanggal => data.blocks[tanggal].role === userRole)
        .map(tanggal => new Date(tahun, monthIndex, parseInt(tanggal)))
        .filter(date => isSameMonth(date, new Date(tahun, monthIndex)));
      
      setSelectedDates(datesForUserRole);
      
      const userRoleKegiatan = Object.values(data.blocks)
        .find(block => block.role === userRole)?.kegiatan || "";
      setKegiatanInput(userRoleKegiatan);
    }
  }, [isOpen, data, bulan, tahun]);

  const isDateInSelectedMonth = (date: Date) => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return isSameMonth(date, new Date(tahun, monthIndex)) && 
           isSameYear(date, new Date(tahun, monthIndex));
  };

  const getBlockedByOtherRoles = (): Date[] => {
    const monthIndex = bulanOptions.indexOf(bulan);
    const userRole = localStorage.getItem("simaja_user") ? JSON.parse(localStorage.getItem("simaja_user")!).role : "";
    
    const blockedDates: Date[] = [];
    
    Object.keys(data.blocks).forEach(tanggal => {
      const block = data.blocks[tanggal];
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

    onSave(filteredDates, kegiatanInput);
    onClose();
  };

  const blockedByOthers = getBlockedByOtherRoles();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Tanggal untuk {data.nama}
          </DialogTitle>
          <DialogDescription>
            Edit tanggal yang Anda miliki. Tanggal yang sudah di-block oleh role lain tidak dapat diubah.
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
            <label className="text-sm font-medium">Pilih atau Batalkan Tanggal Anda</label>
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
              • Klik tanggal untuk memilih/membatalkan (hanya tanggal Anda)
              <br/>
              • Tanggal abu-abu sudah di-block oleh role lain dan tidak dapat diubah
              <br/>
              • Tanggal terpilih: {selectedDates.filter(isDateInSelectedMonth).map(d => d.getDate()).join(', ')}
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
        const penanggungJawab = row[17] || "";

        const isOrganik = organikList.some(org => org.nama === nama);
        
        const existingIndex = newDataRows.findIndex(item => 
          item.nama === nama && item.nik === nik
        );

        const blocks: BlockData = {};
        let kegiatanText = "";

        Object.entries(ROLE_MAPPING).forEach(([role, mapping]) => {
          const kegiatan = row[mapping.kegiatanCol] || "";
          const tanggal = row[mapping.tanggalCol] || "";

          if (kegiatan && tanggal) {
            tanggal.split(',').forEach((t: string) => {
              const trimmedT = t.trim();
              if (trimmedT) {
                blocks[trimmedT] = {
                  kegiatan: kegiatan,
                  role: role
                };
              }
            });

            if (kegiatanText) {
              kegiatanText += " | ";
            }
            kegiatanText += kegiatan;
          }
        });

        if (existingIndex === -1) {
          newDataRows.push({
            no: newDataRows.length + 1,
            nama,
            nik,
            kecamatan: isOrganik ? 
              organikList.find(org => org.nama === nama)?.jabatan || "" : 
              mitraList.find(m => m.nik === nik)?.kecamatan || "",
            kegiatan: kegiatanText,
            penanggungJawab,
            blocks,
            isOrganik,
            spreadsheetRowIndex: rowIndex + 2
          });
        } else {
          Object.entries(blocks).forEach(([tanggal, blockData]) => {
            newDataRows[existingIndex].blocks[tanggal] = blockData;
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

  const saveEditToSpreadsheet = async (data: DataRow, kegiatan: string, tanggalStrings: string[]) => {
    try {
      if (!canUserTag) {
        throw new Error(`Role ${userRole} tidak diperbolehkan melakukan block tanggal`);
      }

      const roleMapping = ROLE_MAPPING[userRole as keyof typeof ROLE_MAPPING];
      if (!roleMapping) {
        throw new Error(`Role ${userRole} tidak memiliki mapping kolom yang valid`);
      }

      const { data: existingData, error: readError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: `Sheet1!A${data.spreadsheetRowIndex}:S${data.spreadsheetRowIndex}`,
        },
      });

      let existingRow = new Array(19).fill("");
      if (!readError && existingData?.values?.[0]) {
        existingRow = [...existingData.values[0]];
        while (existingRow.length < 19) {
          existingRow.push("");
        }
      }

      const rowData = [...existingRow];

      rowData[roleMapping.kegiatanCol] = kegiatan;
      rowData[roleMapping.tanggalCol] = tanggalStrings.join(',');

      let penanggungJawab = rowData[17] || data.penanggungJawab;
      const currentPJ = penanggungJawab.split(',').map(pj => pj.trim()).filter(pj => pj);
      if (!currentPJ.includes(userRole)) {
        currentPJ.push(userRole);
      }
      penanggungJawab = currentPJ.join(', ');
      rowData[17] = penanggungJawab;

      const totalBlocks = Object.keys(data.blocks).length;
      rowData[18] = totalBlocks.toString();

      console.log('💾 Saving edit to spreadsheet:', { 
        rowData,
        userRole,
        kegiatan,
        tanggalStrings
      });

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
        throw new Error(result.error.message || `Gagal update data`);
      }

      return result?.data;
    } catch (error: any) {
      console.error('❌ Error saving edit to spreadsheet:', error);
      throw error;
    }
  };

  const saveToSpreadsheet = async (data: DataRow, operation: 'create' | 'update' | 'delete') => {
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
          range: `Sheet1!A${data.spreadsheetRowIndex}:S${data.spreadsheetRowIndex}`,
        },
      });

      let existingRow = new Array(19).fill("");
      if (!readError && existingData?.values?.[0]) {
        existingRow = [...existingData.values[0]];
        while (existingRow.length < 19) {
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
      }

      if (operation !== 'delete' && roleMapping) {
        if (!rowData[roleMapping.kegiatanCol] || rowData[roleMapping.kegiatanCol] === kegiatanInput) {
          rowData[roleMapping.kegiatanCol] = kegiatanInput || data.kegiatan;
        }
        
        const relevantDates = Object.keys(data.blocks)
          .filter(tanggal => {
            const block = data.blocks[tanggal];
            return block.role === userRole && block.kegiatan === (kegiatanInput || data.kegiatan);
          })
          .sort((a, b) => parseInt(a) - parseInt(b))
          .join(',');
        
        if (!rowData[roleMapping.tanggalCol] || rowData[roleMapping.tanggalCol] === relevantDates) {
          rowData[roleMapping.tanggalCol] = relevantDates;
        }
      }

      let penanggungJawab = rowData[17] || data.penanggungJawab;
      if (operation !== 'delete') {
        const currentPJ = penanggungJawab.split(',').map(pj => pj.trim()).filter(pj => pj);
        if (!currentPJ.includes(userRole)) {
          currentPJ.push(userRole);
        }
        penanggungJawab = currentPJ.join(', ');
      }
      rowData[17] = penanggungJawab;

      rowData[18] = Object.keys(data.blocks).length.toString();

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

  const deleteUserRoleData = async (data: DataRow) => {
    try {
      if (!canUserTag) {
        throw new Error(`Role ${userRole} tidak diperbolehkan melakukan delete`);
      }

      const rolesInData = new Set();
      Object.values(data.blocks).forEach(block => {
        rolesInData.add(block.role);
      });

      const isOnlyRole = rolesInData.size === 1 && rolesInData.has(userRole);

      if (isOnlyRole) {
        console.log('🗑️ Deleting entire row - user is the only role');
        await saveToSpreadsheet(data, 'delete');
        return 'delete';
      } else {
        console.log('🗑️ Deleting only user role data - multiple roles exist');

        const { data: existingData, error: readError } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "read",
            range: `Sheet1!A${data.spreadsheetRowIndex}:S${data.spreadsheetRowIndex}`,
          },
        });

        if (readError) throw readError;

        let existingRow = new Array(19).fill("");
        if (existingData?.values?.[0]) {
          existingRow = [...existingData.values[0]];
          while (existingRow.length < 19) {
            existingRow.push("");
          }
        }

        const rowData = [...existingRow];

        const roleMapping = ROLE_MAPPING[userRole as keyof typeof ROLE_MAPPING];
        if (roleMapping) {
          rowData[roleMapping.kegiatanCol] = "";
          rowData[roleMapping.tanggalCol] = "";
        }

        let penanggungJawab = rowData[17] || "";
        const currentPJ = penanggungJawab.split(',').map(pj => pj.trim()).filter(pj => pj && pj !== userRole);
        penanggungJawab = currentPJ.join(', ');
        rowData[17] = penanggungJawab;

        const remainingBlocks = Object.keys(data.blocks).filter(tanggal => 
          data.blocks[tanggal].role !== userRole
        ).length;
        rowData[18] = remainingBlocks.toString();

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
      }
    } catch (error: any) {
      console.error('❌ Error in deleteUserRoleData:', error);
      throw error;
    }
  };

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
    if (!selectedOrganik || !kegiatanInput.trim()) {
      toast({
        title: "Peringatan",
        description: "Pilih organik dan isi nama kegiatan",
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
    const data = dataRows[dataIndex];
    
    if (!canUserEditData(data)) {
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki akses untuk menghapus data ini",
        variant: "destructive",
      });
      return;
    }

    setDataToDelete(dataIndex);
    setShowDeleteDataDialog(true);
  };

  const deleteData = async () => {
    if (dataToDelete === null) return;

    const data = dataRows[dataToDelete];
    
    if (!canUserEditData(data)) {
      toast({
        title: "Akses Ditolak",
        description: "Anda tidak memiliki akses untuk menghapus data ini",
        variant: "destructive",
      });
      return;
    }
    
    try {
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
          description: "Data berhasil dihapus (seluruh baris)",
        });
      } else {
        await loadExistingData();
        toast({
          title: "Sukses",
          description: "Data role Anda berhasil dihapus",
        });
      }
      
      setShowDeleteDataDialog(false);
      setDataToDelete(null);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menghapus data: " + error.message,
        variant: "destructive",
      });
    }
  };

  const openDatePicker = (dataIndex: number) => {
    const data = dataRows[dataIndex];
    
    if (!canUserTag) {
      toast({
        title: "Akses Ditolak",
        description: `Role ${userRole} tidak diperbolehkan melakukan block tanggal`,
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    setDataToEdit(data);
    setShowEditModal(true);
  };

  const handleEditSave = async (selectedDates: Date[], kegiatan: string) => {
    if (!dataToEdit) return;

    const newData = [...dataRows];
    const dataIndex = dataRows.findIndex(d => d.nik === dataToEdit.nik && d.isOrganik === dataToEdit.isOrganik);
    
    if (dataIndex === -1) return;

    const data = newData[dataIndex];
    const originalData = { ...data, blocks: { ...data.blocks } };

    try {
      const monthIndex = bulanOptions.indexOf(bulan);
      const tanggalStrings = selectedDates.map(date => date.getDate().toString());

      Object.keys(data.blocks).forEach(tanggal => {
        if (data.blocks[tanggal].role === userRole) {
          delete data.blocks[tanggal];
        }
      });

      tanggalStrings.forEach(tanggal => {
        data.blocks[tanggal] = {
          kegiatan: kegiatan,
          role: userRole
        };
      });

      const kegiatanList = data.kegiatan.split(' | ').filter(k => {
        const isFromOtherRole = !Object.values(data.blocks).some(block => 
          block.kegiatan === k && block.role === userRole
        );
        return isFromOtherRole;
      });
      
      if (kegiatan && !kegiatanList.includes(kegiatan)) {
        kegiatanList.push(kegiatan);
      }
      data.kegiatan = kegiatanList.join(' | ');

      await saveEditToSpreadsheet(data, kegiatan, tanggalStrings);
      
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setShowEditModal(false);
      setDataToEdit(null);

      toast({
        title: "Sukses",
        description: "Tanggal berhasil diperbarui",
      });
    } catch (error: any) {
      newData[dataIndex] = originalData;
      setDataRows([...newData]);
      
      toast({
        title: "Error",
        description: "Gagal memperbarui tanggal: " + error.message,
        variant: "destructive",
      });
    }
  };

  const isDateInSelectedMonth = (date: Date) => {
    const monthIndex = bulanOptions.indexOf(bulan);
    return isSameMonth(date, new Date(tahun, monthIndex)) && 
           isSameYear(date, new Date(tahun, monthIndex));
  };

  const getBlockedDatesForCurrentUser = (currentDataIndex: number | null): Date[] => {
    if (currentDataIndex === null) return [];
    
    const monthIndex = bulanOptions.indexOf(bulan);
    const userBlockedDates: Date[] = [];
    const currentData = dataRows[currentDataIndex];
    
    if (!currentData) return [];

    Object.keys(currentData.blocks).forEach(tanggal => {
      const block = currentData.blocks[tanggal];
      if (block.role === userRole) {
        const date = new Date(tahun, monthIndex, parseInt(tanggal));
        if (isDateInSelectedMonth(date)) {
          userBlockedDates.push(date);
        }
      }
    });
    
    return userBlockedDates;
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

      const conflictingDates = [];
      for (const tanggal of tanggalStrings) {
        if (data.blocks[tanggal]) {
          conflictingDates.push(tanggal);
        }
      }

      if (conflictingDates.length > 0) {
        toast({
          title: "Konflik Tanggal",
          description: `Tanggal ${conflictingDates.join(', ')} sudah digunakan. Silakan pilih tanggal lain`,
          variant: "destructive",
        });
        return;
      }

      tanggalStrings.forEach(tanggal => {
        data.blocks[tanggal] = {
          kegiatan: kegiatanInput,
          role: userRole
        };
      });

      const existingKegiatanList = data.kegiatan.split(' | ').filter(k => k.trim() !== "");
      if (!existingKegiatanList.includes(kegiatanInput)) {
        existingKegiatanList.push(kegiatanInput);
      }
      data.kegiatan = existingKegiatanList.join(' | ');

      const currentPJ = data.penanggungJawab.split(',').map(pj => pj.trim());
      if (!currentPJ.includes(userRole)) {
        currentPJ.push(userRole);
      }
      data.penanggungJawab = currentPJ.filter(pj => pj).join(', ');

      await saveToSpreadsheet(data, 'update');
      
      const sortedData = sortData(newData);
      setDataRows(sortedData);
      setSelectedDates([]);
      setSelectedDataForDates(null);

      toast({
        title: "Sukses",
        description: "Tanggal berhasil disimpan",
      });
    } catch (error: any) {
      newData[dataIndex] = originalData;
      setDataRows([...newData]);
      
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

  const getUniqueKegiatanList = (data: DataRow): {kegiatan: string, role: string}[] => {
    const kegiatanMap = new Map();
    Object.values(data.blocks).forEach(block => {
      if (block.kegiatan.trim() !== "") {
        kegiatanMap.set(block.kegiatan, block.role);
      }
    });
    return Array.from(kegiatanMap, ([kegiatan, role]) => ({ kegiatan, role }));
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

      {/* PERBAIKAN BAGIAN TAMBAH DATA - LEBIH RESPONSIF */}
      {canUserTag && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Tambah Data
            </CardTitle>
            <CardDescription>
              Isi nama kegiatan dan pilih organik atau mitra
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Layout responsif dengan grid yang menyesuaikan layar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              
              {/* Input Kegiatan - mengambil full width di mobile, 2 kolom di tablet, 1 kolom di desktop */}
              <div className="md:col-span-2 lg:col-span-1 space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Nama Kegiatan
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  value={kegiatanInput}
                  onChange={(e) => setKegiatanInput(e.target.value)}
                  placeholder="Masukkan nama kegiatan..."
                  className="border-orange-200 focus:border-orange-400 w-full"
                />
              </div>

              {/* Tambah Organik */}
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
                  emptyMessage="Tidak ada organik tersedia"
                  onSearchChange={setSearchTermOrganik}
                />
              </div>

              {/* Tambah Mitra */}
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
                  emptyMessage="Tidak ada mitra tersedia"
                  onSearchChange={setSearchTermMitra}
                />
              </div>

              {/* Tombol Aksi */}
              <div className="space-y-2">
                <label className="text-sm font-medium invisible">Aksi</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={addOrganik} 
                    disabled={!selectedOrganik || !kegiatanInput.trim()}
                    className="bg-orange-600 hover:bg-orange-700 flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Tambah Organik</span>
                    <span className="sm:hidden">Organik</span>
                  </Button>
                  <Button 
                    onClick={addMitra} 
                    disabled={!selectedMitra || !kegiatanInput.trim()}
                    className="bg-orange-600 hover:bg-orange-700 flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Tambah Mitra</span>
                    <span className="sm:hidden">Mitra</span>
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Kegiatan akan disimpan di kolom <strong className={ROLE_MAPPING[userRole as keyof typeof ROLE_MAPPING]?.color}>{userRole}</strong>
            </p>
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
              Daftar Perjalanan Dinas - <span className="text-red-500">{bulan}</span> <span className="text-red-500">{tahun}</span>
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
                  const uniqueKegiatan = getUniqueKegiatanList(data);
                  const canEditThisData = canUserEditData(data);
                  
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
                        {data.kecamatan}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[600px]">
                          {uniqueKegiatan.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {uniqueKegiatan.map((item, idx) => {
                                const datesForKegiatan = Object.keys(data.blocks)
                                  .filter(t => data.blocks[t].kegiatan === item.kegiatan && data.blocks[t].role === item.role)
                                  .sort((a, b) => parseInt(a) - parseInt(b));
                                const kegiatanColor = getKegiatanColor(item.role);
                                const bgColor = getKegiatanBgColor(item.role);
                                const borderColor = getKegiatanBorderColor(item.role);
                                
                                return (
                                  <div 
                                    key={idx} 
                                    className={`p-2 rounded-lg border ${borderColor} ${bgColor}`}
                                  >
                                    <div className="space-y-1">
                                      <div className={`text-sm font-medium break-words ${kegiatanColor}`}>
                                        {item.kegiatan}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        <span className="font-medium">{item.role}</span> - Tanggal: {datesForKegiatan.join(', ')}
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
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="icon"
                                        className="h-8 w-8 bg-green-50 hover:bg-green-100 border-green-200 text-green-600 hover:text-green-700"
                                        onClick={() => openDatePicker(index)}
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
                                            blocked: getBlockedDatesForCurrentUser(selectedDataForDates)
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

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    className="h-8 w-8 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 hover:text-blue-700"
                                    onClick={() => openEditModal(index)}
                                    disabled={!canEditThisData}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit Tanggal</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {canEditThisData && (
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

      {/* Edit Tanggal Modal */}
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

      {/* Delete Data Confirmation Dialog */}
      <Dialog open={showDeleteDataDialog} onOpenChange={setShowDeleteDataDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Data</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data ini? 
              {dataToDelete !== null && dataRows[dataToDelete] && (
                <>
                  {" "}
                  {(() => {
                    const data = dataRows[dataToDelete];
                    const rolesInData = new Set();
                    Object.values(data.blocks).forEach(block => {
                      rolesInData.add(block.role);
                    });
                    const isOnlyRole = rolesInData.size === 1 && rolesInData.has(userRole);
                    
                    return isOnlyRole 
                      ? "Seluruh data akan dihapus dari sistem." 
                      : "Hanya data dari role Anda yang akan dihapus, data dari role lain tetap dipertahankan.";
                  })()}
                </>
              )}
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