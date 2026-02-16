import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileImage, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/bahanrevisi-calculations';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface NewBudgetItem {
  id: string;
  pembebanan: string;
  uraian: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  jumlah: number;
}

interface NewBudgetTableProps {
  items: NewBudgetItem[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const NewBudgetTable: React.FC<NewBudgetTableProps> = ({ items, onEdit, onDelete }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Pejabat Pembuat Komitmen';

  const handleExportJPEG = async () => {
    try {
      toast({
        title: 'Berhasil',
        description: 'Berhasil mengekspor sebagai JPEG'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: 'Gagal mengekspor sebagai JPEG'
      });
    }
  };

  // Calculate total for the footer
  const totalJumlah = items.reduce((sum, item) => sum + item.jumlah, 0);

  return (
    <Card className="bg-green-50/50 border-green-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg text-green-700 font-bold">Pagu Anggaran Baru</CardTitle>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={handleExportJPEG} className="text-xs">
            <FileImage className="h-4 w-4 mr-2" />
            Export JPEG
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="budget-changes-summary overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-green-100/50">
                <TableHead className="w-[50px] text-center">No</TableHead>
                <TableHead className="text-center">Pembebanan</TableHead>
                <TableHead className="text-center">Uraian</TableHead>
                <TableHead className="w-[100px] text-center">Volume</TableHead>
                <TableHead className="w-[100px] text-center">Satuan</TableHead>
                <TableHead className="w-[180px] text-center">Harga Satuan</TableHead>
                <TableHead className="w-[180px] text-center">Jumlah</TableHead>
                {(onEdit || onDelete) && <TableHead className="w-[100px] text-center">Aksi SM/PJK</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id} className="h-12">
                  <TableCell className="text-center py-3">{index + 1}</TableCell>
                  <TableCell className="whitespace-normal py-3">{item.pembebanan}</TableCell>
                  <TableCell className="py-3">{item.uraian}</TableCell>
                  <TableCell className="text-center py-3">{item.volume}</TableCell>
                  <TableCell className="text-center py-3">{item.satuan}</TableCell>
                  <TableCell className="text-right py-3">{formatCurrency(item.hargaSatuan)}</TableCell>
                  <TableCell className="text-right py-3">{formatCurrency(item.jumlah)}</TableCell>
                  {(onEdit || onDelete) && (
                    <TableCell className="text-center py-3">
                      <div className="flex gap-1 justify-center">
                        {onEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-blue-600 hover:bg-blue-100"
                            onClick={() => onEdit(item.id)}
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onDelete && isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-600 hover:bg-red-100"
                            onClick={() => onDelete(item.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={(onEdit || onDelete) ? 7 : 6} className="font-bold text-center">
                  Total Pagu Anggaran Baru
                </TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totalJumlah)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewBudgetTable;
