'use client';
import { useState } from 'react';
import DashboardShell from '../DashboardShell';
import { StatusBadge, EmptyState, FilterBar, FilterSelect, FilterInput, downloadCSV, printAsPDF, logActivity } from '../shared/ui';
import { NewLeaveRequestForm } from '../shared/CreateForms';
import { CalendarPlus, CheckCircle2 } from 'lucide-react';

const NAVY = '#182038';

function fmtDate(d) {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return d; }
}

const STATUT_CONGE = {
  demande: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  valide: { label: 'Validé', cls: 'bg-emerald-100 text-emerald-700' },
  refuse: { label: 'Refusé', cls: 'bg-red-100 text-red-700' },
};

export default function MonEspaceClient({ userName, role = 'agent', badges, contract, evaluations, sanctions, leaves, formationStatus }) {
  const [leaveList, setLeaveList] = useState(leaves || []);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  function refresh() {
    if (typeof window !== 'undefined') window.location.reload();
  }

  const progression = formationStatus ? Math.round((formationStatus.formations_completees / (formationStatus.formations_totales || 1)) * 100) : 0;

  return (
    <DashboardShell userName={userName} role={role} badges={badges || {}}>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-xl font-bold text-[#182038]">Mon espace</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="text-xs text-stone-500 mb-1">Mon contrat</div>
            {contract ? (
              <>
                <div className="text-lg font-bold" style={{ color: NAVY }}>{contract.type?.toUpperCase()}</div>
                <div className="text-xs text-stone-500 mt-1">Depuis le {fmtDate(contract.date_debut)} -- {contract.statut}</div>
              </>
            ) : <div className="text-sm text-stone-400">Aucun contrat enregistré.</div>}
          </div>
          <div className="card p-5">
            <div className="text-xs text-stone-500 mb-1">Formation (M1-M6)</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#F8C018]" style={{ width: `${progression}%` }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: NAVY }}>{progression}%</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#182038]">Mes congés</h2>
            <button onClick={() => setShowLeaveForm(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#182038] text-white hover:bg-[#0f1526]">
              <CalendarPlus size={14} /> Demander un congé
            </button>
          </div>
          <div className="space-y-2">
            {leaveList.map(l => {
              const st = STATUT_CONGE[l.statut] || { label: l.statut, cls: 'bg-stone-100 text-stone-600' };
              return (
                <div key={l.id} className="flex items-center justify-between text-sm border-b border-stone-100 pb-2">
                  <div>
                    <div className="font-medium text-[#182038]">{l.type}</div>
                    <div className="text-xs text-stone-500">du {fmtDate(l.date_debut)} au {fmtDate(l.date_fin)}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
            {leaveList.length === 0 && <p className="text-sm text-stone-400">Aucune demande de congé.</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Mes évaluations</h2>
            <div className="space-y-2">
              {(evaluations || []).map(e => {
                const total = (e.score_assiduite || 0) + (e.score_consignes || 0) + (e.score_ecrits || 0) + (e.score_presentation || 0) + (e.score_relation_client || 0);
                return (
                  <div key={e.id} className="text-sm border-b border-stone-100 pb-2 flex items-center justify-between">
                    <span>{e.periode}</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{total}/20</span>
                  </div>
                );
              })}
              {(!evaluations || evaluations.length === 0) && <p className="text-sm text-stone-400">Aucune évaluation.</p>}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Mon dossier disciplinaire</h2>
            <div className="space-y-2">
              {(sanctions || []).map(s => (
                <div key={s.id} className="text-sm border-b border-stone-100 pb-2">
                  <div className="font-medium text-[#182038]">{s.niveau?.replace('_', ' ')}</div>
                  <div className="text-xs text-stone-500">{fmtDate(s.date_sanction)}</div>
                </div>
              ))}
              {(!sanctions || sanctions.length === 0) && (
                <p className="text-sm text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={14} /> Aucune sanction -- dossier vierge.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showLeaveForm && (
        <NewLeaveRequestForm
          onClose={() => setShowLeaveForm(false)}
          onCreated={refresh}
        />
      )}
    </DashboardShell>
  );
}
