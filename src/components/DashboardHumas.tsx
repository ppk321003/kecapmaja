import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CalendarDays, ListTodo, StickyNote, ExternalLink, Instagram, Facebook } from "lucide-react";

const HUMAS_SPREADSHEET_ID = "1F1-RkAR6s_VO7yxC5qBP8LVcPMxpKeilm2aU1wrXoBc";
const HUMAS_SHEET = "Plan Details";

interface DashboardHumasProps {
  filterTahun?: string;
}

interface PlanRow {
  monthYear: string;     // A
  dateStr: string;       // B
  plan: string;          // C
  admin: string;         // D
  content: string;       // E
  status: string;        // F
  contentType: string;   // G
  note: string;          // H
  bahan: string;         // I
  linkIg: string;        // J
  linkFb: string;        // K
  date: Date | null;
}

const BULAN_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_MAP: Record<string, number> = {
  jan: 0, januari: 0, january: 0,
  feb: 1, februari: 1, february: 1,
  mar: 2, maret: 2, march: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5, june: 5,
  jul: 6, juli: 6, july: 6,
  agu: 7, agt: 7, agustus: 7, aug: 7, august: 7,
  sep: 8, september: 8,
  okt: 9, oktober: 9, oct: 9, october: 9,
  nov: 10, november: 10,
  des: 11, desember: 11, dec: 11, december: 11,
};

// Parse format like "17-Apr-2026" / "1-Mei-2026" / "17/04/2026" / "2026-04-17"
const parseDate = (str: string): Date | null => {
  if (!str) return null;
  const s = str.trim();

  // Pattern: DD-Mon-YYYY or DD Mon YYYY
  let m = s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]+)[\s\-\/](\d{4})$/);
  if (m) {
    const day = parseInt(m[1]);
    const mon = MONTH_MAP[m[2].toLowerCase()];
    if (mon !== undefined) return new Date(parseInt(m[3]), mon, day);
  }

  // Pattern: DD/MM/YYYY or DD-MM-YYYY
  m = s.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));

  // Pattern: YYYY-MM-DD
  m = s.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})$/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const DashboardHumas = ({ filterTahun }: DashboardHumasProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PlanRow[]>([]);
  const today = new Date();
  const initialYear = filterTahun ? parseInt(filterTahun) : today.getFullYear();
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    if (filterTahun) setViewYear(parseInt(filterTahun));
  }, [filterTahun]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: err } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: HUMAS_SPREADSHEET_ID,
            operation: "read",
            range: `${HUMAS_SHEET}!A2:K`,
          },
        });
        if (err) throw err;
        const values: string[][] = data?.values || [];
        const parsed: PlanRow[] = values.map((r) => ({
          monthYear: r[0] || "",
          dateStr: r[1] || "",
          plan: r[2] || "",
          admin: r[3] || "",
          content: r[4] || "",
          status: r[5] || "",
          contentType: r[6] || "",
          note: r[7] || "",
          bahan: r[8] || "",
          linkIg: r[9] || "",
          linkFb: r[10] || "",
          date: parseDate(r[1] || ""),
        }));
        setRows(parsed);
      } catch (e: any) {
        console.error("[DashboardHumas] fetch error:", e);
        setError(e?.message || "Gagal memuat data Humas");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const todoList = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.content.trim() &&
          !["published", "reposted"].includes(r.status.trim().toLowerCase()),
      ),
    [rows],
  );

  const notes = useMemo(
    () => rows.filter((r) => r.note && r.note.trim()),
    [rows],
  );

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();
    const cells: { date: Date | null; events: PlanRow[] }[] = [];

    // Leading blanks
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, events: [] });

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const events = rows.filter((r) => r.date && sameDay(r.date, date));
      cells.push({ date, events });
    }

    // Trailing blanks to fill last week
    while (cells.length % 7 !== 0) cells.push({ date: null, events: [] });
    return cells;
  }, [rows, viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else setViewMonth(viewMonth - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else setViewMonth(viewMonth + 1);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-96 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const renderEventLink = (ev: PlanRow) => {
    const url = ev.linkIg || ev.linkFb;
    const isIg = !!ev.linkIg;
    const Icon = isIg ? Instagram : (ev.linkFb ? Facebook : ExternalLink);
    const colorClass = url
      ? (isIg ? "text-pink-600 hover:text-pink-800" : "text-blue-600 hover:text-blue-800")
      : "text-slate-700";

    const content = (
      <span className="flex items-start gap-1 leading-tight">
        {url && <Icon className="h-3 w-3 mt-0.5 shrink-0" />}
        <span className="truncate">{ev.plan}</span>
      </span>
    );
    if (url) {
      return (
        <a
          key={ev.plan + ev.dateStr}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block text-[11px] ${colorClass} hover:underline px-1 py-0.5 rounded hover:bg-white/60 transition-colors`}
          title={ev.plan}
        >
          {content}
        </a>
      );
    }
    return (
      <span
        key={ev.plan + ev.dateStr}
        className={`block text-[11px] ${colorClass} px-1 py-0.5`}
        title={ev.plan}
      >
        {content}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Kalender Konten Humas
              </CardTitle>
              <CardDescription>
                Jadwal konten & publikasi — klik judul untuk membuka tautan Instagram/Facebook
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[160px] text-center font-semibold text-lg">
                {BULAN_FULL[viewMonth]} {viewYear}
              </div>
              <Button variant="outline" size="icon" onClick={goNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {HARI.map((h, i) => (
              <div
                key={h}
                className={`text-center text-xs font-semibold py-2 rounded ${
                  i === 0 ? "text-red-500 bg-red-50" : "text-muted-foreground bg-muted/50"
                }`}
              >
                {h}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const isToday = cell.date && sameDay(cell.date, today);
              const isSunday = idx % 7 === 0;
              return (
                <div
                  key={idx}
                  className={`min-h-[96px] border rounded-md p-1 transition-colors ${
                    !cell.date
                      ? "bg-muted/30 border-transparent"
                      : isToday
                      ? "bg-primary/5 border-primary/40 ring-1 ring-primary/30"
                      : "bg-background hover:bg-muted/40"
                  }`}
                >
                  {cell.date && (
                    <>
                      <div
                        className={`text-xs font-semibold mb-1 ${
                          isToday
                            ? "text-primary"
                            : isSunday
                            ? "text-red-500"
                            : "text-foreground"
                        }`}
                      >
                        {cell.date.getDate()}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {cell.events.slice(0, 3).map((ev) => renderEventLink(ev))}
                        {cell.events.length > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1">
                            +{cell.events.length - 3} lainnya
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* TODO + NOTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-amber-600" />
              To Do List
            </CardTitle>
            <CardDescription>
              {todoList.length} konten belum Published / Reposted
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todoList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Semua konten sudah Published 🎉
              </p>
            ) : (
              <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {todoList.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-md border bg-amber-50/50 hover:bg-amber-50 transition-colors"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {r.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {r.dateStr && <span>📅 {r.dateStr}</span>}
                        {r.admin && <span>👤 {r.admin}</span>}
                        {r.status && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                            {r.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-emerald-600" />
              Notes
            </CardTitle>
            <CardDescription>{notes.length} catatan tersedia</CardDescription>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada catatan
              </p>
            ) : (
              <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {notes.map((r, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-md border bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
                  >
                    <p className="text-sm text-foreground leading-snug">{r.note}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {r.plan && <span className="font-medium">{r.plan}</span>}
                      {r.dateStr && <span>📅 {r.dateStr}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHumas;
