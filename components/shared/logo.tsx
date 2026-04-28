"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
}

export function Logo({
  width = 320,
  height = 320,
  className = "",
  fill = false,
}: LogoProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder while theme is loading
    return <div style={{ width, height }} className={className} />;
  }

  const logoSrc =
    theme === "dark" ? "/darkmode-logo.png" : "/lightmode-logo.png";

  if (fill) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={logoSrc}
          alt="Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
    );
  }

  return (
    <Image
      src={logoSrc}
      alt="Logo"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
}
