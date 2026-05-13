import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload as UploadIcon, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Tipe data
type JenisDokumen = "Laporan" | "Rencana Tindak Lanjut" | "Bukti Dukung" | "Output Kegiatan" | "Lainnya";
type UploadStatus = "idle" | "uploading" | "success" | "error";

interface Organik {
  nama: string;
  nik: string;
  pekerjaan: string;
  alamat: string;
  bank: string;
  rekening: string;
  kecamatan: string;
  whatsapp: string;
}

interface UploadFormData {
  jenisDokumen: JenisDokumen | "";
  judul: string;
  tahun: string;
  namaOrganik: string;
  file: File | null;
  keterangan: string;
}

const JENIS_DOKUMEN_OPTIONS: JenisDokumen[] = [
  "Laporan",
  "Rencana Tindak Lanjut",
  "Bukti Dukung",
  "Output Kegiatan",
  "Lainnya",
];

const TAHUN_OPTIONS = ["2025", "2026", "2027", "2028", "2029", "2030"];

const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const GOOGLE_DRIVE_FOLDER_ID = "1CpAkfoxliks8Xi2CMmYbELSV3mDpKvLJ";

export function UnggahDokumen() {
  const { toast } = useToast();
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();

  const [formData, setFormData] = useState<UploadFormData>({
    jenisDokumen: "",
    judul: "",
    tahun: new Date().getFullYear().toString(),
    namaOrganik: "",
    file: null,
    keterangan: "",
  });

  const [organik, setOrganik] = useState<Organik[]>([]);
  const [loadingOrganik, setLoadingOrganik] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [dragActive, setDragActive] = useState(false);

  // Fetch Master Organik data
  const fetchOrganik = useCallback(async () => {
    try {
      setLoadingOrganik(true);
      const masterSheetId = satkerContext?.getUserSatkerSheetId('masterorganik') || MASTER_SPREADSHEET_ID;

      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: masterSheetId,
          operation: "read",
          range: "MASTER.ORGANIK",
        },
      });

      if (error) throw error;

      const rows = data?.values || [];
      if (rows.length <= 1) {
        setMitra([]);
        return;
      }

      // Parse headers
      const headers = rows[0];
      const namaIdx = headers.findIndex((h: string) =>
        h?.toLowerCase().trim() === "nama"
      );
      const nikIdx = headers.findIndex((h: string) =>
        h?.toLowerCase().trim() === "nik"
      );
      const pekerjaanIdx = headers.findIndex((h: string) =>
        h?.toLowerCase().trim() === "pekerjaan"
      );
      const alamatIdx = headers.findIndex((h: string) =>
        h?.toLowerCase().trim() === "alamat"
      );
      const bankIdx = headers.findIndex((h: string) =>
        h?.toLowerCase().trim() === "bank"
      );
      const rekeningIdx = headers.findIndex((h: string) =>
        h?.toLowerCase().trim() === "rekening"
      );
      const kecamatanIdx = headers.findIndex((h: string) =>
        h?.toLowerCase().trim() === "kecamatan"
      );
      const whatsappIdx = headers.findIndex((h: string) =>
        h?.toLowerCase().trim().replace(/[\s.]/g, "") === "nohp" ||
        h?.toLowerCase().trim().includes("hp") ||
        h?.toLowerCase().trim().includes("whatsapp")
      );

      const organikData = rows.slice(1).map((row: any[]) => ({
        nama: row[namaIdx]?.toString().trim() || "",
        nik: row[nikIdx]?.toString().trim() || "",
        pekerjaan: row[pekerjaanIdx]?.toString().trim() || "",
        alamat: row[alamatIdx]?.toString().trim() || "",
        bank: row[bankIdx]?.toString().trim() || "",
        rekening: row[rekeningIdx]?.toString().trim() || "",
        kecamatan: row[kecamatanIdx]?.toString().trim() || "",
        whatsapp: row[whatsappIdx]?.toString().trim() || "",
      })).filter((o: Organik) => o.nama);

      setOrganik(organikData);
    } catch (error: any) {
      console.error("Error fetching organik:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data Organik",
        variant: "destructive",
      });
    } finally {
      setLoadingOrganik(false);
    }
  }, [satkerContext, toast]);

  useEffect(() => {
    fetchOrganik();
  }, [fetchOrganik]);

  // Fungsi untuk upload file ke Google Drive
  const uploadToGoogleDrive = async () => {
    if (!formData.file || !formData.jenisDokumen || !formData.judul || !formData.namaOrganik) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadStatus("uploading");

      // Generate nama file dengan format: Jenis Dokumen - Judul Dokumen - Nama Organik
      const generatedFileName = `${formData.jenisDokumen} - ${formData.judul} - ${formData.namaOrganik}`;
      const fileExtension = formData.file.name.split(".").pop();
      const finalFileName = `${generatedFileName}.${fileExtension}`;

      // Invoke edge function untuk upload
      const { data, error } = await supabase.functions.invoke("upload-dokumen", {
        body: {
          fileName: finalFileName,
          fileData: await formData.file.arrayBuffer(),
          mimeType: formData.file.type,
          tahun: formData.tahun,
          jenisDokumen: formData.jenisDokumen,
          namaOrganik: formData.namaOrganik,
          folderDriveId: GOOGLE_DRIVE_FOLDER_ID,
          keterangan: formData.keterangan,
          uploadedBy: user?.username,
        },
      });

      if (error) throw error;

      setUploadStatus("success");
      toast({
        title: "Sukses",
        description: `File ${finalFileName} berhasil diupload`,
      });

      // Reset form
      setFormData({
        jenisDokumen: "",
        judul: "",
        tahun: new Date().getFullYear().toString(),
        namaOrganik: "",
        file: null,
        keterangan: "",
      });

      // Reset input file
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Reset status setelah 3 detik
      setTimeout(() => setUploadStatus("idle"), 3000);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      toast({
        title: "Error",
        description: error.message || "Gagal upload file",
        variant: "destructive",
      });
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === "application/pdf") {
        setFormData((prev) => ({ ...prev, file }));
      } else {
        toast({
          title: "Error",
          description: "Hanya file PDF yang dapat diupload",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === "application/pdf" && file.size <= 10 * 1024 * 1024) {
        setFormData((prev) => ({ ...prev, file }));
      } else if (file.type !== "application/pdf") {
        toast({
          title: "Error",
          description: "Hanya file PDF yang dapat diupload",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Ukuran file maksimal 10MB",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Unggah Dokumen</h1>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Form Upload Dokumen</CardTitle>
            <CardDescription>
              File akan disimpan otomatis di Google Drive sesuai tahun dan jenis dokumen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Jenis Dokumen */}
            <div className="space-y-2">
              <Label htmlFor="jenis-dokumen">
                Jenis Dokumen <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.jenisDokumen}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, jenisDokumen: value as JenisDokumen }))
                }
              >
                <SelectTrigger id="jenis-dokumen">
                  <SelectValue placeholder="Pilih jenis dokumen" />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_DOKUMEN_OPTIONS.map((jenis) => (
                    <SelectItem key={jenis} value={jenis}>
                      {jenis}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Judul Dokumen */}
            <div className="space-y-2">
              <Label htmlFor="judul">
                Judul Dokumen <span className="text-red-500">*</span>
              </Label>
              <Input
                id="judul"
                placeholder="Contoh: Hasil Survey Kepuasan Pelanggan"
                value={formData.judul}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, judul: e.target.value }))
                }
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                {formData.judul.length}/100 karakter
              </p>
            </div>

            {/* Tahun */}
            <div className="space-y-2">
              <Label htmlFor="tahun">
                Tahun <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.tahun}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, tahun: value }))
                }
              >
                <SelectTrigger id="tahun">
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {TAHUN_OPTIONS.map((tahun) => (
                    <SelectItem key={tahun} value={tahun}>
                      {tahun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nama Organik */}
            <div className="space-y-2">
              <Label htmlFor="nama-organik">
                Nama Organik <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.namaOrganik}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, namaOrganik: value }))
                }
                disabled={loadingOrganik}
              >
                <SelectTrigger id="nama-organik">
                  <SelectValue placeholder={loadingOrganik ? "Memuat data..." : "Pilih Nama Organik"} />
                </SelectTrigger>
                <SelectContent>
                  {organik.map((o) => (
                    <SelectItem key={`${o.nik}-${o.nama}`} value={o.nama}>
                      {o.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {organik.length === 0 && !loadingOrganik && (
                <p className="text-sm text-red-500">Tidak ada data Organik yang tersedia</p>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-input">
                File PDF <span className="text-red-500">*</span>
              </Label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/10"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                } ${formData.file ? "bg-green-50 border-green-300" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  {formData.file ? (
                    <div className="space-y-2">
                      <FileText className="w-12 h-12 mx-auto text-green-600" />
                      <p className="font-semibold text-green-700">{formData.file.name}</p>
                      <p className="text-sm text-green-600">
                        {(formData.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <UploadIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-foreground">
                          Drag file di sini atau klik untuk memilih
                        </p>
                        <p className="text-sm text-muted-foreground">
                          (Max: 10MB, Hanya PDF)
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Keterangan */}
            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan (Opsional)</Label>
              <Textarea
                id="keterangan"
                placeholder="Tambahkan informasi tambahan tentang dokumen..."
                value={formData.keterangan}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, keterangan: e.target.value }))
                }
                maxLength={500}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                {formData.keterangan.length}/500 karakter
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFormData({
                    jenisDokumen: "",
                    judul: "",
                    tahun: new Date().getFullYear().toString(),
                    namaOrganik: "",
                    file: null,
                    keterangan: "",
                  });
                  const fileInput = document.getElementById("file-input") as HTMLInputElement;
                  if (fileInput) fileInput.value = "";
                }}
              >
                Batal
              </Button>
              <Button
                onClick={uploadToGoogleDrive}
                disabled={
                  uploadStatus === "uploading" ||
                  !formData.jenisDokumen ||
                  !formData.judul ||
                  !formData.namaOrganik ||
                  !formData.file
                }
                className="flex-1"
              >
                {uploadStatus === "uploading" && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {uploadStatus === "success" && (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {uploadStatus === "error" && (
                  <AlertCircle className="w-4 h-4 mr-2" />
                )}
                {uploadStatus === "uploading"
                  ? "Mengunggah..."
                  : uploadStatus === "success"
                  ? "Berhasil!"
                  : uploadStatus === "error"
                  ? "Gagal"
                  : "✓ Upload"}
              </Button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-blue-900 mb-2">📋 Informasi Penyimpanan</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ File akan disimpan otomatis di Google Drive</li>
                <li>✓ Struktur folder: {formData.tahun || "TAHUN"} → {formData.namaOrganik || "Nama Organik"} → {formData.jenisDokumen || "Jenis Dokumen"}</li>
                <li>✓ Nama file: {formData.jenisDokumen ? `${formData.jenisDokumen} - ${formData.judul || "Judul"} - ${formData.namaOrganik || "Nama Organik"}` : "Jenis - Judul - Organik"}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
