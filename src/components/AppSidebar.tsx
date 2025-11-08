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

// Komponen Bubble Background
const BubbleBackground = () => {
  return (
    <div className="bubble-container">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={`bubble bubble-${i + 1}`}
        />
      ))}
    </div>
  );
};

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
        boxShadow: "var(--shadow-sidebar)"
      }}
    >
      {/* Tambahkan animasi gelembung di sini */}
      <BubbleBackground />
      
      <SidebarContent 
        className="font-['Inter',_sans-serif] flex-1 overflow-y-auto relative z-10"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* CSS inline untuk hide scrollbar dan animasi gelembung */}
        <style>
          {`
            .sidebar-content-hidden::-webkit-scrollbar {
              display: none;
            }
            
            /* Bubble Animation */
            @keyframes float {
              0% {
                transform: translateY(0) translateX(0) rotate(0deg);
                opacity: 0.2;
              }
              25% {
                transform: translateY(-80px) translateX(15px) rotate(90deg);
                opacity: 0.4;
              }
              50% {
                transform: translateY(-160px) translateX(-10px) rotate(180deg);
                opacity: 0.3;
              }
              75% {
                transform: translateY(-240px) translateX(8px) rotate(270deg);
                opacity: 0.5;
              }
              100% {
                transform: translateY(-320px) translateX(0) rotate(360deg);
                opacity: 0.2;
              }
            }

            .bubble-container {
              position: absolute;
              inset: 0;
              overflow: hidden;
              pointer-events: none;
              z-index: 0;
            }

            .bubble {
              position: absolute;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 50%;
              animation: float 15s ease-in-out infinite;
              bottom: -50px;
            }

            .bubble-1 {
              width: 30px;
              height: 30px;
              left: 10%;
              animation-delay: 0s;
              animation-duration: 18s;
            }

            .bubble-2 {
              width: 20px;
              height: 20px;
              left: 25%;
              animation-delay: 2s;
              animation-duration: 20s;
            }

            .bubble-3 {
              width: 25px;
              height: 25px;
              left: 40%;
              animation-delay: 4s;
              animation-duration: 16s;
            }

            .bubble-4 {
              width: 15px;
              height: 15px;
              left: 60%;
              animation-delay: 6s;
              animation-duration: 22s;
            }

            .bubble-5 {
              width: 22px;
              height: 22px;
              left: 75%;
              animation-delay: 8s;
              animation-duration: 19s;
            }

            .bubble-6 {
              width: 18px;
              height: 18px;
              left: 90%;
              animation-delay: 10s;
              animation-duration: 17s;
            }
          `}
        </style>
        
        <div className="flex-1 sidebar-content-hidden">
          <div className="px-5 py-7 border-b border-sidebar-border/30 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-sidebar-accent/50 backdrop-blur-sm flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-sidebar-foreground" />
              </div>
              <h2 className="text-xl font-bold text-sidebar-foreground tracking-tight">KECAP MAJA</h2>
            </div>
            <p className="text-xs text-sidebar-foreground/70 mt-1 ml-13 font-light">
              Kerja Efisien, Cepat, Akurat, Profesional
            </p>
          </div>

          <SidebarGroup className="px-3 py-4 relative z-10">
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

          <SidebarGroup className="px-3 py-2 relative z-10">
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
        </div>

        {/* Footer with mini branding */}
        <div className="mt-auto px-5 py-4 border-t border-sidebar-border/30 relative z-10">
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