"use client";

import { useState } from "react";
import { Menu, LogOut } from "lucide-react";
import { AppSidebar, SidebarBrand } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TabKey } from "@/lib/constants";
import { signOutAction } from "@/app/(auth)/actions";

// Persistent authenticated shell. Renders once; only `children` (the tab body)
// swaps on navigation, keeping tab switching instant.
export function AppShell({
  allowedTabs,
  userName,
  children,
}: {
  allowedTabs: TabKey[];
  userName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const initial = (userName || "מ").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 border-l bg-card md:block">
        <div className="sticky top-0">
          <SidebarBrand />
          <AppSidebar allowedTabs={allowedTabs} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute inset-y-0 right-0 w-64 border-l bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarBrand />
            <div onClick={() => setOpen(false)}>
              <AppSidebar allowedTabs={allowedTabs} />
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="font-semibold md:hidden">גדוד הבוקע 5035</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userName}
            </span>
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initial}
              </AvatarFallback>
            </Avatar>
            <form action={signOutAction}>
              <Button variant="ghost" size="icon" type="submit" title="התנתק">
                <LogOut className="size-5" />
              </Button>
            </form>
          </div>
        </header>

        <main className={cn("flex-1 p-4 md:p-6")}>{children}</main>
      </div>
    </div>
  );
}
