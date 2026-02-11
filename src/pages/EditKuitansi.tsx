import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useKuitansi } from "@/contexts/KuitansiContext";
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
  jumlah: z.string().min(1, "Jumlah harus diisi"),
  keterangan: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const EditKuitansiPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getKuitansi, updateKuitansi } = useKuitansi();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const kuitansi = getKuitansi(id || "");

  if (!kuitansi) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg border p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            Kuitansi Tidak Ditemukan
          </h1>
          <Button onClick={() => navigate("/cetak-kuitansi")} className="w-full">
            Kembali ke Daftar
          </Button>
        </div>
      </div>
    );
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      no_kuitansi: kuitansi.no_kuitansi || "",
      penerima: kuitansi.penerima || "",
      jumlah: kuitansi.jumlah || "",
      keterangan: kuitansi.keterangan || "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      await updateKuitansi(id || "", {
        ...data,
        tanggal: kuitansi.tanggal,
      });
      setTimeout(() => navigate(`/detail-kuitansi/${id}`), 1000);
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
            onClick={() => navigate(`/detail-kuitansi/${id}`)}
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Kuitansi</h1>
            <p className="text-gray-600">No: {kuitansi.no_kuitansi}</p>
          </div>
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
                name="jumlah"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah</FormLabel>
                    <FormControl>
                      <Input placeholder="Jumlah nominal" {...field} />
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
                  onClick={() => navigate(`/detail-kuitansi/${id}`)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default EditKuitansiPage;
