import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, Filter, FileText, Calendar, User, Save, Database } from 'lucide-react';
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

interface PenetapanData {
  id?: string;
  No?: number;
  NIP: string;
  Nama: string;
  Tahun: number;
  'AK Semester 1': number;
  'AK Semester 2': number;
  'AK Tahunan': number;
  Jabatan: string;
  Golongan: string;
  'Tanggal Penetapan': string;
  Penetap: string;
  Status: 'Draft' | 'Disetujui' | 'Ditolak';
  Link_Dokumen?: string;
  Last_Update: string;
  rowIndex?: number;
}

interface PenetapanAKProps {
  karyawan: Karyawan;
}

// ==================== SPREADSHEET CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "penetapan_ak";
const DATA_SHEET_NAME = "data";

// ==================== UTILITY FUNCTIONS ====================
class PenetapanCalculator {
  static formatDate(date: Date): string {
    const day = date.getDate();
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  // Format angka untuk spreadsheet (menggunakan koma desimal)
  static formatNumberForSheet(num: number): string {
    return num.toString().replace('.', ',');
  }

  // Parse angka dari spreadsheet (mengembalikan number dengan titik desimal)
  static parseNumberFromSheet(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    
    if (typeof value === 'string') {
      const cleanedValue = value.replace(',', '.');
      return parseFloat(cleanedValue) || 0;
    }
    return Number(value) || 0;
  }

  // Hitung AK Tahunan dari AK Semester 1 dan 2
  static calculateAKTahunan(akSemester1: number, akSemester2: number): number {
    return Number((akSemester1 + akSemester2).toFixed(3));
  }

  // Validasi data penetapan
  static validatePenetapanData(data: PenetapanData): boolean {
    return !(
      isNaN(data['AK Semester 1']) ||
      isNaN(data['AK Semester 2']) ||
      isNaN(data['AK Tahunan']) ||
      data['AK Semester 1'] < 0 ||
      data['AK Semester 2'] < 0 ||
      data['AK Tahunan'] < 0
    );
  }

  // ADOPSI DARI KarierKu: Get koefisien berdasarkan jabatan
  static getKoefisien(jabatan: string): number {
    const koefisienMap: { [key: string]: number } = {
      'Ahli Pertama': 12.5,
      'Ahli Muda': 25.0,
      'Ahli Madya': 37.5,
      'Ahli Utama': 50.0,
      'Terampil': 8.0,
      'Mahir': 12.5,
      'Penyelia': 25.0,
      'Fungsional Umum': 5.0
    };
    
    for (const [key, value] of Object.entries(koefisienMap)) {
      if (jabatan.includes(key)) return value;
    }
    
    if (jabatan.includes('Ahli')) return 12.5;
    if (jabatan.includes('Penyelia')) return 25.0;
    if (jabatan.includes('Mahir')) return 12.5;
    if (jabatan.includes('Terampil')) return 8.0;
    
    return 12.5;
  }

  // ADOPSI DARI KarierKu: Hitung AK per semester berdasarkan predikat
  static hitungAKPerSemester(jabatan: string, predikatAsumsi: number = 1.00): number {
    const koefisien = this.getKoefisien(jabatan);
    const akPerTahun = predikatAsumsi * koefisien;
    const akPerSemester = akPerTahun / 2;
    return Number(akPerSemester.toFixed(3));
  }

  // PERBAIKAN: Generate data penetapan dari data konversi dengan logika yang benar
  static generateFromKonversi(
    konversiData: any[], 
    karyawan: Karyawan,
    akKumulatifAwal: number
  ): { 
    tahun: number;
    akSemester1: number; 
    akSemester2: number; 
    akTahunan: number;
    jabatan: string;
    golongan: string;
    tanggalPenetapan: string;
    penetap: string;
    status: 'Draft' | 'Disetujui' | 'Ditolak';
  }[] {
    const years: { [key: number]: { semester1: number; semester2: number } } = {};
    
    console.log('🔍 Memproses data konversi untuk penetapan:', konversiData);
    console.log('💰 AK Kumulatif Awal:', akKumulatifAwal);
    
    // Group by tahun dan semester
    konversiData.forEach(item => {
      const tahun = item.Tahun;
      const semester = item.Semester;
      const akKonversi = item['AK Konversi'] || 0;
      
      if (!years[tahun]) {
        years[tahun] = { semester1: 0, semester2: 0 };
      }
      
      if (semester === 1) {
        years[tahun].semester1 += akKonversi;
        console.log(`📊 Menambahkan AK ${akKonversi} ke Semester 1 ${tahun}`);
      } else if (semester === 2) {
        years[tahun].semester2 += akKonversi;
        console.log(`📊 Menambahkan AK ${akKonversi} ke Semester 2 ${tahun}`);
      }
    });

    const result = [];
    const now = new Date();

    // Urutkan tahun dari yang terkecil
    const sortedYears = Object.keys(years).map(Number).sort((a, b) => a - b);
    
    console.log('📅 Tahun yang diproses (terurut):', sortedYears);

    // LOGIKA BARU: Untuk setiap tahun, AK Semester 1 = AK Kumulatif Awal + AK Konversi Semester 1
    // AK Semester 2 = AK Konversi Semester 2
    // AK Tahunan = AK Semester 1 + AK Semester 2
    for (const tahun of sortedYears) {
      const data = years[tahun];
      
      // AK Semester 1 = AK Kumulatif Awal + AK Konversi Semester 1
      const akSemester1 = akKumulatifAwal + data.semester1;
      const akSemester2 = data.semester2;
      const akTahunan = this.calculateAKTahunan(akSemester1, akSemester2);
      
      console.log(`🎯 Tahun ${tahun}:`, {
        akKumulatifAwal,
        konversiSem1: data.semester1,
        konversiSem2: data.semester2,
        akSemester1,
        akSemester2,
        akTahunan
      });

      result.push({
        tahun,
        akSemester1,
        akSemester2,
        akTahunan,
        jabatan: karyawan.jabatan,
        golongan: karyawan.golongan,
        tanggalPenetapan: this.formatDate(now),
        penetap: 'Pejabat Penetap',
        status: 'Draft' as const
      });

      // Untuk tahun berikutnya, AK Kumulatif Awal = AK Tahunan tahun sebelumnya
      akKumulatifAwal = akTahunan;
    }

    return result;
  }

  // PERBAIKAN: Ambil data karyawan dari sheet "data" dengan pendekatan yang lebih robust
  static async getKaryawanDataFromSheet(nip: string): Promise<{ akKumulatif: number; dataLengkap: any }> {
    try {
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: 'read',
          range: DATA_SHEET_NAME
        }
      });

      if (error) throw error;

      const rows = result.values || [];
      console.log('📋 Data karyawan dari sheet "data":', rows);
      
      if (rows.length <= 1) {
        console.log('❌ Tidak ada data karyawan ditemukan');
        return { akKumulatif: 0, dataLengkap: null };
      }
      
      const headers = rows[0];
      console.log('📝 Headers sheet "data":', headers);
      
      // Cari index kolom NIP dan AK Kumulatif
      const nipIndex = headers.findIndex((header: string) => 
        header.toLowerCase().includes('nip')
      );
      
      // PERBAIKAN: Cari kolom AK Kumulatif dengan berbagai kemungkinan nama
      let akKumulatifIndex = -1;
      const possibleAkNames = ['ak kumulatif', 'akkumulatif', 'ak_kumulatif', 'angka kredit kumulatif'];
      
      for (const possibleName of possibleAkNames) {
        akKumulatifIndex = headers.findIndex((header: string) => 
          header.toLowerCase().includes(possibleName)
        );
        if (akKumulatifIndex >= 0) break;
      }
      
      console.log('🔍 Index kolom:', { nipIndex, akKumulatifIndex });

      if (nipIndex === -1) {
        console.log('❌ Kolom NIP tidak ditemukan');
        return { akKumulatif: 0, dataLengkap: null };
      }

      // Cari data karyawan berdasarkan NIP
      const karyawanRow = rows.slice(1).find((row: any[]) => {
        return row[nipIndex] === nip;
      });

      if (!karyawanRow) {
        console.log(`❌ Data karyawan dengan NIP ${nip} tidak ditemukan`);
        return { akKumulatif: 0, dataLengkap: null };
      }

      // Parse data karyawan
      const karyawanData: any = {};
      headers.forEach((header: string, colIndex: number) => {
        let value = karyawanRow[colIndex];
        
        // Handle number conversion untuk kolom numerik
        if (colIndex === akKumulatifIndex) {
          value = this.parseNumberFromSheet(value);
          console.log(`💰 AK Kumulatif dari sheet: ${karyawanRow[colIndex]} -> ${value}`);
        }
        
        karyawanData[header] = value;
      });

      console.log('✅ Data karyawan ditemukan:', karyawanData);
      
      // Ambil nilai akKumulatif
      let akKumulatif = 0;
      if (akKumulatifIndex >= 0 && akKumulatifIndex < karyawanRow.length) {
        akKumulatif = this.parseNumberFromSheet(karyawanRow[akKumulatifIndex]);
      } else {
        // Fallback: cari dari object karyawanData
        for (const [key, value] of Object.entries(karyawanData)) {
          if (key.toLowerCase().includes('ak') && key.toLowerCase().includes('kumulatif')) {
            akKumulatif = this.parseNumberFromSheet(value);
            break;
          }
        }
      }

      return { 
        akKumulatif, 
        dataLengkap: karyawanData 
      };
    } catch (error) {
      console.error('Error membaca data karyawan:', error);
      return { akKumulatif: 0, dataLengkap: null };
    }
  }
}

// ==================== API FUNCTIONS ====================
const useSpreadsheetAPI = () => {
  const { toast } = useToast();

  const callAPI = async (operation: string, data?: any) => {
    try {
      console.log(`📡 Calling API: ${operation}`, data);
      
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation,
          range: data?.range || SHEET_NAME,
          ...data
        }
      });

      if (error) {
        console.error('❌ API Error:', error);
        throw error;
      }
      
      console.log('✅ API Success:', result);
      return result;
    } catch (error) {
      console.error('❌ API Call Failed:', error);
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
          const nipIndex = headers.findIndex((header: string) => 
            header.toLowerCase().includes('nip')
          );
          return nipIndex >= 0 && row[nipIndex] === nip;
        })
        .map((row: any[], index: number) => {
          const obj: PenetapanData = { 
            id: `${SHEET_NAME}_${index + 2}`,
            rowIndex: index + 2,
            Last_Update: '',
            NIP: '',
            Nama: '',
            Tahun: new Date().getFullYear(),
            'AK Semester 1': 0,
            'AK Semester 2': 0,
            'AK Tahunan': 0,
            Jabatan: '',
            Golongan: '',
            'Tanggal Penetapan': '',
            Penetap: '',
            Status: 'Draft'
          } as PenetapanData;

          headers.forEach((header: string, colIndex: number) => {
            let value = row[colIndex];
            
            // Handle number conversion dengan format yang benar
            if (header === 'Tahun' || header === 'No') {
              value = Number(value) || 0;
            }
            // Handle AK values dengan konversi format desimal
            else if (header === 'AK Semester 1' || header === 'AK Semester 2' || header === 'AK Tahunan') {
              value = PenetapanCalculator.parseNumberFromSheet(value);
            }
            
            // Assign value to object
            (obj as any)[header] = value;
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

  // PERBAIKAN: Fungsi untuk membaca data dari sheet "data" dengan pendekatan yang lebih baik
  const readDataSheet = async (nip?: string) => {
    try {
      const result = await callAPI('read', { range: DATA_SHEET_NAME });
      const rows = result.values || [];
      
      if (rows.length <= 1) return [];
      
      const headers = rows[0];
      console.log('Data sheet headers:', headers);
      
      // Cari index kolom yang diperlukan
      const nipIndex = headers.findIndex((header: string) => 
        header.toLowerCase().includes('nip')
      );
      
      const data = rows.slice(1)
        .filter((row: any[]) => {
          if (!nip) return true;
          return nipIndex >= 0 && row[nipIndex] === nip;
        })
        .map((row: any[], index: number) => {
          const obj: any = {
            id: `${DATA_SHEET_NAME}_${index + 2}`,
            rowIndex: index + 2
          };

          headers.forEach((header: string, colIndex: number) => {
            let value = row[colIndex];
            
            // Handle AK Kumulatif dengan konversi format desimal
            if (header.toLowerCase().includes('ak') && header.toLowerCase().includes('kumulatif')) {
              value = PenetapanCalculator.parseNumberFromSheet(value);
              console.log(`💰 AK Kumulatif dari data sheet: ${row[colIndex]} -> ${value}`);
            }
            
            obj[header] = value;
          });
          
          return obj;
        });
      
      console.log(`Loaded ${data.length} records from ${DATA_SHEET_NAME}`);
      return data;
    } catch (error) {
      console.error('Error reading data sheet:', error);
      return [];
    }
  };

  const appendData = async (values: any[]) => {
    try {
      console.log(`📤 Appending ${Array.isArray(values[0]) ? values.length + ' rows' : '1 row'} to ${SHEET_NAME}`);
      
      // Handle both single row and multiple rows
      const dataToAppend = Array.isArray(values[0]) ? values : [values];
      
      const result = await callAPI('append', { 
        values: dataToAppend,
        range: SHEET_NAME
      });
      
      console.log('✅ Append successful, result:', result);
      return result;
    } catch (error) {
      console.error('❌ Append failed:', error);
      throw error;
    }
  };

  const updateData = async (rowIndex: number, values: any[]) => {
    console.log(`Updating ${SHEET_NAME} row ${rowIndex}:`, values);
    return await callAPI('update', { rowIndex, values: [values] });
  };

  const deleteData = async (rowIndex: number) => {
    console.log(`Deleting ${SHEET_NAME} row ${rowIndex}`);
    return await callAPI('delete', { rowIndex });
  };

  return { readData, readDataSheet, appendData, updateData, deleteData };
};

// ==================== EDIT FORM MODAL ====================
const EditPenetapanModal: React.FC<{
  data: PenetapanData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PenetapanData) => void;
  karyawan: Karyawan;
  initialAkKumulatif: number;
}> = ({ data, isOpen, onClose, onSave, karyawan, initialAkKumulatif }) => {
  const [formData, setFormData] = useState<Partial<PenetapanData>>({});
  const [loadingAkAwal, setLoadingAkAwal] = useState(false);
  const [currentAkKumulatif, setCurrentAkKumulatif] = useState<number>(initialAkKumulatif);

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    } else {
      setFormData({
        Tahun: new Date().getFullYear(),
        'AK Semester 1': initialAkKumulatif || 0,
        'AK Semester 2': 0,
        'AK Tahunan': initialAkKumulatif || 0,
        Jabatan: karyawan.jabatan,
        Golongan: karyawan.golongan,
        'Tanggal Penetapan': PenetapanCalculator.formatDate(new Date()),
        Penetap: 'Pejabat Penetap',
        Status: 'Draft'
      });
    }
    setCurrentAkKumulatif(initialAkKumulatif);
  }, [data, karyawan, initialAkKumulatif]);

  // PERBAIKAN: Fungsi yang lebih robust untuk load AK Kumulatif
  const loadAkKumulatifAwal = async () => {
    setLoadingAkAwal(true);
    try {
      const { akKumulatif, dataLengkap } = await PenetapanCalculator.getKaryawanDataFromSheet(karyawan.nip);
      console.log('💰 AK Kumulatif Awal yang diload:', akKumulatif);
      
      setCurrentAkKumulatif(akKumulatif);
      setFormData(prev => ({
        ...prev,
        'AK Semester 1': akKumulatif
      }));
      
      if (dataLengkap) {
        console.log('📋 Data lengkap karyawan:', dataLengkap);
      }
      
    } catch (error) {
      console.error('Gagal memuat AK Kumulatif awal:', error);
    } finally {
      setLoadingAkAwal(false);
    }
  };

  const calculateAKTahunan = (): number => {
    const akSem1 = formData['AK Semester 1'] || 0;
    const akSem2 = formData['AK Semester 2'] || 0;
    return PenetapanCalculator.calculateAKTahunan(akSem1, akSem2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Tahun) {
      const akTahunan = calculateAKTahunan();
      
      const finalData: PenetapanData = {
        ...data,
        ...formData,
        NIP: karyawan.nip,
        Nama: karyawan.nama,
        'AK Tahunan': akTahunan,
        Last_Update: PenetapanCalculator.formatDate(new Date())
      } as PenetapanData;

      // Validasi sebelum save
      if (!PenetapanCalculator.validatePenetapanData(finalData)) {
        alert('Data tidak valid! Silakan periksa input Anda.');
        return;
      }

      onSave(finalData);
    }
  };

  const akTahunan = calculateAKTahunan();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {data ? 'Edit Data Penetapan AK' : 'Tambah Data Penetapan AK'}
          </DialogTitle>
          <DialogDescription>
            {data ? 'Edit data penetapan angka kredit' : 'Tambahkan data penetapan angka kredit baru'}
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
              <Label htmlFor="tanggal-penetapan">Tanggal Penetapan</Label>
              <Input
                id="tanggal-penetapan"
                type="text"
                value={formData['Tanggal Penetapan'] || ''}
                onChange={(e) => setFormData({...formData, 'Tanggal Penetapan': e.target.value})}
                placeholder="18 November 2025"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor="ak-semester-1">AK Semester 1</Label>
                {!data && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={loadAkKumulatifAwal}
                    disabled={loadingAkAwal}
                    className="h-6 text-xs"
                  >
                    <Database className="h-3 w-3 mr-1" />
                    {loadingAkAwal ? 'Loading...' : 'Ambil dari Data'}
                  </Button>
                )}
              </div>
              <Input
                id="ak-semester-1"
                type="number"
                step="0.001"
                min="0"
                value={formData['AK Semester 1'] || 0}
                onChange={(e) => setFormData({...formData, 'AK Semester 1': parseFloat(e.target.value)})}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nilai awal dari data master: {currentAkKumulatif.toFixed(3)}
                {loadingAkAwal && ' (Memuat...)'}
              </p>
            </div>
            <div>
              <Label htmlFor="ak-semester-2">AK Semester 2</Label>
              <Input
                id="ak-semester-2"
                type="number"
                step="0.001"
                min="0"
                value={formData['AK Semester 2'] || 0}
                onChange={(e) => setFormData({...formData, 'AK Semester 2': parseFloat(e.target.value)})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jabatan">Jabatan</Label>
              <Input
                id="jabatan"
                value={formData.Jabatan || karyawan.jabatan}
                onChange={(e) => setFormData({...formData, Jabatan: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="golongan">Golongan</Label>
              <Input
                id="golongan"
                value={formData.Golongan || karyawan.golongan}
                onChange={(e) => setFormData({...formData, Golongan: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="penetap">Penetap</Label>
              <Input
                id="penetap"
                value={formData.Penetap || ''}
                onChange={(e) => setFormData({...formData, Penetap: e.target.value})}
                placeholder="Nama Pejabat Penetap"
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
                  <SelectItem value="Disetujui">Disetujui</SelectItem>
                  <SelectItem value="Ditolak">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              • AK Semester 1: {formData['AK Semester 1'] || 0}<br />
              • AK Semester 2: {formData['AK Semester 2'] || 0}<br />
              • AK Tahunan: <strong>{akTahunan}</strong><br />
              • Format Tanggal: 18 November 2025<br />
              • NIP: {karyawan.nip}<br />
              • Nama: {karyawan.nama}
            </p>
          </div>

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

// ==================== GENERATE PENETAPAN MODAL ====================
const GeneratePenetapanModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (periods: { 
    tahun: number;
    akSemester1: number; 
    akSemester2: number; 
    akTahunan: number;
    jabatan: string;
    golongan: string;
    tanggalPenetapan: string;
    penetap: string;
    status: 'Draft' | 'Disetujui' | 'Ditolak';
  }[]) => void;
  karyawan: Karyawan;
  initialAkKumulatif: number;
}> = ({ isOpen, onClose, onGenerate, karyawan, initialAkKumulatif }) => {
  const [availablePeriods, setAvailablePeriods] = useState<{ 
    tahun: number;
    akSemester1: number; 
    akSemester2: number; 
    akTahunan: number;
    jabatan: string;
    golongan: string;
    tanggalPenetapan: string;
    penetap: string;
    status: 'Draft' | 'Disetujui' | 'Ditolak';
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [akKumulatifAwal, setAkKumulatifAwal] = useState<number>(initialAkKumulatif);

  useEffect(() => {
    if (isOpen) {
      loadAkKumulatifAwal();
    }
  }, [isOpen]);

  // PERBAIKAN: Fungsi yang sama seperti di modal edit untuk konsistensi
  const loadAkKumulatifAwal = async () => {
    setLoading(true);
    try {
      const { akKumulatif } = await PenetapanCalculator.getKaryawanDataFromSheet(karyawan.nip);
      console.log('💰 AK Kumulatif Awal:', akKumulatif);
      setAkKumulatifAwal(akKumulatif);
      
      // Setelah dapat AK Kumulatif, load data konversi
      await loadKonversiData(akKumulatif);
    } catch (error) {
      console.error('Error loading AK Kumulatif awal:', error);
      setAvailablePeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const loadKonversiData = async (akAwal: number) => {
    try {
      const konversiData = await readKonversiData(karyawan.nip);
      console.log('📊 Data konversi yang diload:', konversiData);

      const generatedPeriods = PenetapanCalculator.generateFromKonversi(konversiData, karyawan, akAwal);
      console.log('🎯 Periods penetapan yang digenerate:', generatedPeriods);
      setAvailablePeriods(generatedPeriods);
    } catch (error) {
      console.error('Error loading konversi data:', error);
      setAvailablePeriods([]);
    }
  };

  // Fungsi khusus untuk membaca data konversi
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
      console.log('📋 Raw data dari spreadsheet konversi_predikat:', rows);
      
      if (rows.length <= 1) {
        console.log('❌ Tidak ada data konversi');
        return [];
      }
      
      const headers = rows[0];
      console.log('📝 Headers konversi_predikat:', headers);
      
      const data = rows.slice(1)
        .filter((row: any[]) => {
          if (!nip) return true;
          const nipIndex = headers.findIndex((header: string) => 
            header.toLowerCase().includes('nip')
          );
          const rowNIP = nipIndex >= 0 ? row[nipIndex] : null;
          console.log('🔍 Filtering NIP:', { mencari: nip, ditemukan: rowNIP, match: rowNIP === nip });
          return rowNIP === nip;
        })
        .map((row: any[], index: number) => {
          const obj: any = {
            id: `konversi_${index + 2}`,
            rowIndex: index + 2
          };

          headers.forEach((header: string, colIndex: number) => {
            let value = row[colIndex];
            
            // Handle number conversion dengan format yang benar
            if (header === 'Tahun' || header === 'Semester' || header === 'No') {
              value = Number(value) || 0;
            }
            // Handle AK Konversi dengan konversi format desimal
            else if (header === 'AK Konversi') {
              value = PenetapanCalculator.parseNumberFromSheet(value);
              console.log(`💰 AK Konversi: ${row[colIndex]} -> ${value}`);
            }
            // Handle Nilai SKP
            else if (header === 'Nilai SKP') {
              value = Number(value) || 0;
            }
            
            obj[header] = value;
          });
          
          console.log(`📄 Row ${index + 2}:`, obj);
          return obj;
        });
      
      console.log(`✅ Loaded ${data.length} records from konversi_predikat for NIP ${nip}`);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generate Data Penetapan dari Konversi Predikat</DialogTitle>
          <DialogDescription>
            Membuat data penetapan angka kredit dari data konversi predikat yang sudah ada untuk {karyawan.nama}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-700">
                  <strong>NIP:</strong> {karyawan.nip}<br />
                  <strong>Jabatan:</strong> {karyawan.jabatan}<br />
                  <strong>Golongan:</strong> {karyawan.golongan}<br />
                  <strong>AK Kumulatif Awal:</strong> {akKumulatifAwal.toFixed(3)}
                </p>
              </div>
              <Button onClick={loadAkKumulatifAwal} variant="outline" disabled={loading}>
                {loading ? 'Memuat...' : 'Refresh Data'}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Memuat data konversi predikat dan AK kumulatif...</p>
            </div>
          ) : availablePeriods.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <div className="mb-4 p-2 bg-green-50 rounded">
                <p className="text-sm text-green-700">
                  ✅ Ditemukan {availablePeriods.length} tahun dari data konversi<br />
                  📊 AK Kumulatif Awal: {akKumulatifAwal.toFixed(3)}
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>AK Semester 1</TableHead>
                    <TableHead>AK Semester 2</TableHead>
                    <TableHead>AK Tahunan</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Golongan</TableHead>
                    <TableHead>Tanggal Penetapan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availablePeriods.map((period, index) => (
                    <TableRow key={period.tahun}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-semibold">{period.tahun}</TableCell>
                      <TableCell className="font-semibold">{period.akSemester1.toFixed(3)}</TableCell>
                      <TableCell className="font-semibold">{period.akSemester2.toFixed(3)}</TableCell>
                      <TableCell className="font-semibold text-primary">{period.akTahunan.toFixed(3)}</TableCell>
                      <TableCell className="text-sm">{period.jabatan}</TableCell>
                      <TableCell>{period.golongan}</TableCell>
                      <TableCell className="text-sm">{period.tanggalPenetapan}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{period.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada data konversi predikat yang ditemukan untuk NIP {karyawan.nip}</p>
              <p className="text-sm mt-2">Pastikan data konversi predikat sudah diisi terlebih dahulu</p>
              <Button onClick={loadAkKumulatifAwal} variant="outline" className="mt-2">
                Coba Muat Ulang Data
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleGenerate} disabled={availablePeriods.length === 0 || loading}>
              Generate {availablePeriods.length} Tahun
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== MAIN COMPONENT ====================
const PenetapanAK: React.FC<PenetapanAKProps> = ({ karyawan }) => {
  const { toast } = useToast();
  const api = useSpreadsheetAPI();
  
  const [penetapanData, setPenetapanData] = useState<PenetapanData[]>([]);
  const [initialAkKumulatif, setInitialAkKumulatif] = useState<number>(karyawan.akKumulatif || 0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ tahun: 'all', status: 'all' });
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    data: PenetapanData | null;
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
      setPenetapanData(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // PERBAIKAN: Load initial AK Kumulatif dari sheet "data" dengan pendekatan yang lebih baik
  const loadInitialAkKumulatif = async () => {
    try {
      const { akKumulatif } = await PenetapanCalculator.getKaryawanDataFromSheet(karyawan.nip);
      console.log('✅ Loaded initial AK Kumulatif from data sheet:', akKumulatif);
      setInitialAkKumulatif(akKumulatif);
    } catch (error) {
      console.error('Error loading initial AK kumulatif:', error);
      // Fallback to karyawan.akKumulatif if data sheet reading fails
      setInitialAkKumulatif(karyawan.akKumulatif || 0);
    }
  };

  const handleEdit = (data: PenetapanData) => {
    setEditModal({
      isOpen: true,
      data: data
    });
  };

  const handleSave = async (updatedData: PenetapanData) => {
    try {
      const nextNo = penetapanData.length > 0 ? Math.max(...penetapanData.map(d => d.No || 0)) + 1 : 1;
      
      // Format values untuk spreadsheet dengan format desimal yang benar
      const values = [
        updatedData.No || nextNo,
        updatedData.NIP,
        updatedData.Nama,
        updatedData.Tahun,
        PenetapanCalculator.formatNumberForSheet(updatedData['AK Semester 1']),
        PenetapanCalculator.formatNumberForSheet(updatedData['AK Semester 2']),
        PenetapanCalculator.formatNumberForSheet(updatedData['AK Tahunan']),
        updatedData.Jabatan,
        updatedData.Golongan,
        updatedData['Tanggal Penetapan'],
        updatedData.Penetap,
        updatedData.Status,
        updatedData.Link_Dokumen || '',
        PenetapanCalculator.formatDate(new Date())
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
    tahun: number;
    akSemester1: number; 
    akSemester2: number; 
    akTahunan: number;
    jabatan: string;
    golongan: string;
    tanggalPenetapan: string;
    penetap: string;
    status: 'Draft' | 'Disetujui' | 'Ditolak';
  }[]) => {
    try {
      const now = PenetapanCalculator.formatDate(new Date());
      
      // Cari nomor terakhir yang ada
      const existingNos = penetapanData.map(d => d.No || 0);
      const nextNo = existingNos.length > 0 ? Math.max(...existingNos) + 1 : 1;
      
      console.log('🚀 Memulai proses generate data penetapan:', periods.length, 'tahun');
      
      let successCount = 0;
      let errorCount = 0;

      // Siapkan semua data dalam satu batch
      const allValues = periods.map((period, index) => {
        const newData = {
          No: nextNo + index,
          NIP: karyawan.nip,
          Nama: karyawan.nama,
          Tahun: period.tahun,
          'AK Semester 1': period.akSemester1,
          'AK Semester 2': period.akSemester2,
          'AK Tahunan': period.akTahunan,
          Jabatan: period.jabatan,
          Golongan: period.golongan,
          'Tanggal Penetapan': period.tanggalPenetapan,
          Penetap: period.penetap,
          Status: period.status,
          Link_Dokumen: '',
          Last_Update: now
        };

        // Validasi sebelum save
        if (!PenetapanCalculator.validatePenetapanData(newData as PenetapanData)) {
          console.error(`❌ Data tahun ${period.tahun} tidak valid`);
          errorCount++;
          return null;
        }

        // Format values untuk spreadsheet
        return [
          newData.No,
          newData.NIP,
          newData.Nama,
          newData.Tahun,
          PenetapanCalculator.formatNumberForSheet(newData['AK Semester 1']),
          PenetapanCalculator.formatNumberForSheet(newData['AK Semester 2']),
          PenetapanCalculator.formatNumberForSheet(newData['AK Tahunan']),
          newData.Jabatan,
          newData.Golongan,
          newData['Tanggal Penetapan'],
          newData.Penetap,
          newData.Status,
          newData.Link_Dokumen,
          newData.Last_Update
        ];
      }).filter(Boolean); // Hapus null values

      console.log('📦 Data batch yang akan disimpan:', allValues);

      if (allValues.length === 0) {
        toast({
          title: "Error",
          description: "Tidak ada data yang valid untuk disimpan",
          variant: "destructive"
        });
        return;
      }

      // Append semua data sekaligus
      await api.appendData(allValues);
      successCount = allValues.length;
      
      console.log(`📊 Hasil generate: ${successCount} berhasil, ${errorCount} gagal`);

      if (successCount > 0) {
        toast({
          title: "Sukses",
          description: `Berhasil generate ${successCount} tahun penetapan dari data konversi`
        });
        
        // Reload data setelah semua berhasil disimpan
        await loadData();
      }

    } catch (error) {
      console.error('Error dalam handleGeneratePeriods:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat generate data penetapan",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (rowData: PenetapanData) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data penetapan AK ini?')) return;
    
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
    return penetapanData.filter(item => 
      (filters.tahun === 'all' || item.Tahun?.toString() === filters.tahun) &&
      (filters.status === 'all' || item.Status === filters.status)
    );
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Disetujui': return 'default';
      case 'Draft': return 'secondary';
      case 'Ditolak': return 'destructive';
      default: return 'outline';
    }
  };

  const renderPenetapanTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No</TableHead>
          <TableHead>Tahun</TableHead>
          <TableHead>AK Semester 1</TableHead>
          <TableHead>AK Semester 2</TableHead>
          <TableHead>AK Tahunan</TableHead>
          <TableHead>Jabatan</TableHead>
          <TableHead>Golongan</TableHead>
          <TableHead>Tanggal Penetapan</TableHead>
          <TableHead>Penetap</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {getFilteredData().map((data: PenetapanData) => (
          <TableRow key={data.id}>
            <TableCell className="font-medium">{data.No}</TableCell>
            <TableCell>{data.Tahun}</TableCell>
            <TableCell className="font-semibold">{data['AK Semester 1']}</TableCell>
            <TableCell className="font-semibold">{data['AK Semester 2']}</TableCell>
            <TableCell className="font-semibold text-primary">{data['AK Tahunan']}</TableCell>
            <TableCell className="text-sm">{data.Jabatan}</TableCell>
            <TableCell>{data.Golongan}</TableCell>
            <TableCell className="text-sm">{data['Tanggal Penetapan']}</TableCell>
            <TableCell className="text-sm">{data.Penetap}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(data.Status)}>
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

  const totalAKTahunan = getFilteredData().reduce((sum, item) => sum + (item['AK Tahunan'] || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Penetapan Angka Kredit
          </CardTitle>
          <CardDescription>
            Kelola data penetapan angka kredit untuk {karyawan.nama} - {karyawan.nip}
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
              <Label htmlFor="filter-status">Status</Label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({...filters, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Disetujui">Disetujui</SelectItem>
                  <SelectItem value="Ditolak">Ditolak</SelectItem>
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
              Generate dari Konversi
            </Button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Informasi Karyawan:</strong><br />
                {karyawan.jabatan} - {karyawan.golongan}
              </div>
              <div>
                <strong>Kategori:</strong><br />
                <span className="font-semibold">{karyawan.kategori}</span>
              </div>
              <div>
                <strong>Jumlah Data:</strong><br />
                {getFilteredData().length} penetapan
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              <strong>AK Kumulatif Awal:</strong> {initialAkKumulatif.toFixed(3)}
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
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada data penetapan ditemukan</p>
                  <div className="flex gap-2 justify-center mt-2">
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
                renderPenetapanTable()
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <EditPenetapanModal
        data={editModal.data}
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, data: null })}
        onSave={handleSave}
        karyawan={karyawan}
        initialAkKumulatif={initialAkKumulatif}
      />

      <GeneratePenetapanModal
        isOpen={generateModal}
        onClose={() => setGenerateModal(false)}
        onGenerate={handleGeneratePeriods}
        karyawan={karyawan}
        initialAkKumulatif={initialAkKumulatif}
      />
    </div>
  );
};

export default PenetapanAK;