import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, roundToThousands } from '@/utils/bahanrevisi-calculations';
import { FileEdit, Check, ArrowUpDown, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BahanRevisiFilters } from '@/types/bahanrevisi';
import { useAuth } from '@/contexts/AuthContext';

interface RPDItem {
  id: string;
  uraian: string;
  jumlah_menjadi: number; // Total Pagu
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
  jumlah_rpd?: number; // Total RPD
  selisih?: number; // Sisa Anggaran
}

interface RPDTableProps {
  filters: BahanRevisiFilters;
  items: RPDItem[];
  loading?: boolean;
  onUpdateItem?: (id: string, updates: Partial<RPDItem>) => Promise<void>;
}

const RPDTable: React.FC<RPDTableProps> = ({ 
  filters, 
  items, 
  loading = false,
  onUpdateItem 
}) => {
  const { user } = useAuth();
  const canEdit = user?.role !== 'Pejabat Pembuat Komitmen'; // User roles can edit, PPK cannot

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{[key: string]: {[key: string]: number}}>({});
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hideZeroBudget, setHideZeroBudget] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const pagu = useMemo(() => items.reduce((sum, item) => sum + (Number(item.jumlah_menjadi) || 0), 0), [items]);

  const handleEditChange = (id: string, field: string, value: string | number) => {
    let numValue: number;
    
    if (typeof value === 'string') {
      const cleanValue = value.replace(/[^0-9.]/g, '');
      numValue = parseFloat(cleanValue) || 0;
    } else {
      numValue = Number(value) || 0;
    }
    
    if (numValue < 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Nilai tidak boleh negatif'
      });
      return;
    }
    
    setEditValues(prev => {
      const itemValues = prev[id] || {};
      const fieldMap: {[key: string]: string} = {
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
      
      const apiField = fieldMap[field] || field;
      
      return {
        ...prev,
        [id]: {
          ...itemValues,
          [apiField]: Number(numValue)
        }
      };
    });
  };

  const startEditing = (item: RPDItem) => {
    if (!canEdit) {
      toast({
        variant: 'destructive',
        title: 'Akses Ditolak',
        description: 'Hanya user yang dapat mengedit RPD.'
      });
      return;
    }

    setEditingId(item.id);
    const monthValues = {
      januari: Number(item.januari) || 0,
      februari: Number(item.februari) || 0,
      maret: Number(item.maret) || 0,
      april: Number(item.april) || 0,
      mei: Number(item.mei) || 0,
      juni: Number(item.juni) || 0,
      juli: Number(item.juli) || 0,
      agustus: Number(item.agustus) || 0,
      september: Number(item.september) || 0,
      oktober: Number(item.oktober) || 0,
      november: Number(item.november) || 0,
      desember: Number(item.desember) || 0
    };
    
    setEditValues(prev => ({
      ...prev,
      [item.id]: monthValues
    }));
  };

  const saveEditing = async (id: string) => {
    if (editingId && editValues[editingId] && onUpdateItem) {
      const updates = editValues[editingId];
      await onUpdateItem(id, updates);
      setEditingId(null);
      toast({
        title: 'Berhasil',
        description: 'Perubahan RPD berhasil disimpan'
      });
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || item.uraian.toLowerCase().includes(searchLower);
      
      if (hideZeroBudget) {
        return matchesSearch && (item.jumlah_menjadi || 0) !== 0;
      }
      
      return matchesSearch;
    });
  }, [items, searchTerm, hideZeroBudget]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
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
        fieldA = a.jumlah_rpd || 0;
        fieldB = b.jumlah_rpd || 0;
      } else if (sortField === 'total_pagu') {
        fieldA = a.jumlah_menjadi || 0;
        fieldB = b.jumlah_menjadi || 0;
      } else if (sortField === 'selisih') {
        fieldA = a.selisih || 0;
        fieldB = b.selisih || 0;
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
    });
  }, [filteredItems, sortField, sortDirection]);

  const totalByMonth = useMemo(() => {
    return {
      jan: items.reduce((sum, item) => sum + (Number(item.januari) || 0), 0),
      feb: items.reduce((sum, item) => sum + (Number(item.februari) || 0), 0),
      mar: items.reduce((sum, item) => sum + (Number(item.maret) || 0), 0),
      apr: items.reduce((sum, item) => sum + (Number(item.april) || 0), 0),
      mei: items.reduce((sum, item) => sum + (Number(item.mei) || 0), 0),
      jun: items.reduce((sum, item) => sum + (Number(item.juni) || 0), 0),
      jul: items.reduce((sum, item) => sum + (Number(item.juli) || 0), 0),
      aug: items.reduce((sum, item) => sum + (Number(item.agustus) || 0), 0),
      sep: items.reduce((sum, item) => sum + (Number(item.september) || 0), 0),
      oct: items.reduce((sum, item) => sum + (Number(item.oktober) || 0), 0),
      nov: items.reduce((sum, item) => sum + (Number(item.november) || 0), 0),
      dec: items.reduce((sum, item) => sum + (Number(item.desember) || 0), 0)
    };
  }, [items]);

  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.jumlah_rpd) || 0), 0);
  }, [items]);

  const sisaPagu = useMemo(() => {
    return Number(pagu) - Number(grandTotal);
  }, [pagu, grandTotal]);

  const paginatedItems = pageSize === -1 
    ? sortedItems 
    : sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  const totalPages = pageSize === -1 ? 1 : Math.ceil(sortedItems.length / pageSize);

  const getStatusClass = (item: RPDItem): string => {
    const rpd = Number(item.jumlah_rpd) || 0;
    const pagu = Number(item.jumlah_menjadi) || 0;
    
    if (rpd === pagu) {
      return 'status-ok';
    } else {
      return 'status-sisa';
    }
  };

  const getStatusText = (item: RPDItem): string => {
    const rpd = Number(item.jumlah_rpd) || 0;
    const pagu = Number(item.jumlah_menjadi) || 0;
    
    if (rpd === pagu) {
      return 'OK';
    } else {
      return 'Sisa';
    }
  };

  const renderMonthValue = (item: RPDItem, month: string, field: string) => {
    const isEditing = editingId === item.id;
    
    const monthMap: {[key: string]: keyof RPDItem} = {
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
    
    const monthKey = monthMap[field];
    if (!monthKey) return <span>-</span>;
    
    const value = Number(item[monthKey]) || 0;
    const editValue = isEditing && editValues[item.id] 
      ? Number(editValues[item.id][monthKey as string]) || 0
      : value;
    
    return isEditing ? (
      <Input 
        type="number"
        value={editValue.toString()} 
        onChange={(e) => handleEditChange(item.id, field, e.target.value)}
        className="w-full text-right px-2 py-1 h-7"
        min="0"
      />
    ) : (
      <span className="text-right block w-full">{formatCurrency(value, false)}</span>
    );
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
          z-index: 10;
        }
        
        .rpd-table .fixed-column {
          position: sticky;
          left: 0;
          background-color: #fff;
          z-index: 5;
          border-right: 1px solid #e2e8f0;
        }
        
        .rpd-table tr:nth-child(even) .fixed-column {
          background-color: #f8fafc;
        }
        
        .rpd-table th.fixed-column {
          z-index: 15;
          background-color: #f1f5f9;
        }
        
        .rpd-table .month-cell {
          min-width: 80px;
          width: 80px;
          max-width: 80px;
          text-align: right;
        }
        
        .rpd-table .description-cell {
          text-align: left;
          min-width: 300px;
          max-width: 300px;
          word-break: break-word;
        }
        
        .rpd-table .total-cell {
          font-weight: 600;
          text-align: right;
          min-width: 100px;
          width: 100px;
          max-width: 100px;
        }

        .rpd-table .pagu-cell {
          font-weight: 600;
          text-align: right;
          min-width: 100px;
          width: 100px;
          max-width: 100px;
        }

        .rpd-table .selisih-cell {
          font-weight: 600;
          text-align: right;
          min-width: 100px;
          width: 100px;
          max-width: 100px;
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
        
        .rpd-table .footer-row td {
          font-weight: 600;
          border-top: 2px solid #cbd5e1;
          background-color: #f8fafc;
          text-align: right;
        }
        
        .rpd-table .footer-row td.fixed-column {
          z-index: 8;
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
          
          <div className="filter-checkbox-container flex items-center gap-2">
            <Checkbox 
              id="hideZeroBudget"
              checked={hideZeroBudget}
              onCheckedChange={(checked) => {
                setHideZeroBudget(checked === true);
                setCurrentPage(1);
              }}
              className="filter-checkbox"
            />
            <label htmlFor="hideZeroBudget" className="filter-checkbox-label text-xs">
              Sembunyikan pagu 0
            </label>
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
                <th className="total-cell fixed-column" style={{left: '480px'}}>
                  <button className="flex items-center justify-end w-full" onClick={() => handleSort('total_rpd')}>
                    Total RPD
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </button>
                </th>
                <th className="selisih-cell fixed-column" style={{left: '580px'}}>
                  <button className="flex items-center justify-end w-full" onClick={() => handleSort('selisih')}>
                    Selisih
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  </button>
                </th>
                {['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].map(month => (
                  <th key={month} className="month-cell">
                    <button className="flex items-center justify-end w-full" onClick={() => handleSort(month)}>
                      {month.charAt(0).toUpperCase() + month.slice(1)}
                      <ArrowUpDown className="h-3 w-3 ml-1" />
                    </button>
                  </th>
                ))}
                <th className="action-cell"></th>
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
                paginatedItems.map((item, index) => (
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
                      {formatCurrency(Number(item.jumlah_menjadi) || 0)}
                    </td>
                    <td className="total-cell fixed-column" style={{left: '480px'}}>
                      {formatCurrency(Number(item.jumlah_rpd) || 0)}
                    </td>
                    <td className="selisih-cell fixed-column" style={{left: '580px'}}>
                      <span className={(Number(item.selisih) || 0) !== 0 ? 'text-red-500' : 'text-green-500'}>
                        {formatCurrency(Number(item.selisih) || 0)}
                      </span>
                    </td>
                    {['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].map(month => (
                      <td key={month} className="month-cell">
                        {renderMonthValue(item, month, month)}
                      </td>
                    ))}
                    <td className="action-cell">
                      {canEdit && (
                        <div className="flex space-x-1 justify-center">
                          {editingId === item.id ? (
                            <Button variant="ghost" size="icon" onClick={() => saveEditing(item.id)} className="h-6 w-6">
                              <Check className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => startEditing(item)} 
                              className="h-6 w-6"
                              title="Edit"
                            >
                              <FileEdit className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="footer-row">
                <td className="fixed-column" style={{left: '0px'}}></td>
                <td className="fixed-column" style={{left: '30px'}}></td>
                <td className="fixed-column text-right" style={{left: '80px'}}>Total per Bulan</td>
                <td className="pagu-cell fixed-column" style={{left: '380px'}}>{formatCurrency(pagu)}</td>
                <td className="total-cell fixed-column" style={{left: '480px'}}>{formatCurrency(grandTotal)}</td>
                <td className={`selisih-cell fixed-column ${sisaPagu !== 0 ? 'text-red-600' : 'text-green-600'}`} style={{left: '580px'}}>
                  {formatCurrency(sisaPagu)}
                </td>
                <td className="month-cell">{formatCurrency(totalByMonth.jan, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.feb, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.mar, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.apr, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.mei, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.jun, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.jul, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.aug, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.sep, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.oct, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.nov, false)}</td>
                <td className="month-cell">{formatCurrency(totalByMonth.dec, false)}</td>
                <td></td>
              </tr>
            </tfoot>
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
    </div>
  );
};

export default RPDTable;
