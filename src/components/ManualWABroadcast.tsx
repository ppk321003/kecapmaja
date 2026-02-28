import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Send, X, Search } from 'lucide-react';
import { broadcastTemplates, renderMessage } from '@/lib/karir/broadcastTemplates';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Karyawan, Mitra } from '@/types';

interface ManualWABroadcastProps {
  userRole: string[];
  ppkName: string;
  allEmployees: Karyawan[];
  allMitra?: Mitra[];
}

type RecipientMode = 'organik' | 'mitra';

interface Recipient {
  id: string;
  nama: string;
  no_hp: string;
  type: 'organik' | 'mitra';
}

export const ManualWABroadcast: React.FC<ManualWABroadcastProps> = ({
  userRole,
  ppkName,
  allEmployees,
  allMitra = [],
}) => {
  const { toast } = useToast();

  // Check if user is PPK
  const isPPK = userRole.includes('Pejabat Pembuat Komitmen');

  if (!isPPK) {
    return (
      <div className="flex items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
        <span className="text-red-700 font-medium">
          ⛔ Hanya Pejabat Pembuat Komitmen yang dapat mengakses fitur ini
        </span>
      </div>
    );
  }

  // State
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('organik');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('');

  // Message state
  const [selectedTemplate, setSelectedTemplate] = useState('informasi-penting');
  const [customDetail, setCustomDetail] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [kegiatan, setKegiatan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [editablePreview, setEditablePreview] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Convert employees to recipients format
  const employeeRecipients: Recipient[] = allEmployees.map((emp) => ({
    id: emp.nip,
    nama: emp.nama,
    no_hp: emp.no_hp || emp.telepon || '',
    type: 'organik',
  }));

  // Convert mitra to recipients format
  const mitraRecipients: Recipient[] = allMitra.map((m, idx) => ({
    id: `mitra-${idx}`,
    nama: m.nama,
    no_hp: m.no_hp,
    type: 'mitra',
  }));

  // Get kecamatan list from mitra
  const kecamatanList = useMemo(() => {
    return [...new Set(allMitra.map((m) => m.kecamatan).filter(Boolean))].sort();
  }, [allMitra]);

  // Filter data based on mode and search
  const filteredRecipients = useMemo(() => {
    let recipients: Recipient[] = recipientMode === 'organik' ? employeeRecipients : mitraRecipients;

    // Filter by kecamatan if in mitra mode
    if (recipientMode === 'mitra' && selectedKecamatan) {
      recipients = recipients.filter((r) => {
        const mitra = allMitra.find((m) => m.nama === r.nama);
        return mitra?.kecamatan === selectedKecamatan;
      });
    }

    // Filter by search query
    if (searchQuery) {
      recipients = recipients.filter((r) => {
        const query = searchQuery.toLowerCase();
        return r.nama.toLowerCase().includes(query) || r.no_hp.includes(query);
      });
    }

    return recipients;
  }, [recipientMode, searchQuery, selectedKecamatan, employeeRecipients, mitraRecipients, allMitra]);

  const recipients = filteredRecipients.filter((r) => selectedIds.has(r.id));

  // Template rendering
  const template = broadcastTemplates[selectedTemplate];
  const basePreviewMessage = template
    ? renderMessage(template, {
        nama: 'Nama Penerima',
        detail: customDetail || '[Ubah detail template]',
        custom: customMessage,
        kegiatan: kegiatan || '[Ubah kegiatan]',
        tanggal: tanggal || '[Ubah tanggal]',
        ppkName: ppkName,
      })
    : '';

  const previewMessage = editablePreview || basePreviewMessage;

  // Handle send
  const handleSend = async () => {
    if (recipients.length === 0) {
      toast({
        title: 'Peringatan',
        description: `Pilih minimal 1 ${recipientMode === 'organik' ? 'karyawan' : 'mitra'}`,
        variant: 'destructive',
      });
      return;
    }

    setShowConfirm(true);
  };

  // Handle confirmed send
  const handleConfirmSend = async () => {
    setShowConfirm(false);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-manual-wa-notifications', {
        body: {
          nips: recipients.map((r) => r.id),
          recipients: recipients.map((r) => ({
            id: r.id,
            nama: r.nama,
            no_hp: r.no_hp,
            type: r.type,
          })),
          templateId: selectedTemplate,
          customDetail,
          customMessage,
          kegiatan,
          tanggal,
          previewMessage: editablePreview || basePreviewMessage,
          ppkName,
          recipientMode,
        },
      });

      if (error) {
        toast({
          title: 'Error',
          description: `Gagal mengirim: ${error.message}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sukses',
          description: `✅ Notifikasi berhasil dikirim ke ${data.sent} orang`,
        });

        // Reset form
        setSelectedIds(new Set());
        setCustomDetail('');
        setCustomMessage('');
        setKegiatan('');
        setTanggal('');
        setEditablePreview('');
        setSearchQuery('');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {allEmployees.length === 0 && allMitra.length === 0 && (
        <div className="flex items-center justify-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
          <span className="text-yellow-700 text-sm">
            ⏳ Memuat daftar penerima... Jika tetap kosong, silakan refresh halaman
          </span>
        </div>
      )}

      {/* Section 1: Recipient Mode & Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👥 Pilih Penerima
          </CardTitle>
          <CardDescription>
            {recipientMode === 'organik' ? 'Kirim ke Karyawan' : 'Kirim ke Mitra'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={recipientMode === 'organik' ? 'default' : 'outline'}
              onClick={() => {
                setRecipientMode('organik');
                setSelectedIds(new Set());
                setSelectedKecamatan('');
                setSearchQuery('');
              }}
              className="flex-1"
            >
              👔 Karyawan
            </Button>
            {allMitra.length > 0 && (
              <Button
                variant={recipientMode === 'mitra' ? 'default' : 'outline'}
                onClick={() => {
                  setRecipientMode('mitra');
                  setSelectedIds(new Set());
                  setSearchQuery('');
                }}
                className="flex-1"
              >
                🤝 Mitra
              </Button>
            )}
          </div>

          {/* Kecamatan Filter (only for mitra) */}
          {recipientMode === 'mitra' && kecamatanList.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Filter Kecamatan (opsional):</label>
              <Select value={selectedKecamatan} onValueChange={setSelectedKecamatan}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Kecamatan" />
                </SelectTrigger>
                <SelectContent>
                  {kecamatanList.map((kecamatan) => (
                    <SelectItem key={kecamatan} value={kecamatan}>
                      {kecamatan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search */}
          <div>
            <Input
              placeholder={`Cari nama atau nomor HP...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Recipient List */}
          <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
            {filteredRecipients.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {recipientMode === 'organik'
                  ? 'Tidak ada karyawan ditemukan'
                  : 'Tidak ada mitra ditemukan'}
              </p>
            ) : (
              filteredRecipients.map((recipient) => (
                <label
                  key={recipient.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(recipient.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedIds);
                      if (e.target.checked) {
                        newSet.add(recipient.id);
                      } else {
                        newSet.delete(recipient.id);
                      }
                      setSelectedIds(newSet);
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{recipient.nama}</div>
                    <div className="text-xs text-gray-500">{recipient.no_hp}</div>
                  </div>
                  {recipientMode === 'mitra' && (
                    <div className="text-xs text-gray-600">
                      {allMitra.find((m) => m.nama === recipient.nama)?.kecamatan}
                    </div>
                  )}
                </label>
              ))
            )}
          </div>

          <div className="text-sm text-blue-600 font-medium">
            ✓ {selectedIds.size} {recipientMode === 'organik' ? 'karyawan' : 'mitra'} dipilih
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Template + Custom Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📝 Pesan Notifikasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Pilih Template:</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.values(broadcastTemplates).map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplate(tmpl.id);
                    setCustomDetail('');
                    setCustomMessage('');
                    setKegiatan('');
                    setTanggal('');
                    setEditablePreview('');
                  }}
                  className={`p-3 rounded border-2 text-center text-sm font-medium transition ${
                    selectedTemplate === tmpl.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {tmpl.icon} {tmpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Kegiatan + Tanggal Input (for Informasi Presensi template) */}
          {selectedTemplate === 'informasi-presensi' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Kegiatan:</label>
                <Input
                  placeholder="Nama kegiatan (misal: Pelatihan Excel)"
                  value={kegiatan}
                  onChange={(e) => setKegiatan(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tanggal:</label>
                <Input
                  placeholder="Tanggal kegiatan (misal: 28 Februari 2026)"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Custom Detail Input (for all templates except custom) */}
          {selectedTemplate !== 'custom' && template?.placeholders.includes('detail') && (
            <div>
              <label className="block text-sm font-medium mb-2">Detail Notifikasi:</label>
              <Textarea
                placeholder="Masukkan detail/informasi yang akan ditampilkan dalam notifikasi..."
                value={customDetail}
                onChange={(e) => setCustomDetail(e.target.value)}
                className="min-h-24"
              />
              <p className="text-xs text-gray-500 mt-1">Field ini akan menggantikan {'{detail}'} dalam template</p>
            </div>
          )}

          {/* Custom Message Input (for custom template) */}
          {selectedTemplate === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-2">Tulis Pesan Anda:</label>
              <Textarea
                placeholder="Tulis pesan custom yang akan dikirim ke semua penerima. Gunakan {nama} untuk personalisasi dan {ppkName} untuk nama Anda."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="min-h-32"
              />
              <p className="text-xs text-gray-500 mt-1">Tersedia variabel: {'{nama}'}, {'{ppkName}'}</p>
            </div>
          )}

          {/* Preview Toggle */}
          <div className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPreview(!showPreview);
                if (!showPreview && !editablePreview) {
                  setEditablePreview(basePreviewMessage);
                }
              }}
              className="w-full"
            >
              {showPreview ? '✓ Tutup Preview' : '👁️ Lihat & Edit Preview'}
            </Button>

            {showPreview && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-600 font-medium">Preview Pesan (Bisa diedit langsung):</p>
                <Textarea
                  value={editablePreview || basePreviewMessage}
                  onChange={(e) => setEditablePreview(e.target.value)}
                  className="min-h-64 font-mono text-sm"
                  placeholder="Preview akan ditampilkan di sini..."
                />
                <p className="text-xs text-blue-600">
                  ℹ️ Anda dapat mengedit pesan di atas. Nama akan tetap &quot;Nama Penerima&quot; di preview, tapi akan diganti dengan nama individual untuk setiap penerima saat dikirim.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Confirmation & Send */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            ⚠️ Konfirmasi Pengiriman
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white p-3 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Penerima:</span>
              <span className="font-medium text-blue-600">
                {recipients.length}{' '}
                {recipientMode === 'organik' ? 'karyawan' : 'mitra'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Template:</span>
              <span className="font-medium">{template?.title || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Pengirim:</span>
              <span className="font-medium">{ppkName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Estimasi waktu:</span>
              <span className="font-medium text-green-600">~2-5 detik</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedIds(new Set());
                setCustomDetail('');
                setCustomMessage('');
                setKegiatan('');
                setTanggal('');
                setEditablePreview('');
              }}
              className="flex-1"
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button
              onClick={handleSend}
              disabled={isLoading || recipients.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sedang mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Kirim ke {recipients.length}{' '}
                  {recipientMode === 'organik' ? 'karyawan' : 'mitra'}
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-600 text-center">
            💾 Semua pengiriman akan dicatat dalam NOTIF_LOG untuk audit trail
          </p>
        </CardContent>
      </Card>

      {/* Custom Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Konfirmasi Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium">
                  Anda akan mengirim notifikasi WA ke:
                </p>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900">
                    {recipients.length}{' '}
                    {recipientMode === 'organik' ? 'karyawan' : 'mitra'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm">Template & Pesan:</p>
                <div className="bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto text-xs whitespace-pre-wrap">
                  {previewMessage}
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm">PPK Pengirim:</p>
                <p className="text-sm text-gray-600">{ppkName}</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>Perhatian:</strong> Aksi ini tidak dapat dibatalkan. Notifikasi akan
                  segera dikirim.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleConfirmSend}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Lanjutkan Kirim
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};


