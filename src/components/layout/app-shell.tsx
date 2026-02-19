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
import { AuthProvider } from "@/contexts/auth-context";
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
        <AppSidebar user={user} profile={profile} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href || index}>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href}>
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
