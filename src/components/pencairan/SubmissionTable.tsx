import { useState, useMemo } from 'react';
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
import { Submission, UserRole, canViewDetail, canEdit, getRelevantTimestamp } from '@/types/pencairan';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Edit,
  Calendar,
  Filter,
  FileText,
} from 'lucide-react';

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

const YEARS = [
  { value: 'all', label: 'Semua Tahun' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
  { value: '2030', label: '2030' },
];

const ITEMS_PER_PAGE = 10;

export function SubmissionTable({ submissions, onView, onEdit, userRole }: SubmissionTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return sortedSubmissions.filter((sub) => {
      const matchesSearch =
        sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.submitterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.jenisBelanja.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMonth =
        selectedMonth === 'all' ||
        sub.submittedAt.getMonth() === parseInt(selectedMonth);

      const matchesYear =
        selectedYear === 'all' ||
        sub.submittedAt.getFullYear() === parseInt(selectedYear);

      return matchesSearch && matchesMonth && matchesYear;
    });
  }, [sortedSubmissions, searchQuery, selectedMonth, selectedYear]);

  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubmissions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSubmissions, currentPage]);

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const getDocumentProgress = (submission: Submission) => {
    const checked = submission.documents.filter(d => d.isChecked).length;
    const total = submission.documents.length;
    return { checked, total, percentage: total > 0 ? Math.round((checked / total) * 100) : 0 };
  };

  const showViewButton = (submission: Submission) => {
    return canViewDetail(userRole, submission.status);
  };

  const showEditButton = (submission: Submission) => {
    return canEdit(userRole, submission.status);
  };

  return (
    <div className="space-y-4">
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

      <div className="rounded-xl border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Judul Pengajuan</TableHead>
              <TableHead>Pengaju</TableHead>
              <TableHead>Jenis Belanja</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead className="w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSubmissions.length > 0 ? (
              paginatedSubmissions.map((submission) => {
                const relevantTime = getRelevantTimestamp(submission);
                return (
                  <TableRow key={submission.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {submission.id}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm max-w-[200px] truncate">
                        {submission.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {submission.submitterName}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {submission.jenisBelanja}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={submission.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {submission.updatedAt || submission.waktuPengajuan || 
                        format(submission.submittedAt, 'HH:mm - dd/MM/yyyy', { locale: localeId })
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
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
