
import React from "react";
import Layout from "@/components/Layout";
import GoogleSheetsData from "@/components/GoogleSheetsData";

export default function GoogleSheetsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Data Google Sheets</h1>
          <p className="text-sm text-muted-foreground">
            Data dari Google Spreadsheet ditampilkan di sini
          </p>
        </div>
        
        <GoogleSheetsData 
          sheetName="Sheet1" 
          range="A1:Z1000" 
          title="Data Spreadsheet" 
        />
      </div>
    </Layout>
  );
}
