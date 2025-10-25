'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Filter, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

// Types
interface SheetData {
  headers: string[];
  rows: Record<string, any>[];
  sheetName: string;
}

interface FilterState {
  periodType: 'monthly' | 'yearly';
  selectedMonth: string;
  selectedYear: string;
  columnFilters: Record<string, string>;
}

// Mock data untuk development
const mockSheetData: Record<string, SheetData> = {
  'Januari': {
    sheetName: 'Januari',
    headers: ['Tanggal', 'Kegiatan', 'Pemasukan', 'Pengeluaran', 'Keterangan'],
    rows: [
      { Tanggal: '2024-01-01', Kegiatan: 'Saldo Awal', Pemasukan: '5.000.000', Pengeluaran: '0', Keterangan: 'Saldo awal bulan' },
      { Tanggal: '2024-01-05', Kegiatan: 'Iuran Bulanan', Pemasukan: '1.500.000', Pengeluaran: '0', Keterangan: 'Iuran anggota' },
      { Tanggal: '2024-01-10', Kegiatan: 'Bayar Listrik', Pemasukan: '0', Pengeluaran: '750.000', Keterangan: 'Pembayaran listrik kantor' },
      { Tanggal: '2024-01-15', Kegiatan: 'Event Internal', Pemasukan: '2.000.000', Pengeluaran: '1.200.000', Keterangan: 'Acara rutin bulanan' }
    ]
  },
  'Februari': {
    sheetName: 'Februari',
    headers: ['Tanggal', 'Kegiatan', 'Pemasukan', 'Pengeluaran', 'Keterangan', 'Status'],
    rows: [
      { Tanggal: '2024-02-01', Kegiatan: 'Saldo Awal', Pemasukan: '6.050.000', Pengeluaran: '0', Keterangan: 'Saldo dari Januari', Status: 'Verified' },
      { Tanggal: '2024-02-08', Kegiatan: 'Workshop', Pemasukan: '3.000.000', Pengeluaran: '1.500.000', Keterangan: 'Workshop kepemudaan', Status: 'Pending' },
      { Tanggal: '2024-02-20', Kegiatan: 'Bantuan Sosial', Pemasukan: '0', Pengeluaran: '2.000.000', Keterangan: 'Bantuan ke panti asuhan', Status: 'Completed' }
    ]
  },
  'REKAP-KEGIATAN': {
    sheetName: 'REKAP-KEGIATAN',
    headers: ['Bulan', 'Total Pemasukan', 'Total Pengeluaran', 'Saldo Akhir', 'Kegiatan Utama'],
    rows: [
      { Bulan: 'Januari', 'Total Pemasukan': '6.500.000', 'Total Pengeluaran': '1.950.000', 'Saldo Akhir': '4.550.000', 'Kegiatan Utama': 'Iuran dan Operasional' },
      { Bulan: 'Februari', 'Total Pemasukan': '3.000.000', 'Total Pengeluaran': '3.500.000', 'Saldo Akhir': '4.050.000', 'Kegiatan Utama': 'Workshop dan Sosial' }
    ]
  }
};

export default function RekapBendahara() {
  const [filters, setFilters] = useState<FilterState>({
    periodType: 'monthly',
    selectedMonth: 'Januari',
    selectedYear: '2024',
    columnFilters: {}
  });
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulasi loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let sheetName = '';
      if (filters.periodType === 'monthly') {
        sheetName = filters.selectedMonth;
      } else {
        sheetName = 'REKAP-KEGIATAN';
      }

      if (mockSheetData[sheetName]) {
        setData(mockSheetData[sheetName]);
      } else {
        throw new Error(`Data untuk ${sheetName} tidak ditemukan`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleColumnFilterChange = (column: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      columnFilters: {
        ...prev.columnFilters,
        [column]: value
      }
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      periodType: 'monthly',
      selectedMonth: 'Januari',
      selectedYear: '2024',
      columnFilters: {}
    });
    setData(null);
    setError(null);
  };

  const filteredData = data ? {
    ...data,
    rows: data.rows.filter(row => {
      return Object.entries(filters.columnFilters).every(([column, filterValue]) => {
        if (!filterValue.trim()) return true;
        const cellValue = row[column]?.toString().toLowerCase() || '';
        return cellValue.includes(filterValue.toLowerCase());
      });
    })
  } : null;

  const handleExport = () => {
    if (!data) return;
    
    // Simulasi export data
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => data.headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-bendahara-${data.sheetName}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">📊 AKI | Rekap Bendahara</h1>
          <p className="text-muted-foreground mt-2">
            Sistem Manajemen Data Keuangan Terintegrasi Google Sheets
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Terhubung dengan Google Sheets
        </Badge>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Kontrol Data
          </CardTitle>
          <CardDescription>
            Pilih periode dan muat data dari Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Jenis Periode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Periode</label>
              <Select
                value={filters.periodType}
                onValueChange={(value: 'monthly' | 'yearly') => 
                  setFilters(prev => ({ ...prev, periodType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">📅 Bulanan</SelectItem>
                  <SelectItem value="yearly">📊 Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Bulan */}
            {filters.periodType === 'monthly' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Bulan</label>
                <Select
                  value={filters.selectedMonth}
                  onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, selectedMonth: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filter Tahun */}
            {filters.periodType === 'yearly' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tahun</label>
                <Select
                  value={filters.selectedYear}
                  onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, selectedYear: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-end gap-2">
              <Button 
                onClick={loadData} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Memuat...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Muat Data
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleResetFilters}
                disabled={loading}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Info Selected Sheet */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-sm text-blue-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <span>
                <strong>Sheet aktif:</strong>{' '}
                {filters.periodType === 'monthly' 
                  ? `Bulan ${filters.selectedMonth}` 
                  : 'REKAP-KEGIATAN'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2" />
              <div>
                <strong className="font-medium">Error:</strong> {error}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              📋 Tabel Data - {data?.sheetName || 'Pilih periode'}
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant={data ? "default" : "secondary"}>
                {filteredData?.rows.length || 0} baris
              </Badge>
              {data && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Data akan otomatis menyesuaikan struktur header dari Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Memuat data dari Google Sheets...</p>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Download className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Data belum dimuat</h3>
                <p className="text-muted-foreground mt-1">
                  Pilih periode dan klik "Muat Data" untuk menampilkan data
                </p>
              </div>
            </div>
          ) : data.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Tidak ada data</h3>
                <p className="text-muted-foreground mt-1">
                  Tidak ditemukan data untuk periode yang dipilih
                </p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {data.headers.map((header, index) => (
                        <th key={index} className="text-left p-3 font-semibold border-b">
                          <div className="mb-2">{header}</div>
                          <Input
                            placeholder={`Filter ${header}`}
                            value={filters.columnFilters[header] || ''}
                            onChange={(e) => handleColumnFilterChange(header, e.target.value)}
                            className="h-8 text-xs"
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData?.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b hover:bg-muted/50 transition-colors">
                        {data.headers.map((header, colIndex) => (
                          <td key={colIndex} className="p-3">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Table Footer */}
              <div className="bg-muted/30 px-4 py-3 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Menampilkan {filteredData?.rows.length} dari {data.rows.length} baris
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleExport}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>
              🔗 Terhubung dengan:{' '}
              <a 
                href="https://docs.google.com/spreadsheets/d/1XtWKO61yo5WhtsisPUNO-xsT3z1CfUF2C7B0Kbpnj88/edit?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Google Sheets Sumber Data
              </a>
            </p>
            <p>
              ⚡ Data akan otomatis mengikuti perubahan struktur sheet
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}