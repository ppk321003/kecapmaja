
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import BuatDokumen from "./pages/BuatDokumen";
import KerangkaAcuanKerja from "./pages/dokumen/KerangkaAcuanKerja";
import DaftarHadir from "./pages/dokumen/DaftarHadir";
import SPJHonor from "./pages/dokumen/SPJHonor";
import TransportLokal from "./pages/dokumen/TransportLokal";
import UangHarianTransport from "./pages/dokumen/UangHarianTransport";
import TandaTerima from "./pages/dokumen/TandaTerima";
import KuitansiPerjalananDinas from "./pages/dokumen/KuitansiPerjalananDinas";
import DokumenPengadaan from "./pages/dokumen/DokumenPengadaan";
import SuratKeputusan from "./pages/dokumen/SuratKeputusan";
import SuratPernyataan from "./pages/dokumen/SuratPernyataan";
import ExternalLink from "./pages/ExternalLink";
import DownloadDokumen from "./pages/DownloadDokumen";
import RekapHonor from "./pages/RekapHonor";
import StockOpname from "./pages/StockOpname";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/buat-dokumen" element={<BuatDokumen />} />
            <Route path="/download-dokumen" element={<DownloadDokumen />} />
            <Route path="/rekap-honor" element={<RekapHonor />} />
            <Route path="/stock-opname" element={<StockOpname />} />
            
            <Route path="/dokumen/kerangka-acuan-kerja" element={<KerangkaAcuanKerja />} />
            <Route path="/dokumen/daftar-hadir" element={<DaftarHadir />} />
            <Route path="/dokumen/spj-honor" element={<SPJHonor />} />
            <Route path="/dokumen/transport-lokal" element={<TransportLokal />} />
            <Route path="/dokumen/uang-harian-transport" element={<UangHarianTransport />} />
            <Route path="/dokumen/tanda-terima" element={<TandaTerima />} />
            <Route path="/dokumen/kuitansi-perjalanan-dinas" element={<KuitansiPerjalananDinas />} />
            <Route path="/dokumen/dokumen-pengadaan" element={<DokumenPengadaan />} />
            <Route path="/dokumen/SuratKeputusan" element={<SuratKeputusan />} />
            <Route path="/dokumen/surat-pernyataan" element={<SuratPernyataan />} />
            
            {/* External Links */}
            <Route path="/bahan-revisi-web" element={<ExternalLink url="https://bahanrevisi-3210.vercel.app/" />} />
            <Route path="/bahan-revisi-spreadsheet" element={<ExternalLink url="https://docs.google.com/spreadsheets/d/1SgC_2TQz3AZdYTsbx-cIKg-DEvtOt3GtNl76zCzjLxU/edit?usp=sharing" />} />
            <Route path="/riwayat-kertas-kerja" element={<ExternalLink url="https://drive.google.com/drive/folders/1bP4d3iQ61ogw6z1G9hoiIwFXw5DhH40P?usp=drive_link" />} />
            <Route path="/rekap-spk-bast" element={<ExternalLink url="https://docs.google.com/spreadsheets/d/1TDAIWzaCpKBN5yOsSSNJ71GbQvVXGLkDE-lgq4l7Vhs/edit?usp=sharing" />} />
            <Route path="/surat-pernyataan" element={<ExternalLink url="https://docs.google.com/spreadsheets/d/1tFYH23tDZ3I_dTk_DkndoeWiZotw2b9OApfzEoFnAlo/edit" />} />
            <Route path="/blanko-visum" element={<ExternalLink url="https://drive.google.com/drive/u/1/folders/19NqkvrO0UZJj9nm4bZzfHQVraqdZntN2?usp=sharing" />} />
            <Route path="/perka-bps" element={<ExternalLink url="https://drive.google.com/file/d/1ms-k2xz6uX5__8_jjwWikoEa1ffW9NKl/view" />} />
            <Route path="/sbm-2025" element={<ExternalLink url="https://drive.google.com/file/d/1xZnV0JqqA2NnlnDw__A_PJMXBDQay89A/view" />} />
            <Route path="/perka-8" element={<ExternalLink url="https://drive.google.com/file/d/10SCXZzSuuycE2OMONv9BGJ_wKsmnubJS/view?usp=sharing" />} />
            
            {/* New External Links */}
            <Route path="/kecap-maja-old" element={<ExternalLink url="https://s.bps.go.id/kecap-maja" />} />
            <Route path="/sk-translok" element={<ExternalLink url="https://drive.google.com/file/d/1LCuubDY1R0gSDLoW9ihu3GN93hwuW-Sq/view?usp=sharing" />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
