import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, User, Calculator, HandCoins, Settings } from 'lucide-react';
import { RekapAnggota } from '@/components/sikostik/RekapAnggota';
import { RekapIndividu } from '@/components/sikostik/RekapIndividu';
import { CekLimit } from '@/components/sikostik/CekLimit';
import { UsulPinjaman } from '@/components/sikostik/UsulPinjaman';
import { UsulPerubahan } from '@/components/sikostik/UsulPerubahan';

const Sikostik28 = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('rekap-anggota');

  // Only accessible to 'Pejabat Pembuat Komitmen' role
  if (user?.role !== 'Pejabat Pembuat Komitmen') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sikostik28</h1>
        <p className="text-muted-foreground">
          Sistem Koperasi Statistik - Pengelolaan simpan pinjam anggota
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="rekap-anggota" className="gap-2">
            <Users className="h-4 w-4 hidden sm:block" />
            <span>Rekap Anggota</span>
          </TabsTrigger>
          <TabsTrigger value="rekap-individu" className="gap-2">
            <User className="h-4 w-4 hidden sm:block" />
            <span>Rekap Individu</span>
          </TabsTrigger>
          <TabsTrigger value="cek-limit" className="gap-2">
            <Calculator className="h-4 w-4 hidden sm:block" />
            <span>Cek Limit</span>
          </TabsTrigger>
          <TabsTrigger value="usul-pinjaman" className="gap-2">
            <HandCoins className="h-4 w-4 hidden sm:block" />
            <span>Usul Pinjaman</span>
          </TabsTrigger>
          <TabsTrigger value="usul-perubahan" className="gap-2">
            <Settings className="h-4 w-4 hidden sm:block" />
            <span>Usul Perubahan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rekap-anggota">
          <RekapAnggota />
        </TabsContent>

        <TabsContent value="rekap-individu">
          <RekapIndividu />
        </TabsContent>

        <TabsContent value="cek-limit">
          <CekLimit />
        </TabsContent>

        <TabsContent value="usul-pinjaman">
          <UsulPinjaman />
        </TabsContent>

        <TabsContent value="usul-perubahan">
          <UsulPerubahan />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sikostik28;
