import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { FileDown, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useHonorData } from '@/hooks/use-honor-data';
import { generateHonorExcel } from '@/utils/honor-excel-generator';
import { 
  HONOR_COLUMNS, 
  HONOR_COLUMN_GROUPS, 
  HONOR_COLUMN_GROUP_LABELS,
  getColumnsByGroup,
  getAllGroupIds,
  type ColumnConfig 
} from '@/utils/honor-columns-config';

const currentYear = new Date().getFullYear();
const tahunOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function DownloadRekapHonor() {
  const { user } = useAuth();
  const satkerConfig = useSatkerConfigContext();
  const { fetchHonorData } = useHonorData();
  const { toast } = useToast();

  const [showDialog, setShowDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [loading, setLoading] = useState(false);
  
  // Column selection state - initialize with default enabled columns
  const [selectedColumns, setSelectedColumns] = useState<ColumnConfig[]>(
    HONOR_COLUMNS.map(col => ({ ...col }))
  );

  // Check if user is PPK and has access to current satker
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  
  // Check if user has valid satker configuration
  const hasValidSatkerConfig = satkerConfig?.configs.some(
    c => c.satker_id === user?.satker && c.entrikegiatan_sheet_id
  );

  const isVisible = isPPK && hasValidSatkerConfig;

  if (!isVisible) {
    return null;
  }

  // Handle single column toggle
  const toggleColumn = (key: string) => {
    setSelectedColumns(cols =>
      cols.map(col =>
        col.key === key ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  // Handle toggle all columns in a group
  const toggleGroupColumns = (groupId: string) => {
    const groupColumns = getColumnsByGroup(groupId);
    const allGroupEnabled = groupColumns.every(gcol =>
      selectedColumns.find(c => c.key === gcol.key)?.enabled
    );

    setSelectedColumns(cols =>
      cols.map(col =>
        col.groupId === groupId ? { ...col, enabled: !allGroupEnabled } : col
      )
    );
  };

  // Get count of enabled columns in group
  const getGroupEnabledCount = (groupId: string): number => {
    const groupColumns = getColumnsByGroup(groupId);
    return selectedColumns.filter(col =>
      col.groupId === groupId && col.enabled
    ).length;
  };

  const handleDownload = async () => {
    try {
      setLoading(true);

      const enabledCols = selectedColumns.filter(c => c.enabled);
      if (enabledCols.length === 0) {
        toast({
          title: 'Info',
          description: 'Pilih minimal satu kolom untuk diunduh',
          variant: 'default'
        });
        return;
      }

      const tahun = parseInt(selectedYear);

      // Fetch data
      const result = await fetchHonorData(tahun);

      if (!result) {
        toast({
          title: 'Error',
          description: 'Gagal mengambil data honor',
          variant: 'destructive'
        });
        return;
      }

      if (result.rows.length === 0) {
        toast({
          title: 'Info',
          description: `Tidak ada data honor untuk tahun ${tahun}`,
          variant: 'default'
        });
        return;
      }

      // Generate Excel file with selected columns
      const filename = generateHonorExcel({
        rows: result.rows,
        satkerName: result.satkerName,
        tahun: result.tahun,
        columnsConfig: enabledCols
      });

      toast({
        title: 'Sukses',
        description: `File ${filename} berhasil diunduh`,
        variant: 'default'
      });

      setShowDialog(false);
    } catch (error: any) {
      console.error('Error downloading honor recap:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Terjadi kesalahan saat mengunduh file',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
      >
        <FileDown className="h-4 w-4" />
        Download Rekap Honor per Tahun
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Download Rekap Honor Output Kegiatan</DialogTitle>
            <DialogDescription>
              Pilih tahun untuk mengunduh rekap honor. File akan berisi data honor untuk semua kegiatan pada tahun yang dipilih.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Data yang ditampilkan adalah honor untuk satker <strong>{user?.satker}</strong> tahun yang dipilih.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label htmlFor="tahun" className="text-sm font-medium">
                Pilih Tahun
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="tahun">
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {tahunOptions.map(tahun => (
                    <SelectItem key={tahun} value={tahun.toString()}>
                      {tahun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Column Selector */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Pilih Kolom</label>
                <span className="text-xs text-gray-500">
                  {selectedColumns.filter(c => c.enabled).length} dari {selectedColumns.length} kolom
                </span>
              </div>

              <Accordion type="multiple" className="w-full border rounded-md p-2">
                {getAllGroupIds().map(groupId => {
                  const groupColumns = getColumnsByGroup(groupId);
                  const enabledCount = getGroupEnabledCount(groupId);
                  const groupLabel = HONOR_COLUMN_GROUP_LABELS[groupId];

                  return (
                    <AccordionItem key={groupId} value={groupId} className="border-0">
                      <AccordionTrigger 
                        className="py-2 hover:no-underline"
                        onClick={() => toggleGroupColumns(groupId)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Checkbox
                            checked={enabledCount === groupColumns.length}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-sm font-medium">{groupLabel}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({enabledCount}/{groupColumns.length})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 pl-8 pb-2">
                        {groupColumns.map(col => {
                          const isEnabled = selectedColumns.find(c => c.key === col.key)?.enabled ?? col.enabled;
                          return (
                            <div key={col.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={col.key}
                                checked={isEnabled}
                                onCheckedChange={() => toggleColumn(col.key)}
                              />
                              <label
                                htmlFor={col.key}
                                className="text-sm cursor-pointer hover:text-blue-600"
                              >
                                {col.label}
                              </label>
                            </div>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleDownload}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Memproses...' : 'Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
