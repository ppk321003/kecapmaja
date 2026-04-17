import { useState, useMemo } from 'react';
import { usePublikasiSheets } from '@/hooks/use-publikasi-sheets';
import { supabase } from '@/integrations/supabase/client';
import { isGoogleDriveUrl, getGoogleDriveImageUrl, getGoogleDriveViewUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ChevronLeft, ChevronRight, FileText, FileDoc, FileImage, FileVideo, FileAudio } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SHEET_ID = "1P2TulBe-XIEdmiNqGU3UB1mNr6mnTuPDEFq34E-6zf0";
const ITEMS_PER_PAGE = 12;

// Helper function to get icon based on file type
const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  switch(type) {
    case 'pdf': return '📄';
    case 'doc':
    case 'docx':
    case 'word': return '📝';
    case 'xls':
    case 'xlsx':
    case 'excel': return '📊';
    case 'ppt':
    case 'pptx':
    case 'presentation': return '🎯';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'image': return '🖼️';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'video': return '🎥';
    case 'mp3':
    case 'wav':
    case 'audio': return '🎵';
    case 'zip':
    case 'rar':
    case 'archive': return '📦';
    default: return '📎';
  }
};

// CORS Proxy helper for Google Drive images - using Supabase Edge Function
const getImageProxyUrl = (url: string): string => {
  if (!url) return '';
  if (isGoogleDriveUrl(url)) {
    const fileId = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (fileId) {
      // Use Supabase Edge Function for proxy
      const { data } = supabase.auth.session() || {};
      const baseUrl = supabase.functions.getUrl?.()?.split('/functions')[0] || 'https://your-project.supabase.co';
      return `${baseUrl}/functions/v1/image-proxy?fileId=${fileId}&type=view`;
    }
  }
  return url;
};

export default function LayananUmum() {
  const { publikasi, loading, error } = usePublikasiSheets({
    spreadsheetId: SHEET_ID,
    sheetName: "Sheet1"
  });

  const [search, setSearch] = useState('');
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'terbaru' | 'terlama' | 'nama'>('terbaru');
  const [currentPage, setCurrentPage] = useState(1);

  console.log('[LayananUmum] State:', { 
    publikasiCount: publikasi.length, 
    loading, 
    error,
    firstItem: publikasi[0]
  });

  // Get unique years and categories
  const years = useMemo(() => {
    const unique = [...new Set(publikasi.map(p => p.tahun))].sort((a, b) => b - a);
    return unique;
  }, [publikasi]);

  const categories = useMemo(() => {
    const unique = [...new Set(publikasi.map(p => p.kategori))].filter(Boolean).sort();
    return unique;
  }, [publikasi]);

  // Filter and search
  const filtered = useMemo(() => {
    let result = publikasi;

    if (selectedYears.size > 0) {
      result = result.filter(p => selectedYears.has(p.tahun));
    }

    if (selectedCategories.size > 0) {
      result = result.filter(p => selectedCategories.has(p.kategori));
    }

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(p =>
        p.namaPublikasi.toLowerCase().includes(term) ||
        p.deskripsi.toLowerCase().includes(term) ||
        p.kategori.toLowerCase().includes(term)
      );
    }

    // Sort
    const sorted = [...result];
    const tahun = new Date().getFullYear();
    switch (sortBy) {
      case 'terbaru':
        sorted.sort((a, b) => Math.abs(a.tahun - tahun) - Math.abs(b.tahun - tahun));
        break;
      case 'terlama':
        sorted.sort((a, b) => a.tahun - b.tahun);
        break;
      case 'nama':
        sorted.sort((a, b) => a.namaPublikasi.localeCompare(b.namaPublikasi));
        break;
    }

    return sorted;
  }, [publikasi, search, selectedYears, selectedCategories, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const toggleYear = (year: number) => {
    const newYears = new Set(selectedYears);
    newYears.has(year) ? newYears.delete(year) : newYears.add(year);
    setSelectedYears(newYears);
    setCurrentPage(1);
  };

  const toggleCategory = (cat: string) => {
    const newCats = new Set(selectedCategories);
    newCats.has(cat) ? newCats.delete(cat) : newCats.add(cat);
    setSelectedCategories(newCats);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedYears(new Set());
    setSelectedCategories(new Set());
    setCurrentPage(1);
  };

  const goPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Layanan Umum</h1>
          <p className="text-blue-100 text-lg">
            Publikasi dan Layanan Informasi BPS Majalengka
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search & Filters */}
        <div className="space-y-4 mb-8">
          <Input
            placeholder="Cari publikasi..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="max-w-md"
          />

          <div className="flex flex-wrap gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Tahun {selectedYears.size > 0 && `(${selectedYears.size})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Filter Tahun</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {years.map(year => (
                  <DropdownMenuCheckboxItem
                    key={year}
                    checked={selectedYears.has(year)}
                    onCheckedChange={() => toggleYear(year)}
                  >
                    {year}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Kategori {selectedCategories.size > 0 && `(${selectedCategories.size})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
                <DropdownMenuLabel>Filter Kategori</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categories.map(cat => (
                  <DropdownMenuCheckboxItem
                    key={cat}
                    checked={selectedCategories.has(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  >
                    {cat}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="terbaru">Terbaru</SelectItem>
                <SelectItem value="terlama">Terlama</SelectItem>
                <SelectItem value="nama">Nama A-Z</SelectItem>
              </SelectContent>
            </Select>

            {(search || selectedYears.size > 0 || selectedCategories.size > 0) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Reset</Button>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {(selectedYears.size > 0 || selectedCategories.size > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {Array.from(selectedYears).map(y => (
              <Badge key={`y-${y}`} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleYear(y)}>
                {y} ✕
              </Badge>
            ))}
            {Array.from(selectedCategories).map(c => (
              <Badge key={`c-${c}`} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleCategory(c)}>
                {c} ✕
              </Badge>
            ))}
          </div>
        )}

        <div className="text-sm text-slate-600 mb-6">
          Menampilkan {filtered.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} publikasi
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 p-6">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
              Coba Lagi
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && filtered.length === 0 && (
          <Card className="border-dashed p-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {publikasi.length === 0 ? 'Tidak ada publikasi tersedia' : 'Tidak ada yang cocok dengan filter'}
            </p>
            {publikasi.length > 0 && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Reset Filter</Button>
            )}
          </Card>
        )}

        {/* Grid */}
        {!loading && !error && paginatedItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {paginatedItems.map((pub) => {
              const imageLink = pub.thumbnailUrl;
              const thumbnailUrl = imageLink && (isGoogleDriveUrl(imageLink)
                ? getGoogleDriveImageUrl(imageLink)
                : /\.(jpe?g|png|webp|gif|svg)$/i.test(imageLink) ? imageLink : null);
              const viewUrl = isGoogleDriveUrl(pub.link) ? getGoogleDriveViewUrl(pub.link) : pub.link;
              
              // Debug logging
              console.log(`[LayananUmum] Item ${pub.no}:`, {
                namaPublikasi: pub.namaPublikasi,
                imageLink: imageLink?.substring(0, 50),
                isGoogleDrive: isGoogleDriveUrl(imageLink),
                thumbnailUrl: thumbnailUrl?.substring(0, 50),
                hasViewUrl: !!viewUrl
              });

              return (
                <a
                  key={pub.no}
                  href={viewUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg bg-card border border-border overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  {/* Thumbnail */}
                  <div className="relative w-full aspect-video bg-slate-100 overflow-hidden">
                    {thumbnailUrl ? (
                      <img
                        src={getImageProxyUrl(thumbnailUrl)}
                        alt={pub.namaPublikasi}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        crossOrigin="anonymous"
                        onLoad={() => console.log(`[LayananUmum] Image loaded: ${pub.no}`)}
                        onError={(e) => {
                          console.error(`[LayananUmum] Image failed to load: ${pub.no}`, {
                            src: (e.target as HTMLImageElement).src,
                            error: e
                          });
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-200">
                        <FileText className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-blue-600">
                      {pub.namaPublikasi}
                    </h3>
                    <div className="flex gap-1 flex-wrap">
                      {pub.kategori && <Badge variant="outline" className="text-xs">{pub.kategori}</Badge>}
                      {pub.status && <Badge variant="secondary" className="text-xs">{pub.status}</Badge>}
                    </div>
                    {pub.deskripsi && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{pub.deskripsi}</p>
                    )}
                    <p className="text-xs text-slate-500">Tahun {pub.tahun}</p>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 px-2 border-t">
            <div className="text-sm text-muted-foreground">
              <p>Halaman {safePage} dari {totalPages}</p>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goPage(safePage - 1)}
                  disabled={safePage === 1}
                  className="inline-flex items-center justify-center h-8 w-8 rounded border border-border/40 bg-background text-sm hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {getPageNumbers().map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goPage(p)}
                      className={`inline-flex items-center justify-center h-8 min-w-[2rem] rounded border text-sm font-medium transition-colors ${
                        p === safePage
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-border/40 bg-background hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => goPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center justify-center h-8 w-8 rounded border border-border/40 bg-background text-sm hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
