import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/pencairan/StatCard';
import { FilterTabs } from '@/components/pencairan/FilterTabs';
import { SubmissionTable } from '@/components/pencairan/SubmissionTable';
import { SubmissionDetail } from '@/components/pencairan/SubmissionDetail';
import { SubmissionForm } from '@/components/pencairan/SubmissionForm';
import { usePencairanData } from '@/hooks/use-pencairan-data';
import { Submission, SubmissionStatus, UserRole, canCreateSubmission, generateSubmissionId, getRelevantTimestamp, getDocumentsByJenisBelanja } from '@/types/pencairan';
import { FileText, Clock, CheckCircle2, XCircle, Plus, LayoutGrid, TableIcon, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function parseDocuments(docString: string, jenisBelanja: string) {
  if (!docString) return getDocumentsByJenisBelanja(jenisBelanja);
  const docNames = docString.split('|').map(d => d.trim()).filter(Boolean);
  const defaultDocs = getDocumentsByJenisBelanja(jenisBelanja);
  return defaultDocs.map(doc => ({
    ...doc,
    isChecked: docNames.some(name => name.toLowerCase().includes(doc.name.toLowerCase().split(' ')[0].toLowerCase()))
  }));
}

export default function UsulanPencairan() {
  const { data: sheetSubmissions = [], isLoading, refetch } = usePencairanData();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);

  const userRole = user?.role as UserRole;
  const showCreateButton = canCreateSubmission(userRole);

  useEffect(() => {
    if (sheetSubmissions.length > 0) {
      const converted: Submission[] = sheetSubmissions.map(item => {
        let submittedDate = new Date();
        const timeStr = item.waktuPengajuan || item.updatedAt || '';
        if (timeStr && timeStr.trim()) {
          const match = timeStr.match(/^(\d{2}):(\d{2}) - (\d{2})\/(\d{2})\/(\d{4})$/);
          if (match) {
            const [, hours, minutes, day, month, year] = match;
            submittedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
          } else {
            const parsed = new Date(timeStr);
            if (!isNaN(parsed.getTime())) submittedDate = parsed;
          }
        }
        return {
          id: item.id || generateSubmissionId([]),
          title: item.title || 'Pengajuan Baru',
          submitterName: item.submitterName || '',
          jenisBelanja: item.jenisBelanja || '',
          submittedAt: submittedDate,
          status: (item.status || 'pending_ppk') as SubmissionStatus,
          documents: parseDocuments(item.documents, item.jenisBelanja),
          notes: item.notes || undefined,
          waktuPengajuan: item.waktuPengajuan || '',
          waktuPpk: item.waktuPpk || '',
          waktuBendahara: item.waktuBendahara || '',
          statusPpk: item.statusPpk || '',
          statusBendahara: item.statusBendahara || '',
          statusKppn: item.statusKppn || ''
        };
      });
      converted.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      setSubmissions(converted);
    } else {
      setSubmissions([]);
    }
  }, [sheetSubmissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => activeFilter === 'all' || sub.status === activeFilter);
  }, [submissions, activeFilter]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: submissions.length, pending_ppk: 0, pending_bendahara: 0, incomplete_sm: 0, incomplete_ppk: 0, incomplete_bendahara: 0, sent_kppn: 0 };
    submissions.forEach(sub => { result[sub.status]++; });
    return result;
  }, [submissions]);

  const handleUpdateSubmission = (id: string, updates: Partial<Submission>) => {
    setSubmissions(prev => prev.map(sub => sub.id === id ? { ...sub, ...updates } : sub));
  };

  const handleFormSubmit = () => {
    setEditingSubmission(null);
    setTimeout(() => refetch(), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usulan Pencairan</h1>
          <p className="text-muted-foreground">Sistem Monitoring Pengajuan Administrasi</p>
        </div>
        <div className="flex items-center gap-2">
          {showCreateButton && (
            <Button onClick={() => setShowForm(true)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Buat Pengajuan
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="rounded-xl">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Pengajuan" value={counts.all} icon={FileText} />
        <StatCard title="Menunggu Verifikasi Pejabat Pembuat Komitmen" value={counts.pending_ppk} icon={Clock} variant="warning" />
        <StatCard title="Menunggu Verifikasi Bendahara Pengeluaran" value={counts.pending_bendahara} icon={Clock} variant="info" />
        <StatCard title="Dikembalikan" value={counts.incomplete_sm + counts.incomplete_ppk + counts.incomplete_bendahara} icon={XCircle} variant="danger" />
        <StatCard title="Dikirim KPPN" value={counts.sent_kppn} icon={CheckCircle2} variant="success" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Daftar Pengajuan</CardTitle>
            <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={counts} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">Menampilkan {filteredSubmissions.length} dari {submissions.length} pengajuan</p>
              <SubmissionTable submissions={filteredSubmissions} onView={setSelectedSubmission} onEdit={(sub) => { setEditingSubmission(sub); setShowForm(true); }} userRole={userRole} />
            </>
          )}
        </CardContent>
      </Card>

      <SubmissionForm open={showForm} onClose={() => { setShowForm(false); setEditingSubmission(null); }} onSubmit={handleFormSubmit} editData={editingSubmission} />
      <SubmissionDetail submission={selectedSubmission} open={!!selectedSubmission} onClose={() => setSelectedSubmission(null)} onUpdateSubmission={handleUpdateSubmission} userRole={userRole} onRefresh={refetch} />
    </div>
  );
}
