import { NavLink } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  FileText,
  Users,
  DollarSign,
  ChevronDown,
  FolderOpen,
  FilePlus,
  Download as DownloadIcon,
  UserCog,
  Database,
  BookOpen,
  FileCheck,
  FileSpreadsheet,
  FileType,
  ExternalLink,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const mainMenuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "SPK dan BAST", url: "/spk-bast", icon: FileText },
  { title: "Aki to Bendahara", url: "/aki-to-bendahara", icon: DollarSign },
  { title: "Block Tanggal Perjalanan", url: "/BlockTanggal", icon: Users },
  { title: "Pengadaan", url: "/Pengadaan", icon: Users },
  { title: "SBML", url: "/entri-sbml", icon: Database },
  { title: "Mitra Kepka", url: "/mitra-kepka", icon: Users },
    { title: "Pengelola Anggaran", url: "/entri-pengelola", icon: UserCog },
  { title: "Download Raw Data", url: "/download-raw-data", icon: DownloadIcon },
  { title: "Pedoman", url: "/pedoman", icon: BookOpen },
];

const eDokumenSubItems = [
  { title: "Buat e-Dokumen", url: "/e-dokumen/buat", icon: FilePlus },
  { title: "Download e-Dokumen", url: "/e-dokumen/download", icon: DownloadIcon },
  { title: "Blanko Visum", url: "https://drive.google.com/drive/u/1/folders/19NqkvrO0UZJj9nm4bZzfHQVraqdZntN2?usp=sharing", icon: FileCheck, external: true },
  { title: "Riwayat Kertas Kerja (Excel)", url: "https://drive.google.com/drive/folders/1MUBorF7HngfDpQPaPZC_wIIcH9cN_AU1", icon: FileSpreadsheet, external: true },
  { title: "Riwayat Kertas Kerja (PDF)", url: "https://drive.google.com/drive/folders/1bP4d3iQ61ogw6z1G9hoiIwFXw5DhH40P", icon: FileType, external: true },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";

  const isEDokumenActive = currentPath.startsWith("/e-dokumen");
  const [eDokumenOpen, setEDokumenOpen] = useState(() => isEDokumenActive);


  return (
    <Sidebar 
      className="border-r border-sidebar-border backdrop-blur-sm" 
      style={{ 
        background: "var(--gradient-primary)",
        boxShadow: "var(--shadow-sidebar)"
      }}
    >
      <SidebarContent className="font-['Inter',_sans-serif]">
        <div className="px-5 py-7 border-b border-sidebar-border/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-sidebar-accent/50 backdrop-blur-sm flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-sidebar-foreground" />
            </div>
            <h2 className="text-xl font-bold text-sidebar-foreground tracking-tight">AKI MAJA</h2>
          </div>
          <p className="text-xs text-sidebar-foreground/70 mt-1 ml-13 font-light">
            Aplikasi Kinerja, Monitoring dan Administrasi
          </p>
        </div>

        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-semibold uppercase tracking-wider mb-3 px-3">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "relative bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium rounded-lg transition-all duration-200 backdrop-blur-sm"
                          : "text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 rounded-lg transition-all duration-200"
                      }
                      style={({ isActive }) => isActive ? { boxShadow: "var(--shadow-menu-active)" } : {}}
                    >
                      <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      {open && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-3 py-2">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <Collapsible open={eDokumenOpen} onOpenChange={setEDokumenOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={
                        isEDokumenActive
                          ? "relative bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium rounded-lg transition-all duration-200 backdrop-blur-sm"
                          : "text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 rounded-lg transition-all duration-200"
                      }
                      style={isEDokumenActive ? { boxShadow: "var(--shadow-menu-active)" } : {}}
                    >
                      <FolderOpen className="h-4 w-4 transition-transform duration-200" />
                      {open && <span className="font-medium">e-Dokumen</span>}
                      {open && (
                        <ChevronDown 
                          className="ml-auto h-4 w-4 transition-transform duration-300" 
                          style={{ transform: eDokumenOpen ? "rotate(180deg)" : "rotate(0deg)" }} 
                        />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1">
                    <SidebarMenuSub className="ml-4 border-l-2 border-sidebar-border/30 pl-2 space-y-1">
                      {eDokumenSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            {subItem.external ? (
                              <a
                                href={subItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 rounded-md transition-all duration-200 flex items-center gap-2 group"
                              >
                                <subItem.icon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
                                <span className="text-sm font-light">{subItem.title}</span>
                                <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                              </a>
                            ) : (
                              <NavLink
                                to={subItem.url}
                                className={({ isActive }) =>
                                  isActive
                                    ? "bg-sidebar-accent/60 text-sidebar-accent-foreground font-medium rounded-md transition-all duration-200"
                                    : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 rounded-md transition-all duration-200"
                                }
                              >
                                <subItem.icon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
                                <span className="text-sm font-light">{subItem.title}</span>
                              </NavLink>
                            )}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer with mini branding */}
        <div className="mt-auto px-5 py-4 border-t border-sidebar-border/30">
          <div className="flex items-center gap-2 text-sidebar-foreground/50">
            <Database className="h-4 w-4" />
            {open && (
              <div className="text-xs font-light">
                <p className="font-medium">BPS Kab. Majalengka</p>
                <p className="text-[10px] opacity-70">v1.0.0</p>
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
