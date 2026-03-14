"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavigationItem } from "@/config/navigation";

type SidebarNavProps = {
  items: NavigationItem[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link key={item.href} href={item.href} className={`sidebar-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
            <span className="sidebar-link__label">{item.label}</span>
            <span className="sidebar-link__meta">{item.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}
