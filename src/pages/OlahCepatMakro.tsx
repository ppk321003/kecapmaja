import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowUpDown, Loader2, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SPREADSHEET_ID = "1UDTH1zyCfs7OEFDQugQBUEoVg2L-KZ5e1sx4NwODPxM";
const SHEET_NAMES = [
  "P_Jenis_Atap",
  "P_Jenis_Lantai",
  "P_Jenis_Dinding",
  "P_Kondisi_Atap",
  "P_Kondisi_Lantai",
  "P_Kondisi_Dinding",
  "P_Kepemilikan_Rumah",
  "P_Bukti_Kepemilikan",
  "P_Fas_BAB",
  "P_Jns_Kloset",
  "P_Buang_Tinja",
  "P_Sumber_Minum",
  "P_Sumber_Listrik",
  "Rerata_Pengeluaran",
  "P_Ijazah",
  "P_Status_Kerja",
  "Disabilitas",
  "Sakit_Kronis",
] as const;

interface SheetData {
  headers: string[];
  rows: string[][];
}

const prettifyHeader = (value: string, index: number) => {
  const text = String(value || `Kolom ${index + 1}`)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.replace(/\b\w/g, (character) => character.toUpperCase()) || `Kolom ${index + 1}`;
};

const fetchSheetData = async (sheetName: string): Promise<SheetData> => {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Google Sheets mengembalikan status ${response.status}`);

  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);
  if (!match) throw new Error("Respons Google Sheets tidak valid atau sheet belum dapat diakses publik.");

  const parsed = JSON.parse(match[1]);
  const table = parsed?.table;
  if (parsed?.status === "error" || !table) throw new Error(parsed?.errors?.[0]?.detailed_message || "Data sheet tidak tersedia.");

  const headers = (table.cols || []).map((column: any, index: number) => prettifyHeader(column?.label || column?.id, index));
  const rows = (table.rows || []).map((row: any) =>
    headers.map((_, index) => {
      const cell = row?.c?.[index];
      return String(cell?.f ?? cell?.v ?? "").trim();
    }),
  );

  return { headers, rows: rows.filter((row) => row.some(Boolean)) };
};

const formatCell = (value: string) => {
  if (!value) return "-";
  return value;
};

export default function OlahCepatMakro() {
  const [activeSheet, setActiveSheet] = useState<string>(SHEET_NAMES[0]);
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { data, isPending, error } = useQuery({
    queryKey: ["olah-cepat-makro-sheet", activeSheet],
    queryFn: () => fetchSheetData(activeSheet),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setSearch("");
    setSortColumn(null);
    setSortDirection("asc");
  }, [activeSheet]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = (data?.rows || []).filter((row) => !needle || row.some((value) => value.toLowerCase().includes(needle)));
    if (sortColumn === null) return rows;
    return [...rows].sort((left, right) => left[sortColumn].localeCompare(right[sortColumn], "id", { numeric: true }) * (sortDirection === "asc" ? 1 : -1));
  }, [data?.rows, search, sortColumn, sortDirection]);

  const toggleSort = (column: number) => {
    if (sortColumn === column) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  return (
    <div className="w-full max-w-none space-y-4 px-2 py-3 sm:space-y-6 sm:px-0 sm:py-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Olah Cepat Makro</h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">Tabel olahan indikator makro, kependudukan dan sosial ekonomi tingkat kecamatan.</p>
      </div>

      <Tabs value={activeSheet} onValueChange={setActiveSheet} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50 p-2 text-xs shadow-lg shadow-slate-200/80 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9">
          {SHEET_NAMES.map((sheetName) => (
            <TabsTrigger key={sheetName} value={sheetName} title={sheetName} className="min-h-10 whitespace-normal rounded-lg border border-transparent px-2 py-1.5 text-center text-[11px] font-medium leading-tight text-slate-600 transition-all duration-200 hover:border-sky-200 hover:bg-white hover:text-sky-700 hover:shadow-sm data-[state=active]:border-sky-300 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:text-sky-700 data-[state=active]:shadow-md data-[state=active]:shadow-sky-100">
              {sheetName.replace(/^P_/i, "").replace(/_/g, " ")}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeSheet} className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari data..." className="h-9 w-full pl-9 text-xs sm:h-10 sm:text-sm" />
              </div>
            </div>

            {isPending ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Memuat data dari Google Sheets...</div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-rose-600"><AlertCircle className="h-5 w-5" />{(error as Error).message}</div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-500">Data dari sheet <span className="font-semibold text-slate-700">{activeSheet}</span></div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{filteredRows.length} record</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow className="border-slate-700 bg-slate-800 hover:bg-slate-800">
                        <TableHead className="w-14 text-center text-xs font-bold text-white">No</TableHead>
                        {(data?.headers || []).map((header, index) => (
                          <TableHead key={`${header}-${index}`} onClick={() => toggleSort(index)} className="cursor-pointer whitespace-normal break-words px-3 py-3 text-center align-middle text-xs font-semibold leading-tight text-white hover:bg-slate-700">
                            <span className="inline-flex max-w-[180px] items-center justify-center gap-1 whitespace-normal break-words">{header}<ArrowUpDown className={`h-3 w-3 shrink-0 ${sortColumn === index ? "text-cyan-300" : "text-slate-400"}`} /></span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.length === 0 ? (
                        <TableRow><TableCell colSpan={(data?.headers.length || 0) + 1} className="py-12 text-center text-sm text-slate-500">Tidak ada data.</TableCell></TableRow>
                      ) : filteredRows.map((row, rowIndex) => (
                        <TableRow key={`${activeSheet}-${rowIndex}`} className={`border-slate-100 ${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/80"} hover:bg-cyan-50`}>
                          <TableCell className="text-center text-xs font-semibold text-slate-400">{rowIndex + 1}</TableCell>
                          {(data?.headers || []).map((_, columnIndex) => <TableCell key={columnIndex} className="whitespace-nowrap text-xs text-slate-700">{formatCell(row[columnIndex] || "")}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-xs text-slate-500">Menampilkan seluruh {filteredRows.length} data</div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
