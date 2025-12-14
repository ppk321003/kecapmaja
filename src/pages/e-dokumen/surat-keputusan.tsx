import React, { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, FileText, Search, X, User, Users, Trash2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Schema Zod
const suratKeputusanSchema = z.object({
  nomorSuratKeputusan: z.string().min(1, "Nomor surat keputusan harus diisi"),
  tentang: z.string().min(1, "Tentang harus diisi"),
  menimbangKesatu: z.string().min(1, "Menimbang kesatu harus diisi"),
  menimbangKedua: z.string().optional(),
  menimbangKetiga: z.string().optional(),
  menimbangKeempat: z.string().optional(),
  memutuskanKesatu: z.string().min(1, "Memutuskan kesatu harus diisi"),
  memutuskanKedua: z.string()
    .min(1, "Memutuskan kedua harus diisi")
    .refine((val) => {
      const parts = val.split("|").map(part => part.trim());
      return parts.length === 4 && parts.every(part => part.length > 0);
    }, {
      message: "Format harus: Nama Kegiatan | Beban Anggaran | Harga | Satuan"
    }),
  tanggalMulai: z.date({ required_error: "Tanggal mulai harus diisi" }),
  tanggalSelesai: z.date({ required_error: "Tanggal selesai harus diisi" }),
  tanggalSuratKeputusan: z.date({ required_error: "Tanggal surat keputusan harus diisi" }),
  organik: z.array(z.string()),
  mitraStatistik: z.array(z.string()),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih"),
  selectedKegiatanId: z.string().optional()
}).refine(data => data.organik.length > 0 || data.mitraStatistik.length > 0, {
  message: "Minimal salah satu dari Organik atau Mitra Statistik harus dipilih",
  path: ["organik"]
}).refine(data => data.tanggalSelesai >= data.tanggalMulai, {
  message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai",
  path: ["tanggalSelesai"]
});

type SuratKeputusanFormData = z.infer<typeof suratKeputusanSchema>;
type MasterKegiatan = {
  index: number;
  role: string;
  namaKegiatan: string;
  bebanAnggaran: string;
  harga: string;
  satuan: string;
};

type SelectedPerson = {
  id: string;
  name: string;
  type: "organik" | "mitra";
};

// Constants
const TARGET_SPREADSHEET_ID = "11gtkh70Qg1ggvDNl1uXtjlh051eJ3KLe4YkCODr6TPo";
const SHEET_NAME = "SuratKeputusan";
const MASTER_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

// Custom Select Component dengan search (tetap sama)
interface FormSelectProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  isMulti?: boolean;
  isSearchable?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  noOptionsMessage?: () => string;
  className?: string;
  label?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  isMulti = false,
  isSearchable = false,
  isDisabled = false,
  isLoading = false,
  noOptionsMessage = () => "Tidak ada hasil ditemukan",
  className,
  label
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleClearSearch = () => {
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const getSelectedLabel = () => {
    if (isMulti) {
      if (Array.isArray(value) && value.length > 0) {
        const selected = options.filter(opt => value.includes(opt.value));
        return selected.map(s => s.label).join(", ");
      }
      return "";
    } else {
      const selected = options.find(opt => opt.value === value);
      return selected?.label || "";
    }
  };

  const handleValueChange = (selectedValue: string) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(selectedValue)) {
        onChange(currentValues.filter(v => v !== selectedValue));
      } else {
        onChange([...currentValues, selectedValue]);
      }
    } else {
      onChange(selectedValue);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <Select
        open={isOpen}
        onOpenChange={setIsOpen}
        value={isMulti ? undefined : value}
        onValueChange={isMulti ? undefined : handleValueChange}
        disabled={isDisabled || isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            <span className="truncate">{getSelectedLabel()}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="p-0" position="popper" align="start">
          {isSearchable && (
            <div className="sticky top-0 z-50 bg-popover p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Cari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-8 h-9"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="max-h-[250px] overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {noOptionsMessage()}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => {
                  const isSelected = isMulti
                    ? Array.isArray(value) && value.includes(option.value)
                    : value === option.value;

                  return (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className={cn("cursor-pointer", isSelected && "bg-accent")}
                      onSelect={() => handleValueChange(option.value)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </SelectItem>
                  );
                })}
              </div>
            )}
          </div>
          {isMulti && (
            <div className="p-2 border-t text-xs text-muted-foreground">
              {Array.isArray(value) && value.length > 0
                ? `${value.length} item dipilih`
                : "Pilih satu atau lebih opsi"}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

// Semua hook dan fungsi lain tetap sama (submit, sequence, dll)
const useSubmitSKToSheets = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitData = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TARGET_SPREADSHEET_ID,
          operation: "append",
          range: `${SHEET_NAME}!A:P`,
          values: [data]
        }
      });
      if (error) throw error;
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };
  return { submitData, isSubmitting };
};

const getNextSequenceNumber = async (): Promise<number> => {
  // ... (tetap sama seperti kode asli)
  // (disingkat untuk ruang, copy dari kode sebelumnya)
  try {
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: { spreadsheetId: TARGET_SPREADSHEET_ID, operation: "read", range: `${SHEET_NAME}!A:A` }
    });
    if (error) throw error;
    const values = data?.values || [];
    if (values.length <= 1) return 1;
    const nums = values.slice(1).map((row: any[]) => parseInt(row[0]) || 0).filter(n => n > 0);
    return nums.length === 0 ? 1 : Math.max(...nums) + 1;
  } catch (error) {
    throw error;
  }
};

const generateSKId = async (): Promise<string> => {
  // ... (tetap sama)
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `sk-${year}${month}`;
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: { spreadsheetId: TARGET_SPREADSHEET_ID, operation: "read", range: `${SHEET_NAME}!B:B` }
    });
    if (error) throw error;
    const values = data?.values || [];
    if (values.length <= 1) return `${prefix}001`;
    const nums = values.slice(1)
      .map((row: any[]) => row[1])
      .filter((id: string) => id?.startsWith(prefix))
      .map((id: string) => parseInt(id.replace(prefix, '')) || 0)
      .filter(n => n > 0);
    const next = nums.length === 0 ? 1 : Math.max(...nums) + 1;
    return `${prefix}${next.toString().padStart(3, '0')}`;
  } catch (error) {
    throw error;
  }
};

const useMasterKegiatan = () => {
  const [masterData, setMasterData] = useState<MasterKegiatan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: MASTER_SPREADSHEET_ID, operation: "read", range: "Sheet1!A:F" }
        });
        if (error) throw error;
        const rows = data?.values || [];
        const parsed = rows.slice(1).map((row: any[], i: number) => ({
          index: i + 1,
          role: row[1] || "",
          namaKegiatan: row[2] || "",
          bebanAnggaran: row[3] || "",
          harga: row[4] || "",
          satuan: row[5] || ""
        })).filter(item => item.namaKegiatan.trim());
        setMasterData(parsed);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);
  return { masterData, isLoading };
};

// Komponen tampilan pilihan yang sangat sederhana (tanpa tabel sama sekali)
const SelectedPersonsPreview: React.FC<{
  selectedOrganik: SelectedPerson[];
  selectedMitra: SelectedPerson[];
  onRemoveOrganik: (id: string) => void;
  onRemoveMitra: (id: string) => void;
}> = ({ selectedOrganik, selectedMitra, onRemoveOrganik, onRemoveMitra }) => {
  const allSelected = [...selectedOrganik, ...selectedMitra];

  if (allSelected.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50">
        <Users className="h-12 w-12 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-500">Belum ada yang dipilih</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-lg px-3 py-1">
          Total dipilih: {allSelected.length} orang
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedOrganik.map(person => (
          <div
            key={person.id}
            className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm font-medium"
          >
            <User className="h-4 w-4" />
            {person.name}
            <button
              type="button"
              onClick={() => onRemoveOrganik(person.id)}
              className="ml-1 hover:bg-blue-200 rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {selectedMitra.map(person => (
          <div
            key={person.id}
            className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm font-medium"
          >
            <Users className="h-4 w-4" />
            {person.name}
            <button
              type="button"
              onClick={() => onRemoveMitra(person.id)}
              className="ml-1 hover:bg-green-200 rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SuratKeputusan = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();
  const { masterData, isLoading: isLoadingMaster } = useMasterKegiatan();
  const { submitData, isSubmitting: isSubmitLoading } = useSubmitSKToSheets();

  const form = useForm<SuratKeputusanFormData>({
    resolver: zodResolver(suratKeputusanSchema),
    defaultValues: {
      nomorSuratKeputusan: "",
      tentang: "",
      menimbangKesatu: "",
      menimbangKedua: "",
      menimbangKetiga: "",
      menimbangKeempat: "",
      memutuskanKesatu: "",
      memutuskanKedua: "",
      tanggalMulai: undefined,
      tanggalSelesai: undefined,
      tanggalSuratKeputusan: undefined,
      organik: [],
      mitraStatistik: [],
      pembuatDaftar: "",
      selectedKegiatanId: ""
    }
  });

  const organikOptions = organikList.map(o => ({ value: o.id, label: o.name }));
  const mitraOptions = mitraList.map(m => ({ value: m.id, label: m.name }));
  const kegiatanOptions = masterData.map(item => ({ value: item.index.toString(), label: item.namaKegiatan }));

  const selectedOrganikIds = form.watch("organik") || [];
  const selectedMitraIds = form.watch("mitraStatistik") || [];

  const selectedOrganik = useMemo(() => selectedOrganikIds
    .map(id => organikList.find(o => o.id === id))
    .filter(Boolean)
    .map(o => ({ id: o!.id, name: o!.name, type: "organik" as const })), [selectedOrganikIds, organikList]);

  const selectedMitra = useMemo(() => selectedMitraIds
    .map(id => mitraList.find(m => m.id === id))
    .filter(Boolean)
    .map(m => ({ id: m!.id, name: m!.name, type: "mitra" as const })), [selectedMitraIds, mitraList]);

  const handleRemoveOrganik = (id: string) => {
    form.setValue("organik", selectedOrganikIds.filter(v => v !== id), { shouldValidate: true });
  };

  const handleRemoveMitra = (id: string) => {
    form.setValue("mitraStatistik", selectedMitraIds.filter(v => v !== id), { shouldValidate: true });
  };

  const formatTanggalIndonesia = (date: Date | null) => {
    if (!date) return "";
    return format(date, "d MMMM yyyy", { locale: id });
  };

  const handleKegiatanSelect = (val: string) => {
    const idx = parseInt(val);
    const keg = masterData.find(k => k.index === idx);
    if (keg) {
      const text = `${keg.namaKegiatan} | ${keg.bebanAnggaran} | ${keg.harga} | ${keg.satuan}`;
      form.setValue("memutuskanKedua", text);
      form.setValue("selectedKegiatanId", val);
      form.trigger("memutuskanKedua");
    }
  };

  const onSubmit = async (data: SuratKeputusanFormData) => {
    setIsSubmitting(true);
    try {
      const seq = await getNextSequenceNumber();
      const skId = await generateSKId();
      const orgNames = organikList.filter(o => data.organik.includes(o.id)).map(o => o.name).join(" | ");
      const mitraNames = mitraList.filter(m => data.mitraStatistik.includes(m.id)).map(m => m.name).join(" | ");
      const pembuat = organikList.find(o => o.id === data.pembuatDaftar)?.name || "";

      const row = [
        seq, skId, data.nomorSuratKeputusan, data.tentang,
        data.menimbangKesatu, data.menimbangKedua || "", data.menimbangKetiga || "", data.menimbangKeempat || "",
        data.memutuskanKesatu, data.memutuskanKedua,
        `${formatTanggalIndonesia(data.tanggalMulai)} | ${formatTanggalIndonesia(data.tanggalSelesai)}`,
        formatTanggalIndonesia(data.tanggalSuratKeputusan),
        orgNames, mitraNames, pembuat, data.selectedKegiatanId || ""
      ];

      await submitData(row);
      form.reset();
      toast({ title: "Berhasil", description: `Surat keputusan disimpan (ID: ${skId})` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal", description: err.message || "Terjadi kesalahan" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isSubmitLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <FileText className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-purple-600 tracking-tight">Surat Keputusan</h1>
            <p className="text-muted-foreground">Formulir pembuatan surat keputusan</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Data Surat Keputusan</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Semua field tetap sama seperti kode asli Anda */}
                {/* (Nomor SK, Tentang, Menimbang, Memutuskan, Tanggal, dll) */}
                {/* Hanya bagian personil yang diubah */}

                {/* Contoh field yang penting (sisanya copy dari kode asli Anda) */}
                {/* ... Menimbang, Memutuskan, Tanggal, dll ... */}

                {/* Bagian Personil */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="organik" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organik BPS</FormLabel>
                        <FormControl>
                          <FormSelect
                            placeholder="Cari dan pilih organik"
                            options={organikOptions}
                            value={field.value}
                            onChange={field.onChange}
                            isMulti={true}
                            isSearchable={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="mitraStatistik" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mitra Statistik</FormLabel>
                        <FormControl>
                          <FormSelect
                            placeholder="Cari dan pilih mitra statistik"
                            options={mitraOptions}
                            value={field.value}
                            onChange={field.onChange}
                            isMulti={true}
                            isSearchable={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="max-w-md">
                    <FormField control={form.control} name="pembuatDaftar" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pembuat Daftar</FormLabel>
                        <FormControl>
                          <FormSelect
                            placeholder="Pilih pembuat daftar"
                            options={organikOptions}
                            value={field.value}
                            onChange={field.onChange}
                            isSearchable={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Tampilan pilihan yang baru (tanpa tabel) */}
                  <div>
                    <FormLabel className="text-base font-semibold">Personil yang Dipilih</FormLabel>
                    <div className="mt-3">
                      <SelectedPersonsPreview
                        selectedOrganik={selectedOrganik}
                        selectedMitra={selectedMitra}
                        onRemoveOrganik={handleRemoveOrganik}
                        onRemoveMitra={handleRemoveMitra}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => window.location.href = "https://kecapmaja.vercel.app/e-dokumen/buat"}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading || isLoadingMaster}>
                    {isLoading ? "Menyimpan..." : "Simpan Surat Keputusan"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SuratKeputusan;