
import React from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Database } from "lucide-react";

const StockOpname = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Opname</h1>
          <p className="text-muted-foreground">
            Manage inventaris dan stock barang.
          </p>
        </div>

        <Card className="flex flex-col items-center justify-center p-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <Database className="h-24 w-24 text-muted-foreground" />
            <h2 className="text-3xl font-bold text-primary">Coming Soon</h2>
            <p className="text-lg text-muted-foreground max-w-md">
              Fitur Stock Opname sedang dalam pengembangan dan akan segera hadir untuk membantu manajemen inventaris Anda.
            </p>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span className="inline-block h-3 w-3 rounded-full bg-yellow-500"></span>
              <p>Dalam proses pengembangan</p>
            </div>
          </div>
          
          <div className="mt-10 border-t pt-6 w-full">
            <h3 className="font-semibold mb-2">Fitur yang akan datang:</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Pencatatan dan pelacakan inventaris</li>
              <li>Notifikasi untuk stok menipis</li>
              <li>Laporan penggunaan inventaris</li>
              <li>Manajemen permintaan dan pengadaan barang</li>
              <li>Integrasi dengan sistem pengadaan</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default StockOpname;
