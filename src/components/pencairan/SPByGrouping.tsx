import { useState } from 'react';
import { Submission } from '@/types/pencairan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface SPByGroupingProps {
  upSubmissions: Submission[];
  onUpdateSubmissions: (ids: string[], updates: Partial<Submission>) => void;
  onRefresh: () => void;
}

export function SPByGrouping({
  upSubmissions,
  onUpdateSubmissions,
  onRefresh,
}: SPByGroupingProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [nomorSPM, setNomorSPM] = useState('');
  const [isGrouping, setIsGrouping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(upSubmissions.map(sub => sub.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const handleGroupSubmissions = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: 'Validasi gagal',
        description: 'Pilih minimal 1 pengajuan untuk dikelompokkan',
        variant: 'destructive',
      });
      return;
    }

    if (!nomorSPM.trim()) {
      toast({
        title: 'Validasi gagal',
        description: 'Nomor SPM wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setIsGrouping(true);
    try {
      // Update all selected submissions with the SPM number
      // Must call pencairan-update for each ID separately since backend expects single 'id'
      const results = await Promise.all(
        selectedIds.map(submissionId =>
          supabase.functions.invoke('pencairan-update', {
            body: {
              id: submissionId,
              nomorSPM: nomorSPM.trim(),
              actor: 'bendahara',
              action: 'save_spby',
            },
          })
        )
      );

      console.log('[SPByGrouping] Group SPM results:', results);

      // Check if any updates failed
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('[SPByGrouping] Errors from backend:', errors);
        throw new Error(`${errors.length} pengajuan gagal diperbarui`);
      }

      toast({
        title: 'Berhasil',
        description: `${selectedIds.length} pengajuan berhasil dikelompokkan dengan SPM ${nomorSPM}`,
      });
      
      onUpdateSubmissions(selectedIds, {
        nomorSPM: nomorSPM.trim(),
      });
      
      setSelectedIds([]);
      setNomorSPM('');
      onRefresh();
    } catch (err) {
      console.error('Error grouping submissions:', err);
      toast({
        title: 'Gagal mengelompokkan',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsGrouping(false);
    }
  };

  const handleSendToPPK = async () => {
    if (!nomorSPM.trim()) {
      toast({
        title: 'Validasi gagal',
        description: 'Kelompokkan pengajuan dengan SPM terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get all submissions with the same SPM
      const submissionsWithSPM = upSubmissions.filter(sub => sub.nomorSPM === nomorSPM);
      const submissionIds = submissionsWithSPM.map(sub => sub.id);

      // Send all to PPK - must call for each ID separately
      const results = await Promise.all(
        submissionIds.map(submissionId =>
          supabase.functions.invoke('pencairan-update', {
            body: {
              id: submissionId,
              status: 'pending_ppk',
              actor: 'bendahara',
              action: 'approve',
              nomorSPM: nomorSPM,
            },
          })
        )
      );

      console.log('[SPByGrouping] Send to PPK results:', results);

      // Check if any updates failed
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('[SPByGrouping] Errors from backend:', errors);
        throw new Error(`${errors.length} pengajuan gagal dikirim ke PPK`);
      }

      toast({
        title: 'Berhasil',
        description: `${submissionIds.length} pengajuan SPM ${nomorSPM} berhasil dikirim ke PPK`,
      });
      
      onUpdateSubmissions(submissionIds, {
        status: 'pending_ppk',
        pembayaran: 'UP',
        nomorSPM: nomorSPM,
      });
      
      setNomorSPM('');
      onRefresh();
    } catch (err) {
      console.error('Error sending to PPK:', err);
      toast({
        title: 'Gagal mengirim ke PPK',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group submissions by SPM
  const groupedBySpM = upSubmissions.reduce((acc, sub) => {
    const key = sub.nomorSPM || 'Belum dikelompokkan';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(sub);
    return acc;
  }, {} as Record<string, Submission[]>);

  return (
    <div className="space-y-6">
      {/* Grouping Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Kelompokkan Pengajuan UP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Pilih pengajuan UP yang akan dikelompokkan dalam satu SPM, kemudian input nomor SPM untuk mengelompokkannya.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Pilih Pengajuan</label>
            <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
              {upSubmissions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada pengajuan UP</p>
              ) : (
                <>
                  <label className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedIds.length === upSubmissions.length && upSubmissions.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                    <span className="text-sm font-semibold">Pilih Semua ({upSubmissions.length})</span>
                  </label>
                  <div className="border-t pt-2"></div>
                  {upSubmissions.map((sub) => (
                    <label key={sub.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={selectedIds.includes(sub.id)}
                        onCheckedChange={(checked) => handleSelectOne(sub.id, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sub.title}</p>
                        <p className="text-xs text-muted-foreground">{sub.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.submitterName} • {format(sub.submittedAt, 'd MMMM yyyy', { locale: idLocale })}
                        </p>
                      </div>
                      {sub.nomorSPM && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          SPM: {sub.nomorSPM}
                        </span>
                      )}
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <label className="text-sm font-medium">Nomor SPM</label>
              <input
                type="text"
                placeholder="Input nomor SPM (misal: SPM-001/2025)"
                value={nomorSPM}
                onChange={(e) => setNomorSPM(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Nomor ini akan disimpan untuk {selectedIds.length} pengajuan yang dipilih
              </p>
              <Button
                onClick={handleGroupSubmissions}
                disabled={isGrouping || selectedIds.length === 0 || !nomorSPM.trim()}
                className="w-full"
              >
                {isGrouping ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Kelompokkan {selectedIds.length} Pengajuan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grouped Submissions */}
      {Object.keys(groupedBySpM).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Kelompok SPM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(groupedBySpM).map(([spMNum, submissions]) => (
              <div key={spMNum} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{spMNum}</h3>
                    <p className="text-xs text-muted-foreground">{submissions.length} pengajuan</p>
                  </div>
                  {spMNum !== 'Belum dikelompokkan' && (
                    <Button
                      onClick={() => {
                        setNomorSPM(spMNum);
                        handleSendToPPK();
                      }}
                      disabled={isSubmitting}
                      size="sm"
                      className="ml-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3 mr-2" />
                      )}
                      Kirim ke PPK
                    </Button>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {submissions.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{sub.title}</p>
                        <p className="text-xs text-muted-foreground">{sub.id}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {spMNum === 'Belum dikelompokkan' && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900">
                      Pengajuan ini belum dikelompokkan. Pilih dari daftar di atas untuk mengelompokkannya.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {upSubmissions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Tidak ada pengajuan dengan tipe pembayaran Uang Persediaan (UP)</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
