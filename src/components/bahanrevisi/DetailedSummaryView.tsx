/**
 * Detailed Summary View Component
 * Menampilkan chart perbandingan dan table ringkasan detail
 * Dengan fitur export ke JPEG, PDF, dan Excel
 */

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileImage, FileText, FileSpreadsheet, Loader } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, calculateRealisasi, calculatePersentaseRealisasi, formatPercentage } from '@/utils/bahanrevisi-calculations';
import { exportSummaryToJPEG, exportSummaryToPDF, exportSummaryToExcel } from '@/utils/bahanrevisi-document-export';
import SummaryChart from './SummaryChart';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface SummaryRow {
  id: string;
  name: string;
  totalSemula: number;
  totalMenjadi: number;
  totalSelisih: number;
  newItems: number;
  changedItems: number;
  totalItems: number;
  sisaAnggaran?: number;
  blokir?: number;
  realisasi?: number;
  persentaseRealisasi?: number;
}

interface DetailedSummaryViewProps {
  title: string;
  data: SummaryRow[];
  totalSemula: number;
  totalMenjadi: number;
  totalSelisih: number;
  totalSisaAnggaran?: number;
  totalRealisasi?: number;
  totalPersentaseRealisasi?: number;
  totalBlokir?: number;
  totalBaru?: number;
  totalBerubah?: number;
  totalAllItems?: number;
}

const DetailedSummaryView: React.FC<DetailedSummaryViewProps> = ({
  title,
  data,
  totalSemula,
  totalMenjadi,
  totalSelisih,
  totalSisaAnggaran = 0,
  totalRealisasi = 0,
  totalPersentaseRealisasi = 0,
  totalBlokir = 0,
  totalBaru = 0,
  totalBerubah = 0,
  totalAllItems = 0,
}) => {
  const chartAndTableRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJPEG = async () => {
    if (!chartAndTableRef.current) return;
    
    try {
      setIsExporting(true);
      toast({
        title: 'Memproses',
        description: 'Sedang menyiapkan file JPEG...',
      });

      await exportSummaryToJPEG(
        chartAndTableRef.current,
        `Ringkasan_${title.replace(/\s+/g, '_')}`
      );

      toast({
        title: 'Berhasil',
        description: 'File JPEG berhasil diunduh',
      });
    } catch (error) {
      console.error('[handleExportJPEG] Error:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: error instanceof Error ? error.message : 'Gagal mengekspor sebagai JPEG',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!chartAndTableRef.current) return;
    
    try {
      setIsExporting(true);
      toast({
        title: 'Memproses',
        description: 'Sedang menyiapkan file PDF...',
      });

      await exportSummaryToPDF(
        chartAndTableRef.current,
        `Ringkasan_${title.replace(/\s+/g, '_')}`
      );

      toast({
        title: 'Berhasil',
        description: 'File PDF berhasil diunduh',
      });
    } catch (error) {
      console.error('[handleExportPDF] Error:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: error instanceof Error ? error.message : 'Gagal mengekspor sebagai PDF',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast({
        title: 'Memproses',
        description: 'Sedang menyiapkan file Excel...',
      });

      exportSummaryToExcel(
        data,
        `Ringkasan_${title.replace(/\s+/g, '_')}`
      );

      toast({
        title: 'Berhasil',
        description: 'File Excel berhasil diunduh',
      });
    } catch (error) {
      console.error('[handleExportExcel] Error:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: error instanceof Error ? error.message : 'Gagal mengekspor sebagai Excel',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export Buttons */}
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportJPEG}
          disabled={isExporting}
          className="text-xs"
        >
          {isExporting ? (
            <Loader className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileImage className="h-4 w-4 mr-2" />
          )}
          Export JPEG
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={isExporting}
          className="text-xs"
        >
          {isExporting ? (
            <Loader className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Export PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={isExporting}
          className="text-xs font-semibold"
        >
          {isExporting ? (
            <Loader className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 mr-2" />
          )}
          Export Excel
        </Button>
      </div>

      {/* Chart and Table Container */}
      <div
        ref={chartAndTableRef}
        className="space-y-4 bg-white p-4 rounded-lg border"
      >
        {/* Chart Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              Grafik Perbandingan {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="rounded p-2">
            <SummaryChart data={data} title={title} />
          </CardContent>
        </Card>

        {/* Table Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tabel Perbandingan {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-md">
              <Table className="w-full text-xs">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="text-left py-2 px-3 font-semibold">
                      Nama
                    </TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold">
                      Jumlah Semula
                    </TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold">
                      Jumlah Menjadi
                    </TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold">
                      Selisih
                    </TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold">
                      Sisa Anggaran
                    </TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold">
                      Realisasi
                    </TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold">
                      Persentase Realisasi
                    </TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold">
                      Blokir
                    </TableHead>
                    <TableHead className="text-center py-2 px-3 font-semibold">
                      Baru
                    </TableHead>
                    <TableHead className="text-center py-2 px-3 font-semibold">
                      Berubah
                    </TableHead>
                    <TableHead className="text-center py-2 px-3 font-semibold">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, idx) => (
                    <TableRow
                      key={item.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                    >
                      <TableCell className="text-left py-2 px-3 font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right py-2 px-3">
                        {formatCurrency(item.totalSemula)}
                      </TableCell>
                      <TableCell className="text-right py-2 px-3">
                        {formatCurrency(item.totalMenjadi)}
                      </TableCell>
                      <TableCell
                        className={`text-right py-2 px-3 font-semibold ${
                          item.totalSelisih > 0
                            ? 'text-green-600'
                            : item.totalSelisih < 0
                            ? 'text-red-600'
                            : ''
                        }`}
                      >
                        {formatCurrency(item.totalSelisih)}
                      </TableCell>
                      <TableCell className="text-right py-2 px-3 text-blue-600">
                        {formatCurrency(item.sisaAnggaran || 0)}
                      </TableCell>
                      <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                        {formatCurrency(item.realisasi || 0)}
                      </TableCell>
                      <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                        {formatPercentage(item.persentaseRealisasi || 0)}
                      </TableCell>
                      <TableCell className="text-right py-2 px-3 text-orange-600">
                        {formatCurrency(item.blokir || 0)}
                      </TableCell>
                      <TableCell className="text-center py-2 px-3">
                        {item.newItems > 0 && (
                          <Badge className="bg-blue-600 text-xs">
                            {item.newItems}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-2 px-3">
                        {item.changedItems > 0 && (
                          <Badge className="bg-amber-600 text-xs">
                            {item.changedItems}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-2 px-3 font-medium">
                        {item.totalItems}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-slate-100">
                  <TableRow>
                    <TableCell className="py-2 px-3 font-bold">
                      TOTAL
                    </TableCell>
                    <TableCell className="text-right py-2 px-3 font-bold">
                      {formatCurrency(totalSemula)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-3 font-bold">
                      {formatCurrency(totalMenjadi)}
                    </TableCell>
                    <TableCell
                      className={`text-right py-2 px-3 font-bold ${
                        totalSelisih > 0
                          ? 'text-green-600'
                          : totalSelisih < 0
                          ? 'text-red-600'
                          : ''
                      }`}
                    >
                      {formatCurrency(totalSelisih)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-3 font-bold text-blue-600">
                      {formatCurrency(totalSisaAnggaran)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-3 font-bold text-purple-600">
                      {formatCurrency(totalRealisasi)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-3 font-bold text-purple-600">
                      {formatPercentage(totalPersentaseRealisasi)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-3 font-bold text-orange-600">
                      {formatCurrency(totalBlokir)}
                    </TableCell>
                    <TableCell className="text-center py-2 px-3 font-bold">
                      {totalBaru}
                    </TableCell>
                    <TableCell className="text-center py-2 px-3 font-bold">
                      {totalBerubah}
                    </TableCell>
                    <TableCell className="text-center py-2 px-3 font-bold">
                      {totalAllItems}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DetailedSummaryView;
