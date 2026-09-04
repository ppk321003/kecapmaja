import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowUpDown, BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SPREADSHEET_ID = "1L9DoumvBasjqI2zmCDCnVjkwq6vJ2FwLVfrL2yiB-Uo";
const SHEET_NAME = "KECAMATAN";
const SHEET_2025_GID = "1575529615";

const CATEGORIES = [
  ["A", "Pertanian, Kehutanan, dan Perikanan"],
  ["B", "Pertambangan dan Penggalian"],
  ["C", "Industri Pengolahan"],
  ["D", "Pengadaan Listrik, Gas, Uap/Air Panas dan Udara Dingin"],
  [
    "E",
    "Penyediaan Air; Pengelolaan Air Limbah, Penanganan Limbah, dan Remediasi",
  ],
  ["F", "Konstruksi"],
  ["G", "Perdagangan Besar Dan Eceran"],
  ["H", "Transportasi dan Penyimpanan"],
  ["I", "Penyediaan Akomodasi dan Penyediaan Makan Minum"],
  ["J", "Aktivitas Penerbitan, Penyiaran, Produksi dan Distribusi Konten"],
  ["K", "Aktivitas Telekomunikasi, Pemrograman Komputer, dll"],
  ["L", "Aktivitas Keuangan dan Asuransi"],
  ["M", "Real Estat"],
  ["N,O", "Aktivitas Profesional, Ilmiah, dan Teknis"],
  ["P", "Administrasi Pemerintahan, Pertahanan, dll"],
  ["Q", "Pendidikan"],
  ["R", "Aktivitas Kesehatan Manusia, dan Aktivitas Sosial"],
  ["S,U", "Kesenian, Olahraga, dan Rekreasi"],
  ["T", "Aktivitas Jasa Lainnya"],
  ["V", "Aktivitas Badan Internasional"],
] as const;

interface KecamatanRow {
  code: string;
  name: string;
  values: number[];
  total: number;
}

interface SheetData {
  printedAt: string;
  rows: KecamatanRow[];
  pdrb2025: Record<string, { category: string; value: number }>;
}

const parseNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const normalized = text.includes(".")
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

const fetchSheetData = async (): Promise<SheetData> => {
  const fetchGviz = async (gid: string, range: string) => {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}&range=${encodeURIComponent(range)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok)
      throw new Error(`Google Sheets mengembalikan status ${response.status}`);
    const text = await response.text();
    const match = text.match(
      /google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s,
    );
    if (!match)
      throw new Error(
        "Respons Google Sheets tidak valid atau sheet belum dapat diakses publik.",
      );
    const parsed = JSON.parse(match[1]);
    if (parsed?.status === "error" || !parsed?.table)
      throw new Error("Data sheet tidak tersedia.");
    return {
      parsed,
      rows: (parsed.table.rows || []).map((row: any) =>
        (row?.c || []).map((cell: any) => cell?.f ?? cell?.v ?? ""),
      ),
    };
  };

  const [{ parsed, rows: rawRows }, { rows: rawRows2025 }] = await Promise.all([
    fetchGviz("1118385593", `${SHEET_NAME}!A1:W`),
    fetchGviz(SHEET_2025_GID, "2025!A1:E"),
  ]);
  const printedSource = [
    ...rawRows.flat().map((value: unknown) => String(value)),
    ...(parsed.table.cols || []).map((column: any) =>
      String(column?.label ?? ""),
    ),
  ].find((value) => value.includes("Dicetak:"));
  const printedCell = printedSource?.slice(printedSource.indexOf("Dicetak:"));
  const rows = rawRows
    .filter(
      (row: unknown[]) =>
        /^\d{4,7}$/.test(String(row[0] ?? "").trim()) &&
        String(row[1] ?? "").trim(),
    )
    .map((row: unknown[]) => ({
      code: String(row[0]).trim(),
      name: String(row[1]).trim(),
      values: CATEGORIES.map((_, index) => parseNumber(row[index + 2])),
      total: parseNumber(row[CATEGORIES.length + 2]),
    }));
  const pdrb2025 = Object.fromEntries(
    rawRows2025
      .filter((row: unknown[]) => String(row[4] ?? "").trim())
      .map((row: unknown[]) => [
        String(row[4]).trim(),
        { category: String(row[4]).trim(), value: parseNumber(row[2]) },
      ]),
  );

  return {
    printedAt: printedCell || "Dicetak: informasi waktu tidak tersedia",
    rows,
    pdrb2025,
  };
};

const formatCurrency = (value: number) =>
  value.toLocaleString("id-ID", { maximumFractionDigits: 0 });
const formatNilaiTambah = (value: number) => formatCurrency(value / 1_000_000);
const formatPercent = (value: number, total: number) =>
  total > 0 ? `${((value / total) * 100).toFixed(2).replace(".", ",")}%` : "-";

export default function NilaiTambahBruto() {
  const [selectedCode, setSelectedCode] = useState("all");
  const [districtSort, setDistrictSort] = useState<
    "code" | "name" | "total" | "percent" | "rank"
  >("rank");
  const [districtSortDirection, setDistrictSortDirection] = useState<
    "asc" | "desc"
  >("asc");
  const [detailSort, setDetailSort] = useState<
    | "code"
    | "name"
    | "pdrb2025"
    | "percentPdrb2025"
    | "value"
    | "percent"
    | "selisih"
    | "rank"
    | "rankPdrb2025"
    | "selisihRank"
  >("rank");
  const [detailSortDirection, setDetailSortDirection] = useState<
    "asc" | "desc"
  >("asc");
  const { data, isPending, error } = useQuery({
    queryKey: ["nilai-tambah-bruto-kecamatan"],
    queryFn: fetchSheetData,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const districtRows = useMemo(
    () => (data?.rows || []).filter((row) => /^\d{7}$/.test(row.code)),
    [data?.rows],
  );
  const regencyRow = useMemo(
    () => (data?.rows || []).find((row) => /^\d{4}$/.test(row.code)),
    [data?.rows],
  );
  const selectedRow = useMemo(
    () => districtRows.find((row) => row.code === selectedCode),
    [districtRows, selectedCode],
  );
  const rankedRows = useMemo(() => {
    const rows = [...districtRows]
      .sort((left, right) => right.total - left.total)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    return rows.sort((left, right) => {
      const multiplier = districtSortDirection === "asc" ? 1 : -1;
      if (districtSort === "code")
        return (
          left.code.localeCompare(right.code, "id", { numeric: true }) *
          multiplier
        );
      if (districtSort === "name")
        return left.name.localeCompare(right.name, "id") * multiplier;
      if (districtSort === "rank") return (left.rank - right.rank) * multiplier;
      return (left.total - right.total) * multiplier;
    });
  }, [districtRows, districtSort, districtSortDirection]);
  const aggregate = useMemo(() => {
    const rows = districtRows;
    const values = CATEGORIES.map((_, index) =>
      rows.reduce((sum, row) => sum + row.values[index], 0),
    );
    return (
      regencyRow || {
        code: "",
        name: "Seluruh Kecamatan",
        values,
        total: rows.reduce((sum, row) => sum + row.total, 0),
      }
    );
  }, [districtRows, regencyRow]);
  const detailValues = selectedRow?.values || aggregate.values;
  const detailTotal = selectedRow?.total || aggregate.total;
  const rankedCategories = useMemo(() => {
    const totalPdrb2025 = Object.values(data?.pdrb2025 || {}).reduce(
      (sum, item) => sum + item.value,
      0,
    );
    const categories = CATEGORIES.map(([code, name], index) => ({
      code,
      name,
      pdrb2025: data?.pdrb2025[code]?.value || 0,
      value: detailValues[index],
      percentPdrb2025:
        totalPdrb2025 > 0
          ? ((data?.pdrb2025[code]?.value || 0) / totalPdrb2025) * 100
          : 0,
      percentSe2026:
        detailTotal > 0 ? (detailValues[index] / detailTotal) * 100 : 0,
    }))
      .sort((left, right) => right.value - left.value)
      .map((category, index) => ({
        ...category,
        selisih: category.percentPdrb2025 - category.percentSe2026,
        rank: index + 1,
      }));
    const pdrbRanks = new Map(
      [...categories]
        .sort((left, right) => right.pdrb2025 - left.pdrb2025)
        .map((category, index) => [category.code, index + 1]),
    );
    const categoriesWithPdrbRank = categories.map((category) => ({
      ...category,
      rankPdrb2025: pdrbRanks.get(category.code) || 0,
      selisihRank: (pdrbRanks.get(category.code) || 0) - category.rank,
    }));
    return categoriesWithPdrbRank.sort((left, right) => {
      const multiplier = detailSortDirection === "asc" ? 1 : -1;
      if (detailSort === "code")
        return (
          left.code.localeCompare(right.code, "id", { numeric: true }) *
          multiplier
        );
      if (detailSort === "name")
        return left.name.localeCompare(right.name, "id") * multiplier;
      if (detailSort === "pdrb2025")
        return (left.pdrb2025 - right.pdrb2025) * multiplier;
      if (detailSort === "percentPdrb2025")
        return (left.percentPdrb2025 - right.percentPdrb2025) * multiplier;
      if (detailSort === "selisih")
        return (left.selisih - right.selisih) * multiplier;
      if (detailSort === "rankPdrb2025")
        return (left.rankPdrb2025 - right.rankPdrb2025) * multiplier;
      if (detailSort === "selisihRank")
        return (left.selisihRank - right.selisihRank) * multiplier;
      if (detailSort === "rank") return (left.rank - right.rank) * multiplier;
      return (left.value - right.value) * multiplier;
    });
  }, [
    data?.pdrb2025,
    detailTotal,
    detailValues,
    detailSort,
    detailSortDirection,
  ]);

  const toggleDistrictSort = (column: typeof districtSort) => {
    if (districtSort === column)
      setDistrictSortDirection((current) =>
        current === "asc" ? "desc" : "asc",
      );
    else {
      setDistrictSort(column);
      setDistrictSortDirection(column === "rank" ? "asc" : "asc");
    }
  };
  const toggleDetailSort = (column: typeof detailSort) => {
    if (detailSort === column)
      setDetailSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setDetailSort(column);
      setDetailSortDirection(column === "rank" ? "asc" : "asc");
    }
  };
  const sortIcon = (active: boolean, direction: "asc" | "desc") => (
    <ArrowUpDown
      className={`h-3 w-3 ${active ? "text-cyan-300" : "text-slate-400"} ${active && direction === "desc" ? "rotate-180" : ""}`}
    />
  );

  return (
    <div className="w-full max-w-none space-y-4 px-2 py-3 sm:space-y-6 sm:px-0 sm:py-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Nilai Tambah Bruto
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Rekap nilai tambah menurut kategori lapangan usaha tingkat
              kecamatan.
            </p>
            <p className="mt-2 text-sm font-semibold text-red-600">
              {data?.printedAt || "Memuat informasi waktu..."}
            </p>
          </div>
        </div>
      </div>

      {isPending ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Memuat data langsung dari Google Sheets...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-rose-600">
          <AlertCircle className="h-5 w-5" />
          {(error as Error).message}
        </div>
      ) : (
        <div className="flex flex-col">
          <Card className="order-2">
            <CardHeader>
              <CardTitle>Peringkat Kecamatan</CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Kode 7 digit diurutkan berdasarkan total nilai tambah terbesar.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800 hover:bg-slate-800">
                      <TableHead className="w-16 text-center text-white">
                        No.
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDistrictSort("code")}
                        className="cursor-pointer text-white"
                      >
                        <span className="inline-flex items-center gap-1">
                          Kode Kecamatan{" "}
                          {sortIcon(
                            districtSort === "code",
                            districtSortDirection,
                          )}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDistrictSort("name")}
                        className="cursor-pointer text-white"
                      >
                        <span className="inline-flex items-center gap-1">
                          Kecamatan{" "}
                          {sortIcon(
                            districtSort === "name",
                            districtSortDirection,
                          )}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDistrictSort("total")}
                        className="cursor-pointer text-right text-white"
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          Total Nilai Tambah{" "}
                          {sortIcon(
                            districtSort === "total",
                            districtSortDirection,
                          )}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDistrictSort("percent")}
                        className="cursor-pointer text-right text-white"
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          Persentase{" "}
                          {sortIcon(
                            districtSort === "percent",
                            districtSortDirection,
                          )}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDistrictSort("rank")}
                        className="w-24 cursor-pointer text-center text-white"
                      >
                        <span className="inline-flex items-center gap-1">
                          Peringkat{" "}
                          {sortIcon(
                            districtSort === "rank",
                            districtSortDirection,
                          )}
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedRows.map((row, index) => (
                      <TableRow
                        key={row.code}
                        className={`cursor-pointer ${row.code === selectedCode ? "bg-emerald-50" : ""}`}
                        onClick={() => setSelectedCode(row.code)}
                      >
                        <TableCell className="text-center text-slate-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {row.code}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {row.name}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-slate-700">
                          {formatNilaiTambah(row.total)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-700">
                          {formatPercent(row.total, aggregate.total)}
                        </TableCell>
                        <TableCell className="text-center font-bold text-emerald-700">
                          {row.rank}
                        </TableCell>
                      </TableRow>
                    ))}
                    {regencyRow && (
                      <TableRow className="bg-emerald-50 font-bold">
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="font-mono text-xs">
                          {regencyRow.code}
                        </TableCell>
                        <TableCell>{regencyRow.name} (Jumlah)</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNilaiTambah(regencyRow.total)}
                        </TableCell>
                        <TableCell className="text-right">100,00%</TableCell>
                        <TableCell className="text-center">-</TableCell>
                      </TableRow>
                    )}
                    {rankedRows.length === 0 && !regencyRow && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-sm text-slate-500"
                        >
                          Tidak ada data kecamatan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="order-1">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Detail Nilai Tambah -{" "}
                  {selectedRow?.name || "Seluruh Kecamatan"}
                </CardTitle>
                <p className="mt-1 text-xs text-slate-500">
                  Persentase dihitung dari total nilai tambah pada tampilan yang
                  dipilih.
                </p>
              </div>
              <Select value={selectedCode} onValueChange={setSelectedCode}>
                <SelectTrigger className="w-full sm:w-[260px]">
                  <SelectValue placeholder="Pilih kecamatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Seluruh kecamatan</SelectItem>
                  {districtRows.map((row) => (
                    <SelectItem key={row.code} value={row.code}>
                      {row.name} ({row.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table className="min-w-[1500px] [&_thead_th:nth-child(n+6)]:bg-amber-700 [&_thead_th:nth-child(n+6)]:hover:bg-amber-800 [&_tbody_td:nth-child(n+6)]:bg-amber-50 [&_tbody_tr:last-child_td:nth-child(n+6)]:bg-amber-100">
                  <TableHeader>
                    <TableRow className="bg-slate-800 hover:bg-slate-800">
                      <TableHead
                        onClick={() => toggleDetailSort("code")}
                        className="cursor-pointer text-white"
                      >
                        <span className="inline-flex items-center gap-1">
                          Kode{" "}
                          {sortIcon(detailSort === "code", detailSortDirection)}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDetailSort("name")}
                        className="cursor-pointer text-white"
                      >
                        <span className="inline-flex items-center gap-1">
                          Kategori Lapangan Usaha{" "}
                          {sortIcon(detailSort === "name", detailSortDirection)}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDetailSort("value")}
                        className="cursor-pointer text-right text-white"
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          Nilai Tambah{" "}
                          {sortIcon(
                            detailSort === "value",
                            detailSortDirection,
                          )}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDetailSort("percent")}
                        className="cursor-pointer text-right text-white"
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          Persentase SE2026{" "}
                          {sortIcon(
                            detailSort === "percent",
                            detailSortDirection,
                          )}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDetailSort("rank")}
                        className="cursor-pointer text-center text-white"
                      >
                        <span className="inline-flex items-center gap-1">
                          Peringkat{" "}
                          {sortIcon(detailSort === "rank", detailSortDirection)}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDetailSort("pdrb2025")}
                        className="cursor-pointer text-right text-white"
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          PDRB Kabupaten 2025{" "}
                          {sortIcon(
                            detailSort === "pdrb2025",
                            detailSortDirection,
                          )}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDetailSort("percentPdrb2025")}
                        className="cursor-pointer text-right text-white"
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          Persentase PDRB 2025{" "}
                          {sortIcon(
                            detailSort === "percentPdrb2025",
                            detailSortDirection,
                          )}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDetailSort("selisih")}
                        className="cursor-pointer text-right text-white"
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          Selisih PDRB 2025 - SE2026{" "}
                          {sortIcon(
                            detailSort === "selisih",
                            detailSortDirection,
                          )}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDetailSort("rankPdrb2025")}
                        className="cursor-pointer bg-amber-700 text-center text-white hover:bg-amber-800"
                      >
                        <span className="inline-flex items-center gap-1">
                          Peringkat PDRB 2025{" "}
                          {sortIcon(
                            detailSort === "rankPdrb2025",
                            detailSortDirection,
                          )}
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => toggleDetailSort("selisihRank")}
                        className="cursor-pointer bg-sky-700 text-center text-white hover:bg-sky-800"
                        style={{ backgroundColor: "#0369a1" }}
                      >
                        <span className="inline-flex items-center gap-1">
                          Selisih peringkat{" "}
                          {sortIcon(
                            detailSort === "selisihRank",
                            detailSortDirection,
                          )}
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedCategories.map((category) => (
                      <TableRow
                        key={category.code}
                        className={
                          category.selisihRank > 0
                            ? "bg-emerald-50/50 hover:bg-emerald-100/60"
                            : category.selisihRank < 0
                              ? "bg-rose-50/50 hover:bg-rose-100/60"
                              : "bg-slate-50/50 hover:bg-slate-100/60"
                        }
                      >
                        <TableCell className="font-semibold text-slate-700">
                          {category.code}
                        </TableCell>
                        <TableCell className="whitespace-normal text-slate-700">
                          {category.name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-700">
                          {formatNilaiTambah(category.value)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-emerald-700">
                          {formatPercent(category.value, detailTotal)}
                        </TableCell>
                        <TableCell className="text-center font-bold text-emerald-700">
                          {category.rank}
                        </TableCell>
                        <TableCell className="bg-amber-50 text-right tabular-nums text-amber-950">
                          {formatCurrency(category.pdrb2025)}
                        </TableCell>
                        <TableCell className="bg-amber-50 text-right tabular-nums text-amber-950">
                          {category.percentPdrb2025
                            .toFixed(2)
                            .replace(".", ",")}{" "}
                          %
                        </TableCell>
                        <TableCell className="bg-amber-50 text-right font-semibold tabular-nums text-amber-950">
                          {category.selisih.toFixed(2).replace(".", ",")} %
                        </TableCell>
                        <TableCell className="bg-amber-50 text-center font-bold text-amber-950">
                          {category.rankPdrb2025}
                        </TableCell>
                        <TableCell className="bg-sky-50 text-center font-bold text-sky-950" style={{ backgroundColor: "#dbeafe" }}>
                          {category.selisihRank > 0 ? `+${category.selisihRank}` : category.selisihRank}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-emerald-50 font-bold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNilaiTambah(detailTotal)}
                      </TableCell>
                      <TableCell className="text-right">100,00%</TableCell>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell className="bg-amber-100 text-right tabular-nums text-amber-950">
                        {formatCurrency(
                          Object.values(data?.pdrb2025 || {}).reduce(
                            (sum, item) => sum + item.value,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="bg-amber-100 text-right text-amber-950">
                        100,00%
                      </TableCell>
                      <TableCell className="bg-amber-100 text-right text-amber-950">
                        0,00%
                      </TableCell>
                      <TableCell className="bg-sky-100 text-center text-sky-950">-</TableCell>
                      <TableCell className="bg-sky-100 text-center text-sky-950" style={{ backgroundColor: "#bfdbfe" }}>-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
