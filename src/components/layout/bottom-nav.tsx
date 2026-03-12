"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Bell, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/activity", label: "Activity", icon: Bell },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-stretch">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                isActive
                  ? "text-primary font-semibold"
                  : "font-medium text-muted-foreground active:text-foreground"
              )}
            >
              <tab.icon
                className="size-5"
                strokeWidth={isActive ? 2.5 : 2}
              />
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors active:text-foreground"
        >
          <Menu className="size-5" strokeWidth={2} />
          More
        </button>
      </div>
    </nav>
  );
}
