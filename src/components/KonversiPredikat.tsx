import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, Calendar, Filter, Save, Download, FileText } from 'lucide-react';
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
  status: 'Aktif' | 'Pensiun' | 'Mutasi';
  unitKerja: string;
  tmtJabatan: string;
  tmtPangkat: string;
  pendidikan: string;
  linkSkJabatan?: string;
  linkSkPangkat?: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  agama: string;
  email: string;
  telepon: string;
  alamat: string;
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

// Extended Interface dengan semua field yang diminta
interface ExtendedKonversiData extends KonversiData {
  // Data Identitas & Personal
  ID: string;
  Nomor_Karpeg: string;
  Tempat_Lahir: string;
  Tanggal_Lahir: string;
  Jenis_Kelamin: 'L' | 'P';
  
  // Data Periode & Penilaian
  Periode: string;
  Jenis_Periode: 'Semesteran' | 'Tahunan';
  Tanggal_Penetapan: string;
  
  // Data Kebutuhan & Perhitungan AK
  Kebutuhan_Pangkat_AK: number;
  Kebutuhan_Jabatan_AK: number;
  AK_Sebelumnya: number;
  AK_Periode_Ini: number;
  Total_Kumulatif: number;
  
  // Data Selisih & Status
  Selisih_Pangkat: number;
  Selisih_Jabatan: number;
  Kurleb_Pangkat: number;
  Kurleb_Jabatan: number;
  Status_Kenaikan: string;
  Jenis_Kenaikan: string;
  Estimasi_Bulan: number;
  
  // Data Analisis & Rekomendasi
  Rekomendasi: string;
  Pertimbangan_Khusus: string;
  
  // Nomor Unik
  Nomor_PAK?: string;
  Nomor_Akumulasi?: string;
}

interface KonversiPredikatProps {
  karyawan: Karyawan;
}

// ==================== SPREADSHEET CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "konversi_predikat_extended";

// ==================== UTILITY FUNCTIONS ====================
class KonversiCalculator {
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

  static formatNumberForSheet(num: number): string {
    return num.toString().replace('.', ',');
  }

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

    if (tglPenghitunganDate > periodeSelesai) {
      return { masaKerjaBulan: 0, jenisPenilaian: 'PROPORSIONAL' };
    }

    const startDate = tglPenghitunganDate <= periodeMulai ? periodeMulai : tglPenghitunganDate;
    const startFromNextMonth = new Date(startDate);
    startFromNextMonth.setMonth(startFromNextMonth.getMonth() + 1);
    startFromNextMonth.setDate(1);
    
    const endDate = sekarang < periodeSelesai ? sekarang : periodeSelesai;

    if (startFromNextMonth > endDate) {
      return { masaKerjaBulan: 0, jenisPenilaian: 'PROPORSIONAL' };
    }

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
      const isCurrentSemester = (semesterYear === currentYear && semester === currentSemester);
      
      let masaKerjaBulan: number;
      let jenisPenilaian: 'PENUH' | 'PROPORSIONAL';

      if (isCurrentSemester) {
        const { masaKerjaBulan: masaKerja, jenisPenilaian: jenis } = this.calculateMasaKerjaHinggaSekarang(
          tglPenghitunganAkTerakhir,
          semesterYear,
          semester
        );
        masaKerjaBulan = masaKerja;
        jenisPenilaian = jenis;
      } else {
        const { masaKerjaBulan: masaKerja, jenisPenilaian: jenis } = this.calculateMasaKerjaProporsional(
          tglPenghitunganAkTerakhir,
          semesterYear,
          semester
        );
        masaKerjaBulan = masaKerja;
        jenisPenilaian = jenis;
      }
      
      if (masaKerjaBulan > 0) {
        semesters.push({ 
          tahun: semesterYear, 
          semester: semester,
          masaKerjaBulan,
          jenisPenilaian
        });
      }
      
      if (semesterYear > currentYear || (semesterYear === currentYear && semester === 2)) {
        break;
      }
      
      if (semester === 1) {
        semester = 2;
      } else {
        semester = 1;
        semesterYear++;
      }
      
      if (semesters.length > 20) break;
    }

    return semesters;
  }

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
    if (kategori === 'Reguler') return 0;

    const koefisien = this.getKoefisien(jabatan, kategori, golongan);
    
    let akKonversi = 0;
    
    if (mode === 'tahunan') {
      if (jenisPenilaian === 'PENUH') {
        akKonversi = this.calculateAKPenuhTahunan(predikat, koefisien);
      } else {
        akKonversi = this.calculateAKProporsional(predikat, koefisien, masaKerjaBulan);
      }
    } else {
      if (jenisPenilaian === 'PENUH') {
        akKonversi = this.calculateAKPenuh(predikat, koefisien);
      } else {
        akKonversi = this.calculateAKProporsional(predikat, koefisien, masaKerjaBulan);
      }
    }
    
    return Number(akKonversi.toFixed(3));
  }
}

// ==================== EXTENDED CALCULATOR ====================
class ExtendedKonversiCalculator {
  // Generate ID berdasarkan pattern: 3210.xxxx/KONV/ST/yyyy
  static generateID(sequence: number, tahun: number, jenis: 'KONV' | 'PAK' | 'AKM' = 'KONV'): string {
    const sequenceStr = sequence.toString().padStart(4, '0');
    return `3210.${sequenceStr}/${jenis}/ST/${tahun}`;
  }

  // Hitung kebutuhan AK berdasarkan golongan dan jabatan
  static getKebutuhanPangkat(golongan: string, kategori: string): number {
    if (kategori === 'Reguler') return 0;

    const kebutuhanKeahlian: {[key: string]: number} = {
      'III/a': 50, 'III/b': 50, 'III/c': 100, 'III/d': 100,
      'IV/a': 150, 'IV/b': 150, 'IV/c': 150, 'IV/d': 200
    };
    
    const kebutuhanKeterampilan: {[key: string]: number} = {
      'II/a': 15, 'II/b': 20, 'II/c': 20, 'II/d': 20,
      'III/a': 50, 'III/b': 50, 'III/c': 100
    };
    
    const kebutuhan = kategori === 'Keahlian' ? kebutuhanKeahlian : kebutuhanKeterampilan;
    return kebutuhan[golongan] || 0;
  }

  static getKebutuhanJabatan(jabatan: string, kategori: string): number {
    if (kategori === 'Reguler') return 0;

    const kebutuhanKeahlian: {[key: string]: number} = {
      'Ahli Pertama': 100, 'Ahli Muda': 200, 'Ahli Madya': 450, 'Ahli Utama': 0
    };
    
    const kebutuhanKeterampilan: {[key: string]: number} = {
      'Terampil': 60, 'Mahir': 100, 'Penyelia': 0
    };
    
    if (kategori === 'Keahlian') {
      for (const [key, value] of Object.entries(kebutuhanKeahlian)) {
        if (jabatan.includes(key)) return value;
      }
    } else {
      for (const [key, value] of Object.entries(kebutuhanKeterampilan)) {
        if (jabatan.includes(key)) return value;
      }
    }
    return 0;
  }

  // Hitung semua field extended
  static calculateExtendedFields(
    karyawan: Karyawan,
    konversiData: KonversiData,
    sequence: number,
    mode: 'semesteran' | 'tahunan',
    totalAKSebelumnya: number = 0
  ): Omit<ExtendedKonversiData, keyof KonversiData> {
    
    // Data Identitas & Personal
    const ID = this.generateID(sequence, konversiData.Tahun);
    const nomorKarpeg = karyawan.unitKerja || '-';
    
    // Data Periode & Penilaian
    const periode = `${konversiData['TMT Mulai']} - ${konversiData['TMT Selesai']}`;
    const jenisPeriode = mode === 'semesteran' ? 'Semesteran' : 'Tahunan';
    const tanggalPenetapan = KonversiCalculator.formatDate(new Date());
    
    // Data Kebutuhan & Perhitungan AK
    const kebutuhanPangkatAK = this.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
    const kebutuhanJabatanAK = this.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
    const akSebelumnya = totalAKSebelumnya;
    const akPeriodeIni = konversiData['AK Konversi'];
    const totalKumulatif = akSebelumnya + akPeriodeIni;
    
    // Data Selisih & Status
    const selisihPangkat = kebutuhanPangkatAK - totalKumulatif;
    const selisihJabatan = kebutuhanJabatanAK - totalKumulatif;
    const kurlebPangkat = Math.max(0, selisihPangkat);
    const kurlebJabatan = Math.max(0, selisihJabatan);
    
    // Status Kenaikan
    const bisaUsulPangkat = totalKumulatif >= kebutuhanPangkatAK && kebutuhanPangkatAK > 0;
    const bisaUsulJabatan = totalKumulatif >= kebutuhanJabatanAK && kebutuhanJabatanAK > 0;
    const statusKenaikan = bisaUsulPangkat ? 'Bisa Usul Pangkat' : 
                          bisaUsulJabatan ? 'Bisa Usul Jabatan' : 'Belum Memenuhi';
    
    // Jenis Kenaikan
    const isKenaikanJenjang = this.isKenaikanJenjang(
      karyawan.jabatan, 
      this.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori),
      karyawan.golongan, 
      this.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori)
    );
    const jenisKenaikan = isKenaikanJenjang ? 'Jenjang' : 'Reguler';
    
    // Estimasi Bulan
    const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);
    const akPerBulan = 1.00 * koefisien / 12; // Asumsi predikat Baik
    const estimasiBulan = akPerBulan > 0 ? Math.ceil(Math.max(selisihPangkat, selisihJabatan) / akPerBulan) : 0;
    
    // Rekomendasi & Pertimbangan
    const rekomendasi = this.getRekomendasiKarir(karyawan, totalKumulatif, kebutuhanPangkatAK, kebutuhanJabatanAK);
    const pertimbanganKhusus = this.getPertimbanganKhusus(karyawan, bisaUsulPangkat, bisaUsulJabatan, isKenaikanJenjang);
    
    // Nomor Unik
    const nomorPAK = this.generateID(sequence, konversiData.Tahun, 'PAK');
    const nomorAkumulasi = this.generateID(sequence, konversiData.Tahun, 'AKM');

    return {
      // Data Identitas & Personal
      ID,
      Nomor_Karpeg: nomorKarpeg,
      Tempat_Lahir: karyawan.tempatLahir || 'Tidak Diketahui',
      Tanggal_Lahir: karyawan.tanggalLahir,
      Jenis_Kelamin: karyawan.jenisKelamin,
      
      // Data Periode & Penilaian
      Periode: periode,
      Jenis_Periode: jenisPeriode,
      Tanggal_Penetapan: tanggalPenetapan,
      
      // Data Kebutuhan & Perhitungan AK
      Kebutuhan_Pangkat_AK: kebutuhanPangkatAK,
      Kebutuhan_Jabatan_AK: kebutuhanJabatanAK,
      AK_Sebelumnya: akSebelumnya,
      AK_Periode_Ini: akPeriodeIni,
      Total_Kumulatif: totalKumulatif,
      
      // Data Selisih & Status
      Selisih_Pangkat: selisihPangkat,
      Selisih_Jabatan: selisihJabatan,
      Kurleb_Pangkat: kurlebPangkat,
      Kurleb_Jabatan: kurlebJabatan,
      Status_Kenaikan: statusKenaikan,
      Jenis_Kenaikan: jenisKenaikan,
      Estimasi_Bulan: estimasiBulan,
      
      // Data Analisis & Rekomendasi
      Rekomendasi: rekomendasi,
      Pertimbangan_Khusus: pertimbanganKhusus,
      
      // Nomor Unik
      Nomor_PAK: nomorPAK,
      Nomor_Akumulasi: nomorAkumulasi
    };
  }

  // Helper methods
  static isKenaikanJenjang(jabatanSekarang: string, jabatanBerikutnya: string, golonganSekarang: string, golonganBerikutnya: string): boolean {
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
    const progressionKeahlian: {[key: string]: string} = {
      'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d', 'III/d': 'IV/a',
      'IV/a': 'IV/b', 'IV/b': 'IV/c', 'IV/c': 'IV/d', 'IV/d': 'IV/e'
    };
    
    const progressionKeterampilan: {[key: string]: string} = {
      'II/a': 'II/b', 'II/b': 'II/c', 'II/c': 'II/d', 'II/d': 'III/a',
      'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d'
    };
    
    const progression = kategori === 'Keahlian' ? progressionKeahlian : progressionKeterampilan;
    return progression[golonganSekarang] || 'Tidak Ada';
  }

  static getJabatanBerikutnya(jabatanSekarang: string, kategori: string): string {
    if (kategori === 'Reguler') return 'Tidak berlaku';
    
    const progressionKeahlian: {[key: string]: string} = {
      'Ahli Pertama': 'Ahli Muda', 'Ahli Muda': 'Ahli Madya', 
      'Ahli Madya': 'Ahli Utama', 'Ahli Utama': 'Tidak Ada'
    };
    
    const progressionKeterampilan: {[key: string]: string} = {
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

  static getRekomendasiKarir(karyawan: Karyawan, totalAK: number, kebutuhanPangkat: number, kebutuhanJabatan: number): string {
    if (karyawan.kategori === 'Reguler') {
      if (kebutuhanPangkat === 0) return "Tingkatkan pendidikan untuk pengembangan karir lebih lanjut";
      return "Fokus pada pengalaman kerja dan pengembangan kompetensi";
    }

    if (totalAK >= kebutuhanJabatan && kebutuhanJabatan > 0) {
      return "Segera persiapkan dokumen untuk usulan kenaikan jabatan";
    } else if (totalAK >= kebutuhanPangkat && kebutuhanPangkat > 0) {
      return "Segera persiapkan dokumen untuk usulan kenaikan pangkat";
    } else {
      const kekurangan = Math.max(kebutuhanPangkat - totalAK, kebutuhanJabatan - totalAK);
      return `Perlu tambahan ${kekurangan.toFixed(3)} AK untuk memenuhi syarat kenaikan`;
    }
  }

  static getPertimbanganKhusus(karyawan: Karyawan, bisaUsulPangkat: boolean, bisaUsulJabatan: boolean, isKenaikanJenjang: boolean): string {
    const pertimbangan: string[] = [];

    if (isKenaikanJenjang && bisaUsulJabatan) {
      pertimbangan.push("Kenaikan jenjang - perlu persiapan uji kompetensi");
    }

    if (karyawan.kategori === 'Reguler') {
      pertimbangan.push("Kategori Reguler - kenaikan berdasarkan masa kerja");
    }

    if (karyawan.pendidikan.toLowerCase().includes('sma')) {
      pertimbangan.push("Pertimbangkan peningkatan pendidikan untuk pengembangan karir");
    }

    if (pertimbangan.length === 0) {
      return "Tidak ada pertimbangan khusus";
    }

    return pertimbangan.join("; ");
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
          const obj: KonversiData = { 
            id: `${SHEET_NAME}_${index + 2}`,
            rowIndex: index + 2,
            Last_Update: '',
            Masa_Kerja_Bulan: 6,
            Jenis_Penilaian: 'PENUH'
          } as KonversiData;

          headers.forEach((header: string, colIndex: number) => {
            let value = row[colIndex];
            
            if (header === 'Tahun' || header === 'Semester' || header === 'No') {
              value = Number(value) || 0;
            } else if (header === 'AK Konversi') {
              value = KonversiCalculator.parseNumberFromSheet(value);
            } else if (header === 'Nilai SKP') {
              value = Number(value) || 0;
            } else if (header === 'Banyak_Bulan') {
              obj.Masa_Kerja_Bulan = Number(value) || 6;
            } else if (header === 'Keterangan') {
              obj.Jenis_Penilaian = (value === 'PROPORSIONAL' ? 'PROPORSIONAL' : 'PENUH');
            }
            
            if (header !== 'Banyak_Bulan' && header !== 'Keterangan') {
              (obj as any)[header] = value;
            }
          });
          
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

    return await callAPI('append', { values: [cleanedValues] });
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

  const calculateAK = (): { akKonversi: number; masaKerja: number; jenis: string } => {
    if (!formData.Tahun || !formData.Semester || !formData.Predikat) {
      return { akKonversi: 0, masaKerja: 0, jenis: '' };
    }

    const { masaKerjaBulan, jenisPenilaian } = KonversiCalculator.calculateMasaKerjaProporsional(
      karyawan.tglPenghitunganAkTerakhir,
      formData.Tahun,
      formData.Semester
    );

    const akKonversi = KonversiCalculator.calculateAKFromPredikat(
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
      const periode = KonversiCalculator.calculatePeriodeSemester(
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
        Last_Update: KonversiCalculator.formatDate(new Date())
      } as KonversiData;

      onSave(finalData);
    }
  };

  const { akKonversi, masaKerja, jenis } = calculateAK();
  const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

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
                • Periode: {KonversiCalculator.calculatePeriodeSemester(formData.Tahun, formData.Semester).mulai} - {KonversiCalculator.calculatePeriodeSemester(formData.Tahun, formData.Semester).selesai}
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

// ==================== GENERATE SEMESTER MODAL ====================
const GenerateSemesterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (semesters: { 
    tahun: number; 
    semester: 1 | 2;
    masaKerjaBulan: number;
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
  }[], mode: 'semesteran' | 'tahunan') => void;
  tglPenghitunganAkTerakhir: string;
  karyawan: Karyawan;
}> = ({ isOpen, onClose, onGenerate, tglPenghitunganAkTerakhir, karyawan }) => {
  const [availableSemesters, setAvailableSemesters] = useState<{ 
    tahun: number; 
    semester: 1 | 2;
    masaKerjaBulan: number;
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
  }[]>([]);
  const [generateMode, setGenerateMode] = useState<'semesteran' | 'tahunan'>('semesteran');

  useEffect(() => {
    if (isOpen && tglPenghitunganAkTerakhir) {
      const semesters = KonversiCalculator.generateSemesterFromTglPenghitungan(tglPenghitunganAkTerakhir);
      setAvailableSemesters(semesters);
    }
  }, [isOpen, tglPenghitunganAkTerakhir]);

  const convertToTahunan = (semesters: typeof availableSemesters) => {
    const tahunanMap = new Map<number, {
      tahun: number;
      masaKerjaBulan: number;
      jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
      semesters: (1 | 2)[];
    }>();

    semesters.forEach(semester => {
      if (!tahunanMap.has(semester.tahun)) {
        tahunanMap.set(semester.tahun, {
          tahun: semester.tahun,
          masaKerjaBulan: 0,
          jenisPenilaian: 'PENUH',
          semesters: []
        });
      }
      
      const tahunData = tahunanMap.get(semester.tahun)!;
      tahunData.masaKerjaBulan += semester.masaKerjaBulan;
      tahunData.semesters.push(semester.semester);
      
      if (semester.jenisPenilaian === 'PROPORSIONAL') {
        tahunData.jenisPenilaian = 'PROPORSIONAL';
      }
    });

    return Array.from(tahunanMap.values()).map(tahunData => ({
      tahun: tahunData.tahun,
      semester: 1 as 1 | 2,
      masaKerjaBulan: Math.min(12, tahunData.masaKerjaBulan),
      jenisPenilaian: tahunData.jenisPenilaian,
      semesters: tahunData.semesters
    }));
  };

  const handleGenerate = () => {
    let dataToGenerate = availableSemesters;
    
    if (generateMode === 'tahunan') {
      dataToGenerate = convertToTahunan(availableSemesters);
    }
    
    onGenerate(dataToGenerate, generateMode);
    onClose();
  };

  const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);
  const tahunanData = convertToTahunan(availableSemesters);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Generate Data dari Tanggal Penghitungan AK Terakhir</DialogTitle>
          <DialogDescription>
            Membuat data konversi dari Tanggal Penghitungan AK Terakhir: {tglPenghitunganAkTerakhir} sesuai Peraturan BKN 2023
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="generate-mode">Mode Generate</Label>
              <Select 
                value={generateMode} 
                onValueChange={(value: 'semesteran' | 'tahunan') => setGenerateMode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semesteran">Semesteran (Data per Semester)</SelectItem>
                  <SelectItem value="tahunan">Tahunan (Data Gabungan per Tahun)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Tanggal Penghitungan AK Terakhir:</strong> {tglPenghitunganAkTerakhir}<br />
              <strong>Mode:</strong> {generateMode === 'semesteran' ? 'Semesteran' : 'Tahunan'}<br />
              <strong>Jumlah {generateMode === 'semesteran' ? 'Semester' : 'Tahun'}:</strong> {generateMode === 'semesteran' ? availableSemesters.length : tahunanData.length}<br />
              <strong>Kategori:</strong> {karyawan.kategori}<br />
              <strong>Golongan:</strong> {karyawan.golongan}<br />
              <strong>Koefisien:</strong> {koefisien}
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Tahun</TableHead>
                  {generateMode === 'semesteran' && <TableHead>Semester</TableHead>}
                  <TableHead>Periode</TableHead>
                  <TableHead>Jenis Penilaian</TableHead>
                  <TableHead>Masa Kerja</TableHead>
                  <TableHead>AK Estimasi (Baik)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(generateMode === 'semesteran' ? availableSemesters : tahunanData).map((item, index) => {
                  const periode = generateMode === 'tahunan' ? 
                    { mulai: `01/01/${item.tahun}`, selesai: `31/12/${item.tahun}` } :
                    KonversiCalculator.calculatePeriodeSemester(item.tahun, item.semester);
                  
                  const akEstimasi = KonversiCalculator.calculateAKFromPredikat(
                    'Baik', 
                    95,
                    karyawan.jabatan,
                    karyawan.kategori,
                    karyawan.golongan,
                    item.masaKerjaBulan,
                    item.jenisPenilaian,
                    generateMode
                  );
                  
                  return (
                    <TableRow key={generateMode === 'semesteran' ? `${item.tahun}-${item.semester}` : `tahun-${item.tahun}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.tahun}</TableCell>
                      {generateMode === 'semesteran' && <TableCell>Semester {item.semester}</TableCell>}
                      <TableCell className="text-sm">{periode.mulai} - {periode.selesai}</TableCell>
                      <TableCell>
                        <Badge variant={item.jenisPenilaian === 'PENUH' ? 'default' : 'secondary'}>
                          {item.jenisPenilaian}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.masaKerjaBulan} bulan</TableCell>
                      <TableCell className="font-semibold">{akEstimasi}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleGenerate} disabled={availableSemesters.length === 0}>
              Generate {generateMode === 'semesteran' ? availableSemesters.length : tahunanData.length} {generateMode === 'semesteran' ? 'Semester' : 'Tahun'}
            </Button>
          </DialogFooter>
        </div>
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
      
      const values = [
        updatedData.No || nextNo,
        updatedData.NIP,
        updatedData.Nama,
        updatedData.Tahun,
        updatedData.Semester,
        updatedData.Predikat,
        updatedData['Nilai SKP'],
        KonversiCalculator.formatNumberForSheet(updatedData['AK Konversi']),
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

  // Fungsi untuk menghitung total AK kumulatif sebelum periode tertentu
  const calculateTotalAKSebelumnya = (tahun: number, semester: 1 | 2): number => {
    const dataSebelumnya = konversiData.filter(data => {
      if (data.Tahun < tahun) return true;
      if (data.Tahun === tahun && data.Semester < semester) return true;
      return false;
    });

    return dataSebelumnya.reduce((total, data) => total + data['AK Konversi'], karyawan.akKumulatif);
  };

  // Fungsi utama untuk generate data extended
  const handleGenerateSemesters = async (semesters: { 
    tahun: number; 
    semester: 1 | 2;
    masaKerjaBulan: number;
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
  }[], mode: 'semesteran' | 'tahunan') => {
    try {
      const now = KonversiCalculator.formatDate(new Date());
      const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
      
      let successCount = 0;
      let errorCount = 0;

      for (const [index, item] of semesters.entries()) {
        try {
          // Hitung AK Konversi
          const akKonversi = KonversiCalculator.calculateAKFromPredikat(
            'Baik', 
            95,
            karyawan.jabatan,
            karyawan.kategori,
            karyawan.golongan,
            item.masaKerjaBulan,
            item.jenisPenilaian,
            mode
          );

          // Tentukan periode
          let periode;
          if (mode === 'tahunan') {
            periode = {
              mulai: `01/01/${item.tahun}`,
              selesai: `31/12/${item.tahun}`
            };
          } else {
            periode = KonversiCalculator.calculatePeriodeSemester(item.tahun, item.semester);
          }

          // Buat data konversi dasar
          const konversiDataItem: KonversiData = {
            No: nextNo + index,
            NIP: karyawan.nip,
            Nama: karyawan.nama,
            Tahun: item.tahun,
            Semester: mode === 'tahunan' ? 1 : item.semester,
            Predikat: 'Baik',
            'Nilai SKP': 95,
            'AK Konversi': akKonversi,
            'TMT Mulai': periode.mulai,
            'TMT Selesai': periode.selesai,
            Status: 'Generated',
            Catatan: `Auto-generated from Tanggal Penghitungan AK Terakhir ${karyawan.tglPenghitunganAkTerakhir} (${item.jenisPenilaian} - ${mode})`,
            Link_Dokumen: '',
            Last_Update: now,
            Masa_Kerja_Bulan: item.masaKerjaBulan,
            Jenis_Penilaian: item.jenisPenilaian
          };

          // Hitung total AK sebelumnya untuk kumulatif
          const totalAKSebelumnya = calculateTotalAKSebelumnya(item.tahun, item.semester);

          // Hitung extended fields
          const extendedFields = ExtendedKonversiCalculator.calculateExtendedFields(
            karyawan,
            konversiDataItem,
            nextNo + index,
            mode,
            totalAKSebelumnya
          );

          // Gabungkan semua data menjadi extended data
          const extendedData: ExtendedKonversiData = {
            ...konversiDataItem,
            ...extendedFields
          };

          // Siapkan values untuk spreadsheet (semua field dalam urutan yang benar)
          const values = [
            extendedData.No,
            extendedData.NIP,
            extendedData.Nama,
            extendedData.Tahun,
            extendedData.Semester,
            extendedData.Predikat,
            extendedData['Nilai SKP'],
            KonversiCalculator.formatNumberForSheet(extendedData['AK Konversi']),
            extendedData['TMT Mulai'],
            extendedData['TMT Selesai'],
            extendedData.Status,
            extendedData.Catatan,
            extendedData.Link_Dokumen,
            extendedData.Last_Update,
            extendedData.Masa_Kerja_Bulan,
            extendedData.Jenis_Penilaian,
            // Extended fields
            extendedData.ID,
            extendedData.Nomor_Karpeg,
            extendedData.Tempat_Lahir,
            extendedData.Tanggal_Lahir,
            extendedData.Jenis_Kelamin,
            extendedData.Periode,
            extendedData.Jenis_Periode,
            extendedData.Tanggal_Penetapan,
            extendedData.Kebutuhan_Pangkat_AK,
            extendedData.Kebutuhan_Jabatan_AK,
            extendedData.AK_Sebelumnya,
            extendedData.AK_Periode_Ini,
            extendedData.Total_Kumulatif,
            extendedData.Selisih_Pangkat,
            extendedData.Selisih_Jabatan,
            extendedData.Kurleb_Pangkat,
            extendedData.Kurleb_Jabatan,
            extendedData.Status_Kenaikan,
            extendedData.Jenis_Kenaikan,
            extendedData.Estimasi_Bulan,
            extendedData.Rekomendasi,
            extendedData.Pertimbangan_Khusus,
            extendedData.Nomor_PAK,
            extendedData.Nomor_Akumulasi
          ];

          await api.appendData(values);
          successCount++;
          
          // Delay kecil antara request
          if (index < semesters.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }

        } catch (error) {
          errorCount++;
          console.error(`Gagal menyimpan data untuk ${mode === 'tahunan' ? 'tahun' : 'semester'} ${item.tahun}:`, error);
        }
      }

      if (errorCount > 0) {
        toast({
          title: "Peringatan",
          description: `Berhasil menyimpan ${successCount} data, gagal menyimpan ${errorCount} data`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sukses",
          description: `Berhasil generate ${successCount} ${mode === 'semesteran' ? 'semester' : 'tahun'} dengan data lengkap`
        });
      }

      await loadData();

    } catch (error) {
      console.error('Error dalam handleGenerateSemesters:', error);
      toast({
        title: "Error",
        description: `Gagal generate data ${mode}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
          <TableHead>ID</TableHead>
          <TableHead>Tahun</TableHead>
          <TableHead>Semester</TableHead>
          <TableHead>Predikat</TableHead>
          <TableHead>AK Konversi</TableHead>
          <TableHead>Total Kumulatif</TableHead>
          <TableHead>Status Kenaikan</TableHead>
          <TableHead>Last Update</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {getFilteredData().map((data: KonversiData) => (
          <TableRow key={data.id}>
            <TableCell className="font-medium">{data.No}</TableCell>
            <TableCell className="text-xs">
              {ExtendedKonversiCalculator.generateID(data.No || 1, data.Tahun)}
            </TableCell>
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
            <TableCell className="font-semibold">{data['AK Konversi']}</TableCell>
            <TableCell className="font-bold text-blue-600">
              {(calculateTotalAKSebelumnya(data.Tahun, data.Semester) + data['AK Konversi']).toFixed(3)}
            </TableCell>
            <TableCell>
              <Badge variant={
                data.Status === 'Generated' ? 'default' : 'secondary'
              }>
                {data.Status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">{data.Last_Update}</TableCell>
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

  const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Konversi Predikat Kinerja (Extended)
          </CardTitle>
          <CardDescription>
            Kelola data konversi predikat dengan semua field yang dibutuhkan untuk {karyawan.nama}
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
            
            <Button onClick={() => setGenerateModal(true)} variant="secondary">
              <Save className="h-4 w-4 mr-2" />
              Generate Data Lengkap
            </Button>

            <Button variant="default">
              <Download className="h-4 w-4 mr-2" />
              Export
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
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada data konversi ditemukan</p>
                  <div className="flex gap-2 justify-center mt-2">
                    <Button onClick={() => setGenerateModal(true)} variant="default">
                      <Save className="h-4 w-4 mr-2" />
                      Generate dari Tanggal Penghitungan AK Terakhir
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
        tglPenghitunganAkTerakhir={karyawan.tglPenghitunganAkTerakhir}
        karyawan={karyawan}
      />
    </div>
  );
};

export default KonversiPredikat;