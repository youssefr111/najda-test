"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

type LogoStackedProps = {
  width?: number;
  height?: number;
  className?: string;
};

export default function LogoStacked({
  width = 60,
  height = 60,
  className = "",
}: LogoStackedProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const src =
    mounted && resolvedTheme === "dark"
      ? "/logo-stacked-dark.png"
      : "/logo-stacked.png";

  return (
    <Image
      width={width}
      height={height}
      className={`${className} select-none`}
      src={src}
      alt="NAJDA"
      aria-hidden="true"
      priority
    />
  );
}