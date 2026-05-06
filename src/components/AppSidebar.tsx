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
  Receipt,
  Plus,
  BarChart3,
  Smartphone,
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

// ALWAYS VISIBLE ITEMS
const topLevelItems = [
  { title: "Beranda", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

// MENU GROUP: KEUANGAN
const keuanganItems = [
  { title: "Sigap SPJ", url: "/usulan-pencairan", icon: DollarSign },
  { title: "SPK dan BAST", url: "/spk-bast", icon: FileText },
  { title: "Anggaran", url: "/bahan-revisi-anggaran", icon: BarChart3, conditional: "showBahanRevisiAnggaran" },
  { title: "Kecap to Bendahara", url: "/aki-to-bendahara", icon: DollarSign },
  { title: "Block Tanggal Perjalanan", url: "/BlockTanggal", icon: Users },
];

// MENU GROUP: PENGADAAN
const pengadaanItems = [
  { title: "Usul Pengadaan", url: "/Pengadaan", icon: ShoppingCart },
  { title: "Monitoring Pulsa Bulanan", url: "/monitoring-pulsa", icon: Smartphone },
];

// MENU GROUP: KEPEGAWAIAN
const kepegawaianItems = [
  { title: "KarierKu", url: "/KarierKu", icon: Briefcase },
  { title: "Padamel | Mitra Kepka", url: "/entri-pengelola", icon: UserCog },
  { title: "Konfirmasi KEPKA 2026", url: "/konfirmasi-kepka-2026", icon: FileCheck, conditional: "isSatker3210" },
];

// MENU GROUP: e-DOKUMEN SUB ITEMS
const eDokumenSubItems: { title: string; url: string; icon: typeof FilePlus; external?: boolean }[] = [
  { title: "Buat e-Dokumen", url: "/e-dokumen/buat", icon: FilePlus },
  { title: "Download e-Dokumen", url: "/e-dokumen/download", icon: DownloadIcon },
];

// MENU GROUP: DOKUMEN
const dokumenItems = [
  { title: "e-Dokumen", url: "/e-dokumen", icon: FolderOpen, hasSubItems: true, subItems: eDokumenSubItems },
  { title: "Cetak Kuitansi", url: "/cetak-kuitansi", icon: Receipt, conditional: "showCetakKuitansi" },
];

// MENU GROUP: ADMIN & UTILITAS
const adminUtilitasItems = [
  { title: "User Management", url: "/user-management", icon: UsersRound, conditional: "isPPK" },
  { title: "Sikostik 28", url: "/sikostik28", icon: PiggyBank, conditional: "isSatker3210" },
  { title: "Linkers", url: "/linkers", icon: Link2 },
  { title: "Pedoman", url: "/pedoman", icon: BookOpen },
];

interface MenuGroup {
  title: string;
  icon: any;
  items: MenuItem[];
}

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  conditional?: string;
  hasSubItems?: boolean;
  subItems?: MenuItem[];
}

export function AppSidebar() {
  const { open } = useSidebar();
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  
  // State untuk track which groups are open - Default collapsed
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    keuangan: false,
    pengadaan: false,
    kepegawaian: false,
    dokumen: false,
    adminUtilitas: false,
  });

  const [eDokumenOpen, setEDokumenOpen] = useState(() => currentPath.startsWith("/e-dokumen"));

  // Check if user is PPK for User Management menu
  const isPPK = user?.role === "Pejabat Pembuat Komitmen";
  
  // Check if user has Fungsi role for Anggaran menu
  const hasFungsiRole = user?.role?.startsWith("Fungsi") === true;
  
  // Show Anggaran menu for PPK OR Fungsi role
  const showBahanRevisiAnggaran = isPPK || hasFungsiRole;
  
  // Check if user is satker 3210 for Sikostik 28 menu
  const isSatker3210 = user?.satker === '3210';
  
  // Show Cetak Kuitansi for PPK Satker 3210
  const showCetakKuitansi = isSatker3210 && isPPK;

  // Get satker_nama from satker config (column B) - current logged-in user's satker
  const satkerNama = useMemo(() => {
    return satkerContext?.getUserSatkerConfig()?.satker_nama || 'BPS';
  }, [satkerContext]);

  // Helper function to check if item should be visible
  const shouldShowItem = (item: MenuItem): boolean => {
    if (!item.conditional) return true;
    
    const conditions: Record<string, boolean> = {
      isPPK,
      isSatker3210,
      showBahanRevisiAnggaran,
      showCetakKuitansi,
    };
    
    return conditions[item.conditional] ?? false;
  };

  // Helper function to filter items based on conditions
  const getVisibleItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(shouldShowItem);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  console.log("AppSidebar Loaded - User:", user?.username, "| Role:", user?.role, "| Satker:", user?.satker);

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

            {/* NEW GROUPED MENU STRUCTURE */}
            <SidebarGroup className="px-3 py-4">
              <SidebarGroupLabel className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3 px-3">
                Menu Utama
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {/* TOP LEVEL: Beranda & Dashboard */}
                  {topLevelItems.map((item) => (
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

            {/* MENU GROUP: KEUANGAN */}
            {getVisibleItems(keuanganItems).length > 0 && (
              <SidebarGroup className="px-3 py-1">
                <SidebarGroupContent className="mt-0">
                  <SidebarMenu className="space-y-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => toggleGroup("keuangan")}
                          className={"flex items-center justify-between w-full transition-all duration-200 " + (true ? "text-white font-semibold" : "text-white/90 hover:text-white")}
                        >
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 text-white" />
                            {open && <span className="font-medium">Keuangan</span>}
                          </div>
                          <ChevronDown
                            className="h-4 w-4 transition-transform duration-300"
                            style={{
                              transform: expandedGroups.keuangan ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
                {expandedGroups.keuangan && (
                  <SidebarGroupContent className="mt-1">
                    <SidebarMenu className="space-y-0.5 pl-2">
                      {getVisibleItems(keuanganItems).map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              end
                              className={({ isActive }) =>
                                isActive
                                  ? "text-white font-medium text-xs py-2 pl-4 transition-all duration-200"
                                  : "text-white/80 hover:text-white text-xs py-2 pl-4 transition-all duration-200"
                              }
                            >
                              {open && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </SidebarGroup>
            )}

            {/* MENU GROUP: PENGADAAN */}
            {getVisibleItems(pengadaanItems).length > 0 && (
              <SidebarGroup className="px-3 py-1">
                <SidebarGroupContent className="mt-0">
                  <SidebarMenu className="space-y-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => toggleGroup("pengadaan")}
                          className={"flex items-center justify-between w-full transition-all duration-200 " + (true ? "text-white font-semibold" : "text-white/90 hover:text-white")}
                        >
                          <div className="flex items-center gap-3">
                            <ShoppingCart className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 text-white" />
                            {open && <span className="font-medium">Pengadaan</span>}
                          </div>
                          <ChevronDown
                            className="h-4 w-4 transition-transform duration-300"
                            style={{
                              transform: expandedGroups.pengadaan ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
                {expandedGroups.pengadaan && (
                  <SidebarGroupContent className="mt-1">
                    <SidebarMenu className="space-y-0.5 pl-2">
                      {getVisibleItems(pengadaanItems).map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              end
                              className={({ isActive }) =>
                                isActive
                                  ? "text-white font-medium text-xs py-2 pl-4 transition-all duration-200"
                                  : "text-white/80 hover:text-white text-xs py-2 pl-4 transition-all duration-200"
                              }
                            >
                              {open && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </SidebarGroup>
            )}

            {/* MENU GROUP: KEPEGAWAIAN */}
            {getVisibleItems(kepegawaianItems).length > 0 && (
              <SidebarGroup className="px-3 py-1">
                <SidebarGroupContent className="mt-0">
                  <SidebarMenu className="space-y-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => toggleGroup("kepegawaian")}
                          className={"flex items-center justify-between w-full transition-all duration-200 " + (true ? "text-white font-semibold" : "text-white/90 hover:text-white")}
                        >
                          <div className="flex items-center gap-3">
                            <Users className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 text-white" />
                            {open && <span className="font-medium">Kepegawaian</span>}
                          </div>
                          <ChevronDown
                            className="h-4 w-4 transition-transform duration-300"
                            style={{
                              transform: expandedGroups.kepegawaian ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
                {expandedGroups.kepegawaian && (
                  <SidebarGroupContent className="mt-1">
                    <SidebarMenu className="space-y-0.5 pl-2">
                      {getVisibleItems(kepegawaianItems).map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              end
                              className={({ isActive }) =>
                                isActive
                                  ? "text-white font-medium text-xs py-2 pl-4 transition-all duration-200"
                                  : "text-white/80 hover:text-white text-xs py-2 pl-4 transition-all duration-200"
                              }
                            >
                              {open && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </SidebarGroup>
            )}

            {/* MENU GROUP: DOKUMEN */}
            {getVisibleItems(dokumenItems).length > 0 && (
              <SidebarGroup className="px-3 py-1">
                <SidebarGroupContent className="mt-0">
                  <SidebarMenu className="space-y-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => toggleGroup("dokumen")}
                          className={"flex items-center justify-between w-full transition-all duration-200 " + (true ? "text-white font-semibold" : "text-white/90 hover:text-white")}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 text-white" />
                            {open && <span className="font-medium">Dokumen</span>}
                          </div>
                          <ChevronDown
                            className="h-4 w-4 transition-transform duration-300"
                            style={{
                              transform: expandedGroups.dokumen ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
                {expandedGroups.dokumen && (
                  <SidebarGroupContent className="mt-1">
                    <SidebarMenu className="space-y-0.5 pl-2">
                      {getVisibleItems(dokumenItems).map((item) => (
                        <div key={item.title}>
                          {item.hasSubItems ? (
                            <Collapsible open={eDokumenOpen} onOpenChange={setEDokumenOpen}>
                              <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuButton className="text-white/80 hover:text-white text-xs py-2 pl-4 font-medium transition-all duration-200">
                                    {open && <span>{item.title}</span>}
                                    {open && (
                                      <ChevronDown
                                        className="ml-auto h-3 w-3 text-white transition-transform duration-300"
                                        style={{
                                          transform: eDokumenOpen ? "rotate(180deg)" : "rotate(0deg)",
                                        }}
                                      />
                                    )}
                                  </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-0.5">
                                  <SidebarMenuSub className="space-y-0.5 pl-4">
                                    {item.subItems?.map((subItem) => (
                                      <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton asChild>
                                          <NavLink
                                            to={subItem.url}
                                            className={({ isActive }) =>
                                              isActive
                                                ? "text-white font-medium text-xs py-1.5 pl-2 transition-all duration-200"
                                                : "text-white/80 hover:text-white text-xs py-1.5 pl-2 transition-all duration-200"
                                            }
                                          >
                                            <span>{subItem.title}</span>
                                          </NavLink>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    ))}
                                  </SidebarMenuSub>
                                </CollapsibleContent>
                              </SidebarMenuItem>
                            </Collapsible>
                          ) : (
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to={item.url}
                                  end
                                  className={({ isActive }) =>
                                    isActive
                                      ? "text-white font-medium text-xs py-2 pl-4 transition-all duration-200"
                                      : "text-white/80 hover:text-white text-xs py-2 pl-4 transition-all duration-200"
                                  }
                                >
                                  {open && <span>{item.title}</span>}
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )}
                        </div>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </SidebarGroup>
            )}

            {/* MENU GROUP: ADMIN & UTILITAS */}
            {getVisibleItems(adminUtilitasItems).length > 0 && (
              <SidebarGroup className="px-3 py-1">
                <SidebarGroupContent className="mt-0">
                  <SidebarMenu className="space-y-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => toggleGroup("adminUtilitas")}
                          className={"flex items-center justify-between w-full transition-all duration-200 " + (true ? "text-white font-semibold" : "text-white/90 hover:text-white")}
                        >
                          <div className="flex items-center gap-3">
                            <FileCheck className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 text-white" />
                            {open && <span className="font-medium">Admin & Utilitas</span>}
                          </div>
                          <ChevronDown
                            className="h-4 w-4 transition-transform duration-300"
                            style={{
                              transform: expandedGroups.adminUtilitas ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
                {expandedGroups.adminUtilitas && (
                  <SidebarGroupContent className="mt-1">
                    <SidebarMenu className="space-y-0.5 pl-2">
                      {getVisibleItems(adminUtilitasItems).map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              end
                              className={({ isActive }) =>
                                isActive
                                  ? "text-white font-medium text-xs py-2 pl-4 transition-all duration-200"
                                  : "text-white/80 hover:text-white text-xs py-2 pl-4 transition-all duration-200"
                              }
                            >
                              {open && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </SidebarGroup>
            )}
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