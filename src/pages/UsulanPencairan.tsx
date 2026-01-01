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
import { Submission, SubmissionStatus, UserRole, canCreateSubmission, generateSubmissionId, getDocumentsByJenisBelanja } from '@/types/pencairan';
import { FileText, Clock, CheckCircle2, XCircle, Plus, RefreshCw, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
  
  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      // Reset ke halaman 1 ketika data berubah
      setCurrentPage(1);
    } else {
      setSubmissions([]);
      setCurrentPage(1);
    }
  }, [sheetSubmissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => activeFilter === 'all' || sub.status === activeFilter);
  }, [submissions, activeFilter]);

  // Hitung pagination
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  const counts = useMemo(() => {
    const result: Record<string, number> = { 
      all: submissions.length, 
      pending_ppk: 0, 
      pending_bendahara: 0, 
      incomplete_sm: 0, 
      incomplete_ppk: 0, 
      incomplete_bendahara: 0, 
      sent_kppn: 0 
    };
    submissions.forEach(sub => { 
      result[sub.status]++; 
    });
    return result;
  }, [submissions]);

  // Fungsi untuk pagination
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handleUpdateSubmission = (id: string, updates: Partial<Submission>) => {
    setSubmissions(prev => prev.map(sub => sub.id === id ? { ...sub, ...updates } : sub));
  };

  const handleFormSubmit = () => {
    setEditingSubmission(null);
    setTimeout(() => refetch(), 1500);
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Usulan Pencairan</h1>
          <p className="text-sm text-muted-foreground">Sistem Monitoring Pengajuan Administrasi</p>
        </div>
        <div className="flex items-center gap-2">
          {showCreateButton && (
            <Button onClick={() => setShowForm(true)} className="rounded-xl h-9">
              <Plus className="w-3.5 h-3.5 mr-2" />
              Buat Pengajuan
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="rounded-xl h-9 w-9 p-0">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* STATISTIC CARDS */}
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard 
            title="Total" 
            value={counts.all} 
            icon={FileText} 
          />
          
          <StatCard 
            title="Menunggu PPK" 
            value={counts.pending_ppk} 
            icon={Clock} 
            variant="warning"
          />
          
          <StatCard 
            title="Menunggu Bendahara" 
            value={counts.pending_bendahara} 
            icon={Clock} 
            variant="info"
          />
          
          <StatCard 
            title="Dikembalikan" 
            value={counts.incomplete_sm + counts.incomplete_ppk + counts.incomplete_bendahara} 
            icon={XCircle} 
            variant="danger"
          />
          
          <StatCard 
            title="Dikirim KPPN" 
            value={counts.sent_kppn} 
            icon={CheckCircle2} 
            variant="success"
          />
        </div>
      </div>

      {/* DAFTAR PENGAJUAN CARD */}
      <Card className="w-full overflow-hidden border shadow-sm">
        <CardHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex-shrink-0">
              <CardTitle className="text-base font-semibold">Daftar Pengajuan</CardTitle>
            </div>
            
            {/* Filter Tabs - Rata Tengah */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <FilterTabs 
                activeFilter={activeFilter} 
                onFilterChange={setActiveFilter} 
                counts={counts} 
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Menampilkan {currentSubmissions.length} dari {filteredSubmissions.length} pengajuan
                {filteredSubmissions.length > itemsPerPage && ` (Halaman ${currentPage} dari ${totalPages})`}
              </p>
              
              <div className="w-full overflow-x-auto">
                <SubmissionTable 
                  submissions={currentSubmissions} 
                  onView={setSelectedSubmission} 
                  onEdit={(sub) => { 
                    setEditingSubmission(sub); 
                    setShowForm(true); 
                  }} 
                  userRole={userRole} 
                />
              </div>

              {/* PAGINATION - Compact */}
              {filteredSubmissions.length > itemsPerPage && (
                <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {startIndex + 1} - {Math.min(endIndex, filteredSubmissions.length)} dari {filteredSubmissions.length}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {/* Tombol Awal */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToFirstPage}
                      disabled={currentPage === 1}
                      className="h-7 w-7 rounded-md p-0"
                      title="Awal"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    
                    {/* Tombol Sebelumnya */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="h-7 w-7 rounded-md p-0"
                      title="Sebelumnya"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    
                    {/* Info Halaman */}
                    <div className="min-w-[80px] text-center">
                      <span className="text-xs font-medium px-2">
                        {currentPage} / {totalPages}
                      </span>
                    </div>
                    
                    {/* Tombol Selanjutnya */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 rounded-md p-0"
                      title="Selanjutnya"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    
                    {/* Tombol Akhir */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 rounded-md p-0"
                      title="Akhir"
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  
                  {/* Selector Halaman */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Ke:</span>
                    <select
                      value={currentPage}
                      onChange={(e) => goToPage(Number(e.target.value))}
                      className="h-7 w-14 rounded border border-input bg-background px-2 py-0 text-xs"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <option key={page} value={page}>
                          {page}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* MODALS */}
      <SubmissionForm 
        open={showForm} 
        onClose={() => { 
          setShowForm(false); 
          setEditingSubmission(null); 
        }} 
        onSubmit={handleFormSubmit} 
        editData={editingSubmission} 
      />
      
      <SubmissionDetail 
        submission={selectedSubmission} 
        open={!!selectedSubmission} 
        onClose={() => setSelectedSubmission(null)} 
        onUpdateSubmission={handleUpdateSubmission} 
        userRole={userRole} 
        onRefresh={refetch} 
      />
    </div>
  );
}