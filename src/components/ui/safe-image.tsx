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

  fallback?: React.ReactNode;
  className?: string;

  showLoadingSpinner?: boolean;
  disableEffects?: boolean;
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
      className,
      aspectRatio,
      showLoadingSpinner = true,

      // IMPORTANT: default eager so first page-load always requests images.
      // If you want lazy, pass loading="lazy" from the caller.
      loading = "eager",

      disableEffects = false,
      fetchPriority,

      onLoad,
      onError,
      style,
      ...imgProps
    },
    ref
  ) => {
    const [state, setState] = useState<"loading" | "loaded" | "error">(
      src ? "loading" : "error"
    );
    const [currentSrc, setCurrentSrc] = useState(src);

    // Update when src changes
    useEffect(() => {
      if (!src) {
        setState("error");
        setCurrentSrc("");
        return;
      }
      setState("loading");
      setCurrentSrc(src);
    }, [src]);

    useImperativeHandle(ref, () => ({
      reload: () => {
        if (!src) return;
        // Force a re-load even if src is same
        setState("loading");
        setCurrentSrc("");
        // next tick set back to src so browser restarts request
        queueMicrotask(() => setCurrentSrc(src));
      },
    }));

    const wrapperStyle = useMemo<React.CSSProperties>(() => {
      const next: React.CSSProperties = { ...style };
      // Only apply if provided; parent should usually handle sizing.
      if (aspectRatio) next.aspectRatio = aspectRatio as any;
      return next;
    }, [style, aspectRatio]);

    const defaultFallback = (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 text-gray-400 dark:text-gray-500"
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

    if (state === "error") {
      return <>{fallback ?? defaultFallback}</>;
    }

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setState("loaded");
      onLoad?.(e);
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setState("error");
      onError?.(e);
    };

    return (
      <div className={cn("relative overflow-hidden", className)} style={wrapperStyle}>
        {state === "loading" && showLoadingSpinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <img
          {...imgProps}
          src={currentSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          {...(fetchPriority ? ({ fetchPriority } as any) : {})}
          className={cn(
            "w-full h-full object-cover",
            state === "loading" && showLoadingSpinner ? "opacity-0" : "opacity-100",
            disableEffects ? "" : "transition-opacity duration-300"
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }
);

SafeImage.displayName = "SafeImage";
