import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubmissionTable } from '@/components/pencairan/SubmissionTable';
import { SubmissionDetail } from '@/components/pencairan/SubmissionDetail';
import { SubmissionForm } from '@/components/pencairan/SubmissionForm';
import { usePencairanData } from '@/hooks/use-pencairan-data';
import { Submission, SubmissionStatus, UserRole, canCreateSubmission, generateSubmissionId, getDocumentsByJenisBelanja } from '@/types/pencairan';
import { FileText, Clock, CheckCircle2, XCircle, Plus, RefreshCw, Loader2, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Parse jenisBelanja yang disimpan sebagai "Jenis - SubJenis" di sheet
function parseJenisBelanja(jenisBelanjaStr: string): { jenis: string; subJenis: string } {
  if (!jenisBelanjaStr) return { jenis: '', subJenis: '' };
  const parts = jenisBelanjaStr.split(' - ');
  if (parts.length >= 2) {
    return { jenis: parts[0].trim(), subJenis: parts.slice(1).join(' - ').trim() };
  }
  return { jenis: jenisBelanjaStr.trim(), subJenis: '' };
}

function parseDocuments(docString: string, jenisBelanjaStr: string) {
  const { jenis, subJenis } = parseJenisBelanja(jenisBelanjaStr);
  const defaultDocs = getDocumentsByJenisBelanja(jenis, subJenis);
  
  if (!docString || defaultDocs.length === 0) return defaultDocs;
  
  const docNames = docString.split('|').map(d => d.trim().toLowerCase()).filter(Boolean);
  
  return defaultDocs.map(doc => ({
    ...doc,
    isChecked: docNames.some(name => 
      doc.name.toLowerCase().includes(name) || 
      name.includes(doc.name.toLowerCase().split(' ')[0].toLowerCase())
    )
  }));
}

// StatCard Component - Clickable sebagai filter
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'info' | 'danger' | 'success' | 'secondary';
  isActive?: boolean;
  onClick?: () => void;
}

function StatCard({ title, value, icon: Icon, variant = 'default', isActive, onClick }: StatCardProps) {
  const variantClasses = {
    default: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200',
    warning: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 border-amber-200',
    info: 'bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-200',
    danger: 'bg-gradient-to-br from-red-50 to-red-100 text-red-700 border-red-200',
    success: 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-green-200',
    secondary: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <Card 
      className={cn(
        `border h-full rounded-xl shadow-sm transition-all duration-200 cursor-pointer`,
        variantClasses[variant],
        isActive 
          ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-lg' 
          : 'hover:shadow-md hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${variantClasses[variant].split(' ')[0]}`}>
          <Icon className="w-6 h-6" strokeWidth={1.5} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function UsulanPencairan() {
  const { data: sheetSubmissions = [], isLoading, refetch } = usePencairanData();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const userRole = user?.role as UserRole;
  const showCreateButton = canCreateSubmission(userRole);

  useEffect(() => {
    if (sheetSubmissions.length > 0) {
      const converted: Submission[] = sheetSubmissions.map(item => {
        let submittedDate = item.submittedAt instanceof Date ? item.submittedAt : new Date();
        
        // Jika submittedAt invalid, coba parse dari waktuPengajuan
        if (isNaN(submittedDate.getTime())) {
          const timeStr = typeof item.waktuPengajuan === 'string' ? item.waktuPengajuan : '';
          if (timeStr) {
            const match = timeStr.match(/^(\d{2}):(\d{2}) - (\d{2})\/(\d{2})\/(\d{4})$/);
            if (match) {
              const [, hours, minutes, day, month, year] = match;
              submittedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
            }
          }
          if (isNaN(submittedDate.getTime())) submittedDate = new Date();
        }
        
        // Data sudah di-parse di use-pencairan-data.ts
        // item.jenisBelanja sudah berisi jenis saja, item.subJenisBelanja sudah terpisah
        
        // Parse documents - item.documents bisa berupa array Document[] atau string
        const docsInput = Array.isArray(item.documents) 
          ? item.documents.map(d => d.name).join('|') 
          : (typeof item.documents === 'string' ? item.documents : '');
        
        // Rebuild jenisBelanja string untuk parseDocuments
        const fullJenisBelanja = item.subJenisBelanja 
          ? `${item.jenisBelanja} - ${item.subJenisBelanja}` 
          : item.jenisBelanja;
        
        return {
          id: item.id || generateSubmissionId([]),
          title: item.title || 'Pengajuan Baru',
          submitterName: item.submitterName || '',
          jenisBelanja: item.jenisBelanja,
          subJenisBelanja: item.subJenisBelanja || '',
          submittedAt: submittedDate,
          status: (item.status || 'pending_ppk') as SubmissionStatus,
          documents: parseDocuments(docsInput, fullJenisBelanja),
          notes: item.notes || undefined,
          waktuPengajuan: item.waktuPengajuan || '',
          waktuPpk: item.waktuPpk || '',
          waktuPPSPM: item.waktuPPSPM || '',
          waktuBendahara: item.waktuBendahara || '',
          statusPpk: item.statusPpk || '',
          statusPPSPM: item.statusPPSPM || '',
          statusBendahara: item.statusBendahara || '',
          statusKppn: item.statusKppn || '',
          // Kolom P (Update Terakhir)
          updatedAt: item.updatedAt instanceof Date && !isNaN(item.updatedAt.getTime()) ? item.updatedAt : undefined,
          updatedAtString: item.updatedAtString || '',
        };
      });
      converted.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      setSubmissions(converted);
    } else {
      setSubmissions([]);
    }
  }, [sheetSubmissions]);

  const filteredSubmissions = useMemo(() => {
    if (activeFilter === 'all') return submissions;
    if (activeFilter === 'rejected') {
      return submissions.filter(sub => 
        sub.status === 'incomplete_sm' || 
        sub.status === 'incomplete_ppk' || 
        sub.status === 'incomplete_ppspm' || 
        sub.status === 'incomplete_bendahara'
      );
    }
    return submissions.filter(sub => sub.status === activeFilter);
  }, [submissions, activeFilter]);

  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage]);

  const totalPages = Math.ceil(filteredSubmissions.length / pageSize);

  const counts = useMemo(() => {
    // Inisialisasi dengan semua status yang mungkin
    const result: Record<string, number> = {
      all: submissions.length,
      draft: 0,
      pending_bendahara: 0,
      pending_ppk: 0,
      pending_ppspm: 0,
      pending_kppn: 0,
      pending_arsip: 0,
      incomplete_sm: 0,
      incomplete_bendahara: 0,
      incomplete_ppk: 0,
      incomplete_ppspm: 0,
      incomplete_kppn: 0,
      sent_arsip: 0
    };
    
    // Hitung setiap status
    submissions.forEach(sub => {
      if (sub.status in result) {
        result[sub.status]++;
      }
    });
    return result;
  }, [submissions]);

  const handleUpdateSubmission = (id: string, updates: Partial<Submission>) => {
    setSubmissions(prev => prev.map(sub => sub.id === id ? { ...sub, ...updates } : sub));
  };

  const handleFormSubmit = () => {
    setEditingSubmission(null);
    setTimeout(() => refetch(), 1500);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="space-y-6">
      {/* HEADER - Diperbarui dengan shadow dan rounded */}
      <div className="flex items-center justify-between bg-background p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usulan Pencairan</h1>
          <p className="text-muted-foreground text-sm">Sistem Monitoring Pengajuan Administrasi</p>
        </div>
        <div className="flex items-center gap-2">
          {showCreateButton && (
            <Button onClick={() => setShowForm(true)} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <Plus className="w-4 h-4 mr-2" />
              Buat Pengajuan
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* STATISTIC CARDS - Clickable sebagai filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard 
          title="Total" 
          value={counts.all} 
          icon={FileText} 
          isActive={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
        />
        <StatCard 
          title="Draft SM" 
          value={counts.draft} 
          icon={FileEdit} 
          variant="default"
          isActive={activeFilter === 'draft'}
          onClick={() => setActiveFilter('draft')}
        />
        <StatCard 
          title="Periksa Bendahara" 
          value={counts.pending_bendahara} 
          icon={Clock} 
          variant="info"
          isActive={activeFilter === 'pending_bendahara'}
          onClick={() => setActiveFilter('pending_bendahara')}
        />
        <StatCard 
          title="Periksa PPK" 
          value={counts.pending_ppk} 
          icon={Clock} 
          variant="warning"
          isActive={activeFilter === 'pending_ppk'}
          onClick={() => setActiveFilter('pending_ppk')}
        />
        <StatCard 
          title="Periksa PPSPM" 
          value={counts.pending_ppspm} 
          icon={Clock} 
          variant="secondary"
          isActive={activeFilter === 'pending_ppspm'}
          onClick={() => setActiveFilter('pending_ppspm')}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard 
          title="Periksa KPPN" 
          value={counts.pending_kppn} 
          icon={Clock} 
          variant="info"
          isActive={activeFilter === 'pending_kppn'}
          onClick={() => setActiveFilter('pending_kppn')}
        />
        <StatCard 
          title="Catat Arsip" 
          value={counts.pending_arsip} 
          icon={Clock} 
          variant="warning"
          isActive={activeFilter === 'pending_arsip'}
          onClick={() => setActiveFilter('pending_arsip')}
        />
        <StatCard 
          title="Selesai (Arsip)" 
          value={counts.sent_arsip} 
          icon={CheckCircle2} 
          variant="success"
          isActive={activeFilter === 'sent_arsip'}
          onClick={() => setActiveFilter('sent_arsip')}
        />
        <StatCard 
          title="Ditolak" 
          value={counts.incomplete_sm + counts.incomplete_bendahara + counts.incomplete_ppk + counts.incomplete_ppspm + counts.incomplete_kppn} 
          icon={XCircle} 
          variant="danger"
          isActive={activeFilter === 'rejected'}
          onClick={() => setActiveFilter('rejected')}
        />
      </div>

      {/* DAFTAR PENGAJUAN CARD */}
      <Card className="w-full overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-lg sm:text-xl font-semibold tracking-tight">Daftar Pengajuan</CardTitle>
        </CardHeader>
        
        <CardContent className="px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Menampilkan {paginatedSubmissions.length} dari {filteredSubmissions.length} pengajuan
              </p>
              
              <div className="w-full overflow-x-auto rounded-lg border">
                <SubmissionTable 
                  submissions={paginatedSubmissions} 
                  onView={setSelectedSubmission} 
                  onEdit={(sub) => { 
                    setEditingSubmission(sub); 
                    setShowForm(true); 
                  }} 
                  userRole={userRole} 
                />
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePageChange(1)} 
                    disabled={currentPage === 1}
                    className="rounded-lg"
                  >
                    Awal
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="rounded-lg"
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className="rounded-lg"
                  >
                    Selanjutnya
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePageChange(totalPages)} 
                    disabled={currentPage === totalPages}
                    className="rounded-lg"
                  >
                    Akhir
                  </Button>
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