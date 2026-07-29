'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const SHIELD_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAB/CAIAAACfelAhAAAyDElEQVR42u19d5xV1dX2s/Y+59a5d+69U6gDwwxNmiCKgoKowZKIWAARNRob8GIsUT/Lq3lNokYTNYnGaIyaBCN2xA4OUlQREREEHwGZfnv9/tqZO7cN3Q0DE7z1GXZO+eee3f3d3fVsHmZmvL/o/wQ6D8DfDkD/AbjqAgAY8B+cfz3RXOnT3RCzZo1AKmB6VbrJ+79m4NPP5wA/QegP/z6BwCP+PtdDtBrBvYrCoUQAIjoOxkhff9CmpmZWbNmJoCF+HZ0EiJAsCV0F5Y5AWD9vwEQADDDGMwKUKArkYhVVFRV76ipqq6qqtreVN+YSCTiiXTS9nhs/JzcvGBhoIVYcXFRSXFRfl5uIC/gybFpWt0FIvXPB0hpzQwxM9y1s3Lp0hUL5n/8yefKtWvXbtu6QwlIySAA0AFmmDgUsq+dCkS73Xrb+GNGDDpuwOAdOnbYtqSjjeu3sr0AKYWFICH5MTAOAMHZgQIICBGaAJoY0MzMzEwEIiKF1Vqt7ehpRSXlBhOWWpNvHDh0oCpZaP7ZsLQCkTFDaK1J4H8HYNGwWTNwyG9GnjWm7dOP7NuKq/ZuP7uWzy5j8Aptt/+Vz3z1ykOfP3Xt7q2rF/x39aoNn/9r8YIF7SprNr1zx7VDoRAaNGdY6ZKcaK/jjr9qzsyH+mLo/e3zVmzatFmpVIH6urqO7Xtv2LhZ+aq2t9ZbGxDzoZ0aWyxDCovXnnp1PxAiKZlZxDCVy6VgQAoWQnDJRVEUxfjxNRLReLzS17XFilQoi4qKGmz+m2/PXX/N5du3rc7PL9C8dv36LcFAr6VLl9m2/W5FZs2akXwFAyPtqOK58zY99+bqE0/tefAJHYuKvcM61z+wf+f8x0e/eXfLGdOWtnRe1cENuunuHfN2/dnvHt55hntt6PePP7l/W1//h6UO6t99xOxr3JlfeMPy1sPdmTf3Xj7c3jn+5FvvHZ2f11ku4/O5x+lYtEd+fu9CV3+Xu5x/GYS1r5eJfnvLd0yYAn82wLZgfvpi9GmiIjBQKn3F/vhPP/kk9dHY2LhrY6M/f9y7c/vgwYNvueUWy7L2QaR+/eb3vp/2u+/uOP/8yy45f/78+ffcc8+vf/2blStX7hxOItK6f/78Jd/9zqQ9d2xetnT57wdMuOKaU/78j+83b57zwtNvfPfE6667+cGnfvvKtqOO/OTfXn7C5aftrHrHW87c8fXOF0z9zvKvXPTx77zwyC3XPzz3F8dc/PZ7d1V64rFXt63f/PfnPn3z1ffdedvFH/74ijkPXvXu269WSl24rGf50j37tuxbtnzbltd//6cX3PXAky+9Yss+7amDzpJlAAAAAAAAAABQKgAAAgCz3nzD5Nyxo+RZ3nH8DTf99sTuHTseP2Xxaz9855pF5S05O3wDN952xvbNy9es3Fu2/8UDD75zzcU3nTX9/BsuveP0j7oGDf5OFUt/59q+HZuf/vc/H1izbtqspYUj0IlbXPq46K6drDbndz3+YuBH+sfvXHTOhZfnwx14/54AhAAAAAABJRU5ErkJggg==';

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
