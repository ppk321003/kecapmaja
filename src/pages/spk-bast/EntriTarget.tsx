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
import { Combobox } from "@/components/ui/combobox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Mock data for SPK periods
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
  kecamatan?: string;
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
  spreadsheetRowIndex?: number;
  bebanAnggaran?: string;
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
  bebanAnggaran: string;
};

type KoordinatorOption = {
  nama: string;
  jabatan: string;
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
});

// Constants for spreadsheet IDs
const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const DATA_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";

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
  const [activitiesByPeriod, setActivitiesByPeriod] = useState<{[key: string]: Activity[]}>({});
  const [selectedWorkers, setSelectedWorkers] = useState<{[key: number]: {selected: boolean, target: string, realisasi: string}}>({});
  const [editingWorker, setEditingWorker] = useState<{activityId: number, worker: Worker} | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [petugasFromSheet, setPetugasFromSheet] = useState<PetugasFromSheet[]>([]);
  const [loadingPetugas, setLoadingPetugas] = useState(false);
  const [activityOptions, setActivityOptions] = useState<ActivityOption[]>([]);
  const [loadingActivityOptions, setLoadingActivityOptions] = useState(false);
  const [koordinatorOptions, setKoordinatorOptions] = useState<KoordinatorOption[]>([]);
  const [loadingKoordinatorOptions, setLoadingKoordinatorOptions] = useState(false);
  const [bebanAnggaran, setBebanAnggaran] = useState<string>("");
  const [loadingData, setLoadingData] = useState(false);
  
  const periodKey = `${selectedPeriod} ${selectedYear}-${selectedJobType}`;
  let activities = activitiesByPeriod[periodKey] || [];
  
  if (user?.role && user.role !== "Pejabat Pembuat Komitmen") {
    const allActivitiesForPeriod = Object.entries(activitiesByPeriod)
      .filter(([key]) => key.startsWith(`${selectedPeriod} ${selectedYear}-`))
      .flatMap(([, acts]) => acts);
    
    const allowedActivityNames = activityOptions.map(opt => opt.namaKegiatan);
    activities = activities.filter(act => allowedActivityNames.includes(act.namaKegiatan));
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      namaKegiatan: "",
      hargaSatuan: "",
      satuan: "",
      komponenPOK: "",
      nomorSK: "",
      koordinator: "",
    },
  });

  // Load petugas data from MASTER.MITRA sheet
  const loadPetugasFromSheet = async () => {
    try {
      setLoadingPetugas(true);
      console.log('Loading petugas data from MASTER.MITRA...');
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          operation: 'read',
          range: 'MASTER.MITRA!A:H',
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

      console.log('Raw petugas data:', data);

      if (!data?.values || data.values.length <= 1) {
        console.log('No petugas data in spreadsheet');
        setPetugasFromSheet([]);
        return;
      }

      const rows = data.values.slice(1);
      const petugasData: PetugasFromSheet[] = rows
        .map((row: any[], index: number) => ({
          id: index + 1,
          nama: row[2]?.toString().trim() || '',
          nik: row[1]?.toString().trim() || '',
          pekerjaan: row[3]?.toString().trim() || '',
          alamat: row[4]?.toString().trim() || '',
          bank: row[5]?.toString().trim() || '',
          rekening: row[6]?.toString().trim() || '',
          kecamatan: row[7]?.toString().trim() || '',
        }))
        .filter((petugas: PetugasFromSheet) => petugas.nama !== '');

      setPetugasFromSheet(petugasData);
      console.log('Petugas data loaded:', petugasData.length, 'petugas');
      
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

  // Convert petugas from sheet to worker format with kecamatan
  const petugasAsWorkers = useMemo(() => {
    return petugasFromSheet.map((petugas) => ({
      id: petugas.id,
      nama: petugas.nama,
      nip: petugas.nik,
      jabatan: petugas.pekerjaan || 'Petugas',
      target: "0",
      realisasi: "0",
      kecamatan: petugas.kecamatan || '',
    }));
  }, [petugasFromSheet]);

  // Get NIK from petugas data by name
  const getNikByNama = (nama: string): string => {
    const petugas = petugasFromSheet.find(p => p.nama === nama);
    return petugas?.nik || '';
  };

  // Get kecamatan from petugas data by name
  const getKecamatanByNama = (nama: string): string => {
    const petugas = petugasFromSheet.find(p => p.nama === nama);
    return petugas?.kecamatan || '';
  };

  // Calculate dynamic SPK data from activitiesByPeriod
  const dynamicSpkData = useMemo(() => {
    return spkData.map(month => {
      let totalActivities = 0;
      let totalTarget = 0;
      let totalValue = 0;
      let totalRealisasi = 0;
      const uniqueWorkers = new Set<string>();

      Object.entries(activitiesByPeriod).forEach(([key, activities]) => {
        if (key.includes(month.month) && key.includes(selectedYear)) {
          totalActivities += activities.length;
          
          activities.forEach(activity => {
            activity.workers.forEach(worker => {
              uniqueWorkers.add(worker.nama);
              totalTarget += parseFloat(worker.target || '0');
              
              const hargaSatuan = parseFloat(activity.hargaSatuan || '0');
              totalValue += parseFloat(worker.target || '0') * hargaSatuan;
              totalRealisasi += parseFloat(worker.realisasi || '0') * hargaSatuan;
            });
          });
        }
      });

      return {
        ...month,
        activities: totalActivities,
        workers: uniqueWorkers.size,
        target: totalTarget,
        value: totalValue,
        realisasi: totalRealisasi,
        sent: 0,
      };
    });
  }, [activitiesByPeriod, selectedYear]);

  // Calculate totals for the summary row
  const summaryData = useMemo(() => {
    return dynamicSpkData.reduce((acc, month) => ({
      activities: acc.activities + month.activities,
      workers: acc.workers + month.workers,
      target: acc.target + month.target,
      value: acc.value + month.value,
      realisasi: acc.realisasi + month.realisasi,
      sent: acc.sent + month.sent,
    }), { activities: 0, workers: 0, target: 0, value: 0, realisasi: 0, sent: 0 });
  }, [dynamicSpkData]);

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
      };
    });
  }, [activitiesByPeriod, selectedPeriod, selectedYear]);

  // Load activity options from spreadsheet based on user role
  const loadActivityOptions = async () => {
    if (!user?.role) return;
    
    try {
      setLoadingActivityOptions(true);
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8',
          operation: 'read',
          range: 'Sheet1!A:D',
        }
      });

      if (error) {
        console.error('Error loading activity options:', error);
        return;
      }

      if (!data?.values || data.values.length <= 1) {
        setActivityOptions([]);
        return;
      }

      const rows = data.values.slice(1);
      const options: ActivityOption[] = rows
        .map((row: any[], index: number) => ({
          no: parseInt(row[0]) || index + 1,
          role: row[1] || '',
          namaKegiatan: row[2] || '',
          bebanAnggaran: row[3] || '',
        }))
        .filter((option: ActivityOption) => {
          if (!option.namaKegiatan.trim()) return false;
          const roles = option.role.split('|').map(r => r.trim());
          return roles.includes(user.role);
        });

      setActivityOptions(options);
      
    } catch (error) {
      console.error('Error loading activity options:', error);
    } finally {
      setLoadingActivityOptions(false);
    }
  };

  // Load koordinator options from pengelola spreadsheet based on user role
  const loadKoordinatorOptions = async () => {
    if (!user?.role) return;
    
    try {
      setLoadingKoordinatorOptions(true);
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1x3v4BFYt6NiBq8XGP9Y-MgyD4CZXDhzuCT1eFAhzNxU',
          operation: 'read',
          range: 'Sheet1!A:D',
        }
      });

      if (error) {
        console.error('Error loading koordinator options:', error);
        return;
      }

      if (!data?.values || data.values.length <= 1) {
        setKoordinatorOptions([]);
        return;
      }

      const rows = data.values.slice(1);
      const options: KoordinatorOption[] = rows
        .map((row: any[]) => ({
          nama: row[1] || '',
          jabatan: row[3] || '',
        }))
        .filter((option: KoordinatorOption) => {
          if (!option.nama.trim()) return false;
          return option.jabatan === user.role;
        });

      setKoordinatorOptions(options);
      
    } catch (error) {
      console.error('Error loading koordinator options:', error);
    } finally {
      setLoadingKoordinatorOptions(false);
    }
  };

  // Handle perubahan nama kegiatan dan mengambil beban anggaran
  const handleNamaKegiatanChange = (selectedKegiatan: string) => {
    form.setValue("namaKegiatan", selectedKegiatan);
    
    const selectedActivity = activityOptions.find(option => option.namaKegiatan === selectedKegiatan);
    setBebanAnggaran(selectedActivity?.bebanAnggaran || "");
  };

  // Load data from spreadsheet on mount
  useEffect(() => {
    loadDataFromSpreadsheet();
    loadPetugasFromSheet();
    loadActivityOptions();
    loadKoordinatorOptions();
  }, [user?.role]);

  const loadDataFromSpreadsheet = async () => {
    try {
      setLoadingData(true);
      console.log('Loading data from spreadsheet...');
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: DATA_SPREADSHEET_ID,
          operation: 'read',
          range: 'Sheet1!A:W',
        }
      });

      if (error) {
        console.error('Error loading from spreadsheet:', error);
        toast({
          title: "Error",
          description: "Gagal memuat data dari spreadsheet",
          variant: "destructive",
        });
        return;
      }

      console.log('Raw spreadsheet data:', data);

      if (!data?.values || data.values.length <= 1) {
        console.log('No data in spreadsheet');
        setActivitiesByPeriod({});
        return;
      }

      const rows = data.values.slice(1);
      const activitiesMap: {[key: string]: Activity[]} = {};

      rows.forEach((row: any[], rowIndex: number) => {
        if (!row[0] || !row[2] || !row[3] || !row[4]) {
          return;
        }

        const periode = row[2]?.toString().trim() || '';
        const jenisPekerjaan = row[3]?.toString().trim() || '';
        const namaKegiatan = row[4]?.toString().trim() || '';
        const nomorSK = row[5]?.toString().trim() || '';
        
        const parseDate = (dateStr: string) => {
          if (!dateStr) return new Date();
          try {
            // Coba parsing format DD/MM/YYYY
            const parts = dateStr.toString().split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;
              const year = parseInt(parts[2]);
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                return new Date(year, month, day);
              }
            }
            // Fallback ke Date parsing
            const parsed = new Date(dateStr);
            return isNaN(parsed.getTime()) ? new Date() : parsed;
          } catch {
            return new Date();
          }
        };
        
        const tanggalSK = parseDate(row[6] || '');
        const tanggalMulai = parseDate(row[7] || '');
        const tanggalAkhir = parseDate(row[8] || '');
        const hargaSatuan = row[9]?.toString().trim() || '0';
        const satuan = row[10]?.toString().trim() || '';
        const koordinator = row[11]?.toString().trim() || '';
        const komponenPOK = row[12]?.toString().trim() || '';
        const bebanAnggaran = row[17]?.toString().trim() || '';
        
        const namaPetugasStr = row[13]?.toString().trim() || '';
        const targetStr = row[14]?.toString().trim() || '';
        const realisasiStr = row[15]?.toString().trim() || '';
        const nikListStr = row[22]?.toString().trim() || '';

        const namaPetugasList = namaPetugasStr.split('|').map((s: string) => s.trim()).filter(Boolean);
        const targetList = targetStr.split('|').map((s: string) => s.trim()).filter(Boolean);
        const realisasiList = realisasiStr.split('|').map((s: string) => s.trim()).filter(Boolean);
        const nikList = nikListStr.split('|').map((s: string) => s.trim()).filter(Boolean);

        const workers: Worker[] = namaPetugasList.map((nama: string, idx: number) => ({
          id: idx + 1,
          nama: nama,
          nip: nikList[idx] || getNikByNama(nama),
          jabatan: 'Petugas',
          target: targetList[idx] || '0',
          realisasi: realisasiList[idx] || '0',
          kecamatan: getKecamatanByNama(nama),
        }));

        const activity: Activity = {
          id: rowIndex + 1,
          namaKegiatan,
          tanggalMulai,
          tanggalAkhir,
          hargaSatuan,
          satuan,
          komponenPOK,
          nomorSK,
          tanggalSK,
          koordinator,
          workers,
          jobType: jenisPekerjaan,
          spreadsheetRowIndex: rowIndex + 2,
          bebanAnggaran,
        };

        const periodKey = `${periode}-${jenisPekerjaan}`;
        if (!activitiesMap[periodKey]) {
          activitiesMap[periodKey] = [];
        }
        activitiesMap[periodKey].push(activity);
      });

      setActivitiesByPeriod(activitiesMap);
      console.log('Activities loaded:', Object.values(activitiesMap).flat().length, 'activities');
      
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
    } finally {
      setLoadingData(false);
    }
  };

  const handleActionClick = (month: string) => {
    setSelectedPeriod(month);
    setShowJobTypesDialog(true);
  };

  const handleJobTypeClick = (jobTypeName: string) => {
    setSelectedJobType(jobTypeName);
    setShowProposalsDialog(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (editingActivity) {
        const updatedActivities = activities.map(activity => 
          activity.id === editingActivity.id 
            ? {
                ...activity,
                namaKegiatan: data.namaKegiatan,
                tanggalMulai: data.tanggalMulai,
                tanggalAkhir: data.tanggalAkhir,
                hargaSatuan: data.hargaSatuan,
                satuan: data.satuan,
                komponenPOK: activity.komponenPOK,
                nomorSK: data.nomorSK,
                tanggalSK: data.tanggalSK,
                koordinator: data.koordinator,
                bebanAnggaran: bebanAnggaran,
              }
            : activity
        );
        
        setActivitiesByPeriod(prev => ({
          ...prev,
          [periodKey]: updatedActivities
        }));

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
          id: Date.now(),
          namaKegiatan: data.namaKegiatan,
          tanggalMulai: data.tanggalMulai,
          tanggalAkhir: data.tanggalAkhir,
          hargaSatuan: data.hargaSatuan,
          satuan: data.satuan,
          komponenPOK: data.komponenPOK,
          nomorSK: data.nomorSK,
          tanggalSK: data.tanggalSK,
          koordinator: data.koordinator,
          workers: [],
          jobType: selectedJobType || "",
          bebanAnggaran: bebanAnggaran,
        };
        
        const rowIndex = await saveActivityToSpreadsheet(newActivity);
        if (rowIndex) {
          newActivity.spreadsheetRowIndex = rowIndex;
        }
        
        setActivitiesByPeriod(prev => ({
          ...prev,
          [periodKey]: [...activities, newActivity]
        }));
        
        toast({
          title: "Kegiatan berhasil ditambahkan",
          description: `Kegiatan "${data.namaKegiatan}" telah ditambahkan.`,
        });
      }
      
      setShowAddActivityDialog(false);
      form.reset();
      setBebanAnggaran("");
    } catch (error) {
      console.error('Error saving activity:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan kegiatan",
        variant: "destructive",
      });
    }
  };

  const handleDeleteActivity = async (id: number) => {
    const activityToDelete = activities.find(activity => activity.id === id);
    if (!activityToDelete) return;

    if (!confirm(`Apakah Anda yakin ingin menghapus kegiatan "${activityToDelete.namaKegiatan}"?`)) return;

    try {
      if (activityToDelete.spreadsheetRowIndex) {
        await deleteActivityFromSpreadsheet(activityToDelete.spreadsheetRowIndex);
      }

      const updatedActivities = activities.filter(activity => activity.id !== id);
      setActivitiesByPeriod(prev => ({
        ...prev,
        [periodKey]: updatedActivities
      }));
      
      toast({
        title: "Kegiatan berhasil dihapus",
        description: `Kegiatan "${activityToDelete.namaKegiatan}" telah dihapus.`,
      });
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Gagal menghapus kegiatan",
        description: error.message || "Terjadi kesalahan saat menghapus kegiatan",
        variant: "destructive",
      });
    }
  };

  const deleteActivityFromSpreadsheet = async (rowIndex: number) => {
    try {
      const { error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: DATA_SPREADSHEET_ID,
          operation: 'delete',
          rowIndex: rowIndex,
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error in deleteActivityFromSpreadsheet:', error);
      throw error;
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    form.reset({
      namaKegiatan: activity.namaKegiatan,
      tanggalMulai: activity.tanggalMulai,
      tanggalAkhir: activity.tanggalAkhir,
      hargaSatuan: activity.hargaSatuan,
      satuan: activity.satuan,
      komponenPOK: activity.komponenPOK,
      nomorSK: activity.nomorSK,
      tanggalSK: activity.tanggalSK,
      koordinator: activity.koordinator,
    });
    
    const selectedActivity = activityOptions.find(option => option.namaKegiatan === activity.namaKegiatan);
    setBebanAnggaran(selectedActivity?.bebanAnggaran || activity.bebanAnggaran || "");
    setShowAddActivityDialog(true);
  };

  const handleAddWorker = (activity: Activity) => {
    setSelectedActivityForWorkers(activity);
    const initialWorkers: {[key: number]: {selected: boolean, target: string, realisasi: string}} = {};
    petugasAsWorkers.forEach(worker => {
      initialWorkers[worker.id] = { selected: false, target: "0", realisasi: "0" };
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

    const updatedActivities = activities.map(activity => 
      activity.id === selectedActivityForWorkers.id 
        ? { ...activity, workers: [...activity.workers, ...newWorkers] }
        : activity
    );
    
    setActivitiesByPeriod(prev => ({
      ...prev,
      [periodKey]: updatedActivities
    }));
    
    const updatedActivity = updatedActivities.find(a => a.id === selectedActivityForWorkers.id);
    if (updatedActivity?.spreadsheetRowIndex) {
      await updateActivityInSpreadsheet(updatedActivity);
    }
    
    toast({
      title: "Petugas berhasil ditambahkan",
      description: `${newWorkers.length} petugas telah ditambahkan.`,
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
    
    setActivitiesByPeriod(prev => ({
      ...prev,
      [periodKey]: updatedActivities
    }));
    
    const updatedActivity = updatedActivities.find(a => a.id === activityId);
    if (updatedActivity?.spreadsheetRowIndex) {
      await updateActivityInSpreadsheet(updatedActivity);
    }
    
    toast({
      title: "Petugas berhasil dihapus",
      description: "Petugas telah dihapus dari kegiatan.",
    });
  };

  const handleEditWorker = (activityId: number, worker: Worker) => {
    setEditingWorker({ activityId, worker });
  };

  const handleUpdateWorker = async (activityId: number, workerId: number, newName: string, newTarget: string, newRealisasi: string) => {
    if (parseFloat(newRealisasi) > parseFloat(newTarget)) {
      toast({
        title: "Realisasi tidak valid",
        description: "Realisasi tidak boleh lebih besar dari Target.",
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
                ? { 
                    ...w, 
                    nama: newName, 
                    nip: getNikByNama(newName),
                    target: newTarget, 
                    realisasi: newRealisasi,
                    kecamatan: getKecamatanByNama(newName)
                  }
                : w
            )
          }
        : activity
    );
    
    setActivitiesByPeriod(prev => ({
      ...prev,
      [periodKey]: updatedActivities
    }));
    
    setEditingWorker(null);
    
    const updatedActivity = updatedActivities.find(a => a.id === activityId);
    if (updatedActivity?.spreadsheetRowIndex) {
      await updateActivityInSpreadsheet(updatedActivity);
    }
    
    toast({
      title: "Petugas berhasil diperbarui",
      description: "Data petugas telah diperbarui.",
    });
  };

  const saveActivityToSpreadsheet = async (activity: Activity): Promise<number | null> => {
    try {
      const { data: existingData } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: DATA_SPREADSHEET_ID,
          operation: 'read',
          range: 'Sheet1!A:A',
        }
      });

      const nextRowIndex = existingData?.values ? existingData.values.length + 1 : 2;
      const nextNo = existingData?.values ? existingData.values.length : 1;

      const nikList = activity.workers.map(w => w.nip).join(" | ");

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
          activity.satuan,
          activity.koordinator,
          getKomponenPOKLabel(activity.komponenPOK),
          "",
          "",
          "",
          "",
          "",
          activity.bebanAnggaran || "",
          "",
          "",
          "",
          nikList,
        ]
      ];

      const { error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: DATA_SPREADSHEET_ID,
          operation: 'append',
          range: 'Sheet1',
          values: rowData,
        }
      });

      if (error) throw error;
      
      return nextRowIndex;
    } catch (error) {
      console.error('Error saving to spreadsheet:', error);
      throw error;
    }
  };

  const updateActivityInSpreadsheet = async (activity: Activity) => {
    if (!activity.spreadsheetRowIndex) return;

    try {
      const namaPetugas = activity.workers.map(w => w.nama).join(" | ");
      const targetList = activity.workers.map(w => w.target).join(" | ");
      const realisasiList = activity.workers.map(w => w.realisasi).join(" | ");
      const nikList = activity.workers.map(w => w.nip).join(" | ");

      const rowData = [
        [
          (activity.spreadsheetRowIndex - 1).toString(),
          user?.role || "User",
          `${selectedPeriod} ${selectedYear}`,
          selectedJobType || "",
          activity.namaKegiatan,
          activity.nomorSK,
          format(activity.tanggalSK, "dd/MM/yyyy"),
          format(activity.tanggalMulai, "dd/MM/yyyy"),
          format(activity.tanggalAkhir, "dd/MM/yyyy"),
          activity.hargaSatuan,
          activity.satuan,
          activity.koordinator,
          getKomponenPOKLabel(activity.komponenPOK),
          namaPetugas,
          targetList,
          realisasiList,
          "",
          "",
          activity.bebanAnggaran || "",
          "",
          "",
          "",
          nikList,
        ]
      ];

      const { error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: DATA_SPREADSHEET_ID,
          operation: 'update',
          range: 'Sheet1',
          rowIndex: activity.spreadsheetRowIndex,
          values: rowData,
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating spreadsheet:', error);
      throw error;
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

    try {
      await updateActivityInSpreadsheet(activity);
      
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

  const hasTargetButNoRealisasi = (worker: Worker) => {
    const target = parseFloat(worker.target || '0');
    const realisasi = parseFloat(worker.realisasi || '0');
    return target > 0 && realisasi === 0;
  };

  const getAvailableWorkers = (activity: Activity, excludeWorkerId?: number) => {
    const existingWorkerIds = activity.workers
      .filter(w => w.id !== excludeWorkerId)
      .map(w => w.id);
    
    return petugasAsWorkers
      .filter(w => !existingWorkerIds.includes(w.id))
      .map(w => ({
        value: w.nama,
        label: `${w.nama} (${w.kecamatan}) - ${w.nip}`,
      }));
  };

  const filteredWorkers = useMemo(() => {
    if (!searchTerm) return petugasAsWorkers;
    
    const lowerSearch = searchTerm.toLowerCase();
    return petugasAsWorkers.filter(w => 
      w.nama.toLowerCase().includes(lowerSearch) || 
      w.kecamatan?.toLowerCase().includes(lowerSearch) ||
      w.nip.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, petugasAsWorkers]);

  const getJobTypeInfo = (jobType: string) => {
    switch(jobType) {
      case "Petugas Pendataan Lapangan":
        return { color: "bg-blue-100 border-blue-300 text-blue-800", label: "Entri Petugas Pendataan Lapangan" };
      case "Petugas Pemeriksaan Lapangan":
        return { color: "bg-green-100 border-green-300 text-green-800", label: "Entri Petugas Pemeriksaan Lapangan" };
      case "Petugas Pengolahan":
        return { color: "bg-orange-100 border-orange-300 text-orange-800", label: "Entri Petugas Pengolahan" };
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
                    <TableHead className="text-center">Jumlah Kegiatan</TableHead>
                    <TableHead className="text-center">Jumlah Petugas</TableHead>
                    <TableHead className="text-center">Target Pekerjaan</TableHead>
                    <TableHead className="text-right">Nilai Perjanjian Rp.</TableHead>
                    <TableHead className="text-right">Nilai Realisasi Rp.</TableHead>
                    <TableHead className="text-center">Dikirim ke PPK</TableHead>
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
                      <TableCell className="text-center">{item.target}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.realisasi)}</TableCell>
                      <TableCell className="text-center">{item.sent}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleActionClick(item.month)}
                          title="Entri"
                        >
                          <LogIn className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/10 font-semibold">
                    <TableCell colSpan={2} className="text-center">JUMLAH</TableCell>
                    <TableCell className="text-center">{summaryData.activities}</TableCell>
                    <TableCell className="text-center">{summaryData.workers}</TableCell>
                    <TableCell className="text-center">{summaryData.target}</TableCell>
                    <TableCell className="text-right">{formatCurrency(summaryData.value)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(summaryData.realisasi)}</TableCell>
                    <TableCell className="text-center">{summaryData.sent}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showJobTypesDialog} onOpenChange={setShowJobTypesDialog}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              Pilih Jenis Pekerjaan untuk SPK Bulan {selectedPeriod} {selectedYear}
            </DialogTitle>
          </DialogHeader>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">No.</TableHead>
                  <TableHead>Jenis Pekerjaan</TableHead>
                  <TableHead className="text-center">Jumlah Kegiatan</TableHead>
                  <TableHead className="text-center">Jumlah Petugas</TableHead>
                  <TableHead className="text-center">Target Pekerjaan</TableHead>
                  <TableHead className="text-right">Nilai Perjanjian Rp.</TableHead>
                  <TableHead className="text-right">Nilai Realisasi Rp.</TableHead>
                  <TableHead className="text-center">Dikirim ke PPK</TableHead>
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

      <Dialog open={showProposalsDialog} onOpenChange={setShowProposalsDialog}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 rounded-none">
          <DialogHeader>
            <DialogTitle>Daftar Usulan SPK</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 p-4 overflow-y-auto h-[calc(100vh-8rem)]">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-sm">
                <div className="font-semibold">SPK Bulan {selectedPeriod} {selectedYear}</div>
                <div className="text-muted-foreground">{selectedJobType}</div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">
                Total {activities.length} kegiatan
              </div>
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
                  {activities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        {loadingData ? "Memuat data..." : "Belum ada kegiatan."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    activities.map((activity, index) => (
                      <>
                        <TableRow key={activity.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{activity.namaKegiatan}</TableCell>
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
                                onClick={() => handleAddWorker(activity)}
                                title="Tambah Petugas"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditActivity(activity)}
                                title="Edit Kegiatan"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSendToPPK(activity.id)}
                                title="Kirim ke PPK"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteActivity(activity.id)}
                                title="Hapus Kegiatan"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {activity.workers.map((worker, workerIndex) => (
                          <TableRow 
                            key={`${activity.id}-worker-${worker.id}`} 
                            className={cn(
                              "bg-muted/30",
                              hasTargetButNoRealisasi(worker) && "bg-yellow-50 border-l-4 border-l-yellow-400"
                            )}
                          >
                            <TableCell></TableCell>
                            <TableCell colSpan={2} className="pl-8">
                              {editingWorker?.activityId === activity.id && editingWorker.worker.id === worker.id ? (
                                <Combobox
                                  options={getAvailableWorkers(activity, worker.id)}
                                  value={worker.nama}
                                  onValueChange={(value) => handleUpdateWorker(activity.id, worker.id, value, worker.target, worker.realisasi)}
                                  placeholder="Pilih petugas"
                                  searchPlaceholder="Cari nama petugas..."
                                />
                              ) : (
                                <span className="text-sm">
                                  {workerIndex + 1}. {worker.nama} ({worker.kecamatan}) - NIK: {worker.nip}
                                  {hasTargetButNoRealisasi(worker) && (
                                    <span className="ml-2 text-xs text-yellow-600 font-medium">(Belum Realisasi)</span>
                                  )}
                                </span>
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
                                  onClick={() => handleEditWorker(activity.id, worker)}
                                  title="Edit Petugas"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
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

      <Dialog open={showAddActivityDialog} onOpenChange={(open) => {
        setShowAddActivityDialog(open);
        if (!open) {
          setEditingActivity(null);
          form.reset();
          setBebanAnggaran("");
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? "Edit Kegiatan" : "Tambah Kegiatan"}
            </DialogTitle>
          </DialogHeader>

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
                    <Combobox
                      options={activityOptions.map(option => ({
                        value: option.namaKegiatan,
                        label: option.namaKegiatan
                      }))}
                      value={field.value}
                      onValueChange={handleNamaKegiatanChange}
                      placeholder={loadingActivityOptions ? "Memuat kegiatan..." : "Pilih atau cari kegiatan"}
                      searchPlaceholder="Cari nama kegiatan..."
                      disabled={loadingActivityOptions}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {bebanAnggaran && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-800">
                    <strong>Beban Anggaran:</strong> {bebanAnggaran}
                  </AlertDescription>
                </Alert>
              )}

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
                      <FormLabel>Tanggal Mulai <span className="text-destructive">*</span></FormLabel>
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
                      <FormLabel>Tanggal Akhir <span className="text-destructive">*</span></FormLabel>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih satuan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BS">BS</SelectItem>
                          <SelectItem value="Dokumen">Dokumen</SelectItem>
                          <SelectItem value="EA">EA</SelectItem>
                          <SelectItem value="Lembaga">Lembaga</SelectItem>
                          <SelectItem value="Rumahtangga">Rumahtangga</SelectItem>
                          <SelectItem value="Segmen">Segmen</SelectItem>
                          <SelectItem value="SLS">SLS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="koordinator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Koordinator <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingKoordinatorOptions}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingKoordinatorOptions ? "Memuat koordinator..." : "Pilih koordinator"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {koordinatorOptions.map((option, index) => (
                            <SelectItem key={index} value={option.nama}>
                              {option.nama}
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!editingActivity}>
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddActivityDialog(false)}
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

      <Dialog open={showAddWorkerDialog} onOpenChange={setShowAddWorkerDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tambah Petugas</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-sm">
                <div className="font-semibold">Kegiatan: {selectedActivityForWorkers?.namaKegiatan}</div>
                <div className="text-muted-foreground">Nomor SK: {selectedActivityForWorkers?.nomorSK}</div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, kecamatan, atau NIK petugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

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
                            const isAlreadyAdded = selectedActivityForWorkers?.workers.some(aw => aw.id === w.id);
                            if (!isAlreadyAdded) {
                              newSelected[w.id] = { 
                                selected: checked as boolean, 
                                target: newSelected[w.id]?.target || "0",
                                realisasi: newSelected[w.id]?.realisasi || "0"
                              };
                            }
                          });
                          setSelectedWorkers(newSelected);
                        }}
                      />
                    </TableHead>
                    <TableHead>Nama Petugas</TableHead>
                    <TableHead>Kecamatan</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>Pekerjaan</TableHead>
                    <TableHead className="w-28">Target</TableHead>
                    <TableHead className="w-28">Realisasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkers.map((petugas) => {
                    const isAlreadyAdded = selectedActivityForWorkers?.workers.some(w => w.id === petugas.id);
                    
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
                                  target: selectedWorkers[petugas.id]?.target || "0",
                                  realisasi: selectedWorkers[petugas.id]?.realisasi || "0",
                                }
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>{petugas.nama} {isAlreadyAdded && "(Sudah terdaftar)"}</TableCell>
                        <TableCell>{petugas.kecamatan}</TableCell>
                        <TableCell>{petugas.nip}</TableCell>
                        <TableCell>{petugas.jabatan}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="0"
                            value={selectedWorkers[petugas.id]?.target || ""}
                            onChange={(e) => {
                              setSelectedWorkers({
                                ...selectedWorkers,
                                [petugas.id]: {
                                  ...selectedWorkers[petugas.id],
                                  target: e.target.value,
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
                              setSelectedWorkers({
                                ...selectedWorkers,
                                [petugas.id]: {
                                  ...selectedWorkers[petugas.id],
                                  realisasi: e.target.value,
                                }
                              });
                            }}
                            disabled={!selectedWorkers[petugas.id]?.selected || isAlreadyAdded}
                            className="h-8"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddWorkerDialog(false)}
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