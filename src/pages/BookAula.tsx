import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { id } from 'date-fns/locale';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useToast } from '@/hooks/use-toast';
import {
  AULA_ROOMS,
  AulaBooking,
  AulaBookingDraft,
  AulaRoom,
  buildAulaAuditStatus,
  buildAulaCreatedBy,
  getAulaBookingOwner,
  hasAulaBookingConflict,
  isAulaBookingDeleted,
  isOverCapacity,
} from '@/lib/book-aula';
import { readSheetValues } from '@/lib/sheets-read';
import { supabase } from '@/integrations/supabase/client';

const SHEET_HEADERS = [
  'ID_Pemesanan',
  'Nama_Peminjam',
  'Ruang',
  'Tanggal',
  'Waktu_Mulai',
  'Waktu_Selesai',
  'Jumlah_Peserta',
  'Keperluan',
  'Status',
  'Dibuat_Pada',
];

const formatDateForInput = (date: Date) => format(date, 'yyyy-MM-dd');

function normalizeSheetDate(value: string): string {
  const raw = value.trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;

  const gvizMatch = raw.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);
  if (gvizMatch) {
    return format(new Date(Number(gvizMatch[1]), Number(gvizMatch[2]), Number(gvizMatch[3])), 'yyyy-MM-dd');
  }

  const localMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (localMatch) {
    return `${localMatch[3]}-${localMatch[2].padStart(2, '0')}-${localMatch[1].padStart(2, '0')}`;
  }
  return '';
}

function normalizeSheetTime(value: string): string {
  const raw = value.trim();
  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (timeMatch) {
    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (timeMatch[3]?.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (timeMatch[3]?.toUpperCase() === 'AM' && hours === 12) hours = 0;
    if (hours > 23 || minutes > 59) return '';
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  const serial = Number(raw);
  if (raw && Number.isFinite(serial) && serial >= 0 && serial < 1) {
    const minutes = Math.round(serial * 24 * 60) % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  return '';
}

function parseBookings(values: string[][]): AulaBooking[] {
  const header = values[0]?.slice(0, SHEET_HEADERS.length).map((cell) => cell.trim().toLowerCase()) ?? [];
  const expectedHeader = SHEET_HEADERS.map((cell) => cell.toLowerCase());
  if (expectedHeader.some((cell, index) => header[index] !== cell)) {
    throw new Error('Header sheet Book Aula harus sesuai kolom A sampai J yang telah disepakati.');
  }

  return values.slice(1).flatMap((row, index) => {
    const id = row[0]?.trim() ?? '';
    const room = row[2]?.trim() ?? '';
    const status = row[8]?.trim() ?? '';
    const date = normalizeSheetDate(row[3] ?? '');
    const startTime = normalizeSheetTime(row[4] ?? '');
    const endTime = normalizeSheetTime(row[5] ?? '');
    if (!id || !room || !date || !startTime || !endTime || isAulaBookingDeleted(status)) return [];
    if (!AULA_ROOMS.some((item) => item.name === room)) return [];

    return [{
      id,
      borrower: row[1]?.trim() ?? '',
      room: room as AulaRoom,
      date,
      startTime,
      endTime,
      participants: Number(row[6]) || 0,
      activity: row[7]?.trim() ?? '',
      status,
      createdBy: row[9]?.trim() ?? '',
      rowIndex: index + 2,
    }];
  });
}

const newDraft = (): AulaBookingDraft => ({
  borrower: '',
  room: 'Aula Sinergi',
  date: formatDateForInput(new Date()),
  startTime: '',
  endTime: '',
  participants: 1,
  activity: '',
});

export default function BookAula() {
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const { toast } = useToast();
  const bookingSheetId = satkerContext?.getUserSatkerSheetId('aula') ?? '';
  const masterOrganikSheetId = satkerContext?.getUserSatkerSheetId('masterorganik') ?? '';

  const [bookings, setBookings] = useState<AulaBooking[]>([]);
  const [borrowerNames, setBorrowerNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<AulaBooking | null>(null);
  const [draft, setDraft] = useState<AulaBookingDraft>(newDraft);
  const [pendingEdit, setPendingEdit] = useState<AulaBookingDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AulaBooking | null>(null);
  const [bookingSearch, setBookingSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const pageSize = 10;

  const loadBookings = useCallback(async () => {
    if (!bookingSheetId) return [];
    const { values } = await readSheetValues({
      spreadsheetId: bookingSheetId,
      range: 'Sheet1!A:J',
      preferSupabase: true,
    });
    const parsed = parseBookings(values);
    setBookings(parsed);
    return parsed;
  }, [bookingSheetId]);

  const loadBorrowers = useCallback(async () => {
    if (!masterOrganikSheetId) return;
    const { values } = await readSheetValues({
      spreadsheetId: masterOrganikSheetId,
      range: 'MASTER.ORGANIK!A:D',
    });
    const names = [...new Set(values.slice(1)
      .map((row) => row[3]?.trim() ?? '')
      .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
    setBorrowerNames(names);
  }, [masterOrganikSheetId]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadBookings(), loadBorrowers()]);
    } catch (error) {
      console.error('[BookAula] Gagal memuat data:', error);
      toast({
        title: 'Gagal memuat Book Aula',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat membaca spreadsheet.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadBookings, loadBorrowers, toast]);

  useEffect(() => {
    if (!bookingSheetId || !masterOrganikSheetId) {
      setIsLoading(false);
      return;
    }
    void refreshData();
  }, [bookingSheetId, masterOrganikSheetId, refreshData]);

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    const query = bookingSearch.trim().toLocaleLowerCase('id');
    if (!query) return sortedBookings;
    return sortedBookings.filter((booking) =>
      booking.borrower.toLocaleLowerCase('id').includes(query)
      || booking.activity.toLocaleLowerCase('id').includes(query)
    );
  }, [bookingSearch, sortedBookings]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageBookings = filteredBookings.slice((safePage - 1) * pageSize, safePage * pageSize);

  const calendarDays = useMemo(() => {
    const first = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const last = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: first, end: last });
  }, [calendarMonth]);

  const calendarBookings = useMemo(
    () => sortedBookings.filter((booking) => booking.date === formatDateForInput(selectedCalendarDate)),
    [selectedCalendarDate, sortedBookings],
  );

  const resetForm = () => {
    setDraft(newDraft());
    setEditingBooking(null);
    setIsDialogOpen(false);
  };

  const openCreateForm = () => {
    setEditingBooking(null);
    setDraft(newDraft());
    setIsDialogOpen(true);
  };

  const openEditForm = (booking: AulaBooking) => {
    setEditingBooking(booking);
    setDraft({
      borrower: booking.borrower,
      room: booking.room,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      participants: booking.participants,
      activity: booking.activity,
    });
    setIsDialogOpen(true);
  };

  const validateDraft = (value: AulaBookingDraft): string | null => {
    if (!value.borrower) return 'Nama peminjam wajib dipilih dari Master Organik.';
    if (!value.date || !value.startTime || !value.endTime) return 'Tanggal, waktu mulai, dan waktu selesai wajib diisi.';
    if (value.endTime <= value.startTime) return 'Waktu selesai harus setelah waktu mulai pada tanggal yang sama.';
    if (!Number.isInteger(value.participants) || value.participants < 1) return 'Jumlah peserta minimal 1 orang.';
    if (value.activity.trim().length < 10) return 'Kegiatan wajib diisi minimal 10 karakter.';
    return null;
  };

  const writeSheet = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('google-sheets', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  };

  const submitCreate = async () => {
    if (!user?.username || !bookingSheetId) return;
    const validationError = validateDraft(draft);
    if (validationError) {
      toast({ title: 'Periksa isian', description: validationError, variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const currentBookings = await loadBookings();
      if (hasAulaBookingConflict(draft, currentBookings)) {
        toast({
          title: 'Jadwal bentrok',
          description: 'Ruang tersebut sudah dipesan pada waktu yang beririsan. Silakan pilih waktu lain.',
          variant: 'destructive',
        });
        return;
      }

      const now = new Date();
      const values = [[
        `AULA-${crypto.randomUUID()}`,
        draft.borrower,
        draft.room,
        draft.date,
        draft.startTime,
        draft.endTime,
        draft.participants,
        draft.activity.trim(),
        buildAulaAuditStatus('dibuat', user.username, now),
        buildAulaCreatedBy(user.username, now),
      ]];
      await writeSheet({
        spreadsheetId: bookingSheetId,
        operation: 'append',
        range: 'Sheet1!A:J',
        values,
      });
      await loadBookings();
      toast({ title: 'Pemesanan dibuat', description: 'Book Aula berhasil disimpan.' });
      resetForm();
    } catch (error) {
      console.error('[BookAula] Gagal membuat pemesanan:', error);
      toast({
        title: 'Gagal membuat pemesanan',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan data.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmEdit = async () => {
    if (!pendingEdit || !editingBooking || !user?.username || !bookingSheetId) return;
    const validationError = validateDraft(pendingEdit);
    if (validationError) {
      toast({ title: 'Periksa isian', description: validationError, variant: 'destructive' });
      setPendingEdit(null);
      return;
    }

    setIsSaving(true);
    try {
      const currentBookings = await loadBookings();
      const currentBooking = currentBookings.find((booking) => booking.id === editingBooking.id);
      if (!currentBooking || getAulaBookingOwner(currentBooking.createdBy) !== user.username) {
        throw new Error('Pemesanan tidak ditemukan atau Anda bukan pembuatnya.');
      }
      if (hasAulaBookingConflict(pendingEdit, currentBookings, currentBooking.id)) {
        toast({
          title: 'Jadwal bentrok',
          description: 'Ruang tersebut sudah dipesan pada waktu yang beririsan. Silakan pilih waktu lain.',
          variant: 'destructive',
        });
        return;
      }

      await writeSheet({
        spreadsheetId: bookingSheetId,
        operation: 'update',
        range: `Sheet1!C${currentBooking.rowIndex}:I${currentBooking.rowIndex}`,
        values: [[
          pendingEdit.room,
          pendingEdit.date,
          pendingEdit.startTime,
          pendingEdit.endTime,
          pendingEdit.participants,
          pendingEdit.activity.trim(),
          buildAulaAuditStatus('diedit', user.username),
        ]],
      });
      await loadBookings();
      toast({ title: 'Pemesanan diperbarui', description: 'Perubahan Book Aula berhasil disimpan.' });
      setPendingEdit(null);
      resetForm();
    } catch (error) {
      console.error('[BookAula] Gagal mengedit pemesanan:', error);
      toast({
        title: 'Gagal mengedit pemesanan',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui data.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !user?.username || !bookingSheetId) return;
    setIsSaving(true);
    try {
      const currentBookings = await loadBookings();
      const currentBooking = currentBookings.find((booking) => booking.id === pendingDelete.id);
      if (!currentBooking || getAulaBookingOwner(currentBooking.createdBy) !== user.username) {
        throw new Error('Pemesanan tidak ditemukan atau Anda bukan pembuatnya.');
      }
      await writeSheet({
        spreadsheetId: bookingSheetId,
        operation: 'update',
        range: `Sheet1!I${currentBooking.rowIndex}:I${currentBooking.rowIndex}`,
        values: [[buildAulaAuditStatus('dihapus', user.username)]],
      });
      await loadBookings();
      toast({ title: 'Pemesanan dihapus', description: 'Pemesanan diarsipkan dan tidak lagi ditampilkan.' });
      setPendingDelete(null);
    } catch (error) {
      console.error('[BookAula] Gagal menghapus pemesanan:', error);
      toast({
        title: 'Gagal menghapus pemesanan',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus data.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderBookingActions = (booking: AulaBooking) => {
    if (getAulaBookingOwner(booking.createdBy) !== user?.username) return null;
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => openEditForm(booking)} aria-label={`Edit pemesanan ${booking.id}`}>
          <Pencil className="mr-1 h-4 w-4" /> Edit
        </Button>
        <Button size="sm" variant="destructive" onClick={() => setPendingDelete(booking)} aria-label={`Hapus pemesanan ${booking.id}`}>
          <Trash2 className="mr-1 h-4 w-4" /> Hapus
        </Button>
      </div>
    );
  };

  if (satkerContext?.isLoading || isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Memuat Book Aula...</div>;
  }

  if (!bookingSheetId) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Book Aula</h1>
        <Alert variant="destructive">
          <AlertDescription>
            ID spreadsheet Book Aula belum diisi untuk satker Anda. Isi kolom AE (`aula_sheet_id`) pada `satker_config`.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!masterOrganikSheetId) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Book Aula</h1>
        <Alert variant="destructive">
          <AlertDescription>ID Master Organik untuk satker Anda belum tersedia pada `satker_config`.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const nameOptions = borrowerNames.map((name) => ({ value: name, label: name }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Book Aula</h1>
          <p className="text-sm text-muted-foreground">Lihat ketersediaan dan pesan ruang rapat satker Anda.</p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" /> Buat Pemesanan
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {AULA_ROOMS.map((room) => (
          <Card key={room.name}>
            <CardContent className="flex items-center justify-between p-4">
              <span className="font-semibold">{room.name}</span>
              <Badge variant="secondary">Maks. {room.capacity} orang</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="daftar">
        <TabsList>
          <TabsTrigger value="daftar">Daftar</TabsTrigger>
          <TabsTrigger value="kalender">Kalender</TabsTrigger>
        </TabsList>
        <TabsContent value="daftar">
          <Card>
            <CardHeader>
              <CardTitle>Jadwal Pemesanan</CardTitle>
              <CardDescription>Hanya pemesanan aktif yang ditampilkan. Jadwal bentrok pada ruang yang sama tidak dapat disimpan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={bookingSearch}
                    onChange={(event) => {
                      setBookingSearch(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari kegiatan atau nama pemesan..."
                    aria-label="Cari kegiatan atau nama pemesan"
                    className="pl-9"
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {filteredBookings.length} pemesanan
                </span>
              </div>
              {filteredBookings.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {sortedBookings.length === 0 ? 'Belum ada pemesanan ruang.' : 'Tidak ada pemesanan yang sesuai pencarian.'}
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-3">Tanggal & Waktu</th>
                          <th className="p-3">Ruang</th>
                          <th className="p-3">Nama Peminjam</th>
                          <th className="p-3">Peserta</th>
                          <th className="p-3">Kegiatan</th>
                          <th className="p-3">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageBookings.map((booking) => (
                          <tr key={booking.id} className="border-b align-top">
                            <td className="whitespace-nowrap p-3">
                              {format(parseISO(booking.date), 'dd MMM yyyy', { locale: id })}
                              <br />
                              <span className="text-muted-foreground">{booking.startTime}–{booking.endTime}</span>
                            </td>
                            <td className="p-3">{booking.room}</td>
                            <td className="p-3">{booking.borrower}</td>
                            <td className="p-3">{booking.participants}</td>
                            <td className="max-w-xs whitespace-pre-wrap p-3">{booking.activity}</td>
                            <td className="p-3">{renderBookingActions(booking) ?? <span className="text-muted-foreground">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-muted-foreground">
                      Menampilkan {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredBookings.length)} dari {filteredBookings.length}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={safePage === 1}
                      >
                        Sebelumnya
                      </Button>
                      <span className="text-sm text-muted-foreground">Halaman {safePage} dari {totalPages}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={safePage === totalPages}
                      >
                        Berikutnya
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kalender">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Kalender Ruang</CardTitle>
                <CardDescription>Pilih tanggal untuk melihat jadwal pemesanan.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" aria-label="Bulan sebelumnya" onClick={() => setCalendarMonth((month) => subMonths(month, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-32 text-center font-medium">{format(calendarMonth, 'MMMM yyyy', { locale: id })}</span>
                <Button variant="outline" size="icon" aria-label="Bulan berikutnya" onClick={() => setCalendarMonth((month) => addMonths(month, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-7 gap-1">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                  <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
                ))}
                {calendarDays.map((day) => {
                  const dayKey = formatDateForInput(day);
                  const count = sortedBookings.filter((booking) => booking.date === dayKey).length;
                  const selected = isSameDay(day, selectedCalendarDate);
                  return (
                    <button
                      type="button"
                      key={dayKey}
                      onClick={() => setSelectedCalendarDate(day)}
                      className={`min-h-16 rounded-md border p-2 text-left transition-colors hover:bg-accent ${selected ? 'border-primary bg-accent' : ''} ${isSameMonth(day, calendarMonth) ? '' : 'text-muted-foreground/50'}`}
                    >
                      <span className="text-sm">{format(day, 'd')}</span>
                      {count > 0 && <span className="mt-1 block text-xs text-primary">{count} jadwal</span>}
                    </button>
                  );
                })}
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <CalendarDays className="h-4 w-4" />
                  {format(selectedCalendarDate, 'EEEE, dd MMMM yyyy', { locale: id })}
                </h3>
                {calendarBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada pemesanan pada tanggal ini.</p>
                ) : (
                  <div className="space-y-3">
                    {calendarBookings.map((booking) => (
                      <div key={booking.id} className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-medium">{booking.startTime}–{booking.endTime} · {booking.room}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.borrower} · {booking.participants} peserta
                          </p>
                          <p className="mt-1 text-sm">{booking.activity}</p>
                        </div>
                        {renderBookingActions(booking)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open && !isSaving) resetForm();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBooking ? 'Edit Pemesanan Ruang' : 'Buat Pemesanan Ruang'}</DialogTitle>
            <DialogDescription>Isi data pemesanan. Kegiatan wajib minimal 10 karakter.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="borrower">Nama Peminjam</Label>
              <Combobox
                id="borrower"
                options={nameOptions}
                value={draft.borrower}
                onValueChange={(borrower) => setDraft((current) => ({ ...current, borrower }))}
                placeholder="Pilih nama peminjam"
                searchPlaceholder="Cari nama..."
                emptyText="Nama tidak ditemukan."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Ruang</Label>
              <Select value={draft.room} onValueChange={(room: AulaRoom) => setDraft((current) => ({ ...current, room }))}>
                <SelectTrigger id="room"><SelectValue placeholder="Pilih ruang" /></SelectTrigger>
                <SelectContent>
                  {AULA_ROOMS.map((room) => <SelectItem key={room.name} value={room.name}>{room.name} (maks. {room.capacity})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="booking-date">Tanggal</Label>
                <Input id="booking-date" type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-time">Waktu Mulai</Label>
                <Input id="start-time" type="time" value={draft.startTime} onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">Waktu Selesai</Label>
                <Input id="end-time" type="time" value={draft.endTime} onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="participants">Jumlah Peserta</Label>
              <Input
                id="participants"
                type="number"
                min={1}
                step={1}
                value={draft.participants}
                onChange={(event) => setDraft((current) => ({ ...current, participants: Number(event.target.value) }))}
              />
              {isOverCapacity(draft.room, draft.participants) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Jumlah peserta melebihi kapasitas {AULA_ROOMS.find((room) => room.name === draft.room)?.capacity} orang. Pemesanan tetap dapat dilanjutkan.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity">Kegiatan</Label>
              <Input
                id="activity"
                value={draft.activity}
                maxLength={200}
                onChange={(event) => setDraft((current) => ({ ...current, activity: event.target.value }))}
                placeholder="Tuliskan kegiatan (minimal 10 karakter)"
              />
              <p className="text-xs text-muted-foreground">{draft.activity.trim().length}/10 karakter minimum</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} disabled={isSaving}>Batal</Button>
            <Button onClick={() => {
              if (editingBooking) setPendingEdit({ ...draft });
              else void submitCreate();
            }} disabled={isSaving || borrowerNames.length === 0}>
              {isSaving ? 'Menyimpan...' : editingBooking ? 'Simpan Perubahan' : 'Buat Pemesanan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingEdit} onOpenChange={(open) => {
        if (!open && !isSaving) setPendingEdit(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Perubahan</AlertDialogTitle>
            <AlertDialogDescription>Yakin ingin menyimpan perubahan pada pemesanan ruang ini?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={isSaving} onClick={(event) => {
              event.preventDefault();
              void confirmEdit();
            }}>
              {isSaving ? 'Menyimpan...' : 'Ya, Simpan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => {
        if (!open && !isSaving) setPendingDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Pemesanan</AlertDialogTitle>
            <AlertDialogDescription>
              Pemesanan {pendingDelete?.room} pada {pendingDelete?.date} pukul {pendingDelete?.startTime}–{pendingDelete?.endTime} akan diarsipkan. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={isSaving} onClick={(event) => {
              event.preventDefault();
              void confirmDelete();
            }}>
              {isSaving ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
