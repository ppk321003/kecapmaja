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
import type { Karyawan } from '@/types';

interface ManualWABroadcastProps {
  userRole: string[];
  ppkName: string;
  allEmployees: Karyawan[];
}

type RecipientMode = 'manual' | 'filter';

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

  // Filter state
  const [filterGolongan, setFilterGolongan] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');
  const [filterSatker, setFilterSatker] = useState('all');

  // Message state
  const [selectedTemplate, setSelectedTemplate] = useState('informasi-penting');
  const [customDetail, setCustomDetail] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

      // Filter by criteria
      if (filterGolongan !== 'all' && emp.golongan !== filterGolongan) return false;
      if (filterKategori !== 'all' && emp.kategori !== filterKategori) return false;
      if (filterSatker !== 'all' && emp.unitKerja !== filterSatker) return false;

      return true;
    });
  }, [searchQuery, filterGolongan, filterKategori, filterSatker, allEmployees]);

  const recipients =
    recipientMode === 'manual'
      ? Array.from(selectedNips).map((nip) => allEmployees.find((e) => e.nip === nip)).filter(Boolean) as Karyawan[]
      : filteredEmployees;

  // Get unique values for filters
  const uniqueGolongans = [...new Set(allEmployees.map((e) => e.golongan))].sort();
  const uniqueKategoris = [...new Set(allEmployees.map((e) => e.kategori))];
  const uniqueSatkers = [...new Set(allEmployees.map((e) => e.unitKerja))].sort();

  // Template rendering
  const template = broadcastTemplates[selectedTemplate];
  const previewMessage = template
    ? renderMessage(template, {
        nama: 'Nama Karyawan',
        detail: customDetail || '[Ubah detail template]',
        custom: customMessage,
        ppkName: ppkName,
      })
    : '';

  // Handle send
  const handleSend = async () => {
    if (recipients.length === 0) {
      toast({
        title: 'Peringatan',
        description: 'Pilih minimal 1 karyawan',
        variant: 'destructive'
      });
      return;
    }

    if (!window.confirm(`Kirim notifikasi WA ke ${recipients.length} orang?\n\nAksi ini tidak dapat dibatalkan.`)) {
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-manual-wa-notifications', {
        body: {
          nips: recipients.map((r) => r.nip),
          templateId: selectedTemplate,
          customDetail,
          customMessage,
          ppkName,
        },
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
          {/* Mode Toggle */}
          <div className="flex gap-2 border-b pb-4">
            <button
              onClick={() => {
                setRecipientMode('manual');
                setSelectedNips(new Set());
              }}
              className={`px-4 py-2 rounded ${
                recipientMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ☐ Manual Selection
            </button>
            <button
              onClick={() => setRecipientMode('filter')}
              className={`px-4 py-2 rounded ${
                recipientMode === 'filter'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔍 Filter Group
            </button>
          </div>

          {/* Manual Selection */}
          {recipientMode === 'manual' && (
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
          )}

          {/* Filter Selection */}
          {recipientMode === 'filter' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Select value={filterGolongan} onValueChange={setFilterGolongan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Golongan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Golongan</SelectItem>
                    {uniqueGolongans.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterKategori} onValueChange={setFilterKategori}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {uniqueKategoris.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterSatker} onValueChange={setFilterSatker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Satker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Satker</SelectItem>
                    {uniqueSatkers.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-blue-600 font-medium">
                📊 {filteredEmployees.length} orang sesuai filter
              </div>
            </div>
          )}
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
              onClick={() => setShowPreview(!showPreview)}
              className="w-full"
            >
              {showPreview ? '✓ Hide Preview' : '👁️ Show Preview'}
            </Button>

            {showPreview && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                <p className="text-xs text-gray-600 mb-2 font-medium">Preview Pesan:</p>
                <div className="bg-white p-3 rounded text-sm whitespace-pre-wrap font-mono text-gray-700">
                  {previewMessage || '[Preview akan ditampilkan di sini]'}
                </div>
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
    </div>
  );
};

export default ManualWABroadcast;
