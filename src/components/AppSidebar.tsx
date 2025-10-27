import { NavLink } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  FileText,
  Users,
  Target,
  CheckSquare,
  DollarSign,
  UserCog,
  CheckCircle,
  Download,
  Database,
  BookOpen,
  ChevronDown,
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
  { title: "Aki to Bendahara", url: "/aki-to-bendahara", icon: DollarSign },
];

const spkBastSubItems = [
  { title: "Entri Petugas", url: "/spk-bast/entri-petugas", icon: Users },
  { title: "Entri Kegiatan", url: "/spk-bast/entri-target", icon: Target },
  { title: "Cek SBML", url: "/spk-bast/cek-sbml", icon: CheckSquare },
  { title: "Entri SBML", url: "/spk-bast/entri-sbml", icon: DollarSign },
  { title: "Entri Pengelola Anggaran", url: "/spk-bast/entri-pengelola", icon: UserCog },
  { title: "Approval PPK", url: "/spk-bast/approval-ppk", icon: CheckCircle },
  { title: "Download SPK & BAST", url: "/spk-bast/download-spk-bast", icon: Download },
  { title: "Download SPJ", url: "/spk-bast/download-spj", icon: Download },
  { title: "Download Raw Data", url: "/spk-bast/download-raw-data", icon: Database },
  { title: "Pedoman", url: "/spk-bast/pedoman", icon: BookOpen },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";

  const isSpkBastActive = currentPath.startsWith("/spk-bast");
  const [spkBastOpen, setSpkBastOpen] = useState(() => isSpkBastActive);


  return (
    <Sidebar className="border-r border-sidebar-border" style={{ background: "var(--gradient-primary)" }}>
      <SidebarContent>
        <div className="px-4 py-6">
          <h2 className="text-xl font-bold text-sidebar-foreground">AKI MAJA</h2>
          <p className="text-xs text-sidebar-foreground/80 mt-1">
            Aplikasi Kinerja Monitoring Mitra
          </p>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible open={spkBastOpen} onOpenChange={setSpkBastOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={
                        isSpkBastActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      }
                    >
                      <FileText className="h-4 w-4" />
                      {open && <span>Buat SPK dan BAST</span>}
                      {open && <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200" style={{ transform: spkBastOpen ? "rotate(180deg)" : "rotate(0deg)" }} />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {spkBastSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={subItem.url}
                              className={({ isActive }) =>
                                isActive
                                  ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium"
                                  : "text-sidebar-foreground/90 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                              }
                            >
                              <subItem.icon className="h-3 w-3" />
                              <span className="text-sm">{subItem.title}</span>
                            </NavLink>
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
      </SidebarContent>
    </Sidebar>
  );
}
