
import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, Menu, X, FileText, Globe, Database, FileArchive, File, Book, Settings, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { 
      title: "Menu Utama", 
      path: "/", 
      icon: <FileText className="h-5 w-5" /> 
    },
    { 
      title: "Buat Dokumen", 
      path: "/buat-dokumen", 
      icon: <FileText className="h-5 w-5" /> 
    },
    {
      title: "Data Google Sheets",
      path: "/google-sheets",
      icon: <Table className="h-5 w-5" />
    },
    { 
      title: "Bahan Revisi 3210 (Web)", 
      path: "/bahan-revisi-web", 
      icon: <Globe className="h-5 w-5" /> 
    },
    { 
      title: "Bahan Revisi 3210 (Spreadsheet)", 
      path: "/bahan-revisi-spreadsheet", 
      icon: <Database className="h-5 w-5" /> 
    },
    { 
      title: "Riwayat Kertas Kerja", 
      path: "/riwayat-kertas-kerja", 
      icon: <FileArchive className="h-5 w-5" /> 
    },
    { 
      title: "Rekap SPK dan BAST", 
      path: "/rekap-spk-bast", 
      icon: <File className="h-5 w-5" /> 
    },
    { 
      title: "Surat Pernyataan", 
      path: "/surat-pernyataan", 
      icon: <File className="h-5 w-5" /> 
    },
    { 
      title: "Blanko Visum", 
      path: "/blanko-visum", 
      icon: <File className="h-5 w-5" /> 
    },
    { 
      title: "Perka BPS", 
      path: "/perka-bps", 
      icon: <Book className="h-5 w-5" /> 
    },
    { 
      title: "SBM 2025", 
      path: "/sbm-2025", 
      icon: <Book className="h-5 w-5" /> 
    },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar for larger screens */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-[#1EAEDB] text-white shadow-lg transition-transform duration-300 dark:bg-[#0FA0CE] lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-white/20 px-4">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="https://bps.go.id/images/logo-bps.svg" 
                alt="Logo BPS" 
                className="h-8 w-auto" 
              />
              <div className="flex flex-col">
                <span className="font-bold text-white">Kecap Maja</span>
                <span className="text-xs text-white/80">Keuangan Cekatan Anggaran Pengadaan</span>
              </div>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar} 
              className="lg:hidden text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    location.pathname === item.path 
                      ? "bg-white/20 text-white" 
                      : "hover:bg-white/10 text-white/90"
                  }`}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="border-t border-white/20 p-4">
            <div className="text-xs text-white/80 mb-2 text-center">MAJA: Maju Aman Jeung Amanah</div>
            <Button 
              variant="outline" 
              onClick={toggleTheme} 
              className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
            >
              {theme === "light" ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : (
                <Sun className="mr-2 h-4 w-4" />
              )}
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 dark:bg-gray-900">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-auto flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Card className="p-4 md:p-6">
            {children}
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Layout;
