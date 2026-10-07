"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Panel } from "./Panel";

interface ModalProps {
  title: string;
  children: ReactNode;
  /** When provided, Escape closes the modal. */
  onClose?: () => void;
}

export function Modal({ title, children, onClose }: ModalProps) {
  useEffect(() => {
    if (!onClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex items-center justify-center bg-void/85 p-4 backdrop-blur-sm"
    >
      <Panel title={title} className="w-full max-w-md">
        {children}
      </Panel>
    </div>
  );
}
