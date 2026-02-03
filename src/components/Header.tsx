"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Target,
  Calendar,
  BarChart3,
  Settings,
  LogIn,
  LogOut,
  User,
  Clock,
  Workflow,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AnimatedLinesLogo from "@/components/icons/AnimatedLinesLogo";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Календар", href: "/calendar", icon: Calendar },
  { name: "Цілі", href: "/goals", icon: Target },
  { name: "Статистика", href: "/stats", icon: BarChart3 },
  { name: "Canvas", href: "/canvas", icon: Workflow },
  { name: "Налаштування", href: "/settings", icon: Settings },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin access when session is available
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/admin/check-access')
        .then(res => res.json())
        .then(data => setIsAdmin(data.hasAccess))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [status]);

  const getUserInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="w-full border-b border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <AnimatedLinesLogo className="h-8 w-8 text-black dark:text-white" />
            <span className="text-lg font-bold text-black dark:text-white">
              Life Designer
            </span>
          </Link>

          {/* Navigation and Auth */}
          <div className="flex items-center gap-4">
            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Auth Section */}
            {status === "loading" ? (
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            ) : status === "authenticated" && session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={session.user.image || ""}
                        alt={session.user.name || "User"}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer">
                          <Shield className="mr-2 h-4 w-4" />
                          Адмін панель
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/clockify" className="cursor-pointer">
                      <Clock className="mr-2 h-4 w-4" />
                      Clockify
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Налаштування
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Вийти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => signIn("google")}
                variant="default"
                size="sm"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Увійти
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
