'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const LOGO = '/shield.png';
const LOGO_NAV = '/shield-sidebar.png';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📃', label: 'Devis & Leads', roles: ['admin', 'superviseur'] },
  { href: '/dashboard/operations', icon: '📡', label: 'Centre Opérationnel', roles: ['admin', 'superviseur'] },
  { href: '/dashboard/rh', icon: '👤', label: 'RH & Agents', roles: ['admin', 'superviseur'] },
  { href: '/dashboard/alarmes', icon: '🚨', label: 'Alarmes & IoT', roles: ['admin', 'superviseur'], badge: 'alarms' },
  { href: '/dashboard/abonnements', icon: '💳', label: 'Abonnements', roles: ['admin'] },
  { href: '/dashboard/track', icon: '📍', label: 'COSAR TRACK', roles: ['admin', 'superviseur'] },
  { href: '/dashboard/sites', icon: '🛡️', label: 'Sites & Rondes', roles: ['admin', 'superviseur'] },
  { href: '/dashboard/catalogue', icon: '🧾', label: 'Catalogue & Factures', roles: ['admin', 'superviseur'] },
  { href: '/dashboard/k9', icon: '🐾', label: 'Registre K9', roles: ['admin', 'superviseur'] },
  { href: '/dashboard/stock', icon: '📦', label: 'Stock & Matériel', roles: ['admin', 'superviseur'] },
  { href: '/dashboard/mon-espace', icon: '🪪', label: 'Mon espace', roles: ['agent'] },
  { href: '/dashboard/utilisateurs', icon: '👥', label: 'Utilisateurs & Accès', roles: ['admin'] },
  { href: '/dashboard/activite', icon: '📜', label: "Journal d'activité", roles: ['admin'] },
  { href: '/dashboard/parametres', icon: '⚙️', label: 'Paramètres', roles: ['admin', 'superviseur', 'agent'] },
];

export default function DashboardShell({ userName, role = 'admin', badges = {}, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const nav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function runSearch(event) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    if (role === 'agent') router.push('/dashboard/mon-espace');
    else if (/alarme|iot/i.test(term)) router.push('/dashboard/alarmes');
    else if (/agent|rh|contrat|congé/i.test(term)) router.push('/dashboard/rh');
    else if (/abonnement|paiement|facture/i.test(term)) router.push('/dashboard/abonnements');
    else if (/site|ronde/i.test(term)) router.push('/dashboard/sites');
    else if (/track|gps|flotte/i.test(term)) router.push('/dashboard/track');
    else router.push('/dashboard');
    setQuery('');
    setSearchOpen(false);
  }

  const sidebar = (
    <div className="shell-sidebar flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
        <div className="shrink-0 rounded-lg bg-white p-1.5 shadow-sm">
          <img src={LOGO} alt="COSAR" className="h-9 w-9 object-contain" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-white">
            COSAR <span className="text-[#F8C018]">ONE</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[#F8C018]/70">
            L’œil qui veille
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          const count = item.badge ? (badges[item.badge] || 0) : 0;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'shell-nav-active' : 'shell-nav-idle'}`}
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${active ? 'bg-[#182038] text-[#F8C018]' : 'bg-red-500 text-white'}`}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </a>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-3 pb-5 pt-3">
        {userName && <div className="truncate px-3 pb-1 text-xs text-white/60">{userName}</div>}
        <div className="px-3 pb-2 text-[10px] uppercase tracking-widest text-[#F8C018]/80">{role}</div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="w-5 text-center text-base">🚪</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F7FA]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col shadow-xl md:flex">{sidebar}</aside>
      <div className="shell-sidebar sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} className="text-2xl leading-none text-white" aria-label="Menu">☰</button>
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-white p-1 shadow-sm"><img src={LOGO_NAV} alt="COSAR" className="h-6 w-6 object-contain" /></div>
          <span className="text-sm font-semibold text-white">COSAR <span className="text-[#F8C018]">ONE</span></span>
        </div>
        <button type="button" onClick={() => setSearchOpen((open) => !open)} className="text-lg text-white" aria-label="Recherche">🔍</button>
      </div>
      <div className="sticky top-0 z-20 hidden items-center gap-3 border-b border-[#E7E9EE] bg-white/95 px-6 py-2.5 backdrop-blur md:flex md:pl-64">
        <form onSubmit={runSearch} className="max-w-md flex-1">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Recherche (agent, alarme, site, track…)"
            className="w-full rounded-lg border border-[#E7E9EE] bg-[#F6F7FA] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8C018]"
          />
        </form>
        {(badges.alarms || 0) > 0 && (
          <a href="/dashboard/alarmes" className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            {badges.alarms} alarme{badges.alarms > 1 ? 's' : ''}
          </a>
        )}
      </div>
      {searchOpen && (
        <div className="border-b border-[#E7E9EE] bg-white px-4 py-2 md:hidden">
          <form onSubmit={runSearch}>
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…" className="w-full rounded-lg border border-[#E7E9EE] px-3 py-2 text-sm" />
          </form>
        </div>
      )}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="h-full w-64 shadow-xl">{sidebar}</div>
          <button type="button" aria-label="Fermer le menu" className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}
      <div className="md:pl-60">{children}</div>
    </div>
  );
}
