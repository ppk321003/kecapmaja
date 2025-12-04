import { NavLink } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  FileText,
  Users,
  DollarSign,
  ShoppingCart,
  ChevronDown,
  FolderOpen,
  FilePlus,
  Download as DownloadIcon,
  UserCog,
  Database,
  BookOpen,
  FileCheck,
  Link2,
  Briefcase,
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
  { title: "KarierKu", url: "/KarierKu", icon: Briefcase },
  { title: "Pengadaan", url: "/Pengadaan", icon: ShoppingCart },
  { title: "Linkers", url: "/linkers", icon: Link2 },
  { title: "Padamel-3210 | Mitra Kepka", url: "/entri-pengelola", icon: UserCog },
];

const additionalMenuItems = [
  { title: "Download Raw Data", url: "/download-raw-data", icon: DownloadIcon },
  { title: "SBML Tahunan", url: "/entri-SBML", icon: DollarSign },  
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
      className="border-r border-sidebar-border backdrop-blur-sm h-screen flex flex-col relative overflow-hidden"
      style={{
        background: "var(--gradient-primary)",
        boxShadow: "var(--shadow-sidebar)",
      }}
    >
      {/* Floating Bubbles Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
        <div className="bubble bubble-4"></div>
        <div className="bubble bubble-5"></div>
        <div className="bubble bubble-6"></div>
        <div className="bubble bubble-7"></div>
        <div className="bubble bubble-8"></div>
      </div>

      <SidebarContent
        className="font-['Inter',_sans-serif] flex-1 overflow-y-auto text-white relative z-10"
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
            
            @keyframes float-up {
              0% {
                transform: translateY(100%) translateX(0) scale(0);
                opacity: 0;
              }
              10% {
                opacity: 0.6;
                transform: translateY(90%) translateX(5px) scale(1);
              }
              50% {
                transform: translateY(50%) translateX(-10px) scale(1.1);
              }
              90% {
                opacity: 0.4;
                transform: translateY(10%) translateX(5px) scale(0.9);
              }
              100% {
                transform: translateY(-10%) translateX(0) scale(0);
                opacity: 0;
              }
            }
            
            .bubble {
              position: absolute;
              border-radius: 50%;
              background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1));
              animation: float-up linear infinite;
              box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.2);
            }
            
            .bubble-1 {
              width: 20px;
              height: 20px;
              left: 10%;
              animation-duration: 12s;
              animation-delay: 0s;
            }
            
            .bubble-2 {
              width: 15px;
              height: 15px;
              left: 30%;
              animation-duration: 15s;
              animation-delay: 2s;
            }
            
            .bubble-3 {
              width: 25px;
              height: 25px;
              left: 50%;
              animation-duration: 18s;
              animation-delay: 4s;
            }
            
            .bubble-4 {
              width: 12px;
              height: 12px;
              left: 70%;
              animation-duration: 14s;
              animation-delay: 1s;
            }
            
            .bubble-5 {
              width: 18px;
              height: 18px;
              left: 85%;
              animation-duration: 16s;
              animation-delay: 3s;
            }
            
            .bubble-6 {
              width: 10px;
              height: 10px;
              left: 20%;
              animation-duration: 20s;
              animation-delay: 5s;
            }
            
            .bubble-7 {
              width: 22px;
              height: 22px;
              left: 60%;
              animation-duration: 13s;
              animation-delay: 6s;
            }
            
            .bubble-8 {
              width: 14px;
              height: 14px;
              left: 40%;
              animation-duration: 17s;
              animation-delay: 7s;
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