import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useKuitansi } from "@/contexts/KuitansiContext";
import { useKuitansiStore } from "@/contexts/KuitansiStoreContext";
import KuitansiStoreSelector from "@/components/KuitansiStoreSelector";
import { formatNumberWithSeparator } from "@/lib/formatNumber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Plus, RotateCcw, Download, Printer, Settings } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { KuitansiStoreProfile } from "@/contexts/KuitansiStoreContext";

const formSchema = z.object({
  storageName: z.string().min(1, "Nama toko harus diisi"),
  storeAddress: z.string().min(1, "Alamat toko harus diisi"),
  storePhone: z.string().min(1, "Nomor telepon harus diisi"),
  storeEmail: z.string().email("Email tidak valid").optional().or(z.literal("")),
  storeFooter: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CetakKuitansi: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { kuitansiList, isLoading } = useKuitansi();
  const { storeProfile, updateStoreProfile } = useKuitansiStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check authorization
  const isAuthorized = user?.role === "Pejabat Pembuat Komitmen" && user?.satker === "3210";

  // Settings form
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

  const onSubmit = (data: FormValues) => {
    updateStoreProfile({
      storageName: data.storageName,
      storeAddress: data.storeAddress,
      storePhone: data.storePhone,
      storeEmail: data.storeEmail || "",
      storeFooter: data.storeFooter || "",
    });
    setIsSettingsOpen(false);
  };

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isSettingsOpen) {
      form.reset({
        storageName: storeProfile.storageName,
        storeAddress: storeProfile.storeAddress,
        storePhone: storeProfile.storePhone,
        storeEmail: storeProfile.storeEmail || "",
        storeFooter: storeProfile.storeFooter || "",
      });
    }
  }, [isSettingsOpen, storeProfile, form]);

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  // Filter data berdasarkan search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return kuitansiList || [];

    const term = searchTerm.toLowerCase();
    return (kuitansiList || []).filter((item) =>
      Object.values(item).some((value) =>
        value?.toString().toLowerCase().includes(term)
      )
    );
  }, [kuitansiList, searchTerm]);

  const handlePrint = () => {
    window.print();
    toast.success("Dialog cetak sudah dibuka");
  };

  const handleDownloadCSV = () => {
    try {
      if (!kuitansiList || kuitansiList.length === 0) {
        toast.error("Tidak ada data untuk diunduh");
        return;
      }

      const headers = ["no_kuitansi", "penerima", "nama_barang", "harga", "jumlah", "total", "keterangan", "tanggal"];
      const rows = filteredData.map((item) =>
        headers
          .map((col) => {
            const str = (item[col] || "").toString();
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(",")
      );

      const csvContent = [headers.join(","), ...rows].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Kuitansi_Export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("File CSV berhasil diunduh");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Gagal mengunduh file CSV");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center py-10">
          <p className="text-gray-600">Memuat data kuitansi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Cetak Kuitansi</h1>
          <p className="text-gray-600">{storeProfile.storageName}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => navigate("/buat-kuitansi")}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            Buat Kuitansi Baru
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </Button>
          <Button
            onClick={handleDownloadCSV}
            variant="outline"
            className="gap-2"
            disabled={!filteredData || filteredData.length === 0}
          >
            <Download className="h-4 w-4" />
            Download CSV
          </Button>

          <div className="flex gap-2 ml-auto">
            <KuitansiStoreSelector />
            
            {/* Settings Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Pengaturan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Pengaturan Kuitansi</DialogTitle>
                <DialogDescription>
                  Konfigurasi informasi toko pada nota kuitansi
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="storageName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Toko</FormLabel>
                        <FormControl>
                          <Input placeholder="Nama toko" {...field} />
                        </FormControl>
                        <FormMessage />
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
                          <Textarea placeholder="Alamat" {...field} className="resize-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor Telepon</FormLabel>
                        <FormControl>
                          <Input placeholder="Nomor telepon" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storeEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Opsional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Email" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storeFooter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pesan Footer (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Pesan footer" {...field} className="resize-none" />
                        </FormControl>
                        <FormDescription>
                          Pesan di bagian bawah nota
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      Simpan
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSettingsOpen(false)}
                      className="flex-1"
                    >
                      Batal
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <Input
            type="text"
            placeholder="Cari berdasarkan nomor, nama, atau informasi lainnya..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* No Data State */}
        {!isLoading && (!kuitansiList || kuitansiList.length === 0) && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-600 mb-4">Tidak ada data kuitansi ditemukan</p>
            <Button
              onClick={() => navigate("/buat-kuitansi")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Buat Kuitansi Pertama Anda
            </Button>
          </div>
        )}

        {/* Data Table */}
        {!isLoading && kuitansiList && kuitansiList.length > 0 && (
          <>
            {filteredData.length === 0 ? (
              <div className="bg-white rounded-lg border p-8 text-center space-y-4">
                <p className="text-gray-600">Tidak ada hasil yang sesuai dengan pencarian</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="justify-center w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Pencarian
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden shadow-sm print:shadow-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">No. Kuitansi</TableHead>
                      <TableHead>Penerima</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[80px]">Tanggal</TableHead>
                      <TableHead className="w-[80px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">{item.no_kuitansi || "-"}</TableCell>
                        <TableCell className="text-sm">{item.penerima || "-"}</TableCell>
                        <TableCell className="text-sm">{item.nama_barang || "-"}</TableCell>
                        <TableCell className="text-right text-sm">{item.harga ? `Rp ${formatNumberWithSeparator(item.harga)}` : "-"}</TableCell>
                        <TableCell className="text-center text-sm">{item.jumlah ? formatNumberWithSeparator(item.jumlah) : "-"}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{item.total ? `Rp ${formatNumberWithSeparator(item.total)}` : "-"}</TableCell>
                        <TableCell className="text-sm">{item.tanggal || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/detail-kuitansi/${item.id}`)
                            }
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CetakKuitansi;
