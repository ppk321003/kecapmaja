import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, Filter, Calendar, FileText, Search } from "lucide-react";
import { useState } from "react";

export default function RekapSPK() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);

  // Data contoh untuk rekap SPK
  const dataRekap = [
    { bulan: "Januari", jumlahSPK: 15, nilaiTotal: 250000000, status: "Selesai" },
    { bulan: "Februari", jumlahSPK: 12, nilaiTotal: 180000000, status: "Selesai" },
    { bulan: "Maret", jumlahSPK: 18, nilaiTotal: 320000000, status: "Proses" },
    { bulan: "April", jumlahSPK: 10, nilaiTotal: 150000000, status: "Selesai" },
    { bulan: "Mei", jumlahSPK: 14, nilaiTotal: 210000000, status: "Proses" },
    { bulan: "Juni", jumlahSPK: 16, nilaiTotal: 280000000, status: "Selesai" },
  ];

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Rekap SPK
          </h1>
          <p className="text-muted-foreground mt-2">
            Rekapitulasi data Surat Perjanjian Kerja (SPK) untuk analisis dan pelaporan
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tahun</label>
              <select 
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              >
                <option value={2023}>2023</option>
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Bulan</label>
              <select 
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              >
                <option value={1}>Januari</option>
                <option value={2}>Februari</option>
                <option value={3}>Maret</option>
                <option value={4}>April</option>
                <option value={5}>Mei</option>
                <option value={6}>Juni</option>
                <option value={7}>Juli</option>
                <option value={8}>Agustus</option>
                <option value={9}>September</option>
                <option value={10}>Oktober</option>
                <option value={11}>November</option>
                <option value={12}>Desember</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <Button className="w-full flex items-center gap-2">
                <Search className="h-4 w-4" />
                Cari Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total SPK</p>
                <p className="text-2xl font-bold text-blue-800">85</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Nilai Total</p>
                <p className="text-lg font-bold text-green-800">Rp 1.39 M</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Dalam Proses</p>
                <p className="text-2xl font-bold text-amber-800">32</p>
              </div>
              <Calendar className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Selesai</p>
                <p className="text-2xl font-bold text-purple-800">53</p>
              </div>
              <Download className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Rekap */}
      <Card>
        <CardHeader>
          <CardTitle>Rekap SPK per Bulan - {tahun}</CardTitle>
          <CardDescription>
            Data rekapitulasi Surat Perjanjian Kerja berdasarkan bulan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="border p-3 text-left font-medium">Bulan</th>
                  <th className="border p-3 text-left font-medium">Jumlah SPK</th>
                  <th className="border p-3 text-left font-medium">Nilai Total</th>
                  <th className="border p-3 text-left font-medium">Status</th>
                  <th className="border p-3 text-left font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dataRekap.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="border p-3 font-medium">{item.bulan}</td>
                    <td className="border p-3">{item.jumlahSPK}</td>
                    <td className="border p-3">{formatRupiah(item.nilaiTotal)}</td>
                    <td className="border p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === "Selesai" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="border p-3">
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}