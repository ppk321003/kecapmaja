
import React from "react";
import { Link } from "react-router-dom";
import { FileText, Globe, Database, FileArchive, File, Book, Table } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import MenuGrid from "@/components/MenuGrid";
import useSidebar from "@/hooks/use-sidebar";

const Index = () => {
  const isMobile = useIsMobile();
  const { data: menuItems = [] } = useSidebar();
  
  return <Layout>
      <div className="space-y-8">
        {/* Hero section with two columns */}
        <div className={`flex flex-col ${!isMobile ? 'md:flex-row' : ''} gap-8 items-center`}>
          {/* Left column - Description */}
          <div className="flex-1 text-left">
            <h1 className="mb-4 text-4xl font-bold text-center text-sky-900">Kecap Maja</h1>
            <p className="text-muted-foreground pl-0 px-0 text-justify font-normal">Merupakan aplikasi Pengelolaan Anggaran dan Pengadaan BPS Kabupaten Majalengka yang memiliki arti:

          </p>
            <div className="space-y-3">
              <p className="text-blue-900 text-base font-medium">
                <span className="font-bold">KECAP -</span> Keuangan Cekatan Anggaran Pengadaan
              </p>
              <p className="text-muted-foreground pl-6 px-0 text-justify">
                Menunjukkan pengelolaan keuangan yang cepat, efisien, dan tanggap, mengacu pada pengelolaan anggaran yang ditujukan untuk pengadaan barang dan jasa
              </p>
              <p className="text-blue-900 font-medium">
                <span className="font-bold">MAJA -</span> Maju Aman Jeung Amanah
              </p>
              <p className="text-muted-foreground pl-6 px-0 text-justify">
                Bergerak maju dengan jaminan keamanan dan kehati-hatian, menunjukkan bahwa segala proses dilakukan dengan penuh tanggung jawab dan integritas
              </p>
            </div>
            
          </div>

          {/* Right column - Image */}
          <div className="flex-1 flex justify-center">
            <img alt="Kecap Maja Logo" className="max-w-full h-auto max-h-72" src="/lovable-uploads/459d5e42-9ffb-4efe-8bdc-3d5756ad7aed.png" />
          </div>
        </div>

        {/* Menu grid from sidebar items */}
        <MenuGrid items={menuItems} />
      </div>
    </Layout>;
};

export default Index;
