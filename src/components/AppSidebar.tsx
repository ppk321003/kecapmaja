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
  { title: "Block Tanggal", url: "/BlockTanggal", icon: Users },
  { title: "Pengadaan", url: "/Pengadaan", icon: Users },
];

const eDokumenSubItems = [
  { title: "Buat e-Dokumen", url: "/e-dokumen/buat", icon: FilePlus },
  { title: "Download e-Dokumen", url: "/e-dokumen/download", icon: DownloadIcon },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";

  const isEDokumenActive = currentPath.startsWith("/e-dokumen");
  const [eDokumenOpen, setEDokumenOpen] = useState(() => isEDokumenActive);


  return (
    <Sidebar className="border-r border-sidebar-border" style={{ background: "var(--gradient-primary)" }}>
      <SidebarContent>
        <div className="px-4 py-6">
          <h2 className="text-xl font-bold text-sidebar-foreground">AKI MAJA</h2>
          <p className="text-xs text-sidebar-foreground/80 mt-1">
            Aplikasi Kinerja, Monitoring dan Administrasi
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
              <Collapsible open={eDokumenOpen} onOpenChange={setEDokumenOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={
                        isEDokumenActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      }
                    >
                      <FolderOpen className="h-4 w-4" />
                      {open && <span>e-Dokumen</span>}
                      {open && <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200" style={{ transform: eDokumenOpen ? "rotate(180deg)" : "rotate(0deg)" }} />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {eDokumenSubItems.map((subItem) => (
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
