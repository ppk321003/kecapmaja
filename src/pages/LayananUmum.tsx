import { useState, useMemo } from 'react';
import { usePublikasiSheets } from '@/hooks/use-publikasi-sheets';
import { isGoogleDriveUrl, getGoogleDriveImageUrl, getGoogleDriveViewUrl } from '@/utils/drive-url-converter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileText, Download, Search, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState as useStateCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SHEET_ID = "1P2TulBe-XIEdmiNqGU3UB1mNr6mnTuPDEFq34E-6zf0";

export default function LayananUmum() {
  const { publikasi, loading, error } = usePublikasiSheets({
    spreadsheetId: SHEET_ID,
    sheetName: "Sheet1"
  });

  console.log('[LayananUmum] Publikasi loaded:', publikasi.length, 'items');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'terbaru' | 'terlama' | 'nama'>('terbaru');
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Get unique years and categories
  const years = useMemo(() => {
    const unique = [...new Set(publikasi.map(p => p.tahun))].sort((a, b) => b - a);
    return unique;
  }, [publikasi]);

  const categories = useMemo(() => {
    const unique = [...new Set(publikasi.map(p => p.kategori))].filter(Boolean).sort();
    return unique;
  }, [publikasi]);

  // Filter and search logic
  const filteredPublikasi = useMemo(() => {
    let filtered = publikasi;

    // Year filter
    if (selectedYears.size > 0) {
      filtered = filtered.filter(p => selectedYears.has(p.tahun));
    }

    // Category filter
    if (selectedCategories.size > 0) {
      filtered = filtered.filter(p => selectedCategories.has(p.kategori));
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.namaPublikasi.toLowerCase().includes(term) ||
        p.deskripsi.toLowerCase().includes(term) ||
        p.kategori.toLowerCase().includes(term)
      );
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'terbaru': {
        const tahun = new Date().getFullYear();
        sorted.sort((a, b) => {
          const aDiff = Math.abs(a.tahun - tahun);
          const bDiff = Math.abs(b.tahun - tahun);
          return aDiff - bDiff;
        });
        break;
      }
      case 'terlama':
        sorted.sort((a, b) => a.tahun - b.tahun);
        break;
      case 'nama':
        sorted.sort((a, b) => a.namaPublikasi.localeCompare(b.namaPublikasi));
        break;
    }

    return sorted;
  }, [publikasi, searchTerm, sortBy, selectedYears, selectedCategories]);

  // Pagination
  const totalPages = Math.ceil(filteredPublikasi.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredPublikasi.slice(startIndex, endIndex);

  const toggleYear = (year: number) => {
    const newYears = new Set(selectedYears);
    if (newYears.has(year)) {
      newYears.delete(year);
    } else {
      newYears.add(year);
    }
    setSelectedYears(newYears);
    setCurrentPage(1);
  };

  const toggleCategory = (category: string) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    setSelectedCategories(newCategories);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedYears(new Set());
    setSelectedCategories(new Set());
    setCurrentPage(1);
  };

  const getFileIcon = (tipeFile: string) => {
    const type = tipeFile.toLowerCase();
    if (type.includes('pdf')) return '📄';
    if (type.includes('excel') || type.includes('xlsx') || type.includes('xls')) return '📊';
    if (type.includes('web') || type.includes('interactive')) return '🌐';
    if (type.includes('email')) return '📧';
    return '📎';
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
        {/* Search and Filters Section */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 h-5 w-5" />
            <Input
              placeholder="Cari publikasi berdasarkan nama atau deskripsi..."
              className="pl-10 py-2 h-11"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {/* Year Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
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

              {/* Category Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Kategori {selectedCategories.size > 0 && `(${selectedCategories.size})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Filter Kategori</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {categories.map(category => (
                    <DropdownMenuCheckboxItem
                      key={category}
                      checked={selectedCategories.has(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    >
                      {category}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex gap-2 items-center">
              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terbaru">Terbaru</SelectItem>
                  <SelectItem value="terlama">Terlama</SelectItem>
                  <SelectItem value="nama">Nama A-Z</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters Button */}
              {(searchTerm || selectedYears.size > 0 || selectedCategories.size > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-sm"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedYears.size > 0 || selectedCategories.size > 0) && (
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedYears).map(year => (
                <Badge key={`year-${year}`} variant="secondary" className="gap-1">
                  {year}
                  <button onClick={() => toggleYear(year)} className="ml-1">✕</button>
                </Badge>
              ))}
              {Array.from(selectedCategories).map(cat => (
                <Badge key={`cat-${cat}`} variant="secondary" className="gap-1">
                  {cat}
                  <button onClick={() => toggleCategory(cat)} className="ml-1">✕</button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Results Info */}
        <div className="text-sm text-slate-600 mb-6">
          Menampilkan {currentItems.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredPublikasi.length)} dari {filteredPublikasi.length} publikasi
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent className="text-red-600">
              {error}. Silakan coba lagi atau hubungi administrator.
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && currentItems.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 text-center">
                {filteredPublikasi.length === 0 && publikasi.length > 0
                  ? 'Tidak ada publikasi yang sesuai dengan filter Anda'
                  : 'Tidak ada publikasi tersedia'}
              </p>
              {filteredPublikasi.length === 0 && publikasi.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                  Reset Filter
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Publications Grid */}
        {!loading && !error && currentItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentItems.map((pub) => {
              const imageUrl = isGoogleDriveUrl(pub.thumbnailUrl)
                ? getGoogleDriveImageUrl(pub.thumbnailUrl)
                : pub.thumbnailUrl;
              const viewUrl = isGoogleDriveUrl(pub.link)
                ? getGoogleDriveViewUrl(pub.link)
                : pub.link;

              return (
              <Card key={pub.no} className="hover:shadow-lg transition-shadow flex flex-col h-full overflow-hidden">
                {/* Thumbnail */}
                {pub.thumbnailUrl && (
                  <div className="relative h-40 bg-slate-100 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={pub.namaPublikasi}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <CardContent className="flex-1 pt-4 pb-3 flex flex-col">
                  {/* Category and Status */}
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {pub.kategori && (
                      <Badge variant="outline" className="text-xs">
                        {pub.kategori}
                      </Badge>
                    )}
                    {pub.status && (
                      <Badge variant={pub.status === 'Featured' ? 'default' : 'secondary'} className="text-xs">
                        {pub.status}
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-sm line-clamp-2 text-slate-900 mb-2">
                    {pub.namaPublikasi}
                  </h3>

                  {/* Year */}
                  <p className="text-xs text-slate-500 mb-2">Tahun: {pub.tahun}</p>

                  {/* Description */}
                  {pub.deskripsi && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-3 flex-1">
                      {pub.deskripsi}
                    </p>
                  )}

                  {/* File Type and Link */}
                  <div className="flex items-center gap-2 pt-3 border-t">
                    {pub.tipeFile && (
                      <span className="text-lg">{getFileIcon(pub.tipeFile)}</span>
                    )}
                    {pub.link && (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                      >
                        Lihat
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Sebelumnya
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-10"
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Selanjutnya
            </Button>
          </div>
        )}

        {/* Page Info */}
        {!loading && !error && totalPages > 1 && (
          <div className="text-center text-sm text-slate-600 mt-4">
            Halaman {currentPage} dari {totalPages}
          </div>
        )}
      </div>
    </div>
  );
}
