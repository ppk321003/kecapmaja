
import React, { useState } from "react";
import Layout from "@/components/Layout";
import GoogleSheetsData from "@/components/GoogleSheetsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function GoogleSheetsPage() {
  const [selectedSheet, setSelectedSheet] = useState("DaftarHadir");
  
  const sheets = [
    { id: "DaftarHadir", name: "Daftar Hadir" },
    { id: "Organik", name: "Organik BPS" },
    { id: "Mitra", name: "Mitra Statistik" }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Data Google Sheets</h1>
          <p className="text-sm text-muted-foreground">
            Data dari Google Spreadsheet yang digunakan dalam aplikasi
          </p>
        </div>
        
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pilih Sheet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sheet-select">Sheet</Label>
                <Select 
                  value={selectedSheet} 
                  onValueChange={setSelectedSheet}
                >
                  <SelectTrigger id="sheet-select">
                    <SelectValue placeholder="Pilih sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map(sheet => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        {sheet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => window.open("https://docs.google.com/spreadsheets/d/1aVoCmwZCmkihEOJ9ommE5kccep7uJv6oulI5R3EpOCg/edit", "_blank")}
                >
                  Buka Spreadsheet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <GoogleSheetsData 
          sheetName={selectedSheet}
          range="A1:Z1000" 
          title={`Data ${sheets.find(s => s.id === selectedSheet)?.name || selectedSheet}`} 
        />
      </div>
    </Layout>
  );
}
