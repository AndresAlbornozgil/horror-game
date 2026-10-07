"use client";

import { useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const fieldClasses =
  "w-full border border-steel bg-void/80 px-4 py-3 font-typewriter text-base tracking-widest text-bone outline-none transition-colors placeholder:text-ash/50 focus:border-parchment disabled:cursor-not-allowed disabled:opacity-50";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, className = "", ...props }: InputProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} autoComplete="off" spellCheck={false} className={`${fieldClasses} ${className}`} {...props} />
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function Select({ label, className = "", children, ...props }: SelectProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} className={`${fieldClasses} cursor-pointer ${className}`} {...props}>
        {children}
      </select>
    </div>
  );
}
