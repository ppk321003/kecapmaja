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
  tempatLahir: string;
  unitKerja: string;
  tmtJabatan: string;
  tmtPangkat: string;
  pendidikan: string;
  tanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  linkSkJabatan?: string;
  linkSkPangkat?: string;
}

interface KonversiData {
  id?: string;
  No?: number;
  Tahun: number;
  Semester: 1 | 2;
  Periode: string;
  Jenis_Periode: 'Semester' | 'Tahunan';
  Nama: string;
  NIP: string;
  Nomor_Karpeg: string;
  Tempat_Lahir: string;
  Tanggal_Lahir: string;
  Jenis_Kelamin: 'Laki-laki' | 'Perempuan';
  Pangkat: string;
  Golongan: string;
  TMT_Pangkat: string;
  Jabatan: string;
  TMT_Jabatan: string;
  Predikat_Kinerja: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  Nilai_SKP: number;
  AK_Konversi: number;
  Tanggal_Penetapan: string;
  Kebutuhan_Pangkat_AK: number;
  Kebutuhan_Jabatan_AK: number;
  AK_Sebelumnya: number;
  AK_Periode_Ini: number;
  Total_Kumulatif: number;
  Selisih_Pangkat: number;
  Selisih_Jabatan: number;
  Kurleb_Pangkat: number;
  Kurleb_Jabatan: number;
  Status_Kenaikan: string;
  Jenis_Kenaikan: string;
  Estimasi_Bulan: number;
  Rekomendasi: string;
  Pertimbangan_Khusus: string;
  Status: 'Draft' | 'Generated';
  Catatan?: string;
  Link_Dokumen?: string;
  Last_Update: string;
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
const DATA_SHEET_NAME = "data";

// ==================== UTILITY FUNCTIONS ====================
class DateParser {
  static parseTanggalIndonesia(tanggal: string): Date {
    if (!tanggal || tanggal.trim() === '') return new Date();

    if (tanggal.includes('-')) {
      const date = new Date(tanggal);
      if (!isNaN(date.getTime())) return date;
    }

    const bulanMap: {[key: string]: number} = {
      'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
      'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
      'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };

    const cleanedDate = tanggal.toLowerCase().trim();
    const parts = cleanedDate.split(' ');
    
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = bulanMap[parts[1]];
      const year = parseInt(parts[2]);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    const separator = cleanedDate.includes('/') ? '/' : '-';
    const dateParts = cleanedDate.split(separator);
    if (dateParts.length === 3) {
      let day, month, year;
      if (dateParts[0].length === 4) {
        year = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        day = parseInt(dateParts[2]);
      } else {
        day = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        year = parseInt(dateParts[2]);
      }
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    const fallbackDate = new Date(tanggal);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }

    console.warn(`Tidak bisa parsing tanggal: ${tanggal}, menggunakan tanggal default`);
    return new Date();
  }

  static hitungSelisihBulan(tanggalAwal: Date, tanggalAkhir: Date): number {
    const tahunAwal = tanggalAwal.getFullYear();
    const bulanAwal = tanggalAwal.getMonth();
    const tahunAkhir = tanggalAkhir.getFullYear();
    const bulanAkhir = tanggalAkhir.getMonth();
    return (tahunAkhir - tahunAwal) * 12 + (bulanAkhir - bulanAwal);
  }
}

class KonversiCalculator {
  static getKoefisien(jabatan: string, kategori: string, golongan: string): number {
    if (kategori === 'Reguler') return 0;

    const jabatanLower = jabatan.toLowerCase();
    const koefisienMap: { [key: string]: number } = {
      'ahli pertama': 12.5, 'ahli muda': 25.0, 'ahli madya': 37.5, 'ahli utama': 50.0,
      'terampil': 5.0, 'mahir': 12.5, 'penyelia': 25.0, 'fungsional umum': 5.0
    };

    for (const [key, value] of Object.entries(koefisienMap)) {
      if (jabatanLower.includes(key)) return value;
    }

    const golonganLower = golongan.toLowerCase();
    if (kategori === 'Keahlian') {
      if (golonganLower.includes('iv/c') || golonganLower.includes('iv/d')) return 50.0;
      if (golonganLower.includes('iv/a') || golonganLower.includes('iv/b')) return 37.5;
      if (golonganLower.includes('iii/c') || golonganLower.includes('iii/d')) return 25.0;
      if (golonganLower.includes('iii/a') || golonganLower.includes('iii/b')) return 12.5;
    } else if (kategori === 'Keterampilan') {
      if (golonganLower.includes('iii/c') || golonganLower.includes('iii/d')) return 25.0;
      if (golonganLower.includes('iii/a') || golonganLower.includes('iii/b')) return 12.5;
      if (golonganLower.includes('ii/')) return 5.0;
    }
    
    return 12.5;
  }

  static getKebutuhanPangkat(golonganSekarang: string, kategori: string, jabatanSekarang?: string): number {
    if (kategori === 'Reguler') return 0;

    const kebutuhanKeahlian: { [key: string]: number } = {
      'III/a': 50, 'III/b': 50, 'III/c': 100, 'III/d': 100,
      'IV/a': 150, 'IV/b': 150, 'IV/c': 150, 'IV/d': 200
    };
    
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'II/a': 15, 'II/b': 20, 'II/c': 20, 'II/d': 20,
      'III/a': 50, 'III/b': 50, 'III/c': 100
    };
    
    let kebutuhan = kategori === 'Keahlian' ? 
      kebutuhanKeahlian[golonganSekarang] || 0 : 
      kebutuhanKeterampilan[golonganSekarang] || 0;

    if (jabatanSekarang) {
      const jabatanBerikutnya = this.getJabatanBerikutnya(jabatanSekarang, kategori);
      const golonganBerikutnya = this.getGolonganBerikutnya(golonganSekarang, kategori);
      
      const isKenaikanJenjang = this.isKenaikanJenjang(
        jabatanSekarang, 
        jabatanBerikutnya, 
        golonganSekarang, 
        golonganBerikutnya
      );
      
      if (isKenaikanJenjang) {
        kebutuhan = this.getKebutuhanJabatan(jabatanSekarang, kategori);
      }
    }
    
    return kebutuhan;
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

  static calculateAKProporsional(predikat: string, koefisienJabatan: number, masaKerjaBulan: number): number {
    if (koefisienJabatan === 0) return 0;

    const koefisienPredikat = {
      'Sangat Baik': 1.50, 'Baik': 1.00, 'Cukup': 0.75, 'Kurang': 0.50
    }[predikat] || 1.00;

    const akProporsional = (koefisienPredikat * koefisienJabatan * masaKerjaBulan) / 12;
    return Number(akProporsional.toFixed(3));
  }

  static calculateAKPenuh(predikat: string, koefisienJabatan: number): number {
    if (koefisienJabatan === 0) return 0;

    const koefisienPredikat = {
      'Sangat Baik': 1.50, 'Baik': 1.00, 'Cukup': 0.75, 'Kurang': 0.50
    }[predikat] || 1.00;

    const akPenuh = (koefisienPredikat * koefisienJabatan * 6) / 12;
    return Number(akPenuh.toFixed(3));
  }

  static calculateAKPenuhTahunan(predikat: string, koefisienJabatan: number): number {
    if (koefisienJabatan === 0) return 0;

    const koefisienPredikat = {
      'Sangat Baik': 1.50, 'Baik': 1.00, 'Cukup': 0.75, 'Kurang': 0.50
    }[predikat] || 1.00;

    const akPenuh = (koefisienPredikat * koefisienJabatan * 12) / 12;
    return Number(akPenuh.toFixed(3));
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

  static calculateMasaKerjaProporsional(
    tglPenghitunganAkTerakhir: string, 
    tahun: number, 
    semester: 1 | 2
  ): { masaKerjaBulan: number; jenisPenilaian: 'PENUH' | 'PROPORSIONAL' } {
    const tglPenghitunganDate = DateParser.parseTanggalIndonesia(tglPenghitunganAkTerakhir);
    const periode = this.calculatePeriodeSemester(tahun, semester);
    const periodeMulai = DateParser.parseTanggalIndonesia(periode.mulai);
    const periodeSelesai = DateParser.parseTanggalIndonesia(periode.selesai);
    const sekarang = new Date();

    // PERBAIKAN: Untuk periode berjalan (current period), selalu hitung proporsional
    const isCurrentPeriod = this.isSemesterInProgress(tahun, semester, sekarang);
    
    if (tglPenghitunganDate > periodeSelesai) {
      return { masaKerjaBulan: 0, jenisPenilaian: 'PROPORSIONAL' };
    }

    // PERBAIKAN: Jika periode sudah lewat dan tanggal penghitungan <= periode mulai, maka PENUH
    if (!isCurrentPeriod && tglPenghitunganDate <= periodeMulai) {
      return { masaKerjaBulan: 6, jenisPenilaian: 'PENUH' };
    }

    // PERBAIKAN: Untuk periode berjalan, selalu hitung proporsional berdasarkan bulan berjalan
    const startDate = tglPenghitunganDate <= periodeMulai ? periodeMulai : tglPenghitunganDate;
    
    const startFromNextMonth = new Date(startDate);
    startFromNextMonth.setMonth(startFromNextMonth.getMonth() + 1);
    startFromNextMonth.setDate(1);
    
    // PERBAIKAN: Untuk periode berjalan, gunakan tanggal sekarang sebagai end date
    const endDate = isCurrentPeriod ? sekarang : periodeSelesai;

    if (startFromNextMonth > endDate) {
      return { masaKerjaBulan: 0, jenisPenilaian: 'PROPORSIONAL' };
    }

    let masaKerjaBulan = 0;
    const current = new Date(startFromNextMonth);
    
    while (current <= endDate) {
      masaKerjaBulan++;
      current.setMonth(current.getMonth() + 1);
    }

    // PERBAIKAN: Untuk periode berjalan, batasi maksimal 6 bulan
    const maxBulan = isCurrentPeriod ? Math.min(6, this.getBulanHinggaSekarang(tahun, semester)) : 6;
    masaKerjaBulan = Math.max(1, Math.min(maxBulan, masaKerjaBulan));
    
    const jenisPenilaian = (isCurrentPeriod || masaKerjaBulan < 6) ? 'PROPORSIONAL' : 'PENUH';
    
    return { masaKerjaBulan, jenisPenilaian };
  }

  static getBulanHinggaSekarang(tahun: number, semester: 1 | 2): number {
    const sekarang = new Date();
    const currentYear = sekarang.getFullYear();
    const currentMonth = sekarang.getMonth() + 1;
    
    // Jika bukan tahun yang sama, return 6 (full)
    if (tahun !== currentYear) return 6;
    
    if (semester === 1) {
      // Semester 1: Jan-Jun, hitung bulan dari Januari sampai bulan sekarang
      return Math.min(currentMonth, 6);
    } else {
      // Semester 2: Jul-Des, hitung bulan dari Juli sampai bulan sekarang
      return Math.max(0, Math.min(currentMonth - 6, 6));
    }
  }

  // HANYA SATU FUNGSI isSemesterInProgress - menghapus duplikasi
  static isSemesterInProgress(year: number, semester: 1 | 2, now: Date): boolean {
    const semesterStart = semester === 1 ? 
      new Date(year, 0, 1) : new Date(year, 6, 1);
    
    const semesterEnd = semester === 1 ? 
      new Date(year, 5, 30) : new Date(year, 11, 31);
    
    // PERBAIKAN: Periode dianggap "in progress" jika sekarang masih dalam rentang periode
    return semesterStart <= now && semesterEnd >= now;
  }

  static calculateEstimasiBulan(kekuranganAK: number, predikat: string, koefisienJabatan: number): number {
    if (kekuranganAK <= 0) return 0;
    if (koefisienJabatan === 0) return 0;
    
    const koefisienPredikat = {
      'Sangat Baik': 1.50, 'Baik': 1.00, 'Cukup': 0.75, 'Kurang': 0.50
    }[predikat] || 1.00;

    const akPerBulan = (koefisienPredikat * koefisienJabatan) / 12;
    return akPerBulan > 0 ? Math.ceil(kekuranganAK / akPerBulan) : 0;
  }

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
    if (karyawan.kategori === 'Reguler') {
      return {
        statusKenaikan: 'Reguler',
        jenisKenaikan: 'Reguler',
        rekomendasi: 'Kenaikan berdasarkan masa kerja',
        pertimbanganKhusus: 'Kategori Reguler'
      };
    }

    const shouldPromoteJenjangAndPangkat = (
      jabatanSekarang: string,
      golonganSekarang: string,
      totalAK: number
    ) => {
      if (jabatanSekarang.includes('Ahli Muda') && golonganSekarang === 'III/d') {
        return totalAK >= 200;
      } else if (jabatanSekarang.includes('Mahir') && golonganSekarang === 'III/b') {
        return totalAK >= 100;
      }
      return false;
    };

    let statusKenaikan = 'Butuh Waktu';
    let jenisKenaikan = 'Reguler';
    let rekomendasi = 'Pertahankan kinerja saat ini';

    const promote = shouldPromoteJenjangAndPangkat(karyawan.jabatan, karyawan.golongan, totalKumulatif);

    if (promote) {
      statusKenaikan = 'Bisa Usul Jenjang & Pangkat';
      jenisKenaikan = 'Jenjang & Pangkat';
      rekomendasi = 'Segera usulkan kenaikan jenjang jabatan dan pangkat bersamaan';
    } else if (totalKumulatif >= kebutuhanPangkat && kebutuhanPangkat > 0) {
      statusKenaikan = 'Bisa Usul Pangkat';
      jenisKenaikan = 'Pangkat';
      rekomendasi = 'Segera usulkan kenaikan pangkat';
    } else if (totalKumulatif >= kebutuhanJabatan && kebutuhanJabatan > 0) {
      statusKenaikan = 'Bisa Usul Jenjang';
      jenisKenaikan = 'Jenjang';
      rekomendasi = 'Segera usulkan kenaikan jenjang jabatan';
    } else if (estimasiBulan <= 6) {
      statusKenaikan = 'Estimasi 6 Bulan';
      rekomendasi = 'Tingkatkan kinerja untuk mempercepat kenaikan';
    } else if (estimasiBulan <= 12) {
      statusKenaikan = 'Estimasi 1 Tahun';
      rekomendasi = 'Tingkatkan kinerja untuk mempercepat kenaikan';
    }

    let pertimbanganKhusus = '';
    if (promote) {
      pertimbanganKhusus = `✅ Memenuhi syarat kenaikan jenjang dan pangkat bersamaan (${totalKumulatif} AK)`;
    } else if (predikat === 'Sangat Baik') {
      pertimbanganKhusus = 'Predikat sangat baik - berpeluang mendapatkan penilaian istimewa';
    } else if (predikat === 'Kurang') {
      pertimbanganKhusus = 'Perlu peningkatan kinerja signifikan';
    } else {
      pertimbanganKhusus = `AK diperoleh periode ini: ${akPeriodeIni}, Total kumulatif: ${totalKumulatif}`;
    }

    return { statusKenaikan, jenisKenaikan, rekomendasi, pertimbanganKhusus };
  }

  static calculateAKSebelumnya(
    karyawan: Karyawan,
    existingData: KonversiData[],
    tahun: number,
    semester: 1 | 2,
    mode: 'semesteran' | 'tahunan' = 'semesteran'
  ): number {
    // Jika tidak ada data existing, gunakan AK kumulatif dari karyawan
    if (existingData.length === 0) {
      return karyawan.akKumulatif;
    }

    // Urutkan data secara kronologis
    const sortedData = [...existingData].sort((a, b) => {
      if (a.Tahun !== b.Tahun) return a.Tahun - b.Tahun;
      return a.Semester - b.Semester;
    });

    // Cari data periode sebelumnya
    let tahunCari = tahun;
    let semesterCari: 1 | 2 = semester === 1 ? 2 : 1;
    
    if (semester === 1) {
      tahunCari = tahun - 1;
    }

    // Cari data semester sebelumnya
    const dataSebelumnya = sortedData
      .filter(data => data.Tahun === tahunCari && data.Semester === semesterCari)
      .pop();

    if (dataSebelumnya) {
      return dataSebelumnya.Total_Kumulatif;
    }

    // Jika tidak ada data semester sebelumnya, cari data terakhir sebelum periode ini
    const dataTerakhirSebelum = sortedData
      .filter(data => {
        if (data.Tahun < tahun) return true;
        if (data.Tahun === tahun && data.Semester < semester) return true;
        return false;
      })
      .sort((a, b) => {
        if (a.Tahun !== b.Tahun) return b.Tahun - a.Tahun;
        return b.Semester - a.Semester;
      })[0];

    if (dataTerakhirSebelum) {
      return dataTerakhirSebelum.Total_Kumulatif;
    }

    // Jika tidak ditemukan, gunakan AK kumulatif karyawan
    return karyawan.akKumulatif;
  }

  static calculatePeriodeSemester(tahun: number, semester: 1 | 2): { mulai: string; selesai: string } {
    if (semester === 1) {
      return { mulai: `01/01/${tahun}`, selesai: `30/06/${tahun}` };
    } else {
      return { mulai: `01/07/${tahun}`, selesai: `31/12/${tahun}` };
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

  static generateSemesterFromTglPenghitungan(tglPenghitunganAkTerakhir: string): { 
    tahun: number; 
    semester: 1 | 2;
    masaKerjaBulan: number;
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
  }[] {
    const startDate = DateParser.parseTanggalIndonesia(tglPenghitunganAkTerakhir);
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
        const result = this.calculateMasaKerjaProporsional(tglPenghitunganAkTerakhir, semesterYear, semester);
        masaKerjaBulan = result.masaKerjaBulan;
        jenisPenilaian = result.jenisPenilaian;
      } else {
        const result = this.calculateMasaKerjaProporsional(tglPenghitunganAkTerakhir, semesterYear, semester);
        masaKerjaBulan = result.masaKerjaBulan;
        jenisPenilaian = result.jenisPenilaian;
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
}

// ==================== API FUNCTIONS ====================
const useSpreadsheetAPI = () => {
  const { toast } = useToast();

  const callAPI = async (operation: string, data?: any) => {
    try {
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: { spreadsheetId: SPREADSHEET_ID, operation, ...data }
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`API ${operation} failed:`, error);
      toast({
        title: "Error",
        description: `Gagal mengakses spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Fungsi baru untuk membaca data tempat lahir dari sheet "data"
  const getTempatLahirFromDataSheet = async (nip: string): Promise<string> => {
    try {
      const result = await callAPI('read', { range: DATA_SHEET_NAME });
      const rows = result.values || [];
      
      if (rows.length <= 1) return '';
      
      const headers = rows[0];
      const nipIndex = headers.findIndex((header: string) => 
        header.toLowerCase().includes('nip')
      );
      
      // Kolom tempat lahir adalah kolom ke-9 (index 8)
      const tempatLahirIndex = 8;
      
      if (nipIndex === -1 || tempatLahirIndex >= headers.length) {
        console.warn('Struktur sheet data tidak sesuai');
        return '';
      }
      
      // Cari baris dengan NIP yang sesuai
      const dataRow = rows.find((row: any[]) => 
        row[nipIndex]?.toString() === nip
      );
      
      if (dataRow && dataRow[tempatLahirIndex]) {
        return dataRow[tempatLahirIndex].toString();
      }
      
      return '';
    } catch (error) {
      console.error('Error reading tempat lahir from data sheet:', error);
      return '';
    }
  };

  const readData = async (nip?: string) => {
    try {
      const result = await callAPI('read', { range: SHEET_NAME });
      const rows = result.values || [];
      
      if (rows.length <= 1) return [];
      
      const headers = rows[0];
      const data = rows.slice(1)
        .filter((row: any[]) => {
          if (!row || row.length === 0) return false;
          if (!nip) return true;
          const nipIndex = headers.indexOf('NIP');
          return nipIndex >= 0 && row[nipIndex] === nip;
        })
        .map((row: any[], index: number) => {
          const obj: KonversiData = {} as KonversiData;

          headers.forEach((header: string, colIndex: number) => {
            let value = row[colIndex] || '';
            
            if (header === 'No') obj.No = Number(value) || 0;
            else if (header === 'Tahun') obj.Tahun = Number(value) || 0;
            else if (header === 'Semester') obj.Semester = (Number(value) === 2 ? 2 : 1) as 1 | 2;
            else if (header === 'Periode') obj.Periode = String(value);
            else if (header === 'Jenis Periode') obj.Jenis_Periode = (value === 'Tahunan' ? 'Tahunan' : 'Semester') as 'Semester' | 'Tahunan';
            else if (header === 'Nama') obj.Nama = String(value);
            else if (header === 'NIP') obj.NIP = String(value);
            else if (header === 'Nomor Karpeg' || header === 'Karpeg') obj.Nomor_Karpeg = String(value);
            else if (header === 'Tempat Lahir' || header === 'tempatLahir') obj.Tempat_Lahir = String(value);
            else if (header === 'Tanggal Lahir') obj.Tanggal_Lahir = String(value);
            else if (header === 'Jenis Kelamin') {
              if (value === 'Laki-laki' || value === 'Laki-laki') {
                obj.Jenis_Kelamin = 'Laki-laki';
              } else if (value === 'Perempuan' || value === 'Perempuan') {
                obj.Jenis_Kelamin = 'Perempuan';
              } else {
                obj.Jenis_Kelamin = 'Laki-laki'; // default
              }
            }
            else if (header === 'Pangkat') obj.Pangkat = String(value);
            else if (header === 'Golongan' || header === 'Gol.Akhir') obj.Golongan = String(value);
            else if (header === 'TMT Pangkat') obj.TMT_Pangkat = String(value);
            else if (header === 'Jabatan') obj.Jabatan = String(value);
            else if (header === 'TMT Jabatan') obj.TMT_Jabatan = String(value);
            else if (header === 'Predikat Kinerja') obj.Predikat_Kinerja = value as 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
            else if (header === 'Nilai SKP') obj.Nilai_SKP = Number(value) || 0;
            else if (header === 'AK Konversi') obj.AK_Konversi = KonversiCalculator.parseNumberFromSheet(value);
            else if (header === 'Tanggal Penetapan') obj.Tanggal_Penetapan = String(value);
            else if (header === 'Kebutuhan Pangkat (AK)') obj.Kebutuhan_Pangkat_AK = KonversiCalculator.parseNumberFromSheet(value);
            else if (header === 'Kebutuhan Jabatan (AK)') obj.Kebutuhan_Jabatan_AK = KonversiCalculator.parseNumberFromSheet(value);
            else if (header === 'AK Sebelumnya') obj.AK_Sebelumnya = KonversiCalculator.parseNumberFromSheet(value);
            else if (header === 'AK Periode Ini') obj.AK_Periode_Ini = KonversiCalculator.parseNumberFromSheet(value);
            else if (header === 'Total Kumulatif') obj.Total_Kumulatif = KonversiCalculator.parseNumberFromSheet(value);
            else if (header === 'Selisih Pangkat') obj.Selisih_Pangkat = KonversiCalculator.parseNumberFromSheet(value);
            else if (header === 'Selisih Jabatan') obj.Selisih_Jabatan = KonversiCalculator.parseNumberFromSheet(value);
            else if (header === 'Kurleb Pangkat') obj.Kurleb_Pangkat = KonversiCalculator.parseNumberFromSheet(value);
            else if (header === 'Kurleb Jabatan') obj.Kurleb_Jabatan = KonversiCalculator.parseNumberFromSheet(value);
            else if (header === 'Status Kenaikan') obj.Status_Kenaikan = String(value);
            else if (header === 'Jenis Kenaikan') obj.Jenis_Kenaikan = String(value);
            else if (header === 'Estimasi Bulan') obj.Estimasi_Bulan = Number(value) || 0;
            else if (header === 'Rekomendasi') obj.Rekomendasi = String(value);
            else if (header === 'Pertimbangan Khusus') obj.Pertimbangan_Khusus = String(value);
            else if (header === 'Status') obj.Status = (value === 'Generated' ? 'Generated' : 'Draft') as 'Draft' | 'Generated';
            else if (header === 'Catatan') obj.Catatan = String(value);
            else if (header === 'Link Dokumen') obj.Link_Dokumen = String(value);
            else if (header === 'Last Update') obj.Last_Update = String(value);
            else if (header === 'Masa Kerja Bulan') obj.Masa_Kerja_Bulan = Number(value) || 6;
            else if (header === 'Jenis Penilaian') obj.Jenis_Penilaian = (value === 'PROPORSIONAL' ? 'PROPORSIONAL' : 'PENUH');
          });
          
          obj.id = `${SHEET_NAME}_${index + 2}`;
          obj.rowIndex = index + 2;
          if (!obj.No) obj.No = index + 1;
          if (!obj.Nilai_SKP) obj.Nilai_SKP = 95;
          if (!obj.Status) obj.Status = 'Draft';
          if (!obj.Masa_Kerja_Bulan) obj.Masa_Kerja_Bulan = 6;
          if (!obj.Jenis_Penilaian) obj.Jenis_Penilaian = 'PENUH';
          
          return obj;
        });
      
      return data;
    } catch (error) {
      console.error('Error reading data:', error);
      return [];
    }
  };

  const appendData = async (values: any[]) => {
    try {
      const cleanedValues = values.map(value => {
        if (value === undefined || value === null) return '';
        if (typeof value === 'number') return value.toString();
        return String(value);
      });

      return await callAPI('append', { range: SHEET_NAME, values: [cleanedValues] });
    } catch (error) {
      console.error('Error in appendData:', error);
      throw error;
    }
  };

  const updateData = async (rowIndex: number, values: any[]) => {
    try {
      const cleanedValues = values.map(value => {
        if (value === undefined || value === null) return '';
        if (typeof value === 'number') return value.toString();
        return String(value);
      });

      return await callAPI('update', { range: SHEET_NAME, rowIndex, values: [cleanedValues] });
    } catch (error) {
      console.error('Error in updateData:', error);
      throw error;
    }
  };

  const deleteData = async (rowIndex: number) => {
    try {
      return await callAPI('delete', { range: SHEET_NAME, rowIndex });
    } catch (error) {
      console.error('Error in deleteData:', error);
      throw error;
    }
  };

  return { 
    readData, 
    appendData, 
    updateData, 
    deleteData, 
    getTempatLahirFromDataSheet 
  };
};

// ==================== EDIT FORM MODAL ====================
interface CalculatedData {
  akSebelumnya: number;
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
  analisis: {
    statusKenaikan: string;
    jenisKenaikan: string;
    rekomendasi: string;
    pertimbanganKhusus: string;
  };
}

const EditKonversiModal: React.FC<{
  data: KonversiData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: KonversiData) => void;
  karyawan: Karyawan;
  konversiData: KonversiData[];
}> = ({ data, isOpen, onClose, onSave, karyawan, konversiData }) => {
  const [formData, setFormData] = useState<Partial<KonversiData>>({});

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    } else {
      setFormData({});
    }
  }, [data]);

  const calculateAllData = (): CalculatedData => {
    if (!formData.Tahun || !formData.Semester || !formData.Predikat_Kinerja) {
      return {
        akSebelumnya: karyawan.akKumulatif,
        akKonversi: 0,
        masaKerja: 0,
        jenis: '',
        kebutuhanPangkat: 0,
        kebutuhanJabatan: 0,
        totalKumulatif: 0,
        selisihPangkat: 0,
        selisihJabatan: 0,
        kurlebPangkat: 0,
        kurlebJabatan: 0,
        estimasiBulan: 0,
        analisis: {
          statusKenaikan: '',
          jenisKenaikan: '',
          rekomendasi: '',
          pertimbanganKhusus: ''
        }
      };
    }

    const { masaKerjaBulan, jenisPenilaian } = KonversiCalculator.calculateMasaKerjaProporsional(
      karyawan.tglPenghitunganAkTerakhir,
      formData.Tahun,
      formData.Semester
    );

    const akSebelumnya = KonversiCalculator.calculateAKSebelumnya(
      karyawan,
      konversiData,
      formData.Tahun,
      formData.Semester,
      formData.Jenis_Periode === 'Tahunan' ? 'tahunan' : 'semesteran'
    );

    const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

    const akKonversi = KonversiCalculator.calculateAKFromPredikat(
      formData.Predikat_Kinerja!,
      formData.Nilai_SKP || 95,
      karyawan.jabatan,
      karyawan.kategori,
      karyawan.golongan,
      masaKerjaBulan,
      jenisPenilaian,
      formData.Jenis_Periode === 'Tahunan' ? 'tahunan' : 'semesteran'
    );

    const kebutuhanPangkat = KonversiCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori, karyawan.jabatan);
    const kebutuhanJabatan = KonversiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
    const totalKumulatif = akSebelumnya + akKonversi;
    const selisihPangkat = kebutuhanPangkat - totalKumulatif;
    const selisihJabatan = kebutuhanJabatan - totalKumulatif;
    const kurlebPangkat = Math.max(0, selisihPangkat);
    const kurlebJabatan = Math.max(0, selisihJabatan);

    const estimasiBulan = KonversiCalculator.calculateEstimasiBulan(kurlebPangkat, formData.Predikat_Kinerja!, koefisien);

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
      akSebelumnya,
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
      const calculatedData = calculateAllData();
      const periode = KonversiCalculator.calculatePeriodeSemester(formData.Tahun, formData.Semester);

      const finalData: KonversiData = {
        ...data,
        ...formData,
        Periode: `${periode.mulai} - ${periode.selesai}`,
        Jenis_Periode: formData.Jenis_Periode || 'Semester',
        Nomor_Karpeg: karyawan.unitKerja,
        Tempat_Lahir: karyawan.tempatLahir,
        Tanggal_Lahir: karyawan.tanggalLahir,
        Jenis_Kelamin: karyawan.jenisKelamin,
        Pangkat: karyawan.pangkat,
        Golongan: karyawan.golongan,
        TMT_Pangkat: karyawan.tmtPangkat,
        Jabatan: karyawan.jabatan,
        TMT_Jabatan: karyawan.tmtJabatan,
        AK_Konversi: calculatedData.akKonversi,
        Tanggal_Penetapan: KonversiCalculator.formatDate(new Date()),
        Kebutuhan_Pangkat_AK: calculatedData.kebutuhanPangkat,
        Kebutuhan_Jabatan_AK: calculatedData.kebutuhanJabatan,
        AK_Sebelumnya: calculatedData.akSebelumnya,
        AK_Periode_Ini: calculatedData.akKonversi,
        Total_Kumulatif: calculatedData.totalKumulatif,
        Selisih_Pangkat: calculatedData.selisihPangkat,
        Selisih_Jabatan: calculatedData.selisihJabatan,
        Kurleb_Pangkat: calculatedData.kurlebPangkat,
        Kurleb_Jabatan: calculatedData.kurlebJabatan,
        Status_Kenaikan: calculatedData.analisis.statusKenaikan,
        Jenis_Kenaikan: calculatedData.analisis.jenisKenaikan,
        Estimasi_Bulan: calculatedData.estimasiBulan,
        Rekomendasi: calculatedData.analisis.rekomendasi,
        Pertimbangan_Khusus: calculatedData.analisis.pertimbanganKhusus,
        Last_Update: KonversiCalculator.formatDate(new Date()),
        Masa_Kerja_Bulan: calculatedData.masaKerja,
        Jenis_Penilaian: calculatedData.jenis as 'PENUH' | 'PROPORSIONAL'
      } as KonversiData;

      onSave(finalData);
    }
  };

  const calculatedData = calculateAllData();
  const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Data Konversi' : 'Tambah Data Konversi'}</DialogTitle>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jenisPeriode">Jenis Periode</Label>
              <Select 
                value={formData.Jenis_Periode || "Semester"} 
                onValueChange={(value) => setFormData({...formData, Jenis_Periode: value as 'Semester' | 'Tahunan'})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semester">Semester</SelectItem>
                  <SelectItem value="Tahunan">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="predikat">Predikat Kinerja</Label>
              <Select 
                value={formData.Predikat_Kinerja || "Baik"} 
                onValueChange={(value) => setFormData({...formData, Predikat_Kinerja: value as any})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Cukup">Cukup</SelectItem>
                  <SelectItem value="Kurang">Kurang</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.Status || "Draft"} 
                onValueChange={(value) => setFormData({...formData, Status: value as any})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Generated">Generated</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  <p>• Jenis Periode: {formData.Jenis_Periode || 'Semester'}</p>
                  <p>• Jenis Penilaian: {calculatedData.jenis}</p>
                  <p>• Masa Kerja: {calculatedData.masaKerja} bulan</p>
                  <p>• AK Sebelumnya: {calculatedData.akSebelumnya.toFixed(3)}</p>
                </div>
                
                <div>
                  <p><strong>Perhitungan AK:</strong></p>
                  <p>• Koefisien: {koefisien}</p>
                  <p>• Predikat: {formData.Predikat_Kinerja} ({
                    {'Sangat Baik': '1.50', 'Baik': '1.00', 'Cukup': '0.75', 'Kurang': '0.50'}[formData.Predikat_Kinerja]
                  })</p>
                  <p>• AK Konversi: {calculatedData.akKonversi}</p>
                  <p>• Total Kumulatif: {calculatedData.totalKumulatif.toFixed(3)}</p>
                </div>
              </div>

              <div className="text-sm">
                <p><strong>Rekomendasi:</strong> {calculatedData.analisis.rekomendasi}</p>
                <p><strong>Status:</strong> {calculatedData.analisis.statusKenaikan} | <strong>Jenis:</strong> {calculatedData.analisis.jenisKenaikan}</p>
                <p><strong>Estimasi:</strong> {calculatedData.estimasiBulan} bulan</p>
              </div>

              {karyawan.kategori === 'Reguler' && (
                <p className="text-sm text-orange-700 mt-2">
                  <strong>Catatan:</strong> Kategori Reguler tidak menggunakan perhitungan Angka Kredit
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit">{data ? 'Update Data' : 'Simpan Data'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ==================== GENERATE MODAL ====================
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
      
      const updatedSemesters = semesters.map(semester => {
        const { masaKerjaBulan, jenisPenilaian } = KonversiCalculator.calculateMasaKerjaProporsional(
          tglPenghitunganAkTerakhir,
          semester.tahun,
          semester.semester
        );
        
        return {
          ...semester,
          masaKerjaBulan,
          jenisPenilaian
        };
      });
      
      setAvailableSemesters(updatedSemesters);
    }
  }, [isOpen, tglPenghitunganAkTerakhir]);

  const convertToTahunan = (semesters: typeof availableSemesters) => {
    const tahunanMap = new Map<number, {
      tahun: number;
      masaKerjaBulan: number;
      jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
    }>();

    semesters.forEach(semester => {
      if (!tahunanMap.has(semester.tahun)) {
        tahunanMap.set(semester.tahun, {
          tahun: semester.tahun,
          masaKerjaBulan: 0,
          jenisPenilaian: 'PENUH'
        });
      }
      
      const tahunData = tahunanMap.get(semester.tahun)!;
      tahunData.masaKerjaBulan += semester.masaKerjaBulan;
      
      if (semester.jenisPenilaian === 'PROPORSIONAL') {
        tahunData.jenisPenilaian = 'PROPORSIONAL';
      }
    });

    return Array.from(tahunanMap.values()).map(tahunData => ({
      tahun: tahunData.tahun,
      semester: 1 as 1 | 2,
      masaKerjaBulan: Math.min(12, tahunData.masaKerjaBulan),
      jenisPenilaian: tahunData.jenisPenilaian
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
                  <TableHead>Semester</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Jenis Penilaian</TableHead>
                  <TableHead>Masa Kerja</TableHead>
                  <TableHead>AK Estimasi (Baik)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(generateMode === 'semesteran' ? availableSemesters : tahunanData).map((item, index) => {
                  let periode;
                  if (generateMode === 'tahunan') {
                    periode = {
                      mulai: `01/01/${item.tahun}`,
                      selesai: `31/12/${item.tahun}`
                    };
                  } else {
                    periode = KonversiCalculator.calculatePeriodeSemester(item.tahun, item.semester);
                  }

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
                      <TableCell>
                        {generateMode === 'tahunan' ? 'Tahunan' : `Semester ${item.semester}`}
                      </TableCell>
                      <TableCell className="text-sm">{periode.mulai} - {periode.selesai}</TableCell>
                      <TableCell>
                        <Badge variant={item.jenisPenilaian === 'PENUH' ? 'default' : 'secondary'}>
                          {item.jenisPenilaian}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.masaKerjaBulan} bulan</TableCell>
                      <TableCell className="font-semibold">{akEstimasi.toFixed(3)}</TableCell>
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
      // Ambil data tempat lahir dari sheet "data" jika belum ada
      let tempatLahir = updatedData.Tempat_Lahir || karyawan.tempatLahir;
      if (!tempatLahir) {
        tempatLahir = await api.getTempatLahirFromDataSheet(karyawan.nip);
      }

      const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
      
      const { masaKerjaBulan, jenisPenilaian } = KonversiCalculator.calculateMasaKerjaProporsional(
        karyawan.tglPenghitunganAkTerakhir,
        updatedData.Tahun,
        updatedData.Semester
      );

      const akSebelumnya = KonversiCalculator.calculateAKSebelumnya(
        karyawan,
        konversiData,
        updatedData.Tahun,
        updatedData.Semester,
        updatedData.Jenis_Periode === 'Tahunan' ? 'tahunan' : 'semesteran'
      );

      const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

      const akKonversi = KonversiCalculator.calculateAKFromPredikat(
        updatedData.Predikat_Kinerja,
        updatedData.Nilai_SKP || 95,
        karyawan.jabatan,
        karyawan.kategori,
        karyawan.golongan,
        masaKerjaBulan,
        jenisPenilaian,
        updatedData.Jenis_Periode === 'Tahunan' ? 'tahunan' : 'semesteran'
      );

      const kebutuhanPangkat = KonversiCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori, karyawan.jabatan);
      const kebutuhanJabatan = KonversiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
      const totalKumulatif = akSebelumnya + akKonversi;
      const selisihPangkat = kebutuhanPangkat - totalKumulatif;
      const selisihJabatan = kebutuhanJabatan - totalKumulatif;
      const kurlebPangkat = Math.max(0, selisihPangkat);
      const kurlebJabatan = Math.max(0, selisihJabatan);

      const estimasiBulan = KonversiCalculator.calculateEstimasiBulan(kurlebPangkat, updatedData.Predikat_Kinerja, koefisien);

      const analisis = KonversiCalculator.generateAnalisis(
        karyawan,
        updatedData.Predikat_Kinerja,
        akKonversi,
        totalKumulatif,
        kebutuhanPangkat,
        kebutuhanJabatan,
        estimasiBulan
      );

      const periode = KonversiCalculator.calculatePeriodeSemester(updatedData.Tahun, updatedData.Semester);

      const values = [
        updatedData.No || nextNo,
        updatedData.Tahun,
        updatedData.Semester,
        `${periode.mulai} - ${periode.selesai}`,
        updatedData.Jenis_Periode || 'Semester',
        updatedData.Nama || karyawan.nama,
        updatedData.NIP || karyawan.nip,
        updatedData.Nomor_Karpeg || karyawan.unitKerja,
        tempatLahir, // Gunakan tempat lahir yang sudah diambil
        updatedData.Tanggal_Lahir || karyawan.tanggalLahir,
        updatedData.Jenis_Kelamin || karyawan.jenisKelamin,
        updatedData.Pangkat || karyawan.pangkat,
        updatedData.Golongan || karyawan.golongan,
        updatedData.TMT_Pangkat || karyawan.tmtPangkat,
        updatedData.Jabatan || karyawan.jabatan,
        updatedData.TMT_Jabatan || karyawan.tmtJabatan,
        updatedData.Predikat_Kinerja,
        updatedData.Tanggal_Penetapan || KonversiCalculator.formatDate(new Date()),
        KonversiCalculator.formatNumberForSheet(kebutuhanPangkat),
        KonversiCalculator.formatNumberForSheet(kebutuhanJabatan),
        KonversiCalculator.formatNumberForSheet(akSebelumnya),
        KonversiCalculator.formatNumberForSheet(akKonversi),
        KonversiCalculator.formatNumberForSheet(totalKumulatif),
        KonversiCalculator.formatNumberForSheet(selisihPangkat),
        KonversiCalculator.formatNumberForSheet(selisihJabatan),
        KonversiCalculator.formatNumberForSheet(kurlebPangkat),
        KonversiCalculator.formatNumberForSheet(kurlebJabatan),
        analisis.statusKenaikan,
        analisis.jenisKenaikan,
        estimasiBulan,
        analisis.rekomendasi,
        updatedData.Pertimbangan_Khusus || analisis.pertimbanganKhusus,
        updatedData.Status || 'Draft',
        KonversiCalculator.formatDate(new Date())
      ];

      if (updatedData.rowIndex && updatedData.rowIndex > 1) {
        await api.updateData(updatedData.rowIndex, values);
        toast({
          title: "Sukses",
          description: "Data berhasil diupdate di Google Sheets"
        });
      } else {
        await api.appendData(values);
        toast({
          title: "Sukses", 
          description: "Data baru berhasil ditambahkan ke Google Sheets"
        });
      }

      setEditModal({ isOpen: false, data: null });
      await loadData();
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: "Error",
        description: `Gagal menyimpan data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleAddNew = async () => {
    try {
      // Ambil data tempat lahir dari sheet "data"
      const tempatLahir = await api.getTempatLahirFromDataSheet(karyawan.nip);

      const now = KonversiCalculator.formatDate(new Date());
      const tahun = new Date().getFullYear();
      const semester = new Date().getMonth() < 6 ? 1 : 2;
      
      const { masaKerjaBulan, jenisPenilaian } = KonversiCalculator.calculateMasaKerjaProporsional(
        karyawan.tglPenghitunganAkTerakhir,
        tahun,
        semester
      );

      const akSebelumnya = KonversiCalculator.calculateAKSebelumnya(
        karyawan,
        konversiData,
        tahun,
        semester,
        'semesteran'
      );

      const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

      const akKonversi = KonversiCalculator.calculateAKFromPredikat(
        'Baik', 
        95,
        karyawan.jabatan,
        karyawan.kategori,
        karyawan.golongan,
        masaKerjaBulan,
        jenisPenilaian
      );

      const kebutuhanPangkat = KonversiCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori, karyawan.jabatan);
      const kebutuhanJabatan = KonversiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
      const totalKumulatif = akSebelumnya + akKonversi;
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
      
      const values = [
        nextNo,
        tahun,
        semester,
        `${periode.mulai} - ${periode.selesai}`,
        'Semester',
        karyawan.nama,
        karyawan.nip,
        karyawan.unitKerja,
        tempatLahir, // Gunakan tempat lahir yang sudah diambil
        karyawan.tanggalLahir,
        karyawan.jenisKelamin,
        karyawan.pangkat,
        karyawan.golongan,
        karyawan.tmtPangkat,
        karyawan.jabatan,
        karyawan.tmtJabatan,
        'Baik',
        now,
        KonversiCalculator.formatNumberForSheet(kebutuhanPangkat),
        KonversiCalculator.formatNumberForSheet(kebutuhanJabatan),
        KonversiCalculator.formatNumberForSheet(akSebelumnya),
        KonversiCalculator.formatNumberForSheet(akKonversi),
        KonversiCalculator.formatNumberForSheet(totalKumulatif),
        KonversiCalculator.formatNumberForSheet(selisihPangkat),
        KonversiCalculator.formatNumberForSheet(selisihJabatan),
        KonversiCalculator.formatNumberForSheet(kurlebPangkat),
        KonversiCalculator.formatNumberForSheet(kurlebJabatan),
        analisis.statusKenaikan,
        analisis.jenisKenaikan,
        estimasiBulan,
        analisis.rekomendasi,
        analisis.pertimbanganKhusus,
        'Draft',
        now
      ];

      await api.appendData(values);
      toast({
        title: "Sukses",
        description: "Data baru berhasil ditambahkan ke Google Sheets"
      });
      
      await loadData();
    } catch (error) {
      console.error('Error adding new data:', error);
      toast({
        title: "Error",
        description: `Gagal menambah data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleGenerateSemesters = async (semesters: { 
    tahun: number; 
    semester: 1 | 2;
    masaKerjaBulan: number;
    jenisPenilaian: 'PENUH' | 'PROPORSIONAL';
  }[], mode: 'semesteran' | 'tahunan') => {
    try {
      // Ambil data tempat lahir dari sheet "data"
      const tempatLahir = await api.getTempatLahirFromDataSheet(karyawan.nip);

      const now = KonversiCalculator.formatDate(new Date());
      const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
      
      let successCount = 0;
      let errorCount = 0;

      const simulatedData: KonversiData[] = [...konversiData];
      let currentAK = karyawan.akKumulatif;

      for (const [index, item] of semesters.entries()) {
        try {
          let periode;
          if (mode === 'tahunan') {
            periode = {
              mulai: `01/01/${item.tahun}`,
              selesai: `31/12/${item.tahun}`
            };
          } else {
            periode = KonversiCalculator.calculatePeriodeSemester(item.tahun, item.semester);
          }

          const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);

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

          const akSebelumnya = currentAK;
          const totalKumulatif = akSebelumnya + akKonversi;
          
          currentAK = totalKumulatif;

          const kebutuhanPangkat = KonversiCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori, karyawan.jabatan);
          const kebutuhanJabatan = KonversiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
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

          const values = [
            nextNo + index,
            item.tahun,
            mode === 'tahunan' ? 1 : item.semester,
            `${periode.mulai} - ${periode.selesai}`,
            mode === 'tahunan' ? 'Tahunan' : 'Semester',
            karyawan.nama,
            karyawan.nip,
            karyawan.unitKerja,
            tempatLahir, // Gunakan tempat lahir yang sudah diambil
            karyawan.tanggalLahir,
            karyawan.jenisKelamin,
            karyawan.pangkat,
            karyawan.golongan,
            karyawan.tmtPangkat,
            karyawan.jabatan,
            karyawan.tmtJabatan,
            'Baik',
            now,
            KonversiCalculator.formatNumberForSheet(kebutuhanPangkat),
            KonversiCalculator.formatNumberForSheet(kebutuhanJabatan),
            KonversiCalculator.formatNumberForSheet(akSebelumnya),
            KonversiCalculator.formatNumberForSheet(akKonversi),
            KonversiCalculator.formatNumberForSheet(totalKumulatif),
            KonversiCalculator.formatNumberForSheet(selisihPangkat),
            KonversiCalculator.formatNumberForSheet(selisihJabatan),
            KonversiCalculator.formatNumberForSheet(kurlebPangkat),
            KonversiCalculator.formatNumberForSheet(kurlebJabatan),
            analisis.statusKenaikan,
            analisis.jenisKenaikan,
            estimasiBulan,
            analisis.rekomendasi,
            `Auto-generated (${item.jenisPenilaian} - ${mode})`,
            'Generated',
            now
          ];

          await api.appendData(values);
          successCount++;
          
          if (index < semesters.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
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
          description: `Berhasil generate ${successCount} ${mode === 'semesteran' ? 'semester' : 'tahun'} dari Tanggal Penghitungan AK Terakhir`
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No</TableHead>
            <TableHead>Tahun</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Jenis Periode</TableHead>
            <TableHead>Predikat</TableHead>
            <TableHead>AK Sebelumnya</TableHead>
            <TableHead>AK Periode Ini</TableHead>
            <TableHead>Total Kumulatif</TableHead>
            <TableHead>Status Kenaikan</TableHead>
            <TableHead>Estimasi</TableHead>
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
                <Badge variant={data.Jenis_Periode === 'Tahunan' ? 'default' : 'secondary'}>
                  {data.Jenis_Periode}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={
                  data.Predikat_Kinerja === 'Sangat Baik' ? 'default' :
                  data.Predikat_Kinerja === 'Baik' ? 'secondary' :
                  data.Predikat_Kinerja === 'Cukup' ? 'outline' : 'destructive'
                }>
                  {data.Predikat_Kinerja}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{data.AK_Sebelumnya}</TableCell>
              <TableCell className="font-semibold">{data.AK_Periode_Ini}</TableCell>
              <TableCell className="font-bold text-blue-600">{data.Total_Kumulatif}</TableCell>
              <TableCell>
                <Badge variant={
                  data.Status_Kenaikan === 'Bisa Usul Jenjang & Pangkat' ? 'default' :
                  data.Status_Kenaikan === 'Bisa Usul Pangkat' ? 'secondary' :
                  data.Status_Kenaikan === 'Bisa Usul Jenjang' ? 'outline' :
                  data.Status_Kenaikan === 'Estimasi 6 Bulan' ? 'default' : 'outline'
                }>
                  {data.Status_Kenaikan}
                </Badge>
              </TableCell>
              <TableCell>{data.Estimasi_Bulan > 0 ? `${data.Estimasi_Bulan} bulan` : 'Siap'}</TableCell>
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

            <Button onClick={() => setGenerateModal(true)} variant="secondary">
              <Save className="h-4 w-4 mr-2" />
              Generate dari Tanggal Penghitungan AK
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
                  <div className="flex gap-2 justify-center mt-2">
                    <Button onClick={handleAddNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Data Pertama
                    </Button>
                    <Button onClick={() => setGenerateModal(true)} variant="outline">
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
        konversiData={konversiData}
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