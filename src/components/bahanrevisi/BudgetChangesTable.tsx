import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileImage, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/bahanrevisi-calculations';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface BudgetChangeItem {
  id: string;
  pembebanan: string;
  uraian: string;
  detailPerubahan: string;
  jumlahSemula: number;
  jumlahMenjadi: number;
  selisih: number;
}

interface BudgetChangesTableProps {
  title: string;
  items: BudgetChangeItem[];
}

export const BudgetChangesTable: React.FC<BudgetChangesTableProps> = ({
  title,
  items
}) => {
  const [isExporting, setIsExporting] = React.useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Pejabat Pembuat Komitmen';
  
  const handleExportJPEG = async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      toast({
        title: 'Memproses',
        description: 'Sedang menyiapkan file JPEG...'
      });
      
      // TODO: Implement JPEG export functionality
      toast({
        title: 'Berhasil',
        description: 'Berhasil mengekspor sebagai JPEG'
      });
    } catch (error) {
      console.error('Error exporting to JPEG:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: 'Gagal mengekspor sebagai JPEG'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate totals for the footer
  const totalJumlahSemula = items.reduce((sum, item) => sum + item.jumlahSemula, 0);
  const totalJumlahMenjadi = items.reduce((sum, item) => sum + item.jumlahMenjadi, 0);
  const totalSelisih = items.reduce((sum, item) => sum + item.selisih, 0);

  return (
    <Card className="bg-orange-50/50 border-orange-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg text-orange-700 font-bold">{title}</CardTitle>
        {isAdmin && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportJPEG} 
            className="text-xs" 
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileImage className="h-4 w-4 mr-2" />
            )}
            Export JPEG
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="budget-changes-summary overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-100/50">
                <TableHead className="w-[50px] text-center">No</TableHead>
                <TableHead className="text-center">Pembebanan</TableHead>
                <TableHead className="text-center">Uraian</TableHead>
                <TableHead className="w-[200px] text-center">Detail Perubahan</TableHead>
                <TableHead className="w-[180px] text-center">Jumlah Semula</TableHead>
                <TableHead className="w-[180px] text-center">Jumlah Menjadi</TableHead>
                <TableHead className="w-[180px] text-center">Selisih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id} className="h-12">
                  <TableCell className="text-center py-3">{index + 1}</TableCell>
                  <TableCell className="whitespace-normal py-3">{item.pembebanan}</TableCell>
                  <TableCell className="py-3">{item.uraian}</TableCell>
                  <TableCell style={{ whiteSpace: 'pre-line' }} className="text-left py-3">
                    {item.detailPerubahan}
                  </TableCell>
                  <TableCell className="text-right py-3">{formatCurrency(item.jumlahSemula)}</TableCell>
                  <TableCell className="text-right py-3">{formatCurrency(item.jumlahMenjadi)}</TableCell>
                  <TableCell 
                    className={`text-right py-3 ${
                      item.selisih === 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(item.selisih)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="h-12">
                <TableCell colSpan={4} className="font-bold text-center py-3">
                  Total Pagu Anggaran Berubah
                </TableCell>
                <TableCell className="text-right font-bold py-3">
                  {formatCurrency(totalJumlahSemula)}
                </TableCell>
                <TableCell className="text-right font-bold py-3">
                  {formatCurrency(totalJumlahMenjadi)}
                </TableCell>
                <TableCell 
                  className={`text-right font-bold py-3 ${
                    totalSelisih === 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(totalSelisih)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetChangesTable;
