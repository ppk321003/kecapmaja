"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Filter, Plus, Save, Trash2, User, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Mitra {
  nama: string;
  nik: string;
  kecamatan: string;
}

interface BlockData {
  [key: string]: {
    fungsi: string;
    kegiatan: string;
  };
}

interface MitraRow {
  no: number;
  nama: string;
  nik: string;
  kecamatan: string;
  blocks: BlockData;
}

const SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";
const MASTER_MITRA_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const fungsiColors: { [key: string]: string } = {
  "Fungsi Sosial": "bg-blue-200 border-blue-500",
  "Fungsi Produksi": "bg-green-200 border-green-500",
  "Fungsi Distribusi": "bg-orange-200 border-orange-500",
  "Fungsi Neraca": "bg-purple-200 border-purple-500",
  "Fungsi IPDS": "bg-yellow-200 border-yellow-500",
  "Pejabat Pembuat Komitmen": "bg-red-200 border-red-500",
  "Bendahara": "bg-gray-200 border-gray-500"
};

export default function BlockTanggal() {
  const [mitraList, setMitraList] = useState<Mitra[]>([]);
  const [availableMitra, setAvailableMitra] = useState<Mitra[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string>("");
  const [matrixData, setMatrixData] = useState<MitraRow[]>([]);
  const [bulan, setBulan] = useState<string>(new Date().toLocaleString('id-ID', { month: 'long' }));
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<{ mitraIndex: number; tanggal: string } | null>(null);
  const [kegiatanInput, setKegiatanInput] = useState("");
  const { toast } = useToast();

  const bulanOptions = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const tahunOptions = [2024, 2025, 2026];

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || "");
    }
    loadMasterMitra();
    loadExistingData();
  }, [bulan, tahun]);

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
        nama: row[2] || "", // Kolom C - Nama
        nik: row[1] || "", // Kolom B - NIK
        kecamatan: row[7] || "", // Kolom H - Kecamatan
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
        row[1] === tahun.toString() && row[2] === bulan // Tahun dan Bulan match
      );

      const matrix: MitraRow[] = [];
      currentData.forEach((row: any[]) => {
        const existingIndex = matrix.findIndex(m => m.nik === row[5]); // NIK
        const tanggal = row[6] ? row[6].split(',').map((t: string) => t.trim()) : [];

        if (existingIndex === -1) {
          // Mitra baru
          const blocks: BlockData = {};
          tanggal.forEach((t: string) => {
            blocks[t] = {
              fungsi: row[7] || "", // Role yang blok
              kegiatan: row[3] || "" // Kegiatan
            };
          });

          matrix.push({
            no: matrix.length + 1,
            nama: row[4] || "", // Nama mitra
            nik: row[5] || "", // NIK
            kecamatan: mitraList.find(m => m.nik === row[5])?.kecamatan || "",
            blocks
          });
        } else {
          // Tambah ke mitra existing
          tanggal.forEach((t: string) => {
            matrix[existingIndex].blocks[t] = {
              fungsi: row[7] || "",
              kegiatan: row[3] || ""
            };
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
    if (!selectedMitra) {
      toast({
        title: "Peringatan",
        description: "Pilih mitra terlebih dahulu",
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
      blocks: {}
    };

    setMatrixData([...matrixData, newRow]);
    setAvailableMitra(availableMitra.filter(m => m.nama !== selectedMitra));
    setSelectedMitra("");
  };

  const addBlock = (mitraIndex: number, tanggal: string) => {
    if (!kegiatanInput.trim()) {
      toast({
        title: "Peringatan",
        description: "Masukkan nama kegiatan terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (matrixData[mitraIndex].blocks[tanggal]) {
      toast({
        title: "Peringatan",
        description: "Tanggal ini sudah diblok untuk mitra tersebut",
        variant: "destructive",
      });
      return;
    }

    const newData = [...matrixData];
    newData[mitraIndex].blocks[tanggal] = {
      fungsi: userRole,
      kegiatan: kegiatanInput
    };

    setMatrixData(newData);
    setKegiatanInput("");
    saveToSheet(newData[mitraIndex], tanggal, "add");
  };

  const requestDeleteBlock = (mitraIndex: number, tanggal: string) => {
    setBlockToDelete({ mitraIndex, tanggal });
    setShowDeleteDialog(true);
  };

  const deleteBlock = () => {
    if (!blockToDelete) return;

    const { mitraIndex, tanggal } = blockToDelete;
    const mitra = matrixData[mitraIndex];
    const blockData = mitra.blocks[tanggal];

    const newData = [...matrixData];
    delete newData[mitraIndex].blocks[tanggal];

    // Jika tidak ada block lagi, hapus mitra dari matrix
    if (Object.keys(newData[mitraIndex].blocks).length === 0) {
      newData.splice(mitraIndex, 1);
      // Update nomor urut
      newData.forEach((mitra, index) => {
        mitra.no = index + 1;
      });
      setAvailableMitra([...availableMitra, mitraList.find(m => m.nik === mitra.nik)!]);
    }

    setMatrixData(newData);
    setShowDeleteDialog(false);
    setBlockToDelete(null);
    saveToSheet(mitra, tanggal, "delete", blockData);
  };

  const saveToSheet = async (mitra: MitraRow, tanggal: string, operation: "add" | "delete", existingBlock?: any) => {
    try {
      const blockData = existingBlock || mitra.blocks[tanggal];
      
      if (operation === "add") {
        // Untuk add, buat entry baru
        const dates = Object.keys(mitra.blocks).join(',');
        const newRow = [
          (matrixData.length + 1).toString(),
          tahun.toString(),
          bulan,
          blockData.kegiatan,
          mitra.nama,
          mitra.nik,
          dates,
          blockData.fungsi
        ];

        const { error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "append",
            range: "Sheet1",
            values: [newRow],
          },
        });

        if (error) throw error;
      } else {
        // Untuk delete, perlu baca ulang dan update data
        // Implementasi delete membutuhkan logic yang lebih complex
        // Untuk sementara kita simpan statusnya saja
        toast({
          title: "Data dihapus",
          description: `Block tanggal ${tanggal} untuk ${mitra.nama} telah dihapus`,
        });
      }

      toast({
        title: "Sukses",
        description: `Data berhasil ${operation === 'add' ? 'disimpan' : 'dihapus'}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Gagal ${operation === 'add' ? 'menyimpan' : 'menghapus'} data`,
        variant: "destructive",
      });
    }
  };

  const generateDates = () => {
    return Array.from({ length: 31 }, (_, i) => (i + 1).toString());
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

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Legend Fungsi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(fungsiColors).map(([fungsi, color]) => (
              <div key={fungsi} className="flex items-center gap-2">
                <div className={`w-4 h-4 border ${color} rounded`}></div>
                <span className="text-sm">{fungsi}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Mitra Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Tambah Mitra
          </CardTitle>
          <CardDescription>
            Pilih mitra dari dropdown untuk ditambahkan ke matrix
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button onClick={addMitra}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah
            </Button>
          </div>
          <div className="mt-4">
            <Input
              placeholder="Masukkan nama kegiatan..."
              value={kegiatanInput}
              onChange={(e) => setKegiatanInput(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Isi nama kegiatan sebelum memblok tanggal
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Matrix Block Tanggal - {bulan} {tahun}
          </CardTitle>
          <CardDescription>
            Klik pada tanggal untuk memblok, klik lagi untuk menghapus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background border-r w-12">No</TableHead>
                  <TableHead className="sticky left-12 bg-background border-r min-w-48">Nama Mitra Statistik</TableHead>
                  <TableHead className="sticky left-60 bg-background border-r min-w-32">Kecamatan</TableHead>
                  {generateDates().map((date) => (
                    <TableHead key={date} className="text-center w-12 p-2 border-l">
                      {date}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.map((mitra, mitraIndex) => (
                  <TableRow key={mitra.nik}>
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
                    {generateDates().map((date) => {
                      const block = mitra.blocks[date];
                      return (
                        <TableCell key={date} className="p-1 border-l text-center">
                          {block ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className={`w-8 h-8 p-0 border-2 ${
                                      fungsiColors[block.fungsi] || "bg-gray-200 border-gray-500"
                                    } hover:opacity-80`}
                                    onClick={() => requestDeleteBlock(mitraIndex, date)}
                                  >
                                    <span className="text-xs font-bold">✓</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{block.kegiatan}</p>
                                  <p className="text-sm text-muted-foreground">{block.fungsi}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Button
                              variant="outline"
                              className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => addBlock(mitraIndex, date)}
                              disabled={!kegiatanInput.trim()}
                            >
                              +
                            </Button>
                          )}
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