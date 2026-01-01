import { useState, useEffect } from 'react';
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
import { Send, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganikPencairan, usePencairanData } from '@/hooks/use-pencairan-data';

interface SubmissionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (submission: Omit<Submission, 'id' | 'status'>) => void;
  editData?: Submission | null;
}

// Fungsi untuk mendapatkan waktu Jakarta (WIB) dalam format yang sesuai untuk spreadsheet
function getJakartaTimeString(): string {
  const now = new Date();
  
  // Jakarta adalah UTC+7 (WIB)
  const jakartaOffset = 7 * 60; // 7 jam dalam menit
  const localOffset = now.getTimezoneOffset(); // Offset waktu lokal browser dalam menit
  const jakartaTime = new Date(now.getTime() + (localOffset + jakartaOffset) * 60 * 1000);
  
  // Format: YYYY-MM-DD HH:mm:ss (format yang mudah dibaca di spreadsheet)
  const year = jakartaTime.getFullYear();
  const month = String(jakartaTime.getMonth() + 1).padStart(2, '0');
  const day = String(jakartaTime.getDate()).padStart(2, '0');
  const hours = String(jakartaTime.getHours()).padStart(2, '0');
  const minutes = String(jakartaTime.getMinutes()).padStart(2, '0');
  const seconds = String(jakartaTime.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Fungsi untuk mendapatkan timestamp ISO Jakarta
function getJakartaISOString(): string {
  const now = new Date();
  
  // Jakarta adalah UTC+7 (WIB)
  const jakartaOffset = 7 * 60; // 7 jam dalam menit
  const localOffset = now.getTimezoneOffset(); // Offset waktu lokal browser dalam menit
  const jakartaTime = new Date(now.getTime() + (localOffset + jakartaOffset) * 60 * 1000);
  
  // Format ISO dengan timezone: 2025-04-15T21:30:00+07:00
  const year = jakartaTime.getFullYear();
  const month = String(jakartaTime.getMonth() + 1).padStart(2, '0');
  const day = String(jakartaTime.getDate()).padStart(2, '0');
  const hours = String(jakartaTime.getHours()).padStart(2, '0');
  const minutes = String(jakartaTime.getMinutes()).padStart(2, '0');
  const seconds = String(jakartaTime.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;
}

export function SubmissionForm({ open, onClose, onSubmit, editData }: SubmissionFormProps) {
  const { data: organikList = [], isLoading: isLoadingOrganik } = useOrganikPencairan();
  const { data: existingSubmissions = [] } = usePencairanData();

  const [title, setTitle] = useState(editData?.title || '');
  const [submitterName, setSubmitterName] = useState(editData?.submitterName || '');
  const [jenisBelanja, setJenisBelanja] = useState(editData?.jenisBelanja || '');
  const [subJenisBelanja, setSubJenisBelanja] = useState(editData?.subJenisBelanja || '');
  const [notes, setNotes] = useState(editData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<Document[]>(editData?.documents || []);

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
    if (!editData) {
      updateDocuments(value, firstSubType);
    }
  };

  const handleSubJenisChange = (value: string) => {
    setSubJenisBelanja(value);
    if (!editData) {
      updateDocuments(jenisBelanja, value);
    }
  };

  useEffect(() => {
    if (editData) {
      setTitle(editData.title);
      setSubmitterName(editData.submitterName);
      setJenisBelanja(editData.jenisBelanja);
      setSubJenisBelanja(editData.subJenisBelanja || '');
      setNotes(editData.notes || '');
      setDocuments(editData.documents);
    } else {
      setTitle('');
      setSubmitterName('');
      setJenisBelanja('');
      setSubJenisBelanja('');
      setNotes('');
      setDocuments([]);
    }
  }, [editData, open]);

  const handleDocumentToggle = (docType: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.type === docType ? { ...doc, isChecked: !doc.isChecked } : doc
      )
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Judul pengajuan harus diisi', variant: 'destructive' });
      return;
    }
    if (!submitterName.trim()) {
      toast({ title: 'Error', description: 'Nama pengaju harus dipilih', variant: 'destructive' });
      return;
    }
    if (!jenisBelanja) {
      toast({ title: 'Error', description: 'Jenis belanja harus dipilih', variant: 'destructive' });
      return;
    }
    if (!subJenisBelanja) {
      toast({ title: 'Error', description: 'Sub-jenis belanja harus dipilih', variant: 'destructive' });
      return;
    }

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
      if (editData) {
        const { data, error } = await supabase.functions.invoke('pencairan-update', {
          body: {
            id: editData.id,
            status: editData.status,
            notes: notes.trim() || undefined,
            actor: 'ppk',
            action: 'approve',
          },
        });
        if (error) throw new Error(error.message || 'Gagal memperbarui catatan');
        if (!data?.success) throw new Error(data?.error || 'Gagal memperbarui data');
      } else {
        const existingIds = existingSubmissions.map(s => s.id);
        const newId = generateSubmissionId(existingIds);

        // Mengambil nama dokumen yang sudah dicentang
        const checkedDocs = documents.filter(d => d.isChecked).map(d => d.name);
        const documentsString = checkedDocs.join('|');
        
        // Format jenis pengajuan untuk spreadsheet
        const jenisPengajuan = `${jenisBelanja} - ${subJenisBelanja}`;
        
        // Waktu Jakarta (WIB) untuk spreadsheet
        const waktuPengajuan = getJakartaTimeString();
        // Atau jika ingin format ISO: const waktuPengajuan = getJakartaISOString();

        const { data, error } = await supabase.functions.invoke('pencairan-save', {
          body: {
            // Kolom A-M sesuai struktur spreadsheet
            id: newId,                           // Kolom A: ID
            uraianPengajuan: title.trim(),       // Kolom B: Uraian Pengajuan
            namaPengaju: submitterName.trim(),   // Kolom C: Nama Pengaju  
            jenisPengajuan: jenisPengajuan,      // Kolom D: Jenis Pengajuan
            kelengkapan: documentsString,        // Kolom E: Kelengkapan
            catatan: notes.trim() || '',         // Kolom F: Catatan
            statusPengajuan: 'pending_ppk',      // Kolom G: Status Pengajuan
            waktuPengajuan: waktuPengajuan,      // Kolom H: Waktu Pengajuan (WIB)
            statusPpk: '',                       // Kolom I: Status PPK
            waktuPpk: '',                        // Kolom J: Waktu PPK
            statusBendahara: '',                 // Kolom K: Status Bendahara
            waktuBendahara: '',                  // Kolom L: Waktu Bendahara
            statusKppn: ''                       // Kolom M: Status KPPN
          },
        });
        
        if (error) throw new Error(error.message || 'Gagal menyimpan ke Google Sheets');
        if (!data?.success) throw new Error(data?.error || 'Gagal menyimpan data');
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
        description: editData ? 'Catatan berhasil diperbarui' : 'Pengajuan berhasil dikirim ke PPK',
      });
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menyimpan data',
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
    setDocuments(editData?.documents || []);
    onClose();
  };

  const checkedCount = documents.filter(d => d.isChecked).length;
  const requiredDocs = documents.filter(d => d.isRequired);
  const requiredCheckedCount = requiredDocs.filter(d => d.isChecked).length;
  const uncheckedRequiredCount = requiredDocs.filter(d => !d.isChecked).length;
  const hasJenisBelanja = Boolean(jenisBelanja && subJenisBelanja);

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
                Lengkapi formulir berikut untuk mengajukan dokumen ke PPK
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Uraian Pengajuan *</Label>
            <Input
              placeholder="Masukkan uraian pengajuan..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl"
              disabled={!!editData}
            />
          </div>
          <div className="space-y-2">
            <Label>Nama Pengaju *</Label>
            <Select value={submitterName} onValueChange={setSubmitterName} disabled={!!editData}>
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
            <Select value={jenisBelanja} onValueChange={handleJenisBelanjaChange} disabled={!!editData}>
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
                      disabled={!!editData}
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
                  <div className="grid grid-cols-1 gap-2">
                    {documents.map((doc, index) => (
                      <div
                        key={`${doc.type}-${index}`}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => !editData && handleDocumentToggle(doc.type)}
                      >
                        <Checkbox
                          checked={doc.isChecked}
                          onCheckedChange={() => !editData && handleDocumentToggle(doc.type)}
                          className="rounded-md"
                          disabled={!!editData}
                        />
                        <div className="flex-1">
                          <span className="text-sm">
                            {doc.name}
                            {doc.isRequired && <span className="text-destructive ml-1">*</span>}
                          </span>
                          {!doc.isRequired && (
                            <span className="text-muted-foreground text-xs ml-2">
                              (Opsional{doc.note ? ` - ${doc.note}` : ''})
                            </span>
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
        <DialogFooter className="gap-3 pt-4">
          <Button variant="outline" onClick={handleCancel} className="rounded-xl" disabled={isSubmitting}>
            <X className="w-4 h-4 mr-2" />
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            className="rounded-xl shadow-sm hover:shadow-md transition-all"
            disabled={isSubmitting || (!editData && !hasJenisBelanja)}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? 'Menyimpan...' : editData ? 'Simpan Catatan' : 'Kirim ke PPK'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}