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
class DateParser {
  static parseTanggalIndonesia(tanggal: string): Date {
    if (!tanggal || tanggal.trim() === '') return new Date();

    // Coba parsing format ISO terlebih dahulu
    if (tanggal.includes('-')) {
      const date = new Date(tanggal);
      if (!isNaN(date.getTime())) return date;
    }

    // Mapping nama bulan Indonesia ke angka
    const bulanMap: {[key: string]: number} = {
      'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
      'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
      'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
      'january': 0, 'february': 1, 'march': 2, 'may': 4,
      'june': 5, 'july': 6, 'august': 7, 'october': 9, 'december': 11
    };

    const cleanedDate = tanggal.toLowerCase().trim();

    // Format: "11 April 2023"
    const parts = cleanedDate.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = bulanMap[parts[1]];
      const year = parseInt(parts[2]);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    // Format: "11/04/2023" atau "11-04-2023"
    const separator = cleanedDate.includes('/') ? '/' : '-';
    const dateParts = cleanedDate.split(separator);
    if (dateParts.length === 3) {
      let day, month, year;
      if (dateParts[0].length === 4) {
        // Format: "2023/04/11"
        year = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        day = parseInt(dateParts[2]);
      } else {
        // Format: "11/04/2023"
        day = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        year = parseInt(dateParts[2]);
      }
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    // Fallback: coba parsing dengan Date constructor
    const fallbackDate = new Date(tanggal);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }

    // Jika semua gagal, return tanggal default
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
  // Tentukan koefisien berdasarkan jabatan, kategori, dan golongan
  static getKoefisien(jabatan: string, kategori: string, golongan: string): number {
    // Untuk kategori Reguler, tidak ada perhitungan AK
    if (kategori === 'Reguler') return 0;

    const jabatanLower = jabatan.toLowerCase();
    
    const koefisienMap: { [key: string]: number } = {
      'ahli pertama': 12.5,
      'ahli muda': 25.0,
      'ahli madya': 37.5,
      'ahli utama': 50.0,
      'terampil': 5.0,
      'mahir': 12.5,
      'penyelia': 25.0,
      'fungsional umum': 5.0
    };

    for (const [key, value] of Object.entries(koefisienMap)) {
      if (jabatanLower.includes(key)) return value;
    }

    // Fallback berdasarkan kategori dan golongan
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
    
    return 12.5; // Default
  }

  // Hitung kebutuhan AK untuk pangkat - SESUAI BKN 2023 Pasal 21 ayat 3 - DIPERBAIKI
  static getKebutuhanPangkat(
    golonganSekarang: string, 
    kategori: string, 
    jabatanSekarang?: string
  ): number {
    if (kategori === 'Reguler') return 0;

    const kebutuhanKeahlian: { [key: string]: number } = {
      'III/a': 50, 'III/b': 50, 'III/c': 100, 'III/d': 100, // Base value
      'IV/a': 150, 'IV/b': 150, 'IV/c': 150, 'IV/d': 200
    };
    
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'II/a': 15, 'II/b': 20, 'II/c': 20, 'II/d': 20,
      'III/a': 50, 'III/b': 50, 'III/c': 100
    };
    
    let kebutuhan = kategori === 'Keahlian' ? 
      kebutuhanKeahlian[golonganSekarang] || 0 : 
      kebutuhanKeterampilan[golonganSekarang] || 0;

    // ✅ PERBAIKAN: Untuk kenaikan jenjang, kebutuhan pangkat = kebutuhan jabatan
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

  // Hitung kebutuhan AK untuk jabatan - SESUAI BKN 2023 Pasal 21 ayat 4
  static getKebutuhanJabatan(jabatanSekarang: string, kategori: string): number {
    if (kategori === 'Reguler') return 0;

    const kebutuhanKeahlian: { [key: string]: number } = {
      'Ahli Pertama': 100,   // Ahli Pertama → Ahli Muda
      'Ahli Muda': 200,      // Ahli Muda → Ahli Madya  
      'Ahli Madya': 450,     // Ahli Madya → Ahli Utama
      'Ahli Utama': 0        // Puncak
    };
    
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'Terampil': 60,        // Terampil → Mahir
      'Mahir': 100,          // Mahir → Penyelia
      'Penyelia': 0          // Puncak
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

  // Fungsi untuk menangani kenaikan jenjang + pangkat bersamaan
  static shouldPromoteJenjangAndPangkat(
    jabatanSekarang: string,
    golonganSekarang: string,
    totalAK: number
  ): { promoteJenjang: boolean; promotePangkat: boolean } {
    const result = { promoteJenjang: false, promotePangkat: false };
    
    // ✅ Kasus khusus: Ahli Muda (III/d) → Ahli Madya (IV/a)
    if (jabatanSekarang.includes('Ahli Muda') && golonganSekarang === 'III/d') {
      if (totalAK >= 200) { // 200 AK untuk naik jenjang + pangkat
        result.promoteJenjang = true;
        result.promotePangkat = true;
      }
    }
    
    // ✅ Kasus khusus: Mahir (III/b) → Penyelia (III/c)  
    else if (jabatanSekarang.includes('Mahir') && golonganSekarang === 'III/b') {
      if (totalAK >= 100) { // 100 AK untuk naik jenjang + pangkat
        result.promoteJenjang = true;
        result.promotePangkat = true;
      }
    }
    
    return result;
  }

  // Hitung AK dengan sistem proporsional sesuai BKN 2023
  static calculateAKProporsional(
    predikat: string, 
    koefisienJabatan: number, 
    masaKerjaBulan: number
  ): number {
    // Untuk kategori Reguler, tidak ada perhitungan AK
    if (koefisienJabatan === 0) return 0;

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
    if (koefisienJabatan === 0) return 0;

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
    if (koefisienJabatan === 0) return 0;

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

  // Hitung masa kerja proporsional
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

  // Hitung estimasi bulan berdasarkan predikat
  static calculateEstimasiBulan(
    kekuranganAK: number,
    predikat: string,
    koefisienJabatan: number
  ): number {
    if (kekuranganAK <= 0) return 0;
    if (koefisienJabatan === 0) return 0;
    
    const koefisienPredikat = {
      'Sangat Baik': 1.50,
      'Baik': 1.00,
      'Cukup': 0.75,
      'Kurang': 0.50
    }[predikat] || 1.00;

    const akPerBulan = (koefisienPredikat * koefisienJabatan) / 12;
    return akPerBulan > 0 ? Math.ceil(kekuranganAK / akPerBulan) : 0;
  }

  // Generate analisis dan rekomendasi - VERSI DIPERBAIKI
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
    // Untuk kategori Reguler, logika khusus
    if (karyawan.kategori === 'Reguler') {
      const progressPangkat = this.hitungProgressPangkatReguler(karyawan.tmtPangkat);
      const bisaUsulPangkat = this.bisaNaikPangkatReguler(karyawan.golongan, karyawan.pendidikan, progressPangkat.bulan);
      
      return {
        statusKenaikan: bisaUsulPangkat ? 'Bisa Usul' : 'Butuh Waktu',
        jenisKenaikan: 'Reguler',
        rekomendasi: bisaUsulPangkat ? 'Segera usulkan kenaikan pangkat' : 'Tunggu masa kerja 4 tahun',
        pertimbanganKhusus: 'Kategori Reguler - kenaikan berdasarkan masa kerja 4 tahun'
      };
    }

    // ✅ GUNAKAN FUNGSI BARU untuk cek kenaikan jenjang + pangkat
    const { promoteJenjang, promotePangkat } = this.shouldPromoteJenjangAndPangkat(
      karyawan.jabatan,
      karyawan.golongan,
      totalKumulatif
    );

    let statusKenaikan = 'Butuh Waktu Lama';
    let jenisKenaikan = 'Reguler';
    let rekomendasi = 'Pertahankan kinerja saat ini';

    // ✅ LOGIKA PRIORITAS: Kenaikan Jenjang & Pangkat bersamaan
    if (promoteJenjang && promotePangkat) {
      statusKenaikan = 'Bisa Usul Jenjang & Pangkat';
      jenisKenaikan = 'Jenjang & Pangkat';
      rekomendasi = 'Segera usulkan kenaikan jenjang jabatan dan pangkat bersamaan';
    }
    // Kenaikan pangkat saja
    else if (totalKumulatif >= kebutuhanPangkat && kebutuhanPangkat > 0) {
      statusKenaikan = 'Bisa Usul Pangkat';
      jenisKenaikan = 'Pangkat';
      rekomendasi = 'Segera usulkan kenaikan pangkat';
    }
    // Kenaikan jenjang saja
    else if (totalKumulatif >= kebutuhanJabatan && kebutuhanJabatan > 0) {
      statusKenaikan = 'Bisa Usul Jenjang';
      jenisKenaikan = 'Jenjang';
      rekomendasi = 'Segera usulkan kenaikan jenjang jabatan';
    }
    // Estimasi waktu
    else if (estimasiBulan <= 6) {
      statusKenaikan = 'Estimasi 6 Bulan';
      rekomendasi = 'Tingkatkan kinerja untuk mempercepat kenaikan';
    } else if (estimasiBulan <= 12) {
      statusKenaikan = 'Estimasi 1 Tahun';
      rekomendasi = 'Tingkatkan kinerja untuk mempercepat kenaikan';
    }

    let pertimbanganKhusus = '';
    if (promoteJenjang && promotePangkat) {
      pertimbanganKhusus = `✅ Memenuhi syarat kenaikan jenjang dan pangkat bersamaan (${totalKumulatif} AK)`;
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

// ==================== FUNGSI BARU: AK SEBELUMNYA BERSINAMBUNGAN ====================
static calculateAKSebelumnya(
  karyawan: Karyawan,
  konversiData: KonversiData[],
  tahun: number,
  semester: 1 | 2,
  mode: 'semesteran' | 'tahunan' = 'semesteran'
): number {
  // Jika tidak ada data sebelumnya, gunakan AK kumulatif dari karyawan
  if (konversiData.length === 0) {
    return karyawan.akKumulatif;
  }

  // Urutkan data secara kronologis (terlama ke terbaru)
  const sortedData = [...konversiData].sort((a, b) => {
    if (a.Tahun !== b.Tahun) return a.Tahun - b.Tahun;
    return a.Semester - b.Semester;
  });

  console.log('📊 Data tersedia untuk perhitungan AK Sebelumnya:', sortedData.length);

  if (mode === 'tahunan') {
    // Untuk mode tahunan, cari data tahun sebelumnya
    const tahunSebelumnya = tahun - 1;
    console.log(`🔍 Mencari data tahunan untuk tahun ${tahunSebelumnya}`);
    
    const dataTahunSebelumnya = sortedData
      .filter(data => data.Tahun === tahunSebelumnya && data.Jenis_Periode === 'Tahunan')
      .pop();
    
    if (dataTahunSebelumnya) {
      console.log(`✅ Ditemukan data tahunan sebelumnya: ${dataTahunSebelumnya.Total_Kumulatif}`);
      return dataTahunSebelumnya.Total_Kumulatif;
    }
    
    // Jika tidak ada data tahunan, cari data semesteran untuk tahun sebelumnya
    console.log(`🔍 Mencari data semesteran untuk tahun ${tahunSebelumnya}`);
    const dataSemesterTahunSebelumnya = sortedData
      .filter(data => data.Tahun === tahunSebelumnya)
      .sort((a, b) => b.Semester - a.Semester) // Ambil semester terakhir
      .pop();
    
    if (dataSemesterTahunSebelumnya) {
      console.log(`✅ Ditemukan data semesteran tahun sebelumnya: ${dataSemesterTahunSebelumnya.Total_Kumulatif}`);
      return dataSemesterTahunSebelumnya.Total_Kumulatif;
    }
  } else {
    // Untuk mode semesteran, cari data semester sebelumnya
    let tahunSebelum = tahun;
    let semesterSebelum: 1 | 2 = semester === 1 ? 2 : 1;
    
    if (semester === 1) {
      tahunSebelum = tahun - 1;
    }

    console.log(`🔍 Mencari data semester ${semesterSebelum} tahun ${tahunSebelum}`);

    const dataSemesterSebelumnya = sortedData
      .filter(data => data.Tahun === tahunSebelum && data.Semester === semesterSebelum)
      .pop();
    
    if (dataSemesterSebelumnya) {
      console.log(`✅ Ditemukan data semester sebelumnya: ${dataSemesterSebelumnya.Total_Kumulatif}`);
      return dataSemesterSebelumnya.Total_Kumulatif;
    }
    
    // Jika tidak ada data semester sebelumnya, cari data terakhir sebelum periode ini
    console.log(`🔍 Mencari data terakhir sebelum ${tahun}-${semester}`);
    const dataSebelumPeriodeIni = sortedData
      .filter(data => {
        if (data.Tahun < tahun) return true;
        if (data.Tahun === tahun && data.Semester < semester) return true;
        return false;
      })
      .sort((a, b) => {
        if (a.Tahun !== b.Tahun) return b.Tahun - a.Tahun;
        return b.Semester - a.Semester;
      })[0]; // Ambil yang terbaru
    
    if (dataSebelumPeriodeIni) {
      console.log(`✅ Ditemukan data terakhir sebelum periode ini: ${dataSebelumPeriodeIni.Total_Kumulatif}`);
      return dataSebelumPeriodeIni.Total_Kumulatif;
    }
  }

  // Jika tidak ditemukan data sebelumnya, cari data terakhir secara umum
  const dataTerakhir = sortedData[sortedData.length - 1];
  console.log(`⚠️ Menggunakan data terakhir: ${dataTerakhir?.Total_Kumulatif || karyawan.akKumulatif}`);
  
  return dataTerakhir ? dataTerakhir.Total_Kumulatif : karyawan.akKumulatif;
}

    // Jika tidak ditemukan data sebelumnya, cari data terakhir secara umum
    const dataTerakhir = sortedData.pop();
    return dataTerakhir ? dataTerakhir.Total_Kumulatif : karyawan.akKumulatif;
  }

  // ==================== FUNGSI BARU UNTUK REGULER ====================
  static hitungProgressPangkatReguler(tmtPangkat: string): {
    bulan: number;
    persentase: number;
  } {
    const tmt = DateParser.parseTanggalIndonesia(tmtPangkat);
    const sekarang = new Date();
    const selisihBulan = DateParser.hitungSelisihBulan(tmt, sekarang);
    const persentase = Math.min(selisihBulan / 48 * 100, 100);
    return {
      bulan: selisihBulan,
      persentase
    };
  }

  static cekSyaratPendidikan(golonganSekarang: string, pendidikan: string): boolean {
    const pendidikanLower = pendidikan.toLowerCase();
    const punyaS2 = pendidikanLower.includes('s-2') || pendidikanLower.includes('s2') || pendidikanLower.includes('magister');
    const punyaS3 = pendidikanLower.includes('s-3') || pendidikanLower.includes('s3') || pendidikanLower.includes('doktor');

    // Untuk golongan di bawah III/D, tidak ada requirement pendidikan khusus
    if (!golonganSekarang.startsWith('IV/') && golonganSekarang !== 'III/d') {
      return true;
    }
    if (golonganSekarang === 'IV/d') {
      return punyaS3; // IV/D → IV/E wajib S3
    }

    // III/D dan IV/A-IV/C wajib S2
    return punyaS2;
  }

  static bisaNaikPangkatReguler(golonganSekarang: string, pendidikan: string, progressBulan: number): boolean {
    const masaKerjaCukup = progressBulan >= 48;
    const pendidikanCukup = this.cekSyaratPendidikan(golonganSekarang, pendidikan);
    return masaKerjaCukup && pendidikanCukup;
  }

  // ==================== FUNGSI BANTU LAINNYA ====================
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
    const tglPenghitunganDate = DateParser.parseTanggalIndonesia(tglPenghitunganAkTerakhir);
    const periode = this.calculatePeriodeSemester(tahun, semester);
    const periodeMulai = DateParser.parseTanggalIndonesia(periode.mulai);
    const periodeSelesai = DateParser.parseTanggalIndonesia(periode.selesai);
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
}

// ==================== API FUNCTIONS ====================
const useSpreadsheetAPI = () => {
  const { toast } = useToast();

  const callAPI = async (operation: string, data?: any) => {
    try {
      console.log(`🔄 Calling API: ${operation}`, data);
      
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation,
          range: SHEET_NAME,
          ...data
        }
      });

      if (error) {
        console.error('❌ API Error:', error);
        throw error;
      }
      
      console.log(`✅ API ${operation} success:`, result);
      return result;
    } catch (error) {
      console.error(`❌ API ${operation} failed:`, error);
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
      console.log('📖 Reading data from sheet:', SHEET_NAME);
      const result = await callAPI('read');
      const rows = result.values || [];
      
      console.log('📊 Raw data from sheet - rows count:', rows.length);
      
      if (rows.length <= 1) return [];
      
      const headers = rows[0];
      console.log('📋 Headers:', headers);
      
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
            let value = row[colIndex];
            
            // Handle empty values
            if (value === undefined || value === null || value === '') {
              value = '';
            }
            
            // Map headers to match our interface
            if (header === 'No') {
              obj.No = Number(value) || 0;
            }
            else if (header === 'Tahun') {
              obj.Tahun = Number(value) || 0;
            }
            else if (header === 'Semester') {
              obj.Semester = (Number(value) === 2 ? 2 : 1) as 1 | 2;
            }
            else if (header === 'Periode') {
              obj.Periode = String(value);
            }
            else if (header === 'Jenis Periode') {
              obj.Jenis_Periode = (value === 'Tahunan' ? 'Tahunan' : 'Semester') as 'Semester' | 'Tahunan';
            }
            else if (header === 'Nama') {
              obj.Nama = String(value);
            }
            else if (header === 'NIP') {
              obj.NIP = String(value);
            }
            else if (header === 'Nomor Karpeg') {
              obj.Nomor_Karpeg = String(value);
            }
            else if (header === 'Tempat Lahir') {
              obj.Tempat_Lahir = String(value);
            }
            else if (header === 'Tanggal Lahir') {
              obj.Tanggal_Lahir = String(value);
            }
            else if (header === 'Jenis Kelamin') {
              obj.Jenis_Kelamin = (value === 'P' ? 'P' : 'L') as 'L' | 'P';
            }
            else if (header === 'Pangkat') {
              obj.Pangkat = String(value);
            }
            else if (header === 'Golongan') {
              obj.Golongan = String(value);
            }
            else if (header === 'TMT Pangkat') {
              obj.TMT_Pangkat = String(value);
            }
            else if (header === 'Jabatan') {
              obj.Jabatan = String(value);
            }
            else if (header === 'TMT Jabatan') {
              obj.TMT_Jabatan = String(value);
            }
            else if (header === 'Predikat Kinerja') {
              obj.Predikat_Kinerja = value as 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
            }
            else if (header === 'Nilai SKP') {
              obj.Nilai_SKP = Number(value) || 0;
            }
            else if (header === 'AK Konversi') {
              obj.AK_Konversi = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Tanggal Penetapan') {
              obj.Tanggal_Penetapan = String(value);
            }
            else if (header === 'Kebutuhan Pangkat (AK)') {
              obj.Kebutuhan_Pangkat_AK = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Kebutuhan Jabatan (AK)') {
              obj.Kebutuhan_Jabatan_AK = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'AK Sebelumnya') {
              obj.AK_Sebelumnya = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'AK Periode Ini') {
              obj.AK_Periode_Ini = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Total Kumulatif') {
              obj.Total_Kumulatif = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Selisih Pangkat') {
              obj.Selisih_Pangkat = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Selisih Jabatan') {
              obj.Selisih_Jabatan = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Kurleb Pangkat') {
              obj.Kurleb_Pangkat = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Kurleb Jabatan') {
              obj.Kurleb_Jabatan = KonversiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Status Kenaikan') {
              obj.Status_Kenaikan = String(value);
            }
            else if (header === 'Jenis Kenaikan') {
              obj.Jenis_Kenaikan = String(value);
            }
            else if (header === 'Estimasi Bulan') {
              obj.Estimasi_Bulan = Number(value) || 0;
            }
            else if (header === 'Rekomendasi') {
              obj.Rekomendasi = String(value);
            }
            else if (header === 'Pertimbangan Khusus') {
              obj.Pertimbangan_Khusus = String(value);
            }
            else if (header === 'Status') {
              obj.Status = (value === 'Generated' ? 'Generated' : 'Draft') as 'Draft' | 'Generated';
            }
            else if (header === 'Catatan') {
              obj.Catatan = String(value);
            }
            else if (header === 'Link Dokumen') {
              obj.Link_Dokumen = String(value);
            }
            else if (header === 'Last Update') {
              obj.Last_Update = String(value);
            }
            // Handle additional fields that might not be in headers
            else if (header === 'Masa Kerja Bulan') {
              obj.Masa_Kerja_Bulan = Number(value) || 6;
            }
            else if (header === 'Jenis Penilaian') {
              obj.Jenis_Penilaian = (value === 'PROPORSIONAL' ? 'PROPORSIONAL' : 'PENUH');
            }
          });
          
          obj.id = `${SHEET_NAME}_${index + 2}`;
          obj.rowIndex = index + 2;
          
          if (!obj.No || obj.No === 0) {
            obj.No = index + 1;
          }
          
          // Set default values for missing fields
          if (!obj.Nilai_SKP) obj.Nilai_SKP = 95;
          if (!obj.Status) obj.Status = 'Draft';
          if (!obj.Masa_Kerja_Bulan) obj.Masa_Kerja_Bulan = 6;
          if (!obj.Jenis_Penilaian) obj.Jenis_Penilaian = 'PENUH';
          
          return obj;
        });
      
      console.log('✅ Processed data:', data);
      return data;
    } catch (error) {
      console.error('❌ Error reading data:', error);
      return [];
    }
  };

  const appendData = async (values: any[]) => {
    try {
      console.log('➕ Appending data to sheet:', values);
      
      // Ensure all values are strings and handle undefined/null
      const cleanedValues = values.map(value => {
        if (value === undefined || value === null) return '';
        if (typeof value === 'number') return value.toString();
        return String(value);
      });

      console.log('🧹 Cleaned values for append:', cleanedValues);
      
      const result = await callAPI('append', { 
        values: [cleanedValues] 
      });
      
      console.log('✅ Append result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in appendData:', error);
      throw error;
    }
  };

  const updateData = async (rowIndex: number, values: any[]) => {
    try {
      console.log(`✏️ Updating row ${rowIndex} with values:`, values);
      
      // Ensure all values are strings and handle undefined/null
      const cleanedValues = values.map(value => {
        if (value === undefined || value === null) return '';
        if (typeof value === 'number') return value.toString();
        return String(value);
      });

      console.log('🧹 Cleaned values for update:', cleanedValues);
      
      const result = await callAPI('update', { 
        rowIndex, 
        values: [cleanedValues] 
      });
      
      console.log('✅ Update result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in updateData:', error);
      throw error;
    }
  };

  const deleteData = async (rowIndex: number) => {
    try {
      console.log(`🗑️ Deleting row ${rowIndex}`);
      const result = await callAPI('delete', { rowIndex });
      console.log('✅ Delete result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in deleteData:', error);
      throw error;
    }
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

  const calculateAllData = (): {
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
    analisis: any;
  } => {
    if (!formData.Tahun || !formData.Semester || !formData.Predikat_Kinerja) {
      return {
        akSebelumnya: karyawan.akKumulatif,
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

    // ✅ PERBAIKAN: Hitung AK Sebelumnya yang bersinambungan
    const akSebelumnya = KonversiCalculator.calculateAKSebelumnya(
      karyawan,
      konversiData,
      formData.Tahun,
      formData.Semester,
      formData.Jenis_Periode === 'Tahunan' ? 'tahunan' : 'semesteran'
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
      jenisPenilaian,
      formData.Jenis_Periode === 'Tahunan' ? 'tahunan' : 'semesteran'
    );

    // ✅ PERBAIKAN: Gunakan parameter jabatan untuk perhitungan kebutuhan pangkat
    const kebutuhanPangkat = KonversiCalculator.getKebutuhanPangkat(
      karyawan.golongan, 
      karyawan.kategori,
      karyawan.jabatan
    );
    const kebutuhanJabatan = KonversiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
    const totalKumulatif = akSebelumnya + akKonversi; // ✅ PERBAIKAN: Gunakan akSebelumnya yang sudah dihitung
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
      const {
        akSebelumnya,
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
        Jenis_Periode: formData.Jenis_Periode || 'Semester',
        
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
        AK_Sebelumnya: akSebelumnya, // ✅ PERBAIKAN: Gunakan akSebelumnya yang sudah dihitung
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
    akSebelumnya,
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
              <Label htmlFor="jenisPeriode">Jenis Periode</Label>
              <Select 
                value={formData.Jenis_Periode || "Semester"} 
                onValueChange={(value) => setFormData({...formData, Jenis_Periode: value as 'Semester' | 'Tahunan'})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                  <p>• Jenis Penilaian: {jenis}</p>
                  <p>• Masa Kerja: {masaKerja} bulan</p>
                  <p>• AK Sebelumnya: {akSebelumnya.toFixed(3)}</p>
                </div>
                
                <div>
                  <p><strong>Perhitungan AK:</strong></p>
                  <p>• Koefisien: {koefisien}</p>
                  <p>• Predikat: {formData.Predikat_Kinerja} ({
                    {'Sangat Baik': '1.50', 'Baik': '1.00', 'Cukup': '0.75', 'Kurang': '0.50'}[formData.Predikat_Kinerja]
                  })</p>
                  <p>• AK Konversi: {akKonversi}</p>
                  <p>• Total Kumulatif: {totalKumulatif.toFixed(3)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Analisis Pangkat:</strong></p>
                  <p>• Kebutuhan: {kebutuhanPangkat}</p>
                  <p>• Selisih: {selisihPangkat.toFixed(3)}</p>
                  <p>• Kurleb: {kurlebPangkat.toFixed(3)}</p>
                </div>
                
                <div>
                  <p><strong>Analisis Jabatan:</strong></p>
                  <p>• Kebutuhan: {kebutuhanJabatan}</p>
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
      setAvailableSemesters(semesters);
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
      console.log('🔄 Loading data...');
      const data = await api.readData(karyawan.nip);
      setKonversiData(data);
      console.log('✅ Data loaded successfully:', data.length, 'records');
    } catch (error) {
      console.error('❌ Error loading data:', error);
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
      console.log('💾 START handleSave');
      
      const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
      
      // ✅ PERBAIKAN: Hitung AK Sebelumnya yang bersinambungan
      const akSebelumnya = KonversiCalculator.calculateAKSebelumnya(
        karyawan,
        konversiData,
        updatedData.Tahun,
        updatedData.Semester,
        updatedData.Jenis_Periode === 'Tahunan' ? 'tahunan' : 'semesteran'
      );
      
      // ✅ PERBAIKAN: Gunakan parameter jabatan untuk perhitungan kebutuhan pangkat
      const kebutuhanPangkat = KonversiCalculator.getKebutuhanPangkat(
        karyawan.golongan, 
        karyawan.kategori,
        karyawan.jabatan
      );
      
      // SESUAIKAN DENGAN 34 KOLOM YANG ADA DI SPREADSHEET (ditambah kolom Status)
      const values = [
        updatedData.No || nextNo,
        updatedData.Tahun || 2024,
        updatedData.Semester || 1,
        updatedData.Periode || '',
        updatedData.Jenis_Periode || 'Semester',
        updatedData.Nama || karyawan.nama,
        updatedData.NIP || karyawan.nip,
        updatedData.Nomor_Karpeg || karyawan.unitKerja,
        updatedData.Tempat_Lahir || karyawan.tempatLahir,
        updatedData.Tanggal_Lahir || karyawan.tanggalLahir,
        updatedData.Jenis_Kelamin || karyawan.jenisKelamin,
        updatedData.Pangkat || karyawan.pangkat,
        updatedData.Golongan || karyawan.golongan,
        updatedData.TMT_Pangkat || karyawan.tmtPangkat,
        updatedData.Jabatan || karyawan.jabatan,
        updatedData.TMT_Jabatan || karyawan.tmtJabatan,
        updatedData.Predikat_Kinerja || 'Baik',
        // 'Nilai SKP' - skip karena kolom tidak ada
        // 'AK Konversi' - skip karena kolom tidak ada  
        updatedData.Tanggal_Penetapan || KonversiCalculator.formatDate(new Date()),
        KonversiCalculator.formatNumberForSheet(kebutuhanPangkat), // ✅ Gunakan kebutuhanPangkat yang sudah diperbaiki
        KonversiCalculator.formatNumberForSheet(updatedData.Kebutuhan_Jabatan_AK || 0),
        KonversiCalculator.formatNumberForSheet(akSebelumnya), // ✅ PERBAIKAN: Gunakan akSebelumnya yang sudah dihitung
        KonversiCalculator.formatNumberForSheet(updatedData.AK_Periode_Ini || 0),
        KonversiCalculator.formatNumberForSheet(updatedData.Total_Kumulatif || akSebelumnya),
        KonversiCalculator.formatNumberForSheet(updatedData.Selisih_Pangkat || 0),
        KonversiCalculator.formatNumberForSheet(updatedData.Selisih_Jabatan || 0),
        KonversiCalculator.formatNumberForSheet(updatedData.Kurleb_Pangkat || 0),
        KonversiCalculator.formatNumberForSheet(updatedData.Kurleb_Jabatan || 0),
        updatedData.Status_Kenaikan || 'Butuh Waktu Lama',
        updatedData.Jenis_Kenaikan || 'Reguler',
        updatedData.Estimasi_Bulan || 0,
        updatedData.Rekomendasi || 'Pertahankan kinerja saat ini',
        updatedData.Pertimbangan_Khusus || '',
        updatedData.Status || 'Draft', // ✅ TAMBAHAN: Kolom Status di akhir
        updatedData.Last_Update || KonversiCalculator.formatDate(new Date())
      ];

      console.log('📋 Values to save (34 columns):', values);
      console.log('🔢 Number of columns:', values.length);

      if (updatedData.rowIndex && updatedData.rowIndex > 1) {
        console.log('✏️ Updating existing row:', updatedData.rowIndex);
        await api.updateData(updatedData.rowIndex, values);
        toast({
          title: "Sukses",
          description: "Data berhasil diupdate di Google Sheets"
        });
      } else {
        console.log('➕ Appending new row');
        await api.appendData(values);
        toast({
          title: "Sukses", 
          description: "Data baru berhasil ditambahkan ke Google Sheets"
        });
      }

      setEditModal({ isOpen: false, data: null });
      await loadData();
      console.log('✅ END handleSave - Success');
    } catch (error) {
      console.error('❌ Error saving data:', error);
      toast({
        title: "Error",
        description: `Gagal menyimpan data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleAddNew = async () => {
    try {
      console.log('🆕 START handleAddNew');
      
      const now = KonversiCalculator.formatDate(new Date());
      const tahun = new Date().getFullYear();
      const semester = new Date().getMonth() < 6 ? 1 : 2;
      
      const { masaKerjaBulan, jenisPenilaian } = KonversiCalculator.calculateMasaKerjaProporsional(
        karyawan.tglPenghitunganAkTerakhir,
        tahun,
        semester
      );

      // ✅ PERBAIKAN: Hitung AK Sebelumnya yang bersinambungan
      const akSebelumnya = KonversiCalculator.calculateAKSebelumnya(
        karyawan,
        konversiData,
        tahun,
        semester,
        'semesteran'
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

      // ✅ PERBAIKAN: Gunakan parameter jabatan untuk perhitungan kebutuhan pangkat
      const kebutuhanPangkat = KonversiCalculator.getKebutuhanPangkat(
        karyawan.golongan, 
        karyawan.kategori,
        karyawan.jabatan
      );
      const kebutuhanJabatan = KonversiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
      const totalKumulatif = akSebelumnya + akKonversi; // ✅ PERBAIKAN: Gunakan akSebelumnya yang sudah dihitung
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
          // ✅ PERBAIKAN: Update data dengan nilai yang sudah dihitung ulang
    const finalUpdatedData = {
      ...updatedData,
      AK_Sebelumnya: akSebelumnya,
      AK_Periode_Ini: akKonversi,
      Total_Kumulatif: totalKumulatif,
      Selisih_Pangkat: selisihPangkat,
      Selisih_Jabatan: selisihJabatan,
      Kurleb_Pangkat: kurlebPangkat,
      Kurleb_Jabatan: kurlebJabatan,
      Status_Kenaikan: analisis.statusKenaikan,
      Jenis_Kenaikan: analisis.jenisKenaikan,
      Estimasi_Bulan: estimasiBulan,
      Rekomendasi: analisis.rekomendasi,
      Pertimbangan_Khusus: analisis.pertimbanganKhusus,
      Last_Update: KonversiCalculator.formatDate(new Date())
    };

      const periode = KonversiCalculator.calculatePeriodeSemester(tahun, semester);
      const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
      
      // Gunakan 34 kolom sesuai spreadsheet (ditambah kolom Status)
      const values = [
        nextNo,
        tahun,
        semester,
        `${periode.mulai} - ${periode.selesai}`,
        'Semester',
        karyawan.nama,
        karyawan.nip,
        karyawan.unitKerja,
        karyawan.tempatLahir,
        karyawan.tanggalLahir,
        karyawan.jenisKelamin,
        karyawan.pangkat,
        karyawan.golongan,
        karyawan.tmtPangkat,
        karyawan.jabatan,
        karyawan.tmtJabatan,
        'Baik',
        now,
        KonversiCalculator.formatNumberForSheet(kebutuhanPangkat), // ✅ Gunakan kebutuhanPangkat yang sudah diperbaiki
        KonversiCalculator.formatNumberForSheet(kebutuhanJabatan),
        KonversiCalculator.formatNumberForSheet(akSebelumnya), // ✅ PERBAIKAN: Gunakan akSebelumnya yang sudah dihitung
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
        'Draft', // ✅ TAMBAHAN: Kolom Status di akhir
        now
      ];

      console.log('📋 Values to append (34 columns):', values);
      console.log('🔢 Number of columns:', values.length);

      await api.appendData(values);
      toast({
        title: "Sukses",
        description: "Data baru berhasil ditambahkan ke Google Sheets"
      });
      
      await loadData();
      console.log('✅ END handleAddNew - Success');
    } catch (error) {
      console.error('❌ Error adding new data:', error);
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
      console.log('🚀 START handleGenerateSemesters');
      const now = KonversiCalculator.formatDate(new Date());
      const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
      
      let successCount = 0;
      let errorCount = 0;

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

          // ✅ PERBAIKAN: Hitung AK Sebelumnya yang bersinambungan
          const akSebelumnya = KonversiCalculator.calculateAKSebelumnya(
            karyawan,
            konversiData,
            item.tahun,
            item.semester,
            mode
          );

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

          // ✅ PERBAIKAN: Gunakan parameter jabatan untuk perhitungan kebutuhan pangkat
          const kebutuhanPangkat = KonversiCalculator.getKebutuhanPangkat(
            karyawan.golongan, 
            karyawan.kategori,
            karyawan.jabatan
          );
          const kebutuhanJabatan = KonversiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
          const totalKumulatif = akSebelumnya + akKonversi; // ✅ PERBAIKAN: Gunakan akSebelumnya yang sudah dihitung
          const selisihPangkat = kebutuhanPangkat - totalKumulatif;
          const selisihJabatan = kebutuhanJabatan - totalKumulatif;
          const kurlebPangkat = Math.max(0, selisihPangkat);
          const kurlebJabatan = Math.max(0, selisihJabatan);
          const koefisien = KonversiCalculator.getKoefisien(karyawan.jabatan, karyawan.kategori, karyawan.golongan);
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

          // Gunakan 34 kolom sesuai spreadsheet (ditambah kolom Status)
          const values = [
            nextNo + index,
            item.tahun,
            mode === 'tahunan' ? 1 : item.semester,
            `${periode.mulai} - ${periode.selesai}`,
            mode === 'tahunan' ? 'Tahunan' : 'Semester',
            karyawan.nama,
            karyawan.nip,
            karyawan.unitKerja,
            karyawan.tempatLahir,
            karyawan.tanggalLahir,
            karyawan.jenisKelamin,
            karyawan.pangkat,
            karyawan.golongan,
            karyawan.tmtPangkat,
            karyawan.jabatan,
            karyawan.tmtJabatan,
            'Baik',
            now,
            KonversiCalculator.formatNumberForSheet(kebutuhanPangkat), // ✅ Gunakan kebutuhanPangkat yang sudah diperbaiki
            KonversiCalculator.formatNumberForSheet(kebutuhanJabatan),
            KonversiCalculator.formatNumberForSheet(akSebelumnya), // ✅ PERBAIKAN: Gunakan akSebelumnya yang sudah dihitung
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
            'Generated', // ✅ TAMBAHAN: Kolom Status di akhir dengan nilai 'Generated'
            now
          ];

          await api.appendData(values);
          successCount++;
          
          // Delay untuk menghindari rate limiting
          if (index < semesters.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (error) {
          errorCount++;
          console.error(`❌ Gagal menyimpan data untuk ${mode === 'tahunan' ? 'tahun' : 'semester'} ${item.tahun}:`, error);
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
      console.log('✅ END handleGenerateSemesters - Success');

    } catch (error) {
      console.error('❌ Error dalam handleGenerateSemesters:', error);
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
      console.error('❌ Delete error:', error);
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
            <TableHead>AK Konversi</TableHead>
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
              <TableCell className="font-semibold">{data.AK_Konversi}</TableCell>
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
              <TableCell>
                {data.Estimasi_Bulan > 0 ? `${data.Estimasi_Bulan} bulan` : 'Siap'}
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