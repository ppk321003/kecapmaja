"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Trash2, User, Users, X, CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface Mitra {
  nama: string;
  nik: string;
  kecamatan: string;
}

interface Organik {
  nama: string;
  nip: string;
  jabatan: string;
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
  penanggungJawab: string;
  blocks: BlockData;
  isOrganik: boolean;
}

const SPREADSHEET_ID = "14iyeMPMvlBLlM-JKDDnlPgnx6WGS_U8yOZyMTIu-rn0";
const MASTER_MITRA_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

export default function BlockTanggal() {
  const [mitraList, setMitraList] = useState<Mitra[]>([]);
  const [organikList, setOrganikList] = useState<Organik[]>([]);
  const [availableMitra, setAvailableMitra] = useState<Mitra[]>([]);
  const [availableOrganik, setAvailableOrganik] = useState<Organik[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string>("");
  const [selectedOrganik, setSelectedOrganik] = useState<string>("");
  const [matrixData, setMatrixData] = useState<MitraRow[]>([]);
  const [bulan, setBulan] = useState<string>(new Date().toLocaleString('id-ID', { month: 'long' }));
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [userRole, setUserRole] = useState<string>("");
  const [kegiatanInput, setKegiatanInput] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteMitraDialog, setShowDeleteMitraDialog] = useState(false);
  const [mitraToDelete, setMitraToDelete] = useState<number | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<{ mitraIndex: number; tanggal: string } | null>(null);
  const [selectedMitraForDates, setSelectedMitraForDates] = useState<number | null>(null);

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
    loadMasterOrganik();
  }, []);

  useEffect(() => {
    if (mitraList.length > 0 || organikList.length > 0) {
      loadExistingData();
    }
  }, [bulan, tahun, mitraList, organikList]);

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

  const loadMasterOrganik = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_MITRA_SHEET_ID,
          operation: "read",
          range: "MASTER.ORGANIK",
        },
      });

      if (error) throw error;

      const rows = data.values || [];
      const organikData: Organik[] = rows.slice(1).map((row: any[]) => ({
        nama: row[3] || "", // Kolom D - Nama
        nip: row[2] || "",  // Kolom C - NIP
        jabatan: row[4] || "", // Kolom E - Jabatan
      }));

      setOrganikList(organikData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data master organik",
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
        const penanggungJawab = row[7] || "";

        // Cek apakah ini organik atau mitra
        const isOrganik = organikList.some(org => org.nama === namaMitra);
        
        const existingIndex = matrix.findIndex(m => 
          m.nik === nikMitra && m.kegiatan === kegiatan && m.isOrganik === isOrganik
        );
        
        if (existingIndex === -1) {
          const blocks: BlockData = {};
          tanggal.forEach((t: string) => {
            blocks[t] = kegiatan;
          });

          matrix.push({
            no: matrix.length + 1,
            nama: namaMitra,
            nik: nikMitra,
            kecamatan: isOrganik ? 
              organikList.find(org => org.nama === namaMitra)?.jabatan || "" : 
              mitraList.find(m => m.nik === nikMitra)?.kecamatan || "",
            kegiatan: kegiatan,
            penanggungJawab: penanggungJawab,
            blocks,
            isOrganik
          });
        } else {
          tanggal.forEach((t: string) => {
            matrix[existingIndex].blocks[t] = kegiatan;
          });
        }
      });

      setMatrixData(matrix);
      updateAvailableData(matrix);
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

  const updateAvailableData = (currentMatrix: MitraRow[]) => {
    const usedNiks = currentMatrix.map(m => m.nik);
    const usedOrganikNames = currentMatrix.filter(m => m.isOrganik).map(m => m.nama);
    
    const availableMitraData = mitraList.filter(mitra => !usedNiks.includes(mitra.nik));
    const availableOrganikData = organikList.filter(org => !usedOrganikNames.includes(org.nama));
    
    setAvailableMitra(availableMitraData);
    setAvailableOrganik(availableOrganikData);
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
      kegiatan: "",
      penanggungJawab: userRole,
      blocks: {},
      isOrganik: false
    };

    setMatrixData([...matrixData, newRow]);
    setAvailableMitra(availableMitra.filter(m => m.nama !== selectedMitra));
    setSelectedMitra("");
  };

  const addOrganik = () => {
    if (!selectedOrganik) {
      toast({
        title: "Peringatan",
        description: "Pilih organik terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    const selected = availableOrganik.find(org => org.nama === selectedOrganik);
    if (!selected) return;

    const newRow: MitraRow = {
      no: matrixData.length + 1,
      nama: selected.nama,
      nik: selected.nip,
      kecamatan: selected.jabatan,
      kegiatan: "",
      penanggungJawab: userRole,
      blocks: {},
      isOrganik: true
    };

    setMatrixData([...matrixData, newRow]);
    setAvailableOrganik(availableOrganik.filter(org => org.nama !== selectedOrganik));
    setSelectedOrganik("");
  };

  const requestDeleteMitra = (mitraIndex: number) => {
    setMitraToDelete(mitraIndex);
    setShowDeleteMitraDialog(true);
  };

  const deleteMitra = () => {
    if (mitraToDelete === null) return;

    const mitra = matrixData[mitraToDelete];
    
    const newData = [...matrixData];
    newData.splice(mitraToDelete, 1);
    
    // Update nomor urut
    newData.forEach((mitra, index) => {
      mitra.no = index + 1;
    });

    setMatrixData(newData);
    
    // Kembalikan ke available list
    if (mitra.isOrganik) {
      setAvailableOrganik([...availableOrganik, organikList.find(org => org.nama === mitra.nama)!]);
    } else {
      setAvailableMitra([...availableMitra, mitraList.find(m => m.nik === mitra.nik)!]);
    }
    
    setShowDeleteMitraDialog(false);
    setMitraToDelete(null);

    // Hapus dari spreadsheet
    deleteFromSheet(mitra);
  };

  const openDatePicker = (mitraIndex: number) => {
    setSelectedMitraForDates(mitraIndex);
    setSelectedDates([]);
    setKegiatanInput("");
  };

  const saveDates = async () => {
    if (selectedMitraForDates === null) {
      toast({
        title: "Error",
        description: "Tidak ada mitra yang dipilih",
        variant: "destructive",
      });
      return;
    }

    if (selectedDates.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu tanggal",
        variant: "destructive",
      });
      return;
    }

    if (!kegiatanInput.trim()) {
      toast({
        title: "Error",
        description: "Masukkan nama kegiatan",
        variant: "destructive",
      });
      return;
    }

    const newData = [...matrixData];
    const mitraIndex = selectedMitraForDates;
    
    // Tambahkan blocks untuk setiap tanggal yang dipilih
    selectedDates.forEach(date => {
      const tanggal = date.getDate().toString();
      newData[mitraIndex].blocks[tanggal] = kegiatanInput;
    });

    // Update kegiatan dengan format yang diinginkan
    const existingKegiatan = newData[mitraIndex].kegiatan;
    const newKegiatanEntry = `${kegiatanInput} (${selectedDates.map(d => d.getDate()).sort((a, b) => a - b).join(',')})`;
    
    if (existingKegiatan) {
      newData[mitraIndex].kegiatan = `${existingKegiatan} - ${newKegiatanEntry}`;
    } else {
      newData[mitraIndex].kegiatan = newKegiatanEntry;
    }

    newData[mitraIndex].penanggungJawab = userRole;

    setMatrixData(newData);
    setKegiatanInput("");
    setSelectedDates([]);
    setSelectedMitraForDates(null);

    await saveToSheet(newData[mitraIndex]);
  };

  const getBlockedDatesCount = (mitra: MitraRow) => {
    return Object.keys(mitra.blocks).length;
  };

  const getKegiatanDisplay = (mitra: MitraRow) => {
    if (!mitra.kegiatan) return "Belum ada kegiatan";
    
    // Format: "Rapat evaluasi (2,3,5) - Pendataan sakernas (4,10)"
    return mitra.kegiatan;
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
        row[5] === mitra.nik
      );

      const newRow = [
        (existingRowIndex === -1 ? rows.length + 1 : existingRowIndex + 1).toString(),
        tahun.toString(),
        bulan,
        mitra.kegiatan,
        mitra.nama,
        mitra.nik,
        dates,
        userRole // Role yang melakukan block - TEREKAM
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
      console.error('Save error:', error);
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
        row[5] === mitra.nik
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

      {/* Add Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Tambah Data
          </CardTitle>
          <CardDescription>
            Pilih mitra atau organik untuk ditambahkan ke daftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tambah Mitra */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tambah Mitra</label>
              <div className="flex gap-2">
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
                <Button onClick={addMitra} disabled={!selectedMitra}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah
                </Button>
              </div>
            </div>

            {/* Tambah Organik */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tambah Organik</label>
              <div className="flex gap-2">
                <Select value={selectedOrganik} onValueChange={setSelectedOrganik}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih Organik..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrganik.map((organik) => (
                      <SelectItem key={organik.nip} value={organik.nama}>
                        {organik.nama} - {organik.nip}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addOrganik} disabled={!selectedOrganik}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>
              Daftar <span className="text-black">Mitra</span> - <span className="text-red-500">{bulan} {tahun}</span>
            </CardTitle>
          </div>
          <CardDescription>
            Kelola tanggal block untuk setiap mitra dan organik
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead className="min-w-48">Nama</TableHead>
                  <TableHead className="min-w-32">{matrixData.some(m => m.isOrganik) ? "Jabatan/Kecamatan" : "Kecamatan"}</TableHead>
                  <TableHead className="min-w-40">Kegiatan</TableHead>
                  <TableHead className="min-w-32">Penanggung Jawab</TableHead>
                  <TableHead className="min-w-24">Jumlah</TableHead>
                  <TableHead className="min-w-32">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.map((data, index) => (
                  <TableRow key={`${data.nik}-${data.isOrganik}`}>
                    <TableCell className="font-medium">
                      {data.no}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{data.nama}</div>
                          <div className="text-xs text-muted-foreground">
                            {data.isOrganik ? `NIP: ${data.nik}` : `NIK: ${data.nik}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {data.kecamatan}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="max-w-[300px] truncate">
                              {getKegiatanDisplay(data)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[400px]">
                            <div className="space-y-1">
                              <p className="font-semibold">Detail Kegiatan:</p>
                              <p>{getKegiatanDisplay(data)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{data.penanggungJawab}</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-full">
                        {getBlockedDatesCount(data)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openDatePicker(index)}>
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              Pilih Tanggal
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4" align="start">
                            <div className="space-y-4">
                              <div className="text-sm font-medium">Pilih Tanggal untuk {data.nama}</div>
                              <CalendarComponent
                                mode="multiple"
                                selected={selectedDates}
                                onSelect={setSelectedDates}
                                className="rounded-md border"
                                locale={id}
                              />
                              <Input
                                placeholder="Nama kegiatan"
                                value={kegiatanInput}
                                onChange={(e) => setKegiatanInput(e.target.value)}
                              />
                              <div className="text-xs text-muted-foreground">
                                Tanggal terpilih: {selectedDates.map(d => d.getDate()).join(', ')}
                              </div>
                              <Button 
                                onClick={saveDates}
                                className="w-full"
                                disabled={selectedDates.length === 0 || !kegiatanInput.trim()}
                              >
                                Simpan Tanggal
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => requestDeleteMitra(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Mitra Confirmation Dialog */}
      <Dialog open={showDeleteMitraDialog} onOpenChange={setShowDeleteMitraDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Data</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data ini? Semua data tanggal block akan ikut terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteMitraDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={deleteMitra}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}