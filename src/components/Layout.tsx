
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
    <div className="flex h-screen w-full overflow-hidden">
      {/* Mobile menu toggle button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleSidebar} 
          className="bg-background"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Dynamic sidebar based on Supabase data */}
      <DynamicSidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Card className="p-4 md:p-6">
            {children}
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Layout;
