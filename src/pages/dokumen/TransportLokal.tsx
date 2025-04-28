
import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TransportLokal = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transport Lokal</h1>
          <p className="text-sm text-muted-foreground">
            Transport Lokal (Pendataan, Pemeriksaan, Supervisi)
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-yellow-100 p-4 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-6 text-xl font-semibold">Fitur Coming Soon</h2>
            <p className="mt-2 text-muted-foreground">
              Fitur ini sedang dalam pengembangan dan akan tersedia dalam waktu dekat.
            </p>
            <Button 
              className="mt-6" 
              variant="outline" 
              onClick={() => navigate("/buat-dokumen")}
            >
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TransportLokal;
