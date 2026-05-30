"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Car, ClipboardList, MessageSquare, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAB_LABELS, TAB_ROUTES, type TabKey } from "@/lib/constants";

const ICONS: Record<TabKey, React.ElementType> = {
  vehicles: Car,
  drive_card: ClipboardList,
  whatsapp: MessageSquare,
  admin: Shield,
  profile: User,
};

// Order tabs are shown in the nav.
const NAV_ORDER: TabKey[] = ["vehicles", "drive_card", "whatsapp", "admin", "profile"];

export function AppSidebar({ allowedTabs }: { allowedTabs: TabKey[] }) {
  const pathname = usePathname();
  const allowed = new Set(allowedTabs);
  const tabs = NAV_ORDER.filter((t) => allowed.has(t));

  return (
    <nav className="flex flex-col gap-1 p-3">
      {tabs.map((tab) => {
        const Icon = ICONS[tab];
        const href = TAB_ROUTES[tab];
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={tab}
            href={href}
            prefetch
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" />
            <span>{TAB_LABELS[tab]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/vehicles" className="flex items-center gap-3 px-4 py-4">
      <Image
        src="/logo-256.png"
        alt="גדוד הבוקע 5035"
        width={40}
        height={40}
        className="rounded-md"
        priority
      />
      <div className="leading-tight">
        <div className="text-sm font-bold">גדוד הבוקע</div>
        <div className="text-xs text-muted-foreground">5035</div>
      </div>
    </Link>
  );
}
