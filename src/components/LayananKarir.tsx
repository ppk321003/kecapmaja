import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, TrendingUp, Download, User, Award, MapPin } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import { Karyawan } from '@/types';

interface LayananKarirProps {
  karyawan: Karyawan;
}

const ProfileHeader: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">
                    {karyawan.nama}
                  </h1>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                    {karyawan.kategori}
                  </Badge>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{karyawan.jabatan}</p>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Award className="h-4 w-4" />
                    <span>{karyawan.pangkat} - {karyawan.golongan}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span>{karyawan.unitKerja}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="lg:text-right">
            <div className="inline-flex flex-col gap-2 bg-white/80 rounded-lg p-4 border">
              <div>
                <p className="text-xs text-gray-500 font-medium">NIP</p>
                <p className="text-sm font-mono font-semibold text-gray-900">{karyawan.nip}</p>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600 font-medium">{karyawan.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Indicator */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Tanggal Penghitungan AK Terakhir</p>
                <p className="text-lg font-bold text-blue-600">{karyawan.tglPenghitunganAkTerakhir}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Siap untuk pengembangan karir</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState('generate');

  const tabConfig = {
    generate: { 
      title: "BUAT DOKUMEN", 
      icon: FileText,
      color: "blue"
    },
    unduh: { 
      title: "ARSIP DOKUMEN", 
      icon: Download,
      color: "green"
    }
  };

  const getTabColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      blue: isActive 
        ? "bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-100" 
        : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:shadow-md",
      green: isActive 
        ? "bg-green-500 text-white border-green-600 shadow-lg shadow-green-100" 
        : "bg-white text-green-600 border-green-200 hover:bg-green-50 hover:shadow-md"
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <ProfileHeader karyawan={karyawan} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Enhanced Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2">
          <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 gap-2">
            {Object.entries(tabConfig).map(([key, config]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className={`
                  flex items-center gap-3 text-sm font-semibold py-4 px-6 rounded-xl border-2 transition-all duration-300
                  ${getTabColorClasses(config.color, activeTab === key)}
                  hover:scale-[1.02] active:scale-[0.98]
                `}
              >
                <config.icon className="h-5 w-5" />
                {config.title}
                {activeTab === key && (
                  <div className="ml-auto w-2 h-2 bg-white/30 rounded-full"></div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Content Header */}
        <div className="px-2">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              activeTab === 'generate' ? 'bg-blue-500' : 'bg-green-500'
            }`}></div>
            <h2 className="text-xl font-bold text-gray-900">
              {activeTab === 'generate' 
                ? `Buat Dokumen Karir - ${karyawan.nama.split(',')[0]}`
                : 'Arsip Dokumen Karir'
              }
            </h2>
          </div>
          <p className="text-gray-600 mt-2">
            {activeTab === 'generate' 
              ? 'Generate dokumen-dokumen yang diperlukan untuk pengembangan karir'
              : 'Akses dan unduh dokumen-dokumen karir yang tersedia'
            }
          </p>
        </div>

        {/* Tab Content */}
        <TabsContent value="generate" className="space-y-4 animate-in fade-in duration-300">
          <KonversiPredikat karyawan={karyawan} />
        </TabsContent>

        <TabsContent value="unduh" className="space-y-4 animate-in fade-in duration-300">
          <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50">
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Download className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Arsip Dokumen
                </h3>
                <p className="text-gray-600 mb-6 text-lg">
                  Fitur arsip dokumen sedang dalam tahap finalisasi
                </p>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6">
                  <p className="text-green-700 font-medium">
                    Gunakan fitur <strong className="text-green-800">"Buat Dokumen"</strong> untuk 
                    membuat dokumen-dokumen karir yang Anda butuhkan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LayananKarir;