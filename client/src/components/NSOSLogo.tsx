import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

type NSOSLogoProps = {
  className?: string;
  forceInverse?: boolean;
};

export function NSOSLogo({ className, forceInverse }: NSOSLogoProps) {
  const { theme } = useTheme();
  const inverse = forceInverse ?? theme === "dark";

  return (
    <img
      src={inverse ? "/icons/nsos-logo-inverse.svg" : "/icons/nsos-logo.svg"}
      alt="NSOS — Nigerian School Operating System"
      className={cn("h-11 w-auto max-w-[190px]", className)}
    />
  );
}
