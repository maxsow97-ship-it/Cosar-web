'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const SHIELD_LOGO = `data:image/png;base64,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`;

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📃', label: 'Devis & Leads' },
  { href: '/dashboard/operations', icon: '📡', label: 'Centre Opérationnel' },
  { href: '/dashboard/track', icon: '📍', label: 'COSAR TRACK' },
  { href: '/dashboard/sites', icon: '🛡️', label: 'Sites & Rondes' },
  { href: '/dashboard/catalogue', icon: '🧾', label: 'Catalogue & Factures' },
  { href: '/dashboard/k9', icon: '🐾', label: 'Registre K9' },
  { href: '/dashboard/stock', icon: '📦', label: 'Stock & Matériel' },
  { href: '/dashboard/utilisateurs', icon: '👥', label: 'Utilisateurs & Accès' },
];

export default function DashboardShell({ userName, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="bg-white rounded-lg p-1.5 shadow-sm shrink-0">
          <img src={SHIELD_LOGO} alt="COSAR" className="w-9 h-9 object-contain" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">COSAR ONE</div>
          <div className="text-[#F8C018] text-[10px] leading-tight">Back Office</div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-[#F8C018] text-[#182038] font-semibold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
      <div className="px-3 pb-5 pt-3 border-t border-white/10">
        {userName && <div className="px-3 pb-2 text-xs text-white/60 truncate">{userName}</div>}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          <span className="text-lg">🚪</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 bg-[#182038] flex-col z-30">
        {sidebar}
      </aside>

      <div className="md:hidden sticky top-0 z-30 bg-[#182038] flex items-center justify-between px-4 py-3">
        <button onClick={() => setMobileOpen(true)} className="text-white text-2xl leading-none">☰</button>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-md p-1 shadow-sm">
            <img src={SHIELD_LOGO} alt="COSAR" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-white font-bold text-sm">COSAR ONE</span>
        </div>
        <div className="w-6" />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-[#182038] h-full shadow-xl">{sidebar}</div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="md:pl-60">{children}</div>
    </div>
  );
}
