
import React from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";

const StockOpname = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Opname</h1>
          <p className="text-muted-foreground">
            Halaman untuk manajemen stock opname inventaris.
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <img 
                src="/lovable-uploads/459d5e42-9ffb-4efe-8bdc-3d5756ad7aed.png" 
                alt="Coming Soon" 
                className="max-w-xs mx-auto mb-6"
              />
              <h2 className="text-3xl font-bold mb-2">Coming Soon</h2>
              <p className="text-muted-foreground max-w-md">
                Fitur Stock Opname sedang dalam pengembangan dan akan segera tersedia. 
                Silakan kembali nanti untuk mengakses fitur ini.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StockOpname;
