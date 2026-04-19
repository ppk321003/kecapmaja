import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import bpsLogo from "@/assets/bps-logo.png";

const TAMU_SPREADSHEET_ID = "1Q9kPlXg18BvAtnbM-cpoQ0xud1zC3rpA6CDa3EZcRGY";
const TAMU_SHEET = "Sheet1";
const MASTER_ORGANIK_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const MASTER_ORGANIK_SHEET = "MASTER.ORGANIK";
const KODE_SATKER_FILTER = "3210";

const KEPENTINGAN_OPTIONS = [
  { id: "perpustakaan", label: "Layanan Perpustakaan" },
  { id: "konsultasi", label: "Konsultasi Statistik" },
  { id: "rekomendasi", label: "Rekomendasi Statistik (Khusus OPD/Pemda)" },
  { id: "lainnya", label: "Lainnya" },
];

const formSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama terlalu panjang"),
  asal: z.string().trim().min(2, "Asal/Instansi wajib diisi").max(150, "Terlalu panjang"),
  noHp: z
    .string()
    .trim()
    .regex(/^\d+$/, "Nomor HP hanya boleh angka")
    .min(9, "Nomor HP minimal 9 digit")
    .max(15, "Nomor HP maksimal 15 digit"),
  kepentinganList: z.array(z.string()).min(1, "Pilih minimal 1 kepentingan"),
  lainnyaText: z.string().optional(),
  tujuan: z.string().max(100).optional(),
}).superRefine((data, ctx) => {
  if (data.kepentinganList.includes("lainnya") && !data.lainnyaText?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lainnyaText"],
      message: "Mohon jelaskan kepentingan lainnya",
    });
  }
});

const formatTimestamp = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const dd = pad(date.getDate());
  const MM = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  return `${hh}:${mm}, ${dd}/${MM}/${yyyy}`;
};

type FormState = {
  nama: string;
  asal: string;
  noHp: string;
  kepentinganList: string[];
  lainnyaText: string;
  tujuan: string;
};

const INITIAL: FormState = { 
  nama: "", 
  asal: "", 
  noHp: "", 
  kepentinganList: [], 
  lainnyaText: "",
  tujuan: "" 
};

type Organik = { nama: string; noHp: string };

const ETamu = () => {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [organikList, setOrganikList] = useState<Organik[]>([]);
  const [loadingOrganik, setLoadingOrganik] = useState(true);

  // Fetch dropdown organik (filter kode satker 3210) + No HP
  useEffect(() => {
    const fetchOrganik = async () => {
      try {
        const { data: response, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: MASTER_ORGANIK_SPREADSHEET_ID,
            operation: "read",
            range: MASTER_ORGANIK_SHEET,
          },
        });
        if (error) throw error;
        const rows: any[][] = response?.values || [];
        if (rows.length < 2) return;
        const headers: string[] = rows[0].map((h: any) => String(h || "").toLowerCase().trim());
        const namaIdx = headers.findIndex((h) => h === "nama");
        const satkerIdx = headers.findIndex(
          (h) => h.includes("kode") && h.includes("satker"),
        );
        // Kolom I = index 8; fallback cari header berisi "hp"
        let hpIdx = headers.findIndex((h) => h.replace(/[\s.]/g, "") === "nohp");
        if (hpIdx === -1) hpIdx = headers.findIndex((h) => h.includes("hp"));
        if (hpIdx === -1) hpIdx = 8;

        const filtered = rows.slice(1).filter((r) => {
          if (satkerIdx === -1) return true;
          return String(r[satkerIdx] || "").trim() === KODE_SATKER_FILTER;
        });
        const items: Organik[] = filtered
          .map((r) => ({
            nama: String(r[namaIdx] || "").trim(),
            noHp: String(r[hpIdx] || "").trim(),
          }))
          .filter((o) => o.nama);
        const seen = new Set<string>();
        const unique = items.filter((o) => {
          if (seen.has(o.nama)) return false;
          seen.add(o.nama);
          return true;
        });
        unique.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
        setOrganikList(unique);
      } catch (err) {
        console.error("Gagal memuat daftar organik:", err);
      } finally {
        setLoadingOrganik(false);
      }
    };
    fetchOrganik();
  }, []);

  const handleChange = (key: keyof FormState, value: string | string[]) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const handleKepentinganToggle = (id: string) => {
    setForm((p) => ({
      ...p,
      kepentinganList: p.kepentinganList.includes(id)
        ? p.kepentinganList.filter((item) => item !== id)
        : [...p.kepentinganList, id],
    }));
    if (errors.kepentinganList) setErrors((p) => ({ ...p, kepentinganList: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      parsed.error.issues.forEach((iss) => {
        const k = iss.path[0] as keyof FormState;
        fieldErrors[k] = iss.message;
      });
      setErrors(fieldErrors);
      toast.error("Mohon lengkapi data dengan benar");
      return;
    }

    setSubmitting(true);
    try {
      const timestamp = formatTimestamp(new Date());
      const tujuanNama = parsed.data.tujuan || "";
      const matched = organikList.find((o) => o.nama === tujuanNama);
      const noHpTujuan = matched?.noHp || "";
      
      // Format kepentingan: join selected labels, append lainnya text if selected
      const selectedLabels = KEPENTINGAN_OPTIONS
        .filter((opt) => parsed.data.kepentinganList.includes(opt.id))
        .map((opt) => opt.label);
      
      let kepentinganText = selectedLabels.join("; ");
      if (parsed.data.kepentinganList.includes("lainnya") && parsed.data.lainnyaText?.trim()) {
        kepentinganText += " - " + parsed.data.lainnyaText.trim();
      }

      const row = [
        timestamp,
        parsed.data.nama,
        parsed.data.asal,
        parsed.data.noHp,
        kepentinganText,
        tujuanNama,
        noHpTujuan,
      ];

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TAMU_SPREADSHEET_ID,
          operation: "append",
          range: TAMU_SHEET,
          values: [row],
        },
      });
      if (error) throw error;

      setSuccess(true);
      setForm(INITIAL);
      toast.success("Data berhasil dikirim");
    } catch (err: any) {
      console.error("Submit e-Tamu gagal:", err);
      toast.error("Gagal mengirim data. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const bubbles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        size: 40 + Math.random() * 120,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 14 + Math.random() * 16,
      })),
    [],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[hsl(215,80%,18%)] via-[hsl(215,70%,28%)] to-[hsl(210,85%,45%)]">
      {/* Bola animasi */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {bubbles.map((b) => (
          <span
            key={b.id}
            className="absolute rounded-full bg-white/10 blur-xl animate-etamu-float"
            style={{
              width: `${b.size}px`,
              height: `${b.size}px`,
              left: `${b.left}%`,
              top: `${b.top}%`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes etamuFloat {
          0%   { transform: translate(0,0) scale(1); opacity: .35; }
          25%  { transform: translate(40px,-30px) scale(1.1); opacity: .55; }
          50%  { transform: translate(-30px,-60px) scale(.95); opacity: .4; }
          75%  { transform: translate(-50px,20px) scale(1.05); opacity: .5; }
          100% { transform: translate(0,0) scale(1); opacity: .35; }
        }
        .animate-etamu-float { animation: etamuFloat ease-in-out infinite; }
      `}</style>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-10">
        {/* Header instansi */}
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/95 p-3 shadow-xl ring-1 ring-white/40">
            <img src={bpsLogo} alt="Logo BPS" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">e-Tamu</h1>
          <p className="mt-1 text-sm text-white/85 md:text-base">
            Pencatatan Tamu Digital · BPS Kabupaten Majalengka
          </p>
        </div>

        <Card className="w-full border-white/20 bg-white/95 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-1 border-b">
            <CardTitle className="text-xl">Formulir Kunjungan</CardTitle>
            <CardDescription>
              Mohon lengkapi data kunjungan Anda dengan benar.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {success ? (
              <div className="flex flex-col items-center text-center py-6 px-2">
                <div className="relative mb-5">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl">
                    <CheckCircle2 className="h-11 w-11 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Data Tercatat
                </div>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                  Terima Kasih atas Kunjungan Anda
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Kehadiran Anda merupakan kehormatan bagi kami. Data kunjungan telah berhasil
                  tercatat pada sistem <span className="font-semibold text-foreground">e-Tamu BPS Kabupaten Majalengka</span>.
                  Mohon berkenan menunggu sejenak, petugas yang dituju akan segera melayani Anda.
                </p>
                <div className="mt-5 w-full max-w-md rounded-lg border border-border bg-muted/40 px-4 py-3 text-left">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">Salam Hormat,</span>
                    <br />
                    Badan Pusat Statistik Kabupaten Majalengka
                    <br />
                    <span className="italic">"Menyediakan Data, Mencerdaskan Bangsa"</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6"
                  onClick={() => setSuccess(false)}
                >
                  Isi Tamu Berikutnya
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nama">
                    Nama <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nama"
                    placeholder="Nama lengkap"
                    value={form.nama}
                    onChange={(e) => handleChange("nama", e.target.value)}
                    maxLength={100}
                  />
                  {errors.nama && <p className="text-xs text-destructive">{errors.nama}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asal">
                    Asal / Instansi <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="asal"
                    placeholder="Contoh: BPS Provinsi Jawa Barat"
                    value={form.asal}
                    onChange={(e) => handleChange("asal", e.target.value)}
                    maxLength={150}
                  />
                  {errors.asal && <p className="text-xs text-destructive">{errors.asal}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="noHp">
                    Nomor HP <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="noHp"
                    type="tel"
                    inputMode="numeric"
                    placeholder="08xxxxxxxxxx"
                    value={form.noHp}
                    onChange={(e) =>
                      handleChange("noHp", e.target.value.replace(/[^\d]/g, ""))
                    }
                    maxLength={15}
                  />
                  {errors.noHp && <p className="text-xs text-destructive">{errors.noHp}</p>}
                </div>

                <div className="space-y-2">
                  <Label>
                    Kepentingan <span className="text-destructive">*</span>
                  </Label>
                  <div className="space-y-3 rounded-lg border border-input bg-muted/30 p-4">
                    {KEPENTINGAN_OPTIONS.map((option) => (
                      <div key={option.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`kepentingan-${option.id}`}
                            checked={form.kepentinganList.includes(option.id)}
                            onCheckedChange={() => handleKepentinganToggle(option.id)}
                          />
                          <Label
                            htmlFor={`kepentingan-${option.id}`}
                            className="font-normal cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                        {option.id === "lainnya" && form.kepentinganList.includes("lainnya") && (
                          <div className="ml-7 mt-2">
                            <Input
                              placeholder="Jelaskan kepentingan lainnya..."
                              value={form.lainnyaText}
                              onChange={(e) =>
                                handleChange("lainnyaText", e.target.value)
                              }
                              maxLength={300}
                              className="text-sm"
                            />
                            {errors.lainnyaText && (
                              <p className="mt-1 text-xs text-destructive">
                                {errors.lainnyaText}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.kepentinganList && (
                    <p className="text-xs text-destructive">{errors.kepentinganList}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tujuan">Tujuan bertemu dengan (opsional)</Label>
                  <Select
                    value={form.tujuan}
                    onValueChange={(v) => handleChange("tujuan", v)}
                    disabled={loadingOrganik}
                  >
                    <SelectTrigger id="tujuan">
                      <SelectValue
                        placeholder={
                          loadingOrganik ? "Memuat daftar pegawai…" : "Pilih pegawai (opsional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {organikList.length === 0 && !loadingOrganik && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Daftar pegawai tidak tersedia
                        </div>
                      )}
                      {organikList.map((o) => (
                        <SelectItem key={o.nama} value={o.nama}>
                          {o.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full bg-gradient-to-r from-[hsl(215,80%,30%)] via-[hsl(215,75%,40%)] to-[hsl(210,85%,50%)] text-base font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Mengirim…
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" /> Kirim Data
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-white/70">
          © {new Date().getFullYear()} BPS Kabupaten Majalengka — Sistem Pencatatan Tamu Digital
        </p>
      </div>
    </div>
  );
};

export default ETamu;
