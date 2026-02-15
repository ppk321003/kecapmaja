import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/bahanrevisi-calculations';

interface BudgetChangesConclusionProps {
  totalSemula: number;
  totalMenjadi: number;
  totalSelisih: number;
  changedItems: number;
  newItems: number;
  deletedItems: number;
}

const BudgetChangesConclusion: React.FC<BudgetChangesConclusionProps> = ({
  totalSemula,
  totalMenjadi,
  totalSelisih,
  changedItems,
  newItems,
  deletedItems
}) => {
  const selisihText = totalSelisih > 0 ? 'pagu bertambah' : totalSelisih < 0 ? 'pagu berkurang' : 'tetap';
  
  return (
    <Card className="bg-blue-100/50 border-blue-200">
      <CardContent className="pt-6">
        <h2 className="text-lg text-blue-700 mb-4 text-left font-bold">Kesimpulan</h2>
        
        <div className="space-y-4 text-sm text-left">
          <p className="text-blue-900">
            Berdasarkan hasil analisis terhadap alokasi revisi anggaran, total pagu anggaran semula sebesar {formatCurrency(totalSemula)} mengalami perubahan menjadi {formatCurrency(totalMenjadi)}, dengan selisih {formatCurrency(Math.abs(totalSelisih))} ({selisihText}).
          </p>
          
          <div className="text-blue-900">
            <p className="mb-2 text-blue-900">Rincian usulan revisi:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{changedItems} detil anggaran yang mengalami penyesuaian nilai</li>
              <li>{newItems} detil anggaran baru yang ditambahkan</li>
              <li>{deletedItems} detil anggaran yang dihapus</li>
            </ul>
          </div>

          <p className="text-blue-900">
            Penyesuaian anggaran ini dilakukan untuk mengoptimalkan penggunaan sumber daya keuangan sesuai dengan prioritas program dan kegiatan yang telah ditetapkan. Dengan adanya {changedItems + newItems} perubahan ini, diharapkan pelaksanaan program dapat berjalan dengan lebih efektif dan efisien.
          </p>
          
          <p className="text-blue-900">Usulan revisi atau perubahan anggaran ini perlu disetujui oleh pejabat yang berwenang sesuai dengan ketentuan yang berlaku.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetChangesConclusion;
