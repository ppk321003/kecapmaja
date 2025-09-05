
import React, { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DynamicSidebar from "@/components/DynamicSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-inter">
      {/* Mobile menu toggle button */}
      <div className="fixed top-6 left-6 z-50 lg:hidden">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleSidebar} 
          className="bg-background/80 backdrop-blur-sm shadow-elegant border-border/50"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Dynamic sidebar based on Supabase data */}
      <DynamicSidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-br from-background to-muted/30">
          <div className="container-responsive">
            <Card className="elegant-card p-6 lg:p-8 min-h-full">
              {children}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
