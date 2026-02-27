import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubmissionTable } from '@/components/pencairan/SubmissionTable';
import { SubmissionDetail } from '@/components/pencairan/SubmissionDetail';
import { SubmissionForm } from '@/components/pencairan/SubmissionForm';
import { SPByGrouping } from '@/components/pencairan/SPByGrouping';
import { usePencairanData } from '@/hooks/use-pencairan-data';
import { Submission, SubmissionStatus, UserRole, canCreateSubmission, generateSubmissionId, getDocumentsByJenisBelanja, shouldShowSubmission } from '@/types/pencairan';
import { FileText, Clock, CheckCircle2, XCircle, Plus, RefreshCw, Loader2, FileEdit, AlertCircle, Send, Archive, Package } from 'lucide-react';
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
  // SPBy tab will be added dynamically for Bendahara
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
    const role = currentUser.role as UserRole;
    // Tampil warning jika role TIDAK bisa membuat pengajuan
    // Ini otomatis mengecek SUBMITTER_ROLES (Fungsi*, Bendahara, PPK)
    return !canCreateSubmission(role);
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

  // 🆕 Filter hanya berdasarkan role (tanpa filter status tab) - untuk counts
  const roleFilteredSubmissions = useMemo(() => {
    let result = submissions; // Already filtered by satker from usePencairanData
    
    // Filter berdasarkan role user - hanya tampilkan data yang sesuai dengan role mereka
    result = result.filter(sub => shouldShowSubmission(sub, userRole));
    
    // Sort by ID - extract nomor urut (3 digit terakhir) dan sort descending
    result = result.sort((a, b) => {
      try {
        const aNum = parseInt(a.id.substring(5));
        const bNum = parseInt(b.id.substring(5));
        return bNum - aNum;
      } catch (e) {
        return 0;
      }
    });
    
    return result;
  }, [submissions, userRole]);

  // Filter berdasarkan role user AND active status filter tab
  const filteredSubmissions = useMemo(() => {
    let result = roleFilteredSubmissions;
    
    // Filter berdasarkan activeFilter tab
    // 🆕 Logika baru: setiap tab juga tampilkan incomplete_* yang sesuai dengan tugasnya
    // Ini agar tidak kehilangan jejak dan role bisa langsung eksekusi ulang
    if (activeFilter !== 'all') {
      if (activeFilter === 'rejected') {
        // Tab Ditolak: tampilkan SEMUA incomplete_* untuk audit trail
        result = result.filter(sub => 
          sub.status === 'incomplete_sm' || 
          sub.status === 'incomplete_bendahara' || 
          sub.status === 'incomplete_ppk' || 
          sub.status === 'incomplete_ppspm' ||
          sub.status === 'incomplete_kppn'
        );
      } else if (activeFilter === 'draft') {
        // Tab Draft: tampilkan draft + incomplete_sm (penolakan dari Bendahara ke SM)
        result = result.filter(sub => 
          sub.status === 'draft' || 
          sub.status === 'incomplete_sm'
        );
      } else if (activeFilter === 'pending_bendahara') {
        // Tab Bendahara: tampilkan pending_bendahara + incomplete_bendahara (penolakan dari PPK)
        // TAPI EXCLUDE HANYA pending_bendahara dengan pembayaran UP (akan ditampilkan di tab SPBy)
        // incomplete_bendahara + UP HARUS include karena hasil rejection dari PPK/roles lain
        result = result.filter(sub => 
          (sub.status === 'incomplete_bendahara') ||
          (sub.status === 'pending_bendahara' && sub.pembayaran !== 'UP')
        );
      } else if (activeFilter === 'spby') {
        // Tab SPBy: tampilkan UP dengan pending_bendahara ATAU incomplete_bendahara
        // (bisa dari fresh input atau dari rejection yang sudah di-reset pembayarannya)
        result = result.filter(sub =>
          sub.pembayaran === 'UP' &&
          (sub.status === 'pending_bendahara' || sub.status === 'incomplete_bendahara')
        );
      } else if (activeFilter === 'pending_ppk') {
        // Tab PPK: tampilkan pending_ppk + incomplete_ppk (penolakan dari PPSPM)
        result = result.filter(sub => 
          sub.status === 'pending_ppk' || 
          sub.status === 'incomplete_ppk'
        );
      } else if (activeFilter === 'pending_ppspm') {
        // Tab PPSPM: tampilkan pending_ppspm + incomplete_ppspm (penolakan dari KPPN)
        result = result.filter(sub => 
          sub.status === 'pending_ppspm' || 
          sub.status === 'incomplete_ppspm'
        );
      } else if (activeFilter === 'sent_kppn') {
        // Tab KPPN: tampilkan sent_kppn + incomplete_kppn (penolakan dari Arsip)
        result = result.filter(sub => 
          sub.status === 'sent_kppn' || 
          sub.status === 'incomplete_kppn'
        );
      } else {
        // Status lainnya (complete_arsip, dll)
        result = result.filter(sub => sub.status === activeFilter);
      }
    }
    
    return result;
  }, [roleFilteredSubmissions, activeFilter]);

  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage]);

  const totalPages = Math.ceil(filteredSubmissions.length / pageSize);

  const counts = useMemo(() => {
    // 🔧 Hitung berdasarkan roleFilteredSubmissions (sebelum filter status tab)
    // Ini memastikan counts menampilkan jumlah sebenarnya untuk setiap status, bukan hanya yang ter-filter
    const result: Record<string, number> = {
      all: 0,
      draft: 0,
      pending_bendahara: 0,
      pending_ppk: 0,
      pending_ppspm: 0,
      sent_kppn: 0,
      complete_arsip: 0,
      rejected: 0, // Untuk tab "Ditolak"
      spby: 0,     // Untuk tab "SPBy" - pending_bendahara + pembayaran UP
      incomplete_sm: 0,
      incomplete_bendahara: 0,
      incomplete_ppk: 0,
      incomplete_ppspm: 0,
      incomplete_kppn: 0,
    };
    
    // Hitung setiap status dari role-filtered data (BUKAN dari tab-filtered data)
    roleFilteredSubmissions.forEach(sub => {
      result.all++;
      
      // Count ke kategori rejected jika status incomplete_*
      if (sub.status.startsWith('incomplete_')) {
        result.rejected++;
      }
      
      if (sub.status in result) {
        result[sub.status]++;
      }
      
      // Count untuk SPBy: pending_bendahara dengan pembayaran UP
      if (sub.pembayaran === 'UP' && sub.status === 'pending_bendahara') {
        result.spby++;
      }
    });
    return result;
  }, [roleFilteredSubmissions]);

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

  // Get UP submissions for SPBy tab - only those awaiting bendahara (pending or incomplete)
  const upSubmissions = useMemo(() => {
    return submissions.filter(sub => 
      sub.pembayaran === 'UP' && 
      (sub.status === 'pending_bendahara' || sub.status === 'incomplete_bendahara')
    );
  }, [submissions]);

  // Dynamic filter config - add SPBy tab for Bendahara
  const dynamicFilterConfig = userRole === 'Bendahara'
    ? [...filterConfig, { value: 'spby', label: 'SPBy', icon: Package, color: 'text-cyan-500' }]
    : filterConfig;

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
                  Untuk melakukan pengajuan SPJ, Anda harus menggunakan akun dengan role <strong>Fungsi</strong> (Sosial, Neraca, Produksi, Distribusi, IPDS), <strong>Bendahara</strong>, atau <strong>Pejabat Pembuat Komitmen (PPK)</strong>. Silakan hubungi administrator jika Anda perlu mengubah role akun Anda.
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
            {dynamicFilterConfig.map((filter) => {
              const Icon = filter.icon;
              // 🆕 Hitung count dengan menambahkan incomplete_* yang sesuai dengan setiap tab
              let countValue = counts[filter.value] || 0;
              
              // Tambahkan incomplete_* ke tab yang sesuai dengan tugasnya
              if (filter.value === 'draft') {
                countValue = (counts['draft'] || 0) + (counts['incomplete_sm'] || 0);
              } else if (filter.value === 'pending_bendahara') {
                // Count pending_bendahara + incomplete_bendahara
                // Tapi EXCLUDE HANYA pending_bendahara dengan pembayaran UP (itu untuk SPBy tab)
                const totalPending = (counts['pending_bendahara'] || 0) + (counts['incomplete_bendahara'] || 0);
                countValue = totalPending - (counts['spby'] || 0);
              } else if (filter.value === 'pending_ppk') {
                countValue = (counts['pending_ppk'] || 0) + (counts['incomplete_ppk'] || 0);
              } else if (filter.value === 'pending_ppspm') {
                countValue = (counts['pending_ppspm'] || 0) + (counts['incomplete_ppspm'] || 0);
              } else if (filter.value === 'sent_kppn') {
                countValue = (counts['sent_kppn'] || 0) + (counts['incomplete_kppn'] || 0);
              } else if (filter.value === 'spby') {
                countValue = counts['spby'] || 0;
              }

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

      {/* SPBy GROUPING - Only for Bendahara */}
      {userRole === 'Bendahara' && activeFilter === 'spby' && (
        <div className="flex justify-center">
          <div className="w-full">
            <SPByGrouping
              upSubmissions={upSubmissions}
              onUpdateSubmissions={(ids, updates) => {
                setSubmissions(prev => prev.map(sub => 
                  ids.includes(sub.id) ? { ...sub, ...updates } : sub
                ));
              }}
              onRefresh={refetch}
            />
          </div>
        </div>
      )}

      {/* DAFTAR PENGAJUAN CARD */}
      {(userRole !== 'Bendahara' || activeFilter !== 'spby') && (
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
      )}

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