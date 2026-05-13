import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SatkerConfigProvider } from "./contexts/SatkerConfigContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { KuitansiProvider } from "./contexts/KuitansiContext";
import { KuitansiStoreProvider } from "./contexts/KuitansiStoreContext";
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
import GenerateSPJHonorMitra from "./pages/e-dokumen/generate-spj-honor-mitra";
import SuratKeputusan from "./pages/e-dokumen/surat-keputusan";
import SuratPernyataan from "./pages/e-dokumen/surat-pernyataan";
import TandaTerima from "./pages/e-dokumen/tanda-terima";
import TransportLokal from "./pages/e-dokumen/transport-lokal";
import UangHarianTransport from "./pages/e-dokumen/uang-harian-transport";
import EntriTarget from "./pages/spk-bast/EntriTarget";
//import CekSBML from "./pages/spk-bast/CekSBML";
import RekapSPK from "./pages/spk-bast/RekapSPK";
import EntriSBML from "./pages/spk-bast/EntriSBML";
import EntriPengelola from "./pages/EntriPengelola";
import DownloadSPKBAST from "./pages/spk-bast/DownloadSPKBAST";
import DownloadRawData from "./pages/DownloadRawData";
import Pedoman from "./pages/Pedoman";
import KarierKu from "./pages/KarierKu";
import Linkers from "./pages/Linkers";
import ManajemenPulsa from "./pages/ManajemenPulsa";
import NotFound from "./pages/NotFound";
import UsulanPencairan from "./pages/UsulanPencairan";
import UserManagement from "./pages/UserManagement";
import Sikostik28 from "./pages/Sikostik28";
import CetakKuitansi from "./pages/CetakKuitansi";
import BuatKuitansi from "./pages/BuatKuitansi";
import DetailKuitansi from "./pages/DetailKuitansi";
import EditKuitansi from "./pages/EditKuitansi";
import LayananUmum from "./pages/LayananUmum";
import ETamu from "./pages/ETamu";
import KonfirmasiKepka2026 from "./pages/konfirmasikepka2026";
import BahanRevisiAnggaran from "./components/bahanrevisi/BahanRevisiAnggaran";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <SatkerConfigProvider>
          <KuitansiStoreProvider>
            <KuitansiProvider>
              <NotificationsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
            <BrowserRouter>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/usulan-pencairan" element={<ProtectedRoute><Layout><UsulanPencairan /></Layout></ProtectedRoute>} />
            <Route path="/aki-to-bendahara" element={<ProtectedRoute><Layout><AkiToBendahara /></Layout></ProtectedRoute>} />
            <Route path="/BlockTanggal" element={<ProtectedRoute><Layout><BlockTanggal /></Layout></ProtectedRoute>} />
            <Route path="/KarierKu" element={<ProtectedRoute><Layout><KarierKu /></Layout></ProtectedRoute>} />             
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
            <Route path="/e-dokumen/generate-spj-honor-mitra" element={<ProtectedRoute><Layout><GenerateSPJHonorMitra /></Layout></ProtectedRoute>} />
            <Route path="/e-dokumen/surat-keputusan" element={<ProtectedRoute><SuratKeputusan /></ProtectedRoute>} />
            <Route path="/e-dokumen/surat-pernyataan" element={<ProtectedRoute><SuratPernyataan /></ProtectedRoute>} />
            <Route path="/e-dokumen/tanda-terima" element={<ProtectedRoute><TandaTerima /></ProtectedRoute>} />
            <Route path="/e-dokumen/transport-lokal" element={<ProtectedRoute><TransportLokal /></ProtectedRoute>} />
            <Route path="/e-dokumen/uang-harian-transport" element={<ProtectedRoute><UangHarianTransport /></ProtectedRoute>} />
            <Route path="/spk-bast/entri-target" element={<ProtectedRoute><Layout><EntriTarget /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/rekap-spk" element={<ProtectedRoute><Layout><RekapSPK /></Layout></ProtectedRoute>} />            
            <Route path="/spk-bast/entri-sbml" element={<ProtectedRoute><Layout><EntriSBML /></Layout></ProtectedRoute>} />
            <Route path="/entri-pengelola" element={<ProtectedRoute><Layout><EntriPengelola /></Layout></ProtectedRoute>} />
            <Route path="/spk-bast/download-spk-bast" element={<ProtectedRoute><Layout><DownloadSPKBAST /></Layout></ProtectedRoute>} />
            <Route path="/download-raw-data" element={<ProtectedRoute><Layout><DownloadRawData /></Layout></ProtectedRoute>} />
            <Route path="/pedoman" element={<ProtectedRoute><Layout><Pedoman /></Layout></ProtectedRoute>} />
            <Route path="/linkers" element={<ProtectedRoute><Layout><Linkers /></Layout></ProtectedRoute>} />
            <Route path="/monitoring-pulsa" element={<ProtectedRoute><Layout><ManajemenPulsa /></Layout></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute><Layout><UserManagement /></Layout></ProtectedRoute>} />
            <Route path="/sikostik28" element={<ProtectedRoute><Layout><Sikostik28 /></Layout></ProtectedRoute>} />
            <Route path="/cetak-kuitansi" element={<ProtectedRoute><Layout><CetakKuitansi /></Layout></ProtectedRoute>} />
            <Route path="/buat-kuitansi" element={<ProtectedRoute><Layout><BuatKuitansi /></Layout></ProtectedRoute>} />
            <Route path="/detail-kuitansi/:id" element={<ProtectedRoute><Layout><DetailKuitansi /></Layout></ProtectedRoute>} />
            <Route path="/edit-kuitansi/:id" element={<ProtectedRoute><Layout><EditKuitansi /></Layout></ProtectedRoute>} />
            <Route path="/bahan-revisi-anggaran" element={<ProtectedRoute><Layout><BahanRevisiAnggaran /></Layout></ProtectedRoute>} />
            <Route path="/layanan-umum" element={<LayananUmum />} />
            <Route path="/e-tamu" element={<ETamu />} />
            <Route path="/konfirmasi-kepka-2026" element={<ProtectedRoute><Layout><KonfirmasiKepka2026 /></Layout></ProtectedRoute>} />
            <Route path="/konfirmasikepka2026" element={<ProtectedRoute><Layout><KonfirmasiKepka2026 /></Layout></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<ProtectedRoute><Layout><NotFound /></Layout></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
            </TooltipProvider>
            </NotificationsProvider>
            </KuitansiProvider>
          </KuitansiStoreProvider>
        </SatkerConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
