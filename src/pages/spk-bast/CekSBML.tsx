import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SheetRow {
  namaPetugas: string;
  periode: string;
  jenisPekerjaan: string;
  nilaiRealisasi: string;
}

interface PetugasData {
  nama: string;
  pendataanLapangan: number;
  pemeriksaanLapangan: number;
  pengolahan: number;
  honorProvinsi: number;
  totalHonor: number;
}

const CekSBML = () => {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [petugasData, setPetugasData] = useState<PetugasData[]>([]);
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);

  const months = [
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  const years = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() - 5 + i;
    return year.toString();
  });

  const fetchSheetData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "Anda harus login terlebih dahulu",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA',
          operation: 'read',
          range: 'Sheet1',
        },
      });

      if (response.error) throw response.error;

      const values = response.data?.values || [];
      if (values.length <= 1) {
        toast({
          title: "Info",
          description: "Tidak ada data di spreadsheet",
        });
        setSheetData([]);
        return;
      }

      // Parse data (skip header row)
      const rows: SheetRow[] = values.slice(1).map((row: any[]) => ({
        namaPetugas: row[0] || "",
        periode: row[1] || "",
        jenisPekerjaan: row[2] || "",
        nilaiRealisasi: row[3] || "",
      }));

      setSheetData(rows);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      toast({
        title: "Error",
        description: "Gagal mengambil data dari Google Sheets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, []);

  useEffect(() => {
    if (!selectedMonth || !selectedYear || sheetData.length === 0) {
      setPetugasData([]);
      return;
    }

    processData();
  }, [selectedMonth, selectedYear, sheetData]);

  const processData = () => {
    const targetPeriode = `${selectedMonth}/${selectedMonth === "01" ? "01" : selectedMonth}/${selectedYear}`;
    
    // Filter data berdasarkan periode
    const filteredRows = sheetData.filter(row => {
      if (!row.periode) return false;
      // Parse periode format: 01/02/2025
      const [day, month, year] = row.periode.split('/');
      return month === selectedMonth && year === selectedYear;
    });

    // Group data by petugas name
    const petugasMap = new Map<string, {
      pendataanLapangan: number[];
      pemeriksaanLapangan: number[];
      pengolahan: number[];
    }>();

    filteredRows.forEach(row => {
      const names = row.namaPetugas.split('|').map(n => n.trim()).filter(n => n);
      const values = row.nilaiRealisasi.split('|').map(v => {
        const cleaned = v.trim().replace(/[^\d]/g, '');
        return parseInt(cleaned) || 0;
      });

      names.forEach((name, index) => {
        if (!petugasMap.has(name)) {
          petugasMap.set(name, {
            pendataanLapangan: [],
            pemeriksaanLapangan: [],
            pengolahan: [],
          });
        }

        const petugas = petugasMap.get(name)!;
        const nilai = values[index] || 0;

        const jenisPekerjaan = row.jenisPekerjaan.toLowerCase();
        if (jenisPekerjaan.includes('pendataan lapangan') || jenisPekerjaan.includes('petugas lapangan')) {
          petugas.pendataanLapangan.push(nilai);
        } else if (jenisPekerjaan.includes('pemeriksaan lapangan') || jenisPekerjaan.includes('pemeriksa lapangan')) {
          petugas.pemeriksaanLapangan.push(nilai);
        } else if (jenisPekerjaan.includes('pengolahan')) {
          petugas.pengolahan.push(nilai);
        }
      });
    });

    // Convert to array and calculate totals
    const result: PetugasData[] = Array.from(petugasMap.entries()).map(([nama, data]) => {
      const pendataanLapangan = data.pendataanLapangan.reduce((sum, val) => sum + val, 0);
      const pemeriksaanLapangan = data.pemeriksaanLapangan.reduce((sum, val) => sum + val, 0);
      const pengolahan = data.pengolahan.reduce((sum, val) => sum + val, 0);
      
      return {
        nama,
        pendataanLapangan,
        pemeriksaanLapangan,
        pengolahan,
        honorProvinsi: 0,
        totalHonor: pendataanLapangan + pemeriksaanLapangan + pengolahan,
      };
    });

    setPetugasData(result.sort((a, b) => a.nama.localeCompare(b.nama)));
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('id-ID') + ',-';
  };

  const handleHonorProvinsiChange = (index: number, value: string) => {
    const numValue = parseInt(value.replace(/[^\d]/g, '')) || 0;
    setPetugasData(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        honorProvinsi: numValue,
        totalHonor: updated[index].pendataanLapangan + 
                    updated[index].pemeriksaanLapangan + 
                    updated[index].pengolahan + 
                    numValue,
      };
      return updated;
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Cek SBML</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Periode (Bulan) SPK</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Tahun</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Memuat data...
            </div>
          ) : petugasData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedMonth && selectedYear 
                ? "Tidak ada data untuk periode yang dipilih"
                : "Silakan pilih bulan dan tahun untuk melihat data"}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="text-right">Petugas Pendataan Lapangan</TableHead>
                    <TableHead className="text-right">Petugas Pemeriksaan Lapangan</TableHead>
                    <TableHead className="text-right">Petugas Pengolahan</TableHead>
                    <TableHead className="text-right">Honor Provinsi</TableHead>
                    <TableHead className="text-right">Total Honor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {petugasData.map((petugas, index) => (
                    <TableRow key={petugas.nama}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium">{petugas.nama}</TableCell>
                      <TableCell className="text-right">
                        Rp {formatCurrency(petugas.pendataanLapangan)}
                      </TableCell>
                      <TableCell className="text-right">
                        Rp {formatCurrency(petugas.pemeriksaanLapangan)}
                      </TableCell>
                      <TableCell className="text-right">
                        Rp {formatCurrency(petugas.pengolahan)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="text"
                          value={petugas.honorProvinsi > 0 ? petugas.honorProvinsi.toLocaleString('id-ID') : ''}
                          onChange={(e) => handleHonorProvinsiChange(index, e.target.value)}
                          placeholder="0"
                          className="text-right w-32 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        Rp {formatCurrency(petugas.totalHonor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CekSBML;
