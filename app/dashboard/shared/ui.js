'use client';

/** Badges de statut COSAR (FR + couleurs) */
export const STATUS = {
  actif: { label: 'Actif', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  inactif: { label: 'Inactif', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  en_attente: { label: 'En attente', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  approuve: { label: 'Approuvé', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  refuse: { label: 'Refusé', cls: 'bg-red-50 text-red-700 border-red-200' },
  ouvert: { label: 'Ouvert', cls: 'bg-red-50 text-red-700 border-red-200' },
  en_cours: { label: 'En cours', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  resolu: { label: 'Résolu', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  ferme: { label: 'Fermé', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  paye: { label: 'Payé', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  impaye: { label: 'Impayé', cls: 'bg-red-50 text-red-700 border-red-200' },
  partiel: { label: 'Partiel', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  suspendu: { label: 'Suspendu', cls: 'bg-orange-50 text-orange-800 border-orange-200' },
  expire: { label: 'Expiré', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  brouillon: { label: 'Brouillon', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
};

export function StatusBadge({ value, map }) {
  const key = String(value || '').toLowerCase().replace(/\s+/g, '_');
  const src = map || STATUS;
  const conf = src[key] || { label: value || '—', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${conf.cls}`}>
      {conf.label}
    </span>
  );
}

export function EmptyState({ title, hint, actionLabel, onAction }) {
  return (
    <div className="text-center py-14 px-4 border border-dashed border-slate-200 rounded-xl bg-white">
      <div className="text-3xl mb-3 opacity-40">◇</div>
      <div className="font-semibold text-[#182038] text-sm">{title || 'Aucun élément'}</div>
      {hint && <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">{hint}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 bg-[#F8C018] text-[#182038] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#D9A600]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function FilterBar({ children }) {
  return (
    <div className="flex flex-wrap gap-2 items-center mb-4 p-3 bg-white border border-slate-200 rounded-xl">
      {children}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="font-semibold whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F8C018]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600 flex-1 min-w-[140px]">
      <span className="font-semibold whitespace-nowrap">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8C018]"
      />
    </label>
  );
}

/** Export CSV simple (navigateur) */
export function downloadCSV(filename, rows, columns) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => escape(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + header + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export « PDF » via impression navigateur (sans lib externe) */
export function printAsPDF(title, htmlBody) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body{font-family:system-ui,sans-serif;color:#182038;padding:24px}
      h1{font-size:18px;margin:0 0 16px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
      th{background:#f8fafc}
      .meta{color:#64748b;font-size:11px;margin-bottom:16px}
    </style></head><body>
    <h1>${title}</h1>
    <div class="meta">COSAR GROUP — ${new Date().toLocaleString('fr-FR')}</div>
    ${htmlBody}
    <script>window.onload=function(){window.print()}</script>
    </body></html>`);
  w.document.close();
}

/** Log d'activité local (complément avant table Supabase activity_logs) */
export function logActivity(action, detail) {
  try {
    const key = 'cosar_activity_log';
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    prev.unshift({ at: new Date().toISOString(), action, detail });
    localStorage.setItem(key, JSON.stringify(prev.slice(0, 200)));
  } catch (_) {}
}

export function readActivityLog() {
  try {
    return JSON.parse(localStorage.getItem('cosar_activity_log') || '[]');
  } catch (_) {
    return [];
  }
}
