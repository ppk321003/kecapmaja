
import React from "react";
import { Link } from "react-router-dom";
import { FileText, Globe, Database, FileArchive, File, Book, Table } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useSidebar from "@/hooks/use-sidebar";
import { SidebarItem } from "@/types";

interface MenuGridProps {
  items?: SidebarItem[];
}

const MenuGrid: React.FC<MenuGridProps> = ({ items }) => {
  const { data: sidebarItems = [], isLoading } = useSidebar();
  const menuItems = items || sidebarItems;

  // Helper function to get the icon component dynamically
  const getIcon = (iconName: string) => {
    // Map of icon names to components
    const iconMap: Record<string, React.ReactNode> = {
      FileText: <FileText className="h-10 w-10" />,
      Globe: <Globe className="h-10 w-10" />,
      Database: <Database className="h-10 w-10" />,
      FileArchive: <FileArchive className="h-10 w-10" />,
      File: <File className="h-10 w-10" />,
      Book: <Book className="h-10 w-10" />,
      Table: <Table className="h-10 w-10" />
    };
    
    return iconMap[iconName] || <FileText className="h-10 w-10" />;
  };

  // Helper function to determine background color
  const getBackgroundColor = (index: number) => {
    const colorClasses = [
      "bg-blue-50 dark:bg-blue-900/20",
      "bg-purple-50 dark:bg-purple-900/20",
      "bg-green-50 dark:bg-green-900/20",
      "bg-yellow-50 dark:bg-yellow-900/20",
      "bg-orange-50 dark:bg-orange-900/20"
    ];
    return colorClasses[index % colorClasses.length];
  };

  // Helper function to determine icon color
  const getIconColor = (index: number) => {
    const colorClasses = [
      "text-bps-blue",
      "text-purple-500",
      "text-bps-green",
      "text-bps-yellow",
      "text-bps-orange"
    ];
    return colorClasses[index % colorClasses.length];
  };

  if (isLoading) {
    return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="h-full animate-pulse">
          <CardHeader className="pb-2">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-800"></div>
            <div className="h-6 w-2/3 rounded-md bg-gray-200 dark:bg-gray-800"></div>
          </CardHeader>
          <CardContent>
            <div className="h-4 w-full rounded-md bg-gray-200 dark:bg-gray-800"></div>
            <div className="mt-4 h-8 w-20 rounded-md bg-gray-200 dark:bg-gray-800"></div>
          </CardContent>
        </Card>
      ))}
    </div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {menuItems.filter(item => item.is_active).map((item, index) => (
        <Link key={item.id} to={item.path} className="block">
          <Card className="h-full transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-2">
              <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-lg ${getBackgroundColor(index)}`}>
                <div className={getIconColor(index)}>{getIcon(item.icon)}</div>
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{item.description}</CardDescription>
              <div className="mt-4">
                <Button variant="outline">Buka</Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default MenuGrid;
