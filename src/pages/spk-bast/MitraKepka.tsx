import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const MitraKepka = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: mitraData, loading } = useGoogleSheetsData({
    spreadsheetId: MASTER_SPREADSHEET_ID,
    sheetName: "MASTER.MITRA"
  });

  const filteredData = mitraData.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.nama?.toLowerCase().includes(searchLower) ||
      item.nik?.toLowerCase().includes(searchLower) ||
      item.kecamatan?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">Mitra Kepka</h1>
          <p className="text-sm text-muted-foreground">Data Mitra Kegiatan Keperluan Kegiatan</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <Input
                placeholder="Cari berdasarkan nama, NIK, atau kecamatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>NIK</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Pekerjaan</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Rekening</TableHead>
                      <TableHead>Kecamatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Tidak ada data yang ditemukan
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item, index) => (
                        <TableRow key={item.nik || index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.nik}</TableCell>
                          <TableCell className="font-medium">{item.nama}</TableCell>
                          <TableCell>{item.pekerjaan}</TableCell>
                          <TableCell>{item.alamat}</TableCell>
                          <TableCell>{item.bank}</TableCell>
                          <TableCell>{item.rekening}</TableCell>
                          <TableCell>{item.kecamatan}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              Total: {filteredData.length} mitra
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MitraKepka;
