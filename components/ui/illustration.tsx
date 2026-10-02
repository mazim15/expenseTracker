"use client";

import { ReactNode, useState } from "react";
import Image from "next/image";

interface IllustrationProps {
  /** Path under /public, e.g. "/illustrations/hero.png". */
  src: string;
  width: number;
  height: number;
  /** Rendered instead when the image file is missing or fails to load. */
  fallback: ReactNode;
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/** A decorative illustration that degrades to `fallback` until the asset exists. */
export function Illustration({
  src,
  width,
  height,
  fallback,
  alt = "",
  className,
  priority,
  sizes,
}: IllustrationProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
