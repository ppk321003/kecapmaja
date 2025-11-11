import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Target, CheckSquare, DollarSign, UserCog, CheckCircle, Download, Database, BookOpen, FileText, ClipboardCheck, FileCheck, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SPKBast() {
  const navigate = useNavigate();
  
  // Enhanced color variants with better gradients and hover effects - now with 4 colors
  const cardColors = [
    { 
      bg: "bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950 dark:via-blue-900 dark:to-blue-950",
      hover: "hover:from-blue-100 hover:via-blue-50 hover:to-blue-100 dark:hover:from-blue-800 dark:hover:via-blue-700 dark:hover:to-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
      button: "bg-blue-600 hover:bg-blue-700 text-white"
    },
    { 
      bg: "bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-emerald-950 dark:via-emerald-900 dark:to-emerald-950",
      hover: "hover:from-emerald-100 hover:via-emerald-50 hover:to-emerald-100 dark:hover:from-emerald-800 dark:hover:via-emerald-700 dark:hover:to-emerald-800",
      icon: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800",
      button: "bg-emerald-600 hover:bg-emerald-700 text-white"
    },
    { 
      bg: "bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-amber-950 dark:via-amber-900 dark:to-amber-950",
      hover: "hover:from-amber-100 hover:via-amber-50 hover:to-amber-100 dark:hover:from-amber-800 dark:hover:via-amber-700 dark:hover:to-amber-800",
      icon: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
      button: "bg-amber-600 hover:bg-amber-700 text-white"
    }

  ];

  const spkBastMenuItems = [
    {
      title: "Entri Kegiatan",
      url: "/spk-bast/entri-target",
      icon: ClipboardCheck,
      description: "Input target dan kegiatan yang akan dilaksanakan sesuai rencana kerja"
    },
    {
      title: "Download SPK & BAST",
      url: "/spk-bast/download-spk-bast",
      icon: FileText,
      description: "Unduh dokumen Surat Perjanjian Kerja dan Berita Acara Serah Terima"
    },
    {
      title: "Cek SBML & Rekap SPK-BAST",
      url: "/spk-bast/rekap-spk",
      icon: BarChart3,
      description: "Lihat rekapitulasi dan laporan data SPK & BAST yang telah dibuat"
    }
  ];
  
  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="text-center space-y-4 pb-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-950 rounded-full mb-2">
          <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-800 dark:from-red-400 dark:to-red-600 bg-clip-text text-transparent">
          SPK dan BAST
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Kelola Surat Perjanjian Kerja (SPK) dan Berita Acara Serah Terima (BAST) dengan sistem terintegrasi dan efisien
        </p>
      </div>

      {/* Enhanced Cards Grid - Now 4 columns on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {spkBastMenuItems.map((item, index) => {
          const colors = cardColors[index % cardColors.length];
          
          return (
            <Card 
              key={item.title} 
              className={`
                group relative overflow-hidden border-2 transition-all duration-300 
                hover:scale-105 hover:shadow-2xl 
                ${colors.bg} ${colors.border} ${colors.hover}
                min-h-[260px] flex flex-col
              `}
            >
              {/* Decorative Element */}
              <div className={`absolute top-0 right-0 w-20 h-20 -translate-y-8 translate-x-8 rounded-full opacity-10 ${colors.icon.replace('text-', 'bg-')}`}></div>
              
              <CardHeader className="relative z-10 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-white dark:bg-gray-800 shadow-md ${colors.border}`}>
                    <item.icon className={`h-6 w-6 ${colors.icon}`} />
                  </div>
                  <div className="text-xs font-medium px-2 py-1 rounded-full bg-white dark:bg-gray-800 text-muted-foreground border">
                    {index + 1}/{spkBastMenuItems.length}
                  </div>
                </div>
                
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors">
                  {item.title}
                </CardTitle>
                
                <CardDescription className="text-sm leading-relaxed mt-2 text-gray-600 dark:text-gray-300">
                  {item.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0 mt-auto relative z-10">
                <Button 
                  onClick={() => navigate(item.url)} 
                  className={`w-full transition-all duration-300 shadow-md hover:shadow-lg ${colors.button}`}
                  size="lg"
                >
                  <span className="font-medium">Buka Menu</span>
                  <svg 
                    className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </CardContent>
              
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white dark:to-gray-800 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </Card>
          );
        })}
      </div>

      {/* Additional Info Section */}
      <div className="max-w-6xl mx-auto mt-12">
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                  Sistem Terintegrasi SPK & BAST
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Kelola seluruh proses administrasi kontrak kerja mulai dari perencanaan, verifikasi, hingga serah terima dokumen dalam satu platform yang terintegrasi.
                  Sekarang dengan fitur rekapitulasi data SPK & BAST untuk analisis yang lebih komprehensif.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}