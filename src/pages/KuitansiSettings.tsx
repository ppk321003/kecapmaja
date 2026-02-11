import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useKuitansiStore, KuitansiStoreProfile } from "@/contexts/KuitansiStoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Navigate } from "react-router-dom";

const formSchema = z.object({
  storageName: z.string().min(1, "Nama toko harus diisi"),
  storeAddress: z.string().min(1, "Alamat toko harus diisi"),
  storePhone: z.string().min(1, "Nomor telepon harus diisi"),
  storeEmail: z.string().email("Email tidak valid").optional().or(z.literal("")),
  storeFooter: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const KuitansiSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { storeProfile, updateStoreProfile } = useKuitansiStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check authorization - only PPK satker 3210
  const isAuthorized = user?.role === "Pejabat Pembuat Komitmen" && user?.satker === "3210";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storageName: storeProfile.storageName,
      storeAddress: storeProfile.storeAddress,
      storePhone: storeProfile.storePhone,
      storeEmail: storeProfile.storeEmail || "",
      storeFooter: storeProfile.storeFooter || "",
    },
  });

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      updateStoreProfile({
        storageName: data.storageName,
        storeAddress: data.storeAddress,
        storePhone: data.storePhone,
        storeEmail: data.storeEmail || "",
        storeFooter: data.storeFooter || "",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/cetak-kuitansi")}
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pengaturan Kuitansi</h1>
            <p className="text-gray-600">Konfigurasi informasi toko pada nota kuitansi</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="storageName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Toko</FormLabel>
                    <FormControl>
                      <Input placeholder="Misal: PPK Satker 3210" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nama toko yang akan ditampilkan di nota kuitansi
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storeAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat Toko</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Alamat lengkap toko" {...field} />
                    </FormControl>
                    <FormDescription>
                      Alamat yang akan ditampilkan di nota kuitansi
                    </FormDescription>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="storePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Telepon</FormLabel>
                      <FormControl>
                        <Input placeholder="Nomor telepon" {...field} />
                      </FormControl>
                      <FormDescription>
                        Nomor telepon toko
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storeEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Toko (Opsional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Email toko" type="email" {...field} />
                      </FormControl>
                      <FormDescription>
                        Email toko (opsional)
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="storeFooter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pesan Footer (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Pesan yang ditampilkan di bagian bawah nota" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Pesan ucapan terima kasih atau informasi tambahan di bawah nota
                    </FormDescription>
                  </FormItem>
                )}
              />

              <div className="pt-4 flex gap-3">
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Pengaturan"}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/cetak-kuitansi")}
                >
                  Batal
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Preview Card */}
        <div className="mt-8 bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Pratinjau Nota</h2>
          <div className="border border-gray-300 rounded-lg bg-gray-50 p-6 font-mono text-sm max-w-md">
            <div className="text-center mb-4 pb-4 border-b-2 border-dashed border-gray-400">
              <div className="font-bold">{form.watch("storageName") || "Nama Toko"}</div>
              <div className="text-xs mt-1">{form.watch("storeAddress") || "Alamat Toko"}</div>
              <div className="text-xs">{form.watch("storePhone") || "No. Telepon"}</div>
            </div>
            
            <div className="space-y-1 text-xs mb-4">
              <div>No. Kuitansi: KUI-001</div>
              <div>Tanggal: 11/02/2026</div>
              <div>Penerima: Nama Penerima</div>
              <div>Jumlah: Rp 100.000</div>
            </div>
            
            <div className="text-center pt-4 border-t-2 border-dashed border-gray-400">
              <div className="text-xs font-semibold">
                {form.watch("storeFooter") || "Terima kasih atas kepercayaan Anda"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KuitansiSettings;
