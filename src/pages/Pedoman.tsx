import React, { useState, useEffect } from 'react';
import { Table, Filter, User, TrendingUp } from 'lucide-react';
import { Karyawan } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface LKKinerjaProps {
  karyawan: Karyawan;
}

interface KinerjaData {
  no: number;
  nama: string;
  triwulan1: {
    akhir: number;
    ranking: number;
  };
  triwulan2: {
    akhir: number;
    ranking: number;
  };
  triwulan3: {
    akhir: number;
    ranking: number;
  };
  triwulan4: {
    akhir: number;
    ranking: number;
  };
  nilaiAkhir: number;
  rankingAkhir: number;
}

const LKKinerja: React.FC<LKKinerjaProps> = ({ karyawan }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'master' | 'detail'>('master');
  const [dataKinerja, setDataKinerja] = useState<KinerjaData[]>([]);
  const [filteredData, setFilteredData] = useState<KinerjaData[]>([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState<KinerjaData | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'rankingAkhir',
    direction: 'asc'
  });
  const [filter, setFilter] = useState<string>('all');

  // Fetch data dari Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Implement Google Sheets API call
        // const response = await fetchSheetData();
        // setDataKinerja(response);
        // setFilteredData(response);
        
        // Temporary mock data
        const mockData: KinerjaData[] = [
          {
            no: 1,
            nama: "Joni Kasmuri",
            triwulan1: { akhir: 86.60, ranking: 0 },
            triwulan2: { akhir: 86.70, ranking: 0 },
            triwulan3: { akhir: 30.00, ranking: 0 },
            triwulan4: { akhir: 30.00, ranking: 0 },
            nilaiAkhir: 58.33,
            rankingAkhir: 1
          }
        ];
        setDataKinerja(mockData);
        setFilteredData(mockData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Sorting function
  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Filter function
  const handleFilter = (type: string) => {
    setFilter(type);
    // TODO: Implement filter logic
  };

  return (
    <div className="min-h-screen bg-background">
      {/* TAB HEADER */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-4">
          <div className="inline-flex rounded-xl shadow-sm border overflow-hidden text-sm font-medium">
            <button
              onClick={() => setActiveTab('master')}
              className={`flex items-center gap-2.5 px-7 py-2.5 transition-all relative overflow-hidden ${
                activeTab === 'master' ? 'text-white' : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              {activeTab === 'master' && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
              )}
              <Table className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Tabel Master</span>
            </button>

            <button
              onClick={() => setActiveTab('detail')}
              className={`flex items-center gap-2.5 px-7 py-2.5 transition-all relative overflow-hidden ${
                activeTab === 'detail' ? 'text-white' : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              {activeTab === 'detail' && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
              )}
              <User className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Detail Kinerja</span>
            </button>
          </div>
        </div>
      </div>

      {/* KONTEN */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-8">
        {activeTab === 'master' && (
          <div className="space-y-6">
            {/* FILTER & SORTING CONTROLS */}
            <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-card rounded-lg border">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleFilter('all')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    filter === 'all' 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  Semua Data
                </button>
                <button
                  onClick={() => handleFilter('top10')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    filter === 'top10' 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  Top 10
                </button>
                <button
                  onClick={() => handleFilter('active')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    filter === 'active' 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  Triwulan Aktif
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>Total: {filteredData.length} karyawan</span>
              </div>
            </div>

            {/* MASTER TABLE */}
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th 
                        className="px-6 py-4 text-left text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('no')}
                      >
                        No
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('nama')}
                      >
                        Nama
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('nilaiAkhir')}
                      >
                        Nilai 2025
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-sm font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('rankingAkhir')}
                      >
                        Ranking
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredData.map((item) => (
                      <tr 
                        key={item.no} 
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedKaryawan(item)}
                      >
                        <td className="px-6 py-4 text-sm">{item.no}</td>
                        <td className="px-6 py-4 text-sm font-medium">{item.nama}</td>
                        <td className="px-6 py-4 text-sm">{item.nilaiAkhir.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.rankingAkhir <= 10 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            #{item.rankingAkhir}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button 
                            className="text-primary hover:text-primary/80 font-medium text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedKaryawan(item);
                            }}
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'detail' && (
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Detail Kinerja Karyawan
            </h3>
            <p className="text-muted-foreground">
              Pilih karyawan dari tabel master untuk melihat detail kinerja per triwulan
            </p>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedKaryawan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Detail Kinerja - {selectedKaryawan.nama}
                </h2>
                <button 
                  onClick={() => setSelectedKaryawan(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* TODO: Implement detail view dengan data lengkap 4 triwulan */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Triwulan 1 */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Triwulan 1</h3>
                  <p>Nilai Akhir: {selectedKaryawan.triwulan1.akhir}</p>
                  <p>Ranking: {selectedKaryawan.triwulan1.ranking || '-'}</p>
                </div>
                
                {/* TODO: Tambahkan data lengkap untuk setiap triwulan */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LKKinerja;