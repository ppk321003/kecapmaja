
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarItem } from "@/types";

export const useSidebar = () => {
  return useQuery({
    queryKey: ["sidebar"],
    queryFn: async () => {
      // Define default sidebar items in case we can't fetch from Supabase
      const defaultSidebarItems: SidebarItem[] = [
        {
          id: 1,
          title: "Dashboard",
          path: "/",
          icon: "FileText",
          description: "Halaman utama aplikasi",
          order_index: 1,
          is_active: true
        },
        {
          id: 2,
          title: "Buat Dokumen",
          path: "/buat-dokumen",
          icon: "FileText",
          description: "Buat berbagai jenis dokumen",
          order_index: 2,
          is_active: true
        },
        {
          id: 3,
          title: "Download Dokumen",
          path: "/download-dokumen",
          icon: "FileArchive",
          description: "Download dokumen yang tersedia",
          order_index: 3,
          is_active: true
        },
        {
          id: 4,
          title: "Rekap Honor Mitra",
          path: "/rekap-honor",
          icon: "Table",
          description: "Rekap honor mitra per kegiatan",
          order_index: 4,
          is_active: true
        },
        {
          id: 5,
          title: "Stock Opname",
          path: "/stock-opname",
          icon: "Database",
          description: "Stock opname inventaris",
          order_index: 5,
          is_active: true
        },
        {
          id: 6,
          title: "Bahan Revisi Web",
          path: "/bahan-revisi-web",
          icon: "Globe",
          description: "Akses bahan revisi via web",
          order_index: 6,
          is_active: true
        },
        {
          id: 7,
          title: "Bahan Revisi Spreadsheet",
          path: "/bahan-revisi-spreadsheet",
          icon: "Database",
          description: "Akses bahan revisi via Google Spreadsheet",
          order_index: 7,
          is_active: true
        },
        {
          id: 8,
          title: "Riwayat Kertas Kerja",
          path: "/riwayat-kertas-kerja",
          icon: "FileArchive",
          description: "Lihat riwayat kertas kerja dalam format PDF",
          order_index: 8,
          is_active: true
        },
        {
          id: 9, 
          title: "Rekap SPK dan BAST",
          path: "/rekap-spk-bast",
          icon: "File",
          description: "Lihat rekap SPK dan BAST mitra statistik",
          order_index: 9,
          is_active: true
        },
        {
          id: 10,
          title: "Surat Pernyataan",
          path: "/surat-pernyataan",
          icon: "File",
          description: "Akses surat pernyataan",
          order_index: 10,
          is_active: true
        },
        {
          id: 11,
          title: "Blanko Visum",
          path: "/blanko-visum",
          icon: "File",
          description: "Akses blanko visum",
          order_index: 11,
          is_active: true
        },
        {
          id: 12,
          title: "Perka BPS",
          path: "/perka-bps",
          icon: "Book",
          description: "Lihat peraturan tentang standar biaya kegiatan statistik",
          order_index: 12,
          is_active: true
        },
        {
          id: 13,
          title: "SBM 2025",
          path: "/sbm-2025",
          icon: "Book",
          description: "Standar Biaya Masukan Tahun 2025",
          order_index: 13,
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
