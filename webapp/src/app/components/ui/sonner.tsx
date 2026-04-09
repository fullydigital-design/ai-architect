"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--surface-elevated)",
          "--normal-text": "var(--content-primary)",
          "--normal-border": "var(--border-default)",
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
