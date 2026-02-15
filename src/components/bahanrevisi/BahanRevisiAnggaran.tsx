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
import { BahanRevisiFilters } from '@/types/bahanrevisi';
import BahanRevisiFilter from './BahanRevisiFilter';
import BahanRevisiBudgetTable from './BahanRevisiBudgetTable';
import BahanRevisiRingkasan from './BahanRevisiRingkasan';
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
              <Card className="p-8">
                <div className="text-center text-slate-500">
                  <p>Fitur RPD sedang dalam pengembangan</p>
                  <p className="text-sm mt-2">
                    Total RPD Items: {rpdItems.length}
                  </p>
                </div>
              </Card>
            </TabsContent>

            {/* Tab: Ringkasan */}
            <TabsContent value="ringkasan" className="space-y-4">
              <BahanRevisiRingkasan
                items={filteredBudgetItems}
                isLoading={isLoadingData}
              />
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
