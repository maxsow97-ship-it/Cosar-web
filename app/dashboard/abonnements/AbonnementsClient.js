'use client';
import { useState, useMemo } from 'react';
import DashboardShell from '../DashboardShell';
import { StatusBadge, EmptyState, FilterBar, FilterSelect, FilterInput, downloadCSV, printAsPDF, logActivity } from '../shared/ui';
import { NewSubscriptionForm, NewCrmContractForm } from '../shared/CreateForms';
import { PlusCircle, FileText } from 'lucide-react';

function fmtDate(d) {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return d; }
}
function fmtFCFA(n) {
  return (n || 0).toLocaleString('fr-FR') + ' FCFA';
}

const TYPE_LABELS = {
  telesurveillance: 'Telesurveillance',
  tracking_flotte: 'Tracking flotte',
  maintenance_preventive: 'Maintenance preventive',
  cosar_one_premium: 'COSAR ONE Premium',
};
const METHODE_LABELS = {
  wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money',
  carte: 'Carte', banque: 'Virement bancaire', especes: 'Especes',
};

export default function AbonnementsClient({ userName, role = 'admin', badges, initialSubscriptions, initialPayments, initialClients, initialSites, initialCrmContracts }) {
  const [subscriptions] = useState(initialSubscriptions);
  const [payments] = useState(initialPayments);
  const [clients] = useState(initialClients);
  const [sites] = useState(initialSites || []);
  const [crmContracts] = useState(initialCrmContracts || []);
  const [openModal, setOpenModal] = useState(null);
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterSite, setFilterSite] = useState('tous');

  function refresh() {
    if (typeof window !== 'undefined') window.location.reload();
  }

  const clientName = (id) => clients.find(c => c.id === id)?.nom_complet || 'Client inconnu';

  const filteredSubs = useMemo(() => {
    let list = subscriptions;
    if (filterStatut !== 'tous') list = list.filter(s => String(s.statut || '').toLowerCase() === filterStatut);
    if (filterSite !== 'tous') list = list.filter(s => s.site_id === filterSite);
    return list;
  }, [subscriptions, filterStatut, filterSite]);

  const revenuMensuelRecurrent = useMemo(() =>
    subscriptions.filter(s => s.statut === 'actif').reduce((sum, s) => sum + (s.montant_mensuel || 0), 0),
  [subscriptions]);

  function exportSubsPDF() {
    const rows = filteredSubs.map(s =>
      `<tr><td>${clientName(s.client_id)}</td><td>${s.plan || s.type || ''}</td><td>${s.statut || ''}</td><td>${s.montant_mensuel || 0}</td></tr>`
    ).join('');
    printAsPDF('Abonnements COSAR', `<table><thead><tr><th>Client</th><th>Plan</th><th>Statut</th><th>Montant</th></tr></thead><tbody>${rows}</tbody></table>`);
    logActivity('export_pdf', 'Abonnements');
  }

  const kpis = [
    { label: 'Abonnements actifs', value: subscriptions.filter(s => s.statut === 'actif').length },
    { label: 'Revenu mensuel recurrent (MRR)', value: fmtFCFA(revenuMensuelRecurrent) },
    { label: 'Paiements en attente', value: payments.filter(p => p.statut === 'en_attente').length, accent: payments.filter(p => p.statut === 'en_attente').length > 0 },
    { label: 'Paiements ce mois', value: payments.filter(p => p.statut === 'complete' && new Date(p.date_paiement).getMonth() === new Date().getMonth()).length },
  ];

  return (
    <DashboardShell userName={userName} role={role} badges={badges || {}}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold text-[#182038]">Abonnements &amp; Facturation</h1>
          <div className="flex gap-2">
            <button onClick={() => setOpenModal('subscription')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#182038] text-white hover:bg-[#0f1526]"><PlusCircle size={14} /> Nouvel abonnement</button>
            <button onClick={() => setOpenModal('crmcontract')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><FileText size={14} /> Contrat commercial</button>
            <button onClick={exportSubsPDF} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50">Export PDF</button>
          </div>
        </div>

        <FilterBar>
          <FilterSelect label="Statut" value={filterStatut} onChange={setFilterStatut} options={[
            { value: 'tous', label: 'Tous' },
            { value: 'actif', label: 'Actif' },
            { value: 'suspendu', label: 'Suspendu' },
            { value: 'expire', label: 'Expiré' },
          ]} />
          <FilterSelect label="Site" value={filterSite} onChange={setFilterSite} options={[
            { value: 'tous', label: 'Tous les sites' },
            ...sites.map(s => ({ value: s.id, label: s.nom })),
          ]} />
        </FilterBar>

        {subscriptions.length === 0 && (
          <EmptyState
            title="Aucun abonnement"
            hint="Créez un abonnement client pour démarrer la facturation."
            actionLabel="Nouvel abonnement"
            onAction={() => setOpenModal('subscription')}
          />
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="card p-5">
              <div className={`text-2xl font-bold ${k.accent ? 'text-[#B03A2E]' : 'text-[#182038]'}`}>{k.value}</div>
              <div className="text-xs text-stone-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Abonnements</h2>
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {subscriptions.map(s => (
                <div key={s.id} className="text-sm border-b border-stone-100 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#182038]">{clientName(s.client_id)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : s.statut === 'suspendu' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
                      {s.statut}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500">
                    {TYPE_LABELS[s.type_abonnement] || s.type_abonnement} -- {fmtFCFA(s.montant_mensuel)}/mois -- depuis {fmtDate(s.date_debut)}
                  </div>
                </div>
              ))}
              {subscriptions.length === 0 && <p className="text-sm text-stone-400">Aucun abonnement enregistre.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Paiements recents</h2>
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {payments.map(p => (
                <div key={p.id} className="text-sm border-b border-stone-100 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#182038]">{clientName(p.client_id)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.statut === 'complete' ? 'bg-emerald-100 text-emerald-700' : p.statut === 'en_attente' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {p.statut}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500">
                    {fmtFCFA(p.montant)} -- {METHODE_LABELS[p.methode] || p.methode} -- {fmtDate(p.date_paiement)}
                  </div>
                </div>
              ))}
              {payments.length === 0 && <p className="text-sm text-stone-400">Aucun paiement enregistre.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Contrats commerciaux</h2>
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {crmContracts.map(c => (
                <div key={c.id} className="text-sm border-b border-stone-100 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#182038]">{c.client_nom}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>{c.statut}</span>
                  </div>
                  <div className="text-xs text-stone-500">{c.type_prestation} -- depuis {fmtDate(c.date_debut)}</div>
                </div>
              ))}
              {crmContracts.length === 0 && <p className="text-sm text-stone-400">Aucun contrat commercial enregistré.</p>}
            </div>
          </div>
        </div>
      </div>

      {openModal === 'subscription' && <NewSubscriptionForm onClose={() => setOpenModal(null)} onCreated={refresh} sites={sites} clients={clients} />}
      {openModal === 'crmcontract' && <NewCrmContractForm onClose={() => setOpenModal(null)} onCreated={refresh} />}
    </DashboardShell>
  );
}
