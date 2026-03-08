import React, { useMemo, useState, useRef, useCallback } from 'react';
import BahanRevisiUploadBulanan from './BahanRevisiUploadBulanan';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RPDItem, Program, Kegiatan, RincianOutput, KomponenOutput, SubKomponen, Akun, BudgetItem } from '@/types/bahanrevisi';
import { FixedSizeList as List } from 'react-window';
import { formatCurrency, formatCurrencyNoRp, calculateBudgetSummaryByKelompokAkun, calculateBudgetSummaryByKelompokBelanja } from '@/utils/bahanrevisi-calculations';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import BahanRevisiUploadRPD from './BahanRevisiUploadRPD';

const months = ['jan','feb','mar','apr','mei','jun','jul','aug','sep','oct','nov','dec'];
const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

type SummaryViewType =
  | 'realisasi'
  | 'proyeksi'
  | 'program_pembebanan'
  | 'kegiatan'
  | 'rincian_output'
  | 'komponen_output'
  | 'sub_komponen'
  | 'akun'
  | 'akun_group'
  | 'account_group';

interface GroupedRow {
  id: string;
  key: string;
  name: string;
  months: Record<string, number>;
  total: number;
  total_pagu: number;
  sisa_anggaran: number;
  blokir: number;
  itemCount: number;
}

interface Props {
  items: RPDItem[];
  budgetItems?: BudgetItem[];
  programs?: Program[];
  kegiatans?: Kegiatan[];
  rincianOutputs?: RincianOutput[];
  komponenOutputs?: KomponenOutput[];
  subKomponen?: SubKomponen[];
  akuns?: Akun[];
  sheetId?: string | null;
  onUploadRPD?: () => Promise<void>;
  onRefresh?: () => void;
}

const BahanRevisiProyeksiBulananSubtab: React.FC<Props> = ({
  items = [],
  budgetItems = [],
  programs = [],
  kegiatans = [],
  rincianOutputs = [],
  komponenOutputs = [],
  subKomponen = [],
  akuns = [],
  sheetId,
  onUploadRPD,
}) => {
  const { user } = useAuth();
  const [summaryView, setSummaryView] = useState<SummaryViewType>('realisasi');
  const [qaResult, setQaResult] = useState<{ budgetTotal: number; proyeksiTotal: number; diff: number } | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetailGroup, setSelectedDetailGroup] = useState<GroupedRow | null>(null);
  const [selectedDetailItems, setSelectedDetailItems] = useState<RPDItem[]>([]);
  const [detailsModalCurrentPage, setDetailsModalCurrentPage] = useState(0);
  const itemsPerPage = 20;

  // Name maps to match Ringkasan behavior
  const programNameMap = useMemo(() => Object.fromEntries(programs.map(p => [p.id, `${p.id} - ${p.name}`])), [programs]);
  const kegiatanNameMap = useMemo(() => Object.fromEntries(kegiatans.map(k => [k.id, `${k.id} - ${k.name}`])), [kegiatans]);
  const rincianNameMap = useMemo(() => Object.fromEntries(rincianOutputs.map(r => [r.id, `${r.id} - ${r.name}`])), [rincianOutputs]);
  const komponenNameMap = useMemo(() => Object.fromEntries(komponenOutputs.map(k => [k.id, `${k.id} - ${k.name}`])), [komponenOutputs]);
  const subKomponenNameMap = useMemo(() => Object.fromEntries(subKomponen.map(s => [s.id, `${s.id} - ${s.name}`])), [subKomponen]);
  const akunNameMap = useMemo(() => Object.fromEntries(akuns.map(a => [a.id, `${a.id} - ${a.name}`])), [akuns]);

  const formatName = (code: string | undefined, type: string) => {
    if (!code) return 'Unknown';
    switch (type) {
      case 'program': return programNameMap[code] || code;
      case 'kegiatan': return kegiatanNameMap[code] || code;
      case 'rincian_output': {
        const rincian = rincianOutputs.find(r => r.code === code);
        return rincian ? `${rincian.code} - ${rincian.name}` : code;
      }
      case 'komponen_output': return komponenNameMap[code] || code;
      case 'sub_komponen': return subKomponenNameMap[code] || code;
      case 'akun': return akunNameMap[code] || code;
      default: return code;
    }
  };

  const getCombinedPembebanan = (it: RPDItem) => {
    return [it.program_pembebanan, it.komponen_output, it.sub_komponen, it.akun].filter(Boolean).join('.');
  };

  const getSisaColor = (value: number) => {
    return value === 0 ? 'text-black' : 'text-red-600';
  };

  const aggregateBy = (field: keyof RPDItem) => {
    const map = new Map<string, GroupedRow>();
    items.forEach(item => {
      const key = String(item[field] || 'Unknown');
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          key,
          name: key,
          months: Object.fromEntries(months.map(m => [m, 0])) as Record<string, number>,
          total: 0,
          total_pagu: 0,
          sisa_anggaran: 0,
          blokir: 0,
          itemCount: 0
        });
      }
      const row = map.get(key)!;
      months.forEach(m => {
        const v = Number((item as any)[m] || 0) || 0;
        row.months[m] += v;
        row.total += v;
      });
      row.total_pagu += Number(item.total_pagu || 0) || 0;
      row.sisa_anggaran += Number(item.sisa_anggaran || 0) || 0;
      row.blokir += Number(item.blokir || 0) || 0;
      row.itemCount += 1;
    });

    return Array.from(map.values()).map(r => ({
      ...r,
      name:
        field === 'program_pembebanan' ? formatName(r.key, 'program') :
        field === 'kegiatan' ? formatName(r.key, 'kegiatan') :
        field === 'komponen_output' ? formatName(r.key, 'komponen_output') :
        field === 'sub_komponen' ? formatName(r.key, 'sub_komponen') :
        field === 'akun' ? formatName(r.key, 'akun') :
        r.key
    }));
  };

  const getSummaryData = () => {
    switch (summaryView) {
      case 'program_pembebanan': return aggregateBy('program_pembebanan');
      case 'kegiatan': return aggregateBy('kegiatan');
      case 'rincian_output': {
        // Extract rincian_output code from komponen_output code (XXXX.XXX.NNN -> XXXX.XXX)
        const map = new Map<string, GroupedRow>();
        items.forEach(item => {
          const komponenCode = String(item.komponen_output || 'Unknown');
          // Extract first 2 parts (XXXX.XXX) from komponen code (XXXX.XXX.NNN)
          const rincianCode = komponenCode.split('.').slice(0, 2).join('.') || 'Unknown';
          
          if (!map.has(rincianCode)) {
            const rincian = rincianOutputs.find(r => r.code === rincianCode);
            map.set(rincianCode, {
              id: rincianCode,
              key: rincianCode,
              name: rincian ? `${rincian.code} - ${rincian.name}` : rincianCode,
              months: Object.fromEntries(months.map(m => [m, 0])) as Record<string, number>,
              total: 0,
              total_pagu: 0,
              sisa_anggaran: 0,
              blokir: 0,
              itemCount: 0
            });
          }
          const row = map.get(rincianCode)!;
          months.forEach(m => {
            const v = Number((item as any)[m] || 0) || 0;
            row.months[m] += v;
            row.total += v;
          });
          row.total_pagu += Number(item.total_pagu || 0) || 0;
          row.sisa_anggaran += Number(item.sisa_anggaran || 0) || 0;
          row.blokir += Number(item.blokir || 0) || 0;
          row.itemCount += 1;
        });
        return Array.from(map.values());
      }
      case 'komponen_output': return aggregateBy('komponen_output');
      case 'sub_komponen': return aggregateBy('sub_komponen');
      case 'akun': return aggregateBy('akun');
      case 'akun_group': {
        const summaryByKelompokAkun = calculateBudgetSummaryByKelompokAkun(budgetItems);
        const map = new Map<string, GroupedRow>();
        items.forEach(item => {
          const akun = String(item.akun || 'Unknown');
          const key = akun.slice(0,3) || 'Unknown';
          if (!map.has(key)) {
            const summary = summaryByKelompokAkun.find(s => s.akun === key);
            map.set(key, {
              id: key,
              key,
              name: summary?.name || key,
              months: Object.fromEntries(months.map(m => [m, 0])) as Record<string, number>,
              total: 0,
              total_pagu: 0,
              sisa_anggaran: 0,
              blokir: 0,
              itemCount: 0
            });
          }
          const row = map.get(key)!;
          months.forEach(m => {
            const v = Number((item as any)[m] || 0) || 0;
            row.months[m] += v;
            row.total += v;
          });
          row.total_pagu += Number(item.total_pagu || 0) || 0;
          row.sisa_anggaran += Number(item.sisa_anggaran || 0) || 0;
          row.blokir += Number(item.blokir || 0) || 0;
          row.itemCount += 1;
        });
        return Array.from(map.values());
      }
      case 'account_group': {
        const summaryByKelompokBelanja = calculateBudgetSummaryByKelompokBelanja(budgetItems);
        const map = new Map<string, GroupedRow>();
        items.forEach(item => {
          const akun = String(item.akun || 'Unknown');
          const key = akun.slice(0,2) || 'Unknown';
          if (!map.has(key)) {
            const summary = summaryByKelompokBelanja.find(s => s.akun === key);
            map.set(key, {
              id: key,
              key,
              name: summary?.name || key,
              months: Object.fromEntries(months.map(m => [m, 0])) as Record<string, number>,
              total: 0,
              total_pagu: 0,
              sisa_anggaran: 0,
              blokir: 0,
              itemCount: 0
            });
          }
          const row = map.get(key)!;
          months.forEach(m => {
            const v = Number((item as any)[m] || 0) || 0;
            row.months[m] += v;
            row.total += v;
          });
          row.total_pagu += Number(item.total_pagu || 0) || 0;
          row.sisa_anggaran += Number(item.sisa_anggaran || 0) || 0;
          row.blokir += Number(item.blokir || 0) || 0;
          row.itemCount += 1;
        });
        return Array.from(map.values());
      }
      case 'realisasi':
      default:
        return items.map(it => ({
          id: it.id,
          key: it.id,
          name: getCombinedPembebanan(it) || `${formatName(it.program_pembebanan || '', 'program')} / ${formatName(it.kegiatan || '', 'kegiatan')}` || it.id,
          months: Object.fromEntries(months.map(m => [m, Number((it as any)[m] || 0) || 0])) as Record<string, number>,
          total: months.reduce((s, m) => s + (Number((it as any)[m] || 0) || 0), 0),
          total_pagu: Number(it.total_pagu || 0) || 0,
          sisa_anggaran: Number(it.sisa_anggaran || 0) || 0,
          blokir: Number(it.blokir || 0) || 0,
          itemCount: 1
        }));
    }
  };

  const data = useMemo(() => getSummaryData(), [items, summaryView]);

  // Function to get detail items for a selected group
  const getDetailItems = (group: GroupedRow) => {
    let filtered: RPDItem[] = [];
    
    switch (summaryView) {
      case 'program_pembebanan':
        filtered = items.filter(item => String(item.program_pembebanan || '') === group.key);
        break;
      case 'kegiatan':
        filtered = items.filter(item => String(item.kegiatan || '') === group.key);
        break;
      case 'rincian_output':
        // Extract rincian code from komponen code
        filtered = items.filter(item => {
          const komponenCode = String(item.komponen_output || '');
          const rincianCode = komponenCode.split('.').slice(0, 2).join('.') || '';
          return rincianCode === group.key;
        });
        break;
      case 'komponen_output':
        filtered = items.filter(item => String(item.komponen_output || '') === group.key);
        break;
      case 'sub_komponen':
        filtered = items.filter(item => String(item.sub_komponen || '') === group.key);
        break;
      case 'akun':
        filtered = items.filter(item => String(item.akun || '') === group.key);
        break;
      case 'akun_group':
        // Filter by first 3 chars of akun code
        filtered = items.filter(item => {
          const akun = String(item.akun || '');
          return akun.slice(0, 3) === group.key;
        });
        break;
      case 'account_group':
        // Filter by first 2 chars of akun code
        filtered = items.filter(item => {
          const akun = String(item.akun || '');
          return akun.slice(0, 2) === group.key;
        });
        break;
      default:
        filtered = items;
    }
    
    return filtered;
  };

  const handleRowClick = (group: GroupedRow) => {
    const detailItems = getDetailItems(group);
    setSelectedDetailGroup(group);
    setSelectedDetailItems(detailItems);
    setDetailsModalCurrentPage(0);
    setIsDetailsModalOpen(true);
  };

  // Prepare data for horizontal bar chart (top performers)
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => (b.total || 0) - (a.total || 0));
    return sorted.slice(0, 10).map(item => ({
      name: item.name.length > 30 ? `${item.name.substring(0, 28)}...` : item.name,
      fullName: item.name,
      total: item.total,
      total_pagu: item.total_pagu,
      sisa: item.sisa_anggaran
    }));
  }, [data]);

  // Prepare data for monthly trend chart
  const monthlyChartData = useMemo(() => {
    const monthlyData = months.map((m, idx) => ({
      name: monthNames[idx],
      month: m,
      total: data.reduce((sum, row) => sum + (row.months[m] || 0), 0)
    }));
    
    // Add cumulative data
    return monthlyData.map((item, idx) => ({
      ...item,
      cumulative: monthlyData.slice(0, idx + 1).reduce((sum, d) => sum + d.total, 0)
    }));
  }, [data]);

  const tableRef = useRef<HTMLDivElement | null>(null);

  // Export helpers using SheetJS and html2canvas + jsPDF
  const downloadExcel = () => {
    const headers = ['Nama', 'Total Pagu', ...monthNames, 'Total RPD', 'Sisa'];
    const wsData: any[][] = [headers];
    data.forEach(d => {
      wsData.push([d.name, d.total_pagu || 0, ...months.map(m => d.months[m] || 0), d.total || 0, d.sisa_anggaran || 0]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Realisasi');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `realisasi-bulanan-${summaryView}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    if (!tableRef.current) return;
    const el = tableRef.current;
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'pt', 'a4');
    const imgProps = (pdf as any).getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`realisasi-bulanan-${summaryView}.pdf`);
  };

  const downloadJPEG = async () => {
    if (!tableRef.current) return;
    const canvas = await html2canvas(tableRef.current, { scale: 2 });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `realisasi-bulanan-${summaryView}.jpg`;
    a.click();
  };

  const renderProyeksiSummary = () => {
    const totalBudget = budgetItems?.reduce((s, b) => s + (Number((b as any).jumlah_menjadi) || 0), 0) || 0;
    const totalYear = data.reduce((s, r) => s + (r.total || 0), 0);
    const sisaAnggaran = totalBudget - totalYear;
    const persentaseSerapan = totalBudget > 0 ? Math.round((totalYear / totalBudget) * 10000) / 100 : 0;
    
    const monthTotals = months.map((m, idx) => ({ 
      m, 
      idx,
      name: monthNames[idx],
      total: data.reduce((s, r) => s + (r.months[m] || 0), 0) 
    }));
    
    // Bulan dominan (top 3)
    const dominantMonths = monthTotals.slice().sort((a, b) => b.total - a.total).slice(0, 3);
    
    // Hitung insight otomatis
    const monthsWithZero = monthTotals.filter(m => m.total === 0).length;
    const hasExtremePeak = monthTotals.some(m => m.total > totalYear * 0.3); // Lebih dari 30% dalam satu bulan
    const absorbedPercentage = persentaseSerapan;
    
    // Alert conditions
    const hasLowAbsorption = absorbedPercentage < 10;
    const hasManyZeroMonths = monthsWithZero > 6;
    const needsAttention = hasLowAbsorption || hasManyZeroMonths;

    return (
      <div className="w-full space-y-4">
        {/* Ringkasan Umum */}
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-4">Ringkasan Realisasi Bulanan</h2>
              <p className="text-sm text-blue-900 leading-relaxed">
                Total pagu anggaran sebesar <strong className="text-blue-700">{formatCurrencyNoRp(totalBudget)}</strong>.
              </p>
              <p className="text-sm text-blue-900 leading-relaxed mt-2">
                Sampai dengan periode berjalan, total realisasi pengeluaran dana (RPD) tercatat sebesar <strong className="text-blue-700">{formatCurrencyNoRp(totalYear)}</strong> atau <strong className="text-blue-700">{persentaseSerapan.toFixed(2)}%</strong> dari total pagu.
              </p>
              <p className="text-sm text-blue-900 leading-relaxed mt-2">
                Sisa anggaran yang belum direalisasikan sebesar <strong className="text-blue-700">{formatCurrencyNoRp(sisaAnggaran)}</strong>.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Kondisi Serapan */}
        <Card className="bg-slate-50/50 border-slate-200">
          <CardContent className="pt-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Kondisi Serapan / Realisasi</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              Realisasi pengeluaran dana masih tergolong{' '}
              <strong className={absorbedPercentage > 20 ? 'text-green-600' : absorbedPercentage > 10 ? 'text-amber-600' : 'text-red-600'}>
                {absorbedPercentage > 20 ? 'sehat' : absorbedPercentage > 10 ? 'cukup' : 'rendah'}
              </strong>{' '}
              dibandingkan total pagu. Realisasi terbesar terjadi pada{' '}
              <strong>{dominantMonths[0]?.name || 'bulan tidak tersedia'}</strong>
              {monthsWithZero > 0 && (
                <>, sementara <strong>{monthsWithZero} bulan</strong> lainnya masih menunjukkan nilai realisasi Rp 0</>
              )}.
            </p>
          </CardContent>
        </Card>

        {/* Bulan dengan Proyeksi Tertinggi - Semua 12 Bulan */}
        <Card className="bg-green-50/50 border-green-100">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-green-900 mb-4">Bulan dengan Realisasi Tertinggi (Semua 12 Bulan)</h3>
            
            <div className="grid grid-cols-3 gap-4">
              {(() => {
                // Sort semua 12 bulan dari tertinggi ke terendah
                const allMonthsSorted = monthTotals.slice().sort((a, b) => b.total - a.total);
                
                // Split into 3 columns vertically: col1=[1-4], col2=[5-8], col3=[9-12]
                const itemsPerCol = 4;
                const columns = [
                  allMonthsSorted.slice(0, itemsPerCol),
                  allMonthsSorted.slice(itemsPerCol, itemsPerCol * 2),
                  allMonthsSorted.slice(itemsPerCol * 2, itemsPerCol * 3),
                ];

                const formatCurrencyIndonesia = (value: number) => {
                  return 'Rp ' + Math.round(value).toLocaleString('id-ID').replace(/,/g, '.');
                };

                return columns.map((col, colIdx) => (
                  <div key={colIdx} className="space-y-3">
                    {col.map((month, idx) => {
                      const globalIndex = colIdx * itemsPerCol + idx;
                      const percentage = totalBudget > 0 
                        ? ((month.total / totalBudget) * 100).toFixed(1) 
                        : '0.0';
                      
                      return (
                        <div 
                          key={month.m} 
                          className="flex items-center justify-between p-3 bg-white rounded border border-green-200 hover:border-green-400 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-bold text-green-700">
                              {globalIndex + 1}. {month.name}
                            </div>
                            <div className="text-xs text-gray-700 mt-1 font-semibold">
                              {formatCurrencyIndonesia(month.total)}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-green-900 ml-2 whitespace-nowrap">
                            ({percentage}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Alert dan Insight */}
        {needsAttention && (
          <Card className="bg-amber-50/50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900 mb-2">Catatan Perhatian</h3>
                  <ul className="text-sm text-amber-900 space-y-2 list-disc list-inside">
                    {hasLowAbsorption && (
                      <li>Serapan anggaran masih sangat rendah ({persentaseSerapan.toFixed(2)}%). Disarankan agar unit terkait segera meninjau rencana penarikan dana.</li>
                    )}
                    {hasManyZeroMonths && (
                      <li>Sebagian besar alokasi anggaran belum memiliki rencana penarikan dana. Disarankan agar unit terkait segera menyusun RPD untuk menghindari penumpukan realisasi di akhir tahun.</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Risiko Realisasi */}
        <Card className="bg-red-50/50 border-red-100">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-red-900 mb-3">Risiko Realisasi yang Perlu Diperhatikan</h3>
            <ul className="text-sm text-red-900 space-y-2 list-disc list-inside">
              <li>Potensi penundaan realisasi jika distribusi pengeluaran aktual tidak sesuai dengan rencana</li>
              {(monthsWithZero > 6 || dominantMonths[0]?.total > totalYear * 0.4) && (
                <li>Penumpukan pengeluaran pada bulan-bulan tertentu dapat menyebabkan ketidakseimbangan dalam serapan anggaran</li>
              )}
              <li>Ketidakseimbangan distribusi realisasi bulanan yang dapat mempengaruhi likuiditas operasional</li>
              {sisaAnggaran > totalBudget * 0.5 && (
                <li>Proporsi anggaran yang belum direalisasikan cukup besar, memerlukan akselerasi dalam pengeluaran</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  };
    const runQaCompare = () => {
      const proyeksiTotal = data.reduce((s, r) => s + (r.total || 0), 0);
      const budgetTotal = (budgetItems || []).reduce((s, b) => s + (Number((b as any).jumlah_menjadi) || 0), 0);
      const diff = budgetTotal - proyeksiTotal;
      setQaResult({ budgetTotal, proyeksiTotal, diff });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Realisasi Bulanan</h2>

      {/* Button Navigation */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-lg border">
        <Button variant={summaryView === 'realisasi' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('realisasi')} className="text-xs">Ringkasan Realisasi Bulanan</Button>
        <Button variant={summaryView === 'program_pembebanan' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('program_pembebanan')} className="text-xs">Program Pembebanan</Button>
        <Button variant={summaryView === 'kegiatan' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('kegiatan')} className="text-xs">Kegiatan</Button>
        <Button variant={summaryView === 'rincian_output' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('rincian_output')} className="text-xs">Rincian Output</Button>
        <Button variant={summaryView === 'komponen_output' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('komponen_output')} className="text-xs">Komponen Output</Button>
        <Button variant={summaryView === 'sub_komponen' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('sub_komponen')} className="text-xs">Sub Komponen</Button>
        <Button variant={summaryView === 'akun' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('akun')} className="text-xs">Akun</Button>
        <Button variant={summaryView === 'akun_group' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('akun_group')} className="text-xs">Kelompok Akun</Button>
        <Button variant={summaryView === 'account_group' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('account_group')} className="text-xs">Kelompok Belanja</Button>
      </div>

      {/* Export Buttons - Only for Pejabat Pembuat Komitmen Role */}
      {user?.role && user.role.toLowerCase().includes('pejabat pembuat komitmen') && (
        <div className="flex justify-end items-center gap-1 bg-transparent">
          {sheetId && (
            <BahanRevisiUploadRPD
              existingRPDItems={items}
              onUploadSuccess={async (newItems, updatedItems) => {
                // Call parent's refresh callback if available
                if (onUploadRPD) {
                  await onUploadRPD();
                }
              }}
              sheetId={sheetId}
            />
          )}
          <Button size="sm" variant="ghost" onClick={() => runQaCompare()} className="text-xs px-2 py-1 h-auto hover:bg-slate-100">QA Compare</Button>
          <Button size="sm" variant="ghost" onClick={() => downloadJPEG()} className="text-xs px-2 py-1 h-auto hover:bg-slate-100">Export JPEG</Button>
          <Button size="sm" variant="ghost" onClick={() => downloadPDF()} className="text-xs px-2 py-1 h-auto hover:bg-slate-100">Export PDF</Button>
          <Button size="sm" variant="ghost" onClick={() => downloadExcel()} className="text-xs px-2 py-1 h-auto hover:bg-slate-100">Export Excel</Button>
        </div>
      )}

      {qaResult && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Hasil QA Perbandingan</div>
                <div className="text-xs text-slate-700">Total Budget (jumlah_menjadi): {formatCurrencyNoRp(qaResult.budgetTotal)}</div>
                <div className="text-xs text-slate-700">Total Proyeksi (RPD): {formatCurrencyNoRp(qaResult.proyeksiTotal)}</div>
                <div className={`text-xs font-semibold ${qaResult.diff === 0 ? 'text-green-600' : 'text-red-600'}`}>Selisih: {formatCurrencyNoRp(qaResult.diff)}</div>
              </div>
              <div>
                <Button size="sm" variant="outline" onClick={() => setQaResult(null)}>Tutup</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {summaryView === 'realisasi' ? (
        renderProyeksiSummary()
      ) : (
        <div className="space-y-4">
          {/* Chart Section - Grafik di atas */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Visualisasi Proyeksi</h3>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  <span>Data tidak tersedia untuk visualisasi</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Timeline Chart - Semua view */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 mb-2">Proyeksi Penarikan Dana per Bulan</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={monthlyChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => formatCurrencyNoRp(Number(value))} />
                        <Legend />
                        <Bar dataKey="total" fill="#3b82f6" name="Proyeksi Bulanan" radius={[8, 8, 0, 0]} />
                        <Line type="monotone" dataKey="cumulative" stroke="#ef4444" name="Kumulatif" strokeWidth={2} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Items Horizontal Bar Chart */}
                  {chartData.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-700 mb-2">Top 10 {summaryView.charAt(0).toUpperCase() + summaryView.slice(1).replace(/_/g, ' ')}</h4>
                      <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 25)}>
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 300, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" width={295} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value) => formatCurrencyNoRp(Number(value))} />
                          <Legend />
                          <Bar dataKey="total" fill="#10b981" name="Total RPD" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table Section - Tabel di bawah */}
          <Card>
            <CardContent>
            <div ref={tableRef} className="overflow-x-auto border rounded-md">
              {data.length > 300 ? (
                <div className="w-full text-xs">
                  <div className="grid grid-cols-[2fr,120px_repeat(12,120px),120px,120px] gap-0 bg-slate-100/50">
                    <div className="py-2 px-3 font-semibold">Nama</div>
                    <div className="py-2 px-3 text-right font-semibold">Total Pagu</div>
                    {monthNames.map((mn) => (
                      <div key={mn} className="py-2 px-3 text-right font-semibold">{mn}</div>
                    ))}
                    <div className="py-2 px-3 text-right font-semibold">Total RPD</div>
                    <div className="py-2 px-3 text-right font-semibold">Sisa</div>
                  </div>
                    <div style={{ height: 400 }}>
                    <List
                      height={400}
                      itemCount={data.length}
                      itemSize={40}
                      width={'100%'}
                    >{({ index, style }) => {
                      const row = data[index];
                      return (
                        <div 
                          style={style} 
                          className={`${index % 2 === 0 ? '' : 'bg-slate-50'} grid grid-cols-[2fr,120px_repeat(12,120px),120px,120px] items-center cursor-pointer hover:bg-blue-50`}
                          onClick={() => handleRowClick(row)}
                        >
                              <div className="text-left py-2 px-3 font-medium">{row.name}</div>
                              <div className="py-2 px-3 text-right text-blue-600">{formatCurrencyNoRp(row.total_pagu || 0)}</div>
                          {months.map(m => (
                            <div key={`${row.id}-${m}`} className="py-2 px-3 text-right">{formatCurrencyNoRp(row.months[m] || 0)}</div>
                          ))}
                              <div className="py-2 px-3 text-right font-semibold text-blue-600">{formatCurrencyNoRp(row.total)}</div>
                              <div className={`py-2 px-3 text-right ${getSisaColor(row.sisa_anggaran || 0)}`}>{formatCurrencyNoRp(row.sisa_anggaran || 0)}</div>
                        </div>
                      );
                    }}</List>
                  </div>
                  <div className="grid grid-cols-[2fr,120px_repeat(12,120px),120px,120px] font-bold">
                    <div className="py-2 px-3">Total</div>
                    <div className="py-2 px-3 text-right text-blue-600">{formatCurrencyNoRp(data.reduce((s, r) => s + (r.total_pagu || 0), 0))}</div>
                    {months.map((m) => (
                      <div key={`total-${m}`} className="py-2 px-3 text-right">{formatCurrencyNoRp(data.reduce((s, r) => s + (r.months[m] || 0), 0))}</div>
                    ))}
                    <div className="py-2 px-3 text-right text-blue-600">{formatCurrencyNoRp(data.reduce((s, r) => s + (r.total || 0), 0))}</div>
                    <div className={`py-2 px-3 text-right ${getSisaColor(data.reduce((s, r) => s + (r.sisa_anggaran || 0), 0))}`}>{formatCurrencyNoRp(data.reduce((s, r) => s + (r.sisa_anggaran || 0), 0))}</div>
                  </div>
                </div>
              ) : (
                <Table className="w-full text-xs">
                  <TableHeader className="bg-slate-100/50">
                    <TableRow>
                      <TableHead className="text-left py-2 px-3 font-semibold">Nama</TableHead>
                      <TableHead className="text-right py-2 px-3 font-semibold">Total Pagu</TableHead>
                      {months.map((m, i) => (
                        <TableHead key={m} className="text-right py-2 px-3 font-semibold">{monthNames[i]}</TableHead>
                      ))}
                      <TableHead className="text-right py-2 px-3 font-semibold">Total RPD</TableHead>
                      <TableHead className="text-right py-2 px-3 font-semibold">Sisa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, idx) => (
                      <TableRow 
                        key={row.id || row.key} 
                        className={`${idx % 2 === 0 ? '' : 'bg-slate-50'} cursor-pointer hover:bg-blue-50 hover:shadow-sm transition-colors`}
                        onClick={() => handleRowClick(row)}
                      >
                        <TableCell className="text-left py-2 px-3 font-medium">{row.name}</TableCell>
                        <TableCell className="text-right py-2 px-3 text-blue-600">{formatCurrencyNoRp(row.total_pagu || 0)}</TableCell>
                        {months.map(m => (
                          <TableCell key={`${row.id}-${m}`} className="text-right py-2 px-3">{formatCurrencyNoRp(row.months[m] || 0)}</TableCell>
                        ))}
                        <TableCell className="text-right py-2 px-3 font-semibold text-blue-600">{formatCurrencyNoRp(row.total)}</TableCell>
                        <TableCell className={`text-right py-2 px-3 ${getSisaColor(row.sisa_anggaran || 0)}`}>{formatCurrencyNoRp(row.sisa_anggaran || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                      <TableRow className="font-bold">
                      <TableCell className="py-2 px-3">Total</TableCell>
                      <TableCell className="text-right py-2 px-3 text-blue-600">{formatCurrencyNoRp(data.reduce((s, r) => s + (r.total_pagu || 0), 0))}</TableCell>
                      {months.map((m) => (
                        <TableCell key={`total-${m}`} className="text-right py-2 px-3">{formatCurrencyNoRp(data.reduce((s, r) => s + (r.months[m] || 0), 0))}</TableCell>
                      ))}
                      <TableCell className="text-right py-2 px-3 text-blue-600">{formatCurrencyNoRp(data.reduce((s, r) => s + (r.total || 0), 0))}</TableCell>
                      <TableCell className={`text-right py-2 px-3 ${getSisaColor(data.reduce((s, r) => s + (r.sisa_anggaran || 0), 0))}`}>{formatCurrencyNoRp(data.reduce((s, r) => s + (r.sisa_anggaran || 0), 0))}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Detail Items Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detail Uraian - {selectedDetailGroup?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedDetailItems && selectedDetailItems.length > 0 ? (
            <div className="flex flex-col gap-4 flex-1 overflow-hidden">
              {/* Scrollable table container with sticky header and column */}
              <div className="flex-1 overflow-auto relative bg-white">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      {/* Sticky header - Uraian column */}
                      <th className="sticky left-0 top-0 z-20 text-left py-2 px-3 font-semibold min-w-[350px] bg-slate-100 border-b border-slate-200">
                        Uraian
                      </th>
                      {/* Sticky header - other columns */}
                      <th className="sticky top-0 z-10 text-right py-2 px-3 font-semibold bg-slate-100 border-b border-slate-200 whitespace-nowrap">
                        Total Pagu
                      </th>
                      {months.map((m, i) => (
                        <th key={m} className="sticky top-0 z-10 text-right py-2 px-3 font-semibold bg-slate-100 border-b border-slate-200 whitespace-nowrap">
                          {monthNames[i]}
                        </th>
                      ))}
                      <th className="sticky top-0 z-10 text-right py-2 px-3 font-semibold bg-slate-100 border-b border-slate-200 whitespace-nowrap">
                        Total RPD
                      </th>
                      <th className="sticky top-0 z-10 text-right py-2 px-3 font-semibold bg-slate-100 border-b border-slate-200 whitespace-nowrap">
                        Sisa
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).map((item, idx) => (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? '' : 'bg-slate-50'}>
                        {/* Sticky first column */}
                        <td className={`sticky left-0 z-5 text-left py-2 px-3 font-medium min-w-[350px] border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                          {item.uraian || 'N/A'}
                        </td>
                        <td className="text-right py-2 px-3 text-blue-600 border-b border-slate-200 whitespace-nowrap">
                          {formatCurrencyNoRp(item.total_pagu || 0)}
                        </td>
                        {months.map(m => (
                          <td key={`${item.id}-${m}`} className="text-right py-2 px-3 border-b border-slate-200 whitespace-nowrap">
                            {formatCurrencyNoRp(Number((item as any)[m] || 0) || 0)}
                          </td>
                        ))}
                        <td className="text-right py-2 px-3 font-semibold text-blue-600 border-b border-slate-200 whitespace-nowrap">
                          {formatCurrencyNoRp(months.reduce((s, m) => s + (Number((item as any)[m] || 0) || 0), 0))}
                        </td>
                        <td className={`text-right py-2 px-3 border-b border-slate-200 whitespace-nowrap ${getSisaColor(item.sisa_anggaran || 0)}`}>
                          {formatCurrencyNoRp(item.sisa_anggaran || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-slate-50 border-t border-slate-300">
                      <td className="sticky left-0 z-5 py-2 px-3 min-w-[350px] bg-slate-50">
                        Total (halaman)
                      </td>
                      <td className="text-right py-2 px-3 text-blue-600 whitespace-nowrap">
                        {formatCurrencyNoRp(selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + (Number(item.total_pagu || 0) || 0), 0))}
                      </td>
                      {months.map((m) => (
                        <td key={`total-${m}`} className="text-right py-2 px-3 whitespace-nowrap">
                          {formatCurrencyNoRp(selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + (Number((item as any)[m] || 0) || 0), 0))}
                        </td>
                      ))}
                      <td className="text-right py-2 px-3 text-blue-600 whitespace-nowrap">
                        {formatCurrencyNoRp(selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + months.reduce((sm, m) => sm + (Number((item as any)[m] || 0) || 0), 0), 0))}
                      </td>
                      <td className={`text-right py-2 px-3 whitespace-nowrap ${getSisaColor(selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + (Number(item.sisa_anggaran || 0) || 0), 0))}`}>
                        {formatCurrencyNoRp(selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + (Number(item.sisa_anggaran || 0) || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="border-t pt-4 flex items-center justify-between">
                <div className="text-xs text-slate-600">
                  Menampilkan {Math.min((detailsModalCurrentPage + 1) * itemsPerPage, selectedDetailItems.length)} dari {selectedDetailItems.length} item
                </div>
                <div className="flex gap-2 items-center">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setDetailsModalCurrentPage(p => Math.max(0, p - 1))}
                    disabled={detailsModalCurrentPage === 0}
                  >
                    ← Sebelumnya
                  </Button>
                  <div className="text-xs text-slate-600 px-2">
                    Halaman {detailsModalCurrentPage + 1} dari {Math.ceil(selectedDetailItems.length / itemsPerPage)}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setDetailsModalCurrentPage(p => Math.min(Math.ceil(selectedDetailItems.length / itemsPerPage) - 1, p + 1))}
                    disabled={detailsModalCurrentPage >= Math.ceil(selectedDetailItems.length / itemsPerPage) - 1}
                  >
                    Selanjutnya →
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <span>Tidak ada data detail untuk ditampilkan</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BahanRevisiProyeksiBulananSubtab;
