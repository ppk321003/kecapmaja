import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { RPDItem, Program, Kegiatan, RincianOutput, KomponenOutput, SubKomponen, Akun } from '@/types/bahanrevisi';
import { formatCurrency, formatPercentage } from '@/utils/bahanrevisi-calculations';

const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

type SummaryViewType =
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
  programs?: Program[];
  kegiatans?: Kegiatan[];
  rincianOutputs?: RincianOutput[];
  komponenOutputs?: KomponenOutput[];
  subKomponen?: SubKomponen[];
  akuns?: Akun[];
}

const BahanRevisiProyeksiBulananSubtab: React.FC<Props> = ({
  items = [],
  programs = [],
  kegiatans = [],
  rincianOutputs = [],
  komponenOutputs = [],
  subKomponen = [],
  akuns = []
}) => {
  const [summaryView, setSummaryView] = useState<SummaryViewType>('proyeksi');
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'month' | 'total'>('month');

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
      case 'rincian_output': return rincianNameMap[code] || code;
      case 'komponen_output': return komponenNameMap[code] || code;
      case 'sub_komponen': return subKomponenNameMap[code] || code;
      case 'akun': return akunNameMap[code] || code;
      default: return code;
    }
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
        field === 'rincian_output' ? formatName(r.key, 'rincian_output') :
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
      case 'rincian_output': return aggregateBy('rincian_output');
      case 'komponen_output': return aggregateBy('komponen_output');
      case 'sub_komponen': return aggregateBy('sub_komponen');
      case 'akun': return aggregateBy('akun');
      case 'akun_group': {
        // group by 3-digit account group (first 3 chars of akun)
        const map = new Map<string, GroupedRow>();
        items.forEach(item => {
          const akun = String(item.akun || 'Unknown');
          const key = akun.slice(0,3) || 'Unknown';
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
        return Array.from(map.values());
      }
      case 'account_group': {
        // group by 2-digit account group
        const map = new Map<string, GroupedRow>();
        items.forEach(item => {
          const akun = String(item.akun || 'Unknown');
          const key = akun.slice(0,2) || 'Unknown';
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
        return Array.from(map.values());
      }
      case 'proyeksi':
      default:
        // For proyeksi view, return items as individual rows converted to GroupedRow
        return items.map(it => ({
          id: it.id,
          key: it.id,
          name: `${formatName(it.program_pembebanan || '', 'program')} / ${formatName(it.kegiatan || '', 'kegiatan')} / ${formatName(it.komponen_output || '', 'komponen_output')} / ${formatName(it.akun || '', 'akun')}`.replace(/\s+\/\s+Unknown/g, '').replace(/Unknown\s+\/\s+/g, '').trim() || it.id,
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

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const downloadCSV = () => {
    const headers = ['Label', ...months.map(m => m.toUpperCase()), 'Total', 'Total Pagu', 'Sisa', 'Blokir'];
    const rows: string[][] = [];
    data.forEach(d => {
      const row = [d.name, ...months.map(m => String(d.months[m] || 0)), String(d.total || 0), String(d.total_pagu || 0), String(d.sisa_anggaran || 0), String(d.blokir || 0)];
      rows.push(row);
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proyeksi-bulanan-${summaryView}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Proyeksi Bulanan</h2>

      <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
        <div className="flex flex-wrap gap-2">
        <Button variant={summaryView === 'proyeksi' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('proyeksi')} className="text-xs">Ringkasan Proyeksi Bulanan</Button>
        <Button variant={summaryView === 'program_pembebanan' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('program_pembebanan')} className="text-xs">Program Pembebanan</Button>
        <Button variant={summaryView === 'kegiatan' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('kegiatan')} className="text-xs">Kegiatan</Button>
        <Button variant={summaryView === 'rincian_output' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('rincian_output')} className="text-xs">Rincian Output</Button>
        <Button variant={summaryView === 'komponen_output' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('komponen_output')} className="text-xs">Komponen Output</Button>
        <Button variant={summaryView === 'sub_komponen' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('sub_komponen')} className="text-xs">Sub Komponen</Button>
        <Button variant={summaryView === 'akun' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('akun')} className="text-xs">Akun</Button>
        <Button variant={summaryView === 'akun_group' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('akun_group')} className="text-xs">Kelompok Akun</Button>
        <Button variant={summaryView === 'account_group' ? 'default' : 'outline'} size="sm" onClick={() => setSummaryView('account_group')} className="text-xs">Kelompok Belanja</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={viewMode === 'month' ? 'default' : 'outline'} onClick={() => setViewMode('month')} className="text-xs">Per-Bulan</Button>
          <Button size="sm" variant={viewMode === 'total' ? 'default' : 'outline'} onClick={() => setViewMode('total')} className="text-xs">Total Tahunan</Button>
          <Button size="sm" onClick={downloadCSV} className="text-xs">Export CSV</Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <Table className="w-full text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left py-2 px-3 font-semibold">No</TableHead>
                  <TableHead className="text-left py-2 px-3 font-semibold">Label</TableHead>
                  {viewMode === 'month' && months.map(m => (
                    <TableHead key={m} className="text-right py-2 px-3 font-semibold">{m.toUpperCase()}</TableHead>
                  ))}
                  <TableHead className="text-right py-2 px-3 font-semibold">Total</TableHead>
                  <TableHead className="text-right py-2 px-3 font-semibold">Total Pagu</TableHead>
                  <TableHead className="text-right py-2 px-3 font-semibold">Sisa</TableHead>
                  <TableHead className="text-right py-2 px-3 font-semibold">Blokir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => {
                  const isExpanded = !!expandedKeys[row.key];
                  return (
                    <React.Fragment key={row.id || row.key}>
                      <TableRow className={idx % 2 === 0 ? '' : 'bg-slate-50'}>
                        <TableCell className="py-2 px-3">{idx + 1}</TableCell>
                        <TableCell className="py-2 px-3 text-xs font-mono">
                          <button onClick={() => toggleExpand(row.key)} className="underline text-slate-700">{isExpanded ? '▾' : '▸'} {row.name}</button>
                        </TableCell>
                        {viewMode === 'month' && months.map(m => (
                          <TableCell key={`${row.id}-${m}`} className="text-right py-2 px-3">{formatCurrency(row.months[m] || 0)}</TableCell>
                        ))}
                        <TableCell className="text-right py-2 px-3 font-semibold">{formatCurrency(row.total)}</TableCell>
                        <TableCell className="text-right py-2 px-3">{formatCurrency(row.total_pagu || 0)}</TableCell>
                        <TableCell className="text-right py-2 px-3">{formatCurrency(row.sisa_anggaran || 0)}</TableCell>
                        <TableCell className="text-right py-2 px-3">{formatCurrency(row.blokir || 0)}</TableCell>
                      </TableRow>
                      {isExpanded && (
                        // Render children: individual items that belong to this group
                        items.filter(it => {
                          if (summaryView === 'program_pembebanan') return String(it.program_pembebanan || 'Unknown') === row.key;
                          if (summaryView === 'kegiatan') return String(it.kegiatan || 'Unknown') === row.key;
                          if (summaryView === 'rincian_output') return String(it.rincian_output || 'Unknown') === row.key;
                          if (summaryView === 'komponen_output') return String(it.komponen_output || 'Unknown') === row.key;
                          if (summaryView === 'sub_komponen') return String(it.sub_komponen || 'Unknown') === row.key;
                          if (summaryView === 'akun') return String(it.akun || 'Unknown') === row.key;
                          if (summaryView === 'akun_group') return (String(it.akun || '').slice(0,3) || 'Unknown') === row.key;
                          if (summaryView === 'account_group') return (String(it.akun || '').slice(0,2) || 'Unknown') === row.key;
                          // for proyeksi view there are no children
                          return false;
                        }).map((it, cidx) => (
                          <TableRow key={`${row.key}-child-${it.id}`} className={cidx % 2 === 0 ? '' : 'bg-slate-50'}>
                            <TableCell className="py-2 px-3" />
                            <TableCell className="py-2 px-3 text-xs font-mono">{`${it.program_pembebanan || ''} ${it.kegiatan || ''} ${it.komponen_output || ''} ${it.akun || ''}`.trim()}</TableCell>
                            {viewMode === 'month' && months.map(m => (
                              <TableCell key={`${it.id}-${m}`} className="text-right py-2 px-3">{formatCurrency(Number((it as any)[m] || 0))}</TableCell>
                            ))}
                            <TableCell className="text-right py-2 px-3 font-medium">{formatCurrency(months.reduce((s, m) => s + (Number((it as any)[m] || 0)), 0))}</TableCell>
                            <TableCell className="text-right py-2 px-3">{formatCurrency(Number(it.total_pagu || 0))}</TableCell>
                            <TableCell className="text-right py-2 px-3">{formatCurrency(Number(it.sisa_anggaran || 0))}</TableCell>
                            <TableCell className="text-right py-2 px-3">{formatCurrency(Number(it.blokir || 0))}</TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell colSpan={2} className="py-2 px-3">Total</TableCell>
                  {months.map((m) => (
                    <TableCell key={`total-${m}`} className="text-right py-2 px-3">{formatCurrency(data.reduce((s, r) => s + (r.months[m] || 0), 0))}</TableCell>
                  ))}
                  <TableCell className="text-right py-2 px-3">{formatCurrency(data.reduce((s, r) => s + (r.total || 0), 0))}</TableCell>
                  <TableCell className="text-right py-2 px-3">{formatCurrency(data.reduce((s, r) => s + (r.total_pagu || 0), 0))}</TableCell>
                  <TableCell className="text-right py-2 px-3">{formatCurrency(data.reduce((s, r) => s + (r.sisa_anggaran || 0), 0))}</TableCell>
                  <TableCell className="text-right py-2 px-3">{formatCurrency(data.reduce((s, r) => s + (r.blokir || 0), 0))}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BahanRevisiProyeksiBulananSubtab;
