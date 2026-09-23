import Image from "next/image";

type LogoStackedProps = {
  width?: number;
  height?: number;
  className?: string;
};

export default function LogoStacked({
  width = 100,
  height = 100,
  className = "",
}: LogoStackedProps) {
  return (
    <Image
      width={width}
      height={height}
      className={`${className} select-none`}
      src="/logo8.png"
      alt="NAJDA"
      aria-hidden="true"
      priority
    />
  );
}