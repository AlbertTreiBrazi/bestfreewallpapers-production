import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  forwardRef,
} from "react";
import { cn } from "../../lib/utils";

interface SafeImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src: string;
  alt: string;

  /**
   * If provided, this is treated as a CSS `aspect-ratio` value (e.g. "16/9", "9/16", "1/1").
   * NOT a Tailwind class.
   * Leave undefined if the parent controls sizing/aspect ratio (recommended).
   */
  aspectRatio?: string;

  /** Fallback UI when image fails */
  fallback?: React.ReactNode;

  /**
   * IMPORTANT:
   * - wrapperClassName styles the container <div>
   * - imgClassName styles the <img>
   */
  wrapperClassName?: string;
  imgClassName?: string;

  /** Show a subtle loading overlay */
  showLoadingOverlay?: boolean;

  /** If true, remove transitions/effects */
  disableEffects?: boolean;

  fetchPriority?: "high" | "low" | "auto";
}

export interface SafeImageRef {
  reload: () => void;
}

function addCacheBuster(url: string) {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("_cb", String(Date.now()));
    return u.toString();
  } catch {
    // If it's not a valid absolute/relative URL, just append safely
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}_cb=${Date.now()}`;
  }
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

      showLoadingOverlay = true,
      disableEffects = false,

      // Default eager = safest for first load; caller can override.
      loading = "eager",
      fetchPriority,

      onLoad,
      onError,
      style,
      ...imgProps
    },
    ref
  ) => {
    const [status, setStatus] = useState<"loading" | "loaded" | "error">(
      src ? "loading" : "error"
    );

    // We keep an internal src so we can force reload without ever setting src=""
    const [internalSrc, setInternalSrc] = useState<string>(src);

    useEffect(() => {
      if (!src) {
        setStatus("error");
        setInternalSrc("");
        return;
      }
      setStatus("loading");
      setInternalSrc(src);
    }, [src]);

    useImperativeHandle(ref, () => ({
      reload: () => {
        if (!src) return;
        setStatus("loading");
        setInternalSrc(addCacheBuster(src));
      },
    }));

    const wrapperStyle = useMemo<React.CSSProperties>(() => {
      const next: React.CSSProperties = { ...style };
      if (aspectRatio) (next as any).aspectRatio = aspectRatio;
      return next;
    }, [style, aspectRatio]);

    const defaultFallback = (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center",
          "bg-gradient-to-br from-gray-200 to-gray-300",
          "dark:from-gray-700 dark:to-gray-800",
          "text-gray-400 dark:text-gray-500"
        )}
      >
        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setStatus("loaded");
      onLoad?.(e);
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setStatus("error");
      onError?.(e);
    };

    // If it fully errored, show fallback
    if (status === "error") {
      return <>{fallback ?? defaultFallback}</>;
    }

    return (
      <div
        className={cn(
          "relative overflow-hidden",
          // Always give a background so you never see "empty"
          "bg-gray-100 dark:bg-gray-800",
          wrapperClassName
        )}
        style={wrapperStyle}
      >
        {/* Loading overlay (optional) */}
        {status === "loading" && showLoadingOverlay && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* IMPORTANT: We NEVER hide the image with opacity:0 (that’s what can get stuck) */}
        <img
          key={internalSrc} // force remount if src changes
          {...imgProps}
          src={internalSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          {...(fetchPriority ? ({ fetchPriority } as any) : {})}
          className={cn(
            "w-full h-full object-cover",
            disableEffects ? "" : "transition-transform duration-300",
            imgClassName
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }
);

SafeImage.displayName = "SafeImage";
