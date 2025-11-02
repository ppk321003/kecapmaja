import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Target, CheckSquare, DollarSign, UserCog, CheckCircle, Download, Database, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function SPKBast() {
  const navigate = useNavigate();
  
  // Define color variants for each row (3 cards per row)
  const cardColors = [
    { bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900", icon: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
    { bg: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900", icon: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
    { bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900", icon: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
    { bg: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900", icon: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  ];

  const spkBastMenuItems = [{
    title: "Entri Petugas",
    url: "/spk-bast/entri-petugas",
    icon: Users,
    description: "Pendataan dan pengelolaan informasi petugas mitra statistik"
  }, {
    title: "Entri Kegiatan",
    url: "/spk-bast/entri-target",
    icon: Target,
    description: "Input target dan kegiatan yang akan dilaksanakan"
  }, {
    title: "Entri Realisasi",
    url: "/spk-bast/entri-realisasi",
    icon: CheckSquare,
    description: "Input realisasi kegiatan yang telah dilaksanakan"
  }, {
    title: "Cek SBML",
    url: "/spk-bast/cek-sbml",
    icon: CheckSquare,
    description: "Verifikasi dan pengecekan Standar Biaya Masukan Lainnya"
  }, {
    title: "Download SPK & BAST",
    url: "/spk-bast/download-spk-bast",
    icon: Download,
    description: "Unduh dokumen Surat Perjanjian Kerja dan BAST"
  }];
  
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-red-500">SPK dan BAST</h1>
        <p className="text-muted-foreground mt-2">Kelola Surat Perjanjian Kerja dan Berita Acara Serah Terima</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spkBastMenuItems.map((item, index) => {
          const rowIndex = Math.floor(index / 3);
          const colors = cardColors[rowIndex % cardColors.length];
          
          return <Card key={item.title} className={`hover:shadow-lg transition-all flex flex-col border-2 ${colors.bg} ${colors.border}`}>
            <CardHeader>
              <item.icon className={`h-10 w-10 ${colors.icon} mb-2`} />
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription className="flex-grow">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
              <Button onClick={() => navigate(item.url)} className="w-full" variant="default">
                Buka Menu
              </Button>
            </CardContent>
          </Card>
        })}
      </div>
    </div>;
}