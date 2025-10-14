import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, CalendarIcon, UserPlus, Pencil, Send, LogIn, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Mock data for SPK periods
// Initialize empty SPK data for 12 months
const spkData = [
  { id: 1, month: "Januari", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 2, month: "Februari", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 3, month: "Maret", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 4, month: "April", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 5, month: "Mei", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 6, month: "Juni", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 7, month: "Juli", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 8, month: "Agustus", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 9, month: "September", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 10, month: "Oktober", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 11, month: "November", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
  { id: 12, month: "Desember", activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 },
];

// Job types options
const jobTypes = [
  { id: 1, name: "Petugas Pendataan Lapangan", activities: 0, workers: 0, target: 0, value: 0, sent: 0, approved: 0 },
  { id: 2, name: "Petugas Pemeriksaan Lapangan", activities: 0, workers: 0, target: 0, value: 0, sent: 0, approved: 0 },
  { id: 3, name: "Petugas Pengolahan", activities: 0, workers: 0, target: 0, value: 0, sent: 0, approved: 0 },
];

type Worker = {
  id: number;
  nama: string;
  nip: string;
  jabatan: string;
  target: string;
  realisasi: string;
};

type Activity = {
  id: number;
  namaKegiatan: string;
  tanggalMulai: Date;
  tanggalAkhir: Date;
  hargaSatuan: string;
  satuan: string;
  komponenPOK: string;
  nomorSK: string;
  tanggalSK: Date;
  koordinator: string;
  workers: Worker[];
  jobType: string;
  spreadsheetRowIndex?: number; // Track row in spreadsheet for updates
};

type PetugasFromSheet = {
  id: number;
  nama: string;
  nik: string;
  pekerjaan: string;
  alamat: string;
  bank: string;
  rekening: string;
  kecamatan: string;
};

type ActivityOption = {
  no: number;
  role: string;
  namaKegiatan: string;
};

const komponenPOKOptions = [
  { value: "005", label: "005 - Dukungan Penyelenggaraan Tugas dan Fungsi Unit" },
  { value: "051", label: "051 - PERSIAPAN" },
  { value: "052", label: "052 - PENGUMPULAN DATA" },
  { value: "053", label: "053 - PENGOLAHAN DAN ANALISIS" },
  { value: "054", label: "054 - DISEMINASI DAN EVALUASI" },
  { value: "506", label: "506 - Pemutakhiran Kerangka Geospasial dan Muatan Wilkerstat" },
  { value: "516", label: "516 - Updating Direktori Usaha/Perusahaan Ekonomi Lanjutan" },
  { value: "519", label: "519 - Penyusunan Bahan Publisitas" },
];

const formSchema = z.object({
  namaKegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  tanggalSK: z.date({ required_error: "Tanggal SK wajib diisi" }),
  tanggalMulai: z.date({ required_error: "Tanggal mulai wajib diisi" }),
  tanggalAkhir: z.date({ required_error: "Tanggal akhir wajib diisi" }),
  hargaSatuan: z.string().min(1, "Harga satuan wajib diisi").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Harga satuan harus berupa angka positif"),
  satuan: z.string().min(1, "Satuan wajib dipilih"),
  satuanCustom: z.string().optional(),
  komponenPOK: z.string().min(1, "Komponen POK wajib dipilih"),
  nomorSK: z.string().min(1, "Nomor SK wajib diisi"),
  koordinator: z.string().min(1, "Koordinator wajib dipilih"),
}).refine((data) => data.tanggalMulai >= data.tanggalSK, {
  message: "Tanggal mulai kegiatan tidak boleh lebih awal dari tanggal SK",
  path: ["tanggalMulai"],
}).refine((data) => data.tanggalAkhir >= data.tanggalSK, {
  message: "Tanggal akhir kegiatan tidak boleh lebih awal dari tanggal SK",
  path: ["tanggalAkhir"],
}).refine((data) => data.tanggalAkhir >= data.tanggalMulai, {
  message: "Tanggal akhir kegiatan tidak boleh lebih awal dari tanggal mulai",
  path: ["tanggalAkhir"],
}).refine((data) => {
  if (data.satuan === "Lainnya" && !data.satuanCustom?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Satuan custom wajib diisi jika memilih 'Lainnya'",
  path: ["satuanCustom"],
});

export default function EntriTarget() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const [showJobTypesDialog, setShowJobTypesDialog] = useState(false);
  const [showProposalsDialog, setShowProposalsDialog] = useState(false);
  const [showAddActivityDialog, setShowAddActivityDialog] = useState(false);
  const [showAddWorkerDialog, setShowAddWorkerDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [selectedActivityForWorkers, setSelectedActivityForWorkers] = useState<Activity | null>(null);
  // Store activities per month and job type
  const [activitiesByPeriod, setActivitiesByPeriod] = useState<{[key: string]: Activity[]}>({});
  const [selectedWorkers, setSelectedWorkers] = useState<{[key: number]: {selected: boolean, target: string, realisasi: string}}>({});
  const [editingWorker, setEditingWorker] = useState<{activityId: number, worker: Worker} | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [petugasFromSheet, setPetugasFromSheet] = useState<PetugasFromSheet[]>([]);
  const [loadingPetugas, setLoadingPetugas] = useState(false);
  const [activityOptions, setActivityOptions] = useState<ActivityOption[]>([]);
  const [loadingActivityOptions, setLoadingActivityOptions] = useState(false);
  
  // Get activities for current period and job type - MUST include year to match spreadsheet data
  const periodKey = `${selectedPeriod} ${selectedYear}-${selectedJobType}`;
  const activities = activitiesByPeriod[periodKey] || [];
  
  console.log('Current periodKey:', periodKey);
  console.log('Available keys in activitiesByPeriod:', Object.keys(activitiesByPeriod));
  console.log('Activities found:', activities);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      namaKegiatan: "",
      hargaSatuan: "",
      satuan: "",
      satuanCustom: "",
      komponenPOK: "",
      nomorSK: "",
      koordinator: "",
    },
  });

  const [showCustomSatuan, setShowCustomSatuan] = useState(false);

  // Load petugas data from MASTER.MITRA sheet
  const loadPetugasFromSheet = async () => {
    try {
      setLoadingPetugas(true);
      console.log('Loading petugas data from MASTER.MITRA...');
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM',
          operation: 'read',
          range: 'MASTER.MITRA',
        }
      });

      if (error) {
        console.error('Error loading petugas data:', error);
        toast({
          title: "Error",
          description: "Gagal memuat data petugas dari spreadsheet",
          variant: "destructive",
        });
        return;
      }

      console.log('Petugas data loaded:', data);

      if (!data?.values || data.values.length <= 1) {
        console.log('No petugas data in spreadsheet');
        setPetugasFromSheet([]);
        return;
      }

      // Parse spreadsheet data - skip header row
      const rows = data.values.slice(1);
      const petugasData: PetugasFromSheet[] = rows.map((row: any[], index: number) => ({
        id: index + 1,
        nama: row[2] || '', // Kolom C: Nama
        nik: row[1] || '',  // Kolom B: NIK
        pekerjaan: row[3] || '', // Kolom D: Pekerjaan
        alamat: row[4] || '', // Kolom E: Alamat
        bank: row[5] || '', // Kolom F: Bank
        rekening: row[6] || '', // Kolom G: Rekening
        kecamatan: row[7] || '', // Kolom H: Kecamatan
      })).filter((petugas: PetugasFromSheet) => petugas.nama.trim() !== ''); // Filter out empty rows

      setPetugasFromSheet(petugasData);
      console.log('Petugas data parsed:', petugasData);
      
      toast({
        title: "Data petugas dimuat",
        description: `${petugasData.length} petugas berhasil dimuat dari MASTER.MITRA`,
      });
    } catch (error) {
      console.error('Error loading petugas:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memuat data petugas",
        variant: "destructive",
      });
    } finally {
      setLoadingPetugas(false);
    }
  };

  // Convert petugas from sheet to worker format
  const petugasAsWorkers = useMemo(() => {
    return petugasFromSheet.map((petugas, index) => ({
      id: petugas.id,
      nama: petugas.nama,
      nip: petugas.nik, // Using NIK as NIP
      jabatan: petugas.pekerjaan || 'Petugas',
      target: "0",
      realisasi: "0",
    }));
  }, [petugasFromSheet]);

  // Calculate dynamic SPK data from activitiesByPeriod
  const dynamicSpkData = useMemo(() => {
    const monthlyData = spkData.map(month => {
      let totalActivities = 0;
      let totalTarget = 0;
      let totalValue = 0;
      let totalRealisasi = 0;
      let totalSent = 0;
      const uniqueWorkers = new Set<string>();

      // Aggregate data across all job types for this month
      jobTypes.forEach(jobType => {
        const key = `${month.month} ${selectedYear}-${jobType.name}`;
        const monthActivities = activitiesByPeriod[key] || [];
        
        totalActivities += monthActivities.length;
        
        monthActivities.forEach(activity => {
          // Count unique workers
          activity.workers.forEach(worker => uniqueWorkers.add(worker.nama));
          
          // Sum targets
          const activityTarget = activity.workers.reduce((sum, w) => {
            return sum + parseFloat(w.target || '0');
          }, 0);
          totalTarget += activityTarget;
          
          // Sum values (Nilai Perjanjian)
          const activityValue = activity.workers.reduce((sum, w) => {
            const target = parseFloat(w.target || '0');
            const hargaSatuan = parseFloat(activity.hargaSatuan || '0');
            return sum + (target * hargaSatuan);
          }, 0);
          totalValue += activityValue;
          
          // Sum realisasi values
          const activityRealisasi = activity.workers.reduce((sum, w) => {
            const realisasi = parseFloat(w.realisasi || '0');
            const hargaSatuan = parseFloat(activity.hargaSatuan || '0');
            return sum + (realisasi * hargaSatuan);
          }, 0);
          totalRealisasi += activityRealisasi;
        });
      });

      return {
        ...month,
        activities: totalActivities,
        workers: uniqueWorkers.size,
        target: totalTarget,
        value: totalValue,
        realisasi: totalRealisasi,
        sent: totalSent, // TODO: implement sent logic later
      };
    });

    return monthlyData;
  }, [activitiesByPeriod, selectedYear]);

  // Calculate dynamic job types data for selected period
  const dynamicJobTypes = useMemo(() => {
    return jobTypes.map(jobType => {
      const key = `${selectedPeriod} ${selectedYear}-${jobType.name}`;
      const jobActivities = activitiesByPeriod[key] || [];
      
      let totalTarget = 0;
      let totalValue = 0;
      let totalRealisasi = 0;
      const uniqueWorkers = new Set<string>();
      
      jobActivities.forEach(activity => {
        activity.workers.forEach(worker => {
          uniqueWorkers.add(worker.nama);
          totalTarget += parseFloat(worker.target || '0');
          
          const hargaSatuan = parseFloat(activity.hargaSatuan || '0');
          totalValue += parseFloat(worker.target || '0') * hargaSatuan;
          totalRealisasi += parseFloat(worker.realisasi || '0') * hargaSatuan;
        });
      });
      
      return {
        ...jobType,
        activities: jobActivities.length,
        workers: uniqueWorkers.size,
        target: totalTarget,
        value: totalValue,
        realisasi: totalRealisasi,
        sent: 0, // TODO: implement sent logic
      };
    });
  }, [activitiesByPeriod, selectedPeriod, selectedYear]);

  // Load activity options from spreadsheet based on user role
  const loadActivityOptions = async () => {
    if (!user?.role) return;
    
    try {
      setLoadingActivityOptions(true);
      console.log('Loading activity options for role:', user.role);
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8',
          operation: 'read',
          range: 'Sheet1',
        }
      });

      if (error) {
        console.error('Error loading activity options:', error);
        return;
      }

      console.log('Activity options data loaded:', data);

      if (!data?.values || data.values.length <= 1) {
        console.log('No activity options in spreadsheet');
        setActivityOptions([]);
        return;
      }

      // Parse spreadsheet data - skip header row
      const rows = data.values.slice(1);
      const options: ActivityOption[] = rows
        .map((row: any[], index: number) => ({
          no: parseInt(row[0]) || index + 1, // Kolom A: No
          role: row[1] || '', // Kolom B: Role
          namaKegiatan: row[2] || '', // Kolom C: Nama Kegiatan
        }))
        .filter((option: ActivityOption) => {
          if (!option.namaKegiatan.trim()) return false;
          
          // Check if user's role matches any role in the Role column
          // Role column can contain multiple roles separated by "|"
          const roles = option.role.split('|').map(r => r.trim());
          return roles.includes(user.role);
        });

      setActivityOptions(options);
      console.log('Activity options filtered for role:', options);
      
    } catch (error) {
      console.error('Error loading activity options:', error);
    } finally {
      setLoadingActivityOptions(false);
    }
  };

  // Load data from spreadsheet on mount
  useEffect(() => {
    loadDataFromSpreadsheet();
    loadPetugasFromSheet();
    loadActivityOptions();
  }, [user?.role]);

  const loadDataFromSpreadsheet = async () => {
    try {
      console.log('Loading data from spreadsheet...');
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA',
          operation: 'read',
          range: 'Sheet1',
        }
      });

      if (error) {
        console.error('Error loading from spreadsheet:', error);
        return;
      }

      console.log('Spreadsheet data loaded:', data);

      if (!data?.values || data.values.length <= 1) {
        console.log('No data in spreadsheet');
        return;
      }

      // Parse spreadsheet data and populate activitiesByPeriod
      const rows = data.values.slice(1); // Skip header row
      const activitiesMap: {[key: string]: Activity[]} = {};
      let activityIdCounter = 1;

      rows.forEach((row: any[], rowIndex: number) => {
        if (!row[0]) return; // Skip empty rows

        const periode = row[2] || ''; // Periode (Bulan) SPK
        const jenisPekerjaan = row[3] || ''; // Jenis Pekerjaan
        const namaKegiatan = row[4] || '';
        const nomorSK = row[5] || '';
        
        // Parse dates - handles DD/MM/YYYY or "DD MonthName YYYY" formats
        const parseDateFromSpreadsheet = (dateStr: string) => {
          if (!dateStr) return new Date();
          
          // Indonesian month names mapping
          const monthNames: {[key: string]: number} = {
            'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
            'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
            'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
          };
          
          // Try DD/MM/YYYY format first
          const numericParts = dateStr.split(/[\/\s-]/);
          if (numericParts.length >= 3 && !isNaN(parseInt(numericParts[0])) && !isNaN(parseInt(numericParts[1]))) {
            const day = parseInt(numericParts[0]);
            const month = parseInt(numericParts[1]) - 1;
            const year = parseInt(numericParts[2]);
            return new Date(year, month, day);
          }
          
          // Try "DD MonthName YYYY" format
          const parts = dateStr.toLowerCase().split(/\s+/);
          if (parts.length >= 3) {
            const day = parseInt(parts[0]);
            const monthName = parts[1];
            const year = parseInt(parts[2]);
            const month = monthNames[monthName];
            
            if (!isNaN(day) && month !== undefined && !isNaN(year)) {
              return new Date(year, month, day);
            }
          }
          
          return new Date();
        };
        
        const tanggalSK = parseDateFromSpreadsheet(row[6]);
        const tanggalMulai = parseDateFromSpreadsheet(row[7]);
        const tanggalAkhir = parseDateFromSpreadsheet(row[8]);
        const hargaSatuan = row[9] || '0';
        const satuan = row[10] || '';
        const satuanCustom = row[11] || '';
        const koordinator = row[12] || '';
        const komponenPOK = row[13] || '';
        
        // Parse workers data (separated by |)
        const namaPetugasStr = row[14] || '';
        const targetStr = row[15] || '';
        const realisasiStr = row[16] || '';
        
        const namaPetugasList = namaPetugasStr.split('|').map((s: string) => s.trim()).filter(Boolean);
        const targetList = targetStr.split('|').map((s: string) => s.trim()).filter(Boolean);
        const realisasiList = realisasiStr.split('|').map((s: string) => s.trim()).filter(Boolean);

        const workers: Worker[] = namaPetugasList.map((nama: string, idx: number) => ({
          id: idx + 1,
          nama: nama,
          nip: '', // Not stored in spreadsheet
          jabatan: '', // Not stored in spreadsheet
          target: targetList[idx] || '0',
          realisasi: realisasiList[idx] || '0',
        }));

        const activity: Activity = {
          id: activityIdCounter++,
          namaKegiatan,
          tanggalMulai,
          tanggalAkhir,
          hargaSatuan,
          satuan: satuanCustom || satuan,
          komponenPOK,
          nomorSK,
          tanggalSK,
          koordinator,
          workers,
          jobType: jenisPekerjaan,
          spreadsheetRowIndex: rowIndex + 2, // +2 because: +1 for header, +1 for 0-index
        };

        const periodKey = `${periode}-${jenisPekerjaan}`;
        if (!activitiesMap[periodKey]) {
          activitiesMap[periodKey] = [];
        }
        activitiesMap[periodKey].push(activity);
      });

      setActivitiesByPeriod(activitiesMap);
      console.log('Activities loaded from spreadsheet:', activitiesMap);
      
      toast({
        title: "Data dimuat",
        description: "Data berhasil dimuat dari spreadsheet",
      });
    } catch (error) {
      console.error('Error loading from spreadsheet:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data dari spreadsheet",
        variant: "destructive",
      });
    }
  };

  const handleActionClick = (month: string) => {
    setSelectedPeriod(month);
    setShowJobTypesDialog(true);
  };

  const handleJobTypeClick = (jobTypeName: string) => {
    const specialJobTypes = ["Petugas Pendataan Lapangan", "Petugas Pemeriksaan Lapangan", "Petugas Pengolahan"];
    if (specialJobTypes.includes(jobTypeName)) {
      setSelectedJobType(jobTypeName);
      setShowProposalsDialog(true);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value) + ',-';
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const finalSatuan = data.satuan === "Lainnya" ? data.satuanCustom || "" : data.satuan;
    
    if (editingActivity) {
      const updatedActivities = activities.map(activity => 
        activity.id === editingActivity.id 
          ? {
              ...activity,
              namaKegiatan: data.namaKegiatan,
              tanggalMulai: data.tanggalMulai,
              tanggalAkhir: data.tanggalAkhir,
              hargaSatuan: data.hargaSatuan,
              satuan: finalSatuan,
              komponenPOK: data.komponenPOK,
              nomorSK: data.nomorSK,
              tanggalSK: data.tanggalSK,
              koordinator: data.koordinator,
            }
          : activity
      );
      setActivitiesByPeriod({
        ...activitiesByPeriod,
        [periodKey]: updatedActivities
      });
      
      // Update spreadsheet if row exists
      const updatedActivity = updatedActivities.find(a => a.id === editingActivity.id);
      if (updatedActivity?.spreadsheetRowIndex) {
        await updateActivityInSpreadsheet(updatedActivity);
      }
      
      toast({
        title: "Kegiatan berhasil diperbarui",
        description: `Kegiatan "${data.namaKegiatan}" telah diperbarui.`,
      });
      setEditingActivity(null);
    } else {
      const newActivity: Activity = {
        id: activities.length + 1,
        namaKegiatan: data.namaKegiatan,
        tanggalMulai: data.tanggalMulai,
        tanggalAkhir: data.tanggalAkhir,
        hargaSatuan: data.hargaSatuan,
        satuan: finalSatuan,
        komponenPOK: data.komponenPOK,
        nomorSK: data.nomorSK,
        tanggalSK: data.tanggalSK,
        koordinator: data.koordinator,
        workers: [],
        jobType: selectedJobType || "",
      };
      
      // Save to spreadsheet and get row index
      const rowIndex = await saveActivityToSpreadsheet(newActivity);
      if (rowIndex) {
        newActivity.spreadsheetRowIndex = rowIndex;
      }
      
      setActivitiesByPeriod({
        ...activitiesByPeriod,
        [periodKey]: [...activities, newActivity]
      });
      
      toast({
        title: "Kegiatan berhasil ditambahkan",
        description: `Kegiatan "${data.namaKegiatan}" telah ditambahkan dan disimpan ke spreadsheet.`,
      });
    }
    
    setShowAddActivityDialog(false);
    setShowCustomSatuan(false);
    form.reset();
  };

  // === DELETE ACTIVITY - DIPERBAIKI ===
  const handleDeleteActivity = async (id: number) => {
    const activityToDelete = activities.find(activity => activity.id === id);
    if (!activityToDelete) return;

    if (!confirm(`Apakah Anda yakin ingin menghapus kegiatan "${activityToDelete.namaKegiatan}"?`)) return;

    try {
      // Hapus dari spreadsheet terlebih dahulu jika ada rowIndex
      if (activityToDelete.spreadsheetRowIndex) {
        await deleteActivityFromSpreadsheet(activityToDelete.spreadsheetRowIndex);
      }

      // Hapus dari state
      const updatedActivities = activities.filter(activity => activity.id !== id);
      setActivitiesByPeriod({
        ...activitiesByPeriod,
        [periodKey]: updatedActivities
      });
      
      toast({
        title: "Kegiatan berhasil dihapus",
        description: `Kegiatan "${activityToDelete.namaKegiatan}" telah dihapus dari spreadsheet.`,
      });
      
      // Refresh data dari spreadsheet untuk memastikan konsistensi
      await loadDataFromSpreadsheet();
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Gagal menghapus kegiatan",
        description: error.message || "Terjadi kesalahan saat menghapus kegiatan dari spreadsheet",
        variant: "destructive",
      });
    }
  };

  // Fungsi untuk menghapus activity dari spreadsheet
  const deleteActivityFromSpreadsheet = async (rowIndex: number) => {
    try {
      console.log('Deleting row from spreadsheet:', rowIndex);
      
      const { error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA',
          operation: 'delete',
          rowIndex: rowIndex,
        }
      });

      if (error) {
        console.error('Error deleting from spreadsheet:', error);
        throw error;
      }

      console.log('Successfully deleted row from spreadsheet');
    } catch (error) {
      console.error('Error in deleteActivityFromSpreadsheet:', error);
      throw error;
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    const standardSatuans = ["BS", "Dokumen", "EA", "Segmen"];
    const isCustomSatuan = !standardSatuans.includes(activity.satuan);
    
    form.reset({
      namaKegiatan: activity.namaKegiatan,
      tanggalMulai: activity.tanggalMulai,
      tanggalAkhir: activity.tanggalAkhir,
      hargaSatuan: activity.hargaSatuan,
      satuan: isCustomSatuan ? "Lainnya" : activity.satuan,
      satuanCustom: isCustomSatuan ? activity.satuan : "",
      komponenPOK: activity.komponenPOK,
      nomorSK: activity.nomorSK,
      tanggalSK: activity.tanggalSK,
      koordinator: activity.koordinator,
    });
    setShowCustomSatuan(isCustomSatuan);
    setShowAddActivityDialog(true);
  };

  const handleAddWorker = (activity: Activity) => {
    setSelectedActivityForWorkers(activity);
    const initialWorkers: {[key: number]: {selected: boolean, target: string, realisasi: string}} = {};
    petugasAsWorkers.forEach(worker => {
      initialWorkers[worker.id] = { selected: false, target: "", realisasi: "" };
    });
    setSelectedWorkers(initialWorkers);
    setSearchTerm("");
    setShowAddWorkerDialog(true);
  };

  const handleSaveWorker = async () => {
    if (!selectedActivityForWorkers) return;
    
    const newWorkers: Worker[] = petugasAsWorkers
      .filter(worker => selectedWorkers[worker.id]?.selected)
      .map(worker => ({
        ...worker,
        target: selectedWorkers[worker.id].target || "0",
        realisasi: selectedWorkers[worker.id].realisasi || "0",
      }));
    
    if (newWorkers.length === 0) {
      toast({
        title: "Tidak ada petugas dipilih",
        description: "Pilih minimal satu petugas dan isi targetnya.",
        variant: "destructive",
      });
      return;
    }

    // Validate realisasi <= target
    const invalidWorkers = newWorkers.filter(w => parseFloat(w.realisasi) > parseFloat(w.target));
    if (invalidWorkers.length > 0) {
      toast({
        title: "Realisasi tidak valid",
        description: `Realisasi tidak boleh lebih besar dari Target untuk: ${invalidWorkers.map(w => w.nama).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates within the same activity
    const existingWorkerIds = selectedActivityForWorkers.workers.map(w => w.id);
    const duplicates = newWorkers.filter(w => existingWorkerIds.includes(w.id));
    
    if (duplicates.length > 0) {
      toast({
        title: "Petugas sudah terdaftar",
        description: `${duplicates.map(d => d.nama).join(", ")} sudah terdaftar dalam kegiatan ini.`,
        variant: "destructive",
      });
      return;
    }
    
    const updatedActivities = activities.map(activity => 
      activity.id === selectedActivityForWorkers.id 
        ? { ...activity, workers: [...activity.workers, ...newWorkers] }
        : activity
    );
    setActivitiesByPeriod({
      ...activitiesByPeriod,
      [periodKey]: updatedActivities
    });
    
    // Update spreadsheet
    const updatedActivity = updatedActivities.find(a => a.id === selectedActivityForWorkers.id);
    if (updatedActivity?.spreadsheetRowIndex) {
      await updateActivityInSpreadsheet(updatedActivity);
    }
    
    toast({
      title: "Petugas berhasil ditambahkan",
      description: `${newWorkers.length} petugas telah ditambahkan dan disimpan ke spreadsheet.`,
    });
    setShowAddWorkerDialog(false);
    setSelectedActivityForWorkers(null);
  };

  const handleDeleteWorker = async (activityId: number, workerId: number) => {
    const updatedActivities = activities.map(activity => 
      activity.id === activityId 
        ? { ...activity, workers: activity.workers.filter(w => w.id !== workerId) }
        : activity
    );
    setActivitiesByPeriod({
      ...activitiesByPeriod,
      [periodKey]: updatedActivities
    });
    
    // Update spreadsheet to reflect deleted worker
    const updatedActivity = updatedActivities.find(a => a.id === activityId);
    if (updatedActivity?.spreadsheetRowIndex) {
      await updateActivityInSpreadsheet(updatedActivity);
    }
    
    toast({
      title: "Petugas berhasil dihapus",
      description: "Petugas telah dihapus dari kegiatan dan spreadsheet diperbarui.",
    });
  };

  const handleEditWorker = (activityId: number, worker: Worker) => {
    setEditingWorker({ activityId, worker });
  };

  const handleUpdateWorker = async (activityId: number, workerId: number, newName: string, newTarget: string, newRealisasi: string) => {
    // Validate realisasi <= target
    if (parseFloat(newRealisasi) > parseFloat(newTarget)) {
      toast({
        title: "Realisasi tidak valid",
        description: "Realisasi tidak boleh lebih besar dari Target.",
        variant: "destructive",
      });
      return;
    }

    // Check if the new name is already used by another worker in this activity
    const activity = activities.find(a => a.id === activityId);
    const duplicateWorker = activity?.workers.find(w => w.id !== workerId && w.nama === newName);
    
    if (duplicateWorker) {
      toast({
        title: "Nama petugas sudah terdaftar",
        description: "Nama petugas sudah digunakan dalam kegiatan ini.",
        variant: "destructive",
      });
      return;
    }

    const updatedActivities = activities.map(activity => 
      activity.id === activityId 
        ? { 
            ...activity, 
            workers: activity.workers.map(w => 
              w.id === workerId 
                ? { ...w, nama: newName, target: newTarget, realisasi: newRealisasi }
                : w
            )
          }
        : activity
    );
    setActivitiesByPeriod({
      ...activitiesByPeriod,
      [periodKey]: updatedActivities
    });
    setEditingWorker(null);
    
    // Update spreadsheet
    const updatedActivity = updatedActivities.find(a => a.id === activityId);
    if (updatedActivity?.spreadsheetRowIndex) {
      await updateActivityInSpreadsheet(updatedActivity);
    }
    
    toast({
      title: "Petugas berhasil diperbarui",
      description: "Data petugas telah diperbarui di spreadsheet.",
    });
  };

  const saveActivityToSpreadsheet = async (activity: Activity): Promise<number | null> => {
    try {
      // Get current row count to determine next row
      const { data: existingData } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA',
          operation: 'read',
          range: 'Sheet1!A:A',
        }
      });

      const nextRowIndex = existingData?.values ? existingData.values.length + 1 : 2; // +1 for header
      const nextNo = existingData?.values ? existingData.values.length : 1;

      // Prepare initial data (without workers yet)
      const standardSatuans = ["BS", "Dokumen", "EA", "Segmen"];
      const satuanCustom = !standardSatuans.includes(activity.satuan) ? activity.satuan : "";
      const satuan = !standardSatuans.includes(activity.satuan) ? "Lainnya" : activity.satuan;

      const rowData = [
        [
          nextNo.toString(),
          user?.role || "User",
          `${selectedPeriod} ${selectedYear}`,
          selectedJobType || "",
          activity.namaKegiatan,
          activity.nomorSK,
          format(activity.tanggalSK, "dd/MM/yyyy"),
          format(activity.tanggalMulai, "dd/MM/yyyy"),
          format(activity.tanggalAkhir, "dd/MM/yyyy"),
          activity.hargaSatuan,
          satuan,
          satuanCustom,
          activity.koordinator,
          getKomponenPOKLabel(activity.komponenPOK),
          "", // Nama Petugas (empty initially)
          "", // Target
          "", // Realisasi
          "", // Nilai Realisasi
          "", // Total Realisasi
          "", // Keterangan
        ]
      ];

      const { error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA',
          operation: 'append',
          range: 'Sheet1',
          values: rowData,
        }
      });

      if (error) throw error;
      
      return nextRowIndex;
    } catch (error) {
      console.error('Error saving to spreadsheet:', error);
      toast({
        title: "Gagal menyimpan",
        description: "Terjadi kesalahan saat menyimpan ke Google Sheets.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateActivityInSpreadsheet = async (activity: Activity) => {
    if (!activity.spreadsheetRowIndex) return;

    try {
      const namaPetugas = activity.workers.map(w => w.nama).join(" | ");
      const targetList = activity.workers.map(w => w.target).join(" | ");
      const realisasiList = activity.workers.map(w => w.realisasi).join(" | ");
      const nilaiRealisasiList = activity.workers
        .map(w => formatCurrency(parseFloat(w.realisasi) * parseFloat(activity.hargaSatuan)))
        .join(" | ");
      
      const totalRealisasi = activity.workers.reduce(
        (sum, w) => sum + (parseFloat(w.realisasi) * parseFloat(activity.hargaSatuan)),
        0
      );

      const standardSatuans = ["BS", "Dokumen", "EA", "Segmen"];
      const satuanCustom = !standardSatuans.includes(activity.satuan) ? activity.satuan : "";
      const satuan = !standardSatuans.includes(activity.satuan) ? "Lainnya" : activity.satuan;

      const rowData = [
        [
          activity.spreadsheetRowIndex - 1, // No (keep original)
          user?.role || "User",
          `${selectedPeriod} ${selectedYear}`,
          selectedJobType || "",
          activity.namaKegiatan,
          activity.nomorSK,
          format(activity.tanggalSK, "dd/MM/yyyy"),
          format(activity.tanggalMulai, "dd/MM/yyyy"),
          format(activity.tanggalAkhir, "dd/MM/yyyy"),
          activity.hargaSatuan,
          satuan,
          satuanCustom,
          activity.koordinator,
          getKomponenPOKLabel(activity.komponenPOK),
          namaPetugas,
          targetList,
          realisasiList,
          nilaiRealisasiList,
          formatCurrency(totalRealisasi),
          "", // Keterangan (preserve existing or empty)
        ]
      ];

      const { error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA',
          operation: 'update',
          range: 'Sheet1',
          rowIndex: activity.spreadsheetRowIndex,
          values: rowData,
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating spreadsheet:', error);
      toast({
        title: "Gagal memperbarui",
        description: "Terjadi kesalahan saat memperbarui Google Sheets.",
        variant: "destructive",
      });
    }
  };

  const handleSendToPPK = async (activityId: number) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    if (activity.workers.length === 0) {
      toast({
        title: "Tidak dapat mengirim",
        description: "Tambahkan minimal satu petugas sebelum mengirim ke PPK.",
        variant: "destructive",
      });
      return;
    }

    if (!activity.spreadsheetRowIndex) {
      toast({
        title: "Tidak dapat mengirim",
        description: "Data kegiatan belum tersimpan di spreadsheet.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update only the Keterangan column
      const namaPetugas = activity.workers.map(w => w.nama).join(" | ");
      const targetList = activity.workers.map(w => w.target).join(" | ");
      const realisasiList = activity.workers.map(w => w.realisasi).join(" | ");
      const nilaiRealisasiList = activity.workers
        .map(w => formatCurrency(parseFloat(w.realisasi) * parseFloat(activity.hargaSatuan)))
        .join(" | ");
      
      const totalRealisasi = activity.workers.reduce(
        (sum, w) => sum + (parseFloat(w.realisasi) * parseFloat(activity.hargaSatuan)),
        0
      );

      const standardSatuans = ["BS", "Dokumen", "EA", "Segmen"];
      const satuanCustom = !standardSatuans.includes(activity.satuan) ? activity.satuan : "";
      const satuan = !standardSatuans.includes(activity.satuan) ? "Lainnya" : activity.satuan;

      const rowData = [
        [
          activity.spreadsheetRowIndex - 1,
          user?.role || "User",
          `${selectedPeriod} ${selectedYear}`,
          selectedJobType || "",
          activity.namaKegiatan,
          activity.nomorSK,
          format(activity.tanggalSK, "dd/MM/yyyy"),
          format(activity.tanggalMulai, "dd/MM/yyyy"),
          format(activity.tanggalAkhir, "dd/MM/yyyy"),
          activity.hargaSatuan,
          satuan,
          satuanCustom,
          activity.koordinator,
          getKomponenPOKLabel(activity.komponenPOK),
          namaPetugas,
          targetList,
          realisasiList,
          nilaiRealisasiList,
          formatCurrency(totalRealisasi),
          "Kirim PPK", // Update Keterangan
        ]
      ];

      const { error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA',
          operation: 'update',
          range: 'Sheet1',
          rowIndex: activity.spreadsheetRowIndex,
          values: rowData,
        }
      });

      if (error) throw error;

      toast({
        title: "Berhasil dikirim ke PPK",
        description: `Kegiatan "${activity.namaKegiatan}" telah dikirim ke PPK.`,
      });
    } catch (error) {
      console.error('Error sending to PPK:', error);
      toast({
        title: "Gagal mengirim",
        description: "Terjadi kesalahan saat mengirim ke PPK.",
        variant: "destructive",
      });
    }
  };

  const getKomponenPOKLabel = (value: string) => {
    const option = komponenPOKOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Get worker options for combobox, excluding already added workers and the current editing worker
  const getAvailableWorkers = (activity: Activity, excludeWorkerId?: number): ComboboxOption[] => {
    const existingWorkerIds = activity.workers
      .filter(w => w.id !== excludeWorkerId) // Exclude current worker being edited
      .map(w => w.id);
    
    return petugasAsWorkers
      .filter(w => !existingWorkerIds.includes(w.id))
      .map(w => {
        // Find the corresponding petugas data to get kecamatan
        const petugasData = petugasFromSheet.find(p => p.id === w.id);
        const kecamatan = petugasData?.kecamatan || '';
        
        return {
          value: w.nama,
          label: `${w.nama} (${kecamatan})`, // Tampilkan nama dan kecamatan
        };
      });
  };

  // Filter workers based on search term
  const filteredWorkers = useMemo(() => {
    if (!searchTerm) return petugasAsWorkers;
    
    const lowerSearch = searchTerm.toLowerCase();
    return petugasAsWorkers.filter(w => {
      const petugasData = petugasFromSheet.find(p => p.id === w.id);
      const kecamatan = petugasData?.kecamatan || '';
      
      return (
        w.nama.toLowerCase().includes(lowerSearch) || 
        kecamatan.toLowerCase().includes(lowerSearch) // Cari juga berdasarkan kecamatan
      );
    });
  }, [searchTerm, petugasAsWorkers, petugasFromSheet]);

  // Activities are already filtered by period and job type via periodKey
  const filteredActivities = activities;

  // Get job type color and label
  const getJobTypeInfo = (jobType: string) => {
    switch(jobType) {
      case "Petugas Pendataan Lapangan":
        return { color: "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200", label: "Entri Petugas Pendataan Lapangan" };
      case "Petugas Pemeriksaan Lapangan":
        return { color: "bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200", label: "Entri Petugas Pemeriksaan Lapangan" };
      case "Petugas Pengolahan":
        return { color: "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-200", label: "Entri Petugas Pengolahan" };
      default:
        return { color: "bg-muted", label: "Entri Kegiatan" };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Entri Kegiatan</h1>
        <p className="text-muted-foreground mt-2">
          Penetapan target kegiatan untuk mitra statistik
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">
              Pilih Periode (Bulan) SPK Tahun <span className="text-destructive">{selectedYear}</span>
            </h2>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead>Periode (Bulan) SPK</TableHead>
                    <TableHead className="text-center">Jumlah Kegiatan Yang Dientri</TableHead>
                    <TableHead className="text-center">Jumlah Petugas (Unik) Yang Terlibat</TableHead>
                    <TableHead className="text-center">Target Pekerjaan (BS,Resp,Dok,dll)</TableHead>
                    <TableHead className="text-right">Nilai Perjanjian Rp.</TableHead>
                    <TableHead className="text-right">Nilai Realisasi Rp.</TableHead>
                    <TableHead className="text-center">Jumlah kegiatan dikirim ke PPK</TableHead>
                    <TableHead className="text-center w-20">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dynamicSpkData.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>SPK Bulan {item.month} {selectedYear}</TableCell>
                      <TableCell className="text-center">{item.activities}</TableCell>
                      <TableCell className="text-center">{item.workers}</TableCell>
                      <TableCell className="text-center">{item.target || ""}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.realisasi)}</TableCell>
                      <TableCell className="text-center">{item.sent}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleActionClick(item.month)}
                          title="Entri"
                        >
                          <LogIn className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Types Dialog */}
      <Dialog open={showJobTypesDialog} onOpenChange={setShowJobTypesDialog}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Pilih Jenis Pekerjaan untuk SPK Bulan {selectedPeriod} {selectedYear}
            </DialogTitle>
          </DialogHeader>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">No.</TableHead>
                  <TableHead>Jenis Pekerjaan</TableHead>
                  <TableHead className="text-center">Jumlah Kegiatan Yang Dientri</TableHead>
                  <TableHead className="text-center">Jumlah Petugas (Unik) Yang Terlibat</TableHead>
                  <TableHead className="text-center">Target Pekerjaan (BS,Resp,Dok,dll)</TableHead>
                  <TableHead className="text-right">Nilai Perjanjian Rp.</TableHead>
                  <TableHead className="text-right">Nilai Realisasi Rp.</TableHead>
                  <TableHead className="text-center">Jumlah kegiatan dikirim ke PPK</TableHead>
                  <TableHead className="text-center w-20">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dynamicJobTypes.map((job, index) => (
                  <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleJobTypeClick(job.name)}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{job.name}</TableCell>
                    <TableCell className="text-center">{job.activities}</TableCell>
                    <TableCell className="text-center">{job.workers}</TableCell>
                    <TableCell className="text-center">{job.target}</TableCell>
                    <TableCell className="text-right">{formatCurrency(job.value)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(job.realisasi)}</TableCell>
                    <TableCell className="text-center">{job.sent}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJobTypeClick(job.name);
                        }}
                        title="Entri"
                      >
                        <LogIn className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Proposals Dialog */}
      <Dialog open={showProposalsDialog} onOpenChange={setShowProposalsDialog}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 rounded-none">
          <DialogHeader>
            <DialogTitle className="text-xl">Daftar Usulan SPK</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 p-4 overflow-y-auto h-[calc(100vh-8rem)]">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-sm">
                <div className="mb-1"><span className="font-semibold">SPK Bulan {selectedPeriod} {selectedYear}</span></div>
                <div className="text-muted-foreground">{selectedJobType}</div>
              </div>
            </div>

            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowAddActivityDialog(true)}>
                Tambah Kegiatan
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead>Nama Kegiatan</TableHead>
                    <TableHead className="text-center">Tanggal Mulai</TableHead>
                    <TableHead className="text-center">Tanggal Akhir</TableHead>
                    <TableHead className="text-right">Harga Satuan</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Komponen POK</TableHead>
                    <TableHead>Nomor SK</TableHead>
                    <TableHead className="text-center">Tanggal SK</TableHead>
                    <TableHead>Koordinator</TableHead>
                    <TableHead className="text-center w-40">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        Belum ada kegiatan. Klik "Tambah Kegiatan" untuk menambahkan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivities.map((activity, index) => (
                      <>
                        <TableRow key={activity.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{activity.namaKegiatan}</TableCell>
                          <TableCell className="text-center">{format(activity.tanggalMulai, "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-center">{format(activity.tanggalAkhir, "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseFloat(activity.hargaSatuan))}</TableCell>
                          <TableCell>{activity.satuan}</TableCell>
                          <TableCell>{getKomponenPOKLabel(activity.komponenPOK)}</TableCell>
                          <TableCell>{activity.nomorSK}</TableCell>
                          <TableCell className="text-center">{format(activity.tanggalSK, "dd/MM/yyyy")}</TableCell>
                          <TableCell>{activity.koordinator}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => handleAddWorker(activity)}
                                title="Tambah Petugas"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-600 hover:bg-blue-600/10"
                                onClick={() => handleEditActivity(activity)}
                                title="Edit Kegiatan"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-600/10"
                                onClick={() => handleSendToPPK(activity.id)}
                                title="Kirim ke PPK"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteActivity(activity.id)}
                                title="Hapus Kegiatan"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Worker sub-rows */}
                        {activity.workers.map((worker, workerIndex) => (
                          <TableRow key={`${activity.id}-worker-${worker.id}`} className="bg-muted/30">
                            <TableCell></TableCell>
                             <TableCell colSpan={2} className="pl-8">
                              {editingWorker?.activityId === activity.id && editingWorker.worker.id === worker.id ? (
                                <Combobox
                                  options={getAvailableWorkers(activity, worker.id)}
                                  value={worker.nama}
                                  onValueChange={(value) => handleUpdateWorker(activity.id, worker.id, value, worker.target, worker.realisasi)}
                                  placeholder="Pilih petugas"
                                  searchPlaceholder="Cari nama petugas..."
                                  className="h-8"
                                />
                              ) : (
                                <span className="text-sm">{workerIndex + 1}. {worker.nama} ({worker.nip})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {editingWorker?.activityId === activity.id && editingWorker.worker.id === worker.id ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">Target:</span>
                                    <Input
                                      type="number"
                                      defaultValue={worker.target}
                                      onChange={(e) => {
                                        const target = e.target.value;
                                        const realisasi = worker.realisasi;
                                        if (parseFloat(realisasi) > parseFloat(target)) {
                                          e.target.setCustomValidity("Realisasi tidak boleh lebih besar dari Target");
                                        } else {
                                          e.target.setCustomValidity("");
                                        }
                                      }}
                                      onBlur={(e) => handleUpdateWorker(activity.id, worker.id, worker.nama, e.target.value, worker.realisasi)}
                                      className="h-7 w-20"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">Realisasi:</span>
                                    <Input
                                      type="number"
                                      defaultValue={worker.realisasi}
                                      onBlur={(e) => handleUpdateWorker(activity.id, worker.id, worker.nama, worker.target, e.target.value)}
                                      className="h-7 w-20"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <div>Target: {worker.target}</div>
                                  <div>Realisasi: {worker.realisasi}</div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell colSpan={5} className="text-sm text-muted-foreground">
                              {worker.jabatan} - Nilai Realisasi = Rp {formatCurrency(parseFloat(worker.realisasi) * parseFloat(activity.hargaSatuan))}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-blue-600 hover:text-blue-600 hover:bg-blue-600/10"
                                  onClick={() => handleEditWorker(activity.id, worker)}
                                  title="Edit Petugas"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteWorker(activity.id, worker.id)}
                                  title="Hapus Petugas"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={showAddActivityDialog} onOpenChange={(open) => {
        setShowAddActivityDialog(open);
        if (!open) {
          setEditingActivity(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingActivity ? "Edit Kegiatan" : "Tambah Kegiatan"}
            </DialogTitle>
          </DialogHeader>

          {/* Color-coded job type indicator */}
          {selectedJobType && !editingActivity && (
            <Alert className={cn("border-2", getJobTypeInfo(selectedJobType).color)}>
              <AlertDescription className="font-semibold">
                {getJobTypeInfo(selectedJobType).label}
              </AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="namaKegiatan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kegiatan <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loadingActivityOptions}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingActivityOptions ? "Memuat kegiatan..." : "Pilih kegiatan"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activityOptions.length > 0 ? (
                          activityOptions.map((option) => (
                            <SelectItem key={option.no} value={option.namaKegiatan}>
                              {option.namaKegiatan}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            {loadingActivityOptions ? "Memuat..." : "Tidak ada kegiatan untuk role Anda"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="nomorSK"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor SK <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nomor SK" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tanggalSK"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal SK <span className="text-destructive">*</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="tanggalMulai"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Mulai Kegiatan <span className="text-destructive">*</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tanggalAkhir"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Akhir Kegiatan <span className="text-destructive">*</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="hargaSatuan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Satuan <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Masukkan harga satuan" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="satuan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Satuan <span className="text-destructive">*</span></FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setShowCustomSatuan(value === "Lainnya");
                          if (value !== "Lainnya") {
                            form.setValue("satuanCustom", "");
                          }
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih satuan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BS">BS</SelectItem>
                          <SelectItem value="Dokumen">Dokumen</SelectItem>
                          <SelectItem value="EA">EA</SelectItem>
                          <SelectItem value="Segmen">Segmen</SelectItem>
                          <SelectItem value="Lainnya">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showCustomSatuan && (
                <FormField
                  control={form.control}
                  name="satuanCustom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Satuan Custom <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Masukkan satuan custom" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Koordinator and Komponen POK on one row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="koordinator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Koordinator Fungsi/Ketua Tim <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih koordinator" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => (
                            <SelectItem key={i + 1} value={`Orang ${i + 1}`}>
                              Orang {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="komponenPOK"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Komponen POK <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih komponen POK" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {komponenPOKOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddActivityDialog(false);
                    setEditingActivity(null);
                    form.reset();
                  }}
                >
                  Batal
                </Button>
                <Button type="submit">
                  {editingActivity ? "Perbarui Kegiatan" : "Simpan Kegiatan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Worker Dialog with Search/Sort */}
      <Dialog open={showAddWorkerDialog} onOpenChange={setShowAddWorkerDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Tambah Nama Petugas</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-sm">
                <div className="mb-1"><span className="font-semibold">Kegiatan:</span> {selectedActivityForWorkers?.namaKegiatan}</div>
                <div className="text-muted-foreground">Nomor SK: {selectedActivityForWorkers?.nomorSK}</div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari nama atau kecamatan petugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {loadingPetugas ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data petugas...
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredWorkers.every(w => {
                            const isAlreadyAdded = selectedActivityForWorkers?.workers.some(aw => aw.id === w.id);
                            return isAlreadyAdded || selectedWorkers[w.id]?.selected;
                          })}
                          onCheckedChange={(checked) => {
                            const newSelected = {...selectedWorkers};
                            filteredWorkers.forEach(w => {
                              // Only allow selection if worker not already in activity
                              const isAlreadyAdded = selectedActivityForWorkers?.workers.some(aw => aw.id === w.id);
                              if (!isAlreadyAdded) {
                                newSelected[w.id] = { 
                                  selected: checked as boolean, 
                                  target: newSelected[w.id]?.target || "",
                                  realisasi: newSelected[w.id]?.realisasi || ""
                                };
                              }
                            });
                            setSelectedWorkers(newSelected);
                          }}
                        />
                      </TableHead>
                      <TableHead>Nama Petugas</TableHead>
                      <TableHead>Kecamatan</TableHead>
                      <TableHead>Pekerjaan</TableHead>
                      <TableHead className="w-28">Target</TableHead>
                      <TableHead className="w-28">Realisasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {searchTerm ? "Tidak ada petugas ditemukan" : "Tidak ada data petugas"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWorkers.map((petugas) => {
                        const isAlreadyAdded = selectedActivityForWorkers?.workers.some(w => w.id === petugas.id);
                        // Find kecamatan from petugasFromSheet
                        const petugasData = petugasFromSheet.find(p => p.id === petugas.id);
                        const kecamatan = petugasData?.kecamatan || '';
                        
                        return (
                          <TableRow key={petugas.id} className={isAlreadyAdded ? "opacity-50" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedWorkers[petugas.id]?.selected || false}
                                disabled={isAlreadyAdded}
                                onCheckedChange={(checked) => {
                                  setSelectedWorkers({
                                    ...selectedWorkers,
                                    [petugas.id]: {
                                      selected: checked as boolean,
                                      target: selectedWorkers[petugas.id]?.target || "",
                                      realisasi: selectedWorkers[petugas.id]?.realisasi || "",
                                    }
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell>{petugas.nama} {isAlreadyAdded && "(Sudah terdaftar)"}</TableCell>
                            <TableCell>{kecamatan}</TableCell>
                            <TableCell>{petugas.jabatan}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                placeholder="0"
                                value={selectedWorkers[petugas.id]?.target || ""}
                                onChange={(e) => {
                                  const newTarget = e.target.value;
                                  const currentRealisasi = selectedWorkers[petugas.id]?.realisasi || "";
                                  
                                  setSelectedWorkers({
                                    ...selectedWorkers,
                                    [petugas.id]: {
                                      selected: selectedWorkers[petugas.id]?.selected || false,
                                      target: newTarget,
                                      realisasi: currentRealisasi,
                                    }
                                  });
                                }}
                                disabled={!selectedWorkers[petugas.id]?.selected || isAlreadyAdded}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                placeholder="0"
                                value={selectedWorkers[petugas.id]?.realisasi || ""}
                                onChange={(e) => {
                                  const newRealisasi = e.target.value;
                                  const currentTarget = selectedWorkers[petugas.id]?.target || "";
                                  
                                  setSelectedWorkers({
                                    ...selectedWorkers,
                                    [petugas.id]: {
                                      selected: selectedWorkers[petugas.id]?.selected || false,
                                      target: currentTarget,
                                      realisasi: newRealisasi,
                                    }
                                  });
                                }}
                                disabled={!selectedWorkers[petugas.id]?.selected || isAlreadyAdded}
                                className="h-8"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddWorkerDialog(false);
                setSelectedActivityForWorkers(null);
              }}
            >
              Tutup
            </Button>
            <Button onClick={handleSaveWorker}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}