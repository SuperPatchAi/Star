"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  FlaskConical,
  GraduationCap,
  Search,
  Settings,
  LogOut,
  Shield,
  ChevronsUpDown,
  User,
  Users,
  LayoutDashboard,
  CalendarCheck,
  RotateCcw,
  HelpCircle,
} from "lucide-react";
import { resetOnboarding } from "@/lib/actions/onboarding";
import { getContacts } from "@/lib/actions/contacts";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { UserProfile, Contact } from "@/lib/db/types";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: SupabaseUser | null;
  profile?: UserProfile | null;
}

export function AppSidebar({
  user,
  profile,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    setSearchLoading(true);
    getContacts().then(({ data }) => {
      setContacts(data ?? []);
      setSearchLoading(false);
    });
  }, [searchOpen]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSignOut = async () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/signout';
    document.body.appendChild(form);
    form.submit();
  };

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const isDashboardActive = pathname.startsWith("/dashboard");
  const isContactsActive = pathname.startsWith("/contacts");
  const isActivityActive = pathname.startsWith("/activity");
  const isPracticeActive = pathname.startsWith("/practice");
  const isEvidenceActive = pathname.startsWith("/evidence");

  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black p-1">
            <Image
              src="/SuperPatch-SYMBL-3_SuperPatch_Logo_SYMBL_WHT.png"
              alt="SuperPatch"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold text-sidebar-foreground">
              SuperPatch
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              D2C Sales
            </span>
          </div>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full justify-start gap-2 bg-sidebar-accent/50"
              tooltip="Search"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                Search...
              </span>
              <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex group-data-[collapsible=icon]:!hidden">
                <span className="text-xs">⌘</span>K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Dashboard"
                  isActive={isDashboardActive}
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Contacts"
                  isActive={isContactsActive}
                >
                  <Link href="/contacts" data-tour-step="contacts-nav">
                    <Users className="h-4 w-4" />
                    <span>Contacts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Activities"
                  isActive={isActivityActive}
                >
                  <Link href="/activity">
                    <CalendarCheck className="h-4 w-4" />
                    <span>Activities</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Practice"
                  isActive={isPracticeActive}
                >
                  <Link href="/practice" data-tour-step="practice-nav">
                    <GraduationCap className="h-4 w-4" />
                    <span>Practice</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Clinical Evidence"
                  isActive={isEvidenceActive}
                >
                  <Link href="/evidence">
                    <FlaskConical className="h-4 w-4" />
                    <span>Clinical Evidence</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            {mounted && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ''} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-semibold">
                        {profile?.full_name || user.email?.split('@')[0]}
                      </span>
                      <span className="truncate text-xs text-muted-foreground flex items-center gap-1">
                        {profile?.role === 'admin' && (
                          <Shield className="h-3 w-3 text-primary" />
                        )}
                        {user.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ''} />
                        <AvatarFallback className="rounded-lg">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {profile?.full_name || user.email?.split('@')[0]}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                      {profile?.role === 'admin' && (
                        <Badge variant="default" className="ml-auto">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await resetOnboarding("carousel");
                      window.location.href = "/onboarding";
                    }}
                    className="cursor-pointer"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Replay Welcome
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      await resetOnboarding("tour");
                      window.location.href = "/dashboard";
                    }}
                    className="cursor-pointer"
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Replay Tour
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : mounted && !user ? (
              <SidebarMenuButton asChild>
                <Link href="/login">
                  <User className="h-4 w-4" />
                  <span>Sign in</span>
                </Link>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton size="lg" disabled>
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                <div className="grid flex-1 gap-1 group-data-[collapsible=icon]:hidden">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search contacts..." />
        <CommandList>
          <CommandEmpty>
            {searchLoading ? "Loading..." : "No contacts found."}
          </CommandEmpty>
          <CommandGroup heading="Contacts">
            {contacts.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.first_name} ${c.last_name}`}
                onSelect={() => {
                  setSearchOpen(false);
                  router.push(`/contacts?openContact=${c.id}`);
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                {c.first_name} {c.last_name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </Sidebar>
  );
}
