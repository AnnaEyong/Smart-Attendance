"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanFace,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  Menu,
  X,
  GraduationCap,
  LogOut,
  Bell,
} from "lucide-react";

const navItems = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Attendance",
    items: [
      { label: "Take Attendance", href: "/dashboard/attendance", icon: ScanFace },
      { label: "Students", href: "/students", icon: Users },
      { label: "Courses", href: "/dashboard/courses", icon: BookOpen },
    ],
  },
  {
    group: "Analytics",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export default function AppSidebar({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobileMenu = () => setMobileOpen(true);

  const closeMobileMenu = () => setMobileOpen(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = (href) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={`flex items-center gap-3 px-4 py-5 ${collapsed && !isMobile ? "justify-center px-2" : ""}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 shadow-sm">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>

        {(!collapsed || isMobile) && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 leading-tight">
              SmartAttend
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
              Admin Portal
            </p>
          </div>
        )}
      </div>

      <div className="mx-3 mb-3 h-px bg-slate-100" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
        {navItems.map((group) => (
          <div key={group.group}>
            {(!collapsed || isMobile) && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group.group}
              </p>
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150
                        ${collapsed && !isMobile ? "justify-center px-2" : ""}
                        ${
                          active
                            ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                    >
                      <item.icon
                        className={`h-4.5 w-4.5 shrink-0 transition-colors ${active ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600"}`}
                      />

                      {(!collapsed || isMobile) && (
                        <span className="truncate">{item.label}</span>
                      )}

                      {active && (!collapsed || isMobile) && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-500" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mx-3 mt-2 h-px bg-slate-100" />

      {/* Notifications */}
      <div className="px-2 py-2">
        <button
          className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900
            ${collapsed && !isMobile ? "justify-center px-2" : ""}`}
        >
          <div className="relative shrink-0">
            <Bell className="h-4.5 w-4.5 text-slate-400 group-hover:text-slate-600" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
          </div>

          {(!collapsed || isMobile) && (
            <>
              <span className="truncate">Notifications</span>
              <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                3
              </span>
            </>
          )}
        </button>
      </div>

      {/* User profile */}
      <div
        className={`m-2 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ${collapsed && !isMobile ? "justify-center p-2" : ""}`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-xs font-bold text-white shadow-sm">
          AD
        </div>

        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800">
              Admin User
            </p>
            <p className="truncate text-[10px] text-slate-400">
              admin@university.edu
            </p>
          </div>
        )}

        {(!collapsed || isMobile) && (
          <button className="cursor-pointer shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside
        className={`relative hidden flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out lg:flex
          ${collapsed ? "w-17" : "w-60"}`}
      >
        <SidebarContent />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 z-10 flex cursor-pointer h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:border-sky-300 hover:text-sky-600"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            className={`h-3.5 w-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} flex`}
      >
        <button
          onClick={closeMobileMenu}
          className="absolute cursor-pointer right-3 top-4 z-50 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        <SidebarContent isMobile />
      </aside>

      {/* Main content */}
      <div className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="relative z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={openMobileMenu}
            className="relative z-30 flex h-9 w-9 cursor-pointer touch-manipulation items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              SmartAttend
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
