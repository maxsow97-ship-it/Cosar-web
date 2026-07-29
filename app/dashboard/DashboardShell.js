'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📃', label: 'Devis & Leads' },
  { href: '/dashboard/operations', icon: '📡', label: 'Centre Opérationnel' },
  { href: '/dashboard/track', icon: '📍', label: 'COSAR TRACK' },
  { href: '/dashboard/sites', icon: '🛡️', label: 'Sites & Rondes' },
  { href: '/dashboard/catalogue', icon: '🧾', label: 'Catalogue & Factures' },
  { href: '/dashboard/k9', icon: '🐾', label: 'Registre K9' },
  { href: '/dashboard/stock', icon: '📦', label: 'Stock & Matériel' },
  { href: '/dashboard/utilisateurs', icon: '👤', label: 'Utilisateurs & Accès' },
];

function NavLinks({ pathname, onNavigate }) {
  return (
    <nav className="flex-1 py-3 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-[3px] ${
              active
                ? 'bg-amber-50 border-[#F8C018] text-[#182038] font-semibold'
                : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-[#182038]'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export default function DashboardShell({ userName, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const currentLabel = NAV_ITEMS.find((i) => i.href === pathname)?.label || 'Back Office';

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar desktop, toujours visible */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="font-bold text-lg leading-tight">
            <span className="text-[#F8C018]">COSAR</span> <span className="text-[#182038]">ONE</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Back Office</div>
        </div>
        <NavLinks pathname={pathname} />
        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400">
          « La sécurité, sans détour »
        </div>
      </aside>

      {/* Drawer mobile, ouvert via le bouton hamburger de la barre superieure */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
            <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-lg leading-tight">
                  <span className="text-[#F8C018]">COSAR</span> <span className="text-[#182038]">ONE</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Back Office</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 text-xl leading-none">✕</button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            <button
              onClick={logout}
              className="mx-5 mb-5 mt-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50"
            >
              Déconnexion
            </button>
          </div>
        </div>
      )}

      {/* Zone de contenu */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="md:hidden text-[#182038]" aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
            <span className="font-semibold text-[#182038] text-sm md:text-base">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-500">Connecté : {userName}</span>
            <button onClick={logout} className="hidden md:inline text-xs font-medium text-slate-500 hover:text-[#B03A2E] border border-slate-200 rounded-lg px-3 py-1.5">
              Déconnexion
            </button>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
