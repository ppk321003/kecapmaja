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
  Link2,
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
  { title: "Kecap to Bendahara", url: "/aki-to-bendahara", icon: DollarSign },
  { title: "Block Tanggal Perjalanan", url: "/BlockTanggal", icon: Users },
  { title: "Pengadaan", url: "/Pengadaan", icon: Users },
  { title: "SBML", url: "/entri-sbml", icon: Database },
  { title: "Mitra Kepka", url: "/mitra-kepka", icon: Users },
  { title: "Pengelola Anggaran", url: "/entri-pengelola", icon: UserCog },
  { title: "Linkers", url: "/linkers", icon: Link2 },
  { title: "Download Raw Data", url: "/download-raw-data", icon: DownloadIcon },
  { title: "Pedoman", url: "/pedoman", icon: BookOpen },
];

const eDokumenSubItems = [
  { title: "Buat e-Dokumen", url: "/e-dokumen/buat", icon: FilePlus },
  { title: "Download e-Dokumen", url: "/e-dokumen/download", icon: DownloadIcon },
  { title: "Blanko Visum", url: "https://drive.google.com/drive/u/1/folders/19NqkvrO0UZJj9nm4bZzfHQVraqdZntN2?usp=sharing", icon: FileCheck, external: true },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";

  const isEDokumenActive = currentPath.startsWith("/e-dokumen");
  const [eDokumenOpen, setEDokumenOpen] = useState(() => isEDokumenActive);

  return (
    <Sidebar 
      className="border-r border-sidebar-border backdrop-blur-sm h-screen flex flex-col" 
      style={{ 
        background: "var(--gradient-primary)",
        boxShadow: "var(--shadow-sidebar)"
      }}
    >
      <SidebarContent 
        className="font-['Inter',_sans-serif] flex-1 overflow-y-auto sidebar-content-hidden"
      >
        {/* CSS inline untuk hide scrollbar di Webkit browsers */}
        <style>
          {`
            .sidebar-content-hidden::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        
        <div className="flex-1">
          {/* Header dengan slogan seperti gambar */}
          <div className="px-5 py-6 border-b border-sidebar-border/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-sidebar-accent/50 backdrop-blur-sm flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-sidebar-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-sidebar-foreground tracking-tight">KECAP MAJA</h2>
                <p className="text-xs text-sidebar-foreground/70 font-light mt-1">
                  Kerja Efisien, Cepat, Akurat, Profesional
                </p>
              </div>
            </div>
          </div>

          {/* Menu Utama - TRANSPARAN seperti gambar */}
          <SidebarGroup className="px-3 py-4">
            <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-semibold uppercase tracking-wider mb-3 px-3">
              Menu Utama
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {mainMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                            isActive
                              ? "text-sidebar-primary-foreground bg-sidebar-primary/90 font-medium shadow-sm"
                              : "text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-white/10 backdrop-blur-sm"
                          }`
                        }
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {open && <span className="font-normal text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* e-Dokumen Menu - TRANSPARAN */}
          <SidebarGroup className="px-3 py-2">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                <Collapsible open={eDokumenOpen} onOpenChange={setEDokumenOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={
                          `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 w-full ${
                            isEDokumenActive
                              ? "text-sidebar-primary-foreground bg-sidebar-primary/90 font-medium shadow-sm"
                              : "text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-white/10 backdrop-blur-sm"
                          }`
                        }
                      >
                        <FolderOpen className="h-4 w-4 flex-shrink-0" />
                        {open && <span className="font-normal text-sm">e-Dokumen</span>}
                        {open && (
                          <ChevronDown 
                            className="ml-auto h-4 w-4 transition-transform duration-300 flex-shrink-0" 
                            style={{ transform: eDokumenOpen ? "rotate(180deg)" : "rotate(0deg)" }} 
                          />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1">
                      <SidebarMenuSub className="ml-4 border-l-2 border-sidebar-border/30 pl-2 space-y-0.5">
                        {eDokumenSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              {subItem.external ? (
                                <a
                                  href={subItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-white/5 rounded-md transition-all duration-200 text-sm font-light"
                                >
                                  <subItem.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>{subItem.title}</span>
                                </a>
                              ) : (
                                <NavLink
                                  to={subItem.url}
                                  className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-sm font-light ${
                                      isActive
                                        ? "text-sidebar-primary-foreground bg-sidebar-primary/80"
                                        : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-white/5"
                                    }`
                                  }
                                >
                                  <subItem.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>{subItem.title}</span>
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
        </div>

        {/* Footer */}
        <div className="mt-auto px-5 py-4 border-t border-sidebar-border/30">
          <div className="flex items-center gap-2 text-sidebar-foreground/60">
            <Database className="h-4 w-4 flex-shrink-0" />
            {open && (
              <div className="text-xs">
                <p className="font-medium">BPS Kab. Majalengka</p>
                <p className="text-[10px] opacity-70 mt-0.5">v1.0.0</p>
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}