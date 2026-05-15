import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "btn-wa",
  ghost: "btn-ghost",
  outline:
    "border border-bone/25 text-bone hover:border-orange hover:text-orange transition-colors",
};

const SIZE: Record<Size, string> = {
  sm: "fluid-xs px-4 py-2",
  md: "fluid-sm px-5 py-3",
  lg: "fluid-base px-7 py-4",
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonProps = BaseProps & ComponentProps<"button"> & { href?: undefined };
type LinkButtonProps = BaseProps &
  Omit<ComponentProps<typeof Link>, "className"> & { href: string };

function classes({
  variant = "primary",
  size = "md",
  extra,
}: {
  variant?: Variant;
  size?: Size;
  extra?: string;
}): string {
  return [
    "inline-flex items-center justify-center gap-2 uppercase tracking-wider clip-tag",
    SIZE[size],
    VARIANT[variant],
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: ButtonProps | LinkButtonProps) {
  const { variant, size, className, children } = props;
  const cls = classes({ variant, size, extra: className });

  if ("href" in props && typeof props.href === "string") {
    const { href, ...rest } = props as LinkButtonProps;
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  const { ...rest } = props as ButtonProps;
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
