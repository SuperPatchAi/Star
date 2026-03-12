"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Map,
  FlaskConical,
  GraduationCap,
  Star,
  Search,
  Settings,
  LogOut,
  Shield,
  ChevronsUpDown,
  User,
  Users,
  MessageSquarePlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UserProfile } from "@/lib/db/types";

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
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

  const isSalesActive = pathname.startsWith("/sales");
  const isRoadmapsActive = pathname.startsWith("/roadmaps");
  const isPracticeActive = pathname.startsWith("/practice");
  const isEvidenceActive = pathname.startsWith("/evidence");
  const isFavoritesActive = pathname.startsWith("/favorites");
  const isContactsActive = pathname.startsWith("/contacts");

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
            >
              <Search className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                Search...
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Start Conversation */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Start Conversation"
                  isActive={isSalesActive}
                >
                  <Link href="/sales">
                    <MessageSquarePlus className="h-4 w-4" />
                    <span>Start Conversation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Roadmaps */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Roadmaps"
                  isActive={isRoadmapsActive}
                >
                  <Link href="/roadmaps">
                    <Map className="h-4 w-4" />
                    <span>Roadmaps</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Practice */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Practice"
                  isActive={isPracticeActive}
                >
                  <Link href="/practice">
                    <GraduationCap className="h-4 w-4" />
                    <span>Practice</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Evidence */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Evidence"
                  isActive={isEvidenceActive}
                >
                  <Link href="/evidence">
                    <FlaskConical className="h-4 w-4" />
                    <span>Clinical Evidence</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Favorites */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Favorites"
                  isActive={isFavoritesActive}
                >
                  <Link href="/favorites">
                    <Star className="h-4 w-4" />
                    <span>Favorites</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Contacts */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Contacts"
                  isActive={isContactsActive}
                >
                  <Link href="/contacts">
                    <Users className="h-4 w-4" />
                    <span>Contacts</span>
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
    </Sidebar>
  );
}
