import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Info,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { Person, PersonMultiSelect } from '@/components/PersonMultiSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useMitraStatistik, useOrganikBPS } from '@/hooks/use-database';
import { useToast } from '@/hooks/use-toast';
import { readSheetValues } from '@/lib/sheets-read';
import { supabase } from '@/integrations/supabase/client';
import {
  ArchiveClassification,
  SITATAN_HEADERS,
  SITATAN_SPREADSHEET_ID,
  SITATAN_TYPES,
  SitatanDraft,
  SitatanRecord,
  SitatanType,
  formatSitatanNumber,
  isSitatanType,
  normalizeArchiveSubcode,
  parseArchiveRows,
  parseSitatanRows,
  requiresArchiveCode,
} from '@/lib/sitatan';
import { renderSitatanDocxTemplate } from '@/lib/sitatan-template';

const TASK_ORDER_TYPE: SitatanType = 'Surat Perintah/Surat Tugas';
const TASK_ORDER_ARCHIVE = { archiveCode: 'KP', archiveSubcode: '650' } as const;
const ARCHIVE_SELECTOR_TYPES = new Set<SitatanType>([
  'Surat Dinas',
  'Nota Dinas/Memorandum',
  'Surat Undangan Intern',
  'Surat Undangan Ekstern',
  'Surat Keterangan',
  'Surat Pengantar',
  'Formulir Permintaan',
]);
const TEMPLATE_TYPES = new Set<SitatanType>(SITATAN_TYPES.filter((type) => type !== 'Formulir Permintaan'));
const NATURE_REQUIRED_TYPES = new Set<SitatanType>([
  TASK_ORDER_TYPE,
  'Surat Dinas',
  'Surat Undangan Intern',
  'Surat Undangan Ekstern',
]);
const SUBJECT_REQUIRED_TYPES = new Set<SitatanType>([
  TASK_ORDER_TYPE,
  'Surat Dinas',
  'Nota Dinas/Memorandum',
  'Surat Undangan Intern',
  'Surat Undangan Ekstern',
]);
const RECIPIENT_REQUIRED_TYPES = new Set<SitatanType>([
  'Surat Dinas',
  'Nota Dinas/Memorandum',
  'Surat Undangan Intern',
  'Surat Undangan Ekstern',
  'Surat Pengantar',
  'Formulir Permintaan',
]);

const archiveDefaultsForType = (type: SitatanType) =>
  type === TASK_ORDER_TYPE
    ? TASK_ORDER_ARCHIVE
    : { archiveCode: '', archiveSubcode: '' };

const today = () => format(new Date(), 'yyyy-MM-dd');
const currentYear = () => format(new Date(), 'yyyy');

const emptyDraft = (type: SitatanType = 'Surat Dinas'): SitatanDraft => ({
  type,
  body: '',
  insert: false,
  date: today(),
  ...archiveDefaultsForType(type),
  nature: '',
  subject: '',
  recipient: '',
  sender: '',
  organik: '',
  mitra: '',
  startDate: '',
  endDate: '',
  destination: '',
  costBearer: '',
  eSign: false,
  notes: '',
  documentUrl: '',
});

function displayDate(value: string): string {
  if (!value) return '—';
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'd MMMM yyyy', { locale: id });
}

function checkedValue(value: boolean): string {
  return value ? 'Ya' : '';
}

function parsePeopleSelection(value: string): string[] {
  return [...new Set(value.split(/[;\r\n]+/).map((person) => person.trim()).filter(Boolean))];
}

function uniquePeople(options: Person[]): Person[] {
  return [...new Map(options.map((option) => [option.id, option])).values()];
}

function preserveSelectedPeople(options: Person[], selected: string[]): Person[] {
  const optionIds = new Set(options.map((option) => option.id));
  return [
    ...options,
    ...selected
      .filter((person) => !optionIds.has(person))
      .map((person) => ({ id: person, name: person })),
  ];
}

function createSheetRow(
  draft: SitatanDraft,
  record: Pick<SitatanRecord, 'id' | 'year' | 'serial' | 'number' | 'date' | 'creator' | 'createdAt' | 'sourceId'>,
): string[] {
  const documentUrl = draft.documentUrl.trim();
  return [
    record.id,
    record.year,
    draft.type,
    record.serial,
    record.number,
    record.date,
    draft.body.trim(),
    checkedValue(draft.insert),
    draft.archiveCode,
    normalizeArchiveSubcode(draft.archiveSubcode),
    draft.nature,
    draft.subject.trim(),
    draft.recipient.trim(),
    draft.sender.trim(),
    draft.organik.trim(),
    draft.mitra.trim(),
    draft.startDate,
    draft.endDate,
    draft.destination.trim(),
    draft.costBearer.trim(),
    checkedValue(draft.eSign),
    draft.notes.trim(),
    record.creator,
    record.createdAt,
    documentUrl ? 'Lihat' : 'belum upload',
    documentUrl,
    record.sourceId,
    'Aktif',
    '',
    '',
    '',
  ];
}

function draftFromRecord(record: SitatanRecord): SitatanDraft {
  return {
    type: record.type,
    body: record.body,
    insert: record.insert,
    date: record.date,
    archiveCode: record.archiveCode,
    archiveSubcode: record.archiveSubcode,
    nature: record.nature || 'Biasa',
    subject: record.subject,
    recipient: record.recipient,
    sender: record.sender,
    organik: record.organik,
    mitra: record.mitra,
    startDate: record.startDate,
    endDate: record.endDate,
    destination: record.destination,
    costBearer: record.costBearer,
    eSign: record.eSign,
    notes: record.notes,
    documentUrl: record.documentUrl,
  };
}

async function writeSheet(body: Record<string, unknown>, sessionToken: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { ...body, sessionToken },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function Sitatan() {
  const { user } = useAuth();
  const { data: organikData, loading: organikLoading, error: organikError } = useOrganikBPS();
  const { data: mitraData, loading: mitraLoading, error: mitraError } = useMitraStatistik();
  const { toast } = useToast();
  const [records, setRecords] = useState<SitatanRecord[]>([]);
  const [archives, setArchives] = useState<ArchiveClassification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [downloadingRecordId, setDownloadingRecordId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<SitatanDraft>(emptyDraft());
  const [editing, setEditing] = useState<SitatanRecord | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [cancelTarget, setCancelTarget] = useState<SitatanRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState(currentYear());
  const [filterType, setFilterType] = useState('all');
  const [showCancelled, setShowCancelled] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setLoadError('');
    if (user?.satker !== '3210') {
      const message = 'Sitatan hanya tersedia untuk Satker 3210.';
      setLoadError(message);
      setIsLoading(false);
      return false;
    }
    try {
      const hasSitatanSession = Boolean(user.sitatanToken);
      const [letterResult, archiveResult] = await Promise.all([
        readSheetValues({
          spreadsheetId: SITATAN_SPREADSHEET_ID,
          range: 'DARI_WEB!A:AE',
          preferSupabase: hasSitatanSession,
          sessionToken: user.sitatanToken,
        }),
        readSheetValues({
          spreadsheetId: SITATAN_SPREADSHEET_ID,
          range: 'master_arsip!A:F',
          preferSupabase: hasSitatanSession,
          sessionToken: user.sitatanToken,
        }),
      ]);
      setRecords(parseSitatanRows(letterResult.values));
      setArchives(parseArchiveRows(archiveResult.values));
      return true;
    } catch (error) {
      const message = !user.sitatanToken
        ? 'Sheet tidak dapat dibaca secara publik. Deploy Edge Function Google Sheets terbaru, lalu keluar dan masuk kembali.'
        : error instanceof Error ? error.message : 'Tidak dapat membaca spreadsheet Sitatan.';
      console.error('[Sitatan] Gagal memuat data:', error);
      setLoadError(message);
      toast({ title: 'Gagal memuat Sitatan', description: message, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, user?.satker, user?.sitatanToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const yearOptions = useMemo(() => {
    const years = new Set(records.map((record) => record.year).filter(Boolean));
    years.add(currentYear());
    years.add('2027');
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [records]);

  const archiveGroups = useMemo(() => {
    const groups = new Map<string, string>();
    for (const archive of archives) {
      if (!groups.has(archive.code)) groups.set(archive.code, archive.classification);
    }
    return [...groups.entries()].map(([code, classification]) => ({
      value: code,
      label: `[${code}] ${classification}`,
    }));
  }, [archives]);

  const organikOptions = useMemo(() => uniquePeople(organikData
    .filter((person) => person.name.trim())
    .map((person) => {
      const name = person.name.trim();
      const identifier = person.nip.trim();
      const value = identifier ? `${name} [${identifier}]` : name;
      return {
        id: value,
        name: value,
        jabatan: person.jabatan,
        kecamatan: person.kecamatan,
      };
    })), [organikData]);

  const mitraOptions = useMemo(() => uniquePeople(mitraData
    .filter((person) => person.name.trim())
    .map((person) => {
      const name = person.name.trim();
      const identifier = person.nik.trim();
      const value = identifier ? `${name} [${identifier}]` : name;
      return {
        id: value,
        name: value,
        jabatan: person.pekerjaan,
        kecamatan: person.kecamatan,
      };
    })), [mitraData]);

  const selectedOrganik = useMemo(() => parsePeopleSelection(draft.organik), [draft.organik]);
  const selectedMitra = useMemo(() => parsePeopleSelection(draft.mitra), [draft.mitra]);
  const organikSelectOptions = useMemo(
    () => preserveSelectedPeople(organikOptions, selectedOrganik),
    [organikOptions, selectedOrganik],
  );
  const mitraSelectOptions = useMemo(
    () => preserveSelectedPeople(mitraOptions, selectedMitra),
    [mitraOptions, selectedMitra],
  );

  const subcodeOptions = useMemo(() => archives
    .filter((archive) => archive.code === draft.archiveCode)
    .map((archive) => ({
      value: archive.subcode,
      label: `${archive.prefix}[${archive.subcode}] ${archive.subclassification}`,
    })), [archives, draft.archiveCode]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id');
    return [...records]
      .filter((record) => record.year === filterYear)
      .filter((record) => filterType === 'all' || record.type === filterType)
      .filter((record) => showCancelled || record.status.toLocaleLowerCase('id') !== 'batal')
      .filter((record) => !query || [
        record.number,
        record.subject,
        record.body,
        record.recipient,
        record.creator,
      ].some((value) => value.toLocaleLowerCase('id').includes(query)))
      .sort((a, b) => b.rowIndex - a.rowIndex);
  }, [filterType, filterYear, records, search, showCancelled]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const activePage = Math.min(currentPage, pageCount);
  const pageStartIndex = (activePage - 1) * pageSize;
  const displayedRecords = filteredRecords.slice(pageStartIndex, pageStartIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterYear, search, showCancelled]);

  const openNew = () => {
    setEditing(null);
    setSourceId('');
    setDraft(emptyDraft());
    setDialogOpen(true);
  };

  const openEdit = (record: SitatanRecord) => {
    setEditing(record);
    setSourceId(record.sourceId);
    setDraft(draftFromRecord(record));
    setDialogOpen(true);
  };

  const openDuplicate = (record: SitatanRecord) => {
    setEditing(null);
    setSourceId(record.id);
    setDraft({
      ...draftFromRecord(record),
      documentUrl: '',
    });
    setDialogOpen(true);
  };

  const downloadTemplate = async (record: SitatanRecord) => {
    if (!user?.sitatanToken) {
      toast({
        title: 'Sesi Sitatan tidak tersedia',
        description: 'Keluar dari KECAP MAJA lalu masuk kembali sebelum mengunduh template.',
        variant: 'destructive',
      });
      return;
    }
    if (!record.number || !record.date) {
      toast({
        title: 'Data surat belum lengkap',
        description: 'Nomor dan tanggal surat harus tersedia untuk mengisi template.',
        variant: 'destructive',
      });
      return;
    }

    setDownloadingRecordId(record.id);
    try {
      const { data, error } = await supabase.functions.invoke<Blob>('google-sheets', {
        body: {
          operation: 'sitatan-download-template',
          spreadsheetId: SITATAN_SPREADSHEET_ID,
          sessionToken: user.sitatanToken,
          rowIndex: record.rowIndex,
          letterId: record.id,
          letterType: record.type,
        },
      });
      if (error) throw error;
      if (!(data instanceof Blob) || data.size === 0) {
        throw new Error('Template Word yang diterima kosong atau formatnya tidak sesuai.');
      }

      const placeholders = {
        Nomor: record.number,
        Tanggal: displayDate(record.date),
        isi_surat: record.body,
        tempat_tujuan: record.destination,
        tanggal_mulai: record.startDate ? displayDate(record.startDate) : '',
        tanggal_selesai: record.endDate ? displayDate(record.endDate) : '',
        perihal: record.subject,
        kepada: record.recipient,
        sifat: record.nature,
      };
      const documentBlob = await renderSitatanDocxTemplate(data, placeholders);
      const downloadUrl = URL.createObjectURL(documentBlob);
      const link = document.createElement('a');
      const fileName = `${record.type}_${record.number}`
        .replace(/[<>:"/\\|?*]/g, '-');
      link.href = downloadUrl;
      link.download = `${fileName}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunduh template.';
      console.error('[Sitatan] Gagal mengunduh template:', error);
      toast({ title: 'Gagal mengunduh template', description: message, variant: 'destructive' });
    } finally {
      setDownloadingRecordId(null);
    }
  };

  const saveDraft = async () => {
    if (!user?.username || !user.sitatanToken) {
      toast({
        title: 'Mode baca saja',
        description: 'Deploy Edge Function Google Sheets terbaru, lalu keluar dan masuk kembali sebelum menyimpan surat.',
        variant: 'destructive',
      });
      return;
    }
    if (!draft.body.trim()) {
      toast({ title: 'Isi Surat wajib diisi', variant: 'destructive' });
      return;
    }
    if (requiresArchiveCode(draft.type) && (!draft.archiveCode || !draft.archiveSubcode)) {
      toast({ title: 'Pilih klasifikasi arsip', description: 'Kode dan subkode arsip diperlukan untuk nomor surat ini.', variant: 'destructive' });
      return;
    }
    if (NATURE_REQUIRED_TYPES.has(draft.type) && !draft.nature) {
      toast({ title: 'Sifat surat wajib dipilih', variant: 'destructive' });
      return;
    }
    if (SUBJECT_REQUIRED_TYPES.has(draft.type) && !draft.subject.trim()) {
      toast({ title: 'Perihal wajib diisi', variant: 'destructive' });
      return;
    }
    if (RECIPIENT_REQUIRED_TYPES.has(draft.type) && !draft.recipient.trim()) {
      toast({ title: 'Kepada wajib diisi', variant: 'destructive' });
      return;
    }
    if (draft.type === 'Nota Dinas/Memorandum' && !draft.sender.trim()) {
      toast({ title: 'Dari wajib diisi', variant: 'destructive' });
      return;
    }
    if (draft.type === TASK_ORDER_TYPE && (!draft.startDate || !draft.endDate || !draft.destination.trim())) {
      toast({ title: 'Lengkapi tanggal dan tempat tujuan', description: 'Surat Perintah/Surat Tugas memerlukan tanggal mulai, tanggal selesai, dan tempat tujuan.', variant: 'destructive' });
      return;
    }
    if (draft.insert) {
      const manualDate = parseISO(draft.date);
      const validDate = !Number.isNaN(manualDate.getTime()) && format(manualDate, 'yyyy-MM-dd') === draft.date;
      const withinCurrentYear = draft.date >= `${currentYear()}-01-01` && draft.date <= today();
      const unchangedExistingDate = Boolean(editing && draft.date === editing.date);
      if (!validDate || (!withinCurrentYear && !unchangedExistingDate)) {
        toast({
          title: 'Tanggal Surat Sisip tidak valid',
          description: `Pilih tanggal dalam tahun berjalan (${currentYear()}) yang tidak melewati hari ini.`,
          variant: 'destructive',
        });
        return;
      }
    }
    if (draft.documentUrl.trim() && !isHttpUrl(draft.documentUrl.trim())) {
      toast({ title: 'Tautan dokumen tidak valid', description: 'Gunakan tautan yang diawali http:// atau https://.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        const updateRow = createSheetRow(draft, {
          id: editing.id,
          year: editing.year,
          serial: editing.serial,
          number: editing.number,
          date: draft.insert ? draft.date : editing.date,
          creator: editing.creator,
          createdAt: editing.createdAt,
          sourceId: editing.sourceId,
        });
        await writeSheet({
          spreadsheetId: SITATAN_SPREADSHEET_ID,
          operation: 'batch-update',
          updates: [
            { range: `DARI_WEB!F${editing.rowIndex}:F${editing.rowIndex}`, values: [[updateRow[5]]] },
            { range: `DARI_WEB!G${editing.rowIndex}:V${editing.rowIndex}`, values: [updateRow.slice(6, 22)] },
            { range: `DARI_WEB!Y${editing.rowIndex}:Z${editing.rowIndex}`, values: [updateRow.slice(24, 26)] },
          ],
        }, user.sitatanToken);
      } else {
        const year = currentYear();
        const { data: reservation, error: reservationError } = await supabase.functions.invoke('google-sheets', {
          body: {
            operation: 'sitatan-reserve-number',
            spreadsheetId: SITATAN_SPREADSHEET_ID,
            sessionToken: user.sitatanToken,
            year: Number(year),
            letterType: draft.type,
            archiveCode: requiresArchiveCode(draft.type) ? draft.archiveCode : '',
            archiveSubcode: requiresArchiveCode(draft.type) ? draft.archiveSubcode : '',
          },
        });
        if (reservationError) throw reservationError;
        if (typeof reservation?.serial !== 'number' || !Number.isSafeInteger(reservation.serial) || reservation.serial < 1) {
          throw new Error('Backend tidak mengembalikan nomor Sitatan yang valid.');
        }
        const serial = reservation.serial;
        const number = formatSitatanNumber(
          draft.type,
          serial,
          year,
          draft.archiveCode,
          draft.archiveSubcode,
        );
        const row = createSheetRow(draft, {
          id: crypto.randomUUID(),
          year,
          serial: String(serial),
          number,
          date: draft.insert ? draft.date : today(),
          creator: user.username,
          createdAt: new Date().toISOString(),
          sourceId,
        });
        if (row.length !== SITATAN_HEADERS.length) {
          throw new Error('Struktur data surat tidak sesuai dengan header spreadsheet.');
        }
        try {
          await writeSheet({
            spreadsheetId: SITATAN_SPREADSHEET_ID,
            operation: 'append',
            range: 'DARI_WEB!A:AE',
            values: [row],
          }, user.sitatanToken);
        } catch (error) {
          const detail = error instanceof Error ? ` ${error.message}` : '';
          throw new Error(`Nomor ${number} sudah dicadangkan dan tidak akan digunakan ulang, tetapi hasil simpan perlu diperiksa sebelum mencoba lagi.${detail}`);
        }
        setFilterYear(year);
        setFilterType(draft.type);
      }

      const refreshed = await loadData();
      setDialogOpen(false);
      setEditing(null);
      setSourceId('');
      if (refreshed) {
        toast({
          title: editing ? 'Surat diperbarui' : 'Surat tersimpan',
          description: editing ? 'Perubahan berhasil disimpan.' : 'Nomor resmi telah ditetapkan dan dicatat.',
        });
      } else {
        toast({
          title: 'Data tersimpan, daftar belum diperbarui',
          description: 'Jangan simpan ulang. Muat kembali halaman untuk memeriksa surat yang sudah tersimpan.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan surat.';
      console.error('[Sitatan] Gagal menyimpan surat:', error);
      toast({ title: 'Gagal menyimpan surat', description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelLetter = async () => {
    if (!cancelTarget || !user?.username || !user.sitatanToken || !cancelReason.trim()) return;
    setIsSaving(true);
    try {
      await writeSheet({
        spreadsheetId: SITATAN_SPREADSHEET_ID,
        operation: 'update',
        range: `DARI_WEB!AB${cancelTarget.rowIndex}:AE${cancelTarget.rowIndex}`,
        values: [['Batal', cancelReason.trim(), user.username, new Date().toISOString()]],
      }, user.sitatanToken);
      const refreshed = await loadData();
      setCancelTarget(null);
      setCancelReason('');
      if (refreshed) {
        toast({ title: 'Nomor dibatalkan', description: 'Surat tetap tersimpan dan nomor tidak akan digunakan ulang.' });
      } else {
        toast({
          title: 'Pembatalan tersimpan, daftar belum diperbarui',
          description: 'Jangan ulangi pembatalan. Muat kembali halaman untuk memeriksa status surat.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat membatalkan surat.';
      console.error('[Sitatan] Gagal membatalkan surat:', error);
      toast({ title: 'Gagal membatalkan surat', description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const canManage = (record: SitatanRecord) =>
    record.creator === user?.username || user?.role.toLocaleLowerCase('id').includes('admin') === true;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><FileText className="h-6 w-6" /> Sitatan</h1>
          <p className="text-sm text-muted-foreground">Sistem Pencatatan Tata Naskah (SiTaTaN) merupakan salah satu upaya dalam mendukung Reformasi Birokrasi BPS, dimana salah satu langkah implementasi RB yang disarankan oleh KemenPAN-RB di BPS adalah dengan mengarsipkan dokumen naskah dinas.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Tambah
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {!loadError && !user?.sitatanToken && (
        <Alert>
          <AlertDescription>
            Sesi login ini belum memiliki token Sitatan. Klik Logout di KECAP MAJA (bukan Supabase), lalu masuk kembali. Data tetap dapat dibaca sementara; fitur simpan, edit, dan batal memerlukan sesi baru.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daftar Surat Keluar</CardTitle>
          <CardDescription>Nomor resmi dibuat saat surat pertama kali disimpan. Nomor yang dibatalkan tetap tercatat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger aria-label="Filter tahun"><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger aria-label="Filter jenis surat"><SelectValue placeholder="Jenis surat" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua jenis surat</SelectItem>
                {SITATAN_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor, perihal, penerima..." className="pl-9" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="sitatan-show-cancelled"
              checked={showCancelled}
              onCheckedChange={(checked) => setShowCancelled(checked === true)}
              aria-label="Tampilkan Status Batal"
            />
            <Label htmlFor="sitatan-show-cancelled" className="cursor-pointer text-xs text-muted-foreground">
              Tampilkan Status Batal
            </Label>
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Memuat daftar Sitatan...</p>
          ) : filteredRecords.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Belum ada surat untuk filter ini.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border shadow-sm">
                <table className="w-full min-w-[1000px] table-fixed text-sm">
                  <thead className="bg-primary/10">
                    <tr className="border-b border-primary/20 text-left text-xs font-semibold uppercase tracking-wide text-foreground">
                      <th className="w-14 rounded-tl-lg p-3 text-center">No.</th>
                      <th className="w-[25%] p-3">Naskah Dinas</th>
                      <th className="w-[22%] p-3">Nomor</th>
                      <th className="w-[18%] p-3">Tanggal</th>
                      <th className="w-[20%] p-3">Kepada</th>
                      <th className="w-[156px] rounded-tr-lg p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRecords.map((record, index) => {
                      const isCancelled = record.status.toLocaleLowerCase('id') === 'batal';
                      return (
                        <tr
                          key={record.id}
                          className={`border-b border-border/70 align-top transition-colors hover:bg-primary/5 ${isCancelled ? 'bg-muted/40 text-muted-foreground' : 'even:bg-muted/20'}`}
                        >
                          <td className="p-3 text-center text-xs tabular-nums text-muted-foreground">
                            {pageStartIndex + index + 1}
                          </td>
                          <td className="max-w-[360px] p-3">
                            <div className="font-medium">{record.subject || record.body || 'Tanpa perihal'}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{record.type}</div>
                            {record.eSign && <Badge variant="outline" className="mt-2">e-sign</Badge>}
                            {isCancelled && (
                              <div className="mt-2">
                                <Badge variant="destructive">Batal</Badge>
                                {record.cancellationReason && (
                                  <div className="mt-1 max-w-[220px] text-xs">{record.cancellationReason}</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap p-3 font-medium">{record.number || '—'}</td>
                          <td className="whitespace-nowrap p-3">
                            <div>{displayDate(record.date)}</div>
                            <div className="text-xs font-semibold text-violet-700 dark:text-violet-400">
                              ({record.creator || '—'})
                            </div>
                          </td>
                          <td className="max-w-[260px] whitespace-pre-wrap p-3">{record.recipient || '—'}</td>
                          <td className="whitespace-nowrap p-2">
                            <div className="flex items-center justify-center gap-0.5">
                              {TEMPLATE_TYPES.has(record.type) ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-primary transition-colors hover:bg-primary/10 hover:text-primary"
                                  aria-label={`Unduh template ${record.type}`}
                                  title={`Unduh template ${record.type} (.docx)`}
                                  disabled={!user?.sitatanToken || downloadingRecordId !== null}
                                  onClick={() => void downloadTemplate(record)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              ) : (
                                <div
                                  role="note"
                                  aria-label="Gunakan BOS"
                                  title="Gunakan BOS"
                                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-1 text-xs font-semibold text-amber-950"
                                >
                                  <Info className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                                  <span>Gunakan BOS</span>
                                </div>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Duplikasi surat" title="Duplikasi" onClick={() => openDuplicate(record)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              {!isCancelled && canManage(record) && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit surat" title="Edit" disabled={!user?.sitatanToken} onClick={() => openEdit(record)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Batalkan nomor" title="Batalkan nomor" disabled={!user?.sitatanToken} onClick={() => {
                                    setCancelTarget(record);
                                    setCancelReason('');
                                  }}>
                                    <Ban className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Label htmlFor="sitatan-page-size" className="whitespace-nowrap text-xs font-normal">
                  Baris per halaman
                </Label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="sitatan-page-size" aria-label="Baris per halaman" className="h-8 w-[72px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="whitespace-nowrap">
                  {filteredRecords.length === 0
                    ? '0 data'
                    : `${pageStartIndex + 1}–${Math.min(pageStartIndex + pageSize, filteredRecords.length)} dari ${filteredRecords.length}`}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="Halaman sebelumnya"
                  disabled={activePage <= 1}
                  onClick={() => setCurrentPage(activePage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[100px] text-center text-xs text-muted-foreground">
                  Halaman {activePage} dari {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="Halaman berikutnya"
                  disabled={activePage >= pageCount}
                  onClick={() => setCurrentPage(activePage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!isSaving) setDialogOpen(open);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Surat Keluar' : sourceId ? 'Duplikasi Surat Keluar' : 'Tambah Surat Keluar'}</DialogTitle>
            <DialogDescription>
              {!user?.sitatanToken
                ? 'Sesi Sitatan belum tersedia. Keluar dari KECAP MAJA lalu masuk kembali untuk mengaktifkan penyimpanan.'
                : 'Tanggal biasanya diisi otomatis; Surat Sisip dapat memakai tanggal manual. Nomor resmi baru ditetapkan saat disimpan.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Jenis Surat</Label>
              <Select
                value={draft.type}
                disabled={Boolean(editing)}
                onValueChange={(value) => {
                  if (!isSitatanType(value)) return;
                  setDraft((current) => ({
                    ...current,
                    type: value,
                    notes: value === 'Nota Dinas/Memorandum' ? '' : current.notes,
                    ...archiveDefaultsForType(value),
                    nature: '',
                    subject: '',
                    recipient: '',
                    sender: '',
                    organik: '',
                    mitra: '',
                    startDate: '',
                    endDate: '',
                    destination: '',
                    costBearer: '',
                    eSign: false,
                  }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SITATAN_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <div className="flex min-h-10 items-center gap-2">
                <Checkbox
                  id="sitatan-sisip"
                  checked={draft.insert}
                  onCheckedChange={(checked) => setDraft((current) => ({ ...current, insert: checked === true }))}
                />
                <Label htmlFor="sitatan-sisip" className="font-semibold italic text-amber-700 dark:text-amber-400">
                  Apakah termasuk Surat Sisip?
                </Label>
              </div>
              {draft.insert && (
                <div className="space-y-2">
                  <Label htmlFor="sitatan-date">Tanggal Surat <span className="text-destructive">*</span></Label>
                  <Input
                    id="sitatan-date"
                    type="date"
                    required
                    min={`${currentYear()}-01-01`}
                    max={today()}
                    value={draft.date}
                    onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sitatan-body">Isi Surat <span className="text-destructive">*</span></Label>
              <Textarea id="sitatan-body" value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Isi Surat..." rows={3} />
            </div>

            {ARCHIVE_SELECTOR_TYPES.has(draft.type) && (
              <>
                <div className="space-y-2">
                  <Label>Kode Arsip <span className="text-destructive">*</span></Label>
                  <Combobox
                    options={archiveGroups}
                    value={draft.archiveCode}
                    onValueChange={(archiveCode) => setDraft((current) => ({ ...current, archiveCode, archiveSubcode: '' }))}
                    placeholder="Pilih kode arsip"
                    searchPlaceholder="Cari kode atau klasifikasi..."
                    emptyText="Kode arsip tidak ditemukan."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subkode / Klasifikasi <span className="text-destructive">*</span></Label>
                  <Combobox
                    options={subcodeOptions}
                    value={draft.archiveSubcode}
                    onValueChange={(archiveSubcode) => setDraft((current) => ({ ...current, archiveSubcode }))}
                    disabled={!draft.archiveCode}
                    placeholder="Pilih subkode"
                    searchPlaceholder="Cari subkode atau uraian..."
                    emptyText="Subkode tidak ditemukan."
                  />
                </div>
              </>
            )}

            {NATURE_REQUIRED_TYPES.has(draft.type) && (
              <div className="space-y-2">
                <Label>Sifat <span className="text-destructive">*</span></Label>
                <Select value={draft.nature} onValueChange={(nature) => setDraft((current) => ({ ...current, nature }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih sifat surat" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Biasa">Biasa</SelectItem>
                    <SelectItem value="Terbatas">Terbatas</SelectItem>
                    <SelectItem value="Rahasia">Rahasia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {draft.type === TASK_ORDER_TYPE && (
              <>
                <div className="space-y-2">
                  <Label>Organik</Label>
                  <PersonMultiSelect
                    options={organikSelectOptions}
                    value={selectedOrganik}
                    onValueChange={(organik) => setDraft((current) => ({ ...current, organik: organik.join('; ') }))}
                    placeholder={organikLoading ? 'Memuat daftar Organik...' : 'Pilih Organik'}
                    loading={organikLoading}
                    type="organik"
                  />
                  {organikError && <p className="text-sm text-destructive">Gagal memuat master Organik: {organikError}</p>}
                  {!organikLoading && !organikError && organikOptions.length === 0 && <p className="text-sm text-muted-foreground">Master Organik belum berisi pilihan.</p>}
                </div>
                <div className="space-y-2">
                  <Label>Mitra</Label>
                  <PersonMultiSelect
                    options={mitraSelectOptions}
                    value={selectedMitra}
                    onValueChange={(mitra) => setDraft((current) => ({ ...current, mitra: mitra.join('; ') }))}
                    placeholder={mitraLoading ? 'Memuat daftar Mitra...' : 'Pilih Mitra'}
                    loading={mitraLoading}
                    type="mitra"
                  />
                  {mitraError && <p className="text-sm text-destructive">Gagal memuat master Mitra: {mitraError}</p>}
                  {!mitraLoading && !mitraError && mitraOptions.length === 0 && <p className="text-sm text-muted-foreground">Master Mitra belum berisi pilihan.</p>}
                </div>
              </>
            )}

            {SUBJECT_REQUIRED_TYPES.has(draft.type) && (
              <div className="space-y-2">
                <Label htmlFor="sitatan-subject">Perihal <span className="text-destructive">*</span></Label>
                <Input id="sitatan-subject" value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} placeholder="Perihal surat" />
              </div>
            )}
            {RECIPIENT_REQUIRED_TYPES.has(draft.type) && (
              <div className="space-y-2">
                <Label htmlFor="sitatan-recipient">Kepada <span className="text-destructive">*</span></Label>
                <Input id="sitatan-recipient" value={draft.recipient} onChange={(event) => setDraft((current) => ({ ...current, recipient: event.target.value }))} placeholder="Nama atau instansi penerima" />
              </div>
            )}
            {draft.type === 'Nota Dinas/Memorandum' && (
              <div className="space-y-2">
                <Label htmlFor="sitatan-sender">Dari <span className="text-destructive">*</span></Label>
                <Input id="sitatan-sender" value={draft.sender} onChange={(event) => setDraft((current) => ({ ...current, sender: event.target.value }))} placeholder="Asal atau unit pengirim" />
              </div>
            )}
            {draft.type === TASK_ORDER_TYPE && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sitatan-start">Tanggal Mulai <span className="text-destructive">*</span></Label>
                  <Input id="sitatan-start" type="date" required value={draft.startDate} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sitatan-end">Tanggal Selesai <span className="text-destructive">*</span></Label>
                  <Input id="sitatan-end" type="date" required value={draft.endDate} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sitatan-destination">Tempat Tujuan <span className="text-destructive">*</span></Label>
                  <Input id="sitatan-destination" required value={draft.destination} onChange={(event) => setDraft((current) => ({ ...current, destination: event.target.value }))} placeholder="Tempat Tujuan..." />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="sitatan-cost">Pembebanan Biaya</Label>
                  <Input id="sitatan-cost" value={draft.costBearer} onChange={(event) => setDraft((current) => ({ ...current, costBearer: event.target.value }))} placeholder="Pembebanan Biaya (opsional)" />
                </div>
              </>
            )}

            {draft.type !== 'Nota Dinas/Memorandum' && (
              <div className="flex items-center gap-2">
                <Checkbox id="sitatan-esign" checked={draft.eSign} onCheckedChange={(checked) => setDraft((current) => ({ ...current, eSign: checked === true }))} />
                <Label htmlFor="sitatan-esign">Apakah menggunakan eTTD / e-sign?</Label>
              </div>
            )}
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              {editing && (
                <div className="space-y-2">
                  <Label htmlFor="sitatan-url">Tautan Dokumen (opsional)</Label>
                  <Input id="sitatan-url" type="url" value={draft.documentUrl} onChange={(event) => setDraft((current) => ({ ...current, documentUrl: event.target.value }))} placeholder="https://..." />
                </div>
              )}
              {draft.type !== 'Nota Dinas/Memorandum' && (
                <div className="space-y-2">
                  <Label htmlFor="sitatan-notes">Catatan</Label>
                  <Textarea id="sitatan-notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Catatan (opsional)..." rows={2} />
                </div>
              )}
            </div>

            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground sm:col-span-2">
              {draft.insert ? (
                <>Tanggal surat manual: <strong className="text-foreground">{displayDate(draft.date)}</strong>. Pilih tanggal dalam tahun berjalan, tidak melewati hari ini.</>
              ) : editing ? (
                <>Tanggal surat yang tersimpan (<strong className="text-foreground">{displayDate(editing.date)}</strong>) dipertahankan.</>
              ) : (
                <>Tanggal surat: <strong className="text-foreground">{displayDate(today())}</strong>. Tanggal diisi otomatis.</>
              )}
              {' '}({user?.username || 'akun tidak diketahui'}).
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={isSaving} onClick={() => setDialogOpen(false)}><X className="mr-2 h-4 w-4" /> Batal</Button>
            <Button disabled={isSaving || !user?.sitatanToken} onClick={() => void saveDraft()}>
              {isSaving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan dan Tetapkan Nomor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => {
        if (!open && !isSaving) {
          setCancelTarget(null);
          setCancelReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Nomor Surat</DialogTitle>
            <DialogDescription>
              Nomor {cancelTarget?.number} akan tetap tersimpan dan tidak dapat digunakan ulang.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sitatan-cancel-reason">Alasan Pembatalan</Label>
            <Textarea id="sitatan-cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={isSaving} onClick={() => setCancelTarget(null)}>Kembali</Button>
            <Button variant="destructive" disabled={isSaving || !cancelReason.trim()} onClick={() => void cancelLetter()}>
              {isSaving ? 'Membatalkan...' : 'Batalkan Nomor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
