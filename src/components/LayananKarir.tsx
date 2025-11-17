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

// ==================== SPREADSHEET CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAMES = {
  konversi: "konversi_predikat",
  penetapan: "penetapan_ak",
  akumulasi: "akumulasi_ak"
};

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
      return { mulai: `01/01/${tahun}`, selesai: `30/06/${tahun}` };
    } else {
      return { mulai: `01/07/${tahun}`, selesai: `31/12/${tahun}` };
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

// ==================== API FUNCTIONS ====================
const useSpreadsheetAPI = () => {
  const { toast } = useToast();

  const callAPI = async (operation: string, sheetName: string, data?: any) => {
    try {
      const response = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          operation,
          range: sheetName,
          ...data
        })
      });

      if (!response.ok) throw new Error('API call failed');
      return await response.json();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengakses spreadsheet",
        variant: "destructive"
      });
      throw error;
    }
  };

  const readData = async (sheetName: string, nip?: string) => {
    const result = await callAPI('read', sheetName);
    const rows = result.values || [];
    if (rows.length <= 1) return [];

    const headers = rows[0];
    return rows.slice(1)
      .filter((row: any[]) => !nip || row[1] === nip)
      .map((row: any[], index: number) => {
        const obj: any = { id: index + 2 };
        headers.forEach((header: string, colIndex: number) => {
          obj[header] = row[colIndex] ?? '';
        });
        return obj;
      });
  };

  const appendData = async (sheetName: string, values: any[]) => callAPI('append', sheetName, { values });
  const updateData = async (sheetName: string, rowIndex: number, values: any[]) => callAPI('update', sheetName, { rowIndex, values });
  const deleteData = async (sheetName: string, rowIndex: number) => callAPI('delete', sheetName, { rowIndex });

  return { readData, appendData, updateData, deleteData };
};

// ==================== MAIN COMPONENT ====================
const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const { toast } = useToast();
  const api = useSpreadsheetAPI();
  
  // === PERBAIKAN: Guard jika karyawan belum ada ===
  if (!karyawan || !karyawan.nip) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Layanan Karir
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-16">
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-20 h-20 mx-auto mb-6 opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">Karyawan belum dipilih</p>
          <p className="text-sm text-muted-foreground mt-2">
            Silakan pilih karyawan terlebih dahulu untuk melihat data layanan karir.
          </p>
        </CardContent>
      </Card>
    );
  }

  // States
  const [activeSection, setActiveSection] = useState<'konversi' | 'penetapan' | 'akumulasi'>('konversi');
  const [konversiData, setKonversiData] = useState<KonversiData[]>([]);
  const [penetapanData, setPenetapanData] = useState<PenetapanData[]>([]);
  const [akumulasiData, setAkumulasiData] = useState<AkumulasiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [filters, setFilters] = useState({ tahun: '', semester: '' });

  // Load data
  useEffect(() => {
    loadData();
  }, [activeSection]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (activeSection) {
        case 'konversi':
          const konversi = await api.readData(SHEET_NAMES.konversi, karyawan.nip);
          setKonversiData(konversi);
          break;
        case 'penetapan':
          const penetapan = await api.readData(SHEET_NAMES.penetapan, karyawan.nip);
          setPenetapanData(penetapan);
          break;
        case 'akumulasi':
          const akumulasi = await api.readData(SHEET_NAMES.akumulasi, karyawan.nip);
          setAkumulasiData(akumulasi);
          break;
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Gagal memuat data dari Google Sheets. Periksa koneksi atau akses spreadsheet.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    let data: any[] = [];
    switch (activeSection) {
      case 'konversi':
        data = konversiData.filter(item => 
          (!filters.tahun || item.Tahun.toString() === filters.tahun) &&
          (!filters.semester || item.Semester.toString() === filters.semester)
        );
        break;
      case 'penetapan':
        data = penetapanData.filter(item => !filters.tahun || item.Tahun.toString() === filters.tahun);
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
      await api.deleteData(SHEET_NAMES[activeSection], data.id);
      toast({ title: "Sukses", description: "Data berhasil dihapus" });
      loadData();
    } catch {
      toast({ title: "Error", description: "Gagal menghapus data", variant: "destructive" });
    }
  };

  const handleRegenerate = async (data: any) => {
    try {
      let updatedData = { ...data };
      if (activeSection === 'konversi') {
        updatedData['AK Konversi'] = LayananKarirCalculator.calculateAKFromPredikat(data.Predikat, data['Nilai SKP']);
        updatedData.Last_Update = LayananKarirCalculator.formatDate(new Date());
        const values = Object.values(updatedData).slice(1);
        await api.updateData(SHEET_NAMES.konversi, data.id, [values]);
      }
      toast({ title: "Sukses", description: "Data berhasil di-regenerate" });
      loadData();
    } catch {
      toast({ title: "Error", description: "Gagal regenerate data", variant: "destructive" });
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const now = LayananKarirCalculator.formatDate(new Date());
      if (activeSection === 'konversi') {
        const periode = LayananKarirCalculator.calculatePeriodeSemester(formData.Tahun, formData.Semester);
        const newData: KonversiData = {
          NIP: karyawan.nip,
          Nama: karyawan.nama,
          Tahun: formData.Tahun,
          Semester: formData.Semester,
          Predikat: formData.Predikat,
          'Nilai SKP': formData['Nilai SKP'],
          'AK Konversi': LayananKarirCalculator.calculateAKFromPredikat(formData.Predikat, formData['Nilai SKP']),
          'TMT Mulai': periode.mulai,
          'TMT Selesai': periode.selesai,
          Status: 'Draft',
          Catatan: formData.Catatan || '',
          Last_Update: now
        };

        const values = Object.values(newData);
        if (editingData) {
          await api.updateData(SHEET_NAMES.konversi, editingData.id, [values]);
        } else {
          await api.appendData(SHEET_NAMES.konversi, [values]);
        }
      }

      setShowModal(false);
      toast({ title: "Sukses", description: `Data berhasil ${editingData ? 'diupdate' : 'ditambahkan'}` });
      loadData();
    } catch {
      toast({ title: "Error", description: "Gagal menyimpan data", variant: "destructive" });
    }
  };

  // Render Tables
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
            <TableCell className="text-sm">{data['TMT Mulai']} - {data['TMT Selesai']}</TableCell>
            <TableCell>
              <Badge variant={data.Status === 'Generated' ? 'default' : 'secondary'}>{data.Status}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(data)}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(data)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleRegenerate(data)}><RefreshCw className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(data)}><Trash2 className="h-4 w-4" /></Button>
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
            <TableCell className={data.Selisih >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
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

  // Form Modal
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
                    <Input id="tahun" type="number" value={formData.Tahun} onChange={(e) => setFormData({...formData, Tahun: parseInt(e.target.value)})} required />
                  </div>
                  <div>
                    <Label htmlFor="semester">Semester</Label>
                    <Select value={formData.Semester.toString()} onValueChange={(v) => setFormData({...formData, Semester: parseInt(v)})}>
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
                    <Label htmlFor="predikat">Predikat Kinerja</Label>
                    <Select value={formData.Predikat} onValueChange={(v) => setFormData({...formData, Predikat: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Input id="nilaiSKP" type="number" step="0.1" min="0" max="100" value={formData['Nilai SKP']} onChange={(e) => setFormData({...formData, 'Nilai SKP': parseFloat(e.target.value)})} required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="catatan">Catatan</Label>
                  <Input id="catatan" value={formData.Catatan || ''} onChange={(e) => setFormData({...formData, Catatan: e.target.value})} placeholder="Opsional" />
                </div>

                {!editingData && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Auto-calculate:</strong> AK Konversi dan Periode akan dihitung otomatis.
                    </p>
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
              <Button type="submit">{editingData ? 'Update Data' : 'Simpan Data'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Layanan Karir - Simulasi & Pengajuan
          </CardTitle>
          <CardDescription>Kelola data konversi predikat, penetapan, dan akumulasi angka kredit</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Navigation */}
          <div className="flex gap-2 mb-6">
            <Button variant={activeSection === 'konversi' ? 'default' : 'outline'} onClick={() => setActiveSection('konversi')}>Konversi Predikat</Button>
            <Button variant={activeSection === 'penetapan' ? 'default' : 'outline'} onClick={() => setActiveSection('penetapan')}>Penetapan AK</Button>
            <Button variant={activeSection === 'akumulasi' ? 'default' : 'outline'} onClick={() => setActiveSection('akumulasi')}>Akumulasi AK</Button>
          </div>

          {/* Filters & Actions */}
          <div className="flex gap-4 mb-4 items-end flex-wrap">
            {(activeSection === 'konversi' || activeSection === 'penetapan') && (
              <div className="flex-1 min-w-48">
                <Label>Tahun</Label>
                {/* Filter Tahun */}
                <Select value={filters.tahun || 'all'} onValueChange={(v) => setFilters({...filters, tahun: v === 'all' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Semua Tahun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tahun</SelectItem>
                    {[2023, 2024, 2025, 2026].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filter Semester */}
                <Select value={filters.semester || 'all'} onValueChange={(v) => setFilters({...filters, semester: v === 'all' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Semua Semester" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Semester</SelectItem>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={loadData} variant="outline"><Filter className="h-4 w-4 mr-2" /> Terapkan</Button>
            <Button onClick={handleAddNew}><Plus className="h-4 w-4 mr-2" /> Tambah Data</Button>
          </div>

          {/* Content */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
                  <p className="mt-4 text-muted-foreground">Memuat data karyawan...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md mx-auto">
                    <p className="font-medium">Gagal memuat data</p>
                    <p className="text-sm mt-1">{error}</p>
                    <Button onClick={loadData} variant="outline" size="sm" className="mt-4">
                      <RefreshCw className="h-4 w-4 mr-2" /> Coba Lagi
                    </Button>
                  </div>
                </div>
              ) : getFilteredData().length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Belum ada data</p>
                  <Button onClick={handleAddNew} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" /> Tambah Data Pertama
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

      <FormModal />
    </div>
  );
};

export default LayananKarir;