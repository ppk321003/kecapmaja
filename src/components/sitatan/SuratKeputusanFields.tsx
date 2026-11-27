import { useEffect, useState } from 'react';
import { format, isValid, parseISO, subDays } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { Person, PersonMultiSelect } from '@/components/PersonMultiSelect';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  SKActivity,
  SKMasterActivity,
  SitatanSKDetails,
  emptySKActivity,
  generateSKMemutuskanKesatu,
  generateSKMenimbangKesatu,
  generateSKMenimbangKedua,
  generateSKTentang,
  normalizeSKActivityName,
} from '@/lib/sitatan-sk';

interface SuratKeputusanFieldsProps {
  details: SitatanSKDetails;
  onDetailsChange: (patch: Partial<SitatanSKDetails>) => void;
  startDate: string;
  endDate: string;
  date: string;
  isInsert: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onDateChange: (value: string) => void;
  organikOptions: Person[];
  mitraOptions: Person[];
  organikLoading: boolean;
  mitraLoading: boolean;
  organikError: string;
  mitraError: string;
  masterActivities: SKMasterActivity[];
  masterLoading: boolean;
  masterError: string;
}

function optionsWithSelected(options: Person[], selected: string[]): Person[] {
  const known = new Set(options.map((option) => option.id));
  return [
    ...options,
    ...selected.filter((name) => !known.has(name)).map((name) => ({ id: name, name })),
  ];
}

function getVisibleMenimbangCount(details: SitatanSKDetails): number {
  if (details.menimbang4.trim()) return 4;
  if (details.menimbang3.trim()) return 3;
  return 2;
}

function keepManualText(value: string, previousGenerated: string, nextGenerated: string): string {
  return !value.trim() || value === previousGenerated ? nextGenerated : value;
}

export function SuratKeputusanFields({
  details,
  onDetailsChange,
  startDate,
  endDate,
  date,
  isInsert,
  onStartDateChange,
  onEndDateChange,
  onDateChange,
  organikOptions,
  mitraOptions,
  organikLoading,
  mitraLoading,
  organikError,
  mitraError,
  masterActivities,
  masterLoading,
  masterError,
}: SuratKeputusanFieldsProps) {
  const parsedStartDate = startDate ? parseISO(startDate) : null;
  const latestSKDate = parsedStartDate && isValid(parsedStartDate)
    ? format(subDays(parsedStartDate, 1), 'yyyy-MM-dd')
    : undefined;
  const skDateNotBeforeStart = Boolean(startDate && date && date >= startDate);
  const populatedMenimbangCount = getVisibleMenimbangCount(details);
  const [visibleMenimbangCount, setVisibleMenimbangCount] = useState(
    populatedMenimbangCount,
  );

  useEffect(() => {
    setVisibleMenimbangCount((count) => Math.max(count, populatedMenimbangCount));
  }, [populatedMenimbangCount]);

  useEffect(() => {
    const generatedMenimbang = generateSKMenimbangKedua(details.tentang);
    if (!details.menimbang2.trim() && generatedMenimbang) {
      onDetailsChange({ menimbang2: generatedMenimbang });
    }
  }, [details.menimbang2, details.tentang, onDetailsChange]);

  const selectedActivity = (activity: SKActivity) => masterActivities.find((master) =>
    master.namaKegiatan === activity.namaKegiatan
    && master.bebanAnggaran === activity.bebanAnggaran
    && master.harga === activity.harga
    && master.satuan === activity.satuan);

  const updateActivitiesFromNames = (kegiatan: SKActivity[]) => {
    const tentang = generateSKTentang(kegiatan);
    onDetailsChange({
      kegiatan,
      tentang,
      kesatu: generateSKMemutuskanKesatu(tentang),
      menimbang1: keepManualText(
        details.menimbang1,
        generateSKMenimbangKesatu(details.tentang),
        generateSKMenimbangKesatu(tentang),
      ),
      menimbang2: keepManualText(
        details.menimbang2,
        generateSKMenimbangKedua(details.tentang),
        generateSKMenimbangKedua(tentang),
      ),
    });
  };

  const updateActivity = (index: number, patch: Partial<SKActivity>) => {
    const kegiatan = details.kegiatan.map((activity, activityIndex) =>
      activityIndex === index ? { ...activity, ...patch } : activity);
    if (patch.namaKegiatan !== undefined) {
      updateActivitiesFromNames(kegiatan);
    } else {
      onDetailsChange({ kegiatan });
    }
  };

  const removeMenimbang = (index: 3 | 4) => {
    const remaining = [
      details.menimbang2,
      details.menimbang3,
      details.menimbang4,
    ];
    remaining.splice(index - 2, 1);
    onDetailsChange({
      menimbang2: remaining[0] ?? '',
      menimbang3: remaining[1] ?? '',
      menimbang4: remaining[2] ?? '',
    });
    setVisibleMenimbangCount((count) => Math.max(2, count - 1));
  };

  const availableOrganik = optionsWithSelected(organikOptions, details.organik);
  const availableMitra = optionsWithSelected(mitraOptions, details.mitra);

  return (
    <div className="space-y-5 rounded-lg border p-4 sm:col-span-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Kegiatan dan pembebanan <span className="text-destructive">*</span></Label>
          <Button type="button" variant="outline" size="sm" onClick={() => onDetailsChange({
            kegiatan: [...details.kegiatan, emptySKActivity()],
          })}>
            <Plus className="mr-1 h-4 w-4" /> Tambah kegiatan
          </Button>
        </div>
        {masterError && <p className="text-sm text-destructive">Gagal memuat master kegiatan: {masterError}</p>}
        {!masterLoading && !masterError && masterActivities.length === 0 && (
          <p className="text-sm text-muted-foreground">Master kegiatan kosong. Isi data kegiatan secara manual.</p>
        )}
        {details.kegiatan.map((activity, index) => {
          const master = selectedActivity(activity);
          const otherActivityNames = new Set(details.kegiatan
            .filter((_, activityIndex) => activityIndex !== index)
            .map((otherActivity) => normalizeSKActivityName(otherActivity.namaKegiatan))
            .filter(Boolean));
          const activityName = normalizeSKActivityName(activity.namaKegiatan);
          const isDuplicateActivity = activityName && otherActivityNames.has(activityName);
          const masterOptions = masterActivities
            .filter((item) => item.index === master?.index
              || !otherActivityNames.has(normalizeSKActivityName(item.namaKegiatan)))
            .map((item) => ({
              value: String(item.index),
              label: item.namaKegiatan,
            }));

          return (
            <div key={index} className="space-y-3 rounded-md bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Kegiatan {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus kegiatan ${index + 1}`}
                  disabled={details.kegiatan.length === 1}
                  onClick={() => updateActivitiesFromNames(
                    details.kegiatan.filter((_, activityIndex) => activityIndex !== index),
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Combobox
                options={masterOptions}
                value={master ? String(master.index) : ''}
                onValueChange={(value) => {
                  const selected = masterActivities.find((item) => String(item.index) === value);
                  if (selected) {
                    updateActivity(index, {
                      namaKegiatan: selected.namaKegiatan,
                      bebanAnggaran: selected.bebanAnggaran,
                      harga: selected.harga,
                      satuan: selected.satuan,
                    });
                  }
                }}
                placeholder={masterLoading ? 'Memuat master kegiatan...' : 'Pilih kegiatan dari master'}
                searchPlaceholder="Cari nama kegiatan..."
                emptyText="Kegiatan tidak ditemukan."
                disabled={masterLoading || masterActivities.length === 0}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`sitatan-sk-activity-${index}`}>Nama Kegiatan <span className="text-destructive">*</span></Label>
                  <Input
                    id={`sitatan-sk-activity-${index}`}
                    value={activity.namaKegiatan}
                    aria-invalid={Boolean(isDuplicateActivity)}
                    onChange={(event) => updateActivity(index, { namaKegiatan: event.target.value })}
                    placeholder="Nama kegiatan"
                  />
                  {isDuplicateActivity && (
                    <p className="text-sm text-destructive">
                      Kegiatan ini sudah dipilih pada kegiatan lain.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`sitatan-sk-budget-${index}`}>Beban Anggaran <span className="text-destructive">*</span></Label>
                  <Input
                    id={`sitatan-sk-budget-${index}`}
                    value={activity.bebanAnggaran}
                    onChange={(event) => updateActivity(index, { bebanAnggaran: event.target.value })}
                    placeholder="Beban anggaran"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`sitatan-sk-price-${index}`}>Harga <span className="text-destructive">*</span></Label>
                  <Input
                    id={`sitatan-sk-price-${index}`}
                    value={activity.harga}
                    onChange={(event) => updateActivity(index, { harga: event.target.value })}
                    placeholder="Harga"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`sitatan-sk-unit-${index}`}>Satuan <span className="text-destructive">*</span></Label>
                  <Input
                    id={`sitatan-sk-unit-${index}`}
                    value={activity.satuan}
                    onChange={(event) => updateActivity(index, { satuan: event.target.value })}
                    placeholder="Satuan"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sitatan-sk-tentang">Tentang <span className="text-destructive">*</span></Label>
        <p className="text-xs italic text-muted-foreground">
          Terisi otomatis dari nama kegiatan; kata "Honor" dihilangkan.
        </p>
        <Textarea
          id="sitatan-sk-tentang"
          value={details.tentang}
          onChange={(event) => {
            const tentang = event.target.value;
            onDetailsChange({
              tentang,
              kesatu: generateSKMemutuskanKesatu(tentang),
              menimbang1: keepManualText(
                details.menimbang1,
                generateSKMenimbangKesatu(details.tentang),
                generateSKMenimbangKesatu(tentang),
              ),
              menimbang2: keepManualText(
                details.menimbang2,
                generateSKMenimbangKedua(details.tentang),
                generateSKMenimbangKedua(tentang),
              ),
            });
          }}
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Menimbang <span className="text-destructive">*</span></Label>
          {visibleMenimbangCount < 4 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVisibleMenimbangCount((count) => Math.min(4, count + 1))}
            >
              <Plus className="mr-1 h-4 w-4" /> Tambah Menimbang
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sitatan-sk-menimbang-1">Kesatu <span className="text-destructive">*</span></Label>
            <p className="text-xs italic text-muted-foreground">
              Terisi otomatis dari Tentang dan tetap dapat diedit.
            </p>
            <Textarea
              id="sitatan-sk-menimbang-1"
              value={details.menimbang1}
              onChange={(event) => onDetailsChange({ menimbang1: event.target.value })}
              rows={3}
            />
          </div>
          {visibleMenimbangCount >= 2 && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sitatan-sk-menimbang-2">Kedua <span className="text-destructive">*</span></Label>
              <p className="text-xs italic text-muted-foreground">
                Terisi otomatis dari Tentang dan tetap dapat diedit.
              </p>
              <Textarea
                id="sitatan-sk-menimbang-2"
                value={details.menimbang2}
                onChange={(event) => onDetailsChange({ menimbang2: event.target.value })}
                rows={3}
              />
            </div>
          )}
          {visibleMenimbangCount >= 3 && (
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="sitatan-sk-menimbang-3">Ketiga (opsional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Hapus Menimbang Ketiga"
                  className="text-destructive"
                  onClick={() => removeMenimbang(3)}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Hapus
                </Button>
              </div>
              <p className="text-xs italic text-muted-foreground">
                Contoh: Bahwa untuk memenuhi kebutuhan [Tujuan Kegiatan], diperlukan petugas yang kompeten ...;
              </p>
              <Textarea
                id="sitatan-sk-menimbang-3"
                value={details.menimbang3}
                onChange={(event) => onDetailsChange({ menimbang3: event.target.value })}
                rows={3}
              />
            </div>
          )}
          {visibleMenimbangCount >= 4 && (
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="sitatan-sk-menimbang-4">Keempat (opsional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Hapus Menimbang Keempat"
                  className="text-destructive"
                  onClick={() => removeMenimbang(4)}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Hapus
                </Button>
              </div>
              <p className="text-xs italic text-muted-foreground">
                Contoh: Bahwa biaya yang timbul dibebankan pada DIPA BPS Kabupaten Majalengka Tahun Anggaran [Tahun];
              </p>
              <Textarea
                id="sitatan-sk-menimbang-4"
                value={details.menimbang4}
                onChange={(event) => onDetailsChange({ menimbang4: event.target.value })}
                rows={3}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sitatan-sk-kesatu">Memutuskan Kesatu <span className="text-destructive">*</span></Label>
        <p className="text-xs italic text-muted-foreground">
          Contoh: PETUGAS [NAMA KEGIATAN] TAHUN [TAHUN]. Isian otomatis menggunakan HURUF KAPITAL dan dapat diedit.
        </p>
        <Textarea
          id="sitatan-sk-kesatu"
          value={details.kesatu.toUpperCase()}
          onChange={(event) => onDetailsChange({ kesatu: event.target.value.toUpperCase() })}
          rows={2}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="sitatan-sk-start">Tanggal Mulai <span className="text-destructive">*</span></Label>
          <Input id="sitatan-sk-start" type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sitatan-sk-end">Tanggal Selesai <span className="text-destructive">*</span></Label>
          <Input id="sitatan-sk-end" type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sitatan-sk-date">Tanggal SK <span className="text-destructive">*</span></Label>
          <Input
            id="sitatan-sk-date"
            type="date"
            max={latestSKDate}
            value={date}
            aria-invalid={skDateNotBeforeStart}
            disabled={!isInsert}
            onChange={(event) => onDateChange(event.target.value)}
          />
          {skDateNotBeforeStart && (
            <p className="text-sm text-destructive" role="alert">
              Tanggal SK harus sebelum Tanggal Mulai.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Organik</Label>
          {organikError && <p className="text-sm text-destructive">Gagal memuat master Organik: {organikError}</p>}
          <PersonMultiSelect
            options={availableOrganik}
            value={details.organik}
            onValueChange={(organik) => onDetailsChange({
              organik,
              pembuatDaftar: organik.includes(details.pembuatDaftar) ? details.pembuatDaftar : '',
            })}
            placeholder={organikLoading ? 'Memuat daftar Organik...' : 'Pilih Organik'}
            loading={organikLoading}
            type="organik"
          />
          <p className="text-xs text-muted-foreground">Pilih minimal salah satu: Organik atau Mitra Statistik.</p>
        </div>
        <div className="space-y-2">
          <Label>Mitra Statistik</Label>
          {mitraError && <p className="text-sm text-destructive">Gagal memuat master Mitra: {mitraError}</p>}
          <PersonMultiSelect
            options={availableMitra}
            value={details.mitra}
            onValueChange={(mitra) => onDetailsChange({ mitra })}
            placeholder={mitraLoading ? 'Memuat daftar Mitra...' : 'Pilih Mitra Statistik'}
            loading={mitraLoading}
            type="mitra"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sitatan-sk-creator">Pembuat Daftar <span className="text-destructive">*</span></Label>
        <p className="text-xs text-muted-foreground">Pilih dari master Organik; tidak harus menjadi anggota yang dipilih di atas.</p>
        <Select
          value={details.pembuatDaftar}
          onValueChange={(pembuatDaftar) => onDetailsChange({ pembuatDaftar })}
          disabled={organikLoading || availableOrganik.length === 0}
        >
          <SelectTrigger id="sitatan-sk-creator">
            <SelectValue placeholder={organikLoading ? 'Memuat master Organik...' : 'Pilih Pembuat Daftar'} />
          </SelectTrigger>
          <SelectContent>
            {availableOrganik.map((person) => (
              <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
