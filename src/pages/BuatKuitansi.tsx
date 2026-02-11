import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { useKuitansiSubmit } from "@/hooks/use-kuitansi-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

interface FormField {
  id: string;
  name: string;
  value: string;
  type: "text" | "number" | "textarea";
}

const BuatKuitansi: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const [fields, setFields] = useState<FormField[]>([
    { id: "1", name: "no_kuitansi", value: "", type: "text" },
    { id: "2", name: "penerima", value: "", type: "text" },
    { id: "3", name: "jumlah", value: "", type: "number" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check authorization
  const isAuthorized = useMemo(() => {
    if (!user) return false;
    const ppkRoles = ["Pejabat Pembuat Komitmen", "PPK", "ppk"];
    const targetSatker = "3210";
    return ppkRoles.includes(user.role) && user.satker === targetSatker;
  }, [user]);

  // Get sheet ID
  const sheetId = useMemo(() => {
    if (!satkerContext?.configs) return null;
    const config = satkerContext.configs.find(c => c.satker_id === "3210");
    return config?.kuitansi_sheet_id || null;
  }, [satkerContext?.configs]);

  const { submitKuitansi, loading: submitLoading, error: submitError } = useKuitansiSubmit(sheetId);

  // Not authorized
  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  // No sheet ID configured
  if (!sheetId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-yellow-200 p-8 max-w-md w-full shadow-sm">
          <h1 className="text-2xl font-bold text-yellow-600 mb-4">Konfigurasi Diperlukan</h1>
          <p className="text-gray-600">
            Sheet ID kuitansi belum dikonfigurasi. Hubungi administrator.
          </p>
        </div>
      </div>
    );
  }

  const handleAddField = () => {
    const newId = (parseInt(fields[fields.length - 1]?.id) + 1).toString();
    setFields([
      ...fields,
      { id: newId, name: "", value: "", type: "text" }
    ]);
  };

  const handleRemoveField = (id: string) => {
    if (fields.length === 1) {
      toast.error("Minimal harus ada 1 field");
      return;
    }
    setFields(fields.filter(f => f.id !== id));
  };

  const handleFieldChange = (id: string, key: keyof FormField, value: any) => {
    setFields(fields.map(f => 
      f.id === id ? { ...f, [key]: value } : f
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields have names
    const allFieldsValid = fields.every(f => f.name.trim() && f.value.toString().trim());
    if (!allFieldsValid) {
      toast.error("Semua field harus diisi dengan nama dan value");
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert fields to object
      const data: any = {};
      fields.forEach(f => {
        if (f.type === "number") {
          data[f.name] = f.value ? parseFloat(f.value) : "";
        } else {
          data[f.name] = f.value;
        }
      });

      // Submit to Google Sheets
      const success = await submitKuitansi(data);
      
      if (success) {
        toast.success("Kuitansi berhasil dibuat dan disimpan");
        setTimeout(() => {
          navigate("/cetak-kuitansi");
        }, 1000);
      } else {
        toast.error(submitError || "Gagal menyimpan kuitansi");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/cetak-kuitansi")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Buat Kuitansi Baru</h1>
            <p className="text-gray-600">Form input kuitansi/nota baru (PPK Satker 3210)</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border shadow-sm p-6">
          <div className="space-y-4">
            {fields.map((field, idx) => (
              <div key={field.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Field Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Kolom
                    </label>
                    <Input
                      type="text"
                      placeholder="Misal: nomor, penerima, jumlah"
                      value={field.name}
                      onChange={(e) => handleFieldChange(field.id, "name", e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Field Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipe Data
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) => handleFieldChange(field.id, "type", e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="number">Angka</option>
                      <option value="textarea">Panjang</option>
                    </select>
                  </div>

                  {/* Field Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nilai
                    </label>
                    {field.type === "textarea" ? (
                      <Textarea
                        placeholder="Masukkan nilai..."
                        value={field.value}
                        onChange={(e) => handleFieldChange(field.id, "value", e.target.value)}
                        className="w-full min-h-12"
                      />
                    ) : (
                      <Input
                        type={field.type}
                        placeholder="Masukkan nilai..."
                        value={field.value}
                        onChange={(e) => handleFieldChange(field.id, "value", e.target.value)}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>

                {/* Remove Button */}
                {fields.length > 1 && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(field.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Field Button */}
          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddField}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Field
            </Button>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{submitError}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="mt-6 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/cetak-kuitansi")}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || submitLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting || submitLoading ? "Menyimpan..." : "Simpan Kuitansi"}
            </Button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Catatan:</strong> Data kuitansi akan disimpan ke Sheet1 dengan kolom sesuai nama yang Anda masukkan. Pastikan nama kolom sudah sesuai dengan kebutuhan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuatKuitansi;
