import Image from "next/image";

type LogoIconProps = {
  width?: number;
  height?: number;
  className?: string;
};

export default function LogoIcon({
  width = 40,
  height = 40,
  className = "",
}: LogoIconProps) {
  return (
    <Image
      width={width}
      height={height}
      className={`${className} select-none`}
      src="/logo5.png"
      alt="NAJDA"
      aria-hidden="true"
      priority
    />
  );
}
