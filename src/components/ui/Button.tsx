import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "border-blood bg-blood/25 text-bone hover:bg-blood/50 hover:border-blood-bright",
  secondary: "border-steel bg-iron/70 text-parchment hover:border-ash hover:text-bone",
  ghost: "border-transparent text-ash hover:text-bone",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "secondary", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      data-sfx={variant === "primary" ? "confirm" : undefined}
      className={`inline-flex cursor-pointer items-center justify-center border px-5 py-3 font-typewriter text-sm uppercase tracking-[0.25em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-parchment disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
