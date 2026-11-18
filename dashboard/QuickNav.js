'use client';

const ITEMS = [
  { href: '/dashboard', icon: '📃', label: 'Devis & Leads', bg: '#F8C018' },
  { href: '/dashboard/operations', icon: '📡', label: 'Centre Opérationnel', bg: '#182038' },
  { href: '/dashboard/track', icon: '📍', label: 'COSAR TRACK', bg: '#2471A3' },
  { href: '/dashboard/sites', icon: '🛡️', label: 'Sites & Rondes', bg: '#182038' },
  { href: '/dashboard/catalogue', icon: '🧾', label: 'Catalogue & Factures', bg: '#F8C018' },
  { href: '/dashboard/k9', icon: '🐾', label: 'Registre K9', bg: '#B03A2E' },
  { href: '/dashboard/stock', icon: '📦', label: 'Stock & Matériel', bg: '#2471A3' },
];

export default function QuickNav({ current }) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 overflow-x-auto">
      <div className="flex items-center gap-4 md:gap-6 w-max mx-auto">
        {ITEMS.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className={`flex flex-col items-center gap-1 shrink-0 transition-opacity ${current === s.href ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-sm"
              style={{ backgroundColor: s.bg, boxShadow: current === s.href ? '0 0 0 2px #F8C018' : undefined }}
            >
              {s.icon}
            </div>
            <span className="text-[10px] text-center text-[#182038] font-medium leading-tight max-w-[68px]">{s.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
