import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import useSidebar from "@/hooks/use-sidebar";
import { SidebarItem } from "@/types";
import {
  FileText,
  Globe,
  Database,
  FileArchive,
  File,
  Book,
  Table,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface DynamicSidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const DynamicSidebar: React.FC<DynamicSidebarProps> = ({
  sidebarOpen,
  toggleSidebar,
}) => {
  const location = useLocation();
  const { data: menuItems = [], isLoading } = useSidebar();
  const { theme, toggleTheme } = useTheme();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Dokumen dan Formulir": false,
    "Laporan & Rekap": false,
    "Referensi & Peraturan": false,
    "Inventaris & Arsip": false,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      FileText: <FileText className="h-5 w-5" />,
      Globe: <Globe className="h-5 w-5" />,
      Database: <Database className="h-5 w-5" />,
      FileArchive: <FileArchive className="h-5 w-5" />,
      File: <File className="h-5 w-5" />,
      Book: <Book className="h-5 w-5" />,
      Table: <Table className="h-5 w-5" />,
    };
    return iconMap[iconName] || <FileText className="h-5 w-5" />;
  };

  // Kelompokkan menu berdasarkan kategori
  const groupedMenuItems = menuItems.reduce(
    (acc, item) => {
      let group = "Halaman Utama";

      if (
        ["Buat Dokumen", "Download Dokumen", "Blanko Visum", "Surat Pernyataan"].includes(
          item.title
        )
      ) {
        group = "Dokumen & Formulir";
      } else if (
        ["Rekap Honor Mitra", "Rekap SPK dan BAST", "Riwayat Kertas Kerja"].includes(
          item.title
        )
      ) {
        group = "Laporan & Rekap";
      } else if (
        ["Perka BPS", "SBM 2025", "SK Transport Lokal"].includes(item.title)
      ) {
        group = "Referensi & Peraturan";
      } else if (
        ["Stock Opname", "Kecap Maja (OLD)"].includes(item.title)
      ) {
        group = "Inventaris & Arsip";
      } else if (
        ["Bahan Revisi 3210"].includes(item.title)
      ) {
        group = "Bahan Revisi 3210";
      }

      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    },
    {} as Record<string, SidebarItem[]>
  );

  if (isLoading) {
    return (
      <aside className="fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar text-sidebar-foreground shadow-lg transition-transform duration-300 lg:static lg:translate-x-0">
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-full animate-pulse rounded-lg bg-sidebar-accent/30"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar text-sidebar-foreground shadow-lg transition-transform duration-300 lg:static lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 bg-teal-800">
          <Link to="/" className="flex items-center space-x-2">
            <img
              alt="Logo BPS"
              className="h-8 w-auto"
              src="/lovable-uploads/d9bb2043-8636-46b0-ad6b-f8384eef5f52.jpg"
            />
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground">Kecap Maja</span>
              <span className="text-xs text-sidebar-foreground/80">
                Keuangan Cekatan Anggaran Pengadaan
              </span>
            </div>
          </Link>
          {/* Toggle sidebar button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Toggle sidebar"
          >
            {/* Icon close / open */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </Button>
        </div>

        {/* Navigasi */}
        <div className="flex-1 overflow-y-auto p-4 bg-teal-700">
          <nav className="space-y-1">
            {Object.entries(groupedMenuItems).map(([groupName, items]) => {
              // Pastikan items adalah array
              if (!Array.isArray(items)) return null;

              // Grup utama dan Bahan Revisi tampilkan langsung
              if (groupName === "Menu Utama" || groupName === "Bahan Revisi 3210") {
                return (
                  <React.Fragment key={groupName}>
                    {items.map((item) => (
                      <Link
                        key={item.id}
                        to={item.path}
                        className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          location.pathname === item.path
                            ? "bg-sidebar-accent text-sidebar-foreground"
                            : "hover:bg-sidebar-accent/80 text-sidebar-foreground/90"
                        }`}
                        title={item.description}
                      >
                        {getIcon(item.icon)}
                        <span>{item.title}</span>
                      </Link>
                    ))}
                  </React.Fragment>
                );
              }

              // Untuk grup yang bisa diperluas
              return (
                <div key={groupName} className="space-y-1">
                  {/* Tombol toggle grup */}
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent/80 text-sidebar-foreground/90"
                    aria-expanded={!!expandedGroups[groupName]}
                  >
                    <div className="flex items-center space-x-2">
                      {/* Bisa tambahkan icon grup di sini */}
                      <span>{groupName}</span>
                    </div>
                    {/* Icon panah */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`h-4 w-4 transition-transform ${
                        expandedGroups[groupName] ? "rotate-90" : ""
                      }`}
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>

                  {/* Submenu jika grup diperluas */}
                  {expandedGroups[groupName] && (
                    <div className="ml-4 space-y-1 border-l border-sidebar-border pl-2">
                      {items.map((item) => (
                        <Link
                          key={item.id}
                          to={item.path}
                          className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            location.pathname === item.path
                              ? "bg-sidebar-accent text-sidebar-foreground"
                              : "hover:bg-sidebar-accent/80 text-sidebar-foreground/90"
                          }`}
                          title={item.description}
                        >
                          {getIcon(item.icon)}
                          <span>{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 bg-teal-700">
          <div className="text-xs text-sidebar-foreground/80 mb-2 text-center">
            Maju Aman Jeung Amanah
          </div>
          {/* Tombol ubah tema */}
          <Button
            variant="outline"
            onClick={toggleTheme}
            className="w-full border-sidebar-border hover:text-sidebar-foreground rounded-none font-medium text-sm bg-emerald-900 hover:bg-emerald-800"
            aria-label="Toggle theme"
          >
            {/* Icon mode gelap / terang */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-4 w-4 dark:hidden"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-4 w-4 hidden dark:inline"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
            <span className="hidden dark:inline">Light Mode</span>
            <span className="dark:hidden">Dark Mode</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default DynamicSidebar;