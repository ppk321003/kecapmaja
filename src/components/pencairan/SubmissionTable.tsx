import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from './StatusBadge';
import { Submission, UserRole, canViewDetail, canEdit } from '@/types/pencairan';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Edit,
  Calendar,
  Filter,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

type SortField = 'id' | 'title' | 'submitterName' | 'jenisBelanja' | 'status' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

interface SubmissionTableProps {
  submissions: Submission[];
  onView: (submission: Submission) => void;
  onEdit: (submission: Submission) => void;
  userRole: UserRole;
}

const MONTHS = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '0', label: 'Januari' },
  { value: '1', label: 'Februari' },
  { value: '2', label: 'Maret' },
  { value: '3', label: 'April' },
  { value: '4', label: 'Mei' },
  { value: '5', label: 'Juni' },
  { value: '6', label: 'Juli' },
  { value: '7', label: 'Agustus' },
  { value: '8', label: 'September' },
  { value: '9', label: 'Oktober' },
  { value: '10', label: 'November' },
  { value: '11', label: 'Desember' },
];

const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [{ value: 'all', label: 'Semua Tahun' }];
  
  for (let i = -2; i <= 3; i++) {
    const year = currentYear + i;
    years.push({ value: year.toString(), label: year.toString() });
  }
  
  return years;
};

const YEARS = generateYears();
const ITEMS_PER_PAGE = 10;

// Helper function to get submission timestamp - showing column P (Update Terakhir) only
const getSubmissionTimestamp = (submission: Submission): string => {
  // Show updatedAtString (original string from column P) directly
  if (submission.updatedAtString && submission.updatedAtString.trim() !== '') {
    return submission.updatedAtString;
  }
  
  // If column P is empty, show dash
  return '-';
};

export function SubmissionTable({ submissions, onView, onEdit, userRole }: SubmissionTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Reset filters when submissions prop changes (e.g., when switching tabs in parent)
  // This prevents "ghost data" from previous tabs bleeding into current tab
  useEffect(() => {
    setSearchQuery('');
    setSelectedMonth('all');
    setSelectedYear('all');
    setCurrentPage(1);
  }, [submissions]);


  // Helper function to get timestamp for sorting
  const getTimestampForSorting = (sub: Submission): number => {
    // Try to parse from updatedAtString first (column P)
    if (sub.updatedAtString && sub.updatedAtString.trim() !== '') {
      try {
        const [timePart, datePart] = sub.updatedAtString.split(' - ');
        if (timePart && datePart) {
          const [hours, minutes] = timePart.split(':').map(Number);
          const [day, month, year] = datePart.split('/').map(Number);
          const fullYear = year < 100 ? 2000 + year : year;
          return new Date(fullYear, month - 1, day, hours, minutes).getTime();
        }
      } catch (error) {
        console.warn('Failed to parse updatedAtString for sorting:', sub.updatedAtString, error);
      }
    }
    
    // Fallback to submittedAt
    if (sub.submittedAt && sub.submittedAt instanceof Date && !isNaN(sub.submittedAt.getTime())) {
      return sub.submittedAt.getTime();
    }
    
    // Last resort
    return Date.now();
  };

  // Helper to get numeric ID for sorting
  const getNumericId = (id: string): number => {
    const match = id.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Sorting function with multiple columns support
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'id':
          comparison = getNumericId(a.id) - getNumericId(b.id);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, 'id');
          break;
        case 'submitterName':
          comparison = a.submitterName.localeCompare(b.submitterName, 'id');
          break;
        case 'jenisBelanja':
          comparison = a.jenisBelanja.localeCompare(b.jenisBelanja, 'id');
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'updatedAt':
          comparison = getTimestampForSorting(a) - getTimestampForSorting(b);
          break;
        default:
          comparison = getNumericId(a.id) - getNumericId(b.id);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [submissions, sortField, sortDirection]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return sortedSubmissions.filter((sub) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.submitterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.jenisBelanja.toLowerCase().includes(searchQuery.toLowerCase());

      // Month filter - use timestamp from getSubmissionTimestamp
      let matchesMonth = true;
      if (selectedMonth !== 'all') {
        const monthToFilter = parseInt(selectedMonth);
        const timestamp = getSubmissionTimestamp(sub);
        
        if (timestamp && timestamp !== '-') {
          try {
            const [_, datePart] = timestamp.split(' - ');
            if (datePart) {
              const [day, month, year] = datePart.split('/').map(Number);
              const dateMonth = month - 1; // JavaScript months are 0-indexed
              matchesMonth = dateMonth === monthToFilter;
            }
          } catch (error) {
            // If parsing fails, don't filter out
            console.warn('Failed to parse timestamp for month filter:', timestamp, error);
          }
        }
      }

      // Year filter - use timestamp from getSubmissionTimestamp
      let matchesYear = true;
      if (selectedYear !== 'all') {
        const yearToFilter = parseInt(selectedYear);
        const timestamp = getSubmissionTimestamp(sub);
        
        if (timestamp && timestamp !== '-') {
          try {
            const [_, datePart] = timestamp.split(' - ');
            if (datePart) {
              const [day, month, year] = datePart.split('/').map(Number);
              const fullYear = year < 100 ? 2000 + year : year;
              matchesYear = fullYear === yearToFilter;
            }
          } catch (error) {
            // If parsing fails, don't filter out
            console.warn('Failed to parse timestamp for year filter:', timestamp, error);
          }
        }
      }

      return matchesSearch && matchesMonth && matchesYear;
    });
  }, [sortedSubmissions, searchQuery, selectedMonth, selectedYear]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubmissions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSubmissions, currentPage]);

  const handleFilterChange = () => setCurrentPage(1);
  const showViewButton = (submission: Submission) => canViewDetail(userRole, submission.status);
  const showEditButton = (submission: Submission) => canEdit(userRole, submission.status);

  // Sort toggle handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" />
  };

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-xl border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          Filter:
        </div>
        
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari ID, judul, atau pengaju..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleFilterChange();
            }}
            className="pl-10 h-10 rounded-xl bg-secondary/50 border-transparent focus:border-primary/50 focus:bg-card"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select
            value={selectedMonth}
            onValueChange={(value) => {
              setSelectedMonth(value);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-[140px] h-10 rounded-xl">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select
          value={selectedYear}
          onValueChange={(value) => {
            setSelectedYear(value);
            handleFilterChange();
          }}
        >
          <SelectTrigger className="w-[120px] h-10 rounded-xl">
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((year) => (
              <SelectItem key={year.value} value={year.value}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>


      {/* Table Section */}
      <div className="rounded-xl border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">
                <button 
                  onClick={() => handleSort('id')}
                  className="flex items-center hover:text-primary transition-colors font-medium"
                >
                  ID
                  <SortIcon field="id" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  onClick={() => handleSort('title')}
                  className="flex items-center hover:text-primary transition-colors font-medium"
                >
                  Judul Pengajuan
                  <SortIcon field="title" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  onClick={() => handleSort('submitterName')}
                  className="flex items-center hover:text-primary transition-colors font-medium"
                >
                  Pengaju
                  <SortIcon field="submitterName" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  onClick={() => handleSort('jenisBelanja')}
                  className="flex items-center hover:text-primary transition-colors font-medium"
                >
                  Jenis Belanja
                  <SortIcon field="jenisBelanja" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  onClick={() => handleSort('status')}
                  className="flex items-center hover:text-primary transition-colors font-medium"
                >
                  Status
                  <SortIcon field="status" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  onClick={() => handleSort('updatedAt')}
                  className="flex items-center hover:text-primary transition-colors font-medium"
                >
                  Update Terakhir
                  <SortIcon field="updatedAt" />
                </button>
              </TableHead>
              <TableHead className="text-right w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSubmissions.length > 0 ? (
              paginatedSubmissions.map((submission) => {
                const timestamp = getSubmissionTimestamp(submission);
                
                return (
                  <TableRow key={submission.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {submission.id}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm max-w-[250px] whitespace-normal break-words">
                        {submission.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {submission.submitterName}
                    </TableCell>
                    <TableCell className="max-w-[140px]">
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary break-words">
                          {submission.jenisBelanja}
                        </span>
                        {submission.subJenisBelanja && (
                          <div className="text-xs text-muted-foreground break-words">
                            {submission.subJenisBelanja}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={submission.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground font-mono">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md inline-block whitespace-nowrap">
                        {timestamp}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {showViewButton(submission) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onView(submission)}
                            title="Lihat Detail"
                            className="rounded-lg hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {showEditButton(submission) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onEdit(submission)}
                            title="Edit Pengajuan"
                            className="rounded-lg hover:bg-primary/10 hover:text-primary"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mb-3 opacity-50" />
                    <p className="font-medium">Tidak ada data pengajuan yang sesuai dengan filter</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Section */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredSubmissions.length)} dari {filteredSubmissions.length} pengajuan
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    size="sm"
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    className="rounded-lg w-8 h-8 p-0"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}