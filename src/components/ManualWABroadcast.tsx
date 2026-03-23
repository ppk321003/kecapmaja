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
import { AlertCircle, CheckCircle2, Send, X, Search, Beaker } from 'lucide-react';
import { broadcastTemplates, renderMessage } from '@/lib/karir/broadcastTemplates';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Karyawan } from '@/types';

interface ManualWABroadcastProps {
  userRole: string[];
  ppkName: string;
  allEmployees: Karyawan[];
}

type RecipientMode = 'manual';

export const ManualWABroadcast: React.FC<ManualWABroadcastProps> = ({
  userRole,
  ppkName,
  allEmployees,
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
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('manual');
  const [selectedNips, setSelectedNips] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Test state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testType, setTestType] = useState<'kebijakan' | 'karir' | null>(null);
  const [testRecipientNip, setTestRecipientNip] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testSearchQuery, setTestSearchQuery] = useState('');

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

  // Computed
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      // Search
      if (
        searchQuery &&
        !emp.nama.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !emp.nip.includes(searchQuery)
      ) {
        return false;
      }
      return true;
    });
  }, [searchQuery, allEmployees]);

  const recipients = Array.from(selectedNips).map((nip) => allEmployees.find((e) => e.nip === nip)).filter(Boolean) as Karyawan[];

  // Test modal filtered employees
  const testFilteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      if (
        testSearchQuery &&
        !emp.nama.toLowerCase().includes(testSearchQuery.toLowerCase()) &&
        !emp.nip.includes(testSearchQuery)
      ) {
        return false;
      }
      return true;
    });
  }, [testSearchQuery, allEmployees]);

  // Template rendering
  const template = broadcastTemplates[selectedTemplate];
  const basePreviewMessage = template
    ? renderMessage(template, {
        nama: 'Nama Karyawan',
        detail: customDetail || '[Ubah detail template]',
        custom: customMessage,
        kegiatan: kegiatan || '[Ubah kegiatan]',
        tanggal: tanggal || '[Ubah tanggal]',
        ppkName: ppkName,
      })
    : '';
  
  // Use editable preview if user is editing, otherwise use base message
  const previewMessage = editablePreview || basePreviewMessage;

  // Handle send
  const handleTestSend = async () => {
    if (!testRecipientNip) {
      toast({
        title: 'Peringatan',
        description: 'Pilih 1 karyawan untuk test',
        variant: 'destructive'
      });
      return;
    }

    setIsTestLoading(true);
    try {
      const testEmployee = allEmployees.find(e => e.nip === testRecipientNip);
      if (!testEmployee) {
        throw new Error('Karyawan tidak ditemukan');
      }

      // Call appropriate function based on testType
      const functionName = testType === 'karir' ? 'send-karir-notifications' : 'send-kebijakan-notifications';
      
      // Invoke function (JWT verification is disabled for this function)
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          testMode: true,
          testPhase: testType,
          testRecipient: {
            nip: testEmployee.nip,
            nama: testEmployee.nama,
            no_hp: testEmployee.no_hp || '',
            jabatan: testEmployee.jabatan,
            satker: testEmployee.satker || testEmployee.unitKerja || '',
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: '✅ Test Berhasil',
        description: `Pesan test ${testType === 'karir' ? 'Kenaikan Karier' : 'Kebijakan'} dikirim ke ${testEmployee.nama}. Cek WhatsApp dalam 10 detik.`,
      });

      // Reset modal
      setShowTestModal(false);
      setTestType(null);
      setTestRecipientNip('');
      setTestSearchQuery('');
    } catch (err) {
      toast({
        title: 'Error',
        description: `Gagal mengirim test: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast({
        title: 'Peringatan',
        description: 'Pilih minimal 1 karyawan',
        variant: 'destructive'
      });
      return;
    }

    // Show confirmation modal instead of window.confirm
    setShowConfirm(true);
  };

  // Handle confirmed send
  const handleConfirmSend = async () => {
    setShowConfirm(false);
    setIsLoading(true);

    try {
      // Invoke function (JWT verification is disabled for this function)
      const { data, error } = await supabase.functions.invoke('send-manual-wa-notifications', {
        body: {
          nips: recipients.map((r) => r.nip),
          employees: recipients, // Pass employee data so function doesn't need to fetch
          templateId: selectedTemplate,
          customDetail,
          customMessage,
          kegiatan,
          tanggal,
          previewMessage: editablePreview || basePreviewMessage,
          ppkName,
        }
      });

      if (error) {
        toast({
          title: 'Error',
          description: `Gagal mengirim: ${error.message}`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Sukses',
          description: `✅ Notifikasi berhasil dikirim ke ${data.sent} orang`,
        });

        // Reset form
        setSelectedNips(new Set());
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
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 0: Testing Buttons */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Beaker className="w-5 h-5" />
            🧪 Test Notifikasi
          </CardTitle>
          <CardDescription>Test fitur broadcast dengan mengirim ke 1 orang terlebih dahulu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={() => {
                setTestType('kebijakan');
                setShowTestModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Beaker className="w-4 h-4 mr-2" />
              Test Kebijakan
            </Button>
            <Button
              onClick={() => {
                setTestType('karir');
                setShowTestModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Beaker className="w-4 h-4 mr-2" />
              Test Kenaikan Karier
            </Button>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            💡 Gunakan test untuk verifikasi sebelum broadcast ke banyak orang
          </p>
        </CardContent>
      </Card>

      {allEmployees.length === 0 && (
        <div className="flex items-center justify-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
          <span className="text-yellow-700 text-sm">
            ⏳ Memuat daftar karyawan... Jika tetap kosong, silakan refresh halaman
          </span>
        </div>
      )}
      
      {/* Section 1: Recipient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👥 Pilih Penerima
          </CardTitle>
          <CardDescription>Pilih manual atau gunakan filter untuk bulk selection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual Selection */}
          <div className="space-y-3">
            <Input
              placeholder="Cari nama atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />

            <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
              {filteredEmployees.length === 0 ? (
                <p className="text-gray-500 text-sm">Tidak ada karyawan ditemukan</p>
              ) : (
                filteredEmployees.map((emp) => (
                  <label key={emp.nip} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNips.has(emp.nip)}
                      onChange={(e) => {
                        const newSet = new Set(selectedNips);
                        if (e.target.checked) {
                          newSet.add(emp.nip);
                        } else {
                          newSet.delete(emp.nip);
                        }
                        setSelectedNips(newSet);
                      }}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{emp.nama}</div>
                      <div className="text-xs text-gray-500">{emp.nip}</div>
                    </div>
                    <div className="text-xs text-gray-600">{emp.golongan}</div>
                  </label>
                ))
              )}
            </div>

            <div className="text-sm text-blue-600 font-medium">
              ✓ {selectedNips.size} orang dipilih
            </div>
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
                  ℹ️ Anda dapat mengedit pesan di atas. Nama karyawan akan tetap &quot;Nama Karyawan&quot; di preview, tapi akan diganti dengan nama individual untuk setiap penerima saat dikirim.
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
              <span className="font-medium text-blue-600">{recipients.length} karyawan</span>
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
                setSelectedNips(new Set());
                setCustomDetail('');
                setCustomMessage('');
                setKegiatan('');
                setTanggal('');
                setEditablePreview('');
                setRecipientMode('manual');
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
                  Kirim ke {recipients.length} orang
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-600 text-center">
            💾 Semua pengiriman akan dicatat dalam NOTIF_LOG untuk audit trail
          </p>
        </CardContent>
      </Card>

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Beaker className="w-5 h-5 text-purple-600" />
                {testType === 'karir' ? 'Test Kenaikan Karier' : 'Test Kebijakan'}
              </CardTitle>
              <p className="text-sm text-gray-600 font-normal">Pilih 1 karyawan untuk menerima test notifikasi</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <Input
                placeholder="Cari nama atau NIP..."
                value={testSearchQuery}
                onChange={(e) => setTestSearchQuery(e.target.value)}
                className="w-full"
              />

              {/* Employee List */}
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
                {testFilteredEmployees.length === 0 ? (
                  <p className="text-gray-500 text-sm">Tidak ada karyawan ditemukan</p>
                ) : (
                  testFilteredEmployees.map((emp) => (
                    <label
                      key={emp.nip}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition ${
                        testRecipientNip === emp.nip
                          ? 'bg-purple-100 border border-purple-300'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="test-recipient"
                        value={emp.nip}
                        checked={testRecipientNip === emp.nip}
                        onChange={(e) => setTestRecipientNip(e.target.value)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{emp.nama}</div>
                        <div className="text-xs text-gray-500">{emp.nip} • {emp.jabatan}</div>
                      </div>
                      <div className="text-xs text-gray-600">{emp.golongan}</div>
                    </label>
                  ))
                )}
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <p className="text-xs text-blue-800">
                  ℹ️ Pesan test akan dikirim ke WhatsApp 1 orang. Gunakan ini untuk verifikasi sebelum broadcast massal.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTestModal(false);
                    setTestType(null);
                    setTestRecipientNip('');
                    setTestSearchQuery('');
                  }}
                  disabled={isTestLoading}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleTestSend}
                  disabled={isTestLoading || !testRecipientNip}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {isTestLoading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Kirim Test
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                <p className="font-medium">Anda akan mengirim notifikasi WA ke:</p>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900">{recipients.length} orang</p>
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
                  ⚠️ <strong>Perhatian:</strong> Aksi ini tidak dapat dibatalkan. Notifikasi akan segera dikirim.
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


