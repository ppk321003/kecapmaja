import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Edit, Trash2, RefreshCw, Plus, Calendar, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  Status: 'Draft' | 'Generated';
  Link_Dokumen?: string;
  Last_Update: string;
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
  'Status Kenaikan': string;
  Rekomendasi: string;
  Link_Dokumen?: string;
  Last_Update: string;
}

interface LayananKarirProps {
  karyawan: Karyawan;
}

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

  static calculateAKTahunan(akS1: number, akS2: number): number {
    return Number((akS1 + akS2).toFixed(2));
  }

  static getKebutuhanAK(golongan: string, jabatan: string): number {
    const kebutuhan: { [key: string]: number } = {
      'III/a': 50, 'III/b': 50, 'III/c': 100, 'III/d': 100,
      'IV/a': 150, 'IV/b': 150, 'IV/c': 150, 'IV/d': 200
    };
    return kebutuhan[golongan] || 100;
  }

  static getStatusKenaikan(totalAK: number, kebutuhanAK: number): string {
    if (totalAK >= kebutuhanAK) return 'Bisa Usul';
    if (totalAK >= kebutuhanAK * 0.8) return 'Hampir Cukup';
    if (totalAK >= kebutuhanAK * 0.6) return 'Sedang';
    return 'Belum Cukup';
  }

  static getRekomendasi(status: string): string {
    const rekomendasi: { [key: string]: string } = {
      'Bisa Usul': 'Segera ajukan usulan kenaikan',
      'Hampir Cukup': 'Tingkatkan kinerja semester depan',
      'Sedang': 'Perlu peningkatan signifikan',
      'Belum Cukup': 'Butuh evaluasi menyeluruh'
    };
    return rekomendasi[status] || 'Perlu evaluasi';
  }

  static formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

// ==================== MOCK DATA ====================
const mockKonversiData: KonversiData[] = [
  {
    id: '1',
    No: 1,
    NIP: '123456',
    Nama: 'John Doe',
    Tahun: 2024,
    Semester: 1,
    Predikat: 'Baik',
    'Nilai SKP': 85,
    'AK Konversi': 12.5,
    'TMT Mulai': '01/01/2024',
    'TMT Selesai': '30/06/2024',
    Status: 'Draft',
    Catatan: 'Test data',
    Last_Update: '01/01/2024'
  }
];

const mockPenetapanData: PenetapanData[] = [
  {
    id: '1',
    No: 1,
    NIP: '123456',
    Nama: 'John Doe',
    Tahun: 2024,
    'AK Semester 1': 12.5,
    'AK Semester 2': 13.0,
    'AK Tahunan': 25.5,
    Jabatan: 'Analis SDM',
    Golongan: 'III/c',
    'Tanggal Penetapan': '01/07/2024',
    Penetap: 'Kepala BKD',
    Status: 'Generated',
    Last_Update: '01/07/2024'
  }
];

const mockAkumulasiData: AkumulasiData[] = [
  {
    id: '1',
    No: 1,
    NIP: '123456',
    Nama: 'John Doe',
    Periode: '2024',
    'AK Sebelumnya': 50,
    'AK Periode Ini': 25.5,
    'Total Kumulatif': 75.5,
    Kebutuhan: 100,
    Selisih: -24.5,
    'Status Kenaikan': 'Sedang',
    Rekomendasi: 'Perlu peningkatan signifikan',
    Last_Update: '01/01/2025'
  }
];

// ==================== API FUNCTIONS ====================
const useSpreadsheetAPI = () => {
  const { toast } = useToast();

  // Mock API untuk development
  const readData = async (sheetName: string, nip?: string): Promise<any[]> => {
    console.log(`Reading data from ${sheetName} for NIP: ${nip}`);
    
    // Simulasi loading
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock data berdasarkan sheetName
    switch (sheetName) {
      case 'konversi_predikat':
        return mockKonversiData.filter(item => !nip || item.NIP === nip);
      case 'penetapan_ak':
        return mockPenetapanData.filter(item => !nip || item.NIP === nip);
      case 'akumulasi_ak':
        return mockAkumulasiData.filter(item => !nip || item.NIP === nip);
      default:
        return [];
    }
  };

  const appendData = async (sheetName: string, values: any[]): Promise<any> => {
    console.log(`Appending data to ${sheetName}:`, values);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  };

  const updateData = async (sheetName: string, rowIndex: number, values: any[]): Promise<any> => {
    console.log(`Updating data in ${sheetName} at row ${rowIndex}:`, values);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  };

  const deleteData = async (sheetName: string, rowIndex: number): Promise<any> => {
    console.log(`Deleting data from ${sheetName} at row ${rowIndex}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  };

  return { readData, appendData, updateData, deleteData };
};

// ==================== MAIN COMPONENT ====================
const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const { toast } = useToast();
  const api = useSpreadsheetAPI();
  
  // States
  const [activeSection, setActiveSection] = useState<'konversi' | 'penetapan' | 'akumulasi'>('konversi');
  const [konversiData, setKonversiData] = useState<KonversiData[]>([]);
  const [penetapanData, setPenetapanData] = useState<PenetapanData[]>([]);
  const [akumulasiData, setAkumulasiData] = useState<AkumulasiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [filters, setFilters] = useState({ tahun: 'all', semester: 'all' });

  // Load data on mount and when section changes
  useEffect(() => {
    loadData();
  }, [activeSection]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeSection) {
        case 'konversi':
          const konversi = await api.readData('konversi_predikat', karyawan.nip);
          setKonversiData(konversi);
          break;
        case 'penetapan':
          const penetapan = await api.readData('penetapan_ak', karyawan.nip);
          setPenetapanData(penetapan);
          break;
        case 'akumulasi':
          const akumulasi = await api.readData('akumulasi_ak', karyawan.nip);
          setAkumulasiData(akumulasi);
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on current filters
  const getFilteredData = () => {
    let data: any[] = [];
    
    switch (activeSection) {
      case 'konversi':
        data = konversiData.filter(item => 
          (filters.tahun === 'all' || item.Tahun.toString() === filters.tahun) &&
          (filters.semester === 'all' || item.Semester.toString() === filters.semester)
        );
        break;
      case 'penetapan':
        data = penetapanData.filter(item => 
          filters.tahun === 'all' || item.Tahun.toString() === filters.tahun
        );
        break;
      case 'akumulasi':
        data = akumulasiData;
        break;
    }
    
    return data;
  };

  const handleAddNew = () => {
    setEditingData(null);
    setShowModal(true);
  };

  const handleEdit = (data: any) => {
    setEditingData(data);
    setShowModal(true);
  };

  const handleDelete = async (data: any) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    
    try {
      await api.deleteData(getSheetName(), data.id);
      toast({
        title: "Sukses",
        description: "Data berhasil dihapus"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus data",
        variant: "destructive"
      });
    }
  };

  const handleRegenerate = async (data: any) => {
    try {
      let updatedData = { ...data };
      
      if (activeSection === 'konversi') {
        updatedData['AK Konversi'] = LayananKarirCalculator.calculateAKFromPredikat(
          data.Predikat, 
          data['Nilai SKP']
        );
        updatedData.Last_Update = LayananKarirCalculator.formatDate(new Date());
        
        const values = Object.values(updatedData).slice(1);
        await api.updateData('konversi_predikat', data.id, [values]);
      }
      
      toast({
        title: "Sukses",
        description: "Data berhasil di-regenerate"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal regenerate data",
        variant: "destructive"
      });
    }
  };

  const getSheetName = (): string => {
    switch (activeSection) {
      case 'konversi': return 'konversi_predikat';
      case 'penetapan': return 'penetapan_ak';
      case 'akumulasi': return 'akumulasi_ak';
      default: return '';
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const now = LayananKarirCalculator.formatDate(new Date());
      
      if (activeSection === 'konversi') {
        const periode = LayananKarirCalculator.calculatePeriodeSemester(
          formData.Tahun, 
          formData.Semester
        );
        
        const newData: KonversiData = {
          NIP: karyawan.nip,
          Nama: karyawan.nama,
          Tahun: formData.Tahun,
          Semester: formData.Semester,
          Predikat: formData.Predikat,
          'Nilai SKP': formData['Nilai SKP'],
          'AK Konversi': LayananKarirCalculator.calculateAKFromPredikat(
            formData.Predikat, 
            formData['Nilai SKP']
          ),
          'TMT Mulai': periode.mulai,
          'TMT Selesai': periode.selesai,
          Status: 'Draft',
          Catatan: formData.Catatan || '',
          Last_Update: now
        };

        const values = Object.values(newData);
        
        if (editingData) {
          await api.updateData('konversi_predikat', editingData.id, [values]);
        } else {
          await api.appendData('konversi_predikat', [values]);
        }
      }
      
      setShowModal(false);
      toast({
        title: "Sukses",
        description: `Data berhasil ${editingData ? 'diupdate' : 'ditambahkan'}`
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data",
        variant: "destructive"
      });
    }
  };

  // Render Tables based on active section
  const renderKonversiTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
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
                <Button variant="ghost" size="sm" onClick={() => handleEdit(data)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(data)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleRegenerate(data)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(data)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderPenetapanTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tahun</TableHead>
          <TableHead>AK Semester 1</TableHead>
          <TableHead>AK Semester 2</TableHead>
          <TableHead>AK Tahunan</TableHead>
          <TableHead>Jabatan</TableHead>
          <TableHead>Golongan</TableHead>
          <TableHead>Tanggal Penetapan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {getFilteredData().map((data: PenetapanData) => (
          <TableRow key={data.id}>
            <TableCell>{data.Tahun}</TableCell>
            <TableCell>{data['AK Semester 1']}</TableCell>
            <TableCell>{data['AK Semester 2']}</TableCell>
            <TableCell className="font-semibold">{data['AK Tahunan']}</TableCell>
            <TableCell>{data.Jabatan}</TableCell>
            <TableCell>{data.Golongan}</TableCell>
            <TableCell>{data['Tanggal Penetapan']}</TableCell>
            <TableCell>
              <Badge variant={data.Status === 'Generated' ? 'default' : 'secondary'}>
                {data.Status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(data)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(data)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleRegenerate(data)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(data)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderAkumulasiTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Periode</TableHead>
          <TableHead>AK Sebelumnya</TableHead>
          <TableHead>AK Periode Ini</TableHead>
          <TableHead>Total Kumulatif</TableHead>
          <TableHead>Kebutuhan</TableHead>
          <TableHead>Selisih</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Rekomendasi</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {getFilteredData().map((data: AkumulasiData) => (
          <TableRow key={data.id}>
            <TableCell>{data.Periode}</TableCell>
            <TableCell>{data['AK Sebelumnya']}</TableCell>
            <TableCell>{data['AK Periode Ini']}</TableCell>
            <TableCell className="font-semibold">{data['Total Kumulatif']}</TableCell>
            <TableCell>{data.Kebutuhan}</TableCell>
            <TableCell className={
              data.Selisih >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
            }>
              {data.Selisih}
            </TableCell>
            <TableCell>
              <Badge variant={
                data['Status Kenaikan'] === 'Bisa Usul' ? 'default' :
                data['Status Kenaikan'] === 'Hampir Cukup' ? 'secondary' :
                data['Status Kenaikan'] === 'Sedang' ? 'outline' : 'destructive'
              }>
                {data['Status Kenaikan']}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">{data.Rekomendasi}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(data)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(data)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleRegenerate(data)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(data)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // Form Modal Component
  const FormModal = () => {
    const [formData, setFormData] = useState<any>(() => {
      if (editingData) return { ...editingData };
      
      return {
        Tahun: new Date().getFullYear(),
        Semester: 1,
        Predikat: 'Baik',
        'Nilai SKP': 80,
        Catatan: ''
      };
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSave(formData);
    };

    return (
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingData ? 'Edit Data' : 'Tambah Data Baru'} - {
                activeSection === 'konversi' ? 'Konversi Predikat' :
                activeSection === 'penetapan' ? 'Penetapan AK' : 'Akumulasi AK'
              }
            </DialogTitle>
            <DialogDescription>
              {editingData ? 'Edit data yang sudah ada' : 'Tambahkan data baru ke sistem'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeSection === 'konversi' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tahun">Tahun</Label>
                    <Input
                      id="tahun"
                      type="number"
                      value={formData.Tahun}
                      onChange={(e) => setFormData({...formData, Tahun: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="semester">Semester</Label>
                    <Select 
                      value={formData.Semester?.toString() || "1"} 
                      onValueChange={(value) => setFormData({...formData, Semester: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Semester" />
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
                      onValueChange={(value) => setFormData({...formData, Predikat: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Predikat" />
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
                      value={formData['Nilai SKP']}
                      onChange={(e) => setFormData({...formData, 'Nilai SKP': parseFloat(e.target.value)})}
                      required
                    />
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

                {!editingData && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Auto-calculate:</strong> AK Konversi dan Periode akan dihitung otomatis berdasarkan predikat dan tahun/semester.
                    </p>
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit">
                {editingData ? 'Update Data' : 'Simpan Data'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Fallback UI jika data karyawan tidak tersedia
  if (!karyawan) {
    return (
      <div className="p-8 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Data Karyawan Tidak Tersedia</h2>
          <p className="text-yellow-700">Silakan pilih karyawan terlebih dahulu untuk mengakses layanan karir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Section Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Layanan Karir - Simulasi & Pengajuan
          </CardTitle>
          <CardDescription>
            Kelola data konversi predikat, penetapan, dan akumulasi angka kredit untuk {karyawan.nama}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeSection === 'konversi' ? 'default' : 'outline'}
              onClick={() => setActiveSection('konversi')}
            >
              Konversi Predikat
            </Button>
            <Button
              variant={activeSection === 'penetapan' ? 'default' : 'outline'}
              onClick={() => setActiveSection('penetapan')}
            >
              Penetapan AK
            </Button>
            <Button
              variant={activeSection === 'akumulasi' ? 'default' : 'outline'}
              onClick={() => setActiveSection('akumulasi')}
            >
              Akumulasi AK
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-4 items-end">
            {(activeSection === 'konversi' || activeSection === 'penetapan') && (
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
            )}
            
            {activeSection === 'konversi' && (
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
            )}
            
            <Button onClick={loadData} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Terapkan Filter
            </Button>
            
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Data
            </Button>
          </div>

          {/* Data Table */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Memuat data...</p>
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
                <>
                  {activeSection === 'konversi' && renderKonversiTable()}
                  {activeSection === 'penetapan' && renderPenetapanTable()}
                  {activeSection === 'akumulasi' && renderAkumulasiTable()}
                </>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Form Modal */}
      <FormModal />
    </div>
  );
};

export default LayananKarir;