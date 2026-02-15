/**
 * Bahan Revisi Anggaran - Main Component
 * Integra 3 tabs: Anggaran (Budget Items), RPD, dan Ringkasan
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useBahanRevisiData } from '@/hooks/use-bahanrevisi-data';
import { useBahanRevisiSubmit } from '@/hooks/use-bahanrevisi-submit';
import { BahanRevisiFilters, BudgetItem } from '@/types/bahanrevisi';
import { formatCurrency } from '@/utils/bahanrevisi-calculations';
import BahanRevisiFilter from './BahanRevisiFilter';
import BahanRevisiBudgetTable from './BahanRevisiBudgetTable';
import BahanRevisiRingkasan from './BahanRevisiRingkasan';
import RPDTable from './RPDTable';
import BudgetChangesConclusion from './BudgetChangesConclusion';
import BudgetChangesSummary from './BudgetChangesSummary';
import { BudgetChangesTable } from './BudgetChangesTable';
import { NewBudgetTable } from './NewBudgetTable';
import { toast } from '@/hooks/use-toast';

interface BahanRevisiAnggaranProps {}

const BahanRevisiAnggaran: React.FC<BahanRevisiAnggaranProps> = () => {
  const satkerConfig = useSatkerConfigContext();
  const { user } = useAuth();
  const [filters, setFilters] = useState<BahanRevisiFilters>({});
  const [selectedTab, setSelectedTab] = useState('anggaran');
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [hideZeroPagu, setHideZeroPagu] = useState(false);

  // Get sheet ID untuk bahanrevisi module
  const sheetId = satkerConfig?.getUserSatkerSheetId('bahanrevisi');

  if (!sheetId) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Sheet ID untuk Bahan Revisi Anggaran tidak ditemukan. Hubungi administrator.
        </AlertDescription>
      </Alert>
    );
  }

  // Fetch data dari Google Sheets
  const {
    budgetItems,
    filteredBudgetItems,
    rpdItems,
    programs,
    kegiatans,
    rincianOutputs,
    komponenOutputs,
    subKomponen,
    akuns,
    isLoading: isLoadingData,
    error: dataError,
    refetch,
  } = useBahanRevisiData({
    sheetId,
    filters,
    enabled: !!sheetId,
  });

  // Mutations untuk submit data
  const {
    addItem,
    updateItem,
    deleteItem,
    approveItem,
    rejectItem,
    isLoading: isSubmitting,
  } = useBahanRevisiSubmit({ sheetId });

  // Handle add new item
  const handleAddItem = () => {
    if (!filters.komponen_output) {
      toast({
        title: 'Error',
        description: 'Silahkan pilih Komponen Output terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    // Find a template from filtered items
    const template = filteredBudgetItems[0];
    if (!template) {
      toast({
        title: 'Error',
        description: 'Tidak ada data template untuk membuat item baru',
        variant: 'destructive',
      });
      return;
    }

    const newItem = {
      ...template,
      id: undefined,
      submitted_by: user?.username || 'unknown',
      submitted_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      status: 'new' as const,
      approved_by: undefined,
      approved_date: undefined,
      rejected_by: undefined,
      rejected_date: undefined,
      rejection_reason: undefined,
    };

    addItem(newItem as any);
  };

  // Handle delete item
  const handleDeleteItem = (itemId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      deleteItem({
        itemId,
        allItems: budgetItems,
      });
      toast({
        title: 'Success',
        description: 'Item berhasil dihapus',
      });
    }
  };

  // Handle approve item
  const handleApproveItem = (itemId: string) => {
    approveItem({
      itemId,
      approvedBy: user?.username || 'unknown',
      allItems: budgetItems,
    });
    toast({
      title: 'Success',
      description: 'Item berhasil disetujui',
    });
  };

  // Handle reject item
  const handleRejectItem = (itemId: string, rejectedBy: string, reason: string) => {
    if (!reason) {
      toast({
        title: 'Error',
        description: 'Alasan penolakan tidak boleh kosong',
        variant: 'destructive',
      });
      return;
    }

    rejectItem({
      itemId,
      rejectedBy,
      rejectionReason: reason,
      allItems: budgetItems,
    });
    toast({
      title: 'Success',
      description: 'Item berhasil ditolak',
    });
  };

  // Helper functions untuk format data untuk new components
  const getChangedBudgetItems = () => {
    return filteredBudgetItems
      .filter(item => item.status === 'changed')
      .map(item => ({
        id: item.id,
        pembebanan: [
          item.program_code,
          item.komponen_output_code,
          item.sub_komponen_code,
          'A',
          item.akun_code
        ].filter(Boolean).join('.'),
        uraian: item.uraian,
        detailPerubahan: getDetailPerubahan(item),
        jumlahSemula: item.jumlah_semula,
        jumlahMenjadi: item.jumlah_menjadi,
        selisih: item.selisih
      }));
  };

  const getNewBudgetItems = () => {
    return filteredBudgetItems
      .filter(item => item.status === 'new')
      .map(item => ({
        id: item.id,
        pembebanan: [
          item.program_code,
          item.komponen_output_code,
          item.sub_komponen_code,
          'A',
          item.akun_code
        ].filter(Boolean).join('.'),
        uraian: item.uraian,
        volume: item.volume_menjadi,
        satuan: item.satuan_menjadi,
        hargaSatuan: item.harga_satuan_menjadi,
        jumlah: item.jumlah_menjadi
      }));
  };

  const getDetailPerubahan = (item: BudgetItem) => {
    const changes: string[] = [];
    if (item.volume_semula !== item.volume_menjadi) {
      changes.push(`Volume: ${item.volume_semula} → ${item.volume_menjadi}`);
    }
    if (item.satuan_semula !== item.satuan_menjadi) {
      changes.push(`Satuan: ${item.satuan_semula} → ${item.satuan_menjadi}`);
    }
    if (item.harga_satuan_semula !== item.harga_satuan_menjadi) {
      changes.push(
        `Harga: ${formatCurrency(item.harga_satuan_semula)} → ${formatCurrency(item.harga_satuan_menjadi)}`
      );
    }
    return changes.join('\n');
  };

  if (dataError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error mengambil data: {(dataError as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Bahan Revisi Anggaran</h1>
        <p className="text-sm text-slate-600">
          Kelola revisi pagu anggaran dengan sistem approval berjenjang
        </p>
      </div>

      {/* Loading State */}
      {isLoadingData && (
        <Card className="p-8 flex items-center justify-center gap-2 text-slate-500">
          <Loader className="h-5 w-5 animate-spin" />
          Memuat data...
        </Card>
      )}

      {!isLoadingData && (
        <>
          {/* Filter - Collapsible */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterExpanded(!filterExpanded)}
                className="w-full justify-between"
              >
                <span className="font-semibold">Filter Data</span>
                {filterExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {filterExpanded && (
              <BahanRevisiFilter
                filters={filters}
                setFilters={setFilters}
                budgetItems={budgetItems}
                programs={programs}
                kegiatans={kegiatans}
                rincianOutputs={rincianOutputs}
                komponenOutputs={komponenOutputs}
                subKomponen={subKomponen}
                akuns={akuns}
                loading={isSubmitting}
                hideZeroPagu={hideZeroPagu}
                setHideZeroPagu={setHideZeroPagu}
              />
            )}
          </div>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-slate-200">
              <TabsTrigger value="anggaran" className="text-sm">
                Anggaran
                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                  {filteredBudgetItems.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="rpd" className="text-sm">
                Rencana Penarikan Dana
                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                  {rpdItems.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="ringkasan" className="text-sm">
                Ringkasan Revisi
              </TabsTrigger>
            </TabsList>

            {/* Tab: Anggaran (Budget Items) */}
            <TabsContent value="anggaran" className="space-y-4">
              <BahanRevisiBudgetTable
                items={filteredBudgetItems}
                filters={filters}
                isLoading={isLoadingData || isSubmitting}
                onAdd={handleAddItem}
                onDelete={handleDeleteItem}
                onApprove={handleApproveItem}
                onReject={handleRejectItem}
                hideZeroPagu={hideZeroPagu}
              />
            </TabsContent>

            {/* Tab: RPD (Rencana Penarikan Dana) */}
            <TabsContent value="rpd" className="space-y-4">
              <RPDTable 
                filters={filters}
                items={rpdItems}
                loading={isLoadingData}
                onUpdateItem={async (id, updates) => {
                  // Handle RPD item updates via spreadsheet
                  // TODO: Implement RPD update functionality
                }}
              />
            </TabsContent>

            {/* Tab: Ringkasan */}
            <TabsContent value="ringkasan" className="space-y-4">
              {/* New refined summary components */}
              <div className="space-y-4">
                {/* Summary Conclusion */}
                <BudgetChangesConclusion
                  totalSemula={filteredBudgetItems.reduce((sum, item) => sum + item.jumlah_semula, 0)}
                  totalMenjadi={filteredBudgetItems.reduce((sum, item) => sum + item.jumlah_menjadi, 0)}
                  totalSelisih={filteredBudgetItems.reduce((sum, item) => sum + item.selisih, 0)}
                  changedItems={filteredBudgetItems.filter(item => item.status === 'changed').length}
                  newItems={filteredBudgetItems.filter(item => item.status === 'new').length}
                  deletedItems={filteredBudgetItems.filter(item => item.status === 'deleted').length}
                />

                {/* Changed Items Table */}
                {getChangedBudgetItems().length > 0 && (
                  <BudgetChangesTable
                    title="Pagu Anggaran Berubah"
                    items={getChangedBudgetItems()}
                  />
                )}

                {/* New Items Table */}
                {getNewBudgetItems().length > 0 && (
                  <NewBudgetTable items={getNewBudgetItems()} />
                )}

                {/* Summary with statistics */}
                <BudgetChangesSummary
                  totalSemula={filteredBudgetItems.reduce((sum, item) => sum + item.jumlah_semula, 0)}
                  totalMenjadi={filteredBudgetItems.reduce((sum, item) => sum + item.jumlah_menjadi, 0)}
                  totalSelisih={filteredBudgetItems.reduce((sum, item) => sum + item.selisih, 0)}
                  totalNewItems={filteredBudgetItems.filter(item => item.status === 'new').length}
                  totalChangedItems={filteredBudgetItems.filter(item => item.status === 'changed').length}
                  totalDeletedItems={filteredBudgetItems.filter(item => item.status === 'deleted').length}
                  totalUnchangedItems={filteredBudgetItems.filter(item => item.status === 'unchanged').length}
                  totalItems={filteredBudgetItems.length}
                />

                {/* Original ringkasan component for additional visualizations */}
                <BahanRevisiRingkasan
                  items={filteredBudgetItems}
                  isLoading={isLoadingData}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer Info */}
          <Card className="p-4 bg-slate-50 border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div>
                <p className="font-semibold">Total Items: {budgetItems.length}</p>
                <p>Filtered: {filteredBudgetItems.length}</p>
              </div>
              <div>
                <p className="font-semibold">User: {user?.username}</p>
                <p>Satker: {user?.satker}</p>
              </div>
              <div>
                <p className="font-semibold">Sheet ID:</p>
                <p className="font-mono text-xs">{sheetId.substring(0, 20)}...</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default BahanRevisiAnggaran;
