import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AkiToBendahara from "./pages/AkiToBendahara";
import BlockTanggal from "./pages/BlockTanggal";
import Pengadaan from "./pages/Pengadaan";
import SPKBast from "./pages/SPKBast";
import BuatEDokumen from "./pages/e-dokumen/BuatEDokumen";
import DownloadEDokumen from "./pages/e-dokumen/DownloadEDokumen";
import PlaceholderEDokumen from "./pages/e-dokumen/PlaceholderEDokumen";
import KerangkaAcuanKerja from "./pages/e-dokumen/kak";
import DaftarHadir from "./pages/e-dokumen/daftar-hadir";
import DokumenPengadaan from "./pages/e-dokumen/dokumen-pengadaan";
import KuitansiPerjalananDinas from "./pages/e-dokumen/kuitansi-perjalanan";
import KuitansiTransportLokal from "./pages/e-dokumen/kuitansi-transport";
import LemburLaporan from "./pages/e-dokumen/lembur-laporan";
import SPJHonor from "./pages/e-dokumen/spj-honor";
import SuratKeputusan from "./pages/e-dokumen/surat-keputusan";
import SuratPernyataan from "./pages/e-dokumen/surat-pernyataan";
import TandaTerima from "./pages/e-dokumen/tanda-terima";
import TransportLokal from "./pages/e-dokumen/transport-lokal";
import UangHarianTransport from "./pages/e-dokumen/uang-harian-transport";
import EntriPetugas from "./pages/spk-bast/EntriPetugas";
import EntriTarget from "./pages/spk-bast/EntriTarget";
import EntriRealisasi from "./pages/spk-bast/EntriRealisasi";
import CekSBML from "./pages/spk-bast/CekSBML";
import EntriSBML from "./pages/spk-bast/EntriSBML";
import EntriPengelola from "./pages/spk-bast/EntriPengelola";
import ApprovalPPK from "./pages/spk-bast/ApprovalPPK";
import DownloadSPKBAST from "./pages/spk-bast/DownloadSPKBAST";
import DownloadSPJ from "./pages/spk-bast/DownloadSPJ";
import DownloadRawData from "./pages/spk-bast/DownloadRawData";
import Pedoman from "./pages/spk-bast/Pedoman";
import MitraKepka from "./pages/spk-bast/MitraKepka";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/aki-to-bendahara" element={<ProtectedRoute><Layout><AkiToBendahara /></Layout></ProtectedRoute>} />
            <Route path="/BlockTanggal" element={<ProtectedRoute><Layout><BlockTanggal /></Layout></ProtectedRoute>} />
            <Route path="/Pengadaan" element={<ProtectedRoute><Layout><Pengadaan /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast" element={<ProtectedRoute><Layout><SPKBast /></Layout></ProtectedRoute>} />
            <Route path="/e-dokumen/buat" element={<ProtectedRoute><Layout><BuatEDokumen /></Layout></ProtectedRoute>} />
            <Route path="/e-dokumen/download" element={<ProtectedRoute><Layout><DownloadEDokumen /></Layout></ProtectedRoute>} />
            <Route path="/e-dokumen/daftar-hadir" element={<ProtectedRoute><DaftarHadir /></ProtectedRoute>} />
            <Route path="/e-dokumen/dokumen-pengadaan" element={<ProtectedRoute><DokumenPengadaan /></ProtectedRoute>} />
            <Route path="/e-dokumen/kak" element={<ProtectedRoute><KerangkaAcuanKerja /></ProtectedRoute>} />
            <Route path="/e-dokumen/kuitansi-perjalanan" element={<ProtectedRoute><KuitansiPerjalananDinas /></ProtectedRoute>} />
            <Route path="/e-dokumen/kuitansi-transport" element={<ProtectedRoute><KuitansiTransportLokal /></ProtectedRoute>} />
            <Route path="/e-dokumen/lembur-laporan" element={<ProtectedRoute><LemburLaporan /></ProtectedRoute>} />
            <Route path="/e-dokumen/spj-honor" element={<ProtectedRoute><SPJHonor /></ProtectedRoute>} />
            <Route path="/e-dokumen/surat-keputusan" element={<ProtectedRoute><SuratKeputusan /></ProtectedRoute>} />
            <Route path="/e-dokumen/surat-pernyataan" element={<ProtectedRoute><SuratPernyataan /></ProtectedRoute>} />
            <Route path="/e-dokumen/tanda-terima" element={<ProtectedRoute><TandaTerima /></ProtectedRoute>} />
            <Route path="/e-dokumen/transport-lokal" element={<ProtectedRoute><TransportLokal /></ProtectedRoute>} />
            <Route path="/e-dokumen/uang-harian-transport" element={<ProtectedRoute><UangHarianTransport /></ProtectedRoute>} />
            <Route path="/spk-bast/entri-petugas" element={<ProtectedRoute><Layout><EntriPetugas /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/entri-target" element={<ProtectedRoute><Layout><EntriTarget /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/entri-realisasi" element={<ProtectedRoute><Layout><EntriRealisasi /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/cek-sbml" element={<ProtectedRoute><Layout><CekSBML /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/entri-sbml" element={<ProtectedRoute><Layout><EntriSBML /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/entri-pengelola" element={<ProtectedRoute><Layout><EntriPengelola /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/approval-ppk" element={<ProtectedRoute><Layout><ApprovalPPK /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/download-spk-bast" element={<ProtectedRoute><Layout><DownloadSPKBAST /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/download-spj" element={<ProtectedRoute><Layout><DownloadSPJ /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/download-raw-data" element={<ProtectedRoute><Layout><DownloadRawData /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/pedoman" element={<ProtectedRoute><Layout><Pedoman /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/mitra-kepka" element={<ProtectedRoute><MitraKepka /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<ProtectedRoute><Layout><NotFound /></Layout></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
