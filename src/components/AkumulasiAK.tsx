import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, Filter, TrendingUp, Calculator, Target, Save, AlertCircle } from 'lucide-react';
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

interface AkumulasiData {
  id?: string;
  No?: number;
  NIP: string;
  Nama: string;
  Periode: string;
  'AK Sebelumnya': number;
  'AK Periode Ini': number;
  'Total Kumulatif': number;
  'Kebutuhan Pangkat': number;
  'Kebutuhan Jabatan': number;
  Selisih: number;
  'Status Kenaikan': 'Tidak' | 'Ya' | 'Dipertimbangkan';
  Rekomendasi: string;
  Link_Dokumen?: string;
  Last_Update: string;
  rowIndex?: number;
  'Jenis Kenaikan'?: 'Pangkat' | 'Jenjang' | 'Tidak';
  'Target Kenaikan'?: 'Pangkat' | 'Jabatan' | 'Keduanya' | 'Tidak';
}

interface AkumulasiAKProps {
  karyawan: Karyawan;
}

// ==================== SPREADSHEET CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "akumulasi_ak";
const DATA_SHEET_NAME = "data";

// ==================== UTILITY FUNCTIONS ====================
class AkumulasiCalculator {
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
    if (value === null || value === undefined || value === '') return 0;
    
    if (typeof value === 'string') {
      const cleanedValue = value.replace(',', '.');
      return parseFloat(cleanedValue) || 0;
    }
    return Number(value) || 0;
  }

  static calculateTotalKumulatif(akSebelumnya: number, akPeriodeIni: number): number {
    return Number((akSebelumnya + akPeriodeIni).toFixed(3));
  }

  static calculateSelisihRelevan(
    totalKumulatif: number, 
    kebutuhanPangkat: number, 
    kebutuhanJabatan: number,
    isKenaikanJenjang: boolean
  ): number {
    const kebutuhanRelevan = isKenaikanJenjang ? kebutuhanJabatan : kebutuhanPangkat;
    return Number((totalKumulatif - kebutuhanRelevan).toFixed(3));
  }

  static determineStatusKenaikanDual(
    totalKumulatif: number,
    kebutuhanPangkat: number,
    kebutuhanJabatan: number
  ): 'Tidak' | 'Ya' | 'Dipertimbangkan' {
    const selisihPangkat = totalKumulatif - kebutuhanPangkat;
    const selisihJabatan = totalKumulatif - kebutuhanJabatan;
    
    if (selisihPangkat >= 0 || selisihJabatan >= 0) {
      return 'Ya';
    }
    
    if (selisihPangkat >= -10 || selisihJabatan >= -10) {
      return 'Dipertimbangkan';
    }
    
    return 'Tidak';
  }

  static generateRekomendasi(
    status: string, 
    totalKumulatif: number,
    kebutuhanPangkat: number,
    kebutuhanJabatan: number,
    jenisKenaikan?: string,
    targetKenaikan?: string
  ): string {
    const selisihPangkat = totalKumulatif - kebutuhanPangkat;
    const selisihJabatan = totalKumulatif - kebutuhanJabatan;

    switch (status) {
      case 'Ya':
        if (jenisKenaikan === 'Jenjang') {
          return 'Siap untuk diajukan kenaikan jenjang - AK akan direset setelah kenaikan';
        }
        if (targetKenaikan === 'Keduanya') {
          return `Siap untuk diajukan kenaikan PANGKAT (kelebihan ${selisihPangkat.toFixed(3)} AK) dan JABATAN (kelebihan ${selisihJabatan.toFixed(3)} AK)`;
        }
        if (targetKenaikan === 'Pangkat') {
          return `Siap untuk diajukan kenaikan PANGKAT (kelebihan ${selisihPangkat.toFixed(3)} AK)`;
        }
        if (targetKenaikan === 'Jabatan') {
          return `Siap untuk diajukan kenaikan JABATAN (kelebihan ${selisihJabatan.toFixed(3)} AK)`;
        }
        return 'Siap untuk diajukan kenaikan';
      
      case 'Dipertimbangkan':
        const kekuranganPangkat = Math.max(0, -selisihPangkat);
        const kekuranganJabatan = Math.max(0, -selisihJabatan);
        
        if (kekuranganPangkat > 0 && kekuranganJabatan > 0) {
          return `Perlu tambahan ${kekuranganPangkat.toFixed(3)} AK untuk pangkat dan ${kekuranganJabatan.toFixed(3)} AK untuk jabatan`;
        } else if (kekuranganPangkat > 0) {
          return `Perlu tambahan ${kekuranganPangkat.toFixed(3)} AK untuk memenuhi syarat pangkat`;
        } else {
          return `Perlu tambahan ${kekuranganJabatan.toFixed(3)} AK untuk memenuhi syarat jabatan`;
        }
      
      case 'Tidak':
        const butuhPangkat = Math.max(0, -selisihPangkat);
        const butuhJabatan = Math.max(0, -selisihJabatan);
        return `Butuh peningkatan kinerja, kekurangan ${butuhPangkat.toFixed(3)} AK untuk pangkat dan ${butuhJabatan.toFixed(3)} AK untuk jabatan`;
      
      default:
        return 'Perlu evaluasi lebih lanjut';
    }
  }

  static getKebutuhanPangkat(golongan: string, kategori: string): number {
    if (kategori === 'Reguler') return 0;

    const kebutuhanKeahlian: { [key: string]: number } = {
      'III/a': 50,
      'III/b': 50,
      'III/c': 100,
      'III/d': 100,
      'IV/a': 150,
      'IV/b': 150,
      'IV/c': 150,
      'IV/d': 200
    };

    const kebutuhanKeterampilan: { [key: string]: number } = {
      'II/a': 15,
      'II/b': 20,
      'II/c': 20,
      'II/d': 20,
      'III/a': 50,
      'III/b': 50,
      'III/c': 100
    };

    const kebutuhan = kategori === 'Keahlian' ? kebutuhanKeahlian : kebutuhanKeterampilan;
    return kebutuhan[golongan] || 0;
  }

  static getKebutuhanJabatan(jabatanSekarang: string, kategori: string): number {
    if (kategori === 'Reguler') return 0;

    const kebutuhanKeahlian: { [key: string]: number } = {
      'Ahli Pertama': 100,
      'Ahli Muda': 200,
      'Ahli Madya': 450,
      'Ahli Utama': 0
    };

    const kebutuhanKeterampilan: { [key: string]: number } = {
      'Terampil': 60,
      'Mahir': 100,
      'Penyelia': 0
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

  static tentukanTargetKenaikan(
    totalKumulatif: number, 
    kebutuhanPangkat: number, 
    kebutuhanJabatan: number,
    isKenaikanJenjang: boolean
  ): 'Pangkat' | 'Jabatan' | 'Keduanya' | 'Tidak' {
    const bisaPangkat = totalKumulatif >= kebutuhanPangkat && kebutuhanPangkat > 0;
    const bisaJabatan = totalKumulatif >= kebutuhanJabatan && kebutuhanJabatan > 0;

    if (isKenaikanJenjang && bisaJabatan) {
      return 'Keduanya';
    }
    if (bisaPangkat && bisaJabatan) {
      return 'Keduanya';
    }
    if (bisaPangkat) {
      return 'Pangkat';
    }
    if (bisaJabatan) {
      return 'Jabatan';
    }
    return 'Tidak';
  }

  static tentukanJenisKenaikan(
    totalKumulatif: number,
    kebutuhanJabatan: number,
    isKenaikanJenjang: boolean,
    targetKenaikan: string
  ): 'Pangkat' | 'Jenjang' | 'Tidak' {
    if (isKenaikanJenjang && targetKenaikan === 'Keduanya') {
      return 'Jenjang';
    }
    if (targetKenaikan === 'Pangkat' || targetKenaikan === 'Keduanya') {
      return 'Pangkat';
    }
    return 'Tidak';
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

  static getJabatanBerikutnya(jabatanSekarang: string, kategori: string): string {
    if (kategori === 'Reguler') return 'Tidak berlaku';
    
    const progressionKeahlian: { [key: string]: string } = {
      'Ahli Pertama': 'Ahli Muda',
      'Ahli Muda': 'Ahli Madya',
      'Ahli Madya': 'Ahli Utama',
      'Ahli Utama': 'Tidak Ada'
    };

    const progressionKeterampilan: { [key: string]: string } = {
      'Terampil': 'Mahir',
      'Mahir': 'Penyelia',
      'Penyelia': 'Tidak Ada'
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

  static validateAkumulasiData(data: AkumulasiData): boolean {
    return !(
      isNaN(data['AK Sebelumnya']) ||
      isNaN(data['AK Periode Ini']) ||
      isNaN(data['Total Kumulatif']) ||
      isNaN(data['Kebutuhan Pangkat']) ||
      isNaN(data['Kebutuhan Jabatan']) ||
      isNaN(data.Selisih) ||
      data['AK Sebelumnya'] < 0 ||
      data['AK Periode Ini'] < 0 ||
      data['Total Kumulatif'] < 0 ||
      data['Kebutuhan Pangkat'] < 0 ||
      data['Kebutuhan Jabatan'] < 0
    );
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
          range: data?.range || SHEET_NAME,
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
      
      const data = rows.slice(1)
        .filter((row: any[]) => {
          if (!nip) return true;
          const nipIndex = headers.indexOf('NIP');
          return nipIndex >= 0 && row[nipIndex] === nip;
        })
        .map((row: any[], index: number) => {
          const obj: AkumulasiData = { 
            id: `${SHEET_NAME}_${index + 2}`,
            rowIndex: index + 2,
            Last_Update: '',
            NIP: '',
            Nama: '',
            Periode: '',
            'AK Sebelumnya': 0,
            'AK Periode Ini': 0,
            'Total Kumulatif': 0,
            'Kebutuhan Pangkat': 0,
            'Kebutuhan Jabatan': 0,
            Selisih: 0,
            'Status Kenaikan': 'Tidak',
            Rekomendasi: '',
            'Jenis Kenaikan': 'Tidak',
            'Target Kenaikan': 'Tidak'
          } as AkumulasiData;

          headers.forEach((header: string, colIndex: number) => {
            if (colIndex >= row.length) return;
            
            let value = row[colIndex];
            
            if (header === 'No') {
              value = Number(value) || 0;
            }
            else if (header === 'AK Sebelumnya' || header === 'AK Periode Ini' || 
                     header === 'Total Kumulatif' || header === 'Kebutuhan Pangkat' || 
                     header === 'Kebutuhan Jabatan' || header === 'Selisih') {
              value = AkumulasiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Jenis Kenaikan') {
              value = value || 'Tidak';
            }
            else if (header === 'Target Kenaikan') {
              value = value || 'Tidak';
            }
            else if (header === 'Status Kenaikan') {
              value = value || 'Tidak';
            }
            
            (obj as any)[header] = value;
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

  const readDataSheet = async (nip?: string) => {
    try {
      const result = await callAPI('read', { range: DATA_SHEET_NAME });
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
          const obj: any = {
            id: `${DATA_SHEET_NAME}_${index + 2}`,
            rowIndex: index + 2
          };

          headers.forEach((header: string, colIndex: number) => {
            let value = row[colIndex];
            
            if (header === 'akKumulatif') {
              value = AkumulasiCalculator.parseNumberFromSheet(value);
            }
            
            obj[header] = value;
          });
          
          return obj;
        });
      
      return data;
    } catch (error) {
      console.error('Error reading data sheet:', error);
      return [];
    }
  };

  const appendData = async (values: any[]) => {
    return await callAPI('append', { values: [values] });
  };

  const updateData = async (rowIndex: number, values: any[]) => {
    return await callAPI('update', { rowIndex, values: [values] });
  };

  const deleteData = async (rowIndex: number) => {
    return await callAPI('delete', { rowIndex });
  };

  return { readData, readDataSheet, appendData, updateData, deleteData };
};

// ==================== EDIT FORM MODAL ====================
const EditAkumulasiModal: React.FC<{
  data: AkumulasiData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AkumulasiData) => void;
  karyawan: Karyawan;
  initialAkKumulatif: number;
  previousData: AkumulasiData | null;
}> = ({ data, isOpen, onClose, onSave, karyawan, initialAkKumulatif, previousData }) => {
  const [formData, setFormData] = useState<Partial<AkumulasiData>>({});

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    } else {
      const kebutuhanPangkat = AkumulasiCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
      const kebutuhanJabatan = AkumulasiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
      const akSebelumnya = previousData ? previousData['Total Kumulatif'] : initialAkKumulatif;
      
      const totalKumulatif = akSebelumnya;
      const status = AkumulasiCalculator.determineStatusKenaikanDual(totalKumulatif, kebutuhanPangkat, kebutuhanJabatan);
      const targetKenaikan = AkumulasiCalculator.tentukanTargetKenaikan(totalKumulatif, kebutuhanPangkat, kebutuhanJabatan, false);
      const rekomendasi = AkumulasiCalculator.generateRekomendasi(status, totalKumulatif, kebutuhanPangkat, kebutuhanJabatan, 'Tidak', targetKenaikan);
      
      setFormData({
        Periode: `Semester ${new Date().getMonth() < 6 ? 1 : 2} ${new Date().getFullYear()}`,
        'AK Sebelumnya': akSebelumnya,
        'AK Periode Ini': 0,
        'Total Kumulatif': akSebelumnya,
        'Kebutuhan Pangkat': kebutuhanPangkat,
        'Kebutuhan Jabatan': kebutuhanJabatan,
        Selisih: 0,
        'Status Kenaikan': status,
        Rekomendasi: rekomendasi,
        'Jenis Kenaikan': 'Tidak',
        'Target Kenaikan': targetKenaikan
      });
    }
  }, [data, karyawan, initialAkKumulatif, previousData]);

  const calculateValues = (): {
    totalKumulatif: number;
    selisih: number;
    status: 'Tidak' | 'Ya' | 'Dipertimbangkan';
    rekomendasi: string;
    targetKenaikan: 'Pangkat' | 'Jabatan' | 'Keduanya' | 'Tidak';
    jenisKenaikan: 'Pangkat' | 'Jenjang' | 'Tidak';
  } => {
    const akSebelumnya = formData['AK Sebelumnya'] || 0;
    const akPeriodeIni = formData['AK Periode Ini'] || 0;
    const kebutuhanPangkat = formData['Kebutuhan Pangkat'] || AkumulasiCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
    const kebutuhanJabatan = formData['Kebutuhan Jabatan'] || AkumulasiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
    const jenisKenaikanManual = formData['Jenis Kenaikan'] || 'Tidak';

    let totalKumulatif = AkumulasiCalculator.calculateTotalKumulatif(akSebelumnya, akPeriodeIni);
    
    const golonganBerikutnya = AkumulasiCalculator.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori);
    const jabatanBerikutnya = AkumulasiCalculator.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori);
    const isKenaikanJenjang = AkumulasiCalculator.isKenaikanJenjang(
      karyawan.jabatan, 
      jabatanBerikutnya, 
      karyawan.golongan, 
      golonganBerikutnya
    );

    const targetKenaikan = AkumulasiCalculator.tentukanTargetKenaikan(
      totalKumulatif, 
      kebutuhanPangkat, 
      kebutuhanJabatan, 
      isKenaikanJenjang
    );

    const status = AkumulasiCalculator.determineStatusKenaikanDual(totalKumulatif, kebutuhanPangkat, kebutuhanJabatan);

    const selisih = AkumulasiCalculator.calculateSelisihRelevan(totalKumulatif, kebutuhanPangkat, kebutuhanJabatan, isKenaikanJenjang);

    const jenisKenaikan = jenisKenaikanManual !== 'Tidak' 
      ? jenisKenaikanManual 
      : AkumulasiCalculator.tentukanJenisKenaikan(totalKumulatif, kebutuhanJabatan, isKenaikanJenjang, targetKenaikan);

    const rekomendasi = AkumulasiCalculator.generateRekomendasi(status, totalKumulatif, kebutuhanPangkat, kebutuhanJabatan, jenisKenaikan, targetKenaikan);

    return { totalKumulatif, selisih, status, rekomendasi, targetKenaikan, jenisKenaikan };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Periode) {
      const { totalKumulatif, selisih, status, rekomendasi, targetKenaikan, jenisKenaikan } = calculateValues();
      
      const finalData: AkumulasiData = {
        ...data,
        ...formData,
        NIP: karyawan.nip,
        Nama: karyawan.nama,
        'Total Kumulatif': totalKumulatif,
        Selisih: selisih,
        'Status Kenaikan': status,
        Rekomendasi: rekomendasi,
        'Target Kenaikan': targetKenaikan,
        'Jenis Kenaikan': jenisKenaikan,
        Last_Update: AkumulasiCalculator.formatDate(new Date())
      } as AkumulasiData;

      if (!AkumulasiCalculator.validateAkumulasiData(finalData)) {
        alert('Data tidak valid! Silakan periksa input Anda.');
        return;
      }

      onSave(finalData);
    }
  };

  const { totalKumulatif, selisih, status, rekomendasi, targetKenaikan, jenisKenaikan } = calculateValues();
  const kebutuhanPangkatDefault = AkumulasiCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
  const kebutuhanJabatanDefault = AkumulasiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
  const akSebelumnyaDefault = previousData ? previousData['Total Kumulatif'] : initialAkKumulatif;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {data ? 'Edit Data Akumulasi AK' : 'Tambah Data Akumulasi AK'}
          </DialogTitle>
          <DialogDescription>
            {data ? 'Edit data akumulasi angka kredit' : 'Tambahkan data akumulasi angka kredit baru'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="periode">Periode</Label>
              <Input
                id="periode"
                value={formData.Periode || ''}
                onChange={(e) => setFormData({...formData, Periode: e.target.value})}
                placeholder="Contoh: Semester 1 2024"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kebutuhan-pangkat">Kebutuhan AK Pangkat</Label>
              <Input
                id="kebutuhan-pangkat"
                type="number"
                step="0.001"
                min="0"
                value={formData['Kebutuhan Pangkat'] || kebutuhanPangkatDefault}
                onChange={(e) => setFormData({...formData, 'Kebutuhan Pangkat': parseFloat(e.target.value)})}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Golongan {karyawan.golongan}: {kebutuhanPangkatDefault} AK
              </p>
            </div>
            <div>
              <Label htmlFor="kebutuhan-jabatan">Kebutuhan AK Jabatan</Label>
              <Input
                id="kebutuhan-jabatan"
                type="number"
                step="0.001"
                min="0"
                value={formData['Kebutuhan Jabatan'] || kebutuhanJabatanDefault}
                onChange={(e) => setFormData({...formData, 'Kebutuhan Jabatan': parseFloat(e.target.value)})}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Jabatan {karyawan.jabatan}: {kebutuhanJabatanDefault} AK
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ak-sebelumnya">AK Sebelumnya</Label>
              <Input
                id="ak-sebelumnya"
                type="number"
                step="0.001"
                min="0"
                value={formData['AK Sebelumnya'] || akSebelumnyaDefault}
                onChange={(e) => setFormData({...formData, 'AK Sebelumnya': parseFloat(e.target.value)})}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nilai dari periode sebelumnya: {akSebelumnyaDefault.toFixed(3)}
              </p>
            </div>
            <div>
              <Label htmlFor="ak-periode-ini">AK Periode Ini</Label>
              <Input
                id="ak-periode-ini"
                type="number"
                step="0.001"
                min="0"
                value={formData['AK Periode Ini'] || 0}
                onChange={(e) => setFormData({...formData, 'AK Periode Ini': parseFloat(e.target.value)})}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="jenis-kenaikan">Jenis Kenaikan</Label>
            <Select 
              value={formData['Jenis Kenaikan'] || 'Tidak'} 
              onValueChange={(value: 'Pangkat' | 'Jenjang' | 'Tidak') => 
                setFormData({...formData, 'Jenis Kenaikan': value})
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tidak">Tidak Ada Kenaikan</SelectItem>
                <SelectItem value="Pangkat">Kenaikan Pangkat</SelectItem>
                <SelectItem value="Jenjang">Kenaikan Jenjang</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              • Pangkat: AK terus berakumulasi • Jenjang: AK direset ke 0 setelah kenaikan
            </p>
          </div>

          <div>
            <Label htmlFor="link-dokumen">Link Dokumen (Opsional)</Label>
            <Input
              id="link-dokumen"
              value={formData.Link_Dokumen || ''}
              onChange={(e) => setFormData({...formData, Link_Dokumen: e.target.value})}
              placeholder="https://..."
            />
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Perhitungan Otomatis:</strong><br />
              • AK Sebelumnya: {formData['AK Sebelumnya'] || akSebelumnyaDefault}<br />
              • AK Periode Ini: {formData['AK Periode Ini'] || 0}<br />
              • Jenis Kenaikan: <strong>{formData['Jenis Kenaikan'] || 'Tidak'}</strong><br />
              • Total Kumulatif: <strong>{totalKumulatif.toFixed(3)}</strong><br />
              • Kebutuhan Pangkat: {formData['Kebutuhan Pangkat'] || kebutuhanPangkatDefault}<br />
              • Kebutuhan Jabatan: {formData['Kebutuhan Jabatan'] || kebutuhanJabatanDefault}<br />
              • Selisih: <strong className={selisih >= 0 ? 'text-green-600' : 'text-red-600'}>
                {selisih.toFixed(3)}
              </strong><br />
              • Status Kenaikan: <strong>{status}</strong><br />
              • Target Kenaikan: <strong>{targetKenaikan}</strong><br />
              • Rekomendasi: {rekomendasi}<br />
            </p>
          </div>

          {jenisKenaikan === 'Jenjang' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">Perhatian: Kenaikan Jenjang</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Total AK akan direset ke 0 setelah kenaikan jenjang. Pastikan ini adalah keputusan yang tepat.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
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
const AkumulasiAK: React.FC<AkumulasiAKProps> = ({ karyawan }) => {
  const { toast } = useToast();
  const api = useSpreadsheetAPI();
  
  const [akumulasiData, setAkumulasiData] = useState<AkumulasiData[]>([]);
  const [initialAkKumulatif, setInitialAkKumulatif] = useState<number>(karyawan.akKumulatif || 0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ periode: 'all' });
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    data: AkumulasiData | null;
  }>({
    isOpen: false,
    data: null
  });

  useEffect(() => {
    loadData();
    loadInitialAkKumulatif();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.readData(karyawan.nip);
      setAkumulasiData(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInitialAkKumulatif = async () => {
    try {
      const dataSheet = await api.readDataSheet(karyawan.nip);
      if (dataSheet.length > 0) {
        const latestData = dataSheet[0];
        if (latestData.akKumulatif !== undefined) {
          setInitialAkKumulatif(latestData.akKumulatif);
        }
      }
    } catch (error) {
      setInitialAkKumulatif(karyawan.akKumulatif || 0);
    }
  };

  const getPreviousData = (currentData: AkumulasiData | null): AkumulasiData | null => {
    if (!currentData) {
      return akumulasiData.length > 0 ? akumulasiData[akumulasiData.length - 1] : null;
    }
    
    const currentIndex = akumulasiData.findIndex(item => item.id === currentData.id);
    return currentIndex > 0 ? akumulasiData[currentIndex - 1] : null;
  };

  const handleEdit = (data: AkumulasiData) => {
    setEditModal({
      isOpen: true,
      data: data
    });
  };

  const handleSave = async (updatedData: AkumulasiData) => {
    try {
      const nextNo = akumulasiData.length > 0 ? Math.max(...akumulasiData.map(d => d.No || 0)) + 1 : 1;
      
      const values = [
        updatedData.No || nextNo,
        updatedData.NIP,
        updatedData.Nama,
        updatedData.Periode,
        AkumulasiCalculator.formatNumberForSheet(updatedData['AK Sebelumnya']),
        AkumulasiCalculator.formatNumberForSheet(updatedData['AK Periode Ini']),
        AkumulasiCalculator.formatNumberForSheet(updatedData['Total Kumulatif']),
        AkumulasiCalculator.formatNumberForSheet(updatedData['Kebutuhan Pangkat']),
        AkumulasiCalculator.formatNumberForSheet(updatedData['Kebutuhan Jabatan']),
        AkumulasiCalculator.formatNumberForSheet(updatedData.Selisih),
        updatedData['Status Kenaikan'],
        updatedData.Rekomendasi,
        updatedData.Link_Dokumen || '',
        updatedData.Last_Update,
        updatedData['Jenis Kenaikan'] || 'Tidak',
        updatedData['Target Kenaikan'] || 'Tidak'
      ];

      if (updatedData.rowIndex) {
        await api.updateData(updatedData.rowIndex, values);
        toast({
          title: "Sukses",
          description: "Data berhasil diupdate di Google Sheets"
        });
      } else {
        await api.appendData(values);
        toast({
          title: "Sukses",
          description: "Data berhasil ditambahkan ke Google Sheets"
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

  const handleAddNew = () => {
    setEditModal({
      isOpen: true,
      data: null
    });
  };

  const handleDelete = async (rowData: AkumulasiData) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data akumulasi AK ini?')) return;
    
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
      toast({
        title: "Error",
        description: "Gagal menghapus data",
        variant: "destructive"
      });
    }
  };

  const getFilteredData = () => {
    return akumulasiData.filter(item => 
      filters.periode === 'all' || item.Periode?.toLowerCase().includes(filters.periode.toLowerCase())
    );
  };

  const getTargetKenaikanVariant = (target: string) => {
    switch (target) {
      case 'Keduanya': return 'default';
      case 'Pangkat': return 'secondary';
      case 'Jabatan': return 'outline';
      case 'Tidak': return 'destructive';
      default: return 'outline';
    }
  };

  const getSelisihColor = (selisih: number) => {
    return selisih >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const renderAkumulasiTable = () => (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">No</TableHead>
              <TableHead className="w-40">Periode</TableHead>
              <TableHead className="w-24 text-right">AK Sebelumnya</TableHead>
              <TableHead className="w-24 text-right">AK Periode Ini</TableHead>
              <TableHead className="w-24 text-right">Total Kumulatif</TableHead>
              <TableHead className="w-20 text-right">Kebutuhan<br/>Pangkat</TableHead>
              <TableHead className="w-20 text-right">Kebutuhan<br/>Jabatan</TableHead>
              <TableHead className="w-20 text-right">Selisih</TableHead>
              <TableHead className="w-32">Target<br/>Kenaikan</TableHead>
              <TableHead className="w-20 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getFilteredData().map((data: AkumulasiData) => (
              <TableRow key={data.id} className="hover:bg-muted/50">
                <TableCell className="text-center font-medium py-2">
                  {data.No}
                </TableCell>
                <TableCell className="py-2">
                  <div className="font-semibold text-sm">{data.Periode}</div>
                </TableCell>
                <TableCell className="text-right py-2">
                  <span className="text-sm">{data['AK Sebelumnya'].toFixed(3)}</span>
                </TableCell>
                <TableCell className="text-right py-2">
                  <span className="text-sm font-semibold text-blue-600">
                    {data['AK Periode Ini'].toFixed(3)}
                  </span>
                </TableCell>
                <TableCell className="text-right py-2">
                  <span className="text-sm font-semibold">
                    {data['Total Kumulatif'].toFixed(3)}
                  </span>
                </TableCell>
                <TableCell className="text-right py-2">
                  <span className="text-sm">{data['Kebutuhan Pangkat']}</span>
                </TableCell>
                <TableCell className="text-right py-2">
                  <span className="text-sm">{data['Kebutuhan Jabatan']}</span>
                </TableCell>
                <TableCell className="text-right py-2">
                  <span className={`text-sm font-semibold ${getSelisihColor(data.Selisih)}`}>
                    {data.Selisih.toFixed(3)}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant={getTargetKenaikanVariant(data['Target Kenaikan'] || 'Tidak')} className="text-xs">
                    {data['Target Kenaikan'] || 'Tidak'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center py-2">
                  <div className="flex justify-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(data)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(data)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const latestData = getFilteredData().length > 0 ? getFilteredData()[getFilteredData().length - 1] : null;
  const totalKumulatif = latestData ? latestData['Total Kumulatif'] : initialAkKumulatif;
  const kebutuhanPangkat = AkumulasiCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
  const kebutuhanJabatan = AkumulasiCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Akumulasi Angka Kredit
          </CardTitle>
          <CardDescription>
            {karyawan.nama} - {karyawan.nip}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-end">
            <div className="flex-1 w-full sm:w-auto">
              <Label htmlFor="filter-periode" className="text-sm">Filter Periode</Label>
              <Select 
                value={filters.periode} 
                onValueChange={(value) => setFilters({...filters, periode: value})}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Semua Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Periode</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                  <SelectItem value="tahun">Tahun</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={loadData} variant="outline" size="sm" className="w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button onClick={handleAddNew} size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Baru
            </Button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Total Kumulatif</div>
                <div className="font-semibold text-primary">{totalKumulatif.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Kebutuhan Pangkat</div>
                <div className="font-semibold">{kebutuhanPangkat}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Kebutuhan Jabatan</div>
                <div className="font-semibold">{kebutuhanJabatan}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Jumlah Data</div>
                <div className="font-semibold">{getFilteredData().length}</div>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2 text-sm">Memuat data...</p>
                </div>
              ) : getFilteredData().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Tidak ada data akumulasi</p>
                  <Button onClick={handleAddNew} size="sm" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Data Pertama
                  </Button>
                </div>
              ) : (
                renderAkumulasiTable()
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <EditAkumulasiModal
        data={editModal.data}
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, data: null })}
        onSave={handleSave}
        karyawan={karyawan}
        initialAkKumulatif={initialAkKumulatif}
        previousData={getPreviousData(editModal.data)}
      />
    </div>
  );
};

export default AkumulasiAK;