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
  Kebutuhan: number;
  Selisih: number;
  'Status Kenaikan': 'Tidak' | 'Ya' | 'Dipertimbangkan';
  Rekomendasi: string;
  Link_Dokumen?: string;
  Last_Update: string;
  rowIndex?: number;
  'Jenis Kenaikan'?: 'Pangkat' | 'Jenjang' | 'Tidak';
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

  // Hitung total kumulatif
  static calculateTotalKumulatif(akSebelumnya: number, akPeriodeIni: number): number {
    return Number((akSebelumnya + akPeriodeIni).toFixed(3));
  }

  // Hitung selisih antara total kumulatif dan kebutuhan
  static calculateSelisih(totalKumulatif: number, kebutuhan: number): number {
    return Number((totalKumulatif - kebutuhan).toFixed(3));
  }

  // Tentukan status kenaikan berdasarkan selisih
  static determineStatusKenaikan(selisih: number): 'Tidak' | 'Ya' | 'Dipertimbangkan' {
    if (selisih >= 0) return 'Ya';
    if (selisih >= -10) return 'Dipertimbangkan';
    return 'Tidak';
  }

  // Generate rekomendasi berdasarkan status
  static generateRekomendasi(status: string, selisih: number, jenisKenaikan?: string): string {
    switch (status) {
      case 'Ya':
        return jenisKenaikan === 'Jenjang' 
          ? 'Siap untuk diajukan kenaikan jenjang - AK akan direset setelah kenaikan'
          : 'Siap untuk diajukan kenaikan pangkat';
      case 'Dipertimbangkan':
        return `Perlu tambahan ${Math.abs(selisih).toFixed(3)} AK untuk memenuhi syarat`;
      case 'Tidak':
        return `Butuh peningkatan kinerja, kekurangan ${Math.abs(selisih).toFixed(3)} AK`;
      default:
        return 'Perlu evaluasi lebih lanjut';
    }
  }

  // Get kebutuhan AK berdasarkan golongan - MENGADOPSI DARI SKRIP UTAMA
  static getKebutuhanAK(golongan: string, kategori: string): number {
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
    return kebutuhan[golongan] || 100;
  }

  // Validasi data akumulasi
  static validateAkumulasiData(data: AkumulasiData): boolean {
    return !(
      isNaN(data['AK Sebelumnya']) ||
      isNaN(data['AK Periode Ini']) ||
      isNaN(data['Total Kumulatif']) ||
      isNaN(data.Kebutuhan) ||
      isNaN(data.Selisih) ||
      data['AK Sebelumnya'] < 0 ||
      data['AK Periode Ini'] < 0 ||
      data['Total Kumulatif'] < 0 ||
      data.Kebutuhan < 0
    );
  }

  // Generate periode akumulasi dari data konversi dengan logika kenaikan yang benar
  static generatePeriodeFromKonversi(
    konversiData: any[], 
    karyawan: Karyawan,
    existingAkumulasiData: AkumulasiData[] = []
  ): { 
    periode: string; 
    akSebelumnya: number; 
    akPeriodeIni: number;
    totalKumulatif: number;
    kebutuhan: number;
    selisih: number;
    status: 'Tidak' | 'Ya' | 'Dipertimbangkan';
    rekomendasi: string;
    jenisKenaikan: 'Pangkat' | 'Jenjang' | 'Tidak';
  }[] {
    const periods: { [key: string]: { akPeriodeIni: number; tahun: number } } = {};
    
    console.log('🔍 Memproses data konversi untuk akumulasi tahunan:', konversiData);
    
    // Group by tahun untuk akumulasi tahunan
    konversiData.forEach(item => {
      const tahun = item.Tahun;
      const periodeKey = `Tahun ${tahun}`;
      const akKonversi = item['AK Konversi'] || 0;
      
      if (!periods[periodeKey]) {
        periods[periodeKey] = { akPeriodeIni: 0, tahun };
      }
      periods[periodeKey].akPeriodeIni += akKonversi;
    });

    const kebutuhan = this.getKebutuhanAK(karyawan.golongan, karyawan.kategori);
    
    // Cari data akumulasi terakhir yang sudah ada
    const sortedExistingData = [...existingAkumulasiData].sort((a, b) => {
      const yearA = parseInt(a.Periode?.match(/\d+/)?.[0] || '0');
      const yearB = parseInt(b.Periode?.match(/\d+/)?.[0] || '0');
      return yearA - yearB;
    });

    let akumulasiSebelumnya = sortedExistingData.length > 0 
      ? sortedExistingData[sortedExistingData.length - 1]['Total Kumulatif']
      : karyawan.akKumulatif || 0;

    const result = [];

    // Urutkan berdasarkan tahun
    const sortedPeriods = Object.entries(periods)
      .sort(([,a], [,b]) => a.tahun - b.tahun);

    for (const [periode, data] of sortedPeriods) {
      // Skip periode yang sudah ada di data akumulasi
      const isPeriodExists = existingAkumulasiData.some(item => 
        item.Periode === periode
      );
      
      if (isPeriodExists) {
        console.log(`⏩ Skip periode ${periode} karena sudah ada`);
        continue;
      }

      const totalKumulatif = this.calculateTotalKumulatif(akumulasiSebelumnya, data.akPeriodeIni);
      const selisih = this.calculateSelisih(totalKumulatif, kebutuhan);
      const status = this.determineStatusKenaikan(selisih);
      
      // Tentukan jenis kenaikan berdasarkan status
      let jenisKenaikan: 'Pangkat' | 'Jenjang' | 'Tidak' = 'Tidak';
      if (status === 'Ya') {
        jenisKenaikan = 'Pangkat';
      }

      const rekomendasi = this.generateRekomendasi(status, selisih, jenisKenaikan);

      result.push({
        periode,
        akSebelumnya: akumulasiSebelumnya,
        akPeriodeIni: data.akPeriodeIni,
        totalKumulatif,
        kebutuhan,
        selisih,
        status,
        rekomendasi,
        jenisKenaikan
      });

      // Update akumulasi sebelumnya untuk periode berikutnya
      // Jika kenaikan jenjang, reset ke 0, jika pangkat lanjut terus
      akumulasiSebelumnya = jenisKenaikan === 'Jenjang' ? 0 : totalKumulatif;
    }

    return result;
  }

  // Generate periode semester dari data konversi dengan logika kenaikan yang benar
  static generateSemesterFromKonversi(
    konversiData: any[], 
    karyawan: Karyawan,
    existingAkumulasiData: AkumulasiData[] = []
  ): { 
    periode: string; 
    akSebelumnya: number; 
    akPeriodeIni: number;
    totalKumulatif: number;
    kebutuhan: number;
    selisih: number;
    status: 'Tidak' | 'Ya' | 'Dipertimbangkan';
    rekomendasi: string;
    jenisKenaikan: 'Pangkat' | 'Jenjang' | 'Tidak';
  }[] {
    const periods: { [key: string]: { akPeriodeIni: number; tahun: number; semester: number } } = {};
    
    // Group by tahun dan semester
    konversiData.forEach(item => {
      const tahun = item.Tahun;
      const semester = item.Semester;
      const periodeKey = `Semester ${semester} ${tahun}`;
      const akKonversi = item['AK Konversi'] || 0;
      
      if (!periods[periodeKey]) {
        periods[periodeKey] = { akPeriodeIni: 0, tahun, semester };
      }
      periods[periodeKey].akPeriodeIni += akKonversi;
    });

    const kebutuhan = this.getKebutuhanAK(karyawan.golongan, karyawan.kategori);
    
    // Cari data akumulasi terakhir yang sudah ada
    const sortedExistingData = [...existingAkumulasiData].sort((a, b) => {
      const yearA = parseInt(a.Periode?.match(/\d{4}/)?.[0] || '0');
      const yearB = parseInt(b.Periode?.match(/\d{4}/)?.[0] || '0');
      const semesterA = a.Periode?.includes('Semester 1') ? 1 : 2;
      const semesterB = b.Periode?.includes('Semester 1') ? 1 : 2;
      
      if (yearA !== yearB) return yearA - yearB;
      return semesterA - semesterB;
    });

    let akumulasiSebelumnya = sortedExistingData.length > 0 
      ? sortedExistingData[sortedExistingData.length - 1]['Total Kumulatif']
      : karyawan.akKumulatif || 0;

    const result = [];

    // Urutkan berdasarkan tahun dan semester
    const sortedPeriods = Object.entries(periods)
      .sort(([,a], [,b]) => {
        if (a.tahun !== b.tahun) return a.tahun - b.tahun;
        return a.semester - b.semester;
      });

    for (const [periode, data] of sortedPeriods) {
      // Skip periode yang sudah ada di data akumulasi
      const isPeriodExists = existingAkumulasiData.some(item => 
        item.Periode === periode
      );
      
      if (isPeriodExists) {
        continue;
      }

      const totalKumulatif = this.calculateTotalKumulatif(akumulasiSebelumnya, data.akPeriodeIni);
      const selisih = this.calculateSelisih(totalKumulatif, kebutuhan);
      const status = this.determineStatusKenaikan(selisih);
      
      // Tentukan jenis kenaikan berdasarkan status
      let jenisKenaikan: 'Pangkat' | 'Jenjang' | 'Tidak' = 'Tidak';
      if (status === 'Ya') {
        jenisKenaikan = 'Pangkat';
      }

      const rekomendasi = this.generateRekomendasi(status, selisih, jenisKenaikan);

      result.push({
        periode,
        akSebelumnya: akumulasiSebelumnya,
        akPeriodeIni: data.akPeriodeIni,
        totalKumulatif,
        kebutuhan,
        selisih,
        status,
        rekomendasi,
        jenisKenaikan
      });

      // Update akumulasi sebelumnya untuk periode berikutnya
      akumulasiSebelumnya = jenisKenaikan === 'Jenjang' ? 0 : totalKumulatif;
    }

    return result;
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
            Kebutuhan: 0,
            Selisih: 0,
            'Status Kenaikan': 'Tidak',
            Rekomendasi: '',
            'Jenis Kenaikan': 'Tidak'
          } as AkumulasiData;

          headers.forEach((header: string, colIndex: number) => {
            let value = row[colIndex];
            
            if (header === 'No') {
              value = Number(value) || 0;
            }
            else if (header === 'AK Sebelumnya' || header === 'AK Periode Ini' || 
                     header === 'Total Kumulatif' || header === 'Kebutuhan' || header === 'Selisih') {
              value = AkumulasiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Jenis Kenaikan') {
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
      const kebutuhan = AkumulasiCalculator.getKebutuhanAK(karyawan.golongan, karyawan.kategori);
      const akSebelumnya = previousData ? previousData['Total Kumulatif'] : initialAkKumulatif;
      
      setFormData({
        Periode: `Semester ${new Date().getMonth() < 6 ? 1 : 2} ${new Date().getFullYear()}`,
        'AK Sebelumnya': akSebelumnya,
        'AK Periode Ini': 0,
        'Total Kumulatif': akSebelumnya,
        Kebutuhan: kebutuhan,
        Selisih: akSebelumnya - kebutuhan,
        'Status Kenaikan': 'Tidak',
        Rekomendasi: '',
        'Jenis Kenaikan': 'Tidak'
      });
    }
  }, [data, karyawan, initialAkKumulatif, previousData]);

  const calculateValues = (): {
    totalKumulatif: number;
    selisih: number;
    status: 'Tidak' | 'Ya' | 'Dipertimbangkan';
    rekomendasi: string;
  } => {
    const akSebelumnya = formData['AK Sebelumnya'] || 0;
    const akPeriodeIni = formData['AK Periode Ini'] || 0;
    const kebutuhan = formData.Kebutuhan || AkumulasiCalculator.getKebutuhanAK(karyawan.golongan, karyawan.kategori);
    const jenisKenaikan = formData['Jenis Kenaikan'] || 'Tidak';

    let totalKumulatif = AkumulasiCalculator.calculateTotalKumulatif(akSebelumnya, akPeriodeIni);
    
    // Jika kenaikan jenjang, reset total kumulatif ke 0
    if (jenisKenaikan === 'Jenjang') {
      totalKumulatif = 0;
    }

    const selisih = AkumulasiCalculator.calculateSelisih(totalKumulatif, kebutuhan);
    const status = AkumulasiCalculator.determineStatusKenaikan(selisih);
    const rekomendasi = AkumulasiCalculator.generateRekomendasi(status, selisih, jenisKenaikan);

    return { totalKumulatif, selisih, status, rekomendasi };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Periode) {
      const { totalKumulatif, selisih, status, rekomendasi } = calculateValues();
      
      const finalData: AkumulasiData = {
        ...data,
        ...formData,
        NIP: karyawan.nip,
        Nama: karyawan.nama,
        'Total Kumulatif': totalKumulatif,
        Selisih: selisih,
        'Status Kenaikan': status,
        Rekomendasi: rekomendasi,
        Last_Update: AkumulasiCalculator.formatDate(new Date())
      } as AkumulasiData;

      if (!AkumulasiCalculator.validateAkumulasiData(finalData)) {
        alert('Data tidak valid! Silakan periksa input Anda.');
        return;
      }

      onSave(finalData);
    }
  };

  const { totalKumulatif, selisih, status, rekomendasi } = calculateValues();
  const kebutuhanDefault = AkumulasiCalculator.getKebutuhanAK(karyawan.golongan, karyawan.kategori);
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
            <div>
              <Label htmlFor="kebutuhan">Kebutuhan AK</Label>
              <Input
                id="kebutuhan"
                type="number"
                step="0.001"
                min="0"
                value={formData.Kebutuhan || kebutuhanDefault}
                onChange={(e) => setFormData({...formData, Kebutuhan: parseFloat(e.target.value)})}
                required
              />
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
              • Total Kumulatif: <strong>{totalKumulatif}</strong><br />
              • Kebutuhan: {formData.Kebutuhan || kebutuhanDefault}<br />
              • Selisih: <strong className={selisih >= 0 ? 'text-green-600' : 'text-red-600'}>
                {selisih}
              </strong><br />
              • Status Kenaikan: <strong>{status}</strong><br />
              • Rekomendasi: {rekomendasi}<br />
              • NIP: {karyawan.nip}<br />
              • Nama: {karyawan.nama}
            </p>
          </div>

          {formData['Jenis Kenaikan'] === 'Jenjang' && (
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

// ==================== GENERATE AKUMULASI MODAL ====================
const GenerateAkumulasiModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (periods: { 
    periode: string; 
    akSebelumnya: number; 
    akPeriodeIni: number;
    totalKumulatif: number;
    kebutuhan: number;
    selisih: number;
    status: 'Tidak' | 'Ya' | 'Dipertimbangkan';
    rekomendasi: string;
    jenisKenaikan: 'Pangkat' | 'Jenjang' | 'Tidak';
  }[]) => void;
  karyawan: Karyawan;
  initialAkKumulatif: number;
  existingAkumulasiData: AkumulasiData[];
}> = ({ isOpen, onClose, onGenerate, karyawan, initialAkKumulatif, existingAkumulasiData }) => {
  const [availablePeriods, setAvailablePeriods] = useState<{ 
    periode: string; 
    akSebelumnya: number; 
    akPeriodeIni: number;
    totalKumulatif: number;
    kebutuhan: number;
    selisih: number;
    status: 'Tidak' | 'Ya' | 'Dipertimbangkan';
    rekomendasi: string;
    jenisKenaikan: 'Pangkat' | 'Jenjang' | 'Tidak';
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateType, setGenerateType] = useState<'tahunan' | 'semester'>('tahunan');

  useEffect(() => {
    if (isOpen) {
      loadKonversiData();
    }
  }, [isOpen, generateType]);

  const loadKonversiData = async () => {
    setLoading(true);
    try {
      const konversiData = await readKonversiData(karyawan.nip);
      
      let generatedPeriods;
      if (generateType === 'tahunan') {
        generatedPeriods = AkumulasiCalculator.generatePeriodeFromKonversi(
          konversiData, 
          karyawan, 
          existingAkumulasiData
        );
      } else {
        generatedPeriods = AkumulasiCalculator.generateSemesterFromKonversi(
          konversiData, 
          karyawan, 
          existingAkumulasiData
        );
      }

      setAvailablePeriods(generatedPeriods);
    } catch (error) {
      console.error('Error loading konversi data:', error);
      setAvailablePeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const readKonversiData = async (nip?: string) => {
    try {
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: 'read',
          range: 'konversi_predikat'
        }
      });

      if (error) throw error;

      const rows = result.values || [];
      
      if (rows.length <= 1) {
        return [];
      }
      
      const headers = rows[0];
      
      const data = rows.slice(1)
        .filter((row: any[]) => {
          if (!nip) return true;
          const nipIndex = headers.indexOf('NIP');
          const rowNIP = nipIndex >= 0 ? row[nipIndex] : null;
          return rowNIP === nip;
        })
        .map((row: any[], index: number) => {
          const obj: any = {
            id: `konversi_${index + 2}`,
            rowIndex: index + 2
          };

          headers.forEach((header: string, colIndex: number) => {
            let value = row[colIndex];
            
            if (header === 'Tahun' || header === 'Semester' || header === 'No') {
              value = Number(value) || 0;
            }
            else if (header === 'AK Konversi') {
              value = AkumulasiCalculator.parseNumberFromSheet(value);
            }
            else if (header === 'Nilai SKP') {
              value = Number(value) || 0;
            }
            else if (header === 'Banyak_Bulan') {
              value = Number(value) || 6;
            }
            else if (header === 'Keterangan') {
              value = value || 'PENUH';
            }
            
            obj[header] = value;
          });
          
          return obj;
        });
      
      return data;
    } catch (error) {
      console.error('Error reading konversi data:', error);
      return [];
    }
  };

  const handleGenerate = () => {
    onGenerate(availablePeriods);
    onClose();
  };

  const kebutuhan = AkumulasiCalculator.getKebutuhanAK(karyawan.golongan, karyawan.kategori);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Data Akumulasi dari Konversi Predikat</DialogTitle>
          <DialogDescription>
            Membuat data akumulasi angka kredit dari data konversi predikat yang sudah ada untuk {karyawan.nama}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="generate-type">Jenis Akumulasi</Label>
                <Select 
                  value={generateType} 
                  onValueChange={(value: 'tahunan' | 'semester') => {
                    setGenerateType(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tahunan">Akumulasi Tahunan</SelectItem>
                    <SelectItem value="semester">Akumulasi per Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadKonversiData} variant="outline" disabled={loading}>
                  {loading ? 'Memuat...' : 'Refresh Data'}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-blue-700">
              <div>
                <strong>Kebutuhan Golongan {karyawan.golongan}:</strong> {kebutuhan} AK
              </div>
              <div>
                <strong>Jenis:</strong> {generateType === 'tahunan' ? 'Akumulasi Tahunan' : 'Akumulasi per Semester'}
              </div>
              <div>
                <strong>Data Existing:</strong> {existingAkumulasiData.length} periode
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Memuat data konversi predikat...</p>
            </div>
          ) : availablePeriods.length > 0 ? (
            <div className="flex-1 overflow-hidden">
              <div className="mb-4 p-2 bg-green-50 rounded">
                <p className="text-sm text-green-700">
                  ✅ Ditemukan {availablePeriods.length} periode baru dari data konversi
                </p>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-y-auto max-h-96">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead className="whitespace-nowrap">No</TableHead>
                            <TableHead className="whitespace-nowrap">Periode</TableHead>
                            <TableHead className="whitespace-nowrap">AK Sebelumnya</TableHead>
                            <TableHead className="whitespace-nowrap">AK Periode Ini</TableHead>
                            <TableHead className="whitespace-nowrap">Total Kumulatif</TableHead>
                            <TableHead className="whitespace-nowrap">Kebutuhan</TableHead>
                            <TableHead className="whitespace-nowrap">Selisih</TableHead>
                            <TableHead className="whitespace-nowrap">Status</TableHead>
                            <TableHead className="whitespace-nowrap">Jenis Kenaikan</TableHead>
                            <TableHead className="whitespace-nowrap">Rekomendasi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availablePeriods.map((period, index) => (
                            <TableRow key={period.periode}>
                              <TableCell className="whitespace-nowrap">{index + 1}</TableCell>
                              <TableCell className="whitespace-nowrap font-semibold">{period.periode}</TableCell>
                              <TableCell className="whitespace-nowrap">{period.akSebelumnya.toFixed(3)}</TableCell>
                              <TableCell className="whitespace-nowrap text-primary font-semibold">
                                {period.akPeriodeIni.toFixed(3)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap font-semibold">
                                {period.totalKumulatif.toFixed(3)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{period.kebutuhan}</TableCell>
                              <TableCell className={`whitespace-nowrap font-semibold ${period.selisih >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {period.selisih.toFixed(3)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge variant={
                                  period.status === 'Ya' ? 'default' :
                                  period.status === 'Dipertimbangkan' ? 'secondary' : 'destructive'
                                }>
                                  {period.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge variant={
                                  period.jenisKenaikan === 'Pangkat' ? 'default' :
                                  period.jenisKenaikan === 'Jenjang' ? 'secondary' : 'outline'
                                }>
                                  {period.jenisKenaikan}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm max-w-xs" title={period.rekomendasi}>
                                <div className="line-clamp-2">{period.rekomendasi}</div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada data konversi predikat baru yang ditemukan untuk NIP {karyawan.nip}</p>
              <p className="text-sm mt-2">
                {existingAkumulasiData.length > 0 
                  ? 'Semua periode sudah ada di data akumulasi atau tidak ada data konversi baru'
                  : 'Pastikan data konversi predikat sudah diisi terlebih dahulu'
                }
              </p>
              <Button onClick={loadKonversiData} variant="outline" className="mt-2">
                Coba Muat Ulang Data
              </Button>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleGenerate} disabled={availablePeriods.length === 0 || loading}>
              Generate {availablePeriods.length} Periode
            </Button>
          </DialogFooter>
        </div>
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
  const [filters, setFilters] = useState({ periode: 'all', status: 'all' });
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    data: AkumulasiData | null;
  }>({
    isOpen: false,
    data: null
  });
  const [generateModal, setGenerateModal] = useState(false);

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
      console.error('Error loading initial AK kumulatif:', error);
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
        AkumulasiCalculator.formatNumberForSheet(updatedData.Kebutuhan),
        AkumulasiCalculator.formatNumberForSheet(updatedData.Selisih),
        updatedData['Status Kenaikan'],
        updatedData.Rekomendasi,
        updatedData.Link_Dokumen || '',
        updatedData.Last_Update,
        updatedData['Jenis Kenaikan'] || 'Tidak'
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

  const handleGeneratePeriods = async (periods: { 
    periode: string; 
    akSebelumnya: number; 
    akPeriodeIni: number;
    totalKumulatif: number;
    kebutuhan: number;
    selisih: number;
    status: 'Tidak' | 'Ya' | 'Dipertimbangkan';
    rekomendasi: string;
    jenisKenaikan: 'Pangkat' | 'Jenjang' | 'Tidak';
  }[]) => {
    try {
      const now = AkumulasiCalculator.formatDate(new Date());
      const nextNo = akumulasiData.length > 0 ? Math.max(...akumulasiData.map(d => d.No || 0)) + 1 : 1;
      
      for (const [index, period] of periods.entries()) {
        const newData = {
          No: nextNo + index,
          NIP: karyawan.nip,
          Nama: karyawan.nama,
          Periode: period.periode,
          'AK Sebelumnya': period.akSebelumnya,
          'AK Periode Ini': period.akPeriodeIni,
          'Total Kumulatif': period.totalKumulatif,
          Kebutuhan: period.kebutuhan,
          Selisih: period.selisih,
          'Status Kenaikan': period.status,
          Rekomendasi: period.rekomendasi,
          Link_Dokumen: '',
          Last_Update: now,
          'Jenis Kenaikan': period.jenisKenaikan
        };

        if (!AkumulasiCalculator.validateAkumulasiData(newData as AkumulasiData)) {
          toast({
            title: "Error",
            description: `Data periode ${period.periode} tidak valid dan tidak disimpan`,
            variant: "destructive"
          });
          continue;
        }

        const values = [
          newData.No,
          newData.NIP,
          newData.Nama,
          newData.Periode,
          AkumulasiCalculator.formatNumberForSheet(newData['AK Sebelumnya']),
          AkumulasiCalculator.formatNumberForSheet(newData['AK Periode Ini']),
          AkumulasiCalculator.formatNumberForSheet(newData['Total Kumulatif']),
          AkumulasiCalculator.formatNumberForSheet(newData.Kebutuhan),
          AkumulasiCalculator.formatNumberForSheet(newData.Selisih),
          newData['Status Kenaikan'],
          newData.Rekomendasi,
          newData.Link_Dokumen,
          newData.Last_Update,
          newData['Jenis Kenaikan']
        ];

        await api.appendData(values);
      }

      toast({
        title: "Sukses",
        description: `Berhasil generate ${periods.length} periode akumulasi dari data konversi`
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal generate data akumulasi",
        variant: "destructive"
      });
    }
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
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus data",
        variant: "destructive"
      });
    }
  };

  const getFilteredData = () => {
    return akumulasiData.filter(item => 
      (filters.periode === 'all' || item.Periode?.toLowerCase().includes(filters.periode.toLowerCase())) &&
      (filters.status === 'all' || item['Status Kenaikan'] === filters.status)
    );
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Ya': return 'default';
      case 'Dipertimbangkan': return 'secondary';
      case 'Tidak': return 'destructive';
      default: return 'outline';
    }
  };

  const getJenisKenaikanVariant = (jenis: string) => {
    switch (jenis) {
      case 'Pangkat': return 'default';
      case 'Jenjang': return 'secondary';
      case 'Tidak': return 'outline';
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
              <TableHead className="whitespace-nowrap">No</TableHead>
              <TableHead className="whitespace-nowrap">Periode</TableHead>
              <TableHead className="whitespace-nowrap">AK Sebelumnya</TableHead>
              <TableHead className="whitespace-nowrap">AK Periode Ini</TableHead>
              <TableHead className="whitespace-nowrap">Total Kumulatif</TableHead>
              <TableHead className="whitespace-nowrap">Kebutuhan</TableHead>
              <TableHead className="whitespace-nowrap">Selisih</TableHead>
              <TableHead className="whitespace-nowrap">Status Kenaikan</TableHead>
              <TableHead className="whitespace-nowrap">Jenis Kenaikan</TableHead>
              <TableHead className="whitespace-nowrap">Rekomendasi</TableHead>
              <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getFilteredData().map((data: AkumulasiData) => (
              <TableRow key={data.id}>
                <TableCell className="font-medium whitespace-nowrap">{data.No}</TableCell>
                <TableCell className="font-semibold whitespace-nowrap">{data.Periode}</TableCell>
                <TableCell className="whitespace-nowrap">{data['AK Sebelumnya']}</TableCell>
                <TableCell className="text-primary font-semibold whitespace-nowrap">{data['AK Periode Ini']}</TableCell>
                <TableCell className="font-semibold whitespace-nowrap">{data['Total Kumulatif']}</TableCell>
                <TableCell className="whitespace-nowrap">{data.Kebutuhan}</TableCell>
                <TableCell className={`font-semibold whitespace-nowrap ${getSelisihColor(data.Selisih)}`}>
                  {data.Selisih}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant={getStatusVariant(data['Status Kenaikan'])}>
                    {data['Status Kenaikan']}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant={getJenisKenaikanVariant(data['Jenis Kenaikan'] || 'Tidak')}>
                    {data['Jenis Kenaikan'] || 'Tidak'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm max-w-xs" title={data.Rekomendasi}>
                  <div className="line-clamp-2">{data.Rekomendasi}</div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
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
    </div>
  );

  const latestData = getFilteredData().length > 0 ? getFilteredData()[getFilteredData().length - 1] : null;
  const totalKumulatif = latestData ? latestData['Total Kumulatif'] : initialAkKumulatif;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Akumulasi Angka Kredit
          </CardTitle>
          <CardDescription>
            Monitoring akumulasi angka kredit dan status kenaikan pangkat untuk {karyawan.nama} - {karyawan.nip}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-end">
            <div className="flex-1 w-full sm:w-auto">
              <Label htmlFor="filter-periode">Periode</Label>
              <Select 
                value={filters.periode} 
                onValueChange={(value) => setFilters({...filters, periode: value})}
              >
                <SelectTrigger>
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
            
            <div className="flex-1 w-full sm:w-auto">
              <Label htmlFor="filter-status">Status Kenaikan</Label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({...filters, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Ya">Ya</SelectItem>
                  <SelectItem value="Dipertimbangkan">Dipertimbangkan</SelectItem>
                  <SelectItem value="Tidak">Tidak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={loadData} variant="outline" className="w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Baru
            </Button>

            <Button onClick={() => setGenerateModal(true)} variant="secondary" className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              Generate dari Konversi
            </Button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Total Kumulatif Terkini:</strong><br />
                <span className="font-semibold text-primary text-lg">{totalKumulatif.toFixed(3)}</span>
              </div>
              <div>
                <strong>Kebutuhan Golongan {karyawan.golongan}:</strong><br />
                <span className="font-semibold">{AkumulasiCalculator.getKebutuhanAK(karyawan.golongan, karyawan.kategori)}</span>
              </div>
              <div>
                <strong>Status Terkini:</strong><br />
                <Badge variant={latestData ? getStatusVariant(latestData['Status Kenaikan']) : 'outline'}>
                  {latestData ? latestData['Status Kenaikan'] : 'Belum Ada Data'}
                </Badge>
              </div>
              <div>
                <strong>Jumlah Data:</strong><br />
                {getFilteredData().length} periode
              </div>
            </div>
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
                  <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada data akumulasi ditemukan</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
                    <Button onClick={handleAddNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Data Pertama
                    </Button>
                    <Button onClick={() => setGenerateModal(true)} variant="outline">
                      <Save className="h-4 w-4 mr-2" />
                      Generate dari Konversi
                    </Button>
                  </div>
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

      <GenerateAkumulasiModal
        isOpen={generateModal}
        onClose={() => setGenerateModal(false)}
        onGenerate={handleGeneratePeriods}
        karyawan={karyawan}
        initialAkKumulatif={initialAkKumulatif}
        existingAkumulasiData={akumulasiData}
      />
    </div>
  );
};

export default AkumulasiAK;