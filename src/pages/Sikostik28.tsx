import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, User, Calculator, HandCoins, Settings, Download } from 'lucide-react';
import { RekapAnggota } from '@/components/sikostik/RekapAnggota';
import { RekapIndividu } from '@/components/sikostik/RekapIndividu';
import { CekLimit } from '@/components/sikostik/CekLimit';
import { UsulPinjaman } from '@/components/sikostik/UsulPinjaman';
import { UsulPerubahan } from '@/components/sikostik/UsulPerubahan';
import { UsulPengambilan } from '@/components/sikostik/UsulPengambilan';

import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Sikostik28 = () => {
  const [activeTab, setActiveTab] = useState('rekap-anggota');
  const [selectedAnggotaId, setSelectedAnggotaId] = useState<string>('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Guard: only allow satker 3210
  useEffect(() => {
    if (!user) return; // allow auth to resolve elsewhere
    if (user.satker !== '3210') {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSelectMember = (anggotaId: string) => {
    setSelectedAnggotaId(anggotaId);
    setActiveTab('rekap-individu');
  };

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
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
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
          <TabsTrigger value="usul-pengambilan" className="gap-2">
            <Download className="h-4 w-4 hidden sm:block" />
            <span>Usul Pengambilan</span>
          </TabsTrigger>
          <TabsTrigger value="usul-perubahan" className="gap-2">
            <Settings className="h-4 w-4 hidden sm:block" />
            <span>Usul Perubahan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rekap-anggota">
          <RekapAnggota onSelectMember={handleSelectMember} />
        </TabsContent>

        <TabsContent value="rekap-individu">
          <RekapIndividu selectedAnggotaId={selectedAnggotaId} />
        </TabsContent>

        <TabsContent value="cek-limit">
          <CekLimit onSelectMember={handleSelectMember} />
        </TabsContent>

        <TabsContent value="usul-pinjaman">
          <UsulPinjaman />
        </TabsContent>

        <TabsContent value="usul-pengambilan">
          <UsulPengambilan />
        </TabsContent>

        <TabsContent value="usul-perubahan">
          <UsulPerubahan />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sikostik28;
