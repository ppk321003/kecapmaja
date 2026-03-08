/**
 * Bahan Revisi Anggaran - Main Component
 * Integra 3 tabs: Anggaran (Budget Items), RPD, dan Ringkasan
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader, ChevronDown, ChevronUp, FileUp } from 'lucide-react';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useBahanRevisiData } from '@/hooks/use-bahanrevisi-data';
import { useBahanRevisiSubmit } from '@/hooks/use-bahanrevisi-submit';
import { BahanRevisiFilters, BudgetItem } from '@/types/bahanrevisi';
import { formatCurrency, formatDateIndonesia, determineStatusFromChanges, calculateSelisih, calculateJumlahMenjadi } from '@/utils/bahanrevisi-calculations';
import BahanRevisiFilter from './BahanRevisiFilter';
import BahanRevisiBudgetTable from './BahanRevisiBudgetTable';
import BahanRevisiRingkasanSubtab from './BahanRevisiRingkasanSubtab';
import BahanRevisiProyeksiBulananSubtab from './BahanRevisiProyeksiBulananSubtab';
import RPDTable from './RPDTable';
import BudgetChangesConclusion from './BudgetChangesConclusion';
import BudgetChangesSummary from './BudgetChangesSummary';
import { BudgetChangesTable } from './BudgetChangesTable';
import { NewBudgetTable } from './NewBudgetTable';
import BahanRevisiExcelImportExport from './BahanRevisiExcelImportExport';
import BahanRevisiUploadBulanan from './BahanRevisiUploadBulanan';
import { toast } from '@/hooks/use-toast';
import SummaryCardsBar from './SummaryCardsBar';
import { MatchResult } from '@/hooks/use-import-monthly-csv';
import { ParsedMonthlyData } from '@/utils/bahanrevisi-monthly-csv-parser';

interface BahanRevisiAnggaranProps {}

const BahanRevisiAnggaran: React.FC<BahanRevisiAnggaranProps> = () => {
  const satkerConfig = useSatkerConfigContext();
  const { user } = useAuth();
  const [filters, setFilters] = useState<BahanRevisiFilters>({});
  const [selectedTab, setSelectedTab] = useState('anggaran');
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [hideZeroPagu, setHideZeroPagu] = useState(true);
  const [lastMonthlyImport, setLastMonthlyImport] = useState<{ bulan: number; tahun: number } | null>(null);

  // Get sheet ID untuk bahanrevisi module
  const sheetId = satkerConfig?.getUserSatkerSheetId('bahanrevisi');

  // IMPORTANT: Call all hooks BEFORE any conditional returns!
  // This ensures hook count is consistent across renders

  // Fetch data dari Google Sheets (all hooks called unconditionally)
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
    programsOptions,
    kegiatansOptions,
    rincianOutputsOptions,
    komponenOutputsOptions,
    subKomponenOptions,
    akunsOptions,
    isLoading: isLoadingData,
    error: dataError,
    refetch
  } = useBahanRevisiData({
    sheetId,
    filters,
    enabled: !!sheetId
  });

  // Derive items as they should appear when `hideZeroPagu` is active.
  // This mirrors the special handling used in `BahanRevisiBudgetTable`:
  // - when hiding zero pagu, keep pending (not approved) items except unchanged items with jumlah_menjadi === 0
  const itemsVisibleByHideZero = (() => {
    if (!hideZeroPagu) return filteredBudgetItems || [];
    try {
      return (filteredBudgetItems || []).filter(item => {
        const isApprovedByPPK = !!item.approved_by;
        if (!isApprovedByPPK) {
          if (item.status === 'unchanged' && (item.jumlah_menjadi || 0) === 0) {
            return false;
          }
          return true;
        }
        return (item.jumlah_menjadi || 0) !== 0;
      });
    } catch (e) {
      console.error('[BahanRevisiAnggaran] Error filtering items by hideZeroPagu:', e);
      return filteredBudgetItems || [];
    }
  })();

  // Derive visible RPD items according to current filters and hideZeroPagu
  const rpdVisibleItems = (() => {
    try {
      if (!Array.isArray(rpdItems)) return [];
      return rpdItems.filter((item) => {
        if (filters.program_pembebanan && String(item.program_pembebanan || '').trim() !== String(filters.program_pembebanan).trim()) return false;
        if (filters.kegiatan && String(item.kegiatan || '').trim() !== String(filters.kegiatan).trim()) return false;
        if (filters.komponen_output && String(item.komponen_output || '').trim() !== String(filters.komponen_output).trim()) return false;
        if (filters.sub_komponen && String(item.sub_komponen || '').trim() !== String(filters.sub_komponen).trim()) return false;
        if (filters.rincian_output && String(item.rincian_output || '').trim() !== String(filters.rincian_output).trim()) return false;
        if (filters.akun && String(item.akun || '').trim() !== String(filters.akun).trim()) return false;
        if (hideZeroPagu) {
          return (Number(item.total_pagu) || 0) !== 0;
        }
        return true;
      });
    } catch (e) {
      console.error('[BahanRevisiAnggaran] Error filtering rpdItems by hideZeroPagu:', e);
      return rpdItems || [];
    }
  })();

  // Mutations untuk submit data
  const {
    addItem,
    updateItem,
    deleteItem,
    approveItem,
    rejectItem,
    updateRPDItem,
    isLoading: isSubmitting
  } = useBahanRevisiSubmit({ sheetId });

  // NOW check if sheetId exists
  if (!sheetId) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Sheet ID untuk Bahan Revisi Anggaran tidak ditemukan. Hubungi administrator.
        </AlertDescription>
      </Alert>);

  }

  // Handle add new item
  const handleAddItem = (newItemData: Omit<BudgetItem, 'id'>) => {
    const newItem = {
      ...newItemData,
      submitted_by: user?.username || 'unknown',
      submitted_date: formatDateIndonesia(new Date().toISOString()),
      updated_date: formatDateIndonesia(new Date().toISOString()),
      status: 'new' as const,
      approved_by: undefined,
      approved_date: undefined,
      rejected_date: undefined
    };

    addItem(newItem as any);
    toast({
      title: 'Berhasil',
      description: 'Item baru berhasil ditambahkan'
    });
  };

  // Handle delete item
  const handleDeleteItem = (itemId: string) => {
    deleteItem({
      itemId,
      allItems: budgetItems,
      submitted_by: user?.username,
      updated_date: formatDateIndonesia(new Date().toISOString())
    });
    toast({
      title: 'Success',
      description: 'Item berhasil dihapus'
    });
  };

  // Handle approve item
  const handleApproveItem = (itemId: string) => {
    approveItem({
      itemId,
      approvedBy: user?.username || 'unknown',
      allItems: budgetItems
    });
    toast({
      title: 'Success',
      description: 'Item berhasil disetujui'
    });
  };

  // Handle reject item
  const handleRejectItem = (itemId: string, rejectedBy: string, reason: string) => {
    if (!reason) {
      toast({
        title: 'Error',
        description: 'Alasan penolakan tidak boleh kosong',
        variant: 'destructive'
      });
      return;
    }

    rejectItem({
      itemId,
      rejectedBy,
      rejectionReason: reason,
      allItems: budgetItems
    });
    toast({
      title: 'Success',
      description: 'Item berhasil ditolak'
    });
  };

  // Handle update item
  const handleUpdateItem = (itemId: string, updates: Partial<BudgetItem>) => {
    // Find the item to update
    const itemIndex = budgetItems.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return;

    const originalItem = budgetItems[itemIndex];

    // Merge updates with original item
    let updatedItem = { ...originalItem, ...updates };

    // Update submitted_by and updated_date to current user and time when editing
    updatedItem.submitted_by = user?.username || updatedItem.submitted_by;
    updatedItem.updated_date = formatDateIndonesia(new Date().toISOString());

    // Check if ada perubahan pada data (bukan approval fields)
    const dataChanged =
    originalItem.volume_menjadi !== updatedItem.volume_menjadi ||
    originalItem.satuan_menjadi !== updatedItem.satuan_menjadi ||
    originalItem.harga_satuan_menjadi !== updatedItem.harga_satuan_menjadi ||
    originalItem.jumlah_menjadi !== updatedItem.jumlah_menjadi;

    // Recalculate jumlah_menjadi if volume or harga changed
    if ('volume_menjadi' in updates || 'harga_satuan_menjadi' in updates) {
      updatedItem.jumlah_menjadi = calculateJumlahMenjadi(
        updatedItem.volume_menjadi,
        updatedItem.harga_satuan_menjadi
      );
    }

    // Recalculate selisih (with rounding to thousands)
    updatedItem.selisih = calculateSelisih(updatedItem.jumlah_menjadi || 0, updatedItem.jumlah_semula || 0);

    // **IMPORTANT**: Jika ada perubahan data, RESET SEMUA APPROVAL STATUS
    // - Status yang approved/rejected berubah menjadi changed (revisi dianggap pengajuan ulang)
    // - Clear approved_by, approved_date, DAN rejected_date
    // - Aksi PPK kembali aktif untuk approval baru
    if (dataChanged) {
      updatedItem.status = 'changed';
      updatedItem.approved_by = undefined;
      updatedItem.approved_date = undefined;
      updatedItem.rejected_date = undefined; // ← PENTING: Clear rejected status juga!
    } else {
      // Jika tidak ada perubahan data, tentukan status dari perhitungan
      const newStatus = determineStatusFromChanges(updatedItem);
      if ((newStatus === 'changed' || newStatus === 'new') && !updatedItem.approved_by) {
        updatedItem.status = newStatus;
        updatedItem.approved_by = undefined;
        updatedItem.approved_date = undefined;
        updatedItem.rejected_date = undefined; // ← Clear rejected juga untuk keamanan
      }
    }

    updateItem({
      itemId,
      updates: updatedItem,
      allItems: budgetItems
    });
    toast({
      title: 'Success',
      description: `Item berhasil diperbarui. ${dataChanged ? 'Pengajuan revisi disimpan. Status kembali menunggu persetujuan PPK.' : ''}`
    });
  };

  // Helper functions untuk format data untuk new components
  const getChangedBudgetItems = () => {
    return filteredBudgetItems.
    filter((item) => item.status === 'changed').
    map((item) => ({
      id: item.id,
      pembebanan: [
      item.program_pembebanan,
      item.komponen_output,
      item.sub_komponen,
      item.akun].
      filter(Boolean).join('.'),
      uraian: item.uraian,
      detailPerubahan: getDetailPerubahan(item),
      jumlahSemula: item.jumlah_semula,
      jumlahMenjadi: item.jumlah_menjadi,
      selisih: item.selisih
    }));
  };

  const getNewBudgetItems = () => {
    return filteredBudgetItems.
    filter((item) => item.status === 'new').
    map((item) => ({
      id: item.id,
      pembebanan: [
      item.program_pembebanan,
      item.komponen_output,
      item.sub_komponen,
      item.akun].
      filter(Boolean).join('.'),
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
    const errorText = typeof dataError === 'string' ? dataError : 'Unknown error occurred';
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error mengambil data: {errorText}
        </AlertDescription>
      </Alert>);

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
      {isLoadingData &&
      <Card className="p-8 flex items-center justify-center gap-2 text-slate-500">
          <Loader className="h-5 w-5 animate-spin" />
          Memuat data...
        </Card>
      }

      {!isLoadingData &&
      <>
          {/* Filter - Collapsible */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterExpanded(!filterExpanded)}
              className="w-full justify-between">

                <span className="font-semibold">Filter Data</span>
                {filterExpanded ?
              <ChevronUp className="h-4 w-4" /> :

              <ChevronDown className="h-4 w-4" />
              }
              </Button>
            </div>
            
            {filterExpanded &&
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
            programsOptions={programsOptions}
            kegiatansOptions={kegiatansOptions}
            rincianOutputsOptions={rincianOutputsOptions}
            komponenOutputsOptions={komponenOutputsOptions}
            subKomponenOptions={subKomponenOptions}
            akunsOptions={akunsOptions}
            loading={isSubmitting}
            hideZeroPagu={hideZeroPagu}
            setHideZeroPagu={setHideZeroPagu} />

          }
          </div>

          {/* Excel Import/Export Controls - Only for PPK */}
          {user?.role === 'Pejabat Pembuat Komitmen' &&
        <BahanRevisiExcelImportExport
          sheetId={sheetId}
          onImportSuccess={async (budgetItems, rpdItems) => {
            try {
              // Refetch data after successful import
              await refetch();
              toast({
                title: "Import berhasil",
                description: `${budgetItems.length} items berhasil diimport dari Excel`
              });
            } catch (error) {
              console.error("Error after import:", error);
              toast({
                title: "Import berhasil tapi ada error saat refresh data",
                variant: "destructive"
              });
            }
          }}
          budgetItems={budgetItems}
          komponenOutput={filters?.komponen_output}
          subKomponen={filters?.sub_komponen}
          akun={filters?.akun} />

        }

          {/* Summary Cards Bar */}
          {filteredBudgetItems.length > 0 &&
        <SummaryCardsBar items={itemsVisibleByHideZero} />
        }

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList className={`grid w-full ${user?.role === 'Pejabat Pembuat Komitmen' ? 'grid-cols-4' : 'grid-cols-3'} bg-slate-200`}>
              <TabsTrigger value="anggaran" className="text-sm">
                Anggaran
                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                  {itemsVisibleByHideZero.length}
                </span>
              </TabsTrigger>
              {user?.role === 'Pejabat Pembuat Komitmen' && (
                <TabsTrigger value="rpd" className="text-sm">
                  Rencana Penarikan Dana
                  <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                    {rpdVisibleItems.length}
                  </span>
                </TabsTrigger>
              )}
              <TabsTrigger value="ringkasan" className="text-sm">
                Ringkasan Revisi
              </TabsTrigger>
              <TabsTrigger value="realisasi" className="text-sm">
                Realisasi Bulanan
              </TabsTrigger>
            </TabsList>

            {/* Tab: Anggaran (Budget Items) */}
            <TabsContent value="anggaran" className="space-y-4">

              <BahanRevisiBudgetTable
              items={filteredBudgetItems}
              filters={filters}
              isLoading={isLoadingData || isSubmitting}
              onAdd={handleAddItem}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
              onApprove={handleApproveItem}
              onReject={handleRejectItem}
              hideZeroPagu={hideZeroPagu}
              programs={programs}
              kegiatans={kegiatans}
              rincianOutputs={rincianOutputs}
              komponenOutputs={komponenOutputs}
              subKomponen={subKomponen}
              akuns={akuns}
              programsOptions={programsOptions}
              kegiatansOptions={kegiatansOptions}
              rincianOutputsOptions={rincianOutputsOptions}
              komponenOutputsOptions={komponenOutputsOptions}
              subKomponenOptions={subKomponenOptions}
              akunsOptions={akunsOptions} />

            </TabsContent>

            {/* Tab: RPD (Rencana Penarikan Dana) */}
            <TabsContent value="rpd" className="space-y-4">
              <RPDTable
              filters={filters}
              items={rpdItems}
              loading={isLoadingData}
              budgetItems={budgetItems}
              hideZeroPagu={hideZeroPagu}
              onUpdateItem={async (id, updates) => {
                try {
                  // Calculate total_rpd and sisa_anggaran
                  const rpdItem = rpdItems.find((item) => item.id === id);
                  if (!rpdItem) {
                    toast({
                      title: 'Error',
                      description: 'Item RPD tidak ditemukan',
                      variant: 'destructive'
                    });
                    return;
                  }

                  const newValues = { ...rpdItem, ...updates };
                  const total = (newValues.jan || 0) + (newValues.feb || 0) + (newValues.mar || 0) + (
                  newValues.apr || 0) + (newValues.mei || 0) + (newValues.jun || 0) + (
                  newValues.jul || 0) + (newValues.aug || 0) + (newValues.sep || 0) + (
                  newValues.oct || 0) + (newValues.nov || 0) + (newValues.dec || 0);

                  const finalUpdates = {
                    ...updates,
                    total_rpd: total,
                    sisa_anggaran: (rpdItem.total_pagu || 0) - total,
                    status: 'ok',
                    modified_by: user?.username || 'unknown',
                    modified_date: formatDateIndonesia(new Date().toISOString())
                  };

                  updateRPDItem({
                    itemId: id,
                    updates: finalUpdates,
                    allItems: rpdItems
                  });

                  toast({
                    title: 'Berhasil',
                    description: 'Data RPD berhasil disimpan'
                  });
                } catch (error) {
                  console.error('[RPDTable] Update error:', error);
                  toast({
                    title: 'Error',
                    description: 'Gagal menyimpan data RPD',
                    variant: 'destructive'
                  });
                }
              }} />

            </TabsContent>

            {/* Tab: Ringkasan */}
            <TabsContent value="ringkasan" className="space-y-4">
              {/* Ringkasan dengan subtab button untuk berbagai kategori */}
              {Array.isArray(filteredBudgetItems) &&
            <BahanRevisiRingkasanSubtab
              items={itemsVisibleByHideZero}
              programs={programs}
              kegiatans={kegiatans}
              rincianOutputs={rincianOutputs}
              komponenOutputs={komponenOutputs}
              subKomponen={subKomponen}
              akuns={akuns} />

            }
            </TabsContent>

            {/* Tab: Realisasi Bulanan */}
            <TabsContent value="realisasi" className="space-y-4">
              <BahanRevisiProyeksiBulananSubtab
                  items={rpdVisibleItems}
                  budgetItems={itemsVisibleByHideZero}
                  programs={programs}
                  kegiatans={kegiatans}
                  rincianOutputs={rincianOutputs}
                  komponenOutputs={komponenOutputs}
                  subKomponen={subKomponen}
                  akuns={akuns}
                  sheetId={sheetId}
                  onUploadRPD={() => {
                    // Trigger refresh by re-fetching data
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                    return Promise.resolve();
                  }}
                />
            </TabsContent>
          </Tabs>

          {/* Footer Info */}
          















        </>
      }
    </div>);

};

export default BahanRevisiAnggaran;