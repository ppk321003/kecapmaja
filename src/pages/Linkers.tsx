import { ExternalLink, Archive, Database, FileText, Link2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const linksData = [
  {
    title: "Bahan Revisi 3210",
    url: "https://bahanrevisi-3210.vercel.app/",
    description: "Aplikasi pengelolaan bahan revisi untuk kegiatan BPS 3210",
    icon: Archive,
  },
  {
    title: "Kecap Maja (OLD)",
    url: "https://kecapmaja-old.vercel.app/",
    description: "Versi lama dari aplikasi Kecap Maja untuk referensi historis",
    icon: Database,
  },
  {
    title: "Kertas Kerja (Excel)",
    url: "https://drive.google.com/drive/folders/1MUBorF7HngfDpQPaPZC_wIIcH9cN_AU1",
    description: "Riwayat Kertas Kerja dalam bentuk Excel",
    icon: FileText,
  },
  {
    title: "Kertas Kerja (PDF)",
    url: "https://drive.google.com/drive/folders/1bP4d3iQ61ogw6z1G9hoiIwFXw5DhH40P",
    description: "Riwayat Kertas Kerja dalam bentuk PDF",
    icon: FileText,
  },
  {
    title: "Perka BPS",
    url: "https://drive.google.com/file/d/1ms-k2xz6uX5__8_jjwWikoEa1ffW9NKl/view",
    description: "Peraturan Kepala BPS terkait pengelolaan anggaran dan keuangan",
    icon: FileText,
  },
  {
    title: "Perka PAK Sensus Survei",
    url: "https://drive.google.com/file/d/1ms-k2xz6uX5__8_jjwWikoEa1ffW9NKl/view",
    description: "Peraturan Kepala BPS tentang PAK Sensus dan Survei",
    icon: FileText,
  },
  {
    title: "SBM 2025",
    url: "https://drive.google.com/file/d/1xZnV0JqqA2NnlnDw__A_PJMXBDQay89A/view",
    description: "Standar Biaya Masukan (SBM) tahun anggaran 2025",
    icon: FileText,
  },
  {
    title: "SK Transport Lokal",
    url: "https://drive.google.com/file/d/1LCuubDY1R0gSDLoW9ihu3GN93hwuW-Sq/view",
    description: "Surat Keputusan tentang transportasi lokal BPS Kabupaten Majalengka",
    icon: FileText,
  },
];

export default function Linkers() {
  const handleOpenLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5">
            <Link2 className="h-9 w-9 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
              Linkers
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Kumpulan tautan penting dokumen dan aplikasi BPS Kabupaten Majalengka
            </p>
          </div>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {linksData.map((link) => {
          const Icon = link.icon;

          return (
            <Card
              key={link.title}
              className="group relative overflow-hidden bg-card/90 backdrop-blur-sm border border-border/50 
                         hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10
                         transition-all duration-500 hover:-translate-y-2 rounded-2xl cursor-pointer
                         flex flex-col h-full"
              onClick={() => handleOpenLink(link.url)}
            >
              {/* Gradient Top Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-primary/70 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 
                                   border border-primary/20 group-hover:border-primary/40 
                                   group-hover:scale-110 transition-all duration-300">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary 
                                         group-hover:translate-x-1 group-hover:-translate-y-1 
                                         transition-all duration-300" />
                </div>

                <CardTitle className="text-lg font-semibold text-foreground leading-tight line-clamp-2">
                  {link.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between">
                <CardDescription className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {link.description}
                </CardDescription>

                {/* Open Button with Shine Effect */}
                <div className="mt-6">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenLink(link.url);
                    }}
                    className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 
                               hover:from-primary hover:to-primary/80 
                               text-primary-foreground font-medium text-sm
                               shadow-lg hover:shadow-xl hover:shadow-primary/30
                               relative overflow-hidden transition-all duration-300
                               flex items-center justify-center gap-2 group/btn"
                  >
                    <span className="relative z-10">Buka Tautan</span>
                    <ExternalLink className="h-4 w-4 relative z-10" />
                    {/* Shine Effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full 
                                     bg-white/20 transition-transform duration-700 skew-x-12" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}