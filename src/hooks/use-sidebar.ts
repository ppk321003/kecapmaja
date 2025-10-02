import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarItem } from "@/types";

export const useSidebar = () => {
  return useQuery({
    queryKey: ["sidebar"],
    queryFn: async () => {
      const defaultSidebarItems: SidebarItem[] = [
        {
          id: "1",
          title: "Dashboard",
          path: "/",
          icon: "FileText",
          description: "Halaman utama aplikasi",
          order_index: 1,
          is_active: true
        },
        {
          id: "2",
          title: "Bahan Revisi 3210",
          path: "/bahan-revisi-3210",
          icon: "Database",
          description: "Akses bahan revisi 3210",
          order_index: 2,
          is_active: true
        },
        // Dokumen dan Formulir
        {
          id: "3",
          title: "Buat Dokumen",
          path: "/buat-dokumen",
          icon: "FileText",
          description: "Buat berbagai jenis dokumen",
          order_index: 3,
          is_active: true
        },
        {
          id: "4",
          title: "Download Dokumen",
          path: "/download-dokumen",
          icon: "FileArchive",
          description: "Download dokumen yang tersedia",
          order_index: 4,
          is_active: true
        },
        {
          id: "5",
          title: "Blanko Visum",
          path: "/blanko-visum",
          icon: "File",
          description: "Akses blanko visum",
          order_index: 5,
          is_active: true
        },
        // Laporan & Rekap
        {
          id: "7",
          title: "Rekap Honor Mitra",
          path: "/rekap-honor",
          icon: "Table",
          description: "Rekap honor mitra per kegiatan",
          order_index: 7,
          is_active: true
        },
        {
          id: "8",
          title: "Rekap SPK dan BAST",
          path: "/rekap-spk-bast",
          icon: "File",
          description: "Lihat rekap SPK dan BAST mitra statistik",
          order_index: 8,
          is_active: true
        },
        {
          id: "9",
          title: "Riwayat Kertas Kerja (PDF)",
          path: "/riwayat-kertas-kerja",
          icon: "FileArchive",
          description: "Lihat riwayat kertas kerja dalam format PDF",
          order_index: 9,
          is_active: true
        },
        {
          id: "10",
          title: "Riwayat Kertas Kerja (Excel)",
          path: "/riwayat-kertas-kerja-excel",
          icon: "FileArchive",
          description: "Lihat riwayat kertas kerja dalam format Excel",
          order_index: 10,
          is_active: true
        },
        // Referensi & Peraturan
        {
          id: "11",
          title: "Perka BPS",
          path: "/perka-bps",
          icon: "Book",
          description: "Lihat peraturan tentang standar biaya kegiatan statistik",
          order_index: 11,
          is_active: true
        },
        {
          id: "12",
          title: "SBM 2025",
          path: "/sbm-2025",
          icon: "Book",
          description: "Standar Biaya Masukan Tahun 2025",
          order_index: 12,
          is_active: true
        },
        {
          id: "13",
          title: "SK Transport Lokal",
          path: "/sk-translok",
          icon: "FileText",
          description: "Akses SK Transport Lokal",
          order_index: 13,
          is_active: true
        },
        // Inventaris & Arsip
        {
          id: "14",
          title: "Stock Opname",
          path: "/stock-opname",
          icon: "Database",
          description: "Stock opname inventaris",
          order_index: 14,
          is_active: true
        },
        {
          id: "15",
          title: "Kecap Maja (OLD)",
          path: "/kecap-maja-old",
          icon: "FileArchive",
          description: "Akses Kecap Maja versi lama",
          order_index: 15,
          is_active: true
        },
        {
          id: "16",
          title: "Perka PAK Sensus Survei",
          path: "/perka-8",
          icon: "Book",
          description: "PPT Perka 8 Tahun 2024_Perka PAK Sensus Survei",
          order_index: 16,
          is_active: true
        }
      ];
      
      try {
        const { data, error } = await supabase
          .from("sidebar")
          .select("*")
          .eq("is_active", true)
          .order("order_index");
        
        if (error) {
          console.error("Error fetching sidebar items:", error);
          return defaultSidebarItems;
        }
        
        return data.length > 0 ? data as SidebarItem[] : defaultSidebarItems;
      } catch (error) {
        console.error("Failed to fetch sidebar items:", error);
        return defaultSidebarItems;
      }
    }
  });
};

export default useSidebar;