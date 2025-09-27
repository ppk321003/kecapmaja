
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
    <div className="flex min-h-screen w-full bg-background font-inter">
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
      <div className="flex flex-1 flex-col">
        <main className="flex-1 bg-gradient-to-br from-background to-muted/30">
          <Card className="elegant-card p-6 lg:p-8 border-0 rounded-none">
            {children}
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Layout;
