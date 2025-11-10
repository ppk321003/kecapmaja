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
  { title: "Padamel-3210 | Mitra Kepka", url: "/entri-pengelola", icon: UserCog },
  { title: "Linkers", url: "/linkers", icon: Link2 },
];

const additionalMenuItems = [
  { title: "Download Raw Data", url: "/download-raw-data", icon: DownloadIcon },
  { title: "Pedoman", url: "/pedoman", icon: BookOpen },
];

const eDokumenSubItems = [
  { title: "Buat e-Dokumen", url: "/e-dokumen/buat", icon: FilePlus },
  { title: "Download e-Dokumen", url: "/e-dokumen/download", icon: DownloadIcon },
  {
    title: "Blanko Visum",
    url: "https://drive.google.com/drive/u/1/folders/19NqkvrO0UZJj9nm4bZzfHQVraqdZntN2?usp=sharing",
    icon: FileCheck,
    external: true,
  },
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
        boxShadow: "var(--shadow-sidebar)",
      }}
    >
      <SidebarContent
        className="font-['Inter',_sans-serif] flex-1 overflow-y-auto text-white"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>
          {`
            .sidebar-content-hidden::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>

        <div className="flex-1 sidebar-content-hidden">
          {/* HEADER LOGO */}
          <div className="px-5 py-7 border-b border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                KECAP MAJA
              </h2>
            </div>
            <p className="text-xs text-white/80 mt-1 ml-13 font-light">
              Kerja Efisien, Cepat, Akurat, Profesional
            </p>
          </div>

          {/* MENU UTAMA */}
          <SidebarGroup className="px-3 py-4">
            <SidebarGroupLabel className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3 px-3">
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
                          ? "text-white font-semibold transition-all duration-200"
                          : "text-white/90 hover:text-white transition-all duration-200"
                        }
                      >
                        <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 text-white" />
                        {open && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* MENU E-DOKUMEN */}
          <SidebarGroup className="px-3 py-2">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <Collapsible open={eDokumenOpen} onOpenChange={setEDokumenOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={
                          isEDokumenActive
                            ? "relative text-white font-semibold transition-all duration-200 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-white before:rounded-r-md"
                            : "text-white/90 hover:text-white transition-all duration-200"
                        }
                      >
                        <FolderOpen className="h-4 w-4 text-white transition-transform duration-200" />
                        {open && <span className="font-medium">e-Dokumen</span>}
                        {open && (
                          <ChevronDown
                            className="ml-auto h-4 w-4 text-white transition-transform duration-300"
                            style={{
                              transform: eDokumenOpen ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-1">
                      <SidebarMenuSub className="ml-4 border-l border-white/20 pl-2 space-y-1">
                        {eDokumenSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              {subItem.external ? (
                                <a
                                  href={subItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white/80 hover:text-white transition-all duration-200 flex items-center gap-2 group"
                                >
                                  <subItem.icon className="h-3.5 w-3.5 text-white transition-transform duration-200 group-hover:scale-110" />
                                  <span className="text-sm font-light">{subItem.title}</span>
                                </a>
                              ) : (
                                <NavLink
                                  to={subItem.url}
                                  className={({ isActive }) =>
                                    isActive
                                      ? "text-white font-medium transition-all duration-200"
                                      : "text-white/80 hover:text-white transition-all duration-200"
                                  }
                                >
                                  <subItem.icon className="h-3.5 w-3.5 text-white transition-transform duration-200 group-hover:scale-110" />
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

          {/* MENU TAMBAHAN (Download Raw Data & Pedoman) */}
          <SidebarGroup className="px-3 py-2">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {additionalMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                        isActive
                          ? "text-white font-semibold transition-all duration-200"
                          : "text-white/90 hover:text-white transition-all duration-200"
                        }
                      >
                        <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 text-white" />
                        {open && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* FOOTER */}
        <div className="mt-auto px-5 py-4 border-t border-white/20">
          <div className="flex items-center gap-2 text-white/70">
            <Database className="h-4 w-4 text-white" />
            {open && (
              <div className="text-xs font-light">
                <p className="font-medium text-white">BPS Kab. Majalengka</p>
                <p className="text-[10px] opacity-70 text-white/80">v1.0.0</p>
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}