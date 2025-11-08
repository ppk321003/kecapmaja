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

// Komponen Bubble Background dengan Tailwind CSS
const BubbleBackground = () => {
  const bubbles = [
    { size: "w-8 h-8", left: "left-4", delay: "delay-0", duration: "duration-[18s]" },
    { size: "w-5 h-5", left: "left-1/4", delay: "delay-2000", duration: "duration-[20s]" },
    { size: "w-6 h-6", left: "left-2/5", delay: "delay-4000", duration: "duration-[16s]" },
    { size: "w-4 h-4", left: "left-3/5", delay: "delay-6000", duration: "duration-[22s]" },
    { size: "w-7 h-7", left: "left-4/5", delay: "delay-8000", duration: "duration-[19s]" },
    { size: "w-5 h-5", left: "left-11/12", delay: "delay-10000", duration: "duration-[17s]" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {bubbles.map((bubble, index) => (
        <div
          key={index}
          className={`absolute rounded-full bg-white/10 animate-float ${bubble.size} ${bubble.left} ${bubble.delay} ${bubble.duration}`}
          style={{
            bottom: '-2rem',
            animation: `float 15s ease-in-out infinite ${bubble.delay} ${bubble.duration}`
          }}
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
      {/* Tambahkan animasi gelembung */}
      <BubbleBackground />
      
      {/* Tambahkan CSS keyframes di sini */}
      <style>
        {`
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
        `}
      </style>
      
      <SidebarContent 
        className="font-['Inter',_sans-serif] flex-1 overflow-y-auto relative z-10 bg-transparent"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* CSS inline untuk hide scrollbar */}
        <style>
          {`
            .sidebar-content-hidden::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        
        <div className="flex-1 sidebar-content-hidden bg-transparent">
          <div className="px-5 py-7 border-b border-sidebar-border/30 relative z-10 bg-transparent">
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

          <SidebarGroup className="px-3 py-4 relative z-10 bg-transparent">
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

          <SidebarGroup className="px-3 py-2 relative z-10 bg-transparent">
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
        <div className="mt-auto px-5 py-4 border-t border-sidebar-border/30 relative z-10 bg-transparent">
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