import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
interface SidebarItem {
  id: string;
  title: string;
  path: string;
  icon: string;
  description: string;
  order_index: number;
  is_active: boolean;
}

interface SidebarGroup {
  id: string;
  title: string;
  items: SidebarItem[];
}
export const useSidebar = () => {
  return useQuery({
    queryKey: ["sidebar"],
    queryFn: async () => {
      // Define default sidebar groups and items
      const defaultSidebarGroups: SidebarGroup[] = [
        {
          id: "group-1",
          title: "Menu Utama",
          items: [
            {
              id: "1",
              title: "Dashboard",
              path: "/",
              icon: "FileText",
              description: "Halaman utama aplikasi",
              order_index: 1,
              is_active: true
            }
          ]
        },
        {
          id: "group-2",
          title: "Bahan Revisi 3210",
          items: [
            {
              id: "6",
              title: "Bahan Revisi Web",
              path: "/bahan-revisi-web",
              icon: "Globe",
              description: "Akses bahan revisi via web",
              order_index: 6,
              is_active: true
            },
            {
              id: "7",
              title: "Bahan Revisi Spreadsheet",
              path: "/bahan-revisi-spreadsheet",
              icon: "Database",
              description: "Akses bahan revisi via Google Spreadsheet",
              order_index: 7,
              is_active: true
            }
          ]
        },
        {
          id: "group-3",
          title: "Dokumen dan Formulir",
          items: [
            {
              id: "2",
              title: "Buat Dokumen",
              path: "/buat-dokumen",
              icon: "FileText",
              description: "Buat berbagai jenis dokumen",
              order_index: 2,
              is_active: true
            },
            {
              id: "3",
              title: "Download Dokumen",
              path: "/download-dokumen",
              icon: "FileArchive",
              description: "Download dokumen yang tersedia",
              order_index: 3,
              is_active: true
            },
            {
              id: "11",
              title: "Blanko Visum",
              path: "/blanko-visum",
              icon: "File",
              description: "Akses blanko visum",
              order_index: 11,
              is_active: true
            },
            {
              id: "10",
              title: "Surat Pernyataan",
              path: "/surat-pernyataan",
              icon: "File",
              description: "Akses surat pernyataan",
              order_index: 10,
              is_active: true
            }
          ]
        },
        {
          id: "group-4",
          title: "Laporan & Rekap",
          items: [
            {
              id: "4",
              title: "Rekap Honor Mitra",
              path: "/rekap-honor",
              icon: "Table",
              description: "Rekap honor mitra per kegiatan",
              order_index: 4,
              is_active: true
            },
            {
              id: "9", 
              title: "Rekap SPK dan BAST",
              path: "/rekap-spk-bast",
              icon: "File",
              description: "Lihat rekap SPK dan BAST mitra statistik",
              order_index: 9,
              is_active: true
            },
            {
              id: "8",
              title: "Riwayat Kertas Kerja",
              path: "/riwayat-kertas-kerja",
              icon: "FileArchive",
              description: "Lihat riwayat kertas kerja dalam format PDF",
              order_index: 8,
              is_active: true
            }
          ]
        },
        {
          id: "group-5",
          title: "Referensi & Peraturan",
          items: [
            {
              id: "12",
              title: "Perka BPS",
              path: "/perka-bps",
              icon: "Book",
              description: "Lihat peraturan tentang standar biaya kegiatan statistik",
              order_index: 12,
              is_active: true
            },
            {
              id: "13",
              title: "SBM 2025",
              path: "/sbm-2025",
              icon: "Book",
              description: "Standar Biaya Masukan Tahun 2025",
              order_index: 13,
              is_active: true
            },
            {
              id: "15",
              title: "SK Transport Lokal",
              path: "/sk-translok",
              icon: "FileText",
              description: "Akses SK Transport Lokal",
              order_index: 15,
              is_active: true
            }
          ]
        },
        {
          id: "group-6",
          title: "Inventaris & Arsip",
          items: [
            {
              id: "5",
              title: "Stock Opname",
              path: "/stock-opname",
              icon: "Database",
              description: "Stock opname inventaris",
              order_index: 5,
              is_active: true
            },
            {
              id: "14",
              title: "Kecap Maja (OLD)",
              path: "/kecap-maja-old",
              icon: "FileArchive",
              description: "Akses Kecap Maja versi lama",
              order_index: 14,
              is_active: true
            }
          ]
        }
      ];
      
      try {
        // First fetch all active sidebar items from Supabase
        const { data: items, error } = await supabase
          .from("sidebar")
          .select("*")
          .eq("is_active", true)
          .order("order_index");
        
        if (error) {
          console.error("Error fetching sidebar items:", error);
          return defaultSidebarGroups;
        }
        
        // If we have items from Supabase, organize them into groups
        if (items && items.length > 0) {
          const supabaseItems = items as SidebarItem[];
          
          return [
            {
              id: "group-1",
              title: "Menu Utama",
              items: supabaseItems.filter(item => item.id === "1")
            },
            {
              id: "group-2",
              title: "Bahan Revisi 3210",
              items: supabaseItems.filter(item => ["6", "7"].includes(item.id))
            },
            {
              id: "group-3",
              title: "Dokumen dan Formulir",
              items: supabaseItems.filter(item => ["2", "3", "10", "11"].includes(item.id))
            },
            {
              id: "group-4",
              title: "Laporan & Rekap",
              items: supabaseItems.filter(item => ["4", "8", "9"].includes(item.id))
            },
            {
              id: "group-5",
              title: "Referensi & Peraturan",
              items: supabaseItems.filter(item => ["12", "13", "15"].includes(item.id))
            },
            {
              id: "group-6",
              title: "Inventaris & Arsip",
              items: supabaseItems.filter(item => ["5", "14"].includes(item.id))
            }
          ].filter(group => group.items.length > 0) as SidebarGroup[];
        }
        
        return defaultSidebarGroups;
      } catch (error) {
        console.error("Failed to fetch sidebar items:", error);
        return defaultSidebarGroups;
      }
    }
  });
};

export default useSidebar;