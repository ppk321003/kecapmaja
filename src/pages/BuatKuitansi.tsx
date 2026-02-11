import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useKuitansi } from "@/contexts/KuitansiContext";
import { useKuitansiStore } from "@/contexts/KuitansiStoreContext";
import KuitansiStoreSelector from "@/components/KuitansiStoreSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Navigate } from "react-router-dom";

const formSchema = z.object({
  no_kuitansi: z.string().min(1, "Nomor kuitansi harus diisi"),
  penerima: z.string().min(1, "Penerima harus diisi"),
  nama_barang: z.string().optional(),
  harga: z.string().optional(),
  jumlah: z.string().min(1, "Jumlah harus diisi"),
  total: z.string().optional(),
  keterangan: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const BuatKuitansi: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addKuitansi } = useKuitansi();
  const { storeProfile } = useKuitansiStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check authorization
  const isAuthorized = user?.role === "Pejabat Pembuat Komitmen" && user?.satker === "3210";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      no_kuitansi: "",
      penerima: "",
      nama_barang: "",
      harga: "",
      jumlah: "",
      total: "",
      keterangan: "",
    },
  });

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      await addKuitansi({
        no_kuitansi: data.no_kuitansi,
        penerima: data.penerima,
        nama_barang: data.nama_barang,
        harga: data.harga,
        jumlah: data.jumlah,
        total: data.total,
        keterangan: data.keterangan,
        tanggal: new Date().toLocaleDateString('id-ID'),
      });

      setTimeout(() => navigate("/cetak-kuitansi"), 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/cetak-kuitansi")}
              size="sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Buat Kuitansi Baru</h1>
              <p className="text-gray-600">{storeProfile.storageName}</p>
            </div>
          </div>
          <KuitansiStoreSelector />
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="no_kuitansi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Kuitansi</FormLabel>
                    <FormControl>
                      <Input placeholder="Misal: KUI-001" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="penerima"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Penerima</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama penerima" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nama_barang"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Barang (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Misal: Catering, Buku, dll" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="harga"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga (Opsional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Harga satuan" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jumlah"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah/Qty</FormLabel>
                      <FormControl>
                        <Input placeholder="Jumlah" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Total nominal" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keterangan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keterangan (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Keterangan tambahan" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/cetak-kuitansi")}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Kuitansi"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default BuatKuitansi;
