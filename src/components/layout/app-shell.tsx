"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";
import { NotificationBell } from "@/components/follow-ups/notification-bell";
import { AuthProvider } from "@/contexts/auth-context";
import { TourProvider } from "@/components/onboarding/tour-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { products } from "@/data/products";
import type { UserProfile } from "@/lib/db/types";

interface AppShellProps {
  children: React.ReactNode;
  user?: User | null;
  profile?: UserProfile | null;
}

export function AppShell({ children, user, profile }: AppShellProps) {
  const pathname = usePathname();

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.name === 'AbortError' || 
        event.reason?.message?.includes('AbortError') ||
        event.reason?.message?.includes('aborted')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  const generateBreadcrumbs = () => {
    const pathParts = pathname.split("/").filter(Boolean);
    const breadcrumbs: { label: string; href?: string }[] = [];

    pathParts.forEach((part, index) => {
      const href = "/" + pathParts.slice(0, index + 1).join("/");
      
      const product = products.find(p => p.id === part);
      if (product) {
        breadcrumbs.push({ label: product.name, href });
        return;
      }

      const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ");
      breadcrumbs.push({ label, href });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
      <SidebarProvider>
        <TourProvider onboardingStep={profile?.onboarding_step}>
        <AppSidebar user={user} profile={profile} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 overflow-hidden">
            <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
            <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
            <Breadcrumb className="min-w-0 flex-1">
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/" className="text-sm">Home</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href || index}>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem className="min-w-0">
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage className="truncate text-sm">{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href} className="truncate text-sm">
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            {user && <div data-tour-step="notification-bell"><NotificationBell /></div>}
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
            {children}
          </main>
        </SidebarInset>
        <BottomNav />
        <InstallPrompt />
        </TourProvider>
      </SidebarProvider>
    </AuthProvider>
  );
}
