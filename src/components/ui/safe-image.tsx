import React, { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { cn } from "../../lib/utils";

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src: string;
  alt: string;

  // dacă ai nevoie, altfel poți ignora
  aspectRatio?: string;

  fallback?: React.ReactNode;

  // ✅ aliniază API-ul cu EnhancedWallpaperCard
  wrapperClassName?: string;
  imgClassName?: string;

  // ✅ pentru a opri overlay-ul/spinnerul
  showLoadingSpinner?: boolean;

  fetchPriority?: "high" | "low" | "auto";
}

export interface SafeImageRef {
  reload: () => void;
}

export const SafeImage = forwardRef<SafeImageRef, SafeImageProps>(
  (
    {
      src,
      alt,
      fallback,
      aspectRatio,

      wrapperClassName,
      imgClassName,

      showLoadingSpinner = false, // ✅ default OFF (ca să nu vezi “gri”)
      loading = "eager",
      fetchPriority,

      onLoad,
      onError,
      style,
      ...imgProps
    },
    ref
  ) => {
    const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

    // ✅ afișăm “ultima imagine bună” ca să nu clipească gri la navigare
    const [displaySrc, setDisplaySrc] = useState<string>(src);
    const pendingSrcRef = useRef<string>(src);

    useEffect(() => {
      if (!src) {
        setStatus("error");
        return;
      }

      // dacă src e același, nu face nimic
      if (pendingSrcRef.current === src && displaySrc === src) return;

      pendingSrcRef.current = src;
      setStatus("loading");

      // preload în fundal
      const img = new Image();
      img.decoding = "async";
      img.loading = loading;

      img.onload = () => {
        // dacă între timp s-a schimbat src, ignoră
        if (pendingSrcRef.current !== src) return;
        setDisplaySrc(src);
        setStatus("loaded");
      };

      img.onerror = () => {
        if (pendingSrcRef.current !== src) return;
        setStatus("error");
        onError?.(new Event("error") as any);
      };

      img.src = src;

      // cleanup
      return () => {
        img.onload = null;
        img.onerror = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    useImperativeHandle(ref, () => ({
      reload: () => {
        if (!src) return;
        pendingSrcRef.current = src;
        setStatus("loading");
        const img = new Image();
        img.onload = () => {
          setDisplaySrc(src);
          setStatus("loaded");
        };
        img.onerror = () => setStatus("error");
        img.src = src;
      },
    }));

    const wrapperStyle = useMemo<React.CSSProperties>(() => {
      const next: React.CSSProperties = { ...style };
      if (aspectRatio) (next as any).aspectRatio = aspectRatio;
      return next;
    }, [style, aspectRatio]);

    const defaultFallback = (
      <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-400">
        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );

    if (status === "error") return <>{fallback ?? defaultFallback}</>;

    return (
      <div className={cn("relative overflow-hidden", wrapperClassName)} style={wrapperStyle}>
        {status === "loading" && showLoadingSpinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <img
          {...imgProps}
          src={displaySrc}
          alt={alt}
          loading={loading}
          decoding="async"
          {...(fetchPriority ? ({ fetchPriority } as any) : {})}
          className={cn("w-full h-full object-cover", imgClassName)}
          onLoad={onLoad}
          onError={onError}
        />
      </div>
    );
  }
);

SafeImage.displayName = "SafeImage";
