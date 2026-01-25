import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { ThemeSelector } from "@/components/ThemeSelector";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-10" style={{ background: "var(--gradient-header)" }}>
            <div className="flex items-center">
              <SidebarTrigger className="text-primary-foreground hover:bg-primary-foreground/10" />
              <h1 className="ml-4 text-lg font-semibold text-primary-foreground">
                Sistem Administrasi Digital Terpadu untuk Kinerja yang Efisien dan Akurat
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeSelector />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-primary-foreground">{user?.username}</p>
                  <p className="text-xs text-primary-foreground/70">{user?.role}</p>
                </div>
                <div className="relative">
                  <Avatar className="h-10 w-10 border-2 border-primary-foreground bg-primary">
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-primary-foreground font-semibold text-sm flex items-center justify-center">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background shadow-md"></div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 bg-background">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
