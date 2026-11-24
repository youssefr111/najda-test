"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";

type LogoIconProps = {
  width?: number;
  height?: number;
  className?: string;
};

export default function LogoIcon({
  width = 50,
  height = 50,
  className = "",
}: LogoIconProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Image
        width={width}
        height={height}
        className={`${className} select-none`}
        src="/logo.png"
        alt="NAJDA"
        aria-hidden="true"
        priority
      />
    );
  }

  return (
    <Image
      width={width}
      height={height}
      className={`${className} select-none`}
      src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo.png"}
      alt="NAJDA"
      aria-hidden="true"
      priority
    />
  );
}