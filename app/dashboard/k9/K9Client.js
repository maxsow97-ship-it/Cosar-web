'use client';
import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

const SPECIALITES = { detection: 'Détection', patrouille: 'Patrouille', dissuasion: 'Dissuasion', polyvalent: 'Polyvalent' };
const STATUTS = {
  actif: { label: 'Actif', cls: 'bg-emerald-100 text-emerald-700' },
  repos: { label: 'Repos', cls: 'bg-slate-100 text-slate-600' },
  formation: { label: 'Formation', cls: 'bg-blue-100 text-blue-700' },
  retraite: { label: 'Retraite', cls: 'bg-amber-100 text-amber-700' },
};

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📃', label: 'Devis & Leads', bg: '#F8C018' },
  { href: '/dashboard/operations', icon: '📡', label: 'Centre Opérationnel', bg: '#182038' },
  { href: '/dashboard/track', icon: '📍', label: 'COSAR TRACK', bg: '#2471A3' },
  { href: '/dashboard/sites', icon: '🛡️', label: 'Sites & Rondes', bg: '#182038' },
  { href: '/dashboard/catalogue', icon: '🧾', label: 'Catalogue & Factures', bg: '#F8C018' },
  { href: '/dashboard/k9', icon: '🐾', label: 'Registre K9', bg: '#B03A2E' },
  { href: '/dashboard/stock', icon: '📦', label: 'Stock & Matériel', bg: '#2471A3' },
];

function QuickNav({ current }) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 overflow-x-auto">
      <div className="flex gap-4 w-max mx-auto md:justify-center">
        {NAV_ITEMS.map((item) => (
          <a key={item.href} href={item.href} className={`flex flex-col items-center gap-1 shrink-0 ${current === item.href ? '' : 'opacity-70 hover:opacity-100'} transition-opacity`}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: item.bg, boxShadow: current === item.href ? '0 0 0 2px #F8C018' : 'none' }}>
              {item.icon}
            </div>
            <span className="text-[10px] text-slate-600 font-medium text-center leading-tight w-14">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return iso; }
}
function ageFromBirth(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const years = diff / (365.25 * 24 * 3600 * 1000);
  return years < 1 ? Math.round(years * 12) + ' mois' : Math.floor(years) + ' an' + (Math.floor(years) > 1 ? 's' : '');
}
function vetDue(iso) {
  if (!iso) return null;
  const days = Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: 'En retard', cls: 'bg-red-100 text-red-700' };
  if (days <= 14) return { label: 'Bientôt', cls: 'bg-amber-100 text-amber-700' };
  return null;
}

export default function K9Client({ userName, initialDogs, initialAgents }) {
  const [dogs, setDogs] = useState(initialDogs);
  const [agents] = useState(initialAgents);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const agentName = (id) => agents.find(a => a.id === id)?.nom_complet || null;

  const [form, setForm] = useState({
    nom: '', race: '', date_naissance: '', specialite: 'polyvalent', agent_referent_id: '',
    derniere_visite_veto: '', prochaine_visite_veto: '', certifications: '', notes: '',
  });

  async function createDog(e) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setBusy(true);
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    const { data, error } = await supabase.from('k9_dogs').insert(payload).select().single();
    setBusy(false);
    if (!error && data) {
      setDogs(prev => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)));
      setShowForm(false);
      setForm({ nom: '', race: '', date_naissance: '', specialite: 'polyvalent', agent_referent_id: '', derniere_visite_veto: '', prochaine_visite_veto: '', certifications: '', notes: '' });
    } else {
      alert("Erreur lors de l'ajout.");
    }
  }

  async function updateStatut(id, statut) {
    setDogs(prev => prev.map(d => d.id === id ? { ...d, statut } : d));
    await supabase.from('k9_dogs').update({ statut }).eq('id', id);
  }

  const alertesVeto = useMemo(() => dogs.filter(d => vetDue(d.prochaine_visite_veto)), [dogs]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-[#182038] to-[#10182C] text-white px-6 py-4">
        <div className="font-bold text-lg"><span className="text-[#B03A2E]">COSAR</span> K9 — Registre</div>
        <div className="text-xs text-slate-300">Connecté : {userName}</div>
      </header>

      <QuickNav current="/dashboard/k9" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {alertesVeto.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="font-semibold text-amber-800 text-sm mb-1">Visites vétérinaires à prévoir</div>
            <div className="text-sm text-amber-700">
              {alertesVeto.map(d => d.nom).join(', ')} — vérifier le calendrier.
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={() => setShowForm(!showForm)} className="btn-gold">
            {showForm ? 'Annuler' : '+ Ajouter un chien'}
          </button>
        </div>

        {showForm && (
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Nouveau chien</h2>
            <form onSubmit={createDog} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input placeholder="Nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              <input placeholder="Race" value={form.race} onChange={e => setForm({ ...form, race: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <select value={form.specialite} onChange={e => setForm({ ...form, specialite: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(SPECIALITES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>

              <div>
                <label className="text-xs text-slate-500">Date de naissance</label>
                <input type="date" value={form.date_naissance} onChange={e => setForm({ ...form, date_naissance: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Agent référent (maître-chien)</label>
                <select value={form.agent_referent_id} onChange={e => setForm({ ...form, agent_referent_id: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1">
                  <option value="">— Aucun —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.nom_complet}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Prochaine visite vétérinaire</label>
                <input type="date" value={form.prochaine_visite_veto} onChange={e => setForm({ ...form, prochaine_visite_veto: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1" />
              </div>

              <input placeholder="Certifications (ex: détection explosifs 2025)" value={form.certifications} onChange={e => setForm({ ...form, certifications: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-3" />
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-3" />

              <button disabled={busy} className="btn-gold justify-center disabled:opacity-60 md:col-span-3">Enregistrer</button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dogs.map(d => {
            const st = STATUTS[d.statut || 'actif'];
            const veto = vetDue(d.prochaine_visite_veto);
            const age = ageFromBirth(d.date_naissance);
            return (
              <div key={d.id} className="card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-[#182038] text-lg">{d.nom}</div>
                    <div className="text-xs text-slate-500">{d.race || 'Race non précisée'} {age && `· ${age}`}</div>
                  </div>
                  <select value={d.statut || 'actif'} onChange={e => updateStatut(d.id, e.target.value)} className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${st.cls}`}>
                    {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="text-xs text-slate-500 mb-2">
                  <span className="inline-block bg-slate-100 rounded-full px-2 py-0.5 mr-1">{SPECIALITES[d.specialite] || d.specialite}</span>
                </div>
                {agentName(d.agent_referent_id) && (
                  <div className="text-sm text-slate-600 mb-1">Maître-chien : <span className="font-medium text-[#182038]">{agentName(d.agent_referent_id)}</span></div>
                )}
                {d.certifications && <div className="text-xs text-slate-500 mb-1">🎓 {d.certifications}</div>}
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="text-slate-500">Prochaine visite véto : {fmtDate(d.prochaine_visite_veto)}</span>
                  {veto && <span className={`px-2 py-0.5 rounded-full font-semibold ${veto.cls}`}>{veto.label}</span>}
                </div>
                {d.notes && <div className="text-xs text-slate-400 mt-2 italic">{d.notes}</div>}
              </div>
            );
          })}
          {dogs.length === 0 && <p className="text-sm text-slate-400 col-span-full">Aucun chien enregistré pour l&apos;instant.</p>}
        </div>
      </main>
    </div>
  );
}
