
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
      <div className="section-spacing content-spacing">
        {/* Hero section with elegant design */}
        <div className={`flex flex-col ${!isMobile ? 'lg:flex-row' : ''} gap-12 lg:gap-16 items-center`}>
          {/* Left column - Enhanced typography */}
          <div className="flex-1 space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="mb-6 text-5xl lg:text-6xl font-bold bg-gradient-to-br from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
                Kecap Maja
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Aplikasi Pengelolaan Anggaran dan Pengadaan BPS Kabupaten Majalengka yang memiliki arti:
              </p>
            </div>
            
            <div className="space-y-8">
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-primary mb-3">
                    KECAP - Keuangan Cekatan Anggaran Pengadaan
                  </h3>
                  <p className="text-foreground/80 leading-relaxed">
                    Menunjukkan pengelolaan keuangan yang cepat, efisien, dan tanggap, mengacu pada pengelolaan anggaran yang ditujukan untuk pengadaan barang dan jasa
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-secondary/5 to-secondary/10 border-secondary/20">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-secondary mb-3">
                    MAJA - Maju Aman Jeung Amanah
                  </h3>
                  <p className="text-foreground/80 leading-relaxed">
                    Bergerak maju dengan jaminan keamanan dan kehati-hatian, menunjukkan bahwa segala proses dilakukan dengan penuh tanggung jawab dan integritas
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right column - Enhanced image presentation */}
          <div className="flex-1 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-3xl blur-xl opacity-30"></div>
              <img 
                alt="Kecap Maja Logo" 
                className="relative max-w-full h-auto max-h-80 lg:max-h-96 rounded-2xl shadow-elegant" 
                src="/lovable-uploads/459d5e42-9ffb-4efe-8bdc-3d5756ad7aed.png" 
              />
            </div>
          </div>
        </div>

        {/* Menu grid with enhanced spacing */}
        <div className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-semibold text-foreground mb-4">
              Menu Aplikasi
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Akses semua fitur dan layanan yang tersedia dalam sistem
            </p>
          </div>
          <MenuGrid items={menuItems} />
        </div>
      </div>
    </Layout>;
};

export default Index;
