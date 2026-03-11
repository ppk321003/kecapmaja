import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Submission,
  Document,
  generateSubmissionId,
  getDocumentsByJenisBelanja,
  JENIS_BELANJA_OPTIONS,
  SUB_JENIS_BELANJA,
} from '@/types/pencairan';
import { Send, X, FileText, Loader2, AlertCircle, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganikPencairan, usePencairanData } from '@/hooks/use-pencairan-data';
import { useAuth } from '@/contexts/AuthContext';
import { formatNumberWithSeparator, parseFormattedNumber } from '@/lib/formatNumber';

interface SubmissionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (submission: Omit<Submission, 'id' | 'status'>) => void;
  editData?: Submission | null;
}

// Fungsi untuk mendapatkan waktu Jakarta (WIB) dengan format Indonesia
function getJakartaTimeString(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  };
  
  const formatter = new Intl.DateTimeFormat('id-ID', options);
  const parts = formatter.formatToParts(now);
  
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  const hours = getPart('hour').padStart(2, '0');
  const minutes = getPart('minute').padStart(2, '0');
  const day = getPart('day').padStart(2, '0');
  const month = getPart('month').padStart(2, '0');
  const year = getPart('year');
  
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

export function SubmissionForm({ open, onClose, onSubmit, editData }: SubmissionFormProps) {
  const { user } = useAuth();
  const { data: organikList = [], isLoading: isLoadingOrganik } = useOrganikPencairan();
  const { data: existingSubmissions = [] } = usePencairanData();

  const [title, setTitle] = useState(editData?.title || '');
  const [submitterName, setSubmitterName] = useState(editData?.submitterName || '');
  const [jenisBelanja, setJenisBelanja] = useState(editData?.jenisBelanja || '');
  const [subJenisBelanja, setSubJenisBelanja] = useState(editData?.subJenisBelanja || '');
  const [notes, setNotes] = useState(editData?.notes || '');
  const [nominal, setNominal] = useState(editData?.nominal ? formatNumberWithSeparator(editData.nominal) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<Document[]>(editData?.documents || []);
  const [showDraftConfirmation, setShowDraftConfirmation] = useState(false);

  const availableSubTypes = jenisBelanja ? SUB_JENIS_BELANJA[jenisBelanja] || [] : [];

  const updateDocuments = (jenis: string, subJenis: string) => {
    if (!jenis || !subJenis) {
      setDocuments([]);
      return;
    }
    const newDocs = getDocumentsByJenisBelanja(jenis, subJenis);
    setDocuments(newDocs);
  };

  const handleJenisBelanjaChange = (value: string) => {
    setJenisBelanja(value);
    const newSubTypes = SUB_JENIS_BELANJA[value] || [];
    const firstSubType = newSubTypes[0] || '';
    setSubJenisBelanja(firstSubType);
    updateDocuments(value, firstSubType);
  };

  const handleSubJenisChange = (value: string) => {
    setSubJenisBelanja(value);
    updateDocuments(jenisBelanja, value);
  };

  useEffect(() => {
    if (open) {
      if (editData) {
        setTitle(editData.title);
        setSubmitterName(editData.submitterName);
        setJenisBelanja(editData.jenisBelanja);
        setSubJenisBelanja(editData.subJenisBelanja || '');
        setNotes(editData.notes || '');
        setNominal(editData.nominal ? formatNumberWithSeparator(editData.nominal) : '');
        const defaultDocs = getDocumentsByJenisBelanja(editData.jenisBelanja, editData.subJenisBelanja || '');
        if (editData.documents && editData.documents.length > 0) {
          const checkedTypes = editData.documents.filter(d => d.isChecked).map(d => d.type);
          const mergedDocs = defaultDocs.map(doc => ({
            ...doc,
            isChecked: checkedTypes.includes(doc.type) || editData.documents.some(ed => ed.name === doc.name && ed.isChecked)
          }));
          setDocuments(mergedDocs);
        } else {
          setDocuments(defaultDocs);
        }
      } else {
        setTitle('');
        setSubmitterName('');
        setJenisBelanja('');
        setSubJenisBelanja('');
        setNotes('');
        setNominal('');
        setDocuments([]);
      }
    }
  }, [editData, open]);

  const handleDocumentToggle = (docType: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.type === docType ? { ...doc, isChecked: !doc.isChecked } : doc
      )
    );
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Uraian pengajuan harus diisi', variant: 'destructive' });
      return false;
    }
    if (!submitterName.trim()) {
      toast({ title: 'Error', description: 'Nama pengaju harus dipilih', variant: 'destructive' });
      return false;
    }
    if (!jenisBelanja) {
      toast({ title: 'Error', description: 'Jenis belanja harus dipilih', variant: 'destructive' });
      return false;
    }
    if (!subJenisBelanja) {
      toast({ title: 'Error', description: 'Sub-jenis belanja harus dipilih', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSaveAsDraft = () => {
    // Show confirmation dialog before saving draft
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Uraian pengajuan harus diisi minimal', variant: 'destructive' });
      return;
    }
    setShowDraftConfirmation(true);
  };

  const confirmSaveAsDraft = async () => {
    setShowDraftConfirmation(false);
    setIsSubmitting(true);
    try {
      const checkedDocs = documents.filter(d => d.isChecked).map(d => d.name);
      const kelengkapan = checkedDocs.join('|');
      const jenisPengajuan = `${jenisBelanja} - ${subJenisBelanja}`;
      const waktuPengajuan = getJakartaTimeString();

      if (editData) {
        // Update existing submission as draft
        const { data, error } = await supabase.functions.invoke('pencairan-update', {
          body: {
            id: editData.id,
            status: 'draft', // Set status to draft
            notes: notes.trim() || undefined,
            actor: 'sm',
            action: 'edit',
            uraianPengajuan: title.trim(),
            namaPengaju: submitterName.trim(),
            jenisPengajuan: jenisPengajuan,
            kelengkapan: kelengkapan,
            nominal: parseFormattedNumber(nominal) || '',
            satker: user?.satker,
          },
        });
        if (error) throw new Error(error.message || 'Gagal menyimpan draft');
        if (!data?.success) throw new Error(data?.error || 'Gagal menyimpan draft');
      } else {
        // Create new submission as draft
        const existingIds = existingSubmissions.map(s => s.id);
        const newId = generateSubmissionId(existingIds);

        const { data, error } = await supabase.functions.invoke('pencairan-save', {
          body: {
            id: newId,
            uraianPengajuan: title.trim(),
            namaPengaju: submitterName.trim(),
            jenisPengajuan: jenisPengajuan,
            kelengkapan: kelengkapan,
            catatan: notes.trim() || '',
            statusPengajuan: 'draft', // Save as draft
            waktuPengajuan: waktuPengajuan,
            statusPpk: '',
            waktuPpk: '',
            statusBendahara: '',
            waktuBendahara: '',
            statusKppn: '',
            satker: user?.satker,
            user: user?.role || '',
            nominal: parseFormattedNumber(nominal) || '',
          },
        });
        
        if (error) throw new Error(error.message || 'Gagal menyimpan draft');
        if (!data?.success) throw new Error(data?.error || 'Gagal menyimpan draft');
      }

      onSubmit({
        title: title.trim(),
        submitterName: submitterName.trim(),
        jenisBelanja,
        subJenisBelanja,
        submittedAt: new Date(),
        documents,
        notes: notes.trim() || undefined,
      });

      toast({
        title: 'Berhasil',
        description: editData ? 'Draft berhasil diperbarui' : 'Draft berhasil disimpan',
      });
      
      // Close dialog after successful save
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menyimpan draft',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    if (!validateForm()) return;

    const requiredDocuments = documents.filter(doc => doc.isRequired);
    const uncheckedRequired = requiredDocuments.filter(doc => !doc.isChecked);

    if (uncheckedRequired.length > 0) {
      toast({
        title: 'Dokumen Wajib Belum Lengkap',
        description: `Masih ada ${uncheckedRequired.length} dokumen wajib yang belum dicentang`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const checkedDocs = documents.filter(d => d.isChecked).map(d => d.name);
      const kelengkapan = checkedDocs.join('|');
      const jenisPengajuan = `${jenisBelanja} - ${subJenisBelanja}`;
      const waktuPengajuan = getJakartaTimeString();

      if (editData) {
        // Update and submit existing submission
        const { data, error } = await supabase.functions.invoke('pencairan-update', {
          body: {
            id: editData.id,
            status: 'pending_bendahara', // Submit to Bendahara
            notes: notes.trim() || undefined,
            actor: 'sm',
            action: 'edit',
            uraianPengajuan: title.trim(),
            namaPengaju: submitterName.trim(),
            jenisPengajuan: jenisPengajuan,
            kelengkapan: kelengkapan,
            satker: user?.satker,
          },
        });
        if (error) throw new Error(error.message || 'Gagal mengirim pengajuan');
        if (!data?.success) throw new Error(data?.error || 'Gagal mengirim pengajuan');
      } else {
        // Create and submit new submission
        const existingIds = existingSubmissions.map(s => s.id);
        const newId = generateSubmissionId(existingIds);

        console.log('[SubmissionForm] Creating new pencairan:', {
          id: newId,
          userSatker: user?.satker,
          timestamp: new Date().toISOString()
        });

        const { data, error } = await supabase.functions.invoke('pencairan-save', {
          body: {
            id: newId,
            uraianPengajuan: title.trim(),
            namaPengaju: submitterName.trim(),
            jenisPengajuan: jenisPengajuan,
            kelengkapan: kelengkapan,
            catatan: notes.trim() || '',
            statusPengajuan: 'pending_bendahara',
            waktuPengajuan: waktuPengajuan,
            statusPpk: '',
            waktuPpk: '',
            statusBendahara: '',
            waktuBendahara: '',
            statusKppn: '',
            satker: user?.satker,
            user: user?.role || '',
            nominal: parseFormattedNumber(nominal) || '',
          },
        });
        
        if (error) throw new Error(error.message || 'Gagal mengirim ke Google Sheets');
        if (!data?.success) throw new Error(data?.error || 'Gagal mengirim data');
      }

      onSubmit({
        title: title.trim(),
        submitterName: submitterName.trim(),
        jenisBelanja,
        subJenisBelanja,
        submittedAt: new Date(),
        documents,
        notes: notes.trim() || undefined,
      });

      setTitle('');
      setSubmitterName('');
      setJenisBelanja('');
      setSubJenisBelanja('');
      setNotes('');
      setDocuments([]);
      onClose();
      toast({
        title: 'Berhasil',
        description: editData ? 'Pengajuan berhasil diperbarui dan dikirim ke Bendahara' : 'Pengajuan berhasil dikirim ke Bendahara',
      });
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengirim data',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle(editData?.title || '');
    setSubmitterName(editData?.submitterName || '');
    setJenisBelanja(editData?.jenisBelanja || '');
    setSubJenisBelanja(editData?.subJenisBelanja || '');
    setNotes(editData?.notes || '');
    setNominal(editData?.nominal ? formatNumberWithSeparator(editData.nominal) : '');
    setDocuments(editData?.documents || []);
    onClose();
  };

  const checkedCount = documents.filter(d => d.isChecked).length;
  const requiredDocs = documents.filter(d => d.isRequired);
  const requiredCheckedCount = requiredDocs.filter(d => d.isChecked).length;
  const uncheckedRequiredCount = requiredDocs.filter(d => !d.isChecked).length;
  const hasJenisBelanja = Boolean(jenisBelanja && subJenisBelanja);
  const isFormValid = title.trim() && submitterName.trim() && jenisBelanja && subJenisBelanja;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {editData ? 'Edit Pengajuan' : 'Buat Pengajuan Baru'}
              </DialogTitle>
              <DialogDescription>
                Lengkapi formulir berikut untuk mengajukan dokumen ke Bendahara
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Uraian Pengajuan *</Label>
            <Input
              autoFocus
              placeholder="Masukkan uraian pengajuan..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Total Nilai</Label>
            <Input
              placeholder="Contoh: 1.000.000"
              value={nominal}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '');
                setNominal(raw ? formatNumberWithSeparator(raw) : '');
              }}
              className="h-11 rounded-xl"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label>Nama Pengaju *</Label>
            <Select value={submitterName} onValueChange={setSubmitterName}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder={isLoadingOrganik ? 'Memuat...' : 'Pilih nama pengaju'} />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {organikList.map((org, index) => (
                  <SelectItem key={`${org.nip}-${index}`} value={org.nama}>
                    <div className="flex flex-col">
                      <span className="font-medium">{org.nama}</span>
                      {org.jabatan && (
                        <span className="text-xs text-muted-foreground">{org.jabatan}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Jenis Belanja *</Label>
            <Select value={jenisBelanja} onValueChange={handleJenisBelanjaChange}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Pilih jenis belanja" />
              </SelectTrigger>
              <SelectContent>
                {JENIS_BELANJA_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {jenisBelanja && availableSubTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Sub-Jenis Belanja *</Label>
              <Tabs value={subJenisBelanja} onValueChange={handleSubJenisChange} className="w-full">
                <TabsList className="w-full flex-wrap h-auto p-1 gap-1">
                  {availableSubTypes.map((subType) => (
                    <TabsTrigger
                      key={subType}
                      value={subType}
                      className="flex-1 min-w-fit text-xs sm:text-sm"
                    >
                      {subType}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
          {hasJenisBelanja && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Kelengkapan Dokumen</Label>
                  {requiredDocs.length > 0 && uncheckedRequiredCount > 0 && (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {uncheckedRequiredCount} dokumen wajib belum lengkap
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{checkedCount}/{documents.length} dokumen</span>
                  <span>• {requiredCheckedCount}/{requiredDocs.length} wajib</span>
                </div>
              </div>

              {documents.length > 0 ? (
                <div className="max-h-56 overflow-y-auto rounded-lg border p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {documents.map((doc, index) => (
                      <div
                        key={`${doc.type}-${index}`}
                        className="flex items-start gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors min-h-[60px]"
                        onClick={() => handleDocumentToggle(doc.type)}
                      >
                        <Checkbox
                          checked={doc.isChecked}
                          onCheckedChange={() => handleDocumentToggle(doc.type)}
                          className="rounded-md mt-1 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start">
                            <span className="text-sm font-medium break-words">
                              {doc.name}
                              {doc.isRequired && <span className="text-destructive ml-1">*</span>}
                            </span>
                          </div>
                          {!doc.isRequired && doc.note && (
                            <div className="mt-1">
                              <span className="text-xs text-muted-foreground break-words">
                                {doc.note}
                              </span>
                            </div>
                          )}
                          {!doc.isRequired && !doc.note && (
                            <div className="mt-1">
                              <span className="text-xs text-muted-foreground">
                                (Opsional)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Pilih sub-jenis belanja untuk melihat daftar dokumen</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">* Dokumen wajib harus dilengkapi</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Catatan (Opsional)</Label>
            <Textarea
              placeholder="Tambahkan catatan jika diperlukan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-3 pt-4 flex-col sm:flex-row">
          <div className="flex w-full sm:w-auto justify-start">
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              className="rounded-xl"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={handleSaveAsDraft}
              className="rounded-xl shadow-sm hover:shadow-md transition-all"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Simpan Draft
            </Button>
            <Button
              onClick={handleSaveAndSubmit}
              className="rounded-xl shadow-sm hover:shadow-md transition-all bg-primary hover:bg-primary/90"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {editData ? 'Simpan dan Kirim ke Bendahara' : 'Kirim ke Bendahara'}
            </Button>
          </div>
        </DialogFooter>

        {/* Draft Confirmation Dialog */}
        <AlertDialog open={showDraftConfirmation} onOpenChange={setShowDraftConfirmation}>
          <AlertDialogContent className="rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Simpan Sebagai Draft?</AlertDialogTitle>
              <AlertDialogDescription>
                Usulan akan disimpan sebagai draft dan dapat diubah kembali di kemudian hari. Anda bisa menyelesaikan pengajuan nanti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmSaveAsDraft}
                className="rounded-lg bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Ya, Simpan Draft
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}