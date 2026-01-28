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
import { Trash2, CalendarIcon, UserPlus, Pencil, Send, LogIn, Search, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { format, parse, addMonths, differenceInMonths, endOfMonth, isBefore, isAfter } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { useMitraStatistik } from "@/hooks/use-database";
import { supabase } from "@/integrations/supabase/client";

// =============================================
// FUNGSI UTILITY BARU UNTUK KONSISTENSI
// =============================================

/**
 * Fungsi pembersihan angka - SAMA dengan Skrip 1
 */
const cleanNumberValue = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const stringValue = value.toString().trim();
  if (stringValue === '') return 0;

  // Hilangkan semua karakter non-numeric kecuali titik, koma, dan minus
  const cleanValue = stringValue.replace(/[^\d,.-]/g, '') // Hapus karakter non-numeric
  .replace(',', '.') // Ubah koma menjadi titik
  .replace(/(\..*)\./g, '$1'); // Hapus titik duplikat

  const numberValue = parseFloat(cleanValue);
  return isNaN(numberValue) ? 0 : numberValue;
};

/**
 * Fungsi pemrosesan multiple values - SAMA dengan Skrip 1
 */
const processMultipleValues = (text: string, separator: string = '|'): string[] => {
  if (!text) return [];
  return text.toString().split(separator).map(item => item.trim()).filter(item => item !== '');
};

/**
 * Fungsi perhitungan total kegiatan - MENGIKUTI SKRIP 1 (per petugas)
 */
const calculateActivityTotal = (activity: Activity): number => {
  const hargaSatuan = cleanNumberValue(activity.hargaSatuan);
  let total = 0;

  // Hitung per petugas seperti di Skrip 1
  activity.workers.forEach(worker => {
    const realisasi = cleanNumberValue(worker.realisasi);
    const nilaiPetugas = hargaSatuan * realisasi;
    total += nilaiPetugas;
  });
  return total;
};

/**
 * Fungsi perhitungan target total - MENGIKUTI SKRIP 1
 */
const calculateActivityTarget = (activity: Activity): number => {
  const hargaSatuan = cleanNumberValue(activity.hargaSatuan);
  let totalTarget = 0;

  // Hitung per petugas seperti di Skrip 1
  activity.workers.forEach(worker => {
    const target = cleanNumberValue(worker.target);
    const nilaiTarget = hargaSatuan * target;
    totalTarget += nilaiTarget;
  });
  return totalTarget;
};

/**
 * Fungsi perhitungan total realisasi (jumlah realisasi)
 */
const calculateTotalRealisasi = (activity: Activity): number => {
  let totalRealisasi = 0;
  activity.workers.forEach(worker => {
    const realisasi = cleanNumberValue(worker.realisasi);
    totalRealisasi += realisasi;
  });
  return totalRealisasi;
};

// Mock data for SPK periods
const spkData = [{
  id: 1,
  month: "Januari",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 2,
  month: "Februari",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 3,
  month: "Maret",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 4,
  month: "April",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 5,
  month: "Mei",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 6,
  month: "Juni",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 7,
  month: "Juli",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 8,
  month: "Agustus",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 9,
  month: "September",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 10,
  month: "Oktober",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 11,
  month: "November",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}, {
  id: 12,
  month: "Desember",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  realisasi: 0,
  sent: 0
}];

// Job types options
const jobTypes = [{
  id: 1,
  name: "Petugas Pendataan Lapangan",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  sent: 0,
  approved: 0
}, {
  id: 2,
  name: "Petugas Pemeriksaan Lapangan",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  sent: 0,
  approved: 0
}, {
  id: 3,
  name: "Petugas Pengolahan",
  activities: 0,
  workers: 0,
  target: 0,
  value: 0,
  sent: 0,
  approved: 0
}];
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
  dikirimKePPK?: string;
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
  harga: string;
  satuan: string;
};
type KoordinatorOption = {
  nama: string;
  jabatan: string;
};
const komponenPOKOptions = [{
  value: "005",
  label: "005 - Dukungan Penyelenggaraan Tugas dan Fungsi Unit"
}, {
  value: "051",
  label: "051 - PERSIAPAN"
}, {
  value: "052",
  label: "052 - PENGUMPULAN DATA"
}, {
  value: "053",
  label: "053 - PENGOLAHAN DAN ANALISIS"
}, {
  value: "054",
  label: "054 - DISEMINASI DAN EVALUASI"
}, {
  value: "506",
  label: "506 - Pemutakhiran Kerangka Geospasial dan Muatan Wilkerstat"
}, {
  value: "516",
  label: "516 - Updating Direktori Usaha/Perusahaan Ekonomi Lanjutan"
}, {
  value: "519",
  label: "519 - Penyusunan Bahan Publisitas"
}];
const formSchema = z.object({
  namaKegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  tanggalSK: z.date({
    required_error: "Tanggal SK wajib diisi"
  }),
  tanggalMulai: z.date({
    required_error: "Tanggal mulai wajib diisi"
  }),
  tanggalAkhir: z.date({
    required_error: "Tanggal akhir wajib diisi"
  }),
  hargaSatuan: z.string().min(1, "Harga satuan wajib diisi").refine(val => {
    const num = cleanNumberValue(val);
    return !isNaN(num) && num >= 0;
  }, "Harga satuan harus berupa angka positif"),
  satuan: z.string().min(1, "Satuan wajib dipilih"),
  komponenPOK: z.string().min(1, "Komponen POK wajib dipilih"),
  nomorSK: z.string().min(1, "Nomor SK wajib diisi"),
  koordinator: z.string().min(1, "Koordinator wajib dipilih")
}).refine(data => data.tanggalMulai >= data.tanggalSK, {
  message: "Tanggal mulai kegiatan tidak boleh lebih awal dari tanggal SK",
  path: ["tanggalMulai"]
}).refine(data => data.tanggalAkhir >= data.tanggalSK, {
  message: "Tanggal akhir kegiatan tidak boleh lebih awal dari tanggal SK",
  path: ["tanggalAkhir"]
}).refine(data => data.tanggalAkhir >= data.tanggalMulai, {
  message: "Tanggal akhir kegiatan tidak boleh lebih awal dari tanggal mulai",
  path: ["tanggalAkhir"]
});
const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const DATA_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";
const bulanMap: {
  [key: string]: string;
} = {
  'januari': 'January',
  'februari': 'February',
  'maret': 'March',
  'april': 'April',
  'mei': 'May',
  'juni': 'June',
  'juli': 'July',
  'agustus': 'August',
  'september': 'September',
  'oktober': 'October',
  'november': 'November',
  'desember': 'December'
};
const bulanList = [{
  value: "Januari",
  label: "Januari"
}, {
  value: "Februari",
  label: "Februari"
}, {
  value: "Maret",
  label: "Maret"
}, {
  value: "April",
  label: "April"
}, {
  value: "Mei",
  label: "Mei"
}, {
  value: "Juni",
  label: "Juni"
}, {
  value: "Juli",
  label: "Juli"
}, {
  value: "Agustus",
  label: "Agustus"
}, {
  value: "September",
  label: "September"
}, {
  value: "Oktober",
  label: "Oktober"
}, {
  value: "November",
  label: "November"
}, {
  value: "Desember",
  label: "Desember"
}];
export default function EntriTarget() {
  const {
    user
  } = useAuth();
  const satkerConfig = useSatkerConfigContext();
  
  // Dapatkan sheet ID berdasarkan satker user (untuk entrikegiatan)
  const userDataSheetId = satkerConfig?.getUserSatkerSheetId('entrikegiatan') || DATA_SPREADSHEET_ID;
  
  // Dapatkan sheet ID untuk MASTER.ORGANIK berdasarkan satker user (untuk koordinator dropdown)
  const masterOrganikSheetId = satkerConfig?.getUserSatkerSheetId('masterorganik') || MASTER_SPREADSHEET_ID;
  
  // Gunakan hook untuk mengambil data mitra dari MASTER.MITRA (adopsi dari use-database.ts)
  const { data: mitraStatistikData, loading: loadingMitra } = useMitraStatistik();
  
  // Convert mitra data ke format PetugasFromSheet
  useEffect(() => {
    if (mitraStatistikData && mitraStatistikData.length > 0) {
      const petugasData: PetugasFromSheet[] = mitraStatistikData.map((mitra: any, index: number) => ({
        id: index + 1,
        nama: mitra.name || '',
        nik: mitra.nik || '',
        pekerjaan: mitra.pekerjaan || '',
        alamat: mitra.alamat || '',
        bank: mitra.bank || '',
        rekening: mitra.rekening || '',
        kecamatan: mitra.kecamatan || ''
      }));
      setPetugasFromSheet(petugasData);
      console.log(`✅ Loaded ${petugasData.length} mitra data from hook`);
    }
  }, [mitraStatistikData]);
  
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const [showJobTypesDialog, setShowJobTypesDialog] = useState(false);
  const [showProposalsDialog, setShowProposalsDialog] = useState(false);
  const [showAddActivityDialog, setShowAddActivityDialog] = useState(false);
  const [showAddWorkerDialog, setShowAddWorkerDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [selectedActivityForWorkers, setSelectedActivityForWorkers] = useState<Activity | null>(null);
  const [activitiesByPeriod, setActivitiesByPeriod] = useState<{
    [key: string]: Activity[];
  }>({});
  const [selectedWorkers, setSelectedWorkers] = useState<{
    [key: number]: {
      selected: boolean;
      target: string;
      realisasi: string;
    };
  }>({});
  const [editingWorker, setEditingWorker] = useState<{
    activityId: number;
    worker: Worker;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [petugasFromSheet, setPetugasFromSheet] = useState<PetugasFromSheet[]>([]);
  const [activityOptions, setActivityOptions] = useState<ActivityOption[]>([]);
  const [loadingActivityOptions, setLoadingActivityOptions] = useState(false);
  const [koordinatorOptions, setKoordinatorOptions] = useState<KoordinatorOption[]>([]);
  const [loadingKoordinatorOptions, setLoadingKoordinatorOptions] = useState(false);
  const [bebanAnggaran, setBebanAnggaran] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // State untuk fitur duplikat
  const [duplicatingActivity, setDuplicatingActivity] = useState<Activity | null>(null);
  const [showDuplicatePopover, setShowDuplicatePopover] = useState(false);
  const [duplicateTargetPeriod, setDuplicateTargetPeriod] = useState<string>("");
  const [duplicateTargetYear, setDuplicateTargetYear] = useState<string>("");
  const [isDuplicating, setIsDuplicating] = useState(false);
  const periodKey = `${selectedPeriod} ${selectedYear}-${selectedJobType}`;
  let activities = activitiesByPeriod[periodKey] || [];
  if (user?.role && user.role !== "Pejabat Pembuat Komitmen") {
    const allActivitiesForPeriod = Object.entries(activitiesByPeriod).filter(([key]) => key.startsWith(`${selectedPeriod} ${selectedYear}-`)).flatMap(([, acts]) => acts);
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
      koordinator: ""
    }
  });
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ',-';
  };

  // Fungsi untuk mendapatkan bulan yang diizinkan untuk duplikat
  const getAllowedMonths = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11
    const currentYear = currentDate.getFullYear();

    // 2 bulan terakhir + semua bulan masa depan
    const allowedMonths = bulanList.filter((_, index) => {
      const monthIndex = index; // Januari = 0, Desember = 11
      const monthYear = parseInt(duplicateTargetYear || selectedYear);
      if (monthYear > currentYear) {
        return true; // Semua bulan di tahun depan diizinkan
      } else if (monthYear === currentYear) {
        return monthIndex >= currentMonth - 2; // 2 bulan terakhir + masa depan
      } else {
        return false; // Tahun sebelumnya tidak diizinkan
      }
    });
    return allowedMonths;
  };

  // Fungsi untuk menghitung tanggal baru berdasarkan selisih bulan
  const calculateNewDates = (originalDate: Date, sourceMonth: string, targetMonth: string, sourceYear: string, targetYear: string) => {
    const sourceMonthIndex = bulanList.findIndex(b => b.value === sourceMonth);
    const targetMonthIndex = bulanList.findIndex(b => b.value === targetMonth);
    const sourceDate = new Date(parseInt(sourceYear), sourceMonthIndex, originalDate.getDate());
    const targetDate = new Date(parseInt(targetYear), targetMonthIndex, originalDate.getDate());

    // Jika tanggal tidak valid (misal: 31 Februari), set ke akhir bulan
    if (targetDate.getMonth() !== targetMonthIndex) {
      return endOfMonth(new Date(parseInt(targetYear), targetMonthIndex));
    }
    return targetDate;
  };

  // Fungsi untuk menangani klik tombol duplikat
  const handleDuplicateClick = (activity: Activity) => {
    setDuplicatingActivity(activity);
    setDuplicateTargetPeriod("");
    setDuplicateTargetYear(selectedYear);
    setShowDuplicatePopover(true);
  };

  // Fungsi untuk konfirmasi duplikat
  const handleDuplicateConfirm = async () => {
    if (!duplicatingActivity || !duplicateTargetPeriod || !duplicateTargetYear) {
      toast({
        title: "Data tidak lengkap",
        description: "Pilih periode tujuan untuk duplikat",
        variant: "destructive"
      });
      return;
    }

    // Validasi: tidak bisa duplikat ke periode yang sama
    if (duplicateTargetPeriod === selectedPeriod && duplicateTargetYear === selectedYear) {
      toast({
        title: "Tidak dapat duplikat",
        description: "Tidak dapat menduplikat ke periode yang sama",
        variant: "destructive"
      });
      return;
    }
    setIsDuplicating(true);
    try {
      // Hitung tanggal baru
      const newTanggalMulai = calculateNewDates(duplicatingActivity.tanggalMulai, selectedPeriod!, duplicateTargetPeriod, selectedYear, duplicateTargetYear);
      const newTanggalAkhir = calculateNewDates(duplicatingActivity.tanggalAkhir, selectedPeriod!, duplicateTargetPeriod, selectedYear, duplicateTargetYear);

      // Buat aktivitas baru dengan data yang diduplikasi
      const duplicatedActivity: Activity = {
        ...duplicatingActivity,
        id: Date.now(),
        // ID baru
        tanggalMulai: newTanggalMulai,
        tanggalAkhir: newTanggalAkhir,
        tanggalSK: duplicatingActivity.tanggalSK,
        // Tanggal SK tetap sama
        workers: duplicatingActivity.workers.map(worker => ({
          ...worker,
          id: Date.now() + Math.random() // ID worker baru
        })),
        dikirimKePPK: "",
        // Reset status PPK
        spreadsheetRowIndex: undefined // Reset row index
      };

      // Simpan ke spreadsheet
      const rowIndex = await saveActivityToSpreadsheet(duplicatedActivity, duplicateTargetPeriod, duplicateTargetYear);
      if (rowIndex) {
        duplicatedActivity.spreadsheetRowIndex = rowIndex;
      }

      // Update state
      const targetPeriodKey = `${duplicateTargetPeriod} ${duplicateTargetYear}-${selectedJobType}`;
      setActivitiesByPeriod(prev => ({
        ...prev,
        [targetPeriodKey]: [...(prev[targetPeriodKey] || []), duplicatedActivity]
      }));
      toast({
        title: "Duplikat berhasil",
        description: `Kegiatan berhasil diduplikat ke ${duplicateTargetPeriod} ${duplicateTargetYear}`
      });

      // Reset state
      setShowDuplicatePopover(false);
      setDuplicatingActivity(null);
      setDuplicateTargetPeriod("");
      setDuplicateTargetYear("");
    } catch (error) {
      console.error('Error duplicating activity:', error);
      toast({
        title: "Gagal menduplikat",
        description: "Terjadi kesalahan saat menduplikat kegiatan",
        variant: "destructive"
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  // Reset state duplikat
  const resetDuplicateState = () => {
    setShowDuplicatePopover(false);
    setDuplicatingActivity(null);
    setDuplicateTargetPeriod("");
    setDuplicateTargetYear("");
  };

  // Fungsi konfirmasi delete dengan sweet alert
  const confirmDelete = (message: string): Promise<boolean> => {
    return new Promise(resolve => {
      if (window.confirm(message)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  };
  const parseDateFromSpreadsheet = (dateStr: string): Date => {
    if (!dateStr || dateStr.toString().trim() === '') {
      return new Date();
    }
    const str = dateStr.toString().trim();
    if (/^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(str)) {
      try {
        const parts = str.split(' ');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const monthName = parts[1].toLowerCase();
          const year = parseInt(parts[2]);
          const englishMonth = bulanMap[monthName];
          if (englishMonth && !isNaN(day) && !isNaN(year)) {
            const parsedDate = parse(str, 'd MMMM yyyy', new Date(), {
              locale: id
            });
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse Indonesian date:', str, e);
      }
    }
    if (str.includes('/')) {
      try {
        const parts = str.split('/').map(part => part.trim());
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            const fullYear = year < 100 ? 2000 + year : year;
            const parsedDate = new Date(fullYear, month, day);
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse date with / format:', str, e);
      }
    }
    if (/^\d+\.?\d*$/.test(str)) {
      try {
        const excelDate = parseFloat(str);
        const baseDate = new Date(1900, 0, 1);
        const date = new Date(baseDate.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        console.warn('Failed to parse Excel date:', str, e);
      }
    }
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
  const petugasAsWorkers = useMemo(() => {
    return petugasFromSheet.map((petugas, index) => ({
      id: index + 1,
      nama: petugas.nama,
      nip: petugas.nik,
      jabatan: petugas.pekerjaan || 'Petugas',
      target: "0",
      realisasi: "0",
      kecamatan: petugas.kecamatan || ''
    }));
  }, [petugasFromSheet]);
  const getNikByNama = (nama: string): string => {
    const petugas = petugasFromSheet.find(p => p.nama === nama);
    return petugas?.nik || '';
  };
  const getKecamatanByNama = (nama: string): string => {
    const petugas = petugasFromSheet.find(p => p.nama === nama);
    return petugas?.kecamatan || '';
  };
  const getPetugasByNama = (nama: string): PetugasFromSheet | undefined => {
    return petugasFromSheet.find(p => p.nama === nama);
  };
  const getPetugasByNik = (nik: string): PetugasFromSheet | undefined => {
    return petugasFromSheet.find(p => p.nik === nik);
  };
  const getKomponenPOKValueFromLabel = (label: string): string => {
    const option = komponenPOKOptions.find(opt => opt.label === label);
    return option ? option.value : label;
  };
  const getKomponenPOKLabelFromValue = (value: string): string => {
    const option = komponenPOKOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };
  const calculateSentToPPK = (activities: Activity[]) => {
    return activities.filter(activity => {
      return activity.dikirimKePPK && activity.dikirimKePPK.includes("Kirim ke PPK");
    }).length;
  };

  // =============================================
  // PERBAIKAN 1: KONVERSI ANGKA YANG KONSISTEN
  // =============================================

  const dynamicSpkData = useMemo(() => {
    const monthlyData = spkData.map(month => {
      let totalActivities = 0;
      let totalTarget = 0;
      let totalValue = 0;
      let totalRealisasi = 0;
      let totalSent = 0;
      const uniqueWorkers = new Set<string>();
      Object.entries(activitiesByPeriod).forEach(([key, monthActivities]) => {
        if (key.includes(month.month) && key.includes(selectedYear)) {
          // PERBAIKAN: Filter activities berdasarkan role user
          let filteredActivities = monthActivities;
          if (user?.role && user.role !== "Pejabat Pembuat Komitmen") {
            const allowedActivityNames = activityOptions.map(opt => opt.namaKegiatan);
            filteredActivities = monthActivities.filter(act => allowedActivityNames.includes(act.namaKegiatan));
          }
          totalActivities += filteredActivities.length;
          filteredActivities.forEach(activity => {
            activity.workers.forEach(worker => uniqueWorkers.add(worker.nip));

            // PERBAIKAN: Gunakan cleanNumberValue dan hitung seperti Skrip 1
            const activityTarget = activity.workers.reduce((sum, w) => {
              return sum + cleanNumberValue(w.target);
            }, 0);
            totalTarget += activityTarget;

            // PERBAIKAN: Hitung nilai perjanjian seperti Skrip 1 (per petugas)
            const hargaSatuan = cleanNumberValue(activity.hargaSatuan);
            const nilaiPerjanjian = calculateActivityTarget(activity); // Menggunakan fungsi baru
            totalValue += nilaiPerjanjian;

            // PERBAIKAN: Hitung nilai realisasi seperti Skrip 1 (per petugas)
            const nilaiRealisasi = calculateActivityTotal(activity); // Menggunakan fungsi baru
            totalRealisasi += nilaiRealisasi;
          });
          totalSent += calculateSentToPPK(filteredActivities);
        }
      });
      return {
        ...month,
        activities: totalActivities,
        workers: uniqueWorkers.size,
        target: totalTarget,
        value: totalValue,
        realisasi: totalRealisasi,
        sent: totalSent
      };
    });
    return monthlyData;
  }, [activitiesByPeriod, selectedYear, user?.role, activityOptions]);
  const summaryData = useMemo(() => {
    return dynamicSpkData.reduce((acc, month) => {
      return {
        activities: acc.activities + month.activities,
        workers: acc.workers + month.workers,
        target: acc.target + month.target,
        value: acc.value + month.value,
        realisasi: acc.realisasi + month.realisasi,
        sent: acc.sent + month.sent
      };
    }, {
      activities: 0,
      workers: 0,
      target: 0,
      value: 0,
      realisasi: 0,
      sent: 0
    });
  }, [dynamicSpkData]);

  // =============================================
  // PERBAIKAN 2: PENANGANAN MULTIPLE VALUES KONSISTEN
  // =============================================

  const dynamicJobTypes = useMemo(() => {
    return jobTypes.map(jobType => {
      const key = `${selectedPeriod} ${selectedYear}-${jobType.name}`;
      const jobActivities = activitiesByPeriod[key] || [];

      // PERBAIKAN: Filter activities berdasarkan role user
      let filteredJobActivities = jobActivities;
      if (user?.role && user.role !== "Pejabat Pembuat Komitmen") {
        const allowedActivityNames = activityOptions.map(opt => opt.namaKegiatan);
        filteredJobActivities = jobActivities.filter(act => allowedActivityNames.includes(act.namaKegiatan));
      }
      let totalTarget = 0;
      let totalValue = 0;
      let totalRealisasi = 0;
      let totalSent = 0;
      const uniqueWorkers = new Set<string>();
      filteredJobActivities.forEach(activity => {
        const hargaSatuan = cleanNumberValue(activity.hargaSatuan);

        // PERBAIKAN: Gunakan cleanNumberValue secara konsisten
        const activityTarget = activity.workers.reduce((sum, worker) => {
          uniqueWorkers.add(worker.nip);
          return sum + cleanNumberValue(worker.target);
        }, 0);

        // PERBAIKAN: Hitung seperti Skrip 1 (per petugas)
        const activityRealisasi = activity.workers.reduce((sum, worker) => {
          return sum + cleanNumberValue(worker.realisasi);
        }, 0);
        totalTarget += activityTarget;
        totalValue += calculateActivityTarget(activity); // Menggunakan fungsi baru
        totalRealisasi += calculateActivityTotal(activity); // Menggunakan fungsi baru
      });
      totalSent = calculateSentToPPK(filteredJobActivities);
      return {
        ...jobType,
        activities: filteredJobActivities.length,
        workers: uniqueWorkers.size,
        target: totalTarget,
        value: totalValue,
        realisasi: totalRealisasi,
        sent: totalSent
      };
    });
  }, [activitiesByPeriod, selectedPeriod, selectedYear, user?.role, activityOptions]);
  const loadActivityOptions = async () => {
    if (!user?.role) return;
    try {
      setLoadingActivityOptions(true);
      const {
        data,
        error
      } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8',
          operation: 'read',
          range: 'Sheet1!A:F'
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
      const options: ActivityOption[] = rows.map((row: any[], index: number) => ({
        no: cleanNumberValue(row[0]) || index + 1,
        role: row[1] || '',
        namaKegiatan: row[2] || '',
        bebanAnggaran: row[3] || '',
        harga: row[4] || '',
        satuan: row[5] || ''
      })).filter((option: ActivityOption) => {
        if (!option.namaKegiatan.trim()) return false;
        const roles = processMultipleValues(option.role);
        return roles.includes(user.role);
      });
      setActivityOptions(options);
    } catch (error) {
      console.error('Error loading activity options:', error);
    } finally {
      setLoadingActivityOptions(false);
    }
  };
  const loadKoordinatorOptions = async () => {
    if (!user?.role) return;
    try {
      setLoadingKoordinatorOptions(true);
      console.log('[EntriTarget] Loading koordinator options from satker sheet:', masterOrganikSheetId);
      const {
        data,
        error
      } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: masterOrganikSheetId,
          operation: 'read',
          range: 'ORGANIK!A:D'
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
      const options: KoordinatorOption[] = rows.map((row: any[]) => ({
        nama: row[1] || '',
        jabatan: row[3] || ''
      })).filter((option: KoordinatorOption) => {
        if (!option.nama.trim()) return false;
        return option.jabatan === user.role;
      });
      console.log(`[EntriTarget] ✅ Loaded ${options.length} koordinator options for role: ${user.role}`);
      setKoordinatorOptions(options);
    } catch (error) {
      console.error('Error loading koordinator options:', error);
    } finally {
      setLoadingKoordinatorOptions(false);
    }
  };
  const handleNamaKegiatanChange = (selectedKegiatan: string) => {
    form.setValue("namaKegiatan", selectedKegiatan);
    const selectedActivity = activityOptions.find(option => option.namaKegiatan === selectedKegiatan);
    if (selectedActivity) {
      setBebanAnggaran(selectedActivity.bebanAnggaran);
      // Auto-fill hargaSatuan, satuan, dan komponenPOK dari master data
      if (selectedActivity.harga) {
        form.setValue("hargaSatuan", selectedActivity.harga);
      }
      if (selectedActivity.satuan) {
        form.setValue("satuan", selectedActivity.satuan);
      }
      if (selectedActivity.bebanAnggaran) {
        form.setValue("komponenPOK", selectedActivity.bebanAnggaran);
      }
    } else {
      setBebanAnggaran("");
    }
  };
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadDataFromSpreadsheet(), loadActivityOptions(), loadKoordinatorOptions()]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [user?.role, userDataSheetId, masterOrganikSheetId]);

  // =============================================
  // PERBAIKAN 3: LOAD DATA DENGAN PROCESSING KONSISTEN
  // =============================================

  const loadDataFromSpreadsheet = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: userDataSheetId,
          operation: 'read',
          range: 'Sheet1!A:W'
        }
      });
      if (error) {
        console.error('Error loading from spreadsheet:', error);
        toast({
          title: "Error",
          description: "Gagal memuat data dari spreadsheet",
          variant: "destructive"
        });
        return;
      }
      if (!data?.values || data.values.length <= 1) {
        setActivitiesByPeriod({});
        return;
      }
      const rows = data.values.slice(1);
      const activitiesMap: {
        [key: string]: Activity[];
      } = {};
      let activityIdCounter = 1;
      rows.forEach((row: any[], rowIndex: number) => {
        if (!row[0] || !row[2] || !row[3]) return;
        const periode = row[2] || '';
        const jenisPekerjaan = row[3] || '';
        const namaKegiatan = row[4] || '';
        const nomorSK = row[5] || '';
        const tanggalSK = parseDateFromSpreadsheet(row[6]);
        const tanggalMulai = parseDateFromSpreadsheet(row[7]);
        const tanggalAkhir = parseDateFromSpreadsheet(row[8]);
        const hargaSatuan = row[9] || '0';
        const satuan = row[10] || '';
        const koordinator = row[11] || '';
        let komponenPOK = row[12] || '';
        if (komponenPOK.includes('-')) {
          komponenPOK = getKomponenPOKValueFromLabel(komponenPOK);
        }
        const bebanAnggaran = row[18] || '';
        const dikirimKePPK = row[19] || '';
        const namaPetugasStr = row[13] || '';
        const targetStr = row[14] || '';
        const realisasiStr = row[15] || '';
        const nikListStr = row[22] || '';

        // PERBAIKAN: Gunakan processMultipleValues untuk konsistensi
        const namaPetugasList = processMultipleValues(namaPetugasStr);
        const targetList = processMultipleValues(targetStr);
        const realisasiList = processMultipleValues(realisasiStr);
        const nikList = processMultipleValues(nikListStr);
        const workers: Worker[] = [];
        namaPetugasList.forEach((nama: string, idx: number) => {
          let nip = nikList[idx] || '';
          if (!nip) {
            const allMatchingPetugas = petugasFromSheet.filter(p => p.nama === nama);
            if (allMatchingPetugas.length > 0) {
              nip = allMatchingPetugas[0].nik;
            } else {
              nip = `NIK-${idx + 1}`;
            }
          }
          const petugasData = getPetugasByNik(nip);
          workers.push({
            id: idx + 1,
            nama: nama,
            nip: nip,
            jabatan: petugasData?.pekerjaan || 'Petugas',
            target: targetList[idx] || '0',
            realisasi: realisasiList[idx] || '0',
            kecamatan: petugasData?.kecamatan || ''
          });
        });
        const activity: Activity = {
          id: activityIdCounter++,
          namaKegiatan,
          tanggalMulai,
          tanggalAkhir,
          hargaSatuan,
          satuan: satuan,
          komponenPOK,
          nomorSK,
          tanggalSK,
          koordinator,
          workers,
          jobType: jenisPekerjaan,
          spreadsheetRowIndex: rowIndex + 2,
          bebanAnggaran,
          dikirimKePPK
        };
        const periodKey = `${periode}-${jenisPekerjaan}`;
        if (!activitiesMap[periodKey]) {
          activitiesMap[periodKey] = [];
        }
        activitiesMap[periodKey].push(activity);
      });
      setActivitiesByPeriod(activitiesMap);
    } catch (error) {
      console.error('Error loading from spreadsheet:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data dari spreadsheet",
        variant: "destructive"
      });
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
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (editingActivity) {
        const updatedActivities = activities.map(activity => activity.id === editingActivity.id ? {
          ...activity,
          namaKegiatan: data.namaKegiatan,
          tanggalMulai: data.tanggalMulai,
          tanggalAkhir: data.tanggalAkhir,
          hargaSatuan: data.hargaSatuan,
          satuan: data.satuan,
          komponenPOK: data.komponenPOK,
          nomorSK: data.nomorSK,
          tanggalSK: data.tanggalSK,
          koordinator: data.koordinator,
          bebanAnggaran: bebanAnggaran
        } : activity);
        setActivitiesByPeriod(prev => ({
          ...prev,
          [periodKey]: updatedActivities
        }));
        const updatedActivity = updatedActivities.find(a => a.id === editingActivity.id);
        if (updatedActivity) {
          await updateActivityInSpreadsheet(updatedActivity);
        }
        toast({
          title: "Kegiatan berhasil diperbarui",
          description: `Kegiatan "${data.namaKegiatan}" telah diperbarui.`
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
          bebanAnggaran: bebanAnggaran
        };
        const rowIndex = await saveActivityToSpreadsheet(newActivity, selectedPeriod!, selectedYear);
        if (rowIndex) {
          newActivity.spreadsheetRowIndex = rowIndex;
        }
        setActivitiesByPeriod(prev => ({
          ...prev,
          [periodKey]: [...(prev[periodKey] || []), newActivity]
        }));
        toast({
          title: "Kegiatan berhasil ditambahkan",
          description: `Kegiatan "${data.namaKegiatan}" telah ditambahkan.`
        });
      }
      setShowAddActivityDialog(false);
      form.reset();
      setBebanAnggaran("");
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan data",
        variant: "destructive"
      });
    }
  };
  const handleDeleteActivity = async (id: number) => {
    const activityToDelete = activities.find(activity => activity.id === id);
    if (!activityToDelete) return;
    const confirmed = await confirmDelete(`Apakah Anda yakin ingin menghapus kegiatan "${activityToDelete.namaKegiatan}"?`);
    if (!confirmed) return;
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
        description: `Kegiatan "${activityToDelete.namaKegiatan}" telah dihapus.`
      });
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Gagal menghapus kegiatan",
        description: error.message || "Terjadi kesalahan saat menghapus kegiatan",
        variant: "destructive"
      });
    }
  };
  const deleteActivityFromSpreadsheet = async (rowIndex: number) => {
    try {
      const {
        error
      } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: userDataSheetId,
          operation: 'delete',
          rowIndex: rowIndex
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
    form.setValue("namaKegiatan", activity.namaKegiatan || "");
    form.setValue("tanggalMulai", activity.tanggalMulai);
    form.setValue("tanggalAkhir", activity.tanggalAkhir);
    form.setValue("hargaSatuan", activity.hargaSatuan || "0");
    form.setValue("satuan", activity.satuan || "");
    form.setValue("komponenPOK", activity.komponenPOK || "");
    form.setValue("nomorSK", activity.nomorSK || "");
    form.setValue("tanggalSK", activity.tanggalSK);
    form.setValue("koordinator", activity.koordinator || "");
    const selectedActivity = activityOptions.find(option => option.namaKegiatan === activity.namaKegiatan);
    setBebanAnggaran(selectedActivity?.bebanAnggaran || activity.bebanAnggaran || "");
    setShowAddActivityDialog(true);
  };
  const handleAddWorker = (activity: Activity) => {
    setSelectedActivityForWorkers(activity);
    const initialWorkers: {
      [key: number]: {
        selected: boolean;
        target: string;
        realisasi: string;
      };
    } = {};
    petugasAsWorkers.forEach(worker => {
      initialWorkers[worker.id] = {
        selected: false,
        target: "0",
        realisasi: "0"
      };
    });
    setSelectedWorkers(initialWorkers);
    setSearchTerm("");
    setShowAddWorkerDialog(true);
  };
  const handleSaveWorker = async () => {
    if (!selectedActivityForWorkers) return;
    try {
      const newWorkers: Worker[] = petugasAsWorkers.filter(worker => selectedWorkers[worker.id]?.selected).map(worker => {
        const petugasData = getPetugasByNik(worker.nip);
        return {
          ...worker,
          target: selectedWorkers[worker.id].target || "0",
          realisasi: selectedWorkers[worker.id].realisasi || "0",
          kecamatan: petugasData?.kecamatan || worker.kecamatan || '',
          jabatan: petugasData?.pekerjaan || worker.jabatan || 'Petugas',
          nip: worker.nip
        };
      });
      if (newWorkers.length === 0) {
        toast({
          title: "Tidak ada petugas dipilih",
          description: "Pilih minimal satu petugas dan isi targetnya.",
          variant: "destructive"
        });
        return;
      }

      // PERBAIKAN: Gunakan cleanNumberValue untuk validasi
      const invalidWorkers = newWorkers.filter(w => cleanNumberValue(w.realisasi) > cleanNumberValue(w.target));
      if (invalidWorkers.length > 0) {
        toast({
          title: "Realisasi tidak valid",
          description: `Realisasi tidak boleh lebih besar dari Target untuk: ${invalidWorkers.map(w => w.nama).join(", ")}`,
          variant: "destructive"
        });
        return;
      }
      const existingWorkerNips = selectedActivityForWorkers.workers.map(w => w.nip);
      const duplicates = newWorkers.filter(w => existingWorkerNips.includes(w.nip));
      if (duplicates.length > 0) {
        toast({
          title: "Petugas sudah terdaftar",
          description: `${duplicates.map(d => `${d.nama} (${d.nip})`).join(", ")} sudah terdaftar dalam kegiatan ini.`,
          variant: "destructive"
        });
        return;
      }
      const updatedActivities = activities.map(activity => activity.id === selectedActivityForWorkers.id ? {
        ...activity,
        workers: [...activity.workers, ...newWorkers]
      } : activity);
      setActivitiesByPeriod(prev => ({
        ...prev,
        [periodKey]: updatedActivities
      }));
      const updatedActivity = updatedActivities.find(a => a.id === selectedActivityForWorkers.id);
      if (updatedActivity) {
        await updateActivityInSpreadsheet(updatedActivity);
      }
      toast({
        title: "Petugas berhasil ditambahkan",
        description: `${newWorkers.length} petugas telah ditambahkan.`
      });
      setShowAddWorkerDialog(false);
      setSelectedActivityForWorkers(null);
    } catch (error) {
      console.error('Error saving workers:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan petugas",
        variant: "destructive"
      });
    }
  };
  const handleDeleteWorker = async (activityId: number, workerId: number) => {
    const activity = activities.find(a => a.id === activityId);
    const workerToDelete = activity?.workers.find(w => w.id === workerId);
    if (!workerToDelete) return;
    const confirmed = await confirmDelete(`Apakah Anda yakin ingin menghapus petugas "${workerToDelete.nama}" dari kegiatan ini?`);
    if (!confirmed) return;
    try {
      const updatedActivities = activities.map(activity => activity.id === activityId ? {
        ...activity,
        workers: activity.workers.filter(w => w.id !== workerId)
      } : activity);
      setActivitiesByPeriod(prev => ({
        ...prev,
        [periodKey]: updatedActivities
      }));
      const updatedActivity = updatedActivities.find(a => a.id === activityId);
      if (updatedActivity) {
        await updateActivityInSpreadsheet(updatedActivity);
      }
      toast({
        title: "Petugas berhasil dihapus",
        description: "Petugas telah dihapus dari kegiatan."
      });
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus petugas",
        variant: "destructive"
      });
    }
  };
  const handleEditWorker = (activityId: number, worker: Worker) => {
    setEditingWorker({
      activityId,
      worker
    });
  };
  const handleUpdateWorker = async (activityId: number, workerId: number, selectedValue: string, newTarget: string, newRealisasi: string) => {
    try {
      // PERBAIKAN: Gunakan cleanNumberValue untuk validasi
      if (cleanNumberValue(newRealisasi) > cleanNumberValue(newTarget)) {
        toast({
          title: "Realisasi tidak valid",
          description: "Realisasi tidak boleh lebih besar dari Target.",
          variant: "destructive"
        });
        return;
      }
      const activity = activities.find(a => a.id === activityId);
      const currentWorker = activity?.workers.find(w => w.id === workerId);
      if (!currentWorker) return;
      const newNik = extractNikFromValue(selectedValue);
      const newName = extractNameFromValue(selectedValue);
      const duplicateWorker = activity?.workers.find(w => w.id !== workerId && w.nip === newNik);
      if (duplicateWorker) {
        toast({
          title: "Petugas sudah terdaftar",
          description: "Petugas dengan NIK yang sama sudah digunakan dalam kegiatan ini.",
          variant: "destructive"
        });
        return;
      }
      const petugasData = getPetugasByNik(newNik);
      const newKecamatan = petugasData?.kecamatan || '';
      const newJabatan = petugasData?.pekerjaan || 'Petugas';
      const updatedActivities = activities.map(activity => activity.id === activityId ? {
        ...activity,
        workers: activity.workers.map(w => w.id === workerId ? {
          ...w,
          nama: newName,
          nip: newNik,
          kecamatan: newKecamatan,
          jabatan: newJabatan,
          target: newTarget,
          realisasi: newRealisasi
        } : w)
      } : activity);
      setActivitiesByPeriod(prev => ({
        ...prev,
        [periodKey]: updatedActivities
      }));
      setEditingWorker(null);
      const updatedActivity = updatedActivities.find(a => a.id === activityId);
      if (updatedActivity) {
        await updateActivityInSpreadsheet(updatedActivity);
      }
      toast({
        title: "Petugas berhasil diperbarui",
        description: "Data petugas telah diperbarui."
      });
    } catch (error) {
      console.error('Error updating worker:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memperbarui petugas",
        variant: "destructive"
      });
    }
  };

  // =============================================
  // PERBAIKAN 4: SAVE KE SPREADSHEET DENGAN KONSISTENSI
  // =============================================

  const saveActivityToSpreadsheet = async (activity: Activity, targetPeriod: string, targetYear: string): Promise<number | null> => {
    try {
      const {
        data: existingData
      } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: userDataSheetId,
          operation: 'read',
          range: 'Sheet1!A:A'
        }
      });
      const nextRowIndex = existingData?.values ? existingData.values.length + 1 : 2;
      const nextNo = existingData?.values ? existingData.values.length : 1;

      // PERBAIKAN: Gunakan processMultipleValues untuk konsistensi join
      const namaPetugas = activity.workers.map(w => w.nama).join(" | ");
      const targetList = activity.workers.map(w => w.target).join(" | ");
      const realisasiList = activity.workers.map(w => w.realisasi).join(" | ");

      // PERBAIKAN: Hitung nilai realisasi per petugas seperti Skrip 1
      const nilaiRealisasiList = activity.workers.map(w => formatCurrency(cleanNumberValue(w.realisasi) * cleanNumberValue(activity.hargaSatuan))).join(" | ");

      // PERBAIKAN: Gunakan fungsi calculateActivityTotal yang baru
      const totalRealisasi = calculateActivityTotal(activity);
      const nikList = activity.workers.map(w => w.nip).join(" | ");
      const komponenPOKLabel = getKomponenPOKLabelFromValue(activity.komponenPOK);
      const rowData = [[nextNo.toString(),
      // A: No
      user?.role || "User",
      // B: Role User
      `${targetPeriod} ${targetYear}`,
      // C: Periode
      selectedJobType || "",
      // D: Jenis Pekerjaan
      activity.namaKegiatan,
      // E: Nama Kegiatan
      activity.nomorSK,
      // F: Nomor SK
      format(activity.tanggalSK, "dd/MM/yyyy"),
      // G: Tanggal SK
      format(activity.tanggalMulai, "dd/MM/yyyy"),
      // H: Tanggal Mulai
      format(activity.tanggalAkhir, "dd/MM/yyyy"),
      // I: Tanggal Akhir
      activity.hargaSatuan,
      // J: Harga Satuan
      activity.satuan,
      // K: Satuan
      activity.koordinator,
      // L: Koordinator
      komponenPOKLabel,
      // M: Komponen POK
      namaPetugas,
      // N: Nama Petugas
      targetList,
      // O: Target
      realisasiList,
      // P: Realisasi
      nilaiRealisasiList,
      // Q: Nilai Realisasi
      formatCurrency(totalRealisasi),
      // R: Total Realisasi
      activity.bebanAnggaran || "",
      // S: Beban Anggaran
      activity.dikirimKePPK || "",
      // T: Dikirim ke PPK
      "",
      // U: (Kosong)
      "",
      // V: (Kosong)
      nikList // W: NIK List
      ]];
      const {
        error
      } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: userDataSheetId,
          operation: 'append',
          range: 'Sheet1',
          values: rowData
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

      // PERBAIKAN: Gunakan cleanNumberValue secara konsisten
      const nilaiRealisasiList = activity.workers.map(w => formatCurrency(cleanNumberValue(w.realisasi) * cleanNumberValue(activity.hargaSatuan))).join(" | ");

      // PERBAIKAN: Gunakan fungsi calculateActivityTotal yang baru
      const totalRealisasi = calculateActivityTotal(activity);
      const nikList = activity.workers.map(w => w.nip).join(" | ");
      const komponenPOKLabel = getKomponenPOKLabelFromValue(activity.komponenPOK);
      const rowData = [[(activity.spreadsheetRowIndex - 1).toString(), user?.role || "User", `${selectedPeriod} ${selectedYear}`, selectedJobType || "", activity.namaKegiatan, activity.nomorSK, format(activity.tanggalSK, "dd/MM/yyyy"), format(activity.tanggalMulai, "dd/MM/yyyy"), format(activity.tanggalAkhir, "dd/MM/yyyy"), activity.hargaSatuan, activity.satuan, activity.koordinator, komponenPOKLabel, namaPetugas, targetList, realisasiList, nilaiRealisasiList, formatCurrency(totalRealisasi), activity.bebanAnggaran || "", activity.dikirimKePPK || "", "", "", nikList]];
      const {
        error
      } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: userDataSheetId,
          operation: 'update',
          range: 'Sheet1',
          rowIndex: activity.spreadsheetRowIndex,
          values: rowData
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
        variant: "destructive"
      });
      return;
    }
    try {
      // Toggle status - jika sudah dikirim, kembalikan ke blank
      const newStatus = activity.dikirimKePPK?.includes("Kirim ke PPK") ? "" : "Kirim ke PPK";
      const updatedActivities = activities.map(a => a.id === activityId ? {
        ...a,
        dikirimKePPK: newStatus
      } : a);
      setActivitiesByPeriod(prev => ({
        ...prev,
        [periodKey]: updatedActivities
      }));
      const updatedActivity = updatedActivities.find(a => a.id === activityId);
      if (updatedActivity) {
        await updateActivityInSpreadsheet(updatedActivity);
      }
      if (newStatus === "Kirim ke PPK") {
        toast({
          title: "Berhasil dikirim ke PPK",
          description: `Kegiatan "${activity.namaKegiatan}" telah dikirim ke PPK.`
        });
      } else {
        toast({
          title: "Status direset",
          description: `Kegiatan "${activity.namaKegiatan}" tidak lagi dikirim ke PPK.`
        });
      }
    } catch (error) {
      console.error('Error sending to PPK:', error);
      toast({
        title: "Gagal mengubah status",
        description: "Terjadi kesalahan saat mengubah status PPK.",
        variant: "destructive"
      });
    }
  };
  const getKomponenPOKLabel = (value: string) => {
    const option = komponenPOKOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };
  const hasTargetButNoRealisasi = (worker: Worker) => {
    // PERBAIKAN: Gunakan cleanNumberValue
    const target = cleanNumberValue(worker.target);
    const realisasi = cleanNumberValue(worker.realisasi);
    return target > 0 && realisasi === 0;
  };
  const getAvailableWorkers = (activity: Activity, excludeWorkerId?: number) => {
    const existingWorkerNips = activity.workers.filter(w => w.id !== excludeWorkerId).map(w => w.nip);
    const availableWorkers = petugasAsWorkers.filter(w => !existingWorkerNips.includes(w.nip));
    const groupedWorkers = availableWorkers.map(w => ({
      value: `${w.nama}|${w.nip}`,
      label: `${w.nama} (${w.nip}) - ${w.kecamatan}`,
      data: w
    }));
    return groupedWorkers;
  };
  const extractNameFromValue = (value: string): string => {
    return value.split('|')[0] || value;
  };
  const extractNikFromValue = (value: string): string => {
    return value.split('|')[1] || '';
  };
  const filteredWorkers = useMemo(() => {
    if (!searchTerm) return petugasAsWorkers;
    const lowerSearch = searchTerm.toLowerCase();
    return petugasAsWorkers.filter(w => w.nama.toLowerCase().includes(lowerSearch) || w.kecamatan?.toLowerCase().includes(lowerSearch) || w.nip.toLowerCase().includes(lowerSearch));
  }, [searchTerm, petugasAsWorkers]);
  const filteredActivities = activities;
  const getJobTypeInfo = (jobType: string) => {
    switch (jobType) {
      case "Petugas Pendataan Lapangan":
        return {
          color: "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200",
          label: "Entri Petugas Pendataan Lapangan"
        };
      case "Petugas Pemeriksaan Lapangan":
        return {
          color: "bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200",
          label: "Entri Petugas Pemeriksaan Lapangan"
        };
      case "Petugas Pengolahan":
        return {
          color: "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-200",
          label: "Entri Petugas Pengolahan"
        };
      default:
        return {
          color: "bg-muted",
          label: "Entri Kegiatan"
        };
    }
  };
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Memuat data...</p>
        </div>
      </div>;
  }

  // =============================================
  // PERBAIKAN 5: TAMPILAN DENGAN PERHITUNGAN KONSISTEN
  // =============================================

  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-red-500">Entri Kegiatan</h1>
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
                    <TableHead className="text-right">Nilai Perjanjian</TableHead>
                    <TableHead className="text-right">Nilai Realisasi</TableHead>
                    <TableHead className="text-center">Dikirim ke PPK</TableHead>
                    <TableHead className="text-center w-20">Entri</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dynamicSpkData.map((item, index) => <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>SPK Bulan {item.month} {selectedYear}</TableCell>
                      <TableCell className="text-center">{item.activities}</TableCell>
                      <TableCell className="text-center">{item.workers}</TableCell>
                      <TableCell className="text-center">{item.target}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.realisasi)}</TableCell>
                      <TableCell className="text-center">{item.sent}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleActionClick(item.month)} title="Input Kegiatan">
                          <LogIn className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>)}
                  <TableRow className="bg-primary/10 font-semibold">
                    <TableCell colSpan={2} className="text-center font-bold">JUMLAH</TableCell>
                    <TableCell className="text-center font-bold">{summaryData.activities}</TableCell>
                    <TableCell className="text-center font-bold">{summaryData.workers}</TableCell>
                    <TableCell className="text-center font-bold">{summaryData.target}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(summaryData.value)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(summaryData.realisasi)}</TableCell>
                    <TableCell className="text-center font-bold">{summaryData.sent}</TableCell>
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
                  <TableHead className="text-center">Jumlah Kegiatan</TableHead>
                  <TableHead className="text-center">Jumlah Petugas</TableHead>
                  <TableHead className="text-center">Target Pekerjaan</TableHead>
                  <TableHead className="text-right">Nilai Perjanjian</TableHead>
                  <TableHead className="text-right">Nilai Realisasi</TableHead>
                  <TableHead className="text-center">Dikirim ke PPK</TableHead>
                  <TableHead className="text-center w-20">Entri</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dynamicJobTypes.map((job, index) => <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleJobTypeClick(job.name)}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{job.name}</TableCell>
                    <TableCell className="text-center">{job.activities}</TableCell>
                    <TableCell className="text-center">{job.workers}</TableCell>
                    <TableCell className="text-center">{job.target}</TableCell>
                    <TableCell className="text-right">{formatCurrency(job.value)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(job.realisasi)}</TableCell>
                    <TableCell className="text-center">{job.sent}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={e => {
                    e.stopPropagation();
                    handleJobTypeClick(job.name);
                  }} title="Entri">
                        <LogIn className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProposalsDialog} onOpenChange={setShowProposalsDialog}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 rounded-none">
          <DialogHeader>
            <DialogTitle className="text-xl">Daftar Usulan SPK - {selectedJobType}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 p-4 overflow-y-auto h-[calc(100vh-8rem)]">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-sm">
                <div className="mb-1"><span className="font-semibold">SPK Bulan {selectedPeriod} {selectedYear}</span></div>
                <div className="text-muted-foreground">{selectedJobType}</div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">
                Total {filteredActivities.length} kegiatan
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
                  {filteredActivities.length === 0 ? <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        Belum ada kegiatan. Klik "Tambah Kegiatan" untuk menambahkan.
                      </TableCell>
                    </TableRow> : filteredActivities.map((activity, index) => {
                  // PERBAIKAN: Gunakan fungsi calculateActivityTotal yang baru
                  const totalNilaiRealisasi = calculateActivityTotal(activity);
                  const totalRealisasi = calculateTotalRealisasi(activity);
                  return <>
                          <TableRow key={activity.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              <div>
                                {activity.namaKegiatan}
                                <div className="flex flex-col gap-1 mt-1">
                                  <div className="text-sm font-bold bg-green-600 text-white px-3 py-1 rounded-lg inline-block shadow-sm">
                                    Total Nilai Realisasi: Rp. {formatCurrency(totalNilaiRealisasi)}
                                  </div>
                                  <div className="text-sm font-bold bg-orange-600 text-white px-3 py-1 rounded-lg inline-block shadow-sm">
                                    Total Realisasi: {totalRealisasi} {activity.satuan}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{format(activity.tanggalMulai, "dd/MM/yyyy")}</TableCell>
                            <TableCell className="text-center">{format(activity.tanggalAkhir, "dd/MM/yyyy")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cleanNumberValue(activity.hargaSatuan))}</TableCell>
                            <TableCell>{activity.satuan}</TableCell>
                            <TableCell>{getKomponenPOKLabel(activity.komponenPOK)}</TableCell>
                            <TableCell>{activity.nomorSK}</TableCell>
                            <TableCell className="text-center">{format(activity.tanggalSK, "dd/MM/yyyy")}</TableCell>
                            <TableCell>{activity.koordinator}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleAddWorker(activity)} title="Tambah Petugas">
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-600 hover:bg-blue-600/10" onClick={() => handleEditActivity(activity)} title="Edit Kegiatan">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:bg-green-600/10", activity.dikirimKePPK?.includes("Kirim ke PPK") ? "text-green-600 hover:text-green-600" : "text-green-400 hover:text-green-600")} onClick={() => handleSendToPPK(activity.id)} title={activity.dikirimKePPK?.includes("Kirim ke PPK") ? "Batalkan Kirim ke PPK" : "Kirim ke PPK"} disabled={activity.workers.length === 0}>
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteActivity(activity.id)} title="Hapus Kegiatan">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Popover open={showDuplicatePopover && duplicatingActivity?.id === activity.id} onOpenChange={open => {
                            if (!open) resetDuplicateState();
                          }}>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:text-purple-600 hover:bg-purple-600/10" onClick={() => handleDuplicateClick(activity)} title="Duplikat Kegiatan">
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 p-4" align="start">
                                    <div className="space-y-4">
                                      <div className="font-semibold text-lg">Duplikat Kegiatan</div>
                                      <div className="text-sm text-muted-foreground">
                                        Pilih periode tujuan untuk menduplikat kegiatan ini
                                      </div>
                                      
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-sm font-medium">Tahun Tujuan</label>
                                          <Select value={duplicateTargetYear} onValueChange={setDuplicateTargetYear}>
                                            <SelectTrigger className="w-full mt-1">
                                              <SelectValue placeholder="Pilih tahun" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="2024">2024</SelectItem>
                                              <SelectItem value="2025">2025</SelectItem>
                                              <SelectItem value="2026">2026</SelectItem>
                                              <SelectItem value="2027">2027</SelectItem>
                                              <SelectItem value="2028">2028</SelectItem>
                                              <SelectItem value="2029">2029</SelectItem>
                                              <SelectItem value="2030">2030</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        
                                        <div>
                                          <label className="text-sm font-medium">Bulan Tujuan</label>
                                          <Select value={duplicateTargetPeriod} onValueChange={setDuplicateTargetPeriod}>
                                            <SelectTrigger className="w-full mt-1">
                                              <SelectValue placeholder="Pilih bulan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {getAllowedMonths().map(bulan => <SelectItem key={bulan.value} value={bulan.value}>
                                                  {bulan.label}
                                                </SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>

                                      <div className="flex gap-2 pt-2">
                                        <Button variant="outline" size="sm" onClick={resetDuplicateState} className="flex-1">
                                          Batal
                                        </Button>
                                        <Button size="sm" onClick={handleDuplicateConfirm} disabled={!duplicateTargetPeriod || !duplicateTargetYear || isDuplicating} className="flex-1 bg-purple-600 hover:bg-purple-700">
                                          {isDuplicating ? "Menduplikat..." : "Duplikat"}
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              {activity.dikirimKePPK?.includes("Kirim ke PPK") && <div className="text-xs text-green-600 font-medium mt-1">
                                  ✓ Sudah dikirim ke PPK
                                </div>}
                              {!activity.dikirimKePPK?.includes("Kirim ke PPK") && <div className="text-xs text-red-600 font-medium mt-1">
                                  Belum kirim ke PPK
                                </div>}
                            </TableCell>
                          </TableRow>
                          {activity.workers.map((worker, workerIndex) => <TableRow key={`${activity.id}-worker-${worker.id}`} className={cn("bg-muted/30", hasTargetButNoRealisasi(worker) && "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-900/30 border-l-4 border-l-yellow-400")}>
                              <TableCell></TableCell>
                              <TableCell colSpan={2} className="pl-8">
                                {editingWorker?.activityId === activity.id && editingWorker.worker.id === worker.id ? <Combobox options={getAvailableWorkers(activity, worker.id)} value={`${worker.nama}|${worker.nip}`} onValueChange={value => {
                          handleUpdateWorker(activity.id, worker.id, value, worker.target, worker.realisasi);
                        }} placeholder="Pilih petugas" searchPlaceholder="Cari nama petugas..." className="h-8" /> : <div className="text-sm">
                                    <div className="font-medium">
                                      {workerIndex + 1}. {worker.nama}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      NIK: {worker.nip}
                                    </div>
                                    {hasTargetButNoRealisasi(worker) && <span className="text-xs text-yellow-600 font-medium">(Belum Realisasi)</span>}
                                  </div>}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {editingWorker?.activityId === activity.id && editingWorker.worker.id === worker.id ? <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs">Target:</span>
                                      <Input type="number" defaultValue={worker.target} onBlur={e => handleUpdateWorker(activity.id, worker.id, `${worker.nama}|${worker.nip}`, e.target.value, worker.realisasi)} className="h-7 w-20" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs">Realisasi:</span>
                                      <Input type="number" defaultValue={worker.realisasi} onBlur={e => handleUpdateWorker(activity.id, worker.id, `${worker.nama}|${worker.nip}`, worker.target, e.target.value)} className="h-7 w-20" />
                                    </div>
                                  </div> : <div className="flex flex-col gap-1">
                                    <div>Target: {worker.target}</div>
                                    <div>Realisasi: {worker.realisasi}</div>
                                  </div>}
                              </TableCell>
                              <TableCell colSpan={5} className="text-sm text-muted-foreground">
                                {/* PERBAIKAN: Gunakan cleanNumberValue untuk perhitungan */}
                                Nilai Realisasi: {formatCurrency(cleanNumberValue(worker.realisasi) * cleanNumberValue(activity.hargaSatuan))}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-600 hover:bg-blue-600/10" onClick={() => handleEditWorker(activity.id, worker)} title="Edit Petugas">
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteWorker(activity.id, worker.id)} title="Hapus Petugas">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>)}
                        </>;
                })}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog lainnya tetap sama */}
      <Dialog open={showAddActivityDialog} onOpenChange={open => {
      setShowAddActivityDialog(open);
      if (!open) {
        setEditingActivity(null);
        form.reset();
        setBebanAnggaran("");
      }
    }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingActivity ? "Edit Kegiatan" : "Tambah Kegiatan"}
            </DialogTitle>
          </DialogHeader>

          {selectedJobType && !editingActivity && <Alert className={cn("border-2", getJobTypeInfo(selectedJobType).color)}>
              <AlertDescription className="font-semibold">
                {getJobTypeInfo(selectedJobType).label}
              </AlertDescription>
            </Alert>}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="namaKegiatan" render={({
              field
            }) => <FormItem>
                    <FormLabel>Nama Kegiatan <span className="text-destructive">*</span></FormLabel>
                    <Combobox options={activityOptions.map(option => ({
                value: option.namaKegiatan,
                label: option.namaKegiatan
              }))} value={field.value} onValueChange={handleNamaKegiatanChange} placeholder={loadingActivityOptions ? "Memuat kegiatan..." : "Pilih atau cari kegiatan"} searchPlaceholder="Cari nama kegiatan..." disabled={loadingActivityOptions} emptyText={loadingActivityOptions ? "Memuat..." : "Tidak ada kegiatan untuk role Anda"} />
                    <FormMessage />
                  </FormItem>} />

              {bebanAnggaran && <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-800">
                    <strong>Beban Anggaran:</strong> {bebanAnggaran}
                  </AlertDescription>
                </Alert>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="nomorSK" render={({
                field
              }) => <FormItem>
                      <FormLabel>Nomor SK <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nomor SK" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="tanggalSK" render={({
                field
              }) => <FormItem className="flex flex-col">
                      <FormLabel>Tanggal SK <span className="text-destructive">*</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd/MM/yyyy") : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="tanggalMulai" render={({
                field
              }) => <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Mulai <span className="text-destructive">*</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd/MM/yyyy") : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="tanggalAkhir" render={({
                field
              }) => <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Akhir <span className="text-destructive">*</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd/MM/yyyy") : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="hargaSatuan" render={({
                field
              }) => <FormItem>
                      <FormLabel>Harga Satuan <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Masukkan harga satuan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="satuan" render={({
                field
              }) => <FormItem>
                      <FormLabel>Satuan <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan satuan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="koordinator" render={({
                field
              }) => <FormItem>
                      <FormLabel>Koordinator <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingKoordinatorOptions}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingKoordinatorOptions ? "Memuat koordinator..." : "Pilih koordinator"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {koordinatorOptions.length > 0 ? koordinatorOptions.map((option, index) => <SelectItem key={index} value={option.nama}>
                                {option.nama}
                              </SelectItem>) : <SelectItem value="" disabled>
                              {loadingKoordinatorOptions ? "Memuat..." : "Tidak ada koordinator untuk role Anda"}
                            </SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="komponenPOK" render={({
                field
              }) => <FormItem>
                      <FormLabel>Komponen POK <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan komponen POK" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => {
                setShowAddActivityDialog(false);
                setEditingActivity(null);
                form.reset();
                setBebanAnggaran("");
              }}>
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
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Tambah Petugas</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-sm">
                <div className="mb-1"><span className="font-semibold">Kegiatan:</span> {selectedActivityForWorkers?.namaKegiatan}</div>
                <div className="text-muted-foreground">Nomor SK: {selectedActivityForWorkers?.nomorSK}</div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="text" placeholder="Cari nama, kecamatan, atau NIK petugas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            {loadingMitra ? <div className="text-center py-8 text-muted-foreground">
                Memuat data mitra...
              </div> : <div className="border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">
                        <Checkbox checked={filteredWorkers.length > 0 && filteredWorkers.every(w => {
                      const isAlreadyAdded = selectedActivityForWorkers?.workers.some(aw => aw.nip === w.nip);
                      return isAlreadyAdded || selectedWorkers[w.id]?.selected;
                    })} onCheckedChange={checked => {
                      const newSelected = {
                        ...selectedWorkers
                      };
                      filteredWorkers.forEach(w => {
                        const isAlreadyAdded = selectedActivityForWorkers?.workers.some(aw => aw.nip === w.nip);
                        if (!isAlreadyAdded) {
                          newSelected[w.id] = {
                            selected: checked as boolean,
                            target: newSelected[w.id]?.target || "0",
                            realisasi: newSelected[w.id]?.realisasi || "0"
                          };
                        }
                      });
                      setSelectedWorkers(newSelected);
                    }} />
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
                    {filteredWorkers.length === 0 ? <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {searchTerm ? "Tidak ada petugas ditemukan" : "Tidak ada data petugas"}
                        </TableCell>
                      </TableRow> : filteredWorkers.map(petugas => {
                  const isAlreadyAdded = selectedActivityForWorkers?.workers.some(w => w.nip === petugas.nip);
                  return <TableRow key={petugas.id} className={isAlreadyAdded ? "opacity-50 bg-muted/30" : ""}>
                            <TableCell>
                              <Checkbox checked={selectedWorkers[petugas.id]?.selected || false} disabled={isAlreadyAdded} onCheckedChange={checked => {
                        setSelectedWorkers({
                          ...selectedWorkers,
                          [petugas.id]: {
                            selected: checked as boolean,
                            target: selectedWorkers[petugas.id]?.target || "0",
                            realisasi: selectedWorkers[petugas.id]?.realisasi || "0"
                          }
                        });
                      }} />
                            </TableCell>
                            <TableCell>
                              {petugas.nama} 
                              {isAlreadyAdded && <span className="text-xs text-muted-foreground ml-2">(Sudah terdaftar)</span>}
                            </TableCell>
                            <TableCell>{petugas.kecamatan}</TableCell>
                            <TableCell className="font-mono text-sm">{petugas.nip}</TableCell>
                            <TableCell>{petugas.jabatan}</TableCell>
                            <TableCell>
                              <Input type="number" placeholder="0" value={selectedWorkers[petugas.id]?.target || ""} onChange={e => {
                        const newTarget = e.target.value;
                        const currentRealisasi = selectedWorkers[petugas.id]?.realisasi || "0";
                        setSelectedWorkers({
                          ...selectedWorkers,
                          [petugas.id]: {
                            selected: selectedWorkers[petugas.id]?.selected || false,
                            target: newTarget,
                            realisasi: currentRealisasi
                          }
                        });
                      }} disabled={!selectedWorkers[petugas.id]?.selected || isAlreadyAdded} className="h-8" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" placeholder="0" value={selectedWorkers[petugas.id]?.realisasi || ""} onChange={e => {
                        const newRealisasi = e.target.value;
                        const currentTarget = selectedWorkers[petugas.id]?.target || "0";
                        setSelectedWorkers({
                          ...selectedWorkers,
                          [petugas.id]: {
                            selected: selectedWorkers[petugas.id]?.selected || false,
                            target: currentTarget,
                            realisasi: newRealisasi
                          }
                        });
                      }} disabled={!selectedWorkers[petugas.id]?.selected || isAlreadyAdded} className="h-8" />
                            </TableCell>
                          </TableRow>;
                })}
                  </TableBody>
                </Table>
              </div>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
            setShowAddWorkerDialog(false);
            setSelectedActivityForWorkers(null);
          }}>
              Tutup
            </Button>
            <Button onClick={handleSaveWorker}>
              Simpan Petugas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}
