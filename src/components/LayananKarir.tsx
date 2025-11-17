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
}

interface LayananKarirProps {
  karyawan: Karyawan;
}

// ==================== SPREADSHEET CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "konversi_predikat";

// ==================== UTILITY FUNCTIONS ====================
class LayananKarirCalculator {
  static calculateAKFromPredikat(predikat: string, nilaiSKP: number): number {
    const baseAK = {
      'Sangat Baik': 1.50,
      'Baik': 1.00,
      'Cukup': 0.75,
      'Kurang': 0.50
    }[predikat] || 1.00;

    let akKonversi = baseAK * 12.5;
    
    if (nilaiSKP >= 90) akKonversi *= 1.2;
    else if (nilaiSKP >= 80) akKonversi *= 1.1;
    else if (nilaiSKP >= 70) akKonversi *= 1.0;
    else if (nilaiSKP >= 60) akKonversi *= 0.9;
    else akKonversi *= 0.8;

    return Number(akKonversi.toFixed(2));
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

  static parseTMT(tmt: string): Date {
    console.log('Parsing TMT:', tmt);
    
    // Coba format MM/DD/YYYY (dari contoh: 10/27/2023, 4/11/2023)
    const parts1 = tmt.split('/');
    if (parts1.length === 3) {
      const month = parseInt(parts1[0]);
      const day = parseInt(parts1[1]);
      const year = parseInt(parts1[2]);
      
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          console.log('Successfully parsed as MM/DD/YYYY:', date);
          return date;
        }
      }
    }
    
    // Coba format DD/MM/YYYY
    const parts2 = tmt.split('/');
    if (parts2.length === 3) {
      const day = parseInt(parts2[0]);
      const month = parseInt(parts2[1]);
      const year = parseInt(parts2[2]);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          console.log('Successfully parsed as DD/MM/YYYY:', date);
          return date;
        }
      }
    }
    
    // Fallback: coba parse sebagai Date object biasa
    const fallbackDate = new Date(tmt);
    if (!isNaN(fallbackDate.getTime())) {
      console.log('Successfully parsed as fallback:', fallbackDate);
      return fallbackDate;
    }
    
    // Final fallback: current date
    console.log('Using current date as fallback');
    return new Date();
  }

  static generateSemesterFromTMT(tmtJabatan: string): { tahun: number; semester: 1 | 2 }[] {
    const startDate = this.parseTMT(tmtJabatan);
    const now = new Date();
    const semesters: { tahun: number; semester: 1 | 2 }[] = [];
    
    console.log('Start Date:', startDate);
    console.log('Now:', now);
    
    // Tentukan semester awal berdasarkan bulan TMT Jabatan
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1; // January = 1
    
    let currentSemester: 1 | 2 = startMonth <= 6 ? 1 : 2;
    let currentYear = startYear;
    
    console.log(`Start: Year ${startYear}, Month ${startMonth}, Semester ${currentSemester}`);
    
    // Mulai dari semester ketika TMT Jabatan
    semesters.push({ tahun: currentYear, semester: currentSemester });
    
    // Generate semester berikutnya sampai sekarang
    while (true) {
      // Pindah ke semester berikutnya
      if (currentSemester === 1) {
        currentSemester = 2;
      } else {
        currentSemester = 1;
        currentYear++;
      }
      
      // Cek apakah semester ini sudah lewat
      const semesterEnd = currentSemester === 1 ? 
        new Date(currentYear, 5, 30) : // End of semester 1: June 30
        new Date(currentYear, 11, 31); // End of semester 2: December 31
      
      console.log(`Checking semester ${currentSemester} ${currentYear}, ends: ${semesterEnd}`);
      
      // Jika semester berakhir setelah sekarang, stop
      if (semesterEnd > now) {
        console.log('Semester is in future, stopping');
        break;
      }
      
      semesters.push({ tahun: currentYear, semester: currentSemester });
      
      // Safety break
      if (semesters.length > 20) {
        console.log('Safety break reached');
        break;
      }
    }
    
    console.log('Generated semesters:', semesters);
    return semesters;
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
    const result = await callAPI('read');
    const rows = result.values || [];
    
    if (rows.length <= 1) return [];
    
    const headers = rows[0];
    const data = rows.slice(1)
      .filter((row: any[]) => !nip || row[headers.indexOf('NIP')] === nip)
      .map((row: any[], index: number) => {
        const obj: KonversiData = { 
          id: `${SHEET_NAME}_${index + 2}`,
          rowIndex: index + 2,
          Last_Update: ''
        } as KonversiData;

        headers.forEach((header: string, colIndex: number) => {
          let value = row[colIndex];
          if (header === 'Tahun' || header === 'Semester' || header === 'Nilai SKP' || header === 'AK Konversi' || header === 'No') {
            value = Number(value) || 0;
          }
          (obj as any)[header] = value;
        });
        
        if (!obj.No || obj.No === 0) {
          obj.No = index + 1;
        }
        
        return obj;
      });
    
    console.log(`Loaded ${data.length} records from ${SHEET_NAME}`);
    return data;
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
}> = ({ data, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<KonversiData>>({});

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    } else {
      setFormData({});
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Tahun && formData.Semester && formData.Predikat && formData['Nilai SKP']) {
      const akKonversi = LayananKarirCalculator.calculateAKFromPredikat(
        formData.Predikat, 
        formData['Nilai SKP']
      );
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
        Last_Update: LayananKarirCalculator.formatDate(new Date())
      } as KonversiData;

      onSave(finalData);
    }
  };

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

          {formData.Tahun && formData.Semester && formData.Predikat && formData['Nilai SKP'] && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Preview Auto-calculate:</strong><br />
                • AK Konversi: {LayananKarirCalculator.calculateAKFromPredikat(formData.Predikat, formData['Nilai SKP'])}<br />
                • Periode: {LayananKarirCalculator.calculatePeriodeSemester(formData.Tahun, formData.Semester).mulai} - {LayananKarirCalculator.calculatePeriodeSemester(formData.Tahun, formData.Semester).selesai}
              </p>
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
  onGenerate: (semesters: { tahun: number; semester: 1 | 2 }[]) => void;
  tmtJabatan: string;
}> = ({ isOpen, onClose, onGenerate, tmtJabatan }) => {
  const [availableSemesters, setAvailableSemesters] = useState<{ tahun: number; semester: 1 | 2 }[]>([]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Data Semester dari TMT Jabatan</DialogTitle>
          <DialogDescription>
            Membuat data konversi untuk semua semester sejak TMT Jabatan: {tmtJabatan}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>TMT Jabatan:</strong> {tmtJabatan}<br />
              <strong>Jumlah Semester:</strong> {availableSemesters.length}
            </p>
          </div>

          {availableSemesters.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Periode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableSemesters.map((semester, index) => {
                    const periode = LayananKarirCalculator.calculatePeriodeSemester(semester.tahun, semester.semester);
                    return (
                      <TableRow key={`${semester.tahun}-${semester.semester}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{semester.tahun}</TableCell>
                        <TableCell>Semester {semester.semester}</TableCell>
                        <TableCell className="text-sm">{periode.mulai} - {periode.selesai}</TableCell>
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
      
      const values = [
        updatedData.No || nextNo,
        updatedData.NIP,
        updatedData.Nama,
        updatedData.Tahun,
        updatedData.Semester,
        updatedData.Predikat,
        updatedData['Nilai SKP'],
        updatedData['AK Konversi'],
        updatedData['TMT Mulai'],
        updatedData['TMT Selesai'],
        updatedData.Status,
        updatedData.Catatan || '',
        updatedData.Link_Dokumen || '',
        updatedData.Last_Update
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
    const semester = 1;
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
      'AK Konversi': LayananKarirCalculator.calculateAKFromPredikat('Baik', 95),
      'TMT Mulai': periode.mulai,
      'TMT Selesai': periode.selesai,
      Status: 'Draft' as const,
      Catatan: '',
      Last_Update: now
    };

    try {
      const values = [
        newData.No,
        newData.NIP,
        newData.Nama,
        newData.Tahun,
        newData.Semester,
        newData.Predikat,
        newData['Nilai SKP'],
        newData['AK Konversi'],
        newData['TMT Mulai'],
        newData['TMT Selesai'],
        newData.Status,
        newData.Catatan,
        '', // Link_Dokumen
        newData.Last_Update
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

  const handleGenerateSemesters = async (semesters: { tahun: number; semester: 1 | 2 }[]) => {
    try {
      const now = LayananKarirCalculator.formatDate(new Date());
      const nextNo = konversiData.length > 0 ? Math.max(...konversiData.map(d => d.No || 0)) + 1 : 1;
      
      const newData = semesters.map((semester, index) => {
        const periode = LayananKarirCalculator.calculatePeriodeSemester(semester.tahun, semester.semester);
        return {
          No: nextNo + index,
          NIP: karyawan.nip,
          Nama: karyawan.nama,
          Tahun: semester.tahun,
          Semester: semester.semester,
          Predikat: 'Baik' as const,
          'Nilai SKP': 95,
          'AK Konversi': LayananKarirCalculator.calculateAKFromPredikat('Baik', 95),
          'TMT Mulai': periode.mulai,
          'TMT Selesai': periode.selesai,
          Status: 'Draft' as const,
          Catatan: `Auto-generated from TMT Jabatan ${karyawan.tmtJabatan}`,
          Last_Update: now
        };
      });

      for (const data of newData) {
        const values = [
          data.No,
          data.NIP,
          data.Nama,
          data.Tahun,
          data.Semester,
          data.Predikat,
          data['Nilai SKP'],
          data['AK Konversi'],
          data['TMT Mulai'],
          data['TMT Selesai'],
          data.Status,
          data.Catatan,
          '', // Link_Dokumen
          data.Last_Update
        ];
        await api.appendData(values);
      }

      toast({
        title: "Sukses",
        description: `Berhasil generate ${semesters.length} semester dari TMT Jabatan`
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

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Konversi Predikat Kinerja
          </CardTitle>
          <CardDescription>
            Kelola data konversi predikat menjadi angka kredit untuk {karyawan.nama}
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
                  {[2023, 2024, 2025].map(year => (
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
      />

      <GenerateSemesterModal
        isOpen={generateModal}
        onClose={() => setGenerateModal(false)}
        onGenerate={handleGenerateSemesters}
        tmtJabatan={karyawan.tmtJabatan}
      />
    </div>
  );
};

export default LayananKarir;