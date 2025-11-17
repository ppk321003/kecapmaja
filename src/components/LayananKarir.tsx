import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Edit, Trash2, RefreshCw, Plus, Calendar, Filter, Save, X } from 'lucide-react';
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

// ==================== API FUNCTIONS ====================
const useSpreadsheetAPI = () => {
  const { toast } = useToast();

  const callAPI = async (operation: string, sheetName: string, data?: any) => {
    try {
      const response = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId: SPREADSHEET_ID,
          operation,
          range: sheetName,
          ...data
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API call failed');
      }
      
      return await response.json();
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

  const readData = async (sheetName: string, nip?: string) => {
    const result = await callAPI('read', sheetName);
    const rows = result.values || [];
    
    if (rows.length <= 1) return [];
    
    const headers = rows[0];
    const data = rows.slice(1)
      .filter((row: any[]) => !nip || row[headers.indexOf('NIP')] === nip)
      .map((row: any[], index: number) => {
        const obj: any = { 
          id: `${sheetName}_${index + 2}`,
          rowIndex: index + 2
        };
        headers.forEach((header: string, colIndex: number) => {
          obj[header] = row[colIndex];
        });
        return obj;
      });
    
    console.log(`Loaded ${data.length} records from ${sheetName}`);
    return data;
  };

  const appendData = async (sheetName: string, values: any[]) => {
    console.log(`Appending to ${sheetName}:`, values);
    return await callAPI('append', sheetName, { values: [values] });
  };

  const updateData = async (sheetName: string, rowIndex: number, values: any[]) => {
    console.log(`Updating ${sheetName} row ${rowIndex}:`, values);
    return await callAPI('update', sheetName, { rowIndex, values: [values] });
  };

  const deleteData = async (sheetName: string, rowIndex: number) => {
    console.log(`Deleting ${sheetName} row ${rowIndex}`);
    return await callAPI('delete', sheetName, { rowIndex });
  };

  return { readData, appendData, updateData, deleteData };
};

// ==================== EDITABLE TABLE COMPONENTS ====================
const EditableCell = ({ 
  value, 
  field, 
  rowData, 
  onUpdate,
  type = 'text'
}: {
  value: any;
  field: string;
  rowData: any;
  onUpdate: (field: string, value: any) => void;
  type?: 'text' | 'number' | 'select' | 'date';
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onUpdate(field, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div 
        className="cursor-pointer hover:bg-gray-50 p-1 rounded"
        onClick={() => setIsEditing(true)}
      >
        {type === 'select' && field === 'Predikat' ? (
          <Badge variant={
            value === 'Sangat Baik' ? 'default' :
            value === 'Baik' ? 'secondary' :
            value === 'Cukup' ? 'outline' : 'destructive'
          }>
            {value}
          </Badge>
        ) : type === 'select' && field === 'Status' ? (
          <Badge variant={value === 'Generated' ? 'default' : 'secondary'}>
            {value}
          </Badge>
        ) : (
          value
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {type === 'select' && field === 'Predikat' ? (
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
            <SelectItem value="Baik">Baik</SelectItem>
            <SelectItem value="Cukup">Cukup</SelectItem>
            <SelectItem value="Kurang">Kurang</SelectItem>
          </SelectContent>
        </Select>
      ) : type === 'select' && field === 'Semester' ? (
        <Select value={editValue?.toString()} onValueChange={(val) => setEditValue(parseInt(val))}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Semester 1</SelectItem>
            <SelectItem value="2">Semester 2</SelectItem>
          </SelectContent>
        </Select>
      ) : type === 'select' && field === 'Status' ? (
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Generated">Generated</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          className="w-full"
        />
      )}
      <div className="flex gap-1">
        <Button size="sm" onClick={handleSave}>
          <Save className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update data locally - FIXED VERSION
  const handleUpdateData = (index: number, field: string, value: any) => {
    const updateDataState = (data: any[]) => {
      const newData = [...data];
      newData[index] = { ...newData[index], [field]: value };
      
      // Auto-calculate for konversi section
      if (activeSection === 'konversi') {
        // If Predikat or Nilai SKP changes, recalculate AK Konversi
        if (field === 'Predikat' || field === 'Nilai SKP') {
          const predikat = field === 'Predikat' ? value : newData[index].Predikat;
          const nilaiSKP = field === 'Nilai SKP' ? value : newData[index]['Nilai SKP'];
          const akKonversi = LayananKarirCalculator.calculateAKFromPredikat(predikat, nilaiSKP);
          newData[index]['AK Konversi'] = akKonversi;
        }
        
        // If Tahun or Semester changes, recalculate periode
        if (field === 'Tahun' || field === 'Semester') {
          const tahun = field === 'Tahun' ? value : newData[index].Tahun;
          const semester = field === 'Semester' ? value : newData[index].Semester;
          const periode = LayananKarirCalculator.calculatePeriodeSemester(tahun, semester);
          newData[index]['TMT Mulai'] = periode.mulai;
          newData[index]['TMT Selesai'] = periode.selesai;
        }
      }
      
      return newData;
    };

    switch (activeSection) {
      case 'konversi':
        setKonversiData(prev => updateDataState(prev));
        break;
      case 'penetapan':
        setPenetapanData(prev => updateDataState(prev));
        break;
      case 'akumulasi':
        setAkumulasiData(prev => updateDataState(prev));
        break;
    }
  };

  // Save individual row to spreadsheet
  const handleSaveRow = async (rowData: any, index: number) => {
    try {
      const now = LayananKarirCalculator.formatDate(new Date());
      const updatedData = { ...rowData, Last_Update: now };
      
      let values: any[] = [];
      
      if (activeSection === 'konversi') {
        values = [
          updatedData.No,
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
          updatedData.Last_Update
        ];
      }
      
      await api.updateData(getSheetName(), rowData.rowIndex, values);
      
      toast({
        title: "Sukses",
        description: "Data berhasil disimpan"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data",
        variant: "destructive"
      });
    }
  };

  // Add new row
  const handleAddNew = async () => {
    const now = LayananKarirCalculator.formatDate(new Date());
    const newData = {
      NIP: karyawan.nip,
      Nama: karyawan.nama,
      Tahun: new Date().getFullYear(),
      Semester: 1,
      Predikat: 'Baik',
      'Nilai SKP': 80,
      'AK Konversi': LayananKarirCalculator.calculateAKFromPredikat('Baik', 80),
      'TMT Mulai': `01/01/${new Date().getFullYear()}`,
      'TMT Selesai': `30/06/${new Date().getFullYear()}`,
      Status: 'Draft',
      Catatan: '',
      Last_Update: now
    };

    try {
      const values = [
        '',
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
        newData.Last_Update
      ];

      await api.appendData(getSheetName(), values);
      toast({
        title: "Sukses",
        description: "Data baru berhasil ditambahkan"
      });
      loadData(); // Reload to get the new data with proper ID
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menambah data",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (rowData: any) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    
    try {
      await api.deleteData(getSheetName(), rowData.rowIndex);
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

  const getSheetName = (): string => {
    switch (activeSection) {
      case 'konversi': return SHEET_NAMES.konversi;
      case 'penetapan': return SHEET_NAMES.penetapan;
      case 'akumulasi': return SHEET_NAMES.akumulasi;
      default: return '';
    }
  };

  const getFilteredData = () => {
    let data: any[] = [];
    
    switch (activeSection) {
      case 'konversi':
        data = konversiData.filter(item => 
          (filters.tahun === 'all' || item.Tahun?.toString() === filters.tahun) &&
          (filters.semester === 'all' || item.Semester?.toString() === filters.semester)
        );
        break;
      case 'penetapan':
        data = penetapanData.filter(item => 
          filters.tahun === 'all' || item.Tahun?.toString() === filters.tahun
        );
        break;
      case 'akumulasi':
        data = akumulasiData;
        break;
    }
    
    return data;
  };

  // Render Editable Tables
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
        {getFilteredData().map((data: KonversiData, index: number) => (
          <TableRow key={data.id}>
            <TableCell>
              <EditableCell
                value={data.Tahun}
                field="Tahun"
                rowData={data}
                onUpdate={(field, value) => handleUpdateData(index, field, value)}
                type="number"
              />
            </TableCell>
            <TableCell>
              <EditableCell
                value={data.Semester}
                field="Semester"
                rowData={data}
                onUpdate={(field, value) => handleUpdateData(index, field, value)}
                type="select"
              />
            </TableCell>
            <TableCell>
              <EditableCell
                value={data.Predikat}
                field="Predikat"
                rowData={data}
                onUpdate={(field, value) => handleUpdateData(index, field, value)}
                type="select"
              />
            </TableCell>
            <TableCell>
              <EditableCell
                value={data['Nilai SKP']}
                field="Nilai SKP"
                rowData={data}
                onUpdate={(field, value) => handleUpdateData(index, field, value)}
                type="number"
              />
            </TableCell>
            <TableCell className="font-semibold">
              {data['AK Konversi']}
            </TableCell>
            <TableCell className="text-sm">
              {data['TMT Mulai']} - {data['TMT Selesai']}
            </TableCell>
            <TableCell>
              <EditableCell
                value={data.Status}
                field="Status"
                rowData={data}
                onUpdate={(field, value) => handleUpdateData(index, field, value)}
                type="select"
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSaveRow(data, index)}
                >
                  <Save className="h-4 w-4" />
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Layanan Karir - Inline Editor
          </CardTitle>
          <CardDescription>
            Klik pada data untuk edit, lalu simpan per baris. AK Konversi terhitung otomatis.
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
              Refresh Data
            </Button>
            
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Baru
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
                  {/* Add similar tables for penetapan and akumulasi */}
                </>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default LayananKarir;