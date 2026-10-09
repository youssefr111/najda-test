import Image from "next/image";

type LogoStackedProps = {
  width?: number;
  height?: number;
  className?: string;
};

export default function LogoStacked({
  width = 40,
  height = 40,
  className = "",
}: LogoStackedProps) {
  return (
    <Image
      width={width}
      height={height}
      className={`${className} select-none`}
      src="/logo6.png"
      alt="NAJDA"
      aria-hidden="true"
      priority
    />
  );
}
