'use client';
import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '../DashboardShell';
import { StatusBadge, EmptyState, FilterBar, FilterSelect, FilterInput, downloadCSV, printAsPDF, logActivity } from '../shared/ui';
import { NewAgentForm, NewSiteForm, NewK9Form, NewContractForm, NewEvaluationForm, NewSanctionForm, NewPromotionForm, NewCheckpointForm, NewStockForm, AgentDetailDrawer, EditAgentProfileForm, LeaveCalendar } from '../shared/CreateForms';
import { UserPlus, Building2, PlusCircle, FileSignature, ClipboardCheck, AlertOctagon, TrendingUp, MapPin, Package, Search, Download } from 'lucide-react';

function fmtDate(d) {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return d; }
}

const SANCTION_LABELS = {
  rappel_verbal: { label: 'Rappel verbal', cls: 'bg-stone-100 text-stone-700' },
  avertissement_ecrit: { label: 'Avertissement ecrit', cls: 'bg-amber-100 text-amber-700' },
  mise_a_pied: { label: 'Mise a pied', cls: 'bg-orange-100 text-orange-700' },
  licenciement: { label: 'Licenciement', cls: 'bg-red-100 text-red-700' },
};

export default function RHClient({ userName, role = 'admin', badges, initialAgents, initialContracts, initialSanctions, initialEvaluations, initialFormationStatus, initialLeaves, initialSites, initialPromotions, initialK9dogs }) {
  const [agents] = useState(initialAgents);
  const [contracts] = useState(initialContracts);
  const [sanctions] = useState(initialSanctions);
  const [evaluations] = useState(initialEvaluations);
  const [formationStatus] = useState(initialFormationStatus);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [sites] = useState(initialSites || []);
  const [promotions] = useState(initialPromotions || []);
  const [k9dogs] = useState(initialK9dogs || []);
  const [detailAgent, setDetailAgent] = useState(null);
  const [editAgent, setEditAgent] = useState(null);
  const [editSite, setEditSite] = useState(null);
  const [editK9, setEditK9] = useState(null);
  const [openModal, setOpenModal] = useState(null); // 'agent'|'site'|'k9'|'contrat'|'evaluation'|'sanction'|'promotion'|'checkpoint'|'stock'|null
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterSite, setFilterSite] = useState('tous');

  function refresh() {
    if (typeof window !== 'undefined') window.location.reload();
  }
  const supabase = createClient();

  const agentName = (id) => agents.find(a => a.id === id)?.nom_complet || 'Agent inconnu';

  const filteredFormationStatus = useMemo(() => {
    let list = formationStatus;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.nom_complet?.toLowerCase().includes(q) || f.matricule?.toLowerCase().includes(q));
    }
    if (filterStatut === 'actif') list = list.filter(f => agents.find(a => a.id === f.agent_id)?.actif !== false);
    if (filterStatut === 'inactif') list = list.filter(f => agents.find(a => a.id === f.agent_id)?.actif === false);
    return list;
  }, [formationStatus, search, filterStatut, agents]);

  function exportAgentsCSV() {
    downloadCSV(
      `agents_cosar_${new Date().toISOString().slice(0, 10)}.csv`,
      filteredFormationStatus,
      [
        { label: 'Nom', value: (f) => f.nom_complet },
        { label: 'Matricule', value: (f) => f.matricule || '' },
        { label: 'Statut', value: (f) => agents.find(a => a.id === f.agent_id)?.actif === false ? 'Inactif' : 'Actif' },
        { label: 'Formations', value: (f) => `${f.formations_completees}/${f.formations_totales}` },
      ]
    );
    logActivity('export_csv', 'Agents RH');
  }

  function exportAgentsPDF() {
    const rows = filteredFormationStatus.map(f => {
      const ag = agents.find(a => a.id === f.agent_id);
      return `<tr><td>${f.nom_complet || ''}</td><td>${f.matricule || ''}</td><td>${ag?.actif === false ? 'Inactif' : 'Actif'}</td><td>${f.formations_completees}/${f.formations_totales}</td></tr>`;
    }).join('');
    printAsPDF('Liste des agents COSAR', `<table><thead><tr><th>Nom</th><th>Matricule</th><th>Statut</th><th>Formations</th></tr></thead><tbody>${rows}</tbody></table>`);
    logActivity('export_pdf', 'Agents RH');
  }

  const kpis = [
    { label: 'Agents actifs', value: agents.filter(a => a.actif !== false).length },
    { label: 'Contrats actifs', value: contracts.filter(c => c.statut === 'actif').length },
    { label: 'Formation complete', value: formationStatus.filter(f => f.formation_complete).length + ' / ' + formationStatus.length },
    { label: 'Conges en attente', value: leaves.filter(l => ['demande', 'en_attente', 'pending'].includes(String(l.statut || '').toLowerCase())).length, accent: leaves.filter(l => ['demande', 'en_attente', 'pending'].includes(String(l.statut || '').toLowerCase())).length > 0 },
  ];

  async function updateLeaveStatus(id, statut) {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, statut } : l));
    await supabase.from('leaves').update({ statut }).eq('id', id);
    logActivity('conge', `Statut → ${statut}`);
  }

  const filteredContracts = useMemo(() => {
    let list = contracts;
    if (filterStatut !== 'tous') list = list.filter(c => String(c.statut || '').toLowerCase() === filterStatut);
    return list;
  }, [contracts, filterStatut]);
  const filteredSanctions = sanctions;
  const filteredEvaluations = evaluations;

  return (
    <DashboardShell userName={userName} role={role} badges={badges || {}}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold text-[#182038]">Ressources Humaines</h1>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOpenModal('agent')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#182038] text-white hover:bg-[#0f1526]"><UserPlus size={14} /> Nouvel agent</button>
            <button onClick={() => setOpenModal('contrat')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><FileSignature size={14} /> Contrat</button>
            <button onClick={() => setOpenModal('evaluation')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><ClipboardCheck size={14} /> Évaluation</button>
            <button onClick={() => setOpenModal('sanction')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><AlertOctagon size={14} /> Sanction</button>
            <button onClick={() => setOpenModal('promotion')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><TrendingUp size={14} /> Promotion</button>
            <button onClick={() => setOpenModal('site')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><Building2 size={14} /> Site</button>
            <button onClick={() => setOpenModal('checkpoint')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><MapPin size={14} /> Point de ronde</button>
            <button onClick={() => setOpenModal('k9')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><PlusCircle size={14} /> Chien K9</button>
            <button onClick={() => setOpenModal('stock')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><Package size={14} /> Article stock</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="card p-5">
              <div className={`text-3xl font-bold ${k.accent ? 'text-[#B03A2E]' : 'text-[#182038]'}`}>{k.value}</div>
              <div className="text-xs text-stone-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        <FilterBar>
          <FilterInput label="Recherche" value={search} onChange={setSearch} placeholder="Nom, matricule…" />
          <FilterSelect
            label="Statut"
            value={filterStatut}
            onChange={setFilterStatut}
            options={[
              { value: 'tous', label: 'Tous' },
              { value: 'actif', label: 'Actif' },
              { value: 'inactif', label: 'Inactif' },
            ]}
          />
          <FilterSelect
            label="Site"
            value={filterSite}
            onChange={setFilterSite}
            options={[{ value: 'tous', label: 'Tous les sites' }, ...sites.map(s => ({ value: s.id, label: s.nom }))]}
          />
          <button type="button" onClick={exportAgentsCSV} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50">Export CSV</button>
          <button type="button" onClick={exportAgentsPDF} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50">Export PDF</button>
        </FilterBar>

        {agents.length === 0 && (
          <EmptyState
            title="Aucun agent"
            hint="Créez le premier agent pour démarrer la gestion RH."
            actionLabel="Nouvel agent"
            onAction={() => setOpenModal('agent')}
          />
        )}

        <div className="card p-6">
          <h2 className="font-semibold text-[#182038] mb-4">Activité récente</h2>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {[
              ...sanctions.map(s => ({ id: 's' + s.id, date: s.created_at, text: `Sanction (${s.niveau?.replace(/_/g, ' ')}) -- ${agentName(s.agent_id)}`, color: 'text-red-600' })),
              ...promotions.map(p => ({ id: 'p' + p.id, date: p.created_at, text: `Promotion -- ${agentName(p.agent_id)} → ${p.nouveau_poste}`, color: 'text-emerald-600' })),
              ...contracts.map(c => ({ id: 'c' + c.id, date: c.created_at, text: `Contrat ${c.type?.toUpperCase()} -- ${agentName(c.agent_id)}`, color: 'text-[#2471A3]' })),
              ...evaluations.map(e => ({ id: 'e' + e.id, date: e.created_at, text: `Évaluation (${e.periode}) -- ${agentName(e.agent_id)}`, color: 'text-stone-500' })),
            ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs border-b border-stone-50 pb-1.5">
                <span className={item.color}>{item.text}</span>
                <span className="text-stone-400 shrink-0 ml-2">{fmtDate(item.date)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold text-[#182038]">Progression formation par agent (M1-M6)</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un agent..."
                       className="text-xs border border-stone-200 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-stone-400 w-48" />
              </div>
              <button onClick={exportAgentsCSV} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50">
                <Download size={13} /> CSV
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {filteredFormationStatus.map(f => (
              <div key={f.agent_id} className="flex items-center justify-between text-sm border-b border-stone-100 pb-2">
                <button onClick={() => setDetailAgent(agents.find(a => a.id === f.agent_id) || { id: f.agent_id, nom_complet: f.nom_complet, matricule: f.matricule })}
                        className="font-medium text-[#182038] hover:underline hover:text-[#F8C018] text-left">
                  {f.nom_complet} {f.matricule ? `(${f.matricule})` : ''}
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#F8C018]" style={{ width: `${(f.formations_completees / (f.formations_totales || 1)) * 100}%` }} />
                  </div>
                  <span className={`text-xs font-semibold ${f.formation_complete ? 'text-emerald-600' : 'text-stone-500'}`}>
                    {f.formations_completees}/{f.formations_totales}
                  </span>
                </div>
              </div>
            ))}
            {filteredFormationStatus.length === 0 && <p className="text-sm text-stone-400">Aucun agent trouvé.</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Contrats</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredContracts.map(c => (
                <div key={c.id} className="text-sm border-b border-stone-100 pb-2">
                  <div className="font-medium text-[#182038]">{agentName(c.agent_id)} -- {c.type?.toUpperCase()}</div>
                  <div className="text-xs text-stone-500">Du {fmtDate(c.date_debut)} {c.date_fin ? `au ${fmtDate(c.date_fin)}` : '(en cours)'} -- {c.statut}</div>
                </div>
              ))}
              {filteredContracts.length === 0 && <p className="text-sm text-stone-400">Aucun contrat.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Sanctions</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredSanctions.map(s => {
                const lbl = SANCTION_LABELS[s.niveau] || { label: s.niveau, cls: 'bg-stone-100 text-stone-700' };
                return (
                  <div key={s.id} className="text-sm border-b border-stone-100 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#182038]">{agentName(s.agent_id)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${lbl.cls}`}>{lbl.label}</span>
                    </div>
                    <div className="text-xs text-stone-500">{s.motif} -- {fmtDate(s.date_sanction)}</div>
                  </div>
                );
              })}
              {filteredSanctions.length === 0 && <p className="text-sm text-stone-400">Aucune sanction.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Evaluations semestrielles</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredEvaluations.map(e => {
                const total = (e.score_assiduite || 0) + (e.score_consignes || 0) + (e.score_ecrits || 0) + (e.score_presentation || 0) + (e.score_relation_client || 0);
                return (
                  <div key={e.id} className="text-sm border-b border-stone-100 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#182038]">{agentName(e.agent_id)}</span>
                      <span className="text-xs font-semibold text-[#182038]">{total}/20</span>
                    </div>
                    <div className="text-xs text-stone-500">{e.periode}</div>
                  </div>
                );
              })}
              {filteredEvaluations.length === 0 && <p className="text-sm text-stone-400">Aucune evaluation.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Calendrier des congés</h2>
            <LeaveCalendar leaves={leaves} agents={agents} />
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Demandes de conge</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {leaves.map(l => (
                <div key={l.id} className="text-sm border-b border-stone-100 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#182038]">{agentName(l.agent_id)}</span>
                    {l.statut === 'demande' ? (
                      <div className="flex gap-1">
                        <button onClick={() => updateLeaveStatus(l.id, 'valide')} className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Valider</button>
                        <button onClick={() => updateLeaveStatus(l.id, 'refuse')} className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200">Refuser</button>
                      </div>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${l.statut === 'valide' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{l.statut}</span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500">{l.type} -- du {fmtDate(l.date_debut)} au {fmtDate(l.date_fin)}</div>
                </div>
              ))}
              {leaves.length === 0 && <p className="text-sm text-stone-400">Aucune demande de conge.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Promotions</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {promotions.map(p => (
                <div key={p.id} className="text-sm border-b border-stone-100 pb-2">
                  <div className="font-medium text-[#182038]">{agentName(p.agent_id)}</div>
                  <div className="text-xs text-stone-500">{p.ancien_poste ? `${p.ancien_poste} → ` : ''}{p.nouveau_poste} -- {fmtDate(p.date_effet)}</div>
                </div>
              ))}
              {promotions.length === 0 && <p className="text-sm text-stone-400">Aucune promotion enregistrée.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Sites ({sites.length})</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sites.map(s => (
                <button key={s.id} onClick={() => setEditSite(s)} className="w-full text-left text-sm border-b border-stone-100 pb-2 hover:bg-stone-50 -mx-1 px-1 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#182038]">{s.nom}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.statut === 'inactif' ? 'bg-stone-100 text-stone-500' : 'bg-emerald-100 text-emerald-700'}`}>{s.statut === 'inactif' ? 'Archivé' : 'Actif'}</span>
                  </div>
                  <div className="text-xs text-stone-500">{s.client_nom || 'Sans client'}</div>
                </button>
              ))}
              {sites.length === 0 && <p className="text-sm text-stone-400">Aucun site enregistré.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Chiens K9 ({k9dogs.length})</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {k9dogs.map(d => (
                <button key={d.id} onClick={() => setEditK9(d)} className="w-full text-left text-sm border-b border-stone-100 pb-2 hover:bg-stone-50 -mx-1 px-1 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#182038]">{d.nom}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{d.statut}</span>
                  </div>
                  <div className="text-xs text-stone-500">{d.race || 'Race non renseignée'} {d.specialite ? `-- ${d.specialite}` : ''}</div>
                </button>
              ))}
              {k9dogs.length === 0 && <p className="text-sm text-stone-400">Aucun chien enregistré.</p>}
            </div>
          </div>
        </div>
      </div>

      {openModal === 'agent' && <NewAgentForm onClose={() => setOpenModal(null)} onCreated={refresh} />}
      {openModal === 'site' && <NewSiteForm onClose={() => setOpenModal(null)} onCreated={refresh} superviseurs={agents} />}
      {openModal === 'k9' && <NewK9Form onClose={() => setOpenModal(null)} onCreated={refresh} agents={agents} />}
      {openModal === 'contrat' && <NewContractForm onClose={() => setOpenModal(null)} onCreated={refresh} agents={agents} />}
      {openModal === 'evaluation' && <NewEvaluationForm onClose={() => setOpenModal(null)} onCreated={refresh} agents={agents} />}
      {openModal === 'sanction' && <NewSanctionForm onClose={() => setOpenModal(null)} onCreated={refresh} agents={agents} />}
      {openModal === 'promotion' && <NewPromotionForm onClose={() => setOpenModal(null)} onCreated={refresh} agents={agents} />}
      {openModal === 'checkpoint' && <NewCheckpointForm onClose={() => setOpenModal(null)} onCreated={refresh} sites={sites} />}
      {openModal === 'stock' && <NewStockForm onClose={() => setOpenModal(null)} onCreated={refresh} sites={sites} />}

      {detailAgent && (
        <AgentDetailDrawer
          agent={detailAgent}
          onClose={() => setDetailAgent(null)}
          contracts={contracts}
          evaluations={evaluations}
          sanctions={sanctions}
          formationStatus={formationStatus.find(f => f.agent_id === detailAgent.id)}
          onEdit={(a) => { setEditAgent(a); setDetailAgent(null); }}
        />
      )}
      {editAgent && (
        <EditAgentProfileForm
          record={editAgent}
          onClose={() => setEditAgent(null)}
          onCreated={refresh}
        />
      )}
      {editSite && <NewSiteForm record={editSite} onClose={() => setEditSite(null)} onCreated={refresh} superviseurs={agents} />}
      {editK9 && <NewK9Form record={editK9} onClose={() => setEditK9(null)} onCreated={refresh} agents={agents} />}
    </DashboardShell>
  );
}
