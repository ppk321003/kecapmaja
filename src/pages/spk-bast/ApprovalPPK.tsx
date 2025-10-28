"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Trash2, User, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Mitra {
  nama: string;
  nik: string;
  kecamatan: string;
}

interface BlockData {
  [key: string]: string; // tanggal -> kegiatan
}

interface MitraRow {
  no: number;
  nama: string;
  nik: string;
  kecamatan: string;
  kegiatan: string;
  blocks: BlockData;
}

const SPREADSHEET_ID = "14iyeMPMvlBLlM-JKDDnlPgnx6WGS_U8yOZyMTIu-rn0";
const MASTER_MITRA_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const fungsiColors: { [key: string]: string } = {
  "Fungsi Sosial": "bg-blue-100 border-blue-400 hover:bg-blue-200",
  "Fungsi Produksi": "bg-green-100 border-green-400 hover:bg-green-200",
  "Fungsi Distribusi": "bg-orange-100 border-orange-400 hover:bg-orange-200",
  "Fungsi Neraca": "bg-purple-100 border-purple-400 hover:bg-purple-200",
  "Fungsi IPDS": "bg-yellow-100 border-yellow-400 hover:bg-yellow-200",
  "Pejabat Pembuat Komitmen": "bg-red-100 border-red-400 hover:bg-red-200",
  "Bendahara": "bg-gray-100 border-gray-400 hover:bg-gray-200"
};

export default function BlockTanggal() {
  const [mitraList, setMitraList] = useState<Mitra[]>([]);
  const [availableMitra, setAvailableMitra] = useState<Mitra[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string>("");
  const [matrixData, setMatrixData] = useState<MitraRow[]>([]);
  const [bulan, setBulan] = useState<string>(new Date().toLocaleString('id-ID', { month: 'long' }));
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [userRole, setUserRole] = useState<string>("");
  const [kegiatanInput, setKegiatanInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<{ mitraIndex: number; tanggal: string } | null>(null);

  const { toast } = useToast();

  const bulanOptions = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const tahunOptions = [2024, 2025, 2026];

  // Get days in month dynamically
  const getDaysInMonth = () => {
    const monthIndex = bulanOptions.indexOf(bulan);
    const date = new Date(tahun, monthIndex + 1, 0);
    return date.getDate();
  };

  const generateDates = () => {
    const daysInMonth = getDaysInMonth();
    return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || "");
    }
    loadMasterMitra();
  }, []);

  useEffect(() => {
    if (mitraList.length > 0) {
      loadExistingData();
    }
  }, [bulan, tahun, mitraList]);

  const loadMasterMitra = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_MITRA_SHEET_ID,
          operation: "read",
          range: "MASTER.MITRA",
        },
      });

      if (error) throw error;

      const rows = data.values || [];
      const mitraData: Mitra[] = rows.slice(1).map((row: any[]) => ({
        nama: row[2] || "",
        nik: row[1] || "",
        kecamatan: row[7] || "",
      }));

      setMitraList(mitraData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data master mitra",
        variant: "destructive",
      });
    }
  };

  const loadExistingData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (error) throw error;

      const rows = data.values || [];
      const currentData = rows.filter((row: any[]) => 
        row[1] === tahun.toString() && row[2] === bulan
      );

      const matrix: MitraRow[] = [];
      
      currentData.forEach((row: any[]) => {
        const namaMitra = row[4] || "";
        const nikMitra = row[5] || "";
        const kegiatan = row[3] || "";
        const tanggal = row[6] ? row[6].split(',').map((t: string) => t.trim()) : [];

        const existingIndex = matrix.findIndex(m => m.nik === nikMitra && m.kegiatan === kegiatan);
        
        if (existingIndex === -1) {
          const blocks: BlockData = {};
          tanggal.forEach((t: string) => {
            blocks[t] = kegiatan;
          });

          matrix.push({
            no: matrix.length + 1,
            nama: namaMitra,
            nik: nikMitra,
            kecamatan: mitraList.find(m => m.nik === nikMitra)?.kecamatan || "",
            kegiatan: kegiatan,
            blocks
          });
        } else {
          tanggal.forEach((t: string) => {
            matrix[existingIndex].blocks[t] = kegiatan;
          });
        }
      });

      setMatrixData(matrix);
      updateAvailableMitra(matrix);
      setIsLoading(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data existing",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const updateAvailableMitra = (currentMatrix: MitraRow[]) => {
    const usedNiks = currentMatrix.map(m => m.nik);
    const available = mitraList.filter(mitra => !usedNiks.includes(mitra.nik));
    setAvailableMitra(available);
  };

  const addMitra = () => {
    if (!selectedMitra || !kegiatanInput.trim()) {
      toast({
        title: "Peringatan",
        description: "Pilih mitra dan isi kegiatan terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    const selected = availableMitra.find(m => m.nama === selectedMitra);
    if (!selected) return;

    const newRow: MitraRow = {
      no: matrixData.length + 1,
      nama: selected.nama,
      nik: selected.nik,
      kecamatan: selected.kecamatan,
      kegiatan: kegiatanInput,
      blocks: {}
    };

    setMatrixData([...matrixData, newRow]);
    setAvailableMitra(availableMitra.filter(m => m.nama !== selectedMitra));
    setSelectedMitra("");
  };

  const addBlock = async (mitraIndex: number, tanggal: string) => {
    const mitra = matrixData[mitraIndex];
    
    if (mitra.blocks[tanggal]) {
      toast({
        title: "Peringatan",
        description: "Tanggal ini sudah diblok untuk mitra tersebut",
        variant: "destructive",
      });
      return;
    }

    const newData = [...matrixData];
    newData[mitraIndex].blocks[tanggal] = mitra.kegiatan;
    setMatrixData(newData);

    await saveToSheet(mitra);
  };

  const requestDeleteBlock = (mitraIndex: number, tanggal: string) => {
    setBlockToDelete({ mitraIndex, tanggal });
    setShowDeleteDialog(true);
  };

  const deleteBlock = async () => {
    if (!blockToDelete) return;

    const { mitraIndex, tanggal } = blockToDelete;
    const mitra = matrixData[mitraIndex];

    const newData = [...matrixData];
    delete newData[mitraIndex].blocks[tanggal];

    // Jika tidak ada block lagi, hapus mitra dari matrix
    if (Object.keys(newData[mitraIndex].blocks).length === 0) {
      newData.splice(mitraIndex, 1);
      newData.forEach((mitra, index) => {
        mitra.no = index + 1;
      });
      setAvailableMitra([...availableMitra, mitraList.find(m => m.nik === mitra.nik)!]);
    }

    setMatrixData(newData);
    setShowDeleteDialog(false);
    setBlockToDelete(null);

    if (Object.keys(newData[mitraIndex]?.blocks || {}).length > 0) {
      await saveToSheet(mitra);
    } else {
      await deleteFromSheet(mitra);
    }
  };

  const saveToSheet = async (mitra: MitraRow) => {
    try {
      const dates = Object.keys(mitra.blocks).sort((a, b) => parseInt(a) - parseInt(b)).join(',');
      
      // Cek apakah data sudah ada
      const { data: existingData, error: checkError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (checkError) throw checkError;

      const rows = existingData.values || [];
      const existingRowIndex = rows.findIndex((row: any[]) => 
        row[1] === tahun.toString() && 
        row[2] === bulan && 
        row[4] === mitra.nama && 
        row[5] === mitra.nik &&
        row[3] === mitra.kegiatan
      );

      const newRow = [
        (existingRowIndex === -1 ? rows.length + 1 : existingRowIndex + 1).toString(),
        tahun.toString(),
        bulan,
        mitra.kegiatan,
        mitra.nama,
        mitra.nik,
        dates,
        userRole // Role yang melakukan block
      ];

      let error;
      if (existingRowIndex === -1) {
        // Append new row
        const result = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "append",
            range: "Sheet1",
            values: [newRow],
          },
        });
        error = result.error;
      } else {
        // Update existing row
        const result = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "update",
            range: `Sheet1!A${existingRowIndex + 1}:H${existingRowIndex + 1}`,
            values: [newRow],
          },
        });
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Data berhasil disimpan",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data",
        variant: "destructive",
      });
    }
  };

  const deleteFromSheet = async (mitra: MitraRow) => {
    try {
      const { data: existingData, error: checkError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (checkError) throw checkError;

      const rows = existingData.values || [];
      const rowIndex = rows.findIndex((row: any[]) => 
        row[1] === tahun.toString() && 
        row[2] === bulan && 
        row[4] === mitra.nama && 
        row[5] === mitra.nik &&
        row[3] === mitra.kegiatan
      );

      if (rowIndex !== -1) {
        const { error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "delete",
            range: `Sheet1!A${rowIndex + 1}:H${rowIndex + 1}`,
          },
        });

        if (error) throw error;
      }

      toast({
        title: "Sukses",
        description: "Data berhasil dihapus",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menghapus data",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Memuat data...</p>
        </div>
      </div>
    );
  }

  const dates = generateDates();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Block Tanggal Mitra</h1>
          <p className="text-muted-foreground mt-2">
            Sistem tagging tanggal transport lokal untuk mitra statistik
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Select value={bulan} onValueChange={setBulan}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {bulanOptions.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tahun.toString()} onValueChange={(value) => setTahun(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              {tahunOptions.map((t) => (
                <SelectItem key={t} value={t.toString()}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Tambah Mitra
          </CardTitle>
          <CardDescription>
            Masukkan nama kegiatan dan pilih mitra untuk ditambahkan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              placeholder="Masukkan nama kegiatan..."
              value={kegiatanInput}
              onChange={(e) => setKegiatanInput(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Select value={selectedMitra} onValueChange={setSelectedMitra}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih Mitra..." />
              </SelectTrigger>
              <SelectContent>
                {availableMitra.map((mitra) => (
                  <SelectItem key={mitra.nik} value={mitra.nama}>
                    {mitra.nama} - {mitra.kecamatan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addMitra} disabled={!kegiatanInput.trim() || !selectedMitra}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Matrix Block Tanggal - {bulan} {tahun} ({dates.length} hari)
          </CardTitle>
          <CardDescription>
            Klik + untuk memblok tanggal, klik ✓ untuk menghapus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background border-r w-12">No</TableHead>
                  <TableHead className="sticky left-12 bg-background border-r min-w-48">Nama Mitra</TableHead>
                  <TableHead className="sticky left-60 bg-background border-r min-w-32">Kecamatan</TableHead>
                  <TableHead className="sticky left-92 bg-background border-r min-w-40">Kegiatan</TableHead>
                  {dates.map((date) => (
                    <TableHead key={date} className="text-center w-12 p-2 border-l">
                      {date}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.map((mitra, mitraIndex) => (
                  <TableRow key={`${mitra.nik}-${mitra.kegiatan}`}>
                    <TableCell className="sticky left-0 bg-background border-r font-medium">
                      {mitra.no}
                    </TableCell>
                    <TableCell className="sticky left-12 bg-background border-r">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {mitra.nama}
                      </div>
                    </TableCell>
                    <TableCell className="sticky left-60 bg-background border-r">
                      {mitra.kecamatan}
                    </TableCell>
                    <TableCell className="sticky left-92 bg-background border-r text-sm">
                      {mitra.kegiatan}
                    </TableCell>
                    {dates.map((date) => {
                      const hasBlock = mitra.blocks[date];
                      return (
                        <TableCell key={date} className="p-1 border-l text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {hasBlock ? (
                                  <Button
                                    variant="ghost"
                                    className={`w-8 h-8 p-0 border-2 ${
                                      fungsiColors[userRole] || "bg-gray-100 border-gray-400"
                                    } hover:opacity-80 transition-all`}
                                    onClick={() => requestDeleteBlock(mitraIndex, date)}
                                  >
                                    <span className="text-xs font-bold">✓</span>
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground border-dashed"
                                    onClick={() => addBlock(mitraIndex, date)}
                                  >
                                    +
                                  </Button>
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{hasBlock ? `Hapus block tanggal ${date}` : `Tambah block tanggal ${date}`}</p>
                                {hasBlock && <p className="text-xs">{mitra.kegiatan}</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Block Tanggal</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus block tanggal ini?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={deleteBlock}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}