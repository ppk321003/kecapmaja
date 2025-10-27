"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Search, Filter, Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DataRow {
  no: number;
  bulan: string;
  tahun: number;
  namaPetugas: string;
  namaBank: string;
  noRekening: string;
  jumlah: number;
  [key: string]: string | number;
}

const SPREADSHEET_ID = "1XtWKO61yo5WhtsisPUNO-xsT3z1CfUF2C7B0Kbpnj88";

export default function AkiToBendahara() {
  const [data, setData] = useState<DataRow[]>([]);
  const [filteredData, setFilteredData] = useState<DataRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBulan, setSelectedBulan] = useState("");
  const [selectedTahun, setSelectedTahun] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const bulanOptions = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Fetch data dari Google Sheets menggunakan Supabase function
  const fetchDataFromSheets = async () => {
    try {
      setIsLoading(true);
      
      const { data: sheetData, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "All-In",
        },
      });

      if (error) throw error;

      const rows = sheetData.values || [];
      
      if (rows.length === 0) {
        throw new Error('Tidak ada data ditemukan di spreadsheet');
      }

      // Process data dari Google Sheets
      const headers = rows[0]; // Baris pertama sebagai header
      const dataRows = rows.slice(1); // Data dimulai dari baris kedua

      const processedData: DataRow[] = dataRows.map((row: any[], index: number) => {
        const rowData: DataRow = {
          no: parseInt(row[0]) || index + 1, // Kolom A - No
          bulan: row[1] || '', // Kolom B - Bulan
          tahun: parseInt(row[2]) || 0, // Kolom C - Tahun
          namaPetugas: row[3] || '', // Kolom D - Nama Petugas
          namaBank: row[4] || '', // Kolom E - Nama Bank
          noRekening: row[5] || '', // Kolom F - No Rekening
          jumlah: parseInt(row[6]) || 0, // Kolom G - Jumlah
        };

        // Tambahkan kolom kegiatan dinamis
        headers.slice(7).forEach((header: string, colIndex: number) => {
          const value = row[7 + colIndex];
          rowData[header] = value ? parseInt(value) : 0;
        });

        return rowData;
      });

      setData(processedData);
      setFilteredData(processedData);
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal memuat data dari Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFromSheets();
  }, []);

  // Extract tahun unik dari data untuk filter
  const tahunOptions = [...new Set(data.map(item => item.tahun.toString()))]
    .filter(tahun => tahun !== "0")
    .sort((a, b) => parseInt(b) - parseInt(a));

  // Filter data
  useEffect(() => {
    let result = data;

    if (searchTerm) {
      result = result.filter(item =>
        item.namaPetugas.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedBulan) {
      result = result.filter(item => item.bulan === selectedBulan);
    }

    if (selectedTahun) {
      result = result.filter(item => item.tahun.toString() === selectedTahun);
    }

    setFilteredData(result);
  }, [searchTerm, selectedBulan, selectedTahun, data]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBulan("");
    setSelectedTahun("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const totalJumlah = filteredData.reduce((sum, item) => sum + item.jumlah, 0);

  // Get kegiatan columns (semua kolom selain kolom dasar)
  const baseColumns = ['no', 'bulan', 'tahun', 'namaPetugas', 'namaBank', 'noRekening', 'jumlah'];
  const kegiatanColumns = data.length > 0 ? Object.keys(data[0]).filter(key => !baseColumns.includes(key)) : [];

  const handleExport = () => {
    toast({
      title: "Fitur Export",
      description: "Fitur export Excel akan segera tersedia",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Aki to Bendahara</h1>
          <p className="text-muted-foreground mt-2">
            Rekap Honor Bulanan Mitra Statistik BPS Kabupaten Majalengka
          </p>
        </div>
        <Button onClick={handleExport} className="mt-4 sm:mt-0">
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari Nama Petugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedBulan} onValueChange={setSelectedBulan}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                {bulanOptions.map((bulan) => (
                  <SelectItem key={bulan} value={bulan}>
                    {bulan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTahun} onValueChange={setSelectedTahun}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                {tahunOptions.map((tahun) => (
                  <SelectItem key={tahun} value={tahun}>
                    {tahun}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={resetFilters}>
              Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <CardTitle>Rekap Honor</CardTitle>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {filteredData.length} petugas • {formatCurrency(totalJumlah)}
            </div>
          </div>
          <CardDescription>
            Data rekap honor bulanan mitra statistik BPS Kabupaten Majalengka
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground mt-2">Memuat data dari Google Sheets...</p>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">Tidak ada data yang ditemukan</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="sticky left-0 bg-muted z-10 min-w-[50px] border-r">No</TableHead>
                      <TableHead className="sticky left-[50px] bg-muted z-10 min-w-[100px] border-r">Bulan</TableHead>
                      <TableHead className="sticky left-[150px] bg-muted z-10 min-w-[80px] border-r">Tahun</TableHead>
                      <TableHead className="sticky left-[230px] bg-muted z-10 min-w-[200px] border-r">Nama Petugas</TableHead>
                      <TableHead className="sticky left-[430px] bg-muted z-10 min-w-[150px] border-r">Nama Bank</TableHead>
                      <TableHead className="sticky left-[580px] bg-muted z-10 min-w-[150px] border-r">No Rekening</TableHead>
                      <TableHead className="min-w-[120px] border-r">Jumlah</TableHead>
                      {kegiatanColumns.map((column) => (
                        <TableHead key={column} className="min-w-[200px]">
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => (
                      <TableRow key={row.no} className="hover:bg-muted/50">
                        <TableCell className="sticky left-0 bg-background border-r font-medium">{row.no}</TableCell>
                        <TableCell className="sticky left-[50px] bg-background border-r">{row.bulan}</TableCell>
                        <TableCell className="sticky left-[150px] bg-background border-r">{row.tahun}</TableCell>
                        <TableCell className="sticky left-[230px] bg-background border-r">{row.namaPetugas}</TableCell>
                        <TableCell className="sticky left-[430px] bg-background border-r">{row.namaBank}</TableCell>
                        <TableCell className="sticky left-[580px] bg-background border-r">{row.noRekening}</TableCell>
                        <TableCell className="border-r font-medium">{formatCurrency(row.jumlah)}</TableCell>
                        {kegiatanColumns.map(column => (
                          <TableCell key={column}>
                            {row[column] ? formatCurrency(Number(row[column])) : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}