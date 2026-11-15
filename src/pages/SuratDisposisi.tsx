import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Inbox, Mail, Pencil, Plus, Search, Send, Trash2, Truck, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useToast } from '@/hooks/use-toast';
import { readSheetValues } from '@/lib/sheets-read';
import { supabase } from '@/integrations/supabase/client';

const SURAT_HEADERS = [
  'ID_Surat',
  'Jenis_Surat',
  'Nomor_Surat',
  'Tanggal_Surat',
  'Asal_Pengirim',
  'Tanggal_Diterima',
  'Perihal',
  'Sifat_Surat',
  'Tanggal_Pengantaran',
  'Status_Pengantaran',
  'Status',
  'Dicatat_Oleh',
  'Dicatat_Pada',
];

const DISPOSISI_HEADERS = [
  'ID_Disposisi',
  'ID_Surat',
  'Dari',
  'Kepada',
  'Instruksi',
  'Tanggal_Disposisi',
  'Dibuat_Oleh',
  'Dibuat_Pada',
];

interface SuratRecord {
  id: string;
  type: 'Masuk' | 'Keluar';
  number: string;
  date: string;
  senderOrRecipient: string;
  receivedDate: string;
  subject: string;
  nature: string;
  deliveryDate: string;
  deliveryStatus: string;
  status: string;
  recordedBy: string;
  recordedAt: string;
  rowIndex: number;
}

interface DisposisiRecord {
  id: string;
  suratId: string;
  from: string;
  to: string;
  instruction: string;
  date: string;
  createdBy: string;
  createdAt: string;
  rowIndex: number;
}

interface SuratDraft {
  type: 'Masuk' | 'Keluar';
  number: string;
  date: string;
  senderOrRecipient: string;
  receivedDate: string;
  subject: string;
  nature: string;
  deliveryDate: string;
  deliveryStatus: string;
}

interface DisposisiDraft {
  suratId: string;
  from: string;
  to: string;
  instruction: string;
  date: string;
}

const today = () => format(new Date(), 'yyyy-MM-dd');

function assertHeaders(values: string[][], expected: string[], sheetName: string): void {
  const actual = values[0]?.slice(0, expected.length).map((value) => value.trim().toLowerCase()) ?? [];
  if (expected.some((value, index) => actual[index] !== value.toLowerCase())) {
    throw new Error(`Header tab ${sheetName} belum sesuai. Pastikan baris pertama berisi header A:${String.fromCharCode(64 + expected.length)} yang telah disepakati.`);
  }
}

function parseSurat(values: string[][]): SuratRecord[] {
  assertHeaders(values, SURAT_HEADERS, 'Surat');
  return values.slice(1).flatMap((row, index) => {
    const type = row[1]?.trim();
    const id = row[0]?.trim();
    if (!id || (type !== 'Masuk' && type !== 'Keluar')) return [];
    return [{
      id,
      type,
      number: row[2]?.trim() ?? '',
      date: row[3]?.trim() ?? '',
      senderOrRecipient: row[4]?.trim() ?? '',
      receivedDate: row[5]?.trim() ?? '',
      subject: row[6]?.trim() ?? '',
      nature: row[7]?.trim() ?? '',
      deliveryDate: row[8]?.trim() ?? '',
      deliveryStatus: row[9]?.trim() ?? '',
      status: row[10]?.trim() ?? '',
      recordedBy: row[11]?.trim() ?? '',
      recordedAt: row[12]?.trim() ?? '',
      rowIndex: index + 2,
    }];
  });
}

function parseDisposisi(values: string[][]): DisposisiRecord[] {
  assertHeaders(values, DISPOSISI_HEADERS, 'Disposisi');
  return values.slice(1).flatMap((row, index) => {
    const id = row[0]?.trim();
    const suratId = row[1]?.trim();
    if (!id || !suratId) return [];
    return [{
      id,
      suratId,
      from: row[2]?.trim() ?? '',
      to: row[3]?.trim() ?? '',
      instruction: row[4]?.trim() ?? '',
      date: row[5]?.trim() ?? '',
      createdBy: row[6]?.trim() ?? '',
      createdAt: row[7]?.trim() ?? '',
      rowIndex: index + 2,
    }];
  });
}

function formatSheetDate(value: string): string {
  if (!value) return '—';
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'dd MMM yyyy', { locale: id });
}

const newSuratDraft = (): SuratDraft => ({
  type: 'Masuk',
  number: '',
  date: today(),
  senderOrRecipient: '',
  receivedDate: today(),
  subject: '',
  nature: 'Biasa',
  deliveryDate: '',
  deliveryStatus: 'Belum Diantar',
});

const newDisposisiDraft = (): DisposisiDraft => ({
  suratId: '',
  from: '',
  to: '',
  instruction: '',
  date: today(),
});

function DeliveryStatus({ status }: { status: string }) {
  const normalizedStatus = status.trim().toLocaleLowerCase();
  const fullLabel = status.trim() || 'Belum Diantar';
  const label = normalizedStatus === 'sudah diantar'
    ? 'Terkirim'
    : normalizedStatus === 'gagal diantar'
      ? 'Gagal'
      : normalizedStatus.includes('pengantaran') || normalizedStatus.includes('perjalanan')
        ? 'Proses'
        : 'Belum';

  if (normalizedStatus === 'sudah diantar') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-emerald-700" role="status" title={fullLabel}>
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        {label}
      </span>
    );
  }

  if (normalizedStatus === 'gagal diantar') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-red-700" role="status" title={fullLabel}>
        <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        {label}
      </span>
    );
  }

  if (normalizedStatus.includes('pengantaran') || normalizedStatus.includes('perjalanan')) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-blue-700" role="status" title={fullLabel}>
        <Truck className="h-5 w-5 shrink-0" aria-hidden="true" />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-amber-700" role="status" title={fullLabel}>
      <Clock3 className="h-5 w-5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

function PaginationControls({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : pageSize === 0 ? 1 : (safePage - 1) * pageSize + 1;
  const end = pageSize === 0 ? totalItems : Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Baris per halaman</span>
        <Select
          value={pageSize === 0 ? 'all' : String(pageSize)}
          onValueChange={(value) => onPageSizeChange(value === 'all' ? 0 : Number(value))}
        >
          <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
        <span>Menampilkan {start}–{end} dari {totalItems}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Halaman {safePage} dari {totalPages}</span>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label="Halaman sebelumnya"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label="Halaman berikutnya"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function SuratDisposisi() {
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const { toast } = useToast();
  const spreadsheetId = satkerContext?.getUserSatkerSheetId('suratdisposisi') ?? '';
  const masterOrganikSheetId = satkerContext?.getUserSatkerSheetId('masterorganik') ?? '';
  const [surat, setSurat] = useState<SuratRecord[]>([]);
  const [disposisi, setDisposisi] = useState<DisposisiRecord[]>([]);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [suratDialogOpen, setSuratDialogOpen] = useState(false);
  const [disposisiDialogOpen, setDisposisiDialogOpen] = useState(false);
  const [editingSurat, setEditingSurat] = useState<SuratRecord | null>(null);
  const [editSuratDraft, setEditSuratDraft] = useState<SuratDraft>(newSuratDraft);
  const [deleteSuratTarget, setDeleteSuratTarget] = useState<SuratRecord | null>(null);
  const [editingDisposisi, setEditingDisposisi] = useState<DisposisiRecord | null>(null);
  const [confirmDisposisiEdit, setConfirmDisposisiEdit] = useState(false);
  const [deleteDisposisiTarget, setDeleteDisposisiTarget] = useState<DisposisiRecord | null>(null);
  const [suratDraft, setSuratDraft] = useState<SuratDraft>(newSuratDraft);
  const [disposisiDraft, setDisposisiDraft] = useState<DisposisiDraft>(newDisposisiDraft);
  const [editDisposisiDraft, setEditDisposisiDraft] = useState<DisposisiDraft>(newDisposisiDraft);
  const [suratSearch, setSuratSearch] = useState('');
  const [disposisiSearch, setDisposisiSearch] = useState('');
  const [suratPage, setSuratPage] = useState(1);
  const [suratPageSize, setSuratPageSize] = useState(10);
  const [disposisiPage, setDisposisiPage] = useState(1);
  const [disposisiPageSize, setDisposisiPageSize] = useState(10);

  const loadData = useCallback(async () => {
    if (!spreadsheetId || !masterOrganikSheetId) return;
    setIsLoading(true);
    try {
      const [suratResult, disposisiResult, masterResult] = await Promise.all([
        readSheetValues({ spreadsheetId, range: 'Surat!A:M', preferSupabase: true }),
        readSheetValues({ spreadsheetId, range: 'Disposisi!A:H', preferSupabase: true }),
        readSheetValues({ spreadsheetId: masterOrganikSheetId, range: 'MASTER.ORGANIK!A:D' }),
      ]);
      setSurat(parseSurat(suratResult.values));
      setDisposisi(parseDisposisi(disposisiResult.values));
      setStaffNames([...new Set(masterResult.values.slice(1)
        .map((row) => row[3]?.trim() ?? '')
        .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')));
    } catch (error) {
      console.error('[SuratDisposisi] Gagal memuat data:', error);
      toast({
        title: 'Gagal memuat Surat & Disposisi',
        description: error instanceof Error ? error.message : 'Periksa tab dan header spreadsheet.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [masterOrganikSheetId, spreadsheetId, toast]);

  useEffect(() => {
    if (!spreadsheetId || !masterOrganikSheetId) {
      setIsLoading(false);
      return;
    }
    void loadData();
  }, [loadData, masterOrganikSheetId, spreadsheetId]);

  const filteredSurat = useMemo(() => {
    const query = suratSearch.trim().toLocaleLowerCase('id');
    return [...surat]
      .filter((record) => record.status.trim().toLocaleLowerCase('id') !== 'dihapus')
      .filter((record) => !query || [
        record.number,
        record.senderOrRecipient,
        record.subject,
      ].some((value) => value.toLocaleLowerCase('id').includes(query)))
      .sort((a, b) => b.rowIndex - a.rowIndex);
  }, [surat, suratSearch]);

  const suratById = useMemo(() => new Map(surat.map((record) => [record.id, record])), [surat]);
  const filteredDisposisi = useMemo(() => {
    const query = disposisiSearch.trim().toLocaleLowerCase('id');
    return [...disposisi]
      .filter((record) => suratById.get(record.suratId)?.status.trim().toLocaleLowerCase('id') !== 'dihapus')
      .filter((record) => !query || [
        record.suratId,
        suratById.get(record.suratId)?.number ?? '',
        suratById.get(record.suratId)?.subject ?? '',
        record.from,
        record.to,
        record.instruction,
      ].some((value) => value.toLocaleLowerCase('id').includes(query)))
      .sort((a, b) => b.rowIndex - a.rowIndex);
  }, [disposisi, disposisiSearch, suratById]);

  const paginatedSurat = useMemo(() => {
    const totalPages = suratPageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredSurat.length / suratPageSize));
    const safePage = Math.min(suratPage, totalPages);
    return suratPageSize === 0
      ? filteredSurat
      : filteredSurat.slice((safePage - 1) * suratPageSize, safePage * suratPageSize);
  }, [filteredSurat, suratPage, suratPageSize]);

  const paginatedDisposisi = useMemo(() => {
    const totalPages = disposisiPageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredDisposisi.length / disposisiPageSize));
    const safePage = Math.min(disposisiPage, totalPages);
    return disposisiPageSize === 0
      ? filteredDisposisi
      : filteredDisposisi.slice((safePage - 1) * disposisiPageSize, safePage * disposisiPageSize);
  }, [disposisiPage, disposisiPageSize, filteredDisposisi]);

  const suratIdsWithDisposisi = useMemo(
    () => new Set(disposisi
      .filter((record) => suratById.get(record.suratId)?.status.trim().toLocaleLowerCase('id') !== 'dihapus')
      .map((record) => record.suratId)),
    [disposisi, suratById],
  );
  const disposisiRecipientsBySuratId = useMemo(() => {
    const recipients = new Map<string, string[]>();
    for (const record of disposisi) {
      if (suratById.get(record.suratId)?.status.trim().toLocaleLowerCase('id') === 'dihapus') continue;
      const currentRecipients = recipients.get(record.suratId) ?? [];
      if (!currentRecipients.includes(record.to)) currentRecipients.push(record.to);
      recipients.set(record.suratId, currentRecipients);
    }
    return recipients;
  }, [disposisi, suratById]);
  const suratBelumDisposisi = useMemo(
    () => surat.filter((record) => record.type === 'Masuk'
      && record.status.trim().toLocaleLowerCase('id') !== 'dihapus'
      && !suratIdsWithDisposisi.has(record.id)),
    [surat, suratIdsWithDisposisi],
  );

  const writeSheet = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('google-sheets', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  };

  const openEditSurat = (record: SuratRecord) => {
    if (record.recordedBy !== user?.username) return;
    setEditingSurat(record);
    setEditSuratDraft({
      type: record.type,
      number: record.number,
      date: record.date,
      senderOrRecipient: record.senderOrRecipient,
      receivedDate: record.receivedDate,
      subject: record.subject,
      nature: record.nature || 'Biasa',
      deliveryDate: record.deliveryDate,
      deliveryStatus: record.deliveryStatus || 'Belum Diantar',
    });
  };

  const saveEditedSurat = async () => {
    if (!editingSurat || !user?.username || !spreadsheetId) return;
    const destinationLabel = editSuratDraft.type === 'Masuk' ? 'Asal/pengirim' : 'Tujuan/penerima';
    if (!editSuratDraft.senderOrRecipient.trim() || !editSuratDraft.subject.trim()
      || !editSuratDraft.date || (editSuratDraft.type === 'Masuk' && !editSuratDraft.receivedDate)) {
      toast({
        title: 'Lengkapi data surat',
        description: `${destinationLabel}, perihal, dan tanggal yang wajib harus diisi.`,
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { values } = await readSheetValues({
        spreadsheetId,
        range: 'Surat!A:M',
        preferSupabase: true,
      });
      const currentRecord = parseSurat(values).find((record) => record.id === editingSurat.id);
      if (!currentRecord || currentRecord.recordedBy !== user.username
        || currentRecord.status.trim().toLocaleLowerCase('id') === 'dihapus') {
        throw new Error('Surat tidak ditemukan, sudah diarsipkan, atau Anda bukan pencatat awalnya.');
      }

      await writeSheet({
        spreadsheetId,
        operation: 'update',
        range: `Surat!B${currentRecord.rowIndex}:J${currentRecord.rowIndex}`,
        values: [[
          editSuratDraft.type,
          editSuratDraft.number.trim(),
          editSuratDraft.date,
          editSuratDraft.senderOrRecipient.trim(),
          editSuratDraft.type === 'Masuk' ? editSuratDraft.receivedDate : '',
          editSuratDraft.subject.trim(),
          editSuratDraft.nature,
          editSuratDraft.type === 'Keluar' ? editSuratDraft.deliveryDate : '',
          editSuratDraft.type === 'Keluar' ? editSuratDraft.deliveryStatus : '',
        ]],
      });
      await loadData();
      setEditingSurat(null);
      toast({ title: 'Surat diperbarui', description: 'Perubahan data surat berhasil disimpan.' });
    } catch (error) {
      console.error('[SuratDisposisi] Gagal mengedit surat:', error);
      toast({
        title: 'Gagal mengedit surat',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui data.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const archiveSurat = async () => {
    if (!deleteSuratTarget || !user?.username || !spreadsheetId) return;
    setIsSaving(true);
    try {
      const { values } = await readSheetValues({
        spreadsheetId,
        range: 'Surat!A:M',
        preferSupabase: true,
      });
      const currentRecord = parseSurat(values).find((record) => record.id === deleteSuratTarget.id);
      if (!currentRecord || currentRecord.recordedBy !== user.username) {
        throw new Error('Surat tidak ditemukan atau Anda bukan pencatat awalnya.');
      }
      if (currentRecord.status.trim().toLocaleLowerCase('id') === 'dihapus') {
        throw new Error('Surat ini sudah diarsipkan.');
      }

      await writeSheet({
        spreadsheetId,
        operation: 'update',
        range: `Surat!K${currentRecord.rowIndex}`,
        values: [['Dihapus']],
      });
      await loadData();
      setDeleteSuratTarget(null);
      toast({
        title: 'Surat diarsipkan',
        description: 'Surat disembunyikan dari daftar Surat dan Disposisi. Riwayat tetap tersimpan.',
      });
    } catch (error) {
      console.error('[SuratDisposisi] Gagal mengarsipkan surat:', error);
      toast({
        title: 'Gagal mengarsipkan surat',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengarsipkan data.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDisposisi = (record: DisposisiRecord) => {
    if (record.createdBy !== user?.username) return;
    setEditingDisposisi(record);
    setEditDisposisiDraft({
      suratId: record.suratId,
      from: record.from,
      to: record.to,
      instruction: record.instruction,
      date: record.date,
    });
  };

  const saveEditedDisposisi = async () => {
    if (!editingDisposisi || !user?.username || !spreadsheetId) return;
    if (editingDisposisi.createdBy !== user.username) {
      toast({ title: 'Tidak memiliki akses', description: 'Hanya pembuat disposisi yang dapat mengeditnya.', variant: 'destructive' });
      setConfirmDisposisiEdit(false);
      return;
    }
    if (!editDisposisiDraft.to || !editDisposisiDraft.instruction.trim() || !editDisposisiDraft.date) {
      toast({ title: 'Lengkapi data disposisi', description: 'Kepada, Instruksi, dan Tanggal wajib diisi.', variant: 'destructive' });
      setConfirmDisposisiEdit(false);
      return;
    }

    setIsSaving(true);
    try {
      const { values } = await readSheetValues({
        spreadsheetId,
        range: 'Disposisi!A:H',
        preferSupabase: true,
      });
      const currentRecord = parseDisposisi(values).find((record) => record.id === editingDisposisi.id);
      if (!currentRecord || currentRecord.createdBy !== user.username) {
        throw new Error('Disposisi tidak ditemukan atau Anda bukan pembuat awalnya.');
      }

      await writeSheet({
        spreadsheetId,
        operation: 'update',
        range: `Disposisi!D${currentRecord.rowIndex}:F${currentRecord.rowIndex}`,
        values: [[editDisposisiDraft.to, editDisposisiDraft.instruction.trim(), editDisposisiDraft.date]],
      });
      await loadData();
      toast({ title: 'Disposisi diperbarui', description: 'Perubahan disposisi berhasil disimpan.' });
      setConfirmDisposisiEdit(false);
      setEditingDisposisi(null);
    } catch (error) {
      console.error('[SuratDisposisi] Gagal mengedit disposisi:', error);
      toast({
        title: 'Gagal mengedit disposisi',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui data.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDisposisi = async () => {
    if (!deleteDisposisiTarget || !user?.username || !spreadsheetId) return;
    setIsSaving(true);
    try {
      const [disposisiResult, suratResult] = await Promise.all([
        readSheetValues({ spreadsheetId, range: 'Disposisi!A:H', preferSupabase: true }),
        readSheetValues({ spreadsheetId, range: 'Surat!A:M', preferSupabase: true }),
      ]);
      const currentDisposisi = parseDisposisi(disposisiResult.values)
        .find((record) => record.id === deleteDisposisiTarget.id);
      if (!currentDisposisi || currentDisposisi.createdBy !== user.username) {
        throw new Error('Disposisi tidak ditemukan atau Anda bukan pembuat awalnya.');
      }

      const remainingForSurat = parseDisposisi(disposisiResult.values)
        .filter((record) => record.id !== currentDisposisi.id && record.suratId === currentDisposisi.suratId);
      const linkedSurat = parseSurat(suratResult.values)
        .find((record) => record.id === currentDisposisi.suratId);

      await writeSheet({
        spreadsheetId,
        operation: 'delete',
        sheetName: 'Disposisi',
        rowIndex: currentDisposisi.rowIndex,
      });

      if (linkedSurat && remainingForSurat.length === 0) {
        await writeSheet({
          spreadsheetId,
          operation: 'update',
          range: `Surat!K${linkedSurat.rowIndex}`,
          values: [['Belum disposisi']],
        });
      }

      await loadData();
      setDeleteDisposisiTarget(null);
      toast({
        title: 'Disposisi dibatalkan',
        description: remainingForSurat.length === 0
          ? 'Disposisi dihapus dan surat kembali berstatus Belum disposisi.'
          : 'Disposisi berhasil dihapus. Disposisi lain untuk surat tersebut tetap ada.',
      });
    } catch (error) {
      console.error('[SuratDisposisi] Gagal membatalkan disposisi:', error);
      toast({
        title: 'Gagal membatalkan disposisi',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat membatalkan disposisi.',
        variant: 'destructive',
      });
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const saveSurat = async () => {
    if (!spreadsheetId || !user?.username) return;
    const destinationLabel = suratDraft.type === 'Masuk' ? 'Asal/pengirim' : 'Tujuan/penerima';
    if (!suratDraft.senderOrRecipient.trim() || !suratDraft.subject.trim()) {
      toast({
        title: 'Lengkapi data surat',
        description: `${destinationLabel} dan perihal wajib diisi.`,
        variant: 'destructive',
      });
      return;
    }
    if (!suratDraft.date) {
      toast({ title: 'Tanggal surat wajib diisi', variant: 'destructive' });
      return;
    }
    if (suratDraft.type === 'Masuk' && !suratDraft.receivedDate) {
      toast({ title: 'Tanggal diterima wajib diisi', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const values = [[
        `SURAT-${crypto.randomUUID()}`,
        suratDraft.type,
        suratDraft.number.trim(),
        suratDraft.date,
        suratDraft.senderOrRecipient.trim(),
        suratDraft.type === 'Masuk' ? suratDraft.receivedDate : '',
        suratDraft.subject.trim(),
        suratDraft.nature,
        suratDraft.type === 'Keluar' ? suratDraft.deliveryDate : '',
        suratDraft.type === 'Keluar' ? suratDraft.deliveryStatus : '',
        suratDraft.type === 'Masuk' ? 'Belum disposisi' : 'Aktif',
        user.username,
        now.toISOString(),
      ]];
      await writeSheet({ spreadsheetId, operation: 'append', range: 'Surat!A:M', values });
      await loadData();
      setSuratDialogOpen(false);
      setSuratDraft(newSuratDraft());
      toast({ title: 'Surat dicatat', description: 'Data surat berhasil disimpan.' });
    } catch (error) {
      console.error('[SuratDisposisi] Gagal mencatat surat:', error);
      toast({
        title: 'Gagal mencatat surat',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan data.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveDisposisi = async () => {
    if (!spreadsheetId || !user?.username) return;
    if (!disposisiDraft.suratId || !disposisiDraft.from || !disposisiDraft.to || !disposisiDraft.instruction.trim() || !disposisiDraft.date) {
      toast({ title: 'Lengkapi data disposisi', description: 'Surat, Dari, Kepada, Instruksi, dan Tanggal wajib diisi.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const values = [[
        `DISP-${crypto.randomUUID()}`,
        disposisiDraft.suratId,
        disposisiDraft.from,
        disposisiDraft.to,
        disposisiDraft.instruction.trim(),
        disposisiDraft.date,
        user.username,
        new Date().toISOString(),
      ]];
      await writeSheet({ spreadsheetId, operation: 'append', range: 'Disposisi!A:H', values });
      const linkedSurat = suratById.get(disposisiDraft.suratId);
      if (linkedSurat) {
        await writeSheet({
          spreadsheetId,
          operation: 'update',
          range: `Surat!K${linkedSurat.rowIndex}:K${linkedSurat.rowIndex}`,
          values: [['Sudah disposisi']],
        });
      }
      await loadData();
      setDisposisiDialogOpen(false);
      setDisposisiDraft(newDisposisiDraft());
      toast({ title: 'Disposisi dicatat', description: 'Instruksi disposisi berhasil disimpan.' });
    } catch (error) {
      console.error('[SuratDisposisi] Gagal mencatat disposisi:', error);
      toast({
        title: 'Gagal mencatat disposisi',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan data.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (satkerContext?.isLoading || isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Memuat Surat & Disposisi...</div>;
  }

  if (!spreadsheetId || !masterOrganikSheetId) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Surat & Disposisi</h1>
        <Alert variant="destructive">
          <AlertDescription>
            {!spreadsheetId
              ? 'ID spreadsheet Surat & Disposisi belum diisi untuk satker ini. Isi kolom AF pada satker_config.'
              : 'ID Master Organik untuk satker ini belum tersedia pada satker_config.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const staffOptions = staffNames.map((name) => ({ value: name, label: name }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Mail className="h-6 w-6" /> Surat & Disposisi</h1>
        <p className="text-sm text-muted-foreground">Pencatatan surat masuk/keluar dan penerusan disposisi internal.</p>
      </div>

      <Tabs defaultValue="surat">
        <TabsList>
          <TabsTrigger value="surat">Surat</TabsTrigger>
          <TabsTrigger value="disposisi">Disposisi</TabsTrigger>
        </TabsList>

        <TabsContent value="surat">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Daftar Surat</CardTitle>
                <CardDescription>Catat surat masuk dan surat keluar yang diantarkan secara fisik.</CardDescription>
              </div>
              <Button onClick={() => setSuratDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Catat Surat</Button>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={suratSearch} onChange={(event) => {
                  setSuratSearch(event.target.value);
                  setSuratPage(1);
                }} placeholder="Cari nomor, asal/tujuan, atau perihal..." className="pl-9" />
              </div>
              {filteredSurat.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Belum ada surat yang tercatat.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1250px] table-fixed text-sm">
                    <thead><tr className="border-b text-left">
                      <th className="w-14 p-3">Jenis</th><th className="w-36 p-3">Nomor / Tanggal</th><th className="w-40 p-3">Asal / Tujuan</th>
                      <th className="w-[30%] min-w-[240px] p-3">Perihal</th><th className="w-24 p-3">Sifat</th><th className="w-36 p-3">Pengantaran</th><th className="w-32 p-3">Status</th><th className="w-32 p-3">Dicatat Oleh</th><th className="w-20 p-3">Aksi</th>
                    </tr></thead>
                    <tbody>
                      {paginatedSurat.map((record) => (
                        <tr key={record.id} className="border-b align-top">
                          <td className="p-3">
                            <span
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${record.type === 'Masuk' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}
                              title={record.type === 'Masuk' ? 'Surat Masuk' : 'Surat Keluar'}
                              aria-label={record.type === 'Masuk' ? 'Surat Masuk' : 'Surat Keluar'}
                            >
                              {record.type === 'Masuk'
                                ? <Inbox className="h-4 w-4" aria-hidden="true" />
                                : <Send className="h-4 w-4" aria-hidden="true" />}
                            </span>
                          </td>
                          <td className="whitespace-nowrap p-3">{record.number || '—'}<br /><span className="text-muted-foreground">{formatSheetDate(record.date)}</span></td>
                          <td className="p-3">{record.senderOrRecipient}</td>
                          <td className="p-3">
                            <p className="line-clamp-2 min-w-[220px] whitespace-pre-wrap break-words" title={record.subject}>{record.subject}</p>
                          </td>
                          <td className="p-3">{record.nature || '—'}</td>
                          <td className="p-3">
                            {record.type === 'Keluar'
                              ? `${record.deliveryStatus || '—'}${record.deliveryDate ? ` · ${formatSheetDate(record.deliveryDate)}` : ''}`
                              : '—'}
                          </td>
                          <td className="p-3">
                            {record.type === 'Masuk' ? (
                              <span
                                className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold ${suratIdsWithDisposisi.has(record.id) ? 'text-emerald-700' : 'text-amber-700'}`}
                                title={suratIdsWithDisposisi.has(record.id) ? 'Sudah disposisi' : 'Belum disposisi'}
                                role="status"
                              >
                                {suratIdsWithDisposisi.has(record.id) ? (
                                  <span className="flex flex-col items-start">
                                    <span className="inline-flex items-center gap-1">
                                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Sudah
                                    </span>
                                    <span className="max-w-32 truncate pl-5 font-normal text-muted-foreground" title={disposisiRecipientsBySuratId.get(record.id)?.join(', ')}>
                                      {disposisiRecipientsBySuratId.get(record.id)?.join(', ') || '—'}
                                    </span>
                                  </span>
                                ) : <><Clock3 className="h-4 w-4" aria-hidden="true" /> Belum</>}
                              </span>
                            ) : record.type === 'Keluar' ? (
                              <DeliveryStatus status={record.deliveryStatus} />
                            ) : record.status || '—'}
                          </td>
                          <td className="p-3">{record.recordedBy || '—'}</td>
                          <td className="p-3">
                            {record.recordedBy === user?.username ? (
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" title="Edit surat" aria-label="Edit surat" disabled={isSaving} onClick={() => openEditSurat(record)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" title="Arsipkan surat" aria-label="Arsipkan surat" disabled={isSaving} onClick={() => setDeleteSuratTarget(record)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <PaginationControls
                totalItems={filteredSurat.length}
                page={suratPage}
                pageSize={suratPageSize}
                onPageChange={setSuratPage}
                onPageSizeChange={(pageSize) => {
                  setSuratPageSize(pageSize);
                  setSuratPage(1);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disposisi">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Daftar Disposisi</CardTitle>
                <CardDescription>Teruskan surat masuk secara internal kepada pegawai/unit terkait.</CardDescription>
              </div>
              <Button onClick={() => setDisposisiDialogOpen(true)} disabled={suratBelumDisposisi.length === 0}>
                <Plus className="mr-2 h-4 w-4" /> Buat Disposisi
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={disposisiSearch} onChange={(event) => {
                  setDisposisiSearch(event.target.value);
                  setDisposisiPage(1);
                }} placeholder="Cari nomor/perihal surat, nama, atau instruksi..." className="pl-9" />
              </div>
              {filteredDisposisi.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Belum ada disposisi yang tercatat.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead><tr className="border-b text-left">
                      <th className="p-3">Tanggal</th><th className="p-3">Surat</th><th className="p-3">Dari</th>
                      <th className="p-3">Kepada</th><th className="p-3">Instruksi</th><th className="p-3">Dicatat Oleh</th><th className="p-3">Aksi</th>
                    </tr></thead>
                    <tbody>
                      {paginatedDisposisi.map((record) => {
                        const linkedSurat = suratById.get(record.suratId);
                        return (
                          <tr key={record.id} className="border-b align-top">
                            <td className="whitespace-nowrap p-3">{formatSheetDate(record.date)}</td>
                            <td className="p-3">{linkedSurat?.number || record.suratId}<br /><span className="text-muted-foreground">{linkedSurat?.subject ?? 'Surat tidak ditemukan'}</span></td>
                            <td className="p-3">{record.from}</td>
                            <td className="p-3">{record.to}</td>
                            <td className="max-w-sm whitespace-pre-wrap p-3">{record.instruction}</td>
                            <td className="p-3">{record.createdBy}</td>
                            <td className="p-3">
                              {record.createdBy === user?.username ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Edit disposisi"
                                    aria-label="Edit disposisi"
                                    disabled={isSaving}
                                    onClick={() => openEditDisposisi(record)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Batalkan disposisi"
                                    aria-label="Batalkan disposisi"
                                    disabled={isSaving}
                                    onClick={() => setDeleteDisposisiTarget(record)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <PaginationControls
                totalItems={filteredDisposisi.length}
                page={disposisiPage}
                pageSize={disposisiPageSize}
                onPageChange={setDisposisiPage}
                onPageSizeChange={(pageSize) => {
                  setDisposisiPageSize(pageSize);
                  setDisposisiPage(1);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={suratDialogOpen} onOpenChange={(open) => {
        if (!isSaving) setSuratDialogOpen(open);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Catat Surat</DialogTitle>
            <DialogDescription>Surat keluar dicatat saat ditugaskan untuk diantarkan secara fisik.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jenis Surat</Label>
              <Select value={suratDraft.type} onValueChange={(type: 'Masuk' | 'Keluar') => setSuratDraft((draft) => ({
                ...draft,
                type,
                receivedDate: type === 'Masuk' ? draft.receivedDate || today() : '',
              }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Masuk">Surat Masuk</SelectItem><SelectItem value="Keluar">Surat Keluar</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="letter-number">Nomor Surat</Label><Input id="letter-number" value={suratDraft.number} onChange={(event) => setSuratDraft((draft) => ({ ...draft, number: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="letter-date">Tanggal Surat</Label><Input id="letter-date" type="date" value={suratDraft.date} onChange={(event) => setSuratDraft((draft) => ({ ...draft, date: event.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="letter-sender">{suratDraft.type === 'Masuk' ? 'Asal / Pengirim' : 'Tujuan / Penerima'}</Label>
              <Input id="letter-sender" value={suratDraft.senderOrRecipient} onChange={(event) => setSuratDraft((draft) => ({ ...draft, senderOrRecipient: event.target.value }))} />
            </div>
            {suratDraft.type === 'Masuk' && (
              <div className="space-y-2"><Label htmlFor="received-date">Tanggal Diterima</Label><Input id="received-date" type="date" value={suratDraft.receivedDate} onChange={(event) => setSuratDraft((draft) => ({ ...draft, receivedDate: event.target.value }))} /></div>
            )}
            <div className="space-y-2"><Label htmlFor="letter-subject">Perihal</Label><Textarea id="letter-subject" value={suratDraft.subject} onChange={(event) => setSuratDraft((draft) => ({ ...draft, subject: event.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Sifat Surat</Label>
              <Select value={suratDraft.nature} onValueChange={(nature) => setSuratDraft((draft) => ({ ...draft, nature }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Biasa">Biasa</SelectItem><SelectItem value="Penting">Penting</SelectItem>
                  <SelectItem value="Segera">Segera</SelectItem><SelectItem value="Rahasia">Rahasia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {suratDraft.type === 'Keluar' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="delivery-date">Tanggal Pengantaran</Label><Input id="delivery-date" type="date" value={suratDraft.deliveryDate} onChange={(event) => setSuratDraft((draft) => ({ ...draft, deliveryDate: event.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Status Pengantaran</Label>
                  <Select value={suratDraft.deliveryStatus} onValueChange={(deliveryStatus) => setSuratDraft((draft) => ({ ...draft, deliveryStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Belum Diantar">Belum Diantar</SelectItem><SelectItem value="Dalam Pengantaran">Dalam Pengantaran</SelectItem>
                      <SelectItem value="Sudah Diantar">Sudah Diantar</SelectItem><SelectItem value="Gagal Diantar">Gagal Diantar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuratDialogOpen(false)} disabled={isSaving}>Batal</Button>
            <Button onClick={() => void saveSurat()} disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan Surat'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingSurat}
        onOpenChange={(open) => {
          if (!open && !isSaving) setEditingSurat(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Surat</DialogTitle>
            <DialogDescription>Hanya pencatat awal yang dapat mengubah data surat. Jenis surat dan status disposisi dipertahankan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jenis Surat</Label>
              <Input value={editSuratDraft.type === 'Masuk' ? 'Surat Masuk' : 'Surat Keluar'} readOnly />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="edit-letter-number">Nomor Surat</Label><Input id="edit-letter-number" value={editSuratDraft.number} onChange={(event) => setEditSuratDraft((draft) => ({ ...draft, number: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="edit-letter-date">Tanggal Surat</Label><Input id="edit-letter-date" type="date" value={editSuratDraft.date} onChange={(event) => setEditSuratDraft((draft) => ({ ...draft, date: event.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-letter-sender">{editSuratDraft.type === 'Masuk' ? 'Asal / Pengirim' : 'Tujuan / Penerima'}</Label>
              <Input id="edit-letter-sender" value={editSuratDraft.senderOrRecipient} onChange={(event) => setEditSuratDraft((draft) => ({ ...draft, senderOrRecipient: event.target.value }))} />
            </div>
            {editSuratDraft.type === 'Masuk' && (
              <div className="space-y-2"><Label htmlFor="edit-received-date">Tanggal Diterima</Label><Input id="edit-received-date" type="date" value={editSuratDraft.receivedDate} onChange={(event) => setEditSuratDraft((draft) => ({ ...draft, receivedDate: event.target.value }))} /></div>
            )}
            <div className="space-y-2"><Label htmlFor="edit-letter-subject">Perihal</Label><Textarea id="edit-letter-subject" value={editSuratDraft.subject} onChange={(event) => setEditSuratDraft((draft) => ({ ...draft, subject: event.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Sifat Surat</Label>
              <Select value={editSuratDraft.nature} onValueChange={(nature) => setEditSuratDraft((draft) => ({ ...draft, nature }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Biasa">Biasa</SelectItem><SelectItem value="Penting">Penting</SelectItem>
                  <SelectItem value="Segera">Segera</SelectItem><SelectItem value="Rahasia">Rahasia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editSuratDraft.type === 'Keluar' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="edit-delivery-date">Tanggal Pengantaran</Label><Input id="edit-delivery-date" type="date" value={editSuratDraft.deliveryDate} onChange={(event) => setEditSuratDraft((draft) => ({ ...draft, deliveryDate: event.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Status Pengantaran</Label>
                  <Select value={editSuratDraft.deliveryStatus} onValueChange={(deliveryStatus) => setEditSuratDraft((draft) => ({ ...draft, deliveryStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Belum Diantar">Belum Diantar</SelectItem><SelectItem value="Dalam Pengantaran">Dalam Pengantaran</SelectItem>
                      <SelectItem value="Sudah Diantar">Sudah Diantar</SelectItem><SelectItem value="Gagal Diantar">Gagal Diantar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSurat(null)} disabled={isSaving}>Batal</Button>
            <Button onClick={() => void saveEditedSurat()} disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disposisiDialogOpen} onOpenChange={(open) => {
        if (!isSaving) setDisposisiDialogOpen(open);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Buat Disposisi</DialogTitle>
            <DialogDescription>Pilih surat masuk, lalu tentukan pegawai pengirim/penerima dan instruksi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Surat Masuk</Label>
              <Select value={disposisiDraft.suratId} onValueChange={(suratId) => setDisposisiDraft((draft) => ({
                ...draft,
                suratId,
                from: suratById.get(suratId)?.senderOrRecipient ?? '',
              }))}>
                <SelectTrigger><SelectValue placeholder="Pilih surat masuk" /></SelectTrigger>
                <SelectContent>
                  {suratBelumDisposisi.map((record) => (
                    <SelectItem key={record.id} value={record.id}>{record.number || record.id} — {record.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="disposition-from">Dari (Asal / Pengirim)</Label>
                <Input id="disposition-from" value={disposisiDraft.from} readOnly placeholder="Otomatis dari data surat masuk" />
              </div>
              <div className="space-y-2">
                <Label>Kepada (Pegawai)</Label>
                <Combobox options={staffOptions} value={disposisiDraft.to} onValueChange={(to) => setDisposisiDraft((draft) => ({ ...draft, to }))} placeholder="Pilih pegawai" searchPlaceholder="Cari pegawai..." />
              </div>
            </div>
            <div className="space-y-2"><Label htmlFor="disposition-instruction">Instruksi</Label><Textarea id="disposition-instruction" value={disposisiDraft.instruction} onChange={(event) => setDisposisiDraft((draft) => ({ ...draft, instruction: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="disposition-date">Tanggal Disposisi</Label><Input id="disposition-date" type="date" value={disposisiDraft.date} onChange={(event) => setDisposisiDraft((draft) => ({ ...draft, date: event.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposisiDialogOpen(false)} disabled={isSaving}>Batal</Button>
            <Button onClick={() => void saveDisposisi()} disabled={isSaving || staffNames.length === 0}>{isSaving ? 'Menyimpan...' : 'Simpan Disposisi'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingDisposisi && !confirmDisposisiEdit}
        onOpenChange={(open) => {
          if (!open && !isSaving) setEditingDisposisi(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Disposisi</DialogTitle>
            <DialogDescription>Hanya pembuat awal disposisi yang dapat mengubah penerima, instruksi, dan tanggal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Surat</Label>
              <Input
                value={editingDisposisi ? `${suratById.get(editingDisposisi.suratId)?.number || editingDisposisi.suratId} — ${suratById.get(editingDisposisi.suratId)?.subject ?? ''}` : ''}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-disposition-from">Dari (Asal / Pengirim)</Label>
              <Input id="edit-disposition-from" value={editDisposisiDraft.from} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Kepada (Pegawai)</Label>
              <Combobox
                options={staffOptions}
                value={editDisposisiDraft.to}
                onValueChange={(to) => setEditDisposisiDraft((draft) => ({ ...draft, to }))}
                placeholder="Pilih pegawai"
                searchPlaceholder="Cari pegawai..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-disposition-instruction">Instruksi</Label>
              <Textarea
                id="edit-disposition-instruction"
                value={editDisposisiDraft.instruction}
                onChange={(event) => setEditDisposisiDraft((draft) => ({ ...draft, instruction: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-disposition-date">Tanggal Disposisi</Label>
              <Input
                id="edit-disposition-date"
                type="date"
                value={editDisposisiDraft.date}
                onChange={(event) => setEditDisposisiDraft((draft) => ({ ...draft, date: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDisposisi(null)} disabled={isSaving}>Batal</Button>
            <Button
              onClick={() => {
                if (!editDisposisiDraft.to || !editDisposisiDraft.instruction.trim() || !editDisposisiDraft.date) {
                  toast({ title: 'Lengkapi data disposisi', description: 'Kepada, Instruksi, dan Tanggal wajib diisi.', variant: 'destructive' });
                  return;
                }
                setConfirmDisposisiEdit(true);
              }}
              disabled={isSaving}
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSuratTarget} onOpenChange={(open) => {
        if (!open && !isSaving) setDeleteSuratTarget(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Arsip Surat</AlertDialogTitle>
            <AlertDialogDescription>
              Surat "{deleteSuratTarget?.number || deleteSuratTarget?.subject}" akan disembunyikan dari Daftar Surat dan Daftar Disposisi. Data tetap tersimpan dan tidak dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSaving}
              onClick={(event) => {
                event.preventDefault();
                void archiveSurat();
              }}
            >
              {isSaving ? 'Mengarsipkan...' : 'Arsipkan Surat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDisposisiTarget} onOpenChange={(open) => {
        if (!open && !isSaving) setDeleteDisposisiTarget(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pembatalan Disposisi</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const linkedSurat = deleteDisposisiTarget
                  ? suratById.get(deleteDisposisiTarget.suratId)
                  : undefined;
                return (
                  <>
                    Batalkan disposisi kepada {deleteDisposisiTarget?.to} untuk surat{' '}
                    <span className="font-semibold text-foreground">
                      {linkedSurat?.number || deleteDisposisiTarget?.suratId}
                    </span>
                    {linkedSurat?.subject && <> — “{linkedSurat.subject}”</>}?
                    {' '}Data disposisi ini akan dihapus dari daftar.
                  </>
                );
              })()}
              {deleteDisposisiTarget && !disposisi.some((record) => record.id !== deleteDisposisiTarget.id && record.suratId === deleteDisposisiTarget.suratId)
                ? ' Surat akan kembali berstatus Belum disposisi dan dapat didisposisikan kembali.'
                : ' Disposisi lain untuk surat yang sama tetap dipertahankan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSaving}
              onClick={(event) => {
                event.preventDefault();
                void deleteDisposisi();
              }}
            >
              {isSaving ? 'Membatalkan...' : 'Ya, Batalkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDisposisiEdit} onOpenChange={(open) => {
        if (!open && !isSaving) setConfirmDisposisiEdit(false);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Edit Disposisi</AlertDialogTitle>
            <AlertDialogDescription>Yakin ingin menyimpan perubahan disposisi ini?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(event) => {
                event.preventDefault();
                void saveEditedDisposisi();
              }}
            >
              {isSaving ? 'Menyimpan...' : 'Ya, Simpan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
