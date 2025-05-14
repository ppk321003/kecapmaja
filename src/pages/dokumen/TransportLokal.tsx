import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";

// Components
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { KomponenSelect } from "@/components/KomponenSelect";

// Hooks and Utilities
import { cn } from "@/lib/utils";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useJenis, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { toast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

// Types
interface TransportDetail {
  id: string;
  type: 'organik' | 'mitra';
  personId: string;
  name: string;
  banyaknya: number;
  kecamatanTujuan: string;
  tanggalPelaksanaan: Date;
  rateTranslok: number;
  jumlah: number;
}

// Form Schema
const formSchema = z.object({
  namaKegiatan: z.string().min(1, "Nama kegiatan harus diisi"),
  detil: z.string().optional(),
  jenis: z.string().min(1, "Jenis harus dipilih"),
  program: z.string().min(1, "Program harus dipilih"),
  kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
  kro: z.string().min(1, "KRO harus dipilih"),
  ro: z.string().min(1, "RO harus dipilih"),
  komponen: z.string().min(1, "Komponen harus dipilih"),
  akun: z.string().min(1, "Akun harus dipilih"),
  tanggalPengajuan: z.date({
    required_error: "Tanggal pengajuan harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih")
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: Partial<FormValues> = {
  namaKegiatan: "",
  detil: "",
  jenis: "",
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  tanggalPengajuan: new Date(),
  pembuatDaftar: ""
};

const kecamatanOptions = [
  "Jatiwangi", 
  "Kasokandel", 
  "Ligung", 
  "Sumberjaya", 
  "Dawuan", 
  "Panyingkiran", 
  "Leuwimunding"
];

const TransportLokal = () => {
  const navigate = useNavigate();
  const [transportDetails, setTransportDetails] = useState<TransportDetail[]>([]);
  const [availableOrganik, setAvailableOrganik] = useState<any[]>([]);
  const [availableMitra, setAvailableMitra] = useState<any[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES
  });

  // Data fetching hooks
  const { data: jenisList = [] } = useJenis();
  const { data: programList = [] } = usePrograms();
  const { data: kegiatanList = [] } = useKegiatan(form.watch("program"));
  const { data: kroList = [] } = useKRO(form.watch("kegiatan"));
  const { data: roList = [] } = useRO(form.watch("kro"));
  const { data: komponenList = [] } = useKomponen();
  const { data: akunList = [] } = useAkun();
  const { data: organikList = [], isLoading: organikLoading } = useOrganikBPS();
  const { data: mitraList = [], isLoading: mitraLoading } = useMitraStatistik();

  // Create mappings
  const programsMap = Object.fromEntries((programList || []).map(item => [item.id, item.name]));
  const kegiatanMap = Object.fromEntries((kegiatanList || []).map(item => [item.id, item.name]));
  const kroMap = Object.fromEntries((kroList || []).map(item => [item.id, item.name]));
  const roMap = Object.fromEntries((roList || []).map(item => [item.id, item.name]));
  const komponenMap = Object.fromEntries((komponenList || []).map(item => [item.id, item.name]));
  const akunMap = Object.fromEntries((akunList || []).map(item => [item.id, `${item.name} (${item.code})`]));
  const jenisMap = Object.fromEntries((jenisList || []).map(item => [item.id, item.name]));
  const organikMap = Object.fromEntries((organikList || []).map(item => [item.id, item.name]));
  const mitraMap = Object.fromEntries((mitraList || []).map(item => [item.id, item.name]));

  // Update available lists
  useEffect(() => {
    if (!organikLoading) {
      setAvailableOrganik(organikList.map(org => ({
        id: org.id,
        name: org.name,
        type: 'organik'
      })));
    }
  }, [organikList, organikLoading]);

  useEffect(() => {
    if (!mitraLoading) {
      setAvailableMitra(mitraList.map(mitra => ({
        id: mitra.id,
        name: mitra.name,
        kecamatan: mitra.kecamatan,
        type: 'mitra'
      })));
    }
  }, [mitraList, mitraLoading]);

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("YOUR_APPS_SCRIPT_URL", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      navigate("/buat-dokumen");
      toast({
        title: "Berhasil",
        description: "Data transport lokal berhasil disimpan",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message || "Terjadi kesalahan saat menyimpan form",
      });
    },
  });

  // Handler functions
  const addTransportDetail = (type: 'organik' | 'mitra', personId: string) => {
    const personList = type === 'organik' ? organikList : mitraList;
    const person = personList.find(p => p.id === personId);
    if (!person) return;

    const existing = transportDetails.find(detail => detail.personId === personId && detail.type === type);
    if (existing) {
      toast({
        title: "Info",
        description: `${person.name} sudah ada dalam daftar`
      });
      return;
    }

    const newDetail: TransportDetail = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      personId,
      name: person.name,
      banyaknya: 0,
      kecamatanTujuan: "",
      tanggalPelaksanaan: new Date(),
      rateTranslok: 0,
      jumlah: 0
    };
    setTransportDetails(prev => [...prev, newDetail]);
  };

  const removeTransportDetail = (id: string) => {
    setTransportDetails(prev => prev.filter(detail => detail.id !== id));
  };

  const handleTransportItemChange = (id: string, field: string, value: any) => {
    setTransportDetails(prev => prev.map(detail => {
      if (detail.id === id) {
        const updated = { ...detail, [field]: value };

        // Recalculate jumlah
        if (field === "banyaknya" || field === "rateTranslok") {
          updated.jumlah = (updated.banyaknya || 0) * (updated.rateTranslok || 0);
        }
        return updated;
      }
      return detail;
    }));
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (transportDetails.length === 0) {
        toast({
          variant: "destructive",
          title: "Daftar transport kosong",
          description: "Tambahkan minimal satu petugas"
        });
        return;
      }

      // Format transport details
      const formattedTransportDetails = transportDetails.map(detail => ({
        nama: detail.name,
        jenis: detail.type === 'organik' ? 'Organik BPS' : 'Mitra Statistik',
        banyaknya: detail.banyaknya,
        kecamatan: detail.kecamatanTujuan,
        tanggal: format(detail.tanggalPelaksanaan, 'yyyy-MM-dd'),
        rate: detail.rateTranslok,
        jumlah: detail.jumlah
      }));

      // Calculate total
      const totalAmount = transportDetails.reduce((sum, detail) => sum + detail.jumlah, 0);

      // Prepare payload
      const payload = {
        action: "append",
        sheetName: "TransportLokal",
        values: [
          // Header row
          [
            `trl-${format(new Date(), 'ddMMyy')}${Math.floor(Math.random() * 100)}`,
            values.namaKegiatan,
            values.detil || "",
            jenisMap[values.jenis],
            programsMap[values.program],
            kegiatanMap[values.kegiatan],
            kroMap[values.kro],
            roMap[values.ro],
            komponenMap[values.komponen],
            akunMap[values.akun],
            format(values.tanggalPengajuan, 'yyyy-MM-dd'),
            organikMap[values.pembuatDaftar],
            "TRANSPORT LOKAL" // Jenis dokumen
          ],
          // Transport details
          ...formattedTransportDetails.map(detail => [
            '',
            '', // Kolom kosong untuk alignment
            detail.nama,
            detail.jenis,
            detail.banyaknya,
            detail.kecamatan,
            detail.tanggal,
            detail.rate,
            detail.jumlah
          ]),
          // Total row
          [
            '',
            '',
            'TOTAL',
            '',
            '',
            '',
            '',
            '',
            totalAmount
          ]
        ]
      };

      console.log("Payload yang dikirim:", payload);
      await submitMutation.mutateAsync(payload);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message || "Terjadi kesalahan saat menyimpan form"
      });
    }
  };

  // Calculate total amount
  const totalAmount = transportDetails.reduce((sum, detail) => sum + detail.jumlah, 0);

  // Transport Detail Card Component
  const TransportDetailCard = ({ detail }: { detail: TransportDetail }) => (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium">{detail.name}</h4>
            <p className="text-sm text-muted-foreground">
              {detail.type === 'organik' ? 'Organik BPS' : 'Mitra Statistik'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => removeTransportDetail(detail.id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Banyaknya</Label>
            <Input 
              type="number" 
              value={detail.banyaknya} 
              onChange={e => handleTransportItemChange(
                detail.id, 
                "banyaknya", 
                parseInt(e.target.value, 10) || 0
              } 
              placeholder="0" 
            />
          </div>

          <div className="space-y-2">
            <Label>Kecamatan Tujuan</Label>
            <Select
              value={detail.kecamatanTujuan}
              onValueChange={value => handleTransportItemChange(
                detail.id,
                "kecamatanTujuan",
                value
              )}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Kecamatan" />
              </SelectTrigger>
              <SelectContent>
                {kecamatanOptions.map(kec => (
                  <SelectItem key={kec} value={kec}>
                    {kec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tanggal Pelaksanaan</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !detail.tanggalPelaksanaan && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {detail.tanggalPelaksanaan ? (
                    format(detail.tanggalPelaksanaan, "PPP")
                  ) : (
                    <span>Pilih tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={detail.tanggalPelaksanaan}
                  onSelect={date => handleTransportItemChange(
                    detail.id,
                    "tanggalPelaksanaan",
                    date || new Date()
                  )}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {detail.kecamatanTujuan && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Rate Transport (Rp)</Label>
              <Input
                type="number"
                value={detail.rateTranslok}
                onChange={e => handleTransportItemChange(
                  detail.id,
                  "rateTranslok",
                  parseInt(e.target.value, 10) || 0
                )}
                placeholder="0"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Jumlah (Rp)</Label>
          <Input 
            value={detail.jumlah.toLocaleString('id-ID')} 
            disabled 
            className="font-bold bg-gray-50" 
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold">Transport Lokal</h1>
            <p className="text-sm text-muted-foreground">
              Formulir Transport Lokal Kegiatan
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Form fields remain the same as in your original code */}
              {/* ... */}
              
              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/buat-dokumen")}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitMutation.isPending}
                  className="w-full sm:w-auto bg-teal-800 hover:bg-teal-700"
                >
                  {submitMutation.isPending ? "Menyimpan..." : "Simpan Dokumen"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default TransportLokal;