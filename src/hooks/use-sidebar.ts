import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarItem } from "@/types";

export const useSidebar = () => {
  return useQuery({
    queryKey: ["sidebar"],
    queryFn: async () => {
      // Define default sidebar items grouped as requested
      const defaultSidebarItems: SidebarItem[] = [
        // 1. Menu Utama
        {
          id: "1",
          title: "Dashboard",
          path: "/",
          icon: "LayoutDashboard",
          description: "Halaman utama aplikasi",
          order_index: 1,
          is_active: true
        },

        // 2. Bahan Revisi 3210
        {
          id: "2",
          title: "Bahan Revisi Web",
          path: "/bahan-revisi-web",
          icon: "Globe",
          description: "Akses bahan revisi via web",
          order_index: 2,
          is_active: true
        },
        {
          id: "3",
          title: "Bahan Revisi Spreadsheet",
          path: "/bahan-revisi-spreadsheet",
          icon: "Table",
          description: "Akses bahan revisi via Google Spreadsheet",
          order_index: 3,
          is_active: true
        },

        // 3. Dokumen dan Formulir
        {
          id: "4",
          title: "Buat Dokumen",
          path: "/buat-dokumen",
          icon: "FilePlus",
          description: "Buat berbagai jenis dokumen",
          order_index: 4,
          is_active: true,
          parent_id: "documents"
        },
        {
          id: "5",
          title: "Download Dokumen",
          path: "/download-dokumen",
          icon: "Download",
          description: "Download dokumen yang tersedia",
          order_index: 5,
          is_active: true,
          parent_id: "documents"
        },
        {
          id: "6",
          title: "Blanko Visum",
          path: "/blanko-visum",
          icon: "FileSignature",
          description: "Akses blanko visum",
          order_index: 6,
          is_active: true,
          parent_id: "documents"
        },
        {
          id: "7",
          title: "Surat Pernyataan",
          path: "/surat-pernyataan",
          icon: "FileText",
          description: "Akses surat pernyataan",
          order_index: 7,
          is_active: true,
          parent_id: "documents"
        },

        // 4. Laporan & Rekap
        {
          id: "8",
          title: "Rekap Honor Mitra",
          path: "/rekap-honor",
          icon: "DollarSign",
          description: "Rekap honor mitra per kegiatan",
          order_index: 8,
          is_active: true,
          parent_id: "reports"
        },
        {
          id: "9",
          title: "Rekap SPK dan BAST",
          path: "/rekap-spk-bast",
          icon: "FileCheck",
          description: "Lihat rekap SPK dan BAST mitra statistik",
          order_index: 9,
          is_active: true,
          parent_id: "reports"
        },
        {
          id: "10",
          title: "Riwayat Kertas Kerja",
          path: "/riwayat-kertas-kerja",
          icon: "FileArchive",
          description: "Lihat riwayat kertas kerja dalam format PDF",
          order_index: 10,
          is_active: true,
          parent_id: "reports"
        },

        // 5. Referensi & Peraturan
        {
          id: "11",
          title: "Perka BPS",
          path: "/perka-bps",
          icon: "BookOpen",
          description: "Lihat peraturan tentang standar biaya kegiatan statistik",
          order_index: 11,
          is_active: true,
          parent_id: "references"
        },
        {
          id: "12",
          title: "SBM 2025",
          path: "/sbm-2025",
          icon: "Book",
          description: "Standar Biaya Masukan Tahun 2025",
          order_index: 12,
          is_active: true,
          parent_id: "references"
        },
        {
          id: "13",
          title: "SK Transport Lokal",
          path: "/sk-translok",
          icon: "FileText",
          description: "Akses SK Transport Lokal",
          order_index: 13,
          is_active: true,
          parent_id: "references"
        },

        // 6. Inventaris & Arsip
        {
          id: "14",
          title: "Stock Opname",
          path: "/stock-opname",
          icon: "ClipboardCheck",
          description: "Stock opname inventaris",
          order_index: 14,
          is_active: true,
          parent_id: "inventory"
        },
        {
          id: "15",
          title: "Kecap Maja (OLD)",
          path: "/kecap-maja-old",
          icon: "Archive",
          description: "Akses Kecap Maja versi lama",
          order_index: 15,
          is_active: true,
          parent_id: "inventory"
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

// Helper function to group sidebar items by parent_id
export const groupSidebarItems = (items: SidebarItem[]) => {
  const groups = [
    {
      id: "main",
      title: "Menu Utama",
      items: items.filter(item => !item.parent_id)
    },
    {
      id: "revision",
      title: "Bahan Revisi 3210",
      items: items.filter(item => item.parent_id === "revision")
    },
    {
      id: "documents",
      title: "Dokumen dan Formulir",
      items: items.filter(item => item.parent_id === "documents")
    },
    {
      id: "reports",
      title: "Laporan & Rekap",
      items: items.filter(item => item.parent_id === "reports")
    },
    {
      id: "references",
      title: "Referensi & Peraturan",
      items: items.filter(item => item.parent_id === "references")
    },
    {
      id: "inventory",
      title: "Inventaris & Arsip",
      items: items.filter(item => item.parent_id === "inventory")
    }
  ];

  return groups.filter(group => group.items.length > 0);
};

export default useSidebar;