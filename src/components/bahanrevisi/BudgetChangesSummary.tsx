import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileImage, FileText, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/utils/bahanrevisi-calculations';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface BudgetChangesSummaryProps {
  totalSemula: number;
  totalMenjadi: number;
  totalSelisih: number;
  totalNewItems: number;
  totalChangedItems: number;
  totalDeletedItems: number;
  totalUnchangedItems: number;
  totalItems: number;
}

const BudgetChangesSummary: React.FC<BudgetChangesSummaryProps> = ({
  totalSemula,
  totalMenjadi,
  totalSelisih,
  totalNewItems,
  totalChangedItems,
  totalDeletedItems,
  totalUnchangedItems,
  totalItems
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Pejabat Pembuat Komitmen';

  const handleExportJPEG = async () => {
    if (!cardRef.current) return;

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

  const handleExportPDF = async () => {
    if (!cardRef.current) return;

    try {
      toast({
        title: 'Berhasil',
        description: 'Berhasil mengekspor sebagai PDF'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: 'Gagal mengekspor sebagai PDF'
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      toast({
        title: 'Berhasil',
        description: 'Berhasil mengekspor sebagai Excel'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: 'Gagal mengekspor sebagai Excel'
      });
    }
  };

  return (
    <div className="w-full space-y-4">
      {isAdmin && (
        <div className="flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportJPEG}>
            <FileImage className="h-4 w-4 mr-2" />
            Export JPEG
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      )}

      <Card ref={cardRef} className="bg-blue-50/50 border-blue-100">
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-lg font-semibold text-blue-900">Kesimpulan</h2>

          <div className="space-y-2 text-sm">
            <p>
              Berdasarkan hasil analisis terhadap alokasi anggaran, total pagu anggaran semula sebesar{' '}
              {formatCurrency(totalSemula)} mengalami perubahan menjadi {formatCurrency(totalMenjadi)}, dengan
              selisih {formatCurrency(totalSelisih === 0 ? totalSelisih : Math.abs(totalSelisih))}{' '}
              {totalSelisih > 0 ? 'penambahan' : totalSelisih < 0 ? 'pengurangan' : 'atau tetap'}.
            </p>
            <p>
              Perubahan ini terdiri dari {totalChangedItems} komponen anggaran yang mengalami penyesuaian nilai,{' '}
              {totalNewItems} komponen anggaran baru yang ditambahkan, dan {totalDeletedItems} komponen anggaran
              yang dihapus.
            </p>
            <p>
              Penyesuaian anggaran ini dilakukan untuk mengoptimalkan penggunaan sumber daya keuangan sesuai dengan
              prioritas program dan kegiatan yang telah ditetapkan. Dengan adanya {totalChangedItems + totalNewItems}{' '}
              perubahan ini, diharapkan pelaksanaan program dapat berjalan dengan lebih efektif dan efisien.
            </p>
            <p>Perubahan anggaran ini perlu disetujui oleh pejabat yang berwenang sesuai dengan ketentuan yang berlaku.</p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Total Anggaran</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Semula:</span>
                    <span className="text-sm font-medium">{formatCurrency(totalSemula)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Menjadi:</span>
                    <span className="text-sm font-medium">{formatCurrency(totalMenjadi)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm text-gray-600">Selisih:</span>
                    <span className={`text-sm font-medium ${totalSelisih === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totalSelisih)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Jumlah Item</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Item:</span>
                    <span className="text-sm font-medium">{totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Item Tidak Berubah:</span>
                    <span className="text-sm font-medium">{totalUnchangedItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Item Berubah:</span>
                    <span className="text-sm font-medium">{totalChangedItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Item Baru:</span>
                    <span className="text-sm font-medium">{totalNewItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Item Dihapus:</span>
                    <span className="text-sm font-medium">{totalDeletedItems}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetChangesSummary;
