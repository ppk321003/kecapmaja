import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatNumber, roundToThousands, formatDateIndonesia } from '@/utils/bahanrevisi-calculations';
import { FileEdit, Check, ArrowUpDown, Search, Edit2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BahanRevisiFilters } from '@/types/bahanrevisi';
import { useAuth } from '@/contexts/AuthContext';
import RPDInputDialog from './RPDInputDialog';

interface RPDItem {
  id: string;
  program_pembebanan?: string;
  kegiatan?: string;
  rincian_output?: string;
  komponen_output?: string;
  sub_komponen?: string;
  akun?: string;
  uraian: string;
  total_pagu: number; // Total Pagu
  jan?: number;
  feb?: number;
  mar?: number;
  apr?: number;
  may?: number;
  jun?: number;
  jul?: number;
  aug?: number;
  sep?: number;
  oct?: number;
  nov?: number;
  dec?: number;
  januari?: number;
  februari?: number;
  maret?: number;
  april?: number;
  mei?: number;
  juni?: number;
  juli?: number;
  agustus?: number;
  september?: number;
  oktober?: number;
  november?: number;
  desember?: number;
  total_rpd?: number; // Total RPD
  sisa_anggaran?: number; // Sisa Anggaran
  status?: string;
  blokir?: number; // Pagu yang tidak dapat ditarik
}

interface RPDTableProps {
  filters: BahanRevisiFilters;
  items: RPDItem[];
  loading?: boolean;
  budgetItems?: any[];
  hideZeroPagu?: boolean;
  onUpdateItem?: (id: string, updates: Partial<RPDItem>) => Promise<void>;
}

const RPDTable: React.FC<RPDTableProps> = ({ 
  filters, 
  items, 
  loading = false,
  budgetItems = [],
  hideZeroPagu = true,
  onUpdateItem 
}) => {
  // Safety check: ensure items is always an array
  let safeItems: RPDItem[] = [];
  try {
    if (Array.isArray(items) && items.length > 0) {
      safeItems = items.filter(item => item && typeof item === 'object' && item.id);
    } else if (!Array.isArray(items)) {
      console.warn('[RPDTable] items prop is not an array:', typeof items, items);
    }
  } catch (e) {
    console.error('[RPDTable] Error processing items:', e, items);
  }

  const { user } = useAuth();
  // Role-based access: PPK dan Fungsi xxxx can edit, others read-only
  const canEditRPD = user?.role === 'Pejabat Pembuat Komitmen' || user?.role === 'Fungsi xxxx';
  const isReadOnly = !canEditRPD;

  const [rpdDialogOpen, setRpdDialogOpen] = useState(false);
  const [selectedRPDItem, setSelectedRPDItem] = useState<RPDItem | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const pagu = useMemo(() => {
    try {
      if (!Array.isArray(safeItems)) return 0;
      return safeItems.reduce((sum, item) => {
        try {
          return sum + (Number(item?.total_pagu) || 0);
        } catch {
          return sum;
        }
      }, 0);
    } catch (e) {
      console.error('[RPDTable] Error calculating pagu:', e);
      return 0;
    }
  }, [safeItems]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredItems = useMemo(() => {
    try {
      if (!Array.isArray(safeItems)) {
        console.warn('[RPDTable] safeItems is not an array:', typeof safeItems);
        return [];
      }
      
      return safeItems.filter(item => {
        try {
          // Defensive checks for item structure
          if (!item || typeof item !== 'object') {
            console.warn('[RPDTable] Filtering invalid item:', item);
            return false;
          }
          
          // Apply drill-down filters
          if (filters.program_pembebanan && String(item.program_pembebanan || '').trim() !== String(filters.program_pembebanan).trim()) {
            return false;
          }
          if (filters.kegiatan && String(item.kegiatan || '').trim() !== String(filters.kegiatan).trim()) {
            return false;
          }
          if (filters.komponen_output && String(item.komponen_output || '').trim() !== String(filters.komponen_output).trim()) {
            return false;
          }
          if (filters.sub_komponen && String(item.sub_komponen || '').trim() !== String(filters.sub_komponen).trim()) {
            return false;
          }
          if (filters.rincian_output && String(item.rincian_output || '').trim() !== String(filters.rincian_output).trim()) {
            return false;
          }
          if (filters.akun && String(item.akun || '').trim() !== String(filters.akun).trim()) {
            return false;
          }
          
          const searchLower = searchTerm.toLowerCase();
          const uraian = String(item.uraian || '');
          const matchesSearch = !searchTerm || uraian.toLowerCase().includes(searchLower);
          
          if (hideZeroPagu) {
            return matchesSearch && (Number(item.total_pagu) || 0) !== 0;
          }
          
          return matchesSearch;
        } catch (e) {
          console.error('[RPDTable] Error filtering item:', e, item);
          return false;
        }
      });
    } catch (e) {
      console.error('[RPDTable] Error in filteredItems:', e);
      return [];
    }
  }, [safeItems, searchTerm, hideZeroPagu, filters]);

  const sortedItems = useMemo(() => {
    try {
      return [...filteredItems].sort((a, b) => {
        try {
          if (!a || typeof a !== 'object' || !b || typeof b !== 'object') {
            return 0;
          }
          
          if (!sortField) return 0;
          
          let fieldA: any, fieldB: any;
          
          const monthFields: {[key: string]: string} = {
            'jan': 'januari',
            'feb': 'februari',
            'mar': 'maret',
            'apr': 'april',
            'mei': 'mei',
            'jun': 'juni',
            'jul': 'juli',
            'aug': 'agustus',
            'sep': 'september',
            'oct': 'oktober',
            'nov': 'november',
            'dec': 'desember',
          };
          
          if (monthFields[sortField]) {
            const monthField = monthFields[sortField];
            fieldA = a[monthField as keyof RPDItem] || 0;
            fieldB = b[monthField as keyof RPDItem] || 0;
          } else if (sortField === 'total_rpd') {
            fieldA = a.total_rpd || 0;
            fieldB = b.total_rpd || 0;
          } else if (sortField === 'total_pagu') {
            fieldA = a.total_pagu || 0;
            fieldB = b.total_pagu || 0;
          } else if (sortField === 'selisih') {
            fieldA = a.sisa_anggaran || 0;
            fieldB = b.sisa_anggaran || 0;
          } else if (sortField === 'uraian') {
            fieldA = a.uraian;
            fieldB = b.uraian;
          } else {
            fieldA = a[sortField as keyof RPDItem];
            fieldB = b[sortField as keyof RPDItem];
          }
          
          if (fieldA === undefined || fieldB === undefined) return 0;
          
          if (typeof fieldA === 'string' && typeof fieldB === 'string') {
            return sortDirection === 'asc' 
              ? fieldA.localeCompare(fieldB) 
              : fieldB.localeCompare(fieldA);
          }
          
          if (typeof fieldA === 'number' && typeof fieldB === 'number') {
            return sortDirection === 'asc' 
              ? fieldA - fieldB 
              : fieldB - fieldA;
          }
          
          return 0;
        } catch (e) {
          console.error('[RPDTable] Error sorting items:', e);
          return 0;
        }
      });
    } catch (e) {
      console.error('[RPDTable] Error in sortedItems:', e);
      return filteredItems;
    }
  }, [filteredItems, sortField, sortDirection]);

  const totalByMonth = useMemo(() => {
    try {
      if (!Array.isArray(safeItems)) return {
        jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0,
        jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0
      };
      
      return {
        jan: safeItems.reduce((sum, item) => sum + (Number(item?.januari) || 0), 0),
        feb: safeItems.reduce((sum, item) => sum + (Number(item?.februari) || 0), 0),
        mar: safeItems.reduce((sum, item) => sum + (Number(item?.maret) || 0), 0),
        apr: safeItems.reduce((sum, item) => sum + (Number(item?.april) || 0), 0),
        mei: safeItems.reduce((sum, item) => sum + (Number(item?.mei) || 0), 0),
        jun: safeItems.reduce((sum, item) => sum + (Number(item?.juni) || 0), 0),
        jul: safeItems.reduce((sum, item) => sum + (Number(item?.juli) || 0), 0),
        aug: safeItems.reduce((sum, item) => sum + (Number(item?.agustus) || 0), 0),
        sep: safeItems.reduce((sum, item) => sum + (Number(item?.september) || 0), 0),
        oct: safeItems.reduce((sum, item) => sum + (Number(item?.oktober) || 0), 0),
        nov: safeItems.reduce((sum, item) => sum + (Number(item?.november) || 0), 0),
        dec: safeItems.reduce((sum, item) => sum + (Number(item?.desember) || 0), 0)
      };
    } catch (e) {
      console.error('[RPDTable] Error in totalByMonth:', e);
      return {
        jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0,
        jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0
      };
    }
  }, [safeItems]);

  const grandTotal = useMemo(() => {
    try {
      if (!Array.isArray(safeItems)) return 0;
      return safeItems.reduce((sum, item) => {
        try {
          return sum + (Number(item?.total_rpd) || 0);
        } catch {
          return sum;
        }
      }, 0);
    } catch (e) {
      console.error('[RPDTable] Error calculating grandTotal:', e);
      return 0;
    }
  }, [safeItems]);

  const sisaPagu = useMemo(() => {
    try {
      return Number(pagu || 0) - Number(grandTotal || 0);
    } catch (e) {
      console.error('[RPDTable] Error calculating sisaPagu:', e);
      return 0;
    }
  }, [pagu, grandTotal]);

  const paginatedItems = pageSize === -1 
    ? sortedItems 
    : sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  const totalPages = pageSize === -1 ? 1 : Math.ceil(sortedItems.length / pageSize);

  const getStatusClass = (item: RPDItem): string => {
    try {
      if (!item || typeof item !== 'object') return 'status-sisa';
      const rpd = Number(item?.total_rpd) || 0;
      const pagu = Number(item?.total_pagu) || 0;
      
      if (rpd === pagu) {
        return 'status-ok';
      } else {
        return 'status-sisa';
      }
    } catch (e) {
      console.error('[RPDTable] Error in getStatusClass:', e);
      return 'status-sisa';
    }
  };

  const getStatusText = (item: RPDItem): string => {
    try {
      if (!item || typeof item !== 'object') return '-';
      const rpd = Number(item?.total_rpd) || 0;
      const pagu = Number(item?.total_pagu) || 0;
      
      if (rpd === pagu) {
        return 'OK';
      } else {
        return 'Sisa';
      }
    } catch (e) {
      console.error('[RPDTable] Error in getStatusText:', e);
      return '-';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading RPD data...</div>;
  }

  return (
    <div className="space-y-4">
      <style>{`
        .rpd-table-container {
          overflow-x: auto;
          width: 100%;
        }
        
        .rpd-table th, .rpd-table td {
          padding: 4px 6px;
          font-size: 0.75rem;
          white-space: nowrap;
        }
        
        .rpd-table th {
          background-color: #f1f5f9;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 5;
          white-space: nowrap;
          padding: 8px 4px;
        }
        
        .rpd-table th button {
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        .rpd-table .fixed-column {
          position: sticky;
          left: 0;
          background-color: #fff;
          z-index: 3;
          border-right: 1px solid #e2e8f0;
        }
        
        .rpd-table tr:nth-child(even) .fixed-column {
          background-color: #f8fafc;
        }
        
        .rpd-table th.fixed-column {
          z-index: 8;
          background-color: #f1f5f9;
        }
        
        .rpd-table .month-cell {
          min-width: 100px;
          width: 100px;
          max-width: 100px;
          text-align: right;
        }
        
        .rpd-table .description-cell {
          text-align: left;
          min-width: 100px;
          max-width: 100px;
          word-break: break-word;
        }
        
        .rpd-table .total-cell {
          font-weight: 600;
          text-align: right;
          min-width: 120px;
          width: 120px;
          max-width: 120px;
        }

        .rpd-table .pagu-cell {
          font-weight: 600;
          text-align: right;
          min-width: 120px;
          width: 120px;
          max-width: 120px;
        }
        .rpd-table .blokir-cell {
          font-weight: 600;
          text-align: right;
          min-width: 120px;
          width: 120px;
          max-width: 120px;
        }
        .rpd-table .selisih-cell {
          font-weight: 600;
          text-align: right;
          min-width: 120px;
          width: 120px;
          max-width: 120px;
        }
        
        .rpd-table .action-cell {
          width: 70px;
          max-width: 70px;
        }

        .rpd-table .status-cell {
          width: 50px;
          max-width: 50px;
          text-align: center;
        }

        .status-ok {
          color: green;
          font-weight: 600;
        }

        .status-sisa {
          color: red;
          font-weight: 600;
        }
        
        .rpd-table .input-cell input {
          width: 75px;
          text-align: right;
        }
        
        .rpd-table .header-row th {
          border-bottom: 2px solid #cbd5e1;
        }
        
        .rpd-table .belum-isi {
          background-color: #fee2e2;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2 top-2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Cari rencana penarikan dana..."
              className="pl-8 w-full h-8 text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs">Tampilkan:</span>
          <Select 
            value={String(pageSize)} 
            onValueChange={(value) => {
              setPageSize(parseInt(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-20 text-xs">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="-1">Semua</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="text-xs text-gray-500">
        Menampilkan {paginatedItems.length} dari {filteredItems.length} item
        {searchTerm && ` (filter: "${searchTerm}")`}
      </div>
      
      <div className="rounded-md border border-gray-200 overflow-hidden">
        <div className="rpd-table-container">
          <table className="w-full rpd-table">
            <thead>
              <tr className="header-row">
                <th className="text-center fixed-column" style={{left: '0px', width: '30px'}}>No</th>
                <th className="status-cell fixed-column" style={{left: '30px'}}>Status</th>
                <th className="description-cell fixed-column" style={{left: '80px'}}>
                  <button className="flex items-center" onClick={() => handleSort('uraian')}>
                    Uraian
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </button>
                </th>
                <th className="pagu-cell fixed-column" style={{left: '380px'}}>
                  <button className="flex items-center justify-end w-full" onClick={() => handleSort('total_pagu')}>
                    Total Pagu
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </button>
                </th>
                <th className="blokir-cell fixed-column" style={{left: '500px'}}>
                  <button className="flex items-center justify-end w-full" onClick={() => handleSort('blokir')}>
                    Blokir
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </button>
                </th>
                <th className="total-cell fixed-column" style={{left: '620px'}}>
                  <button className="flex items-center justify-end w-full" onClick={() => handleSort('total_rpd')}>
                    Total RPD
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </button>
                </th>
                <th className="selisih-cell fixed-column" style={{left: '740px'}}>
                  <button className="flex items-center justify-end w-full" onClick={() => handleSort('selisih')}>
                    Selisih
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </button>
                </th>
                <th className="action-cell">Aksi</th>
              </tr>
            </thead>
            
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-4 text-center text-slate-500 text-xs">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  try {
                    if (!item || typeof item !== 'object' || !item.id) {
                      console.warn('[RPDTable] Invalid item at index', index, ':', item);
                      return null;
                    }
                    
                    return (
                      <tr key={item.id} className={`${index % 2 === 0 ? 'bg-slate-50' : ''} h-9`}>
                        <td className="text-center fixed-column" style={{left: '0px'}}>
                          {String((currentPage - 1) * (pageSize === -1 ? 0 : pageSize) + index + 1)}
                        </td>
                        <td className="status-cell fixed-column" style={{left: '30px'}}>
                          <span className={getStatusClass(item)}>{String(getStatusText(item))}</span>
                        </td>
                        <td className="description-cell fixed-column" style={{left: '80px'}} title={String(item.uraian || '')}>
                          <span className="line-clamp-2">{String(item.uraian || '')}</span>
                        </td>
                        <td className="pagu-cell fixed-column" style={{left: '380px'}}>
                          {formatNumber(Number(item.total_pagu) || 0)}
                        </td>
                        <td className="blokir-cell fixed-column" style={{left: '500px'}}>
                          {formatNumber(Number(item.blokir) || 0)}
                        </td>
                        <td className="total-cell fixed-column" style={{left: '620px'}}>
                          {formatNumber(Number(item.total_rpd) || 0)}
                        </td>
                        <td className="selisih-cell fixed-column" style={{left: '740px'}}>
                          <span className={(Number(item.sisa_anggaran) || 0) !== 0 ? 'text-red-500' : 'text-green-500'}>
                            {formatNumber(Number(item.sisa_anggaran) || 0)}
                          </span>
                        </td>
                        <td className="action-cell">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedRPDItem(item);
                              setRpdDialogOpen(true);
                            }}
                            disabled={isReadOnly}
                            className="h-7 w-7 p-0"
                            title={isReadOnly ? "Anda tidak memiliki akses untuk mengubah RPD" : "Edit Rencana Penarikan Dana"}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  } catch (e) {
                    console.error('[RPDTable] Error rendering item at index', index, ':', e, item);
                    return null;
                  }
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {pageSize !== -1 && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="text-xs"
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="text-xs"
          >
            Prev
          </Button>
          <span className="text-xs">
            Halaman {currentPage} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="text-xs"
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="text-xs"
          >
            Last
          </Button>
        </div>
      )}

      {/* RPD Input Dialog */}
      {selectedRPDItem && (
        <RPDInputDialog
          open={rpdDialogOpen}
          onOpenChange={setRpdDialogOpen}
          itemId={selectedRPDItem.id}
          itemUraian={selectedRPDItem.uraian}
          totalPagu={selectedRPDItem.total_pagu}
          initialData={{
            jan: selectedRPDItem.jan,
            feb: selectedRPDItem.feb,
            mar: selectedRPDItem.mar,
            apr: selectedRPDItem.apr,
            mei: selectedRPDItem.mei,
            jun: selectedRPDItem.jun,
            jul: selectedRPDItem.jul,
            aug: selectedRPDItem.aug,
            sep: selectedRPDItem.sep,
            oct: selectedRPDItem.oct,
            nov: selectedRPDItem.nov,
            dec: selectedRPDItem.dec,
          }}
          readOnly={isReadOnly}
          blokir={selectedRPDItem.blokir || 0}
          onSave={async (data) => {
            if (onUpdateItem && selectedRPDItem) {
              const updates: {[key: string]: number} = {
                jan: data.jan || 0,
                feb: data.feb || 0,
                mar: data.mar || 0,
                apr: data.apr || 0,
                mei: data.mei || 0,
                jun: data.jun || 0,
                jul: data.jul || 0,
                aug: data.aug || 0,
                sep: data.sep || 0,
                oct: data.oct || 0,
                nov: data.nov || 0,
                dec: data.dec || 0,
              };
              await onUpdateItem(selectedRPDItem.id, updates);
            }
          }}
        />
      )}
    </div>
  );
};

export default RPDTable;
