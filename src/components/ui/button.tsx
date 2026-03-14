import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "primary", style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        borderRadius: 12,
        padding: "10px 16px",
        border: variant === "primary" ? "1px solid var(--primary)" : "1px solid var(--border)",
        background: variant === "primary" ? "var(--primary)" : "var(--surface)",
        color: variant === "primary" ? "#ffffff" : "var(--foreground)",
        cursor: "pointer",
        ...style,
      }}
    />
  );
}
