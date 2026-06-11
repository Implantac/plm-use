import React from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  containerClassName?: string;
  aspectRatio?: "square" | "video" | "portrait" | "landscape" | string;
  priority?: boolean;
}

export const OptimizedImage = ({
  src,
  alt,
  containerClassName,
  aspectRatio = "square",
  priority = false,
  className,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = React.useState(false);

  const getOptimizedUrl = (url: string) => {
    if (url.includes("images.unsplash.com")) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}auto=format,avif&q=80&fit=crop&w=800`;
    }
    return url;
  };

  const optimizedSrc = getOptimizedUrl(src);

  const aspectRatioClass =
    {
      square: "aspect-square",
      video: "aspect-video",
      portrait: "aspect-[3/4]",
      landscape: "aspect-[4/3]",
    }[aspectRatio] || aspectRatio;

  return (
    <div
      className={cn("relative overflow-hidden bg-white/5", aspectRatioClass, containerClassName)}
    >
      <img
        src={optimizedSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "h-full w-full object-cover transition-all duration-700",
          isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-110 blur-xl",
          className,
        )}
        {...props}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
