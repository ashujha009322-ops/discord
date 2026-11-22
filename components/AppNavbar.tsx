"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import {
  Home,
  LayoutDashboard,
  PhoneCall,
  Menu,
  X,
  AudioWaveform,
} from "lucide-react";

const navigation = [
  {
    name: "Home",
    href: "/",
    icon: Home,
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Calling",
    href: "/calling",
    icon: PhoneCall,
  },
];

function NavbarContent() {
  // Keep your existing AppNavbar implementation here.
  // No changes to the navigation, authentication, or mobile menu.

  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/home"
          className="flex shrink-0 items-center gap-2.5"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <AudioWaveform className="size-5" />
          </div>

          <span className="text-lg font-bold tracking-tight">
            Calling<span className="text-primary">.</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`
                  relative flex items-center gap-2 rounded-xl px-4 py-2
                  text-sm font-medium transition-all duration-200
                  ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }
                `}
              >
                <Icon className="size-4" />
                {item.name}

                {active && (
                  <span className="absolute inset-x-4 -bottom-[13px] h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <Show when="signed-out">
              <SignInButton>
                <button className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  Sign in
                </button>
              </SignInButton>

              <SignUpButton>
                <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md">
                  Get started
                </button>
              </SignUpButton>
            </Show>

            <Show when="signed-in">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "size-9",
                  },
                }}
              />
            </Show>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex size-10 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-accent md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background p-4 shadow-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigation.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`
                    flex items-center gap-3 rounded-xl px-4 py-3
                    text-sm font-medium transition-colors
                    ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }
                  `}
                >
                  <Icon className="size-5" />
                  {item.name}
                </Link>
              );
            })}

            <div className="my-2 border-t border-border" />

            <Show when="signed-out">
              <SignInButton>
                <button className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium hover:bg-accent">
                  Sign in
                </button>
              </SignInButton>

              <SignUpButton>
                <button className="w-full rounded-xl bg-primary px-4 py-3 text-left text-sm font-semibold text-primary-foreground">
                  Get started
                </button>
              </SignUpButton>
            </Show>

            <Show when="signed-in">
              <div className="flex items-center gap-3 px-4 py-3">
                <UserButton />
                <span className="text-sm font-medium">Your account</span>
              </div>
            </Show>
          </div>
        </div>
      )}
    </header>
  );
}

export default function AppNavbar() {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-50 h-16 w-full border-b border-white/[0.08] bg-background/80 backdrop-blur-xl" />
      }
    >
      <NavbarContent />
    </Suspense>
  );
}
