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
  tglPenghitunganAkTerakhir: string;
  akKumulatif: number;
  tempatLahir: string;  // Di-repurpose dari status
  unitKerja: string;
  tmtJabatan: string;
  tmtPangkat: string;
  pendidikan: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  linkSkJabatan?: string;
  linkSkPangkat?: string;
}

interface KonversiData {
  id?: string;
  No?: number;
  
  // Data periode
  Tahun: number;
  Semester: 1 | 2;
  Periode: string;
  Jenis_Periode: 'Semester' | 'Tahunan';
  
  // Data pribadi
  Nama: string;
  NIP: string;
  Nomor_Karpeg: string;
  Tempat_Lahir: string;
  Tanggal_Lahir: string;
  Jenis_Kelamin: 'L' | 'P';
  
  // Data pangkat & jabatan
  Pangkat: string;
  Golongan: string;
  TMT_Pangkat: string;
  Jabatan: string;
  TMT_Jabatan: string;
  
  // Data kinerja
  Predikat_Kinerja: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  Nilai_SKP: number;
  AK_Konversi: number;
  Tanggal_Penetapan: string;
  
  // Analisis AK
  Kebutuhan_Pangkat_AK: number;
  Kebutuhan_Jabatan_AK: number;
  AK_Sebelumnya: number;
  AK_Periode_Ini: number;
  Total_Kumulatif: number;
  Selisih_Pangkat: number;
  Selisih_Jabatan: number;
  Kurleb_Pangkat: number;
  Kurleb_Jabatan: number;
  
  // Status & rekomendasi
  Status_Kenaikan: string;
  Jenis_Kenaikan: string;
  Estimasi_Bulan: number;
  Rekomendasi: string;
  Pertimbangan_Khusus: string;
  
  // Metadata
  Status: 'Draft' | 'Generated';
  Catatan?: string;
  Link_Dokumen?: string;
  Last_Update: string;
  
  // Internal
  rowIndex?: number;
  Masa_Kerja_Bulan?: number;
  Jenis_Penilaian?: 'PENUH' | 'PROPORSIONAL';
}

interface KonversiPredikatProps {
  karyawan: Karyawan;
}

// ==================== SPREADSHEET CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "konversi_predikat";

// ==================== UTILITY FUNCTIONS ====================
class KonversiCalculator {
  // Tentukan koefisien berdasarkan jabatan, kategori, dan golongan
  static getKoefisien(jabatan: string, kategori: string, golongan: string): number {
    const jabatanLower = jabatan.toLowerCase();
    const golonganLower = golongan.toLowerCase();
    
    if (kategori === 'Reguler') return 0;

    if (kategori === 'Keahlian') {
      if (jabatanLower.includes('ahli utama') || golonganLower.includes('iv/c') || golonganLower.includes('iv/d')) {
        return 50.0;
      }
      if (jabatanLower.includes('ahli madya') || golonganLower.includes('iv/a') || golonganLower.includes('iv/b')) {
        return 37.5;
      }
      if (jabatanLower.includes('ahli muda') || golonganLower.includes('iii/c') || golonganLower.includes('iii/d')) {
        return 25.0;
      }
      if (jabatanLower.includes('ahli pertama') || golonganLower.includes('iii/a') || golonganLower.includes('iii/b')) {
        return 12.5;
      }
      
      if (golonganLower.includes('iv/')) return 37.5;
      if (golonganLower.includes('iii/')) return 12.5;
      
      return 12.5;
    }
    
    if (kategori === 'Keterampilan') {
      if (jabatanLower.includes('penyelia') || golonganLower.includes('iii/c') || golonganLower.includes('iii/d')) {
        return 25.0;
      }
      if (jabatanLower.includes('mahir') || golonganLower.includes('iii/a') || golonganLower.includes('iii/b')) {
        return 12.5;
      }
      if (jabatanLower.includes('terampil') || golonganLower.includes('ii/')) {
        return 5.0;
      }
      
      if (golonganLower.includes('iii/')) return 12.5;
      if (golonganLower.includes('ii/')) return 5.0;
      
      return 5.0;
    }
    
    return 0;
  }

  // Hitung kebutuhan AK untuk pangkat dan jabatan
  static getKebutuhanPangkat(golonganSekarang: string, kategori: string): number {
    if (kategori === 'Reguler') return 0;

    const kebutuhanKeahlian: { [key: string]: number } = {
      'III/a': 50, 'III/b': 50, 'III/c': 100, 'III/d': 100,
      'IV/a': 150, 'IV/b': 150, 'IV/c': 150, 'IV/d': 200
    };
    
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'II/a': 15, 'II/b': 20, 'II/c': 20, 'II/d': 20,
      'III/a': 50, 'III/b': 50, 'III/c': 100
    };
    
    const kebutuhan = kategori === 'Keahlian' ? kebutuhanKeahlian : kebutuhanKeterampilan;
    return kebutuhan[golonganSekarang] || 0;
  }

  static getKebutuhanJabatan(jabatanSekarang: string, kategori: string): number {
    if (kategori === 'Reguler') return 0;

    const kebutuhanKeahlian: { [key: string]: number } = {
      'Ahli Pertama': 100, 'Ahli Muda': 200, 'Ahli Madya': 450, 'Ahli Utama': 0
    };
    
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'Terampil': 60, 'Mahir': 100, 'Penyelia': 0
    };
    
    if (kategori === 'Keahlian') {
      for (const [key, value] of Object.entries(kebutuhanKeahlian)) {
        if (jabatanSekarang.includes(key)) return value;
      }
    } else {
      for (const [key, value] of Object.entries(kebutuhanKeterampilan)) {
        if (jabatanSekarang.includes(key)) return value;
      }
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

  // Hitung AK penuh tahunan (12 bulan)
  static calculateAKPenuhTahunan(predikat: string, koefisienJabatan: number): number {
    const koefisienPredikat = {
      'Sangat Baik': 1.50,
      'Baik': 1.00,
      'Cukup': 0.75,
      'Kurang': 0.50
    }[predikat] || 1.00;

    const akPenuh = (koefisienPredikat * koefisienJabatan * 12) / 12;
    return Number(akPenuh.toFixed(3));
  }

  // Hitung AK berdasarkan predikat, nilai SKP, dan masa kerja
  static calculateAKFromPredikat(
    predikat: string, 
    nilaiSKP: number, 
    jabatan: string, 
    kategori: string,
    golongan: string,
    masaKerjaBulan: number,
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL',
    mode: 'semesteran' | 'tahunan' = 'semesteran'
  ): number {
    // Untuk kategori Reguler, tidak ada perhitungan AK
    if (kategori === 'Reguler') return 0;

    const koefisien = this.getKoefisien(jabatan, kategori, golongan);
    
    let akKonversi = 0;
    
    if (mode === 'tahunan') {
      // Untuk mode tahunan, gunakan perhitungan khusus
      if (jenisPenilaian === 'PENUH') {
        akKonversi = this.calculateAKPenuhTahunan(predikat, koefisien);
      } else {
        akKonversi = this.calculateAKProporsional(predikat, koefisien, masaKerjaBulan);
      }
    } else {
      // Untuk mode semesteran, gunakan perhitungan normal
      if (jenisPenilaian === 'PENUH') {
        akKonversi = this.calculateAKPenuh(predikat, koefisien);
      } else {
        akKonversi = this.calculateAKProporsional(predikat, koefisien, masaKerjaBulan);
      }
    }
    
    return Number(akKonversi.toFixed(3));
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

  // Format angka untuk spreadsheet
  static formatNumberForSheet(num: number): string {
    return num.toString().replace('.', ',');
  }

  // Parse angka dari spreadsheet
  static parseNumberFromSheet(value: any): number {
    if (typeof value === 'string') {
      return parseFloat(value.replace(',', '.'));
    }
    return Number(value);
  }

  static parseTMT(tmt: string): Date {
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
        return new Date(year, month, day);
      }
    }

    const parts1 = tmt.split('/');
    if (parts1.length === 3) {
      const day = parseInt(parts1[0]);
      const month = parseInt(parts1[1]);
      const year = parseInt(parts1[2]);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
    
    const fallbackDate = new Date(tmt);
    return fallbackDate;
  }

  // Hitung masa kerja proporsional
  static calculateMasaKerjaProporsional(
    tglPenghitunganAkTerakhir: string, 
    tahun: number, 
    semester: 1 | 2
  ): { masaKerjaBulan: number; jenisPenilaian: 'PENUH' | 'PROPORSIONAL' } {
    const tglPenghitunganDate = this.parseTMT(tglPenghitunganAkTerakhir);
    const periode = this.calculatePeriodeSemester(tahun, semester);
    const periodeMulai = this.parseTMT(periode.mulai);
    const periodeSelesai = this.parseTMT(periode.selesai);
    const sekarang = new Date();

    if (tglPenghitunganDate > periodeSelesai) {
      return { masaKerjaBulan: 0, jenisPenilaian: 'PROPORSIONAL' };
    }

    if (tglPenghitunganDate <= periodeMulai) {
      return { masaKerjaBulan: 6, jenisPenilaian: 'PENUH' };
    }

    const startFromNextMonth = new Date(tglPenghitunganDate);
    startFromNextMonth.setMonth(startFromNextMonth.getMonth() + 1);
    startFromNextMonth.setDate(1);
    
    const endDate = this.isSemesterInProgress(tahun, semester, sekarang) ? 
      sekarang : periodeSelesai;
    
    let masaKerjaBulan = 0;
    const current = new Date(startFromNextMonth);
    
    while (current <= endDate) {
      masaKerjaBulan++;
      current.setMonth(current.getMonth() + 1);
    }

    masaKerjaBulan = Math.max(1, Math.min(6, masaKerjaBulan));
    const jenisPenilaian = masaKerjaBulan === 6 ? 'PENUH' : 'PROPORSIONAL';
    
    return { masaKerjaBulan, jenisPenilaian };
  }

  // Helper function untuk cek semester sedang berjalan
  static isSemesterInProgress(year: number, semester: 1 | 2, now: Date): boolean {
    const semesterStart = semester === 1 ? 
      new Date(year, 0, 1) : new Date(year, 6, 1);
    
    const semesterEnd = semester === 1 ? 
      new Date(year, 5, 30) : new Date(year, 11, 31);
    
    return semesterStart <= now && semesterEnd >= now;
  }

  static calculateMasaKerjaHinggaSekarang(
    tglPenghitunganAkTerakhir: string, 
    tahun: number, 
    semester: 1 | 2
  ): { masaKerjaBulan: number; jenisPenilaian: 'PENUH' | 'PROPORSIONAL' } {
    const tglPenghitunganDate = this.parseTMT(tglPenghitunganAkTerakhir);
    const periode = this.calculatePeriodeSemester(tahun, semester);
    const periodeMulai = this.parseTMT(periode.mulai);
    const periodeSelesai = this.parseTMT(periode.selesai);
    const sekarang = new Date();

    // Jika Tanggal Penghitungan AK Terakhir setelah periode selesai, tidak ada penilaian
    if (tglPenghitunganDate > periodeSelesai) {
      return { masaKerjaBulan: 0, jenisPenilaian: 'PROPORSIONAL' };
    }

    // Jika Tanggal Penghitungan AK Terakhir sebelum periode mulai, hitung dari mulai periode sampai sekarang
    const startDate = tglPenghitunganDate <= periodeMulai ? periodeMulai : tglPenghitunganDate;
    
    // Mulai dari bulan BERIKUTNYA setelah Tanggal Penghitungan AK Terakhir (bulan Tanggal Penghitungan AK Terakhir tidak dihitung)
    const startFromNextMonth = new Date(startDate);
    startFromNextMonth.setMonth(startFromNextMonth.getMonth() + 1);
    startFromNextMonth.setDate(1);
    
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

    // Pastikan masa kerja antara 1-6 bulan
    masaKerjaBulan = Math.max(1, Math.min(6, masaKerjaBulan));

    const jenisPenilaian = masaKerjaBulan === 6 ? 'PENUH' : 'PROPORSIONAL';
    
    return { masaKerjaBulan, jenisPenilaian };
  }

  static generateSemesterFromTglPenghitungan(tglPenghitunganAkTerakhir: string): { 
    tahun: number; 
    semester: 1 | 2;
    masaKerjaBulan: number;
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
  }[] {
    const startDate = this.parseTMT(tglPenghitunganAkTerakhir);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentSemester: 1 | 2 = currentMonth <= 6 ? 1 : 2;
    
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
          tglPenghitunganAkTerakhir,
          semesterYear,
          semester
        );
        masaKerjaBulan = masaKerja;
        jenisPenilaian = jenis;
      } else {
        // Semester sudah lewat - gunakan perhitungan normal
        const { masaKerjaBulan: masaKerja, jenisPenilaian: jenis } = this.calculateMasaKerjaProporsional(
          tglPenghitunganAkTerakhir,
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

    return semesters;
  }

  // Generate analisis dan rekomendasi
  static generateAnalisis(
    karyawan: Karyawan,
    predikat: string,
    akPeriodeIni: number,
    totalKumulatif: number,
    kebutuhanPangkat: number,
    kebutuhanJabatan: number,
    estimasiBulan: number
  ): {
    statusKenaikan: string;
    jenisKenaikan: string;
    rekomendasi: string;
    pertimbanganKhusus: string;
  } {
    const bisaUsulPangkat = totalKumulatif >= kebutuhanPangkat && kebutuhanPangkat > 0;
    const bisaUsulJabatan = totalKumulatif >= kebutuhanJabatan && kebutuhanJabatan > 0;

    // Status Kenaikan
    let statusKenaikan = 'Butuh Waktu Lama';
    if (bisaUsulPangkat || bisaUsulJabatan) {
      statusKenaikan = 'Bisa Usul';
    } else if (estimasiBulan <= 6) {
      statusKenaikan = 'Estimasi 6 Bulan';
    } else if (estimasiBulan <= 12) {
      statusKenaikan = 'Estimasi 1 Tahun';
    }

    // Jenis Kenaikan
    let jenisKenaikan = 'Reguler';
    const isKenaikanJenjang = this.isKenaikanJenjang(
      karyawan.jabatan, 
      this.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori),
      karyawan.golongan,
      this.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori)
    );
    
    if (isKenaikanJenjang) {
      jenisKenaikan = 'Jenjang';
    }

    // Rekomendasi
    let rekomendasi = 'Pertahankan kinerja saat ini';
    if (bisaUsulPangkat && bisaUsulJabatan) {
      rekomendasi = 'Segera usulkan kenaikan pangkat dan jabatan';
    } else if (bisaUsulPangkat) {
      rekomendasi = 'Segera usulkan kenaikan pangkat';
    } else if (bisaUsulJabatan) {
      rekomendasi = 'Segera usulkan kenaikan jabatan';
    } else if (estimasiBulan <= 6) {
      rekomendasi = 'Tingkatkan kinerja untuk mempercepat kenaikan';
    }

    // Pertimbangan Khusus
    let pertimbanganKhusus = '';
    if (karyawan.kategori === 'Reguler') {
      pertimbanganKhusus = 'Kategori Reguler - kenaikan berdasarkan masa kerja';
    } else if (predikat === 'Sangat Baik') {
      pertimbanganKhusus = 'Predikat sangat baik - berpeluang mendapatkan penilaian istimewa';
    } else if (predikat === 'Kurang') {
      pertimbanganKhusus = 'Perlu peningkatan kinerja signifikan';
    } else {
      pertimbanganKhusus = `AK diperoleh periode ini: ${akPeriodeIni}, Total kumulatif: ${totalKumulatif}`;
    }

    return {
      statusKenaikan,
      jenisKenaikan,
      rekomendasi,
      pertimbanganKhusus
    };
  }

  // Helper methods untuk kenaikan jenjang
  static isKenaikanJenjang(
    jabatanSekarang: string, 
    jabatanBerikutnya: string, 
    golonganSekarang: string, 
    golonganBerikutnya: string
  ): boolean {
    const titikJenjang = [
      { dari: 'Ahli Pertama', ke: 'Ahli Muda', golDari: 'III/b', golKe: 'III/c' },
      { dari: 'Ahli Muda', ke: 'Ahli Madya', golDari: 'III/d', golKe: 'IV/a' },
      { dari: 'Ahli Madya', ke: 'Ahli Utama', golDari: 'IV/c', golKe: 'IV/d' },
      { dari: 'Terampil', ke: 'Mahir', golDari: 'II/d', golKe: 'III/a' },
      { dari: 'Mahir', ke: 'Penyelia', golDari: 'III/b', golKe: 'III/c' }
    ];
    
    return titikJenjang.some(titik => 
      jabatanSekarang.includes(titik.dari) && 
      jabatanBerikutnya.includes(titik.ke) && 
      golonganSekarang === titik.golDari && 
      golonganBerikutnya === titik.golKe
    );
  }

  static getGolonganBerikutnya(golonganSekarang: string, kategori: string): string {
    if (kategori === 'Reguler') {
      const progressionReguler: { [key: string]: string } = {
        'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d', 'III/d': 'IV/a',
        'IV/a': 'IV/b', 'IV/b': 'IV/c', 'IV/c': 'IV/d', 'IV/d': 'IV/e'
      };
      return progressionReguler[golonganSekarang] || 'Tidak Ada';
    }
    
    const progressionKeahlian: { [key: string]: string } = {
      'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d', 'III/d': 'IV/a',
      'IV/a': 'IV/b', 'IV/b': 'IV/c', 'IV/c': 'IV/d', 'IV/d': 'IV/e'
    };
    
    const progressionKeterampilan: { [key: string]: string } = {
      'II/a': 'II/b', 'II/b': 'II/c', 'II/c': 'II/d', 'II/d': 'III/a',
      'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d'
    };
    
    const progression = kategori === 'Keahlian' ? progressionKeahlian : progressionKeterampilan;
    return progression[golonganSekarang] || 'Tidak Ada';
  }

  static getJabatanBerikutnya(jabatanSekarang: string, kategori: string): string {
    if (kategori === 'Reguler') return 'Tidak berlaku';
    
    const progressionKeahlian: { [key: string]: string } = {
      'Ahli Pertama': 'Ahli Muda', 'Ahli Muda': 'Ahli Madya', 
      'Ahli Madya': 'Ahli Utama', 'Ahli Utama': 'Tidak Ada'
    };
    
    const progressionKeterampilan: { [key: string]: string } = {
      'Terampil': 'Mahir', 'Mahir': 'Penyelia', 'Penyelia': 'Tidak Ada'
    };
    
    if (kategori === 'Keahlian') {
      for (const [key, value] of Object.entries(progressionKeahlian)) {
        if (jabatanSekarang.includes(key)) return value;
      }
    } else {
      for (const [key, value] of Object.entries(progressionKeterampilan)) {
        if (jabatanSekarang.includes(key)) return value;
      }
    }
    return 'Tidak Diketahui';
  }

  // Hitung estimasi bulan berdasarkan predikat
  static calculateEstimasiBulan(
    kekuranganAK: number,
    predikat: string,
    koefisienJabatan: number
  ): number {
    if (kekuranganAK <= 0) return 0;
    
    const koefisienPredikat = {
      'Sangat Baik': 1.50,
      'Baik': 1.00,
      'Cukup': 0.75,
      'Kurang': 0.50
    }[predikat] || 1.00;

    const akPerBulan = (koefisienPredikat * koefisienJabatan) / 12;
    return akPerBulan > 0 ? Math.ceil(kekuranganAK / akPerBulan) : 0;
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
      console.error(`API ${operation} gagal:`, error);
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
      const data = rows.slice(1)
        .filter((row: any[]) => {
          if (!nip) return true;
          const nipIndex = headers.indexOf('NIP');
          return nipIndex >= 0 && row[nipIndex] === nip;
        })
        .map((row: any[], index: number) => {
          const obj: KonversiData = {} as KonversiData;

          headers.forEach((header: string, colIndex: number) => {
            let value = row[colIndex];
            
            if (header === 'Tahun' || header === 'Semester' || header === 'No' || 
                header === 'Nilai_SKP' || header === 'Estimasi_Bulan') {
              value = Number(value) || 0;
            }
            else if (header === 'AK_Konversi' || header === 'Kebutuhan_Pangkat_AK' || 
                     header === 'Kebutuhan_Jabatan_AK' || header === 'AK_Sebelumnya' ||
                     header === 'AK_Periode_Ini' || header === 'Total_Kumulatif' ||
                     header === 'Selisih_Pangkat' || header === 'Selisih_Jabatan' ||
                     header === 'Kurleb_Pangkat' || header === 'Kurleb_Jabatan') {
              value = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Masa_Kerja_Bulan') {
              obj.Masa_Kerja_Bulan = Number(value) || 6;
            }
            else if (header === 'Jenis_Penilaian') {
              obj.Jenis_Penilaian = (value === 'PROPORSIONAL' ? 'PROPORSIONAL' : 'PENUH');
            }
            
            if (header !== 'Masa_Kerja_Bulan' && header !== 'Jenis_Penilaian') {
              (obj as any)[header] = value;
            }
          });
          
          obj.id = `${SHEET_NAME}_${index + 2}`;
          obj.rowIndex = index + 2;
          
          if (!obj.No || obj.No === 0) {
            obj.No = index + 1;
          }
          
          return obj;
        });
      
      return data;
    } catch (error) {
      console.error('Error reading data:', error);
      return [];
    }
  };

  const appendData = async (values: any[]) => {
    const cleanedValues = values.map(value => {
      if (value === undefined || value === null) return '';
      return value;
    });

    try {
      const result = await callAPI('append', { values: [cleanedValues] });
      return result;
    } catch (error) {
      throw error;
    }
  };

  const updateData = async (rowIndex: number, values: any[]) => {
    return await callAPI('update', { rowIndex, values: [values] });
  };

  const deleteData = async (rowIndex: number) => {
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

  const calculateAllData = (): {
    akKonversi: number;
    masaKerja: number;
    jenis: string;
    kebutuhanPangkat: number;
    kebutuhanJabatan: number;
    totalKumulatif: number;
    selisihPangkat: number;
    selisihJabatan: number;
    kurlebPangkat: number;
    kurlebJabatan: number;
    estimasiBulan: number;
    analisis: any;
  } => {
    if (!formData.Tahun || !formData.Semester || !formData.Predikat_Kinerja) {
      return {
        akKonversi: 0, masaKerja: 0, jenis: '',
        kebutuhanPangkat: 0, kebutuhanJabatan: 0,
        totalKumulatif: 0, selisihPangkat: 0, selisihJabatan: 0,
        kurlebPangkat: 0, kurlebJabatan: 0, estimasiBulan: 0,
        analisis: {}
      };
    }

    const { masaKerjaBulan, jenisPenilaian } = KonversiCalculator.calculateMasaKerjaProporsional(
      karyawan.tglPenghitunganAkTerakhir,
      formData.Tahun,
      formData.Semester
    );

    const koefisien = KonversiCalculator.getKoefisien(
      karyawan.jabatan,
      karyawan.kategori,
      karyawan.golongan
    );

    const akKonversi = KonversiCalculator.calculateAKFromPredikat(
      formData.Predikat_Kinerja!,
      formData.Nilai_SKP || 95,
      karyawan.jabatan,
      karyawan.kategori,
      karyawan.golongan,
      masaKerjaBulan,
      jenisPenilaian
    );

    const kebutuhanPangkat = KonversiCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
    const kebutuhanJabatan = KonversiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
    const totalKumulatif = karyawan.akKumulatif + akKonversi;
    const selisihPangkat = kebutuhanPangkat - totalKumulatif;
    const selisihJabatan = kebutuhanJabatan - totalKumulatif;
    const kurlebPangkat = Math.max(0, selisihPangkat);
    const kurlebJabatan = Math.max(0, selisihJabatan);

    const estimasiBulan = KonversiCalculator.calculateEstimasiBulan(
      kurlebPangkat,
      formData.Predikat_Kinerja!,
      koefisien
    );

    const analisis = KonversiCalculator.generateAnalisis(
      karyawan,
      formData.Predikat_Kinerja!,
      akKonversi,
      totalKumulatif,
      kebutuhanPangkat,
      kebutuhanJabatan,
      estimasiBulan
    );

    return {
      akKonversi,
      masaKerja: masaKerjaBulan,
      jenis: jenisPenilaian,
      kebutuhanPangkat,
      kebutuhanJabatan,
      totalKumulatif,
      selisihPangkat,
      selisihJabatan,
      kurlebPangkat,
      kurlebJabatan,
      estimasiBulan,
      analisis
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Tahun && formData.Semester && formData.Predikat_Kinerja) {
      const {
        akKonversi,
        masaKerja,
        jenis,
        kebutuhanPangkat,
        kebutuhanJabatan,
        totalKumulatif,
        selisihPangkat,
        selisihJabatan,
        kurlebPangkat,
        kurlebJabatan,
        estimasiBulan,
        analisis
      } = calculateAllData();

      const periode = KonversiCalculator.calculatePeriodeSemester(
        formData.Tahun, 
        formData.Semester
      );

      const finalData: KonversiData = {
        ...data,
        ...formData,
        // Data periode
        Periode: `${periode.mulai} - ${periode.selesai}`,
        Jenis_Periode: 'Semester',
        
        // Data pribadi
        Nomor_Karpeg: karyawan.unitKerja,
        Tempat_Lahir: karyawan.tempatLahir,
        Tanggal_Lahir: karyawan.tanggalLahir,
        Jenis_Kelamin: karyawan.jenisKelamin,
        
        // Data pangkat & jabatan
        Pangkat: karyawan.pangkat,
        Golongan: karyawan.golongan,
        TMT_Pangkat: karyawan.tmtPangkat,
        Jabatan: karyawan.jabatan,
        TMT_Jabatan: karyawan.tmtJabatan,
        
        // Data kinerja
        AK_Konversi: akKonversi,
        Tanggal_Penetapan: KonversiCalculator.formatDate(new Date()),
        
        // Analisis AK
        Kebutuhan_Pangkat_AK: kebutuhanPangkat,
        Kebutuhan_Jabatan_AK: kebutuhanJabatan,
        AK_Sebelumnya: karyawan.akKumulatif,
        AK_Periode_Ini: akKonversi,
        Total_Kumulatif: totalKumulatif,
        Selisih_Pangkat: selisihPangkat,
        Selisih_Jabatan: selisihJabatan,
        Kurleb_Pangkat: kurlebPangkat,
        Kurleb_Jabatan: kurlebJabatan,
        
        // Status & rekomendasi
        Status_Kenaikan: analisis.statusKenaikan,
        Jenis_Kenaikan: analisis.jenisKenaikan,
        Estimasi_Bulan: estimasiBulan,
        Rekomendasi: analisis.rekomendasi,
        Pertimbangan_Khusus: analisis.pertimbanganKhusus,
        
        // Metadata
        Last_Update: KonversiCalculator.formatDate(new Date()),
        
        // Internal
        Masa_Kerja_Bulan: masaKerja,
        Jenis_Penilaian: jenis as 'PENUH' | 'PROPORSIONAL'
      } as KonversiData;

      onSave(finalData);
    }
  };

  const {
    akKonversi,
    masaKerja,
    jenis,
    kebutuhanPangkat,
    kebutuhanJabatan,
    totalKumulatif,
    selisihPangkat,
    selisihJabatan,
    kurlebPangkat,
    kurlebJabatan,
    estimasiBulan,
    analisis
  } = calculateAllData();

  const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                value={formData.Predikat_Kinerja || "Baik"} 
                onValueChange={(value) => setFormData({...formData, Predikat_Kinerja: value as any})}
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
                value={formData.Nilai_SKP || 95}
                onChange={(e) => setFormData({...formData, Nilai_SKP: parseFloat(e.target.value)})}
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

          {formData.Tahun && formData.Semester && formData.Predikat_Kinerja && (
            <div className="p-4 bg-blue-50 rounded-lg space-y-3">
              <h4 className="font-semibold text-blue-800">Perhitungan Otomatis (BKN 2023):</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Informasi Periode:</strong></p>
                  <p>• Jenis Penilaian: {jenis}</p>
                  <p>• Masa Kerja: {masaKerja} bulan</p>
                  <p>• Periode: {KonversiCalculator.calculatePeriodeSemester(formData.Tahun, formData.Semester).mulai} - {KonversiCalculator.calculatePeriodeSemester(formData.Tahun, formData.Semester).selesai}</p>
                </div>
                
                <div>
                  <p><strong>Perhitungan AK:</strong></p>
                  <p>• Koefisien: {koefisien}</p>
                  <p>• Predikat: {formData.Predikat_Kinerja} ({
                    {'Sangat Baik': '1.50', 'Baik': '1.00', 'Cukup': '0.75', 'Kurang': '0.50'}[formData.Predikat_Kinerja]
                  })</p>
                  <p>• AK Konversi: {akKonversi}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Analisis Pangkat:</strong></p>
                  <p>• Kebutuhan: {kebutuhanPangkat}</p>
                  <p>• Total Kumulatif: {totalKumulatif.toFixed(3)}</p>
                  <p>• Selisih: {selisihPangkat.toFixed(3)}</p>
                  <p>• Kurleb: {kurlebPangkat.toFixed(3)}</p>
                </div>
                
                <div>
                  <p><strong>Analisis Jabatan:</strong></p>
                  <p>• Kebutuhan: {kebutuhanJabatan}</p>
                  <p>• Total Kumulatif: {totalKumulatif.toFixed(3)}</p>
                  <p>• Selisih: {selisihJabatan.toFixed(3)}</p>
                  <p>• Kurleb: {kurlebJabatan.toFixed(3)}</p>
                </div>
              </div>

              <div className="text-sm">
                <p><strong>Rekomendasi:</strong> {analisis.rekomendasi}</p>
                <p><strong>Status:</strong> {analisis.statusKenaikan} | <strong>Jenis:</strong> {analisis.jenisKenaikan}</p>
                <p><strong>Estimasi:</strong> {estimasiBulan} bulan</p>
              </div>

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

// ==================== MAIN COMPONENT ====================
const KonversiPredikat: React.FC<KonversiPredikatProps> = ({ karyawan }) => {
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
      
      // Format values untuk spreadsheet dengan semua field baru
      const values = [
        updatedData.No || nextNo,
        updatedData.Tahun,
        updatedData.Semester,
        updatedData.Periode,
        updatedData.Jenis_Periode,
        updatedData.Nama,
        updatedData.NIP,
        updatedData.Nomor_Karpeg,
        updatedData.Tempat_Lahir,
        updatedData.Tanggal_Lahir,
        updatedData.Jenis_Kelamin,
        updatedData.Pangkat,
        updatedData.Golongan,
        updatedData.TMT_Pangkat,
        updatedData.Jabatan,
        updatedData.TMT_Jabatan,
        updatedData.Predikat_Kinerja,
        updatedData.Nilai_SKP,
        KonversiCalculator.formatNumberForSheet(updatedData.AK_Konversi),
        updatedData.Tanggal_Penetapan,
        KonversiCalculator.formatNumberForSheet(updatedData.Kebutuhan_Pangkat_AK),
        KonversiCalculator.formatNumberForSheet(updatedData.Kebutuhan_Jabatan_AK),
        KonversiCalculator.formatNumberForSheet(updatedData.AK_Sebelumnya),
        KonversiCalculator.formatNumberForSheet(updatedData.AK_Periode_Ini),
        KonversiCalculator.formatNumberForSheet(updatedData.Total_Kumulatif),
        KonversiCalculator.formatNumberForSheet(updatedData.Selisih_Pangkat),
        KonversiCalculator.formatNumberForSheet(updatedData.Selisih_Jabatan),
        KonversiCalculator.formatNumberForSheet(updatedData.Kurleb_Pangkat),
        KonversiCalculator.formatNumberForSheet(updatedData.Kurleb_Jabatan),
        updatedData.Status_Kenaikan,
        updatedData.Jenis_Kenaikan,
        updatedData.Estimasi_Bulan,
        updatedData.Rekomendasi,
        updatedData.Pertimbangan_Khusus,
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
    const now = KonversiCalculator.formatDate(new Date());
    const tahun = new Date().getFullYear();
    const semester = new Date().getMonth() < 6 ? 1 : 2;
    
    const { masaKerjaBulan, jenisPenilaian } = KonversiCalculator.calculateMasaKerjaProporsional(
      karyawan.tglPenghitunganAkTerakhir,
      tahun,
      semester
    );

    const koefisien = KonversiCalculator.getKoefisien(
      karyawan.jabatan,
      karyawan.kategori,
      karyawan.golongan
    );

    const akKonversi = KonversiCalculator.calculateAKFromPredikat(
      'Baik', 
      95,
      karyawan.jabatan,
      karyawan.kategori,
      karyawan.golongan,
      masaKerjaBulan,
      jenisPenilaian
    );

    const kebutuhanPangkat = KonversiCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
    const kebutuhanJabatan = KonversiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
    const totalKumulatif = karyawan.akKumulatif + akKonversi;
    const selisihPangkat = kebutuhanPangkat - totalKumulatif;
    const selisihJabatan = kebutuhanJabatan - totalKumulatif;
    const kurlebPangkat = Math.max(0, selisihPangkat);
    const kurlebJabatan = Math.max(0, selisihJabatan);
    const estimasiBulan = KonversiCalculator.calculateEstimasiBulan(kurlebPangkat, 'Baik', koefisien);

    const analisis = KonversiCalculator.generateAnalisis(
      karyawan,
      'Baik',
      akKonversi,
      totalKumulatif,
      kebutuhanPangkat,
      kebutuhanJabatan,
      estimasiBulan
    );

    const periode = KonversiCalculator.calculatePeriodeSemester(tahun, semester);
    const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
    
    const newData: KonversiData = {
      No: nextNo,
      
      // Data periode
      Tahun: tahun,
      Semester: semester,
      Periode: `${periode.mulai} - ${periode.selesai}`,
      Jenis_Periode: 'Semester',
      
      // Data pribadi
      Nama: karyawan.nama,
      NIP: karyawan.nip,
      Nomor_Karpeg: karyawan.unitKerja,
      Tempat_Lahir: karyawan.tempatLahir,
      Tanggal_Lahir: karyawan.tanggalLahir,
      Jenis_Kelamin: karyawan.jenisKelamin,
      
      // Data pangkat & jabatan
      Pangkat: karyawan.pangkat,
      Golongan: karyawan.golongan,
      TMT_Pangkat: karyawan.tmtPangkat,
      Jabatan: karyawan.jabatan,
      TMT_Jabatan: karyawan.tmtJabatan,
      
      // Data kinerja
      Predikat_Kinerja: 'Baik',
      Nilai_SKP: 95,
      AK_Konversi: akKonversi,
      Tanggal_Penetapan: now,
      
      // Analisis AK
      Kebutuhan_Pangkat_AK: kebutuhanPangkat,
      Kebutuhan_Jabatan_AK: kebutuhanJabatan,
      AK_Sebelumnya: karyawan.akKumulatif,
      AK_Periode_Ini: akKonversi,
      Total_Kumulatif: totalKumulatif,
      Selisih_Pangkat: selisihPangkat,
      Selisih_Jabatan: selisihJabatan,
      Kurleb_Pangkat: kurlebPangkat,
      Kurleb_Jabatan: kurlebJabatan,
      
      // Status & rekomendasi
      Status_Kenaikan: analisis.statusKenaikan,
      Jenis_Kenaikan: analisis.jenisKenaikan,
      Estimasi_Bulan: estimasiBulan,
      Rekomendasi: analisis.rekomendasi,
      Pertimbangan_Khusus: analisis.pertimbanganKhusus,
      
      // Metadata
      Status: 'Draft',
      Catatan: '',
      Link_Dokumen: '',
      Last_Update: now,
      
      // Internal
      Masa_Kerja_Bulan: masaKerjaBulan,
      Jenis_Penilaian: jenisPenilaian
    };

    try {
      const values = [
        newData.No,
        newData.Tahun,
        newData.Semester,
        newData.Periode,
        newData.Jenis_Periode,
        newData.Nama,
        newData.NIP,
        newData.Nomor_Karpeg,
        newData.Tempat_Lahir,
        newData.Tanggal_Lahir,
        newData.Jenis_Kelamin,
        newData.Pangkat,
        newData.Golongan,
        newData.TMT_Pangkat,
        newData.Jabatan,
        newData.TMT_Jabatan,
        newData.Predikat_Kinerja,
        newData.Nilai_SKP,
        KonversiCalculator.formatNumberForSheet(newData.AK_Konversi),
        newData.Tanggal_Penetapan,
        KonversiCalculator.formatNumberForSheet(newData.Kebutuhan_Pangkat_AK),
        KonversiCalculator.formatNumberForSheet(newData.Kebutuhan_Jabatan_AK),
        KonversiCalculator.formatNumberForSheet(newData.AK_Sebelumnya),
        KonversiCalculator.formatNumberForSheet(newData.AK_Periode_Ini),
        KonversiCalculator.formatNumberForSheet(newData.Total_Kumulatif),
        KonversiCalculator.formatNumberForSheet(newData.Selisih_Pangkat),
        KonversiCalculator.formatNumberForSheet(newData.Selisih_Jabatan),
        KonversiCalculator.formatNumberForSheet(newData.Kurleb_Pangkat),
        KonversiCalculator.formatNumberForSheet(newData.Kurleb_Jabatan),
        newData.Status_Kenaikan,
        newData.Jenis_Kenaikan,
        newData.Estimasi_Bulan,
        newData.Rekomendasi,
        newData.Pertimbangan_Khusus,
        newData.Status,
        newData.Catatan,
        newData.Link_Dokumen,
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No</TableHead>
            <TableHead>Tahun</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Predikat</TableHead>
            <TableHead>AK Konversi</TableHead>
            <TableHead>Total Kumulatif</TableHead>
            <TableHead>Status Kenaikan</TableHead>
            <TableHead>Estimasi</TableHead>
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
                  data.Predikat_Kinerja === 'Sangat Baik' ? 'default' :
                  data.Predikat_Kinerja === 'Baik' ? 'secondary' :
                  data.Predikat_Kinerja === 'Cukup' ? 'outline' : 'destructive'
                }>
                  {data.Predikat_Kinerja}
                </Badge>
              </TableCell>
              <TableCell className="font-semibold">{data.AK_Konversi}</TableCell>
              <TableCell className="font-bold text-blue-600">{data.Total_Kumulatif}</TableCell>
              <TableCell>
                <Badge variant={
                  data.Status_Kenaikan === 'Bisa Usul' ? 'default' :
                  data.Status_Kenaikan === 'Estimasi 6 Bulan' ? 'secondary' : 'outline'
                }>
                  {data.Status_Kenaikan}
                </Badge>
              </TableCell>
              <TableCell>
                {data.Estimasi_Bulan > 0 ? `${data.Estimasi_Bulan} bulan` : 'Siap'}
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
    </div>
  );

  const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Konversi Predikat Kinerja (BKN 2023) - Data Lengkap
          </CardTitle>
          <CardDescription>
            Kelola data konversi predikat menjadi angka kredit untuk {karyawan.nama} dengan analisis lengkap
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
                  {[2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030].map(year => (
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
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Informasi Karyawan:</strong> {karyawan.kategori} - {karyawan.jabatan} - Golongan: {karyawan.golongan} - Koefisien: {koefisien} - Tanggal Penghitungan AK Terakhir: {karyawan.tglPenghitunganAkTerakhir}
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
                  <Button onClick={handleAddNew} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Data Pertama
                  </Button>
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
    </div>
  );
};

export default KonversiPredikat;