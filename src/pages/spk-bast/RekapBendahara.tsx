'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Filter, RefreshCw, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

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

interface GoogleSheetsResponse {
  success: boolean;
  data: SheetData;
  error?: string;
}

// Ganti dengan URL Google Apps Script Anda setelah deploy
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

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
      let sheetName = '';
      if (filters.periodType === 'monthly') {
        sheetName = filters.selectedMonth;
      } else {
        sheetName = 'REKAP-KEGIATAN';
      }

      // Fetch data dari Google Apps Script
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: GoogleSheetsResponse = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Gagal memuat data dari Google Sheets');
      }
    } catch (err) {
      console.error('Error loading data:', err);
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
    
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => data.headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-bendahara-${data.sheetName}-${new Date().toISOString().split('T')[0]}.csv`;
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
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Terhubung dengan Google Sheets
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://docs.google.com/spreadsheets/d/1XtWKO61yo5WhtsisPUNO-xsT3z1CfUF2C7B0Kbpnj88/edit?gid=349886725#gid=349886725" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Buka Sheets
            </a>
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Kontrol Data
          </CardTitle>
          <CardDescription>
            Pilih periode dan muat data langsung dari Google Sheets
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
                {' | '}
                <strong>Spreadsheet:</strong> AKI Rekap Bendahara
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
            Data langsung dari Google Sheets - Header menyesuaikan struktur sheet secara otomatis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Memuat data dari Google Sheets...</p>
              <p className="text-sm text-muted-foreground">Sheet: {filters.periodType === 'monthly' ? filters.selectedMonth : 'REKAP-KEGIATAN'}</p>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Download className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Data belum dimuat</h3>
                <p className="text-muted-foreground mt-1">
                  Pilih periode dan klik "Muat Data" untuk menampilkan data langsung dari Google Sheets
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
                  Tidak ditemukan data untuk sheet {data.sheetName}
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
                          <div className="mb-2 text-foreground">{header}</div>
                          <Input
                            placeholder={`Filter ${header}`}
                            value={filters.columnFilters[header] || ''}
                            onChange={(e) => handleColumnFilterChange(header, e.target.value)}
                            className="h-8 text-xs bg-background"
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
                    {Object.keys(filters.columnFilters).some(key => filters.columnFilters[key]) && 
                      ' (difilter)'}
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

      {/* Integration Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Instruksi Integrasi Google Sheets
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Langkah 1: Deploy Google Apps Script</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Buka <a href="https://script.google.com" target="_blank" className="underline">script.google.com</a></li>
                <li>Buat project baru</li>
                <li>Copy-paste kode Google Apps Script</li>
                <li>Deploy sebagai Web App</li>
                <li>Set access ke "Anyone"</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Langkah 2: Konfigurasi URL</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Copy URL deployment Google Apps Script</li>
                <li>Ganti <code>YOUR_SCRIPT_ID</code> di kode dengan URL Anda</li>
                <li>Save dan reload halaman ini</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}