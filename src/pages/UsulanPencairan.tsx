import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubmissionTable } from '@/components/pencairan/SubmissionTable';
import { SubmissionDetail } from '@/components/pencairan/SubmissionDetail';
import { SubmissionForm } from '@/components/pencairan/SubmissionForm';
import { usePencairanData } from '@/hooks/use-pencairan-data';
import { Submission, SubmissionStatus, UserRole, canCreateSubmission, generateSubmissionId, getDocumentsByJenisBelanja, shouldShowSubmission } from '@/types/pencairan';
import { FileText, Clock, CheckCircle2, XCircle, Plus, RefreshCw, Loader2, FileEdit, AlertCircle, Send, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Filter configuration untuk Tabs
const filterConfig = [
  { value: 'all', label: 'Total', icon: FileText, color: 'text-blue-500' },
  { value: 'draft', label: 'Draft', icon: FileEdit, color: 'text-gray-500' },
  { value: 'rejected', label: 'Ditolak', icon: XCircle, color: 'text-red-500' },
  { value: 'pending_bendahara', label: 'Bendahara', icon: Clock, color: 'text-indigo-500' },
  { value: 'pending_ppk', label: 'PPK', icon: Clock, color: 'text-orange-500' },
  { value: 'pending_ppspm', label: 'PPSPM', icon: Clock, color: 'text-pink-500' },
  { value: 'sent_kppn', label: 'KPPN', icon: Send, color: 'text-purple-500' },
  { value: 'complete_arsip', label: 'Arsip', icon: Archive, color: 'text-emerald-500' },
];

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
  const [currentUser, setCurrentUser] = useState<any>(null);

  const userRole = user?.role as UserRole;
  const showCreateButton = canCreateSubmission(userRole);

  // Get user from localStorage or AuthContext
  useEffect(() => {
    const userData = localStorage.getItem('simaja_user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // Fungsi untuk mengecek apakah user memiliki role yang sesuai untuk pengajuan
  const shouldShowRoleWarning = () => {
    if (!currentUser) return false;
    const role = currentUser.role || '';
    // Jangan tampil warning jika role adalah "Ketua Tim" atau mengandung kata "Fungsi"
    if (role === 'Ketua Tim' || role.includes('Fungsi')) {
      return false;
    }
    return true;
  };

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
          ? item.documents 
          : typeof item.documents === 'string' 
            ? (item.documents as string).split('|').map((name: string) => ({
                type: name.toLowerCase().replace(/\s+/g, '_'),
                name: name.trim(),
                isRequired: true,
                isChecked: true,
              }))
            : [];
        
        return {
          ...item,
          submittedAt: submittedDate,
          documents: docsInput,
        };
      });
      
      setSubmissions(converted);
      
      // UPDATE selectedSubmission jika ada yang terbuka, agar dapatkan data fresh
      if (selectedSubmission) {
        const updatedSubmission = converted.find(s => s.id === selectedSubmission.id);
        if (updatedSubmission) {
          setSelectedSubmission(updatedSubmission);
        }
      }
    }
  }, [sheetSubmissions, selectedSubmission?.id]);

  const filteredSubmissions = useMemo(() => {
    // Start dengan copy dari submissions, filtered by current user's satker
    // (data dari usePencairanData seharusnya sudah filtered by satker, tapi ini sebagai safety check)
    let result = submissions; // Already filtered by satker from usePencairanData
    
    // 🆕 Filter berdasarkan role user - hanya tampilkan data yang sesuai dengan role mereka
    result = result.filter(sub => shouldShowSubmission(sub, userRole));
    
    // Filter berdasarkan activeFilter
    if (activeFilter !== 'all') {
      if (activeFilter === 'rejected') {
        result = result.filter(sub => 
          sub.status === 'incomplete_sm' || 
          sub.status === 'incomplete_bendahara' || 
          sub.status === 'incomplete_ppk' || 
          sub.status === 'incomplete_ppspm' ||
          sub.status === 'incomplete_kppn'
        );
      } else {
        result = result.filter(sub => sub.status === activeFilter);
      }
    }
    
    // Sort by ID - extract nomor urut (3 digit terakhir) dan sort descending
    // Format ID: SUBYYMMXXX (XX = tahun, MM = bulan, XXX = nomor urut)
    result = result.sort((a, b) => {
      try {
        // Extract tahun, bulan, dan nomor urut
        const aNum = parseInt(a.id.substring(5)); // SUB + 2 digit tahun + 2 digit bulan + 3 digit nomor = ambil dari index 5
        const bNum = parseInt(b.id.substring(5));
        
        // Descending order (terbaru dulu)
        return bNum - aNum;
      } catch (e) {
        return 0;
      }
    });
    
    return result;
  }, [submissions, activeFilter, userRole]);

  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage]);

  const totalPages = Math.ceil(filteredSubmissions.length / pageSize);

  const counts = useMemo(() => {
    // 🆕 Hitung berdasarkan filteredSubmissions (setelah role filtering), bukan submissions
    const result: Record<string, number> = {
      all: 0,
      draft: 0,
      pending_bendahara: 0,
      pending_ppk: 0,
      pending_ppspm: 0,
      sent_kppn: 0,
      complete_arsip: 0,
      rejected: 0, // Untuk tab "Ditolak"
      incomplete_sm: 0,
      incomplete_bendahara: 0,
      incomplete_ppk: 0,
      incomplete_ppspm: 0,
      incomplete_kppn: 0,
    };
    
    // Hitung setiap status dari filtered data
    filteredSubmissions.forEach(sub => {
      result.all++;
      
      // Count ke kategori rejected jika status incomplete_*
      if (sub.status.startsWith('incomplete_')) {
        result.rejected++;
      }
      
      if (sub.status in result) {
        result[sub.status]++;
      }
    });
    return result;
  }, [filteredSubmissions]);

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
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Sigap SPJ
          </h1>
          <p className="text-muted-foreground text-sm">
            Sinergi Gerak Administrasi Pengajuan — Surat Pertanggungjawaban
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showCreateButton && (
            <Button onClick={() => setShowForm(true)} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <Plus className="w-4 h-4 mr-2" />
              Buat Pengajuan
            </Button>
          )}

        </div>
      </div>

      {/* Role Warning - Informasi Role User */}
      {shouldShowRoleWarning() && currentUser && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm text-amber-900">
                Perhatian: Anda saat ini login sebagai <strong>{currentUser.role}</strong>.
              </h3>
              <div className="mt-2 text-sm text-amber-800 space-y-1">
                <p>
                  Untuk melakukan pengajuan SPJ, Anda harus menggunakan akun dengan role <strong>Ketua Tim</strong> atau <strong>Fungsi.</strong> Silakan hubungi administrator jika Anda perlu mengubah role akun Anda.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER TABS - Clean & Modern Style */}
      <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)} className="w-full">
        <div className="w-full flex justify-center">
          <TabsList className="flex flex-wrap w-full max-w-5xl bg-muted/60 p-1 rounded-xl shadow-inner justify-center gap-1 h-auto">
            {filterConfig.map((filter) => {
              const Icon = filter.icon;
              // 🆕 Gunakan counts yang sudah di-filter berdasarkan role
              const countValue = counts[filter.value] || 0;

              return (
                <TabsTrigger
                  key={filter.value}
                  value={filter.value}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary hover:bg-background/50"
                >
                  <Icon className={`h-4 w-4 ${filter.color}`} />
                  <span className="hidden sm:inline">{filter.label}</span>
                  <span className="inline sm:hidden text-xs font-bold bg-primary/10 px-1.5 py-0.5 rounded-full text-primary">
                    {countValue}
                  </span>
                  <span className="hidden sm:inline text-xs font-bold bg-primary/10 px-1.5 py-0.5 rounded-full text-primary ml-1">
                    {countValue}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>

      {/* DAFTAR PENGAJUAN CARD */}
      <div className="flex justify-center">
        <Card className="w-full overflow-hidden rounded-xl shadow-sm">
          <CardHeader className="px-4 sm:px-6 py-4 border-b">
            <CardTitle className="text-lg sm:text-xl font-semibold tracking-tight">Daftar Pengajuan</CardTitle>
          </CardHeader>
          
          <CardContent className="px-4 sm:px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto rounded-lg border bg-white dark:bg-slate-950">
                  <SubmissionTable 
                  submissions={filteredSubmissions} 
                  onView={setSelectedSubmission} 
                  onEdit={(sub) => { 
                    setEditingSubmission(sub); 
                    setShowForm(true); 
                  }} 
                  userRole={userRole} 
                />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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