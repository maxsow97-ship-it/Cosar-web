'use client';
import { useEffect, useState } from 'react';
import DashboardShell from '../DashboardShell';
import { EmptyState, readActivityLog } from '../shared/ui';

export default function ActiviteClient({ userName, role, serverLogs }) {
  const [localLogs, setLocalLogs] = useState([]);

  useEffect(() => {
    setLocalLogs(readActivityLog());
  }, []);

  const rows = (serverLogs && serverLogs.length > 0)
    ? serverLogs.map((l) => ({
        at: l.created_at,
        action: l.action || l.type,
        detail: l.detail || l.message || '',
        source: 'serveur',
      }))
    : localLogs.map((l) => ({ ...l, source: 'local' }));

  return (
    <DashboardShell userName={userName} role={role}>
      <div className="p-6">
        <h1 className="text-xl font-bold text-[#182038] mb-1">Journal d&apos;activité</h1>
        <p className="text-sm text-slate-500 mb-6">
          Historique des actions. Les entrées locales complètent la table Supabase <code>activity_logs</code> si elle existe.
        </p>

        {rows.length === 0 ? (
          <EmptyState
            title="Aucune activité enregistrée"
            hint="Les actions (exports, paramètres, créations) apparaîtront ici."
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Détail</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                      {r.at ? new Date(r.at).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[#182038]">{r.action}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.detail}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
