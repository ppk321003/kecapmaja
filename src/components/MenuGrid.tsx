
import React from "react";
import { Link } from "react-router-dom";
import useSidebar from "@/hooks/use-sidebar";
import { FileText, Globe, Database, FileArchive, File, Book, Table } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarItem } from "@/types";

const MenuGrid: React.FC = () => {
  const { data: menuItems = [], isLoading } = useSidebar();

  // Helper function to get the icon component dynamically
  const getIcon = (iconName: string) => {
    // Map of icon names to components
    const iconMap: Record<string, React.ReactNode> = {
      FileText: <FileText className="h-5 w-5" />,
      Globe: <Globe className="h-5 w-5" />,
      Database: <Database className="h-5 w-5" />,
      FileArchive: <FileArchive className="h-5 w-5" />,
      File: <File className="h-5 w-5" />,
      Book: <Book className="h-5 w-5" />,
      Table: <Table className="h-5 w-5" />
    };
    
    return iconMap[iconName] || <FileText className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-muted">
            <CardContent className="p-4" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {menuItems.map((item: SidebarItem) => (
        <Link to={item.path} key={item.id}>
          <Card className="h-full hover:bg-accent transition-colors border-muted-foreground/20">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
              <div className="bg-primary/10 p-3 rounded-full mb-4">
                {getIcon(item.icon)}
              </div>
              <h3 className="font-medium">{item.title}</h3>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default MenuGrid;
