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
  UsersRound,
  PiggyBank,
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
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";

const baseMenuItems = [
  { title: "Beranda", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "SPK dan BAST", url: "/spk-bast", icon: FileText },
  { title: "Sigap SPJ", url: "/usulan-pencairan", icon: DollarSign },
  { title: "Kecap to Bendahara", url: "/aki-to-bendahara", icon: DollarSign },
  { title: "Block Tanggal Perjalanan", url: "/BlockTanggal", icon: Users },
  { title: "KarierKu", url: "/KarierKu", icon: Briefcase },
  { title: "Pengadaan", url: "/Pengadaan", icon: ShoppingCart },
  { title: "Linkers", url: "/linkers", icon: Link2 },
  { title: "Padamel-3210 | Mitra Kepka", url: "/entri-pengelola", icon: UserCog },
];

const sikostikMenuItem = { title: "Sikostik 28", url: "/sikostik28", icon: PiggyBank };

const additionalMenuItems = [
  { title: "Pedoman", url: "/pedoman", icon: BookOpen },
];

const eDokumenSubItems: { title: string; url: string; icon: typeof FilePlus; external?: boolean }[] = [
  { title: "Buat e-Dokumen", url: "/e-dokumen/buat", icon: FilePlus },
  { title: "Download e-Dokumen", url: "/e-dokumen/download", icon: DownloadIcon },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const isEDokumenActive = currentPath.startsWith("/e-dokumen");
  const [eDokumenOpen, setEDokumenOpen] = useState(() => isEDokumenActive);
  
  // Check if user is PPK for User Management menu
  const isPPK = user?.role === "Pejabat Pembuat Komitmen";
  
  // Check if user is satker 3210 for Sikostik 28 menu
  const isSatker3210 = user?.satker === '3210';
  
  // Get satker_nama from satker config (column B) - current logged-in user's satker
  const satkerNama = useMemo(() => {
    return satkerContext?.getUserSatkerConfig()?.satker_nama || 'BPS';
  }, [satkerContext]);
  
  // Conditionally build main menu items based on satker
  const mainMenuItems = useMemo(() => {
    return baseMenuItems.map((item) => {
      if (item.title.startsWith("Padamel-3210")) {
        const satkerId = satkerContext?.getUserSatkerConfig()?.satker_id || "3210";
        return {
          ...item,
          title: `Padamel-${satkerId} | Mitra Kepka`,
        };
      }
      return item;
    });
  }, [satkerContext]);

  console.log("Logged-in user:", user);
  console.log("isSatker3210:", isSatker3210);

  return (
    <Sidebar
      className="border-r border-sidebar-border backdrop-blur-sm"
      style={{
        background: "var(--gradient-primary)",
        boxShadow: "var(--shadow-sidebar)",
      }}
    >

      <SidebarContent
        className="font-['Inter',_sans-serif] flex flex-col text-white relative z-10"
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
            
            @keyframes float-around {
              0% {
                transform: translate(0, 0) scale(0.8);
                opacity: 0.3;
              }
              15% {
                opacity: 0.7;
                transform: translate(20px, 30px) scale(1);
              }
              30% {
                transform: translate(-25px, 60px) scale(1.1);
              }
              45% {
                transform: translate(30px, 90px) scale(0.95);
              }
              60% {
                transform: translate(-20px, 120px) scale(1.05);
              }
              75% {
                opacity: 0.5;
                transform: translate(25px, 150px) scale(0.9);
              }
              90% {
                opacity: 0.3;
                transform: translate(-15px, 180px) scale(0.85);
              }
              100% {
                transform: translate(0, 200px) scale(0.7);
                opacity: 0;
              }
            }
            
            .bubble {
              position: absolute;
              top: -5%;
              border-radius: 50%;
              background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.15));
              animation: float-around ease-in-out infinite;
              box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.3), 0 0 8px rgba(255, 255, 255, 0.1);
            }
            
            .bubble-1 {
              width: 28px;
              height: 28px;
              left: 8%;
              animation-duration: 8s;
              animation-delay: 0s;
            }
            
            .bubble-2 {
              width: 22px;
              height: 22px;
              left: 25%;
              animation-duration: 9s;
              animation-delay: 1s;
            }
            
            .bubble-3 {
              width: 35px;
              height: 35px;
              left: 45%;
              animation-duration: 10s;
              animation-delay: 2s;
            }
            
            .bubble-4 {
              width: 18px;
              height: 18px;
              left: 65%;
              animation-duration: 7s;
              animation-delay: 0.5s;
            }
            
            .bubble-5 {
              width: 26px;
              height: 26px;
              left: 80%;
              animation-duration: 9s;
              animation-delay: 1.5s;
            }
            
            .bubble-6 {
              width: 16px;
              height: 16px;
              left: 15%;
              animation-duration: 11s;
              animation-delay: 3s;
            }
            
            .bubble-7 {
              width: 30px;
              height: 30px;
              left: 55%;
              animation-duration: 8s;
              animation-delay: 2.5s;
            }
            
            .bubble-8 {
              width: 20px;
              height: 20px;
              left: 35%;
              animation-duration: 10s;
              animation-delay: 4s;
            }
            
            .bubble-9 {
              width: 24px;
              height: 24px;
              left: 5%;
              animation-duration: 7.5s;
              animation-delay: 1.2s;
            }
            
            .bubble-10 {
              width: 32px;
              height: 32px;
              left: 70%;
              animation-duration: 9.5s;
              animation-delay: 3.5s;
            }
            
            .bubble-11 {
              width: 14px;
              height: 14px;
              left: 90%;
              animation-duration: 6.5s;
              animation-delay: 0.8s;
            }
            
            .bubble-12 {
              width: 28px;
              height: 28px;
              left: 40%;
              animation-duration: 8.5s;
              animation-delay: 2.2s;
            }
            
            @keyframes sparkle-move {
              0% {
                transform: translateX(-10px) scale(0);
                opacity: 0;
              }
              20% {
                opacity: 1;
                transform: translateX(0) scale(1);
              }
              80% {
                opacity: 0.8;
                transform: translateX(100px) scale(0.8);
              }
              100% {
                transform: translateX(150px) scale(0);
                opacity: 0;
              }
            }
            
            @keyframes sparkle-pulse {
              0%, 100% {
                box-shadow: 0 0 4px rgba(255, 255, 255, 0.6);
              }
              50% {
                box-shadow: 0 0 12px rgba(255, 255, 255, 0.9);
              }
            }
            
            .sparkle {
              position: absolute;
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.9);
              animation: sparkle-move 3s ease-in-out infinite, sparkle-pulse 1s ease-in-out infinite;
            }
            
            .sparkle-1 {
              bottom: 15%;
              left: 5%;
              animation-duration: 2.5s, 0.8s;
              animation-delay: 0s;
            }
            
            .sparkle-2 {
              bottom: 45%;
              left: 10%;
              animation-duration: 3s, 1s;
              animation-delay: 0.5s;
            }
            
            .sparkle-3 {
              bottom: 70%;
              left: 15%;
              animation-duration: 2s, 0.7s;
              animation-delay: 1s;
            }
            
            .sparkle-4 {
              bottom: 25%;
              left: 8%;
              animation-duration: 2.8s, 0.9s;
              animation-delay: 1.5s;
            }
            
            .sparkle-5 {
              bottom: 55%;
              left: 3%;
              animation-duration: 2.2s, 0.6s;
              animation-delay: 2s;
            }
            
            .sparkle-6 {
              bottom: 35%;
              left: 12%;
              animation-duration: 2.6s, 1.1s;
              animation-delay: 0.3s;
            }
          `}
        </style>

        {/* Floating Bubbles Animation */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{ overflow: 'visible' }}>
          <div className="bubble bubble-1"></div>
          <div className="bubble bubble-2"></div>
          <div className="bubble bubble-3"></div>
          <div className="bubble bubble-4"></div>
          <div className="bubble bubble-5"></div>
          <div className="bubble bubble-6"></div>
          <div className="bubble bubble-7"></div>
          <div className="bubble bubble-8"></div>
          <div className="bubble bubble-9"></div>
          <div className="bubble bubble-10"></div>
          <div className="bubble bubble-11"></div>
          <div className="bubble bubble-12"></div>
        </div>

        {/* Fast Sparkle Animation at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden pointer-events-none z-0">
          <div className="sparkle sparkle-1"></div>
          <div className="sparkle sparkle-2"></div>
          <div className="sparkle sparkle-3"></div>
          <div className="sparkle sparkle-4"></div>
          <div className="sparkle sparkle-5"></div>
          <div className="sparkle sparkle-6"></div>
        </div>

        <div className="flex flex-col flex-1 relative z-10 min-h-0">
          {/* Scrollable Content */}
          <div className="flex-1 sidebar-content-hidden overflow-y-auto">
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

                {/* MENU SIKOSTIK 28 - Only visible for Satker 3210 */}
                {isSatker3210 && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={sikostikMenuItem.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "text-white font-semibold transition-all duration-200"
                            : "text-white/90 hover:text-white transition-all duration-200"
                        }
                      >
                        <sikostikMenuItem.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 text-white" />
                        {open && <span className="font-medium">{sikostikMenuItem.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* MENU E-DOKUMEN */}
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

                {/* User Management - Only visible for PPK */}
                {isPPK && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/user-management"
                        end
                        className={({ isActive }) =>
                        isActive
                          ? "text-white font-semibold transition-all duration-200"
                          : "text-white/90 hover:text-white transition-all duration-200"
                        }
                      >
                        <UsersRound className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 text-white" />
                        {open && <span className="font-medium">User Management</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
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

          {/* FOOTER - Fixed at bottom */}
          <div className="px-5 py-4 border-t border-white/20 flex-shrink-0">
            <div className="flex items-center gap-2 text-white/70">
              <Database className="h-4 w-4 text-white" />
              {open && (
                <div className="text-xs font-light">
                  <p className="font-medium text-white">{satkerNama}</p>
                  <p className="text-[10px] opacity-70 text-white/80">v1.0.0</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}