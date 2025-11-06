import { ExternalLink, FileText, Database, Archive, Link2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const linksData = [
  {
    title: "Bahan Revisi 3210",
    url: "https://bahanrevisi-3210.vercel.app/",
    description: "Aplikasi pengelolaan bahan revisi untuk kegiatan BPS 3210",
    icon: Archive
  },
  {
    title: "Kecap Maja (OLD)",
    url: "https://kecapmaja-old.vercel.app/",
    description: "Versi lama dari aplikasi Kecap Maja untuk referensi historis",
    icon: Database
  },
  {
    title: "Perka BPS",
    url: "https://drive.google.com/file/d/1ms-k2xz6uX5__8_jjwWikoEa1ffW9NKl/view",
    description: "Peraturan Kepala BPS terkait pengelolaan anggaran dan keuangan",
    icon: FileText
  },
  {
    title: "Perka PAK Sensus Survei",
    url: "https://drive.google.com/file/d/1ms-k2xz6uX5__8_jjwWikoEa1ffW9NKl/view",
    description: "Peraturan Kepala BPS tentang PAK Sensus dan Survei",
    icon: FileText
  },
  {
    title: "SBM 2025",
    url: "https://drive.google.com/file/d/1xZnV0JqqA2NnlnDw__A_PJMXBDQay89A/view",
    description: "Standar Biaya Masukan (SBM) tahun anggaran 2025",
    icon: FileText
  },
  {
    title: "SK Transport Lokal",
    url: "https://drive.google.com/file/d/1LCuubDY1R0gSDLoW9ihu3GN93hwuW-Sq/view",
    description: "Surat Keputusan tentang transportasi lokal BPS Kabupaten Majalengka",
    icon: FileText
  }
];

export default function Linkers() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header Section - More Compact */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-red-500">Linkers</h1>
            <p className="text-muted-foreground text-sm">
              Kumpulan tautan dokumen dan aplikasi terkait BPS Kabupaten Majalengka
            </p>
          </div>
        </div>

        {/* Grid Layout - 4 cards per row on large screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {linksData.map((link) => {
            const IconComponent = link.icon;
            return (
              <Card 
                key={link.title} 
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border bg-card h-full flex flex-col"
                onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
              >
                <CardHeader className="space-y-3 pb-3 flex-grow-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="text-foreground line-clamp-1">{link.title}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex-grow">
                  <CardDescription className="text-sm leading-relaxed line-clamp-3">
                    {link.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}