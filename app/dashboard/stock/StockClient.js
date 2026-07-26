'use client';
import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

const TYPES = {
  camera: '📹 Caméra', gps_collier: '📡 Collier GPS', gps_vehicule: '🚗 GPS Véhicule',
  alarme: '🔔 Alarme', controle_acces: '🚪 Contrôle d\'accès', radio: '📻 Radio',
  uniforme: '👔 Uniforme', autre: '📦 Autre',
};
const STATUTS = {
  disponible: { label: 'Disponible', cls: 'bg-emerald-100 text-emerald-700' },
  en_service: { label: 'En service', cls: 'bg-blue-100 text-blue-700' },
  maintenance: { label: 'Maintenance', cls: 'bg-amber-100 text-amber-700' },
  hors_service: { label: 'Hors service', cls: 'bg-red-100 text-red-700' },
};

function fmtFCFA(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';
}

export default function StockClient({ userName, initialStock, initialSites }) {
  const [stock, setStock] = useState(initialStock);
  const [sites] = useState(initialSites);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const supabase = createClient();

  const siteName = (id) => sites.find(s => s.id === id)?.nom || null;

  const [form, setForm] = useState({
    nom: '', type: 'camera', reference: '', quantite_totale: 1, quantite_disponible: 1,
    site_id: '', prix_unitaire: '', fournisseur: '', notes: '',
  });

  async function createItem(e) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setBusy(true);
    const payload = {
      ...form,
      quantite_totale: parseInt(form.quantite_totale) || 1,
      quantite_disponible: parseInt(form.quantite_disponible) || 1,
      prix_unitaire: form.prix_unitaire ? parseFloat(form.prix_unitaire) : 0,
      site_id: form.site_id || null,
      reference: form.reference.trim() || null,
    };
    const { data, error } = await supabase.from('materiel_stock').insert(payload).select().single();
    setBusy(false);
    if (!error && data) {
      setStock(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ nom: '', type: 'camera', reference: '', quantite_totale: 1, quantite_disponible: 1, site_id: '', prix_unitaire: '', fournisseur: '', notes: '' });
    } else {
      alert("Erreur : " + (error?.message || 'inconnue') + (error?.message?.includes('reference') ? ' (cette référence existe déjà)' : ''));
    }
  }

  async function updateStatut(id, statut) {
    setStock(prev => prev.map(s => s.id === id ? { ...s, statut } : s));
    await supabase.from('materiel_stock').update({ statut }).eq('id', id);
  }

  async function deleteItem(id) {
    if (!confirm('Supprimer cet article du stock ?')) return;
    const { error } = await supabase.from('materiel_stock').delete().eq('id', id);
    if (!error) setStock(prev => prev.filter(s => s.id !== id));
  }

  const filtered = useMemo(() => filterType === 'all' ? stock : stock.filter(s => s.type === filterType), [stock, filterType]);

  const kpis = useMemo(() => {
    const total = stock.reduce((sum, s) => sum + (s.quantite_totale || 0), 0);
    const dispo = stock.reduce((sum, s) => sum + (s.quantite_disponible || 0), 0);
    const maintenance = stock.filter(s => s.statut === 'maintenance').length;
    const valeur = stock.reduce((sum, s) => sum + (s.prix_unitaire || 0) * (s.quantite_totale || 0), 0);
    return { total, dispo, maintenance, valeur };
  }, [stock]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-[#182038] to-[#10182C] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg"><span className="text-[#2471A3]">COSAR</span> ONE — Stock & Matériel</div>
          <div className="text-xs text-slate-300">Connecté : {userName}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <a href="/dashboard" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Devis &amp; Leads</a>
          <a href="/dashboard/operations" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Centre Opérationnel</a>
          <a href="/dashboard/track" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">COSAR TRACK</a>
          <a href="/dashboard/sites" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Sites &amp; Rondes</a>
          <a href="/dashboard/catalogue" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Catalogue &amp; Factures</a>
          <a href="/dashboard/k9" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Registre K9</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5"><div className="text-3xl font-bold text-[#182038]">{kpis.total}</div><div className="text-xs text-slate-500 mt-1">Articles au total</div></div>
          <div className="card p-5"><div className="text-3xl font-bold text-emerald-600">{kpis.dispo}</div><div className="text-xs text-slate-500 mt-1">Disponibles</div></div>
          <div className="card p-5"><div className={`text-3xl font-bold ${kpis.maintenance > 0 ? 'text-amber-600' : 'text-[#182038]'}`}>{kpis.maintenance}</div><div className="text-xs text-slate-500 mt-1">En maintenance</div></div>
          <div className="card p-5"><div className="text-2xl font-bold text-[#182038]">{fmtFCFA(kpis.valeur)}</div><div className="text-xs text-slate-500 mt-1">Valeur totale</div></div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="all">Tous les types</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)} className="btn-gold">
            {showForm ? 'Annuler' : '+ Ajouter du matériel'}
          </button>
        </div>

        {showForm && (
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Nouvel article</h2>
            <form onSubmit={createItem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input placeholder="Nom (ex: Caméra dôme HD)" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2" required />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input placeholder="Référence (optionnel)" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />

              <input placeholder="Quantité totale" type="number" min="1" value={form.quantite_totale} onChange={e => setForm({ ...form, quantite_totale: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Quantité disponible" type="number" min="0" value={form.quantite_disponible} onChange={e => setForm({ ...form, quantite_disponible: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <select value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">— Aucun site —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
              <input placeholder="Prix unitaire (FCFA)" type="number" value={form.prix_unitaire} onChange={e => setForm({ ...form, prix_unitaire: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />

              <input placeholder="Fournisseur (optionnel)" value={form.fournisseur} onChange={e => setForm({ ...form, fournisseur: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2" />
              <input placeholder="Notes (optionnel)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2" />

              <button disabled={busy} className="btn-gold justify-center disabled:opacity-60 md:col-span-4">Enregistrer</button>
            </form>
          </div>
        )}

        <div className="card p-6">
          <h2 className="font-semibold text-[#182038] mb-4">Inventaire ({filtered.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Nom</th>
                  <th className="py-2 pr-3">Réf.</th>
                  <th className="py-2 pr-3">Qté (dispo/total)</th>
                  <th className="py-2 pr-3">Site</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 pr-3">{TYPES[s.type]}</td>
                    <td className="py-2.5 pr-3 font-medium text-[#182038]">{s.nom}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{s.reference || '—'}</td>
                    <td className="py-2.5 pr-3">
                      <span className={s.quantite_disponible === 0 ? 'text-red-600 font-semibold' : ''}>{s.quantite_disponible}</span> / {s.quantite_totale}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{siteName(s.site_id) || '—'}</td>
                    <td className="py-2.5 pr-3">
                      <select value={s.statut || 'disponible'} onChange={e => updateStatut(s.id, e.target.value)} className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${STATUTS[s.statut || 'disponible'].cls}`}>
                        {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="py-2.5 pr-3"><button onClick={() => deleteItem(s.id)} className="text-xs text-red-500 hover:underline">Supprimer</button></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400">Aucun article pour l&apos;instant.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
