import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, Filter, FileText, Calendar, User } from 'lucide-react';
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

// ==================== UTILITY FUNCTIONS ====================
class PenetapanCalculator {
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

  // Generate data penetapan dari data konversi (jika diperlukan)
  static generateFromKonversi(
    konversiData: any[], 
    tahun: number, 
    karyawan: Karyawan
  ): { akSemester1: number; akSemester2: number; akTahunan: number } {
    const dataTahun = konversiData.filter(item => item.Tahun === tahun);
    const semester1 = dataTahun.find(item => item.Semester === 1);
    const semester2 = dataTahun.find(item => item.Semester === 2);

    const akSemester1 = semester1 ? semester1['AK Konversi'] : 0;
    const akSemester2 = semester2 ? semester2['AK Konversi'] : 0;
    const akTahunan = this.calculateAKTahunan(akSemester1, akSemester2);

    return { akSemester1, akSemester2, akTahunan };
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
const EditPenetapanModal: React.FC<{
  data: PenetapanData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PenetapanData) => void;
  karyawan: Karyawan;
}> = ({ data, isOpen, onClose, onSave, karyawan }) => {
  const [formData, setFormData] = useState<Partial<PenetapanData>>({});

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    } else {
      setFormData({
        Tahun: new Date().getFullYear(),
        'AK Semester 1': 0,
        'AK Semester 2': 0,
        'AK Tahunan': 0,
        Jabatan: karyawan.jabatan,
        Golongan: karyawan.golongan,
        'Tanggal Penetapan': PenetapanCalculator.formatDate(new Date()),
        Penetap: 'Pejabat Penetap',
        Status: 'Draft'
      });
    }
  }, [data, karyawan]);

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
                placeholder="DD/MM/YYYY"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ak-semester-1">AK Semester 1</Label>
              <Input
                id="ak-semester-1"
                type="number"
                step="0.001"
                min="0"
                value={formData['AK Semester 1'] || 0}
                onChange={(e) => setFormData({...formData, 'AK Semester 1': parseFloat(e.target.value)})}
                required
              />
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

// ==================== MAIN COMPONENT ====================
const PenetapanAK: React.FC<PenetapanAKProps> = ({ karyawan }) => {
  const { toast } = useToast();
  const api = useSpreadsheetAPI();
  
  const [penetapanData, setPenetapanData] = useState<PenetapanData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ tahun: 'all', status: 'all' });
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    data: PenetapanData | null;
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
      setPenetapanData(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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
        updatedData.Last_Update
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
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Informasi Karyawan:</strong><br />
                {karyawan.jabatan} - {karyawan.golongan}
              </div>
              <div>
                <strong>Total AK Tahunan:</strong><br />
                <span className="font-semibold text-primary">{totalAKTahunan.toFixed(3)}</span>
              </div>
              <div>
                <strong>Jumlah Data:</strong><br />
                {getFilteredData().length} penetapan
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
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada data penetapan ditemukan</p>
                  <Button onClick={handleAddNew} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Data Pertama
                  </Button>
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
      />
    </div>
  );
};

export default PenetapanAK;