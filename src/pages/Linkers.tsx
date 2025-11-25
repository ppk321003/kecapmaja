import { ExternalLink, Archive, Database, FileText, Link2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const accentColors = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-indigo-500 to-indigo-600",
  "from-teal-500 to-teal-600",
  "from-purple-500 to-purple-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-lime-500 to-lime-600",
];

const linksData = [
  { title: "Bahan Revisi 3210", url: "https://bahanrevisi-3210.vercel.app/", description: "Aplikasi pengelolaan bahan revisi untuk kegiatan BPS 3210", icon: Archive },
  { title: "Kecap Maja (OLD)", url: "https://kecapmaja-old.vercel.app/", description: "Versi lama dari aplikasi Kecap Maja untuk referensi historis", icon: Database },
  { title: "Kertas Kerja (Excel)", url: "https://drive.google.com/drive/folders/1MUBorF7HngfDpQPaPZC_wIIcH9cN_AU1", description: "Riwayat Kertas Kerja dalam bentuk Excel", icon: FileText },
  { title: "Kertas Kerja (PDF)", url: "https://drive.google.com/drive/folders/1bP4d3iQ61ogw6z1G9hoiIwFXw5DhH40P", description: "Riwayat Kertas Kerja dalam bentuk PDF", icon: FileText },
  { title: "Perka BPS", url: "https://drive.google.com/file/d/1ms-k2xz6uX5__8_jjwWikoEa1ffW9NKl/view", description: "Peraturan Kepala BPS terkait pengelolaan anggaran dan keuangan", icon: FileText },
  { title: "Perka PAK Sensus Survei", url: "https://drive.google.com/file/d/1ms-k2xz6uX5__8_jjwWikoEa1ffW9NKl/view", description: "Peraturan Kepala BPS tentang PAK Sensus dan Survei", icon: FileText },
  { title: "SBM 2025", url: "https://drive.google.com/file/d/1xZnV0JqqA2NnlnDw__A_PJMXBDQay89A/view", description: "Standar Biaya Masukan (SBM) tahun anggaran 2025", icon: FileText },
  { title: "SK Transport Lokal", url: "https://drive.google.com/file/d/1LCuubDY1R0gSDLoW9ihu3GN93hwuW-Sq/view", description: "Surat Keputusan tentang transportasi lokal BPS Kabupaten Majalengka", icon: FileText },
];

export default function Linkers() {
  const handleOpenLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background pt-4 pb-16 px-4 sm:px-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5">
            <Link2 className="h-9 w-9 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-red-500 tracking-tight">
              Linkers
            </h1>
            <p className="mt-1.5 text-lg text-muted-foreground">
              Kumpulan tautan penting dokumen dan aplikasi BPS Kabupaten Majalengka
            </p>
          </div>
        </div>
      </div>

      {/* Grid Cards - Optimized for wider screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {linksData.map((link, index) => {
          const Icon = link.icon;
          const accent = accentColors[index % accentColors.length];
          const lighterBg = accent.replace("500", "100").replace("600", "200");

          return (
            <Card
              key={link.title}
              className="group relative overflow-hidden bg-card/90 backdrop-blur-sm border border-border/50 
                         hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10
                         transition-all duration-500 hover:-translate-y-2 rounded-2xl cursor-pointer
                         flex flex-col h-full min-h-[220px]"
              onClick={() => handleOpenLink(link.url)}
            >
              {/* Gradient Top Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-3 flex-1 min-w-0">
                  {/* Icon and Title Row */}
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${lighterBg} border transition-all duration-300 group-hover:scale-110 flex-shrink-0`}>
                      <Icon className={`h-6 w-6 ${accent.split(" ")[0].replace("from-", "text-").replace("-500", "-600")}`} />
                    </div>
                    <CardTitle className="text-lg font-semibold text-foreground leading-tight line-clamp-2 flex-1 min-w-0">
                      {link.title}
                    </CardTitle>
                  </div>
                  
                  {/* Description */}
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {link.description}
                  </CardDescription>
                </div>
                
                {/* External Link Icon */}
                <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all duration-300 flex-shrink-0 mt-1" />
              </CardHeader>

              <CardContent className="pt-0 mt-auto">
                {/* Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenLink(link.url);
                  }}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 
                             hover:from-primary hover:to-primary/70 hover:brightness-110
                             text-primary-foreground font-medium text-sm shadow-lg hover:shadow-xl
                             relative overflow-hidden transition-all duration-300
                             flex items-center justify-center gap-2 group/btn"
                >
                  <span className="relative z-10">Buka Tautan</span>
                  <ExternalLink className="h-4 w-4 relative z-10" />
                  <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full 
                                   bg-white/20 transition-transform duration-700" />
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}