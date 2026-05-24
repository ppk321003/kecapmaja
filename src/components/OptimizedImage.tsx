import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  size?: "small" | "medium" | "large";
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  className = "",
  onError,
  size = "medium",
  priority = false,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!src || !src.trim()) {
    return (
      <div className={cn("bg-slate-200 flex items-center justify-center text-xs text-slate-500", className)}>
        -
      </div>
    );
  }

  // Ensure URL is valid
  let imageUrl = src.trim();
  try {
    // Check if URL is valid
    new URL(imageUrl);
  } catch (e) {
    // Invalid URL
    return (
      <div className={cn("bg-red-100 flex items-center justify-center text-xs text-red-500", className)}>
        ❌
      </div>
    );
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoading(false);
    if (onError) onError(e);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const sizeClass = {
    small: "h-10 w-10",
    medium: "h-16 w-16",
    large: "h-32 w-32",
  }[size];

  return (
    <div className={cn("relative overflow-hidden rounded bg-slate-100", sizeClass, className)}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
      )}

      {/* Image */}
      <img
        src={imageUrl}
        alt={alt}
        loading={priority ? "eager" : "eager"}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          hasError && "hidden"
        )}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-200 flex items-center justify-center text-xs text-slate-500">
          Tidak ada foto
        </div>
      )}
    </div>
  );
}

/**
 * Utility function untuk mengoptimalkan URL image
 * Jika menggunakan image service seperti Supabase, dapat menambahkan parameter transform
 */
export function optimizeImageUrl(url: string | null | undefined, width?: number, height?: number): string | null {
  if (!url || !url.trim()) return null;

  // Jika image dari Supabase, dapat ditambahkan transform parameter
  if (url.includes("supabase.co")) {
    const params = new URLSearchParams();
    if (width) params.append("width", width.toString());
    if (height) params.append("height", height.toString());
    params.append("quality", "80");
    
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}${params.toString()}`;
  }

  // Untuk image service lain (Google Sheets, external URLs)
  return url;
}
