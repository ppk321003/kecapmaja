import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, Calendar, Filter, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ==================== TYPES & INTERFACES ====================
interface Karyawan {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  kategori: 'Keahlian' | 'Keterampilan' | 'Reguler';
  unitKerja: string;
  tmtJabatan: string;
  tmtPangkat: string;
  pendidikan: string;
  akKumulatif: number;
}

interface KonversiData {
  id?: string;
  No?: number;
  NIP: string;
  Nama: string;
  Tahun: number;
  Semester: 1 | 2;
  Predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  'Nilai SKP': number;
  'AK Konversi': number;
  'TMT Mulai': string;
  'TMT Selesai': string;
  Status: 'Draft' | 'Generated';
  Catatan?: string;
  Link_Dokumen?: string;
  Last_Update: string;
  rowIndex?: number;
  Masa_Kerja_Bulan?: number;
  Jenis_Penilaian?: 'PENUH' | 'PROPORSIONAL';
}

interface LayananKarirProps {
  karyawan: Karyawan;
}

// ==================== SPREADSHEET CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "konversi_predikat";

// ==================== UTILITY FUNCTIONS ====================
class LayananKarirCalculator {
  // Tentukan koefisien berdasarkan jabatan, kategori, dan golongan
  static getKoefisien(jabatan: string, kategori: string, golongan: string): number {
    const jabatanLower = jabatan.toLowerCase();
    const golonganLower = golongan.toLowerCase();
    
    // Untuk kategori Reguler, koefisien 0 karena tidak menggunakan AK
    if (kategori === 'Reguler') return 0;

    // Koefisien untuk kategori Keahlian (Fungsional)
    if (kategori === 'Keahlian') {
      // Ahli Utama (IV/c - IV/d)
      if (jabatanLower.includes('ahli utama') || golonganLower.includes('iv/c') || golonganLower.includes('iv/d')) {
        return 50.0;
      }
      // Ahli Madya (IV/a - IV/b)
      if (jabatanLower.includes('ahli madya') || golonganLower.includes('iv/a') || golonganLower.includes('iv/b')) {
        return 37.5;
      }
      // Ahli Muda (III/c - III/d)
      if (jabatanLower.includes('ahli muda') || golonganLower.includes('iii/c') || golonganLower.includes('iii/d')) {
        return 25.0;
      }
      // Ahli Pertama (III/a - III/b)
      if (jabatanLower.includes('ahli pertama') || golonganLower.includes('iii/a') || golonganLower.includes('iii/b')) {
        return 12.5;
      }
      
      // Default untuk jabatan keahlian lainnya berdasarkan golongan
      if (golonganLower.includes('iv/')) return 37.5;
      if (golonganLower.includes('iii/')) return 12.5;
      
      return 12.5;
    }
    
    // Koefisien untuk kategori Keterampilan (Pelaksana)
    if (kategori === 'Keterampilan') {
      // Penyelia (III/c - III/d)
      if (jabatanLower.includes('penyelia') || golonganLower.includes('iii/c') || golonganLower.includes('iii/d')) {
        return 25.0;
      }
      // Mahir (III/a - III/b)
      if (jabatanLower.includes('mahir') || golonganLower.includes('iii/a') || golonganLower.includes('iii/b')) {
        return 12.5;
      }
      // Terampil (II/a - II/d)
      if (jabatanLower.includes('terampil') || golonganLower.includes('ii/')) {
        return 8.0;
      }
      
      // Default untuk jabatan keterampilan lainnya berdasarkan golongan
      if (golonganLower.includes('iii/')) return 12.5;
      if (golonganLower.includes('ii/')) return 8.0;
      
      return 8.0;
    }
    
    return 0;
  }

  // Hitung AK dengan sistem proporsional sesuai BKN 2023
  static calculateAKProporsional(
    predikat: string, 
    koefisienJabatan: number, 
    masaKerjaBulan: number
  ): number {
    const koefisienPredikat = {
      'Sangat Baik': 1.50,
      'Baik': 1.00,
      'Cukup': 0.75,
      'Kurang': 0.50
    }[predikat] || 1.00;

    const akProporsional = (koefisienPredikat * koefisienJabatan * masaKerjaBulan) / 12;
    return Number(akProporsional.toFixed(3));
  }

  // Hitung AK penuh (6 bulan)
  static calculateAKPenuh(predikat: string, koefisienJabatan: number): number {
    const koefisienPredikat = {
      'Sangat Baik': 1.50,
      'Baik': 1.00,
      'Cukup': 0.75,
      'Kurang': 0.50
    }[predikat] || 1.00;

    const akPenuh = (koefisienPredikat * koefisienJabatan * 6) / 12;
    return Number(akPenuh.toFixed(3));
  }

  static calculatePeriodeSemester(tahun: number, semester: 1 | 2): { mulai: string; selesai: string } {
    if (semester === 1) {
      return {
        mulai: `01/01/${tahun}`,
        selesai: `30/06/${tahun}`
      };
    } else {
      return {
        mulai: `01/07/${tahun}`,
        selesai: `31/12/${tahun}`
      };
    }
  }

  static formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Format angka untuk spreadsheet (menggunakan koma desimal)
  static formatNumberForSheet(num: number): string {
    return num.toString().replace('.', ',');
  }

  // Parse angka dari spreadsheet (mengembalikan number dengan titik desimal)
  static parseNumberFromSheet(value: any): number {
    if (typeof value === 'string') {
      return parseFloat(value.replace(',', '.'));
    }
    return Number(value);
  }

  static parseTMT(tmt: string): Date {
    console.log('🕐 Parsing TMT:', tmt);
    
    // Priority 1: Format "24 Mei 2023" (DD MMMM YYYY)
    const parts2 = tmt.split(' ');
    if (parts2.length === 3) {
      const day = parseInt(parts2[0]);
      const monthStr = parts2[1].toLowerCase();
      const year = parseInt(parts2[2]);
      
      const monthMap: {[key: string]: number} = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
        'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
        'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
      };
      
      const month = monthMap[monthStr];
      
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        const date = new Date(year, month, day);
        console.log('✅ Parsed as DD MMMM YYYY:', date.toLocaleDateString('id-ID'));
        return date;
      }
    }

    // Priority 2: Format "9/10/2025" (DD/MM/YYYY)
    const parts1 = tmt.split('/');
    if (parts1.length === 3) {
      const day = parseInt(parts1[0]);
      const month = parseInt(parts1[1]);
      const year = parseInt(parts1[2]);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month - 1, day);
        console.log('✅ Parsed as DD/MM/YYYY:', date.toLocaleDateString('id-ID'));
        return date;
      }
    }
    
    // Fallback
    const fallbackDate = new Date(tmt);
    console.log('⚠️ Fallback parsing:', fallbackDate.toLocaleDateString('id-ID'));
    return fallbackDate;
  }

  // Hitung masa kerja proporsional berdasarkan TMT dan periode semester - DIPERBAIKI
static calculateMasaKerjaProporsional(
  tmtJabatan: string, 
  tahun: number, 
  semester: 1 | 2
): { masaKerjaBulan: number; jenisPenilaian: 'PENUH' | 'PROPORSIONAL' } {
  const tmtDate = this.parseTMT(tmtJabatan);
  const periode = this.calculatePeriodeSemester(tahun, semester);
  const periodeMulai = this.parseTMT(periode.mulai);
  const periodeSelesai = this.parseTMT(periode.selesai);
  const sekarang = new Date();

  console.log('🔍 DETAILED CALCULATION:', {
    tmtJabatan,
    tmtDate: tmtDate.toLocaleDateString('id-ID'),
    tahun,
    semester,
    periodeMulai: periodeMulai.toLocaleDateString('id-ID'),
    periodeSelesai: periodeSelesai.toLocaleDateString('id-ID'),
    sekarang: sekarang.toLocaleDateString('id-ID')
  });

  // Jika TMT setelah periode selesai, tidak ada penilaian
  if (tmtDate > periodeSelesai) {
    console.log('❌ TMT after period end, no assessment');
    return { masaKerjaBulan: 0, jenisPenilaian: 'PROPORSIONAL' };
  }

  // Jika TMT sebelum atau sama dengan periode mulai, penilaian penuh
  if (tmtDate <= periodeMulai) {
    console.log('✅ TMT before/same as period start, FULL assessment (6 bulan)');
    return { masaKerjaBulan: 6, jenisPenilaian: 'PENUH' };
  }

  // TMT di tengah periode, hitung bulan proporsional
  console.log('📅 TMT in the middle of period, calculating proportional months...');
  
  // PERBAIKAN: Mulai dari bulan BERIKUTNYA setelah TMT (bulan TMT tidak dihitung)
  const startFromNextMonth = new Date(tmtDate);
  startFromNextMonth.setMonth(startFromNextMonth.getMonth() + 1); // Bulan berikutnya
  startFromNextMonth.setDate(1); // Set ke tanggal 1 bulan berikutnya
  
  // PERBAIKAN: Untuk semester berjalan, hitung hanya sampai bulan sekarang
  const endDate = this.isSemesterInProgress(tahun, semester, sekarang) ? 
    sekarang : periodeSelesai;
  
  let masaKerjaBulan = 0;
  const current = new Date(startFromNextMonth);
  
  while (current <= endDate) {
    masaKerjaBulan++;
    current.setMonth(current.getMonth() + 1);
  }

  console.log('📊 Accurate month calculation (EXCLUDING TMT month):', {
    tmtMonth: tmtDate.getMonth() + 1,
    startFromMonth: startFromNextMonth.getMonth() + 1,
    endMonth: endDate.getMonth() + 1,
    calculatedMonths: masaKerjaBulan
  });

  // Pastikan masa kerja antara 1-6 bulan
  masaKerjaBulan = Math.max(1, Math.min(6, masaKerjaBulan));

  const jenisPenilaian = masaKerjaBulan === 6 ? 'PENUH' : 'PROPORSIONAL';
  
  console.log('🎯 FINAL RESULT:', {
    masaKerjaBulan,
    jenisPenilaian,
    status: masaKerjaBulan === 6 ? 'PENUH' : 'PROPORSIONAL'
  });
  
  return { masaKerjaBulan, jenisPenilaian };
}
  // Validasi data konversi
  static validateKonversiData(data: KonversiData): boolean {
    return !(
      isNaN(data.Masa_Kerja_Bulan!) ||
      data['AK Konversi'] < 0 ||
      data.Masa_Kerja_Bulan! < 0 || 
      data.Masa_Kerja_Bulan! > 6 ||
      data['Nilai SKP'] < 0 ||
      data['Nilai SKP'] > 100
    );
  }

  // Helper function untuk cek semester sedang berjalan
  static isSemesterInProgress(year: number, semester: 1 | 2, now: Date): boolean {
    const semesterStart = semester === 1 ? 
      new Date(year, 0, 1) : // 1 Januari
      new Date(year, 6, 1);  // 1 Juli
    
    const semesterEnd = semester === 1 ? 
      new Date(year, 5, 30) : // 30 Juni
      new Date(year, 11, 31); // 31 Desember
    
    return semesterStart <= now && semesterEnd >= now;
  }
static calculateMasaKerjaHinggaSekarang(
  tmtJabatan: string, 
  tahun: number, 
  semester: 1 | 2
): { masaKerjaBulan: number; jenisPenilaian: 'PENUH' | 'PROPORSIONAL' } {
  const tmtDate = this.parseTMT(tmtJabatan);
  const periode = this.calculatePeriodeSemester(tahun, semester);
  const periodeMulai = this.parseTMT(periode.mulai);
  const periodeSelesai = this.parseTMT(periode.selesai);
  const sekarang = new Date();

  console.log('📅 CALCULATE UNTIL NOW:', {
    tmtJabatan: tmtDate.toLocaleDateString('id-ID'),
    periode: `${periode.mulai} - ${periode.selesai}`,
    sekarang: sekarang.toLocaleDateString('id-ID')
  });

  // Jika TMT setelah periode selesai, tidak ada penilaian
  if (tmtDate > periodeSelesai) {
    return { masaKerjaBulan: 0, jenisPenilaian: 'PROPORSIONAL' };
  }

  // Jika TMT sebelum periode mulai, hitung dari mulai periode sampai sekarang
  const startDate = tmtDate <= periodeMulai ? periodeMulai : tmtDate;
  
  // PERBAIKAN: Mulai dari bulan BERIKUTNYA setelah TMT (bulan TMT tidak dihitung)
  const startFromNextMonth = new Date(startDate);
  startFromNextMonth.setMonth(startFromNextMonth.getMonth() + 1); // Bulan berikutnya
  startFromNextMonth.setDate(1); // Set ke tanggal 1 bulan berikutnya
  
  // End date adalah yang lebih kecil antara periode selesai dan sekarang
  const endDate = sekarang < periodeSelesai ? sekarang : periodeSelesai;

  // Jika startFromNextMonth setelah endDate, tidak ada penilaian
  if (startFromNextMonth > endDate) {
    return { masaKerjaBulan: 0, jenisPenilaian: 'PROPORSIONAL' };
  }

  // Hitung bulan kerja yang tepat sampai sekarang
  let masaKerjaBulan = 0;
  const current = new Date(startFromNextMonth);
  
  while (current <= endDate) {
    masaKerjaBulan++;
    current.setMonth(current.getMonth() + 1);
  }

  console.log('📊 Current semester calculation (EXCLUDING TMT month):', {
    startFromMonth: startFromNextMonth.getMonth() + 1,
    endMonth: endDate.getMonth() + 1,
    calculatedMonths: masaKerjaBulan
  });

  // Pastikan masa kerja antara 1-6 bulan
  masaKerjaBulan = Math.max(1, Math.min(6, masaKerjaBulan));

  const jenisPenilaian = masaKerjaBulan === 6 ? 'PENUH' : 'PROPORSIONAL';
  
  return { masaKerjaBulan, jenisPenilaian };
}

static generateSemesterFromTMT(tmtJabatan: string): { 
  tahun: number; 
  semester: 1 | 2;
  masaKerjaBulan: number;
  jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
}[] {
  const startDate = this.parseTMT(tmtJabatan);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentSemester: 1 | 2 = currentMonth <= 6 ? 1 : 2;
  
  console.log('🕐 TIMELINE CHECK:', {
    sekarang: now.toLocaleDateString('id-ID'),
    tahunSekarang: currentYear,
    semesterSekarang: currentSemester,
    tmtJabatan: startDate.toLocaleDateString('id-ID')
  });

  const semesters: { 
    tahun: number; 
    semester: 1 | 2;
    masaKerjaBulan: number;
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
  }[] = [];

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  let semesterYear = startYear;
  let semester: 1 | 2 = startMonth <= 6 ? 1 : 2;

  while (true) {
    // Untuk semester berjalan (current year dan current semester), hitung proporsional
    const isCurrentSemester = (semesterYear === currentYear && semester === currentSemester);
    
    let masaKerjaBulan: number;
    let jenisPenilaian: 'PENUH' | 'PROPORSIONAL';

    if (isCurrentSemester) {
      // Semester berjalan - hitung sampai bulan sekarang
      const { masaKerjaBulan: masaKerja, jenisPenilaian: jenis } = this.calculateMasaKerjaHinggaSekarang(
        tmtJabatan,
        semesterYear,
        semester
      );
      masaKerjaBulan = masaKerja;
      jenisPenilaian = jenis;
    } else {
      // Semester sudah lewat - gunakan perhitungan normal
      const { masaKerjaBulan: masaKerja, jenisPenilaian: jenis } = this.calculateMasaKerjaProporsional(
        tmtJabatan,
        semesterYear,
        semester
      );
      masaKerjaBulan = masaKerja;
      jenisPenilaian = jenis;
    }
    
    // Hanya tambahkan jika ada masa kerja
    if (masaKerjaBulan > 0) {
      semesters.push({ 
        tahun: semesterYear, 
        semester: semester,
        masaKerjaBulan,
        jenisPenilaian
      });
    }
    
    // Berhenti jika sudah melewati semester saat ini
    if (semesterYear > currentYear || (semesterYear === currentYear && semester === 2)) {
      break;
    }
    
    // Pindah ke semester berikutnya
    if (semester === 1) {
      semester = 2;
    } else {
      semester = 1;
      semesterYear++;
    }
    
    // Safety break
    if (semesters.length > 20) break;
  }

  console.log('✅ FINAL GENERATED SEMESTERS:', semesters);
  return semesters;
}

  // Hitung AK berdasarkan predikat, nilai SKP, dan masa kerja
  static calculateAKFromPredikat(
    predikat: string, 
    nilaiSKP: number, 
    jabatan: string, 
    kategori: string,
    golongan: string,
    masaKerjaBulan: number,
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL'
  ): number {
    // Untuk kategori Reguler, tidak ada perhitungan AK
    if (kategori === 'Reguler') return 0;

    const koefisien = this.getKoefisien(jabatan, kategori, golongan);
    
    let akKonversi = 0;
    if (jenisPenilaian === 'PENUH') {
      akKonversi = this.calculateAKPenuh(predikat, koefisien);
    } else {
      akKonversi = this.calculateAKProporsional(predikat, koefisien, masaKerjaBulan);
    }      
    return Number(akKonversi.toFixed(3));
  }
}

// ==================== API FUNCTIONS ====================
const useSpreadsheetAPI = () => {
  const { toast } = useToast();

  const callAPI = async (operation: string, data?: any) => {
    try {
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation,
          range: SHEET_NAME,
          ...data
        }
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('API Error:', error);
      toast({
        title: "Error",
        description: `Gagal mengakses spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  const readData = async (nip?: string) => {
    try {
      const result = await callAPI('read');
      const rows = result.values || [];
      
      if (rows.length <= 1) return [];
      
      const headers = rows[0];
      console.log('Spreadsheet headers:', headers);
      
      const data = rows.slice(1)
        .filter((row: any[]) => {
          if (!nip) return true;
          const nipIndex = headers.indexOf('NIP');
          return nipIndex >= 0 && row[nipIndex] === nip;
        })
        .map((row: any[], index: number) => {
          const obj: KonversiData = { 
            id: `${SHEET_NAME}_${index + 2}`,
            rowIndex: index + 2,
            Last_Update: '',
            Masa_Kerja_Bulan: 6,
            Jenis_Penilaian: 'PENUH'
          } as KonversiData;

          headers.forEach((header: string, colIndex: number) => {
            let value = row[colIndex];
            
            // Handle number conversion dengan format yang benar
            if (header === 'Tahun' || header === 'Semester' || header === 'No') {
              value = Number(value) || 0;
            }
            // Handle AK Konversi dengan konversi format desimal
            else if (header === 'AK Konversi') {
              value = LayananKarirCalculator.parseNumberFromSheet(value);
            }
            // Handle Nilai SKP
            else if (header === 'Nilai SKP') {
              value = Number(value) || 0;
            }
            // Map Banyak_Bulan to Masa_Kerja_Bulan dengan konversi yang benar
            else if (header === 'Banyak_Bulan') {
              obj.Masa_Kerja_Bulan = Number(value) || 6;
            }
            // Map Keterangan to Jenis_Penilaian
            else if (header === 'Keterangan') {
              obj.Jenis_Penilaian = (value === 'PROPORSIONAL' ? 'PROPORSIONAL' : 'PENUH');
            }
            
            // Assign value to object
            if (header !== 'Banyak_Bulan' && header !== 'Keterangan') {
              (obj as any)[header] = value;
            }
          });
          
          // Ensure No is set
          if (!obj.No || obj.No === 0) {
            obj.No = index + 1;
          }
          
          console.log('Parsed row data:', obj);
          return obj;
        });
      
      console.log(`Loaded ${data.length} records from ${SHEET_NAME}`);
      return data;
    } catch (error) {
      console.error('Error reading data:', error);
      return [];
    }
  };

  const appendData = async (values: any[]) => {
    console.log(`Appending to ${SHEET_NAME}:`, values);
    return await callAPI('append', { values: [values] });
  };

  const updateData = async (rowIndex: number, values: any[]) => {
    console.log(`Updating ${SHEET_NAME} row ${rowIndex}:`, values);
    return await callAPI('update', { rowIndex, values: [values] });
  };

  const deleteData = async (rowIndex: number) => {
    console.log(`Deleting ${SHEET_NAME} row ${rowIndex}`);
    return await callAPI('delete', { rowIndex });
  };

  return { readData, appendData, updateData, deleteData };
};

// ==================== EDIT FORM MODAL ====================
const EditKonversiModal: React.FC<{
  data: KonversiData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: KonversiData) => void;
  karyawan: Karyawan;
}> = ({ data, isOpen, onClose, onSave, karyawan }) => {
  const [formData, setFormData] = useState<Partial<KonversiData>>({});

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    } else {
      setFormData({});
    }
  }, [data]);

  const calculateAK = (): { akKonversi: number; masaKerja: number; jenis: string } => {
    if (!formData.Tahun || !formData.Semester || !formData.Predikat) {
      return { akKonversi: 0, masaKerja: 0, jenis: '' };
    }

    const { masaKerjaBulan, jenisPenilaian } = LayananKarirCalculator.calculateMasaKerjaProporsional(
      karyawan.tmtJabatan,
      formData.Tahun,
      formData.Semester
    );

    const akKonversi = LayananKarirCalculator.calculateAKFromPredikat(
      formData.Predikat,
      formData['Nilai SKP'] || 95,
      karyawan.jabatan,
      karyawan.kategori,
      karyawan.golongan,
      masaKerjaBulan,
      jenisPenilaian
    );

    return { 
      akKonversi, 
      masaKerja: masaKerjaBulan, 
      jenis: jenisPenilaian 
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Tahun && formData.Semester && formData.Predikat) {
      const { akKonversi, masaKerja, jenis } = calculateAK();
      const periode = LayananKarirCalculator.calculatePeriodeSemester(
        formData.Tahun, 
        formData.Semester
      );

      const finalData: KonversiData = {
        ...data,
        ...formData,
        'AK Konversi': akKonversi,
        'TMT Mulai': periode.mulai,
        'TMT Selesai': periode.selesai,
        Masa_Kerja_Bulan: masaKerja,
        Jenis_Penilaian: jenis as 'PENUH' | 'PROPORSIONAL',
        Last_Update: LayananKarirCalculator.formatDate(new Date())
      } as KonversiData;

      // Validasi sebelum save
      if (!LayananKarirCalculator.validateKonversiData(finalData)) {
        alert('Data tidak valid! Silakan periksa input Anda.');
        return;
      }

      onSave(finalData);
    }
  };

  const { akKonversi, masaKerja, jenis } = calculateAK();
  const koefisien = LayananKarirCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {data ? 'Edit Data Konversi' : 'Tambah Data Konversi'}
          </DialogTitle>
          <DialogDescription>
            {data ? 'Edit data konversi predikat kinerja' : 'Tambahkan data konversi predikat kinerja baru'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tahun">Tahun</Label>
              <Input
                id="tahun"
                type="number"
                value={formData.Tahun || ''}
                onChange={(e) => setFormData({...formData, Tahun: parseInt(e.target.value)})}
                required
              />
            </div>
            <div>
              <Label htmlFor="semester">Semester</Label>
              <Select 
                value={formData.Semester?.toString() || "1"} 
                onValueChange={(value) => setFormData({...formData, Semester: parseInt(value) as 1 | 2})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="predikat">Predikat Kinerja</Label>
              <Select 
                value={formData.Predikat || "Baik"} 
                onValueChange={(value) => setFormData({...formData, Predikat: value as any})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Cukup">Cukup</SelectItem>
                  <SelectItem value="Kurang">Kurang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nilaiSKP">Nilai SKP</Label>
              <Input
                id="nilaiSKP"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData['Nilai SKP'] || 95}
                onChange={(e) => setFormData({...formData, 'Nilai SKP': parseFloat(e.target.value)})}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.Status || "Draft"} 
              onValueChange={(value) => setFormData({...formData, Status: value as any})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Generated">Generated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="catatan">Catatan</Label>
            <Input
              id="catatan"
              value={formData.Catatan || ''}
              onChange={(e) => setFormData({...formData, Catatan: e.target.value})}
              placeholder="Opsional"
            />
          </div>

          {formData.Tahun && formData.Semester && formData.Predikat && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Perhitungan Otomatis (BKN 2023):</strong><br />
                • Jenis Penilaian: {jenis}<br />
                • Masa Kerja: {masaKerja} bulan<br />
                • Koefisien: {koefisien}<br />
                • Predikat: {formData.Predikat} ({{
                  'Sangat Baik': '1.50',
                  'Baik': '1.00', 
                  'Cukup': '0.75',
                  'Kurang': '0.50'
                }[formData.Predikat]})<br />
                • AK Konversi: {akKonversi}<br />
                • Periode: {LayananKarirCalculator.calculatePeriodeSemester(formData.Tahun, formData.Semester).mulai} - {LayananKarirCalculator.calculatePeriodeSemester(formData.Tahun, formData.Semester).selesai}
              </p>
              {karyawan.kategori === 'Reguler' && (
                <p className="text-sm text-orange-700 mt-2">
                  <strong>Catatan:</strong> Kategori Reguler tidak menggunakan perhitungan Angka Kredit
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
              {data ? 'Update Data' : 'Simpan Data'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ==================== SEMESTER GENERATOR MODAL ====================
const GenerateSemesterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (semesters: { 
    tahun: number; 
    semester: 1 | 2;
    masaKerjaBulan: number;
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
  }[]) => void;
  tmtJabatan: string;
  karyawan: Karyawan;
}> = ({ isOpen, onClose, onGenerate, tmtJabatan, karyawan }) => {
  const [availableSemesters, setAvailableSemesters] = useState<{ 
    tahun: number; 
    semester: 1 | 2;
    masaKerjaBulan: number;
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
  }[]>([]);

  useEffect(() => {
    if (isOpen && tmtJabatan) {
      const semesters = LayananKarirCalculator.generateSemesterFromTMT(tmtJabatan);
      setAvailableSemesters(semesters);
    }
  }, [isOpen, tmtJabatan]);

  const handleGenerate = () => {
    onGenerate(availableSemesters);
    onClose();
  };

  const koefisien = LayananKarirCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generate Data Semester dari TMT Jabatan</DialogTitle>
          <DialogDescription>
            Membuat data konversi untuk semua semester sejak TMT Jabatan: {tmtJabatan} sesuai Peraturan BKN 2023
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>TMT Jabatan:</strong> {tmtJabatan}<br />
              <strong>Jumlah Semester:</strong> {availableSemesters.length}<br />
              <strong>Kategori:</strong> {karyawan.kategori}<br />
              <strong>Golongan:</strong> {karyawan.golongan}<br />
              <strong>Koefisien:</strong> {koefisien}<br />
              <strong>Sistem:</strong> Penilaian Proporsional sesuai Peraturan BKN Nomor 3 Tahun 2023
            </p>
          </div>

          {availableSemesters.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Jenis Penilaian</TableHead>
                    <TableHead>Masa Kerja</TableHead>
                    <TableHead>AK Estimasi (Baik)</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableSemesters.map((semester, index) => {
                    const periode = LayananKarirCalculator.calculatePeriodeSemester(semester.tahun, semester.semester);
                    const akEstimasi = LayananKarirCalculator.calculateAKFromPredikat(
                      'Baik', 
                      95,
                      karyawan.jabatan,
                      karyawan.kategori,
                      karyawan.golongan,
                      semester.masaKerjaBulan,
                      semester.jenisPenilaian
                    );
                    
                    return (
                      <TableRow key={`${semester.tahun}-${semester.semester}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{semester.tahun}</TableCell>
                        <TableCell>Semester {semester.semester}</TableCell>
                        <TableCell className="text-sm">{periode.mulai} - {periode.selesai}</TableCell>
                        <TableCell>
                          <Badge variant={semester.jenisPenilaian === 'PENUH' ? 'default' : 'secondary'}>
                            {semester.jenisPenilaian}
                          </Badge>
                        </TableCell>
                        <TableCell>{semester.masaKerjaBulan} bulan</TableCell>
                        <TableCell className="font-semibold">{akEstimasi}</TableCell>
                        <TableCell className="text-sm">
                          {semester.jenisPenilaian === 'PROPORSIONAL' ? 
                            'Penilaian proporsional' : 'Penilaian penuh 6 bulan'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>Tidak ada semester yang dapat digenerate dari TMT Jabatan ini.</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleGenerate} disabled={availableSemesters.length === 0}>
              Generate {availableSemesters.length} Semester
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== MAIN COMPONENT ====================
const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const { toast } = useToast();
  const api = useSpreadsheetAPI();
  
  const [konversiData, setKonversiData] = useState<KonversiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ tahun: 'all', semester: 'all' });
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    data: KonversiData | null;
  }>({
    isOpen: false,
    data: null
  });
  const [generateModal, setGenerateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.readData(karyawan.nip);
      setKonversiData(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (data: KonversiData) => {
    setEditModal({
      isOpen: true,
      data: data
    });
  };

  const handleSave = async (updatedData: KonversiData) => {
    try {
      const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
      
      // Format values untuk spreadsheet dengan format desimal yang benar
      const values = [
        updatedData.No || nextNo,
        updatedData.NIP,
        updatedData.Nama,
        updatedData.Tahun,
        updatedData.Semester,
        updatedData.Predikat,
        updatedData['Nilai SKP'],
        LayananKarirCalculator.formatNumberForSheet(updatedData['AK Konversi']), // Format desimal untuk spreadsheet
        updatedData['TMT Mulai'],
        updatedData['TMT Selesai'],
        updatedData.Status,
        updatedData.Catatan || '',
        updatedData.Link_Dokumen || '',
        updatedData.Last_Update,
        updatedData.Masa_Kerja_Bulan || 6,
        updatedData.Jenis_Penilaian || 'PENUH'
      ];

      if (updatedData.rowIndex) {
        await api.updateData(updatedData.rowIndex, values);
        toast({
          title: "Sukses",
          description: "Data berhasil diupdate di Google Sheets"
        });
      }

      setEditModal({ isOpen: false, data: null });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data",
        variant: "destructive"
      });
    }
  };

  const handleAddNew = async () => {
    const now = LayananKarirCalculator.formatDate(new Date());
    const tahun = new Date().getFullYear();
    const semester = new Date().getMonth() < 6 ? 1 : 2;
    
    const { masaKerjaBulan, jenisPenilaian } = LayananKarirCalculator.calculateMasaKerjaProporsional(
      karyawan.tmtJabatan,
      tahun,
      semester
    );

    const akKonversi = LayananKarirCalculator.calculateAKFromPredikat(
      'Baik', 
      95,
      karyawan.jabatan,
      karyawan.kategori,
      karyawan.golongan,
      masaKerjaBulan,
      jenisPenilaian
    );

    const periode = LayananKarirCalculator.calculatePeriodeSemester(tahun, semester);
    const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
    
    const newData = {
      No: nextNo,
      NIP: karyawan.nip,
      Nama: karyawan.nama,
      Tahun: tahun,
      Semester: semester,
      Predikat: 'Baik' as const,
      'Nilai SKP': 95,
      'AK Konversi': akKonversi,
      'TMT Mulai': periode.mulai,
      'TMT Selesai': periode.selesai,
      Status: 'Draft' as const,
      Catatan: '',
      Last_Update: now,
      Masa_Kerja_Bulan: masaKerjaBulan,
      Jenis_Penilaian: jenisPenilaian
    };

    // Validasi sebelum save
    if (!LayananKarirCalculator.validateKonversiData(newData as KonversiData)) {
      toast({
        title: "Error",
        description: "Data tidak valid untuk disimpan",
        variant: "destructive"
      });
      return;
    }

    try {
      const values = [
        newData.No,
        newData.NIP,
        newData.Nama,
        newData.Tahun,
        newData.Semester,
        newData.Predikat,
        newData['Nilai SKP'],
        LayananKarirCalculator.formatNumberForSheet(newData['AK Konversi']), // Format desimal untuk spreadsheet
        newData['TMT Mulai'],
        newData['TMT Selesai'],
        newData.Status,
        newData.Catatan,
        '', // Link_Dokumen
        newData.Last_Update,
        newData.Masa_Kerja_Bulan,
        newData.Jenis_Penilaian
      ];

      await api.appendData(values);
      toast({
        title: "Sukses",
        description: "Data baru berhasil ditambahkan ke Google Sheets"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menambah data",
        variant: "destructive"
      });
    }
  };

  const handleGenerateSemesters = async (semesters: { 
    tahun: number; 
    semester: 1 | 2;
    masaKerjaBulan: number;
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
  }[]) => {
    try {
      const now = LayananKarirCalculator.formatDate(new Date());
      const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
      
      const newData = semesters.map((semester, index) => {
        const periode = LayananKarirCalculator.calculatePeriodeSemester(semester.tahun, semester.semester);
        
        const akKonversi = LayananKarirCalculator.calculateAKFromPredikat(
          'Baik', 
          95,
          karyawan.jabatan,
          karyawan.kategori,
          karyawan.golongan,
          semester.masaKerjaBulan,
          semester.jenisPenilaian
        );

        return {
          No: nextNo + index,
          NIP: karyawan.nip,
          Nama: karyawan.nama,
          Tahun: semester.tahun,
          Semester: semester.semester,
          Predikat: 'Baik' as const,
          'Nilai SKP': 95,
          'AK Konversi': akKonversi,
          'TMT Mulai': periode.mulai,
          'TMT Selesai': periode.selesai,
          Status: 'Draft' as const,
          Catatan: `Auto-generated from TMT Jabatan ${karyawan.tmtJabatan} (${semester.jenisPenilaian})`,
          Last_Update: now,
          Masa_Kerja_Bulan: semester.masaKerjaBulan,
          Jenis_Penilaian: semester.jenisPenilaian
        };
      });

      // Validasi semua data sebelum save
      const invalidData = newData.filter(data => !LayananKarirCalculator.validateKonversiData(data as KonversiData));
      if (invalidData.length > 0) {
        toast({
          title: "Error",
          description: `${invalidData.length} data tidak valid dan tidak disimpan`,
          variant: "destructive"
        });
        return;
      }

      for (const data of newData) {
        const values = [
          data.No,
          data.NIP,
          data.Nama,
          data.Tahun,
          data.Semester,
          data.Predikat,
          data['Nilai SKP'],
          LayananKarirCalculator.formatNumberForSheet(data['AK Konversi']), // Format desimal untuk spreadsheet
          data['TMT Mulai'],
          data['TMT Selesai'],
          data.Status,
          data.Catatan,
          '', // Link_Dokumen
          data.Last_Update,
          data.Masa_Kerja_Bulan,
          data.Jenis_Penilaian
        ];
        await api.appendData(values);
      }

      toast({
        title: "Sukses",
        description: `Berhasil generate ${semesters.length} semester dari TMT Jabatan dengan sistem proporsional BKN`
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal generate data semester",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (rowData: KonversiData) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    
    try {
      if (rowData.rowIndex) {
        await api.deleteData(rowData.rowIndex);
        toast({
          title: "Sukses",
          description: "Data berhasil dihapus dari Google Sheets"
        });
        loadData();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus data",
        variant: "destructive"
      });
    }
  };

  const getFilteredData = () => {
    return konversiData.filter(item => 
      (filters.tahun === 'all' || item.Tahun?.toString() === filters.tahun) &&
      (filters.semester === 'all' || item.Semester?.toString() === filters.semester)
    );
  };

  const renderKonversiTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No</TableHead>
          <TableHead>Tahun</TableHead>
          <TableHead>Semester</TableHead>
          <TableHead>Predikat</TableHead>
          <TableHead>Nilai SKP</TableHead>
          <TableHead>AK Konversi</TableHead>
          <TableHead>Periode</TableHead>
          <TableHead>Jenis</TableHead>
          <TableHead>Masa Kerja</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {getFilteredData().map((data: KonversiData) => (
          <TableRow key={data.id}>
            <TableCell className="font-medium">{data.No}</TableCell>
            <TableCell>{data.Tahun}</TableCell>
            <TableCell>{data.Semester}</TableCell>
            <TableCell>
              <Badge variant={
                data.Predikat === 'Sangat Baik' ? 'default' :
                data.Predikat === 'Baik' ? 'secondary' :
                data.Predikat === 'Cukup' ? 'outline' : 'destructive'
              }>
                {data.Predikat}
              </Badge>
            </TableCell>
            <TableCell>{data['Nilai SKP']}</TableCell>
            <TableCell className="font-semibold">{data['AK Konversi']}</TableCell>
            <TableCell className="text-sm">
              {data['TMT Mulai']} - {data['TMT Selesai']}
            </TableCell>
            <TableCell>
              <Badge variant={data.Jenis_Penilaian === 'PENUH' ? 'default' : 'secondary'}>
                {data.Jenis_Penilaian || 'PENUH'}
              </Badge>
            </TableCell>
            <TableCell>
              {data.Masa_Kerja_Bulan || 6} bulan
            </TableCell>
            <TableCell>
              <Badge variant={data.Status === 'Generated' ? 'default' : 'secondary'}>
                {data.Status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleEdit(data)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(data)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const koefisien = LayananKarirCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Konversi Predikat Kinerja (BKN 2023)
          </CardTitle>
          <CardDescription>
            Kelola data konversi predikat menjadi angka kredit untuk {karyawan.nama} sesuai Peraturan BKN Nomor 3 Tahun 2023
            {karyawan.kategori === 'Reguler' && (
              <span className="text-orange-600 font-semibold"> (Kategori Reguler - Data untuk dokumentasi)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4 items-end">
            <div className="flex-1">
              <Label htmlFor="filter-tahun">Tahun</Label>
              <Select 
                value={filters.tahun} 
                onValueChange={(value) => setFilters({...filters, tahun: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {[2023, 2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label htmlFor="filter-semester">Semester</Label>
              <Select 
                value={filters.semester} 
                onValueChange={(value) => setFilters({...filters, semester: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Semester</SelectItem>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={loadData} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Baru
            </Button>

            <Button onClick={() => setGenerateModal(true)} variant="secondary">
              <Save className="h-4 w-4 mr-2" />
              Generate dari TMT
            </Button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Informasi Karyawan:</strong> {karyawan.kategori} - {karyawan.jabatan} - Golongan: {karyawan.golongan} - Koefisien: {koefisien} - TMT Jabatan: {karyawan.tmtJabatan}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Memuat data dari Google Sheets...</p>
                </div>
              ) : getFilteredData().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada data ditemukan</p>
                  <div className="flex gap-2 justify-center mt-2">
                    <Button onClick={handleAddNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Data Pertama
                    </Button>
                    <Button onClick={() => setGenerateModal(true)} variant="outline">
                      <Save className="h-4 w-4 mr-2" />
                      Generate dari TMT Jabatan
                    </Button>
                  </div>
                </div>
              ) : (
                renderKonversiTable()
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <EditKonversiModal
        data={editModal.data}
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, data: null })}
        onSave={handleSave}
        karyawan={karyawan}
      />

      <GenerateSemesterModal
        isOpen={generateModal}
        onClose={() => setGenerateModal(false)}
        onGenerate={handleGenerateSemesters}
        tmtJabatan={karyawan.tmtJabatan}
        karyawan={karyawan}
      />
    </div>
  );
};

export default LayananKarir;