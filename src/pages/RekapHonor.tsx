import React, { useState } from "react";
import { FileSpreadsheet, ExternalLink, Calendar, DollarSign, Users, Activity, ArrowUpDown } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useDocumentData } from "@/hooks/use-document-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RekapHonor = () => {
  const [activeTab, setActiveTab] = useState("2025");
  const [filter, setFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "total", direction: "desc" });

  const honorData = [
    {
      id: "2025",
      title: "2025",
      sheetId: "1b51_2anraWMF47DYGCGGCfXMwfopX68HSs3z2dwcDng",
      url: "https://docs.google.com/spreadsheets/d/1b51_2anraWMF47DYGCGGCfXMwfopX68HSs3z2dwcDng/edit?usp=sharing"
    },
    {
      id: "2024",
      title: "2024",
      sheetId: "1lDq7-8rspR8qt424P5gwRmbpUTCcndSTKlV9eR0QD3I",
      url: "https://docs.google.com/spreadsheets/d/1lDq7-8rspR8qt424P5gwRmbpUTCcndSTKlV9eR0QD3I/edit?usp=sharing"
    },
    {
      id: "2023",
      title: "2023",
      sheetId: "1f2eIDvVuF8N5X_UnrxmI99Y6vz4zY5TPDe6jq7X70Vw",
      url: "https://docs.google.com/spreadsheets/d/1f2eIDvVuF8N5X_UnrxmI99Y6vz4zY5TPDe6jq7X70Vw/edit?gid=1877950026#gid=1877950026"
    }
  ];

  const activeHonorData = honorData.find(item => item.id === activeTab) || honorData[0];

  const { data, isLoading, isError } = useDocumentData({
    sheetId: activeHonorData.sheetId
  });

  // Process data for better display
  const processedData = data?.map(item => ({
    ...item,
    total: item.total ? parseInt(item.total.replace(/\D/g, '')) : 0,
    formattedTotal: item.total ? `Rp ${parseInt(item.total.replace(/\D/g, '')).toLocaleString('id-ID')}` : '-',
    status: Math.random() > 0.7 ? 'Pending' : 'Completed' // Mock status for demo
  })) || [];

  // Filter data based on selection
  const filteredData = filter === "all" 
    ? processedData 
    : processedData.filter(item => item.status === filter);

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSummary = () => {
    const totalPayments = processedData.reduce((sum, item) => sum + item.total, 0);
    const completedPayments = processedData.filter(item => item.status === 'Completed').length;
    const pendingPayments = processedData.filter(item => item.status === 'Pending').length;
    
    return {
      totalPayments: `Rp ${totalPayments.toLocaleString('id-ID')}`,
      totalActivities: processedData.length,
      completedPayments,
      pendingPayments
    };
  };

  const summary = getSummary();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rekap Honor Mitra</h1>
          <p className="text-muted-foreground">
            Ringkasan pembayaran honor mitra per kegiatan berdasarkan tahun anggaran
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center">
            <TabsList>
              {honorData.map(item => (
                <TabsTrigger key={item.id} value={item.id}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {item.title}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button 
              variant="outline" 
              onClick={() => window.open(activeHonorData.url, '_blank')}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Buka Spreadsheet
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
                <Skeleton className="h-96 w-full rounded-lg" />
              </div>
            ) : isError ? (
              <Card>
                <CardHeader>
                  <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-8">
                    <p className="text-red-500">Gagal memuat data. Silakan coba lagi.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Pembayaran
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.totalPayments}</div>
                      <p className="text-xs text-muted-foreground">
                        seluruh periode {activeTab}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Kegiatan
                      </CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.totalActivities}</div>
                      <p className="text-xs text-muted-foreground">
                        seluruh kegiatan
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Pembayaran Selesai
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.completedPayments}</div>
                      <p className="text-xs text-muted-foreground">
                        pembayaran telah diterima
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Pembayaran Tertunda
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.pendingPayments}</div>
                      <p className="text-xs text-muted-foreground">
                        menunggu verifikasi
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Data Table */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Detail Pembayaran</CardTitle>
                        <CardDescription>
                          Daftar lengkap pembayaran honor mitra tahun {activeTab}
                        </CardDescription>
                      </div>
                      <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Status</SelectItem>
                          <SelectItem value="Completed">Selesai</SelectItem>
                          <SelectItem value="Pending">Tertunda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => requestSort('kegiatan')}
                          >
                            <div className="flex items-center">
                              Kegiatan
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead>Mitra</TableHead>
                          <TableHead 
                            className="text-right cursor-pointer hover:bg-gray-50"
                            onClick={() => requestSort('total')}
                          >
                            <div className="flex items-center justify-end">
                              Jumlah
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedData.length > 0 ? (
                          sortedData.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {item.kegiatan || '-'}
                              </TableCell>
                              <TableCell>{item.mitra || '-'}</TableCell>
                              <TableCell className="text-right">
                                {item.formattedTotal}
                              </TableCell>
                              <TableCell>
                                {item.tanggal || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={item.status === 'Completed' ? 'default' : 'secondary'}
                                  className={item.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                                >
                                  {item.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              Tidak ada data yang tersedia
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default RekapHonor;