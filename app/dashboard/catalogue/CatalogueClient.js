'use client';
import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

const FILIALES = { securite: 'Sécurité', k9: 'K9', tech: 'Tech', investigation: 'Investigation', track: 'Track' };
const UNITES = { heure: '/heure', jour: '/jour', mois: '/mois', mission: '/mission', forfait: 'forfait' };
const STATUT_FACTURE = {
  brouillon: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600' },
  envoyee: { label: 'Envoyée', cls: 'bg-blue-100 text-blue-700' },
  payee: { label: 'Payée', cls: 'bg-emerald-100 text-emerald-700' },
  impayee: { label: 'Impayée', cls: 'bg-red-100 text-red-700' },
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
    <div className="bg-white border-b border-slate-200 px-4 py-3 overflow-x-auto print:hidden">
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

function fmtFCFA(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return iso; }
}

export default function CatalogueClient({ userName, initialServices, initialInvoices, initialDevis }) {
  const [tab, setTab] = useState('services');
  const [services, setServices] = useState(initialServices);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [devis] = useState(initialDevis);
  const supabase = createClient();

  const [newService, setNewService] = useState({ nom: '', filiale: 'securite', prix_ht: '', unite: 'mois', description: '' });
  const [busy, setBusy] = useState(false);

  async function createService(e) {
    e.preventDefault();
    if (!newService.nom.trim() || !newService.prix_ht) return;
    setBusy(true);
    const { data, error } = await supabase.from('service_catalog').insert({
      ...newService, prix_ht: parseFloat(newService.prix_ht),
    }).select().single();
    setBusy(false);
    if (!error && data) {
      setServices(prev => [...prev, data]);
      setNewService({ nom: '', filiale: 'securite', prix_ht: '', unite: 'mois', description: '' });
    }
  }

  async function toggleService(id, actif) {
    setServices(prev => prev.map(s => s.id === id ? { ...s, actif: !actif } : s));
    await supabase.from('service_catalog').update({ actif: !actif }).eq('id', id);
  }

  const [selectedDevis, setSelectedDevis] = useState('');
  const [clientNom, setClientNom] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientTel, setClientTel] = useState('');
  const [lignes, setLignes] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  function pickDevis(id) {
    setSelectedDevis(id);
    const d = devis.find(x => String(x.id) === String(id));
    if (d) { setClientNom(d.nom || ''); setClientEmail(d.email || ''); setClientTel(d.telephone || ''); }
  }

  function addLigne(service) {
    setLignes(prev => [...prev, { service_id: service.id, nom: service.nom, quantite: 1, prix_unitaire_ht: service.prix_ht }]);
  }
  function updateLigneQte(idx, qte) {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, quantite: qte } : l));
  }
  function removeLigne(idx) {
    setLignes(prev => prev.filter((_, i) => i !== idx));
  }

  const totalHT = useMemo(() => lignes.reduce((sum, l) => sum + (l.quantite * l.prix_unitaire_ht), 0), [lignes]);
  const totalTTC = useMemo(() => totalHT * 1.18, [totalHT]);

  async function createInvoice(e) {
    e.preventDefault();
    if (!clientNom.trim() || lignes.length === 0) return;
    setBusy(true);
    const lignesCalc = lignes.map(l => ({ ...l, total_ht: l.quantite * l.prix_unitaire_ht }));
    const { data, error } = await supabase.from('invoices').insert({
      devis_id: selectedDevis || null,
      client_nom: clientNom, client_email: clientEmail, client_telephone: clientTel,
      lignes: lignesCalc, total_ht: totalHT, total_ttc: totalTTC,
    }).select().single();
    setBusy(false);
    if (!error && data) {
      setInvoices(prev => [data, ...prev]);
      setShowInvoiceForm(false);
      setSelectedDevis(''); setClientNom(''); setClientEmail(''); setClientTel(''); setLignes([]);
    } else {
      alert("Erreur lors de la création de la facture.");
    }
  }

  async function updateInvoiceStatus(id, statut) {
    const { data } = await supabase.from('invoices').update({ statut }).eq('id', id).select().maybeSingle();
    setInvoices(prev => prev.map(i => i.id === id ? (data || { ...i, statut }) : i));
  }

  const [printing, setPrinting] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  function copyContractLink(invId, token) {
    const url = `${window.location.origin}/contrat/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(invId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-[#182038] to-[#10182C] text-white px-6 py-4 print:hidden">
        <div className="font-bold text-lg"><span className="text-[#F8C018]">COSAR</span> ONE — Catalogue &amp; Factures</div>
        <div className="text-xs text-slate-300">Connecté : {userName}</div>
      </header>

      <QuickNav current="/dashboard/catalogue" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6 print:hidden">
        <div className="flex gap-2">
          <button onClick={() => setTab('services')} className={`text-sm px-4 py-2 rounded-lg font-medium ${tab === 'services' ? 'bg-[#182038] text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Services</button>
          <button onClick={() => setTab('factures')} className={`text-sm px-4 py-2 rounded-lg font-medium ${tab === 'factures' ? 'bg-[#182038] text-white' : 'bg-white text-slate-600 border border-slate-300'}`}>Factures</button>
        </div>

        {tab === 'services' && (
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Catalogue de services</h2>
            <div className="space-y-2 mb-6">
              {services.map(s => (
                <div key={s.id} className={`flex items-center justify-between border border-slate-200 rounded-lg p-3 ${!s.actif ? 'opacity-50' : ''}`}>
                  <div>
                    <div className="font-medium text-[#182038]">{s.nom} <span className="text-xs text-slate-400 ml-1">{FILIALES[s.filiale]}</span></div>
                    <div className="text-xs text-slate-500">{s.description}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#182038]">{fmtFCFA(s.prix_ht)} HT {UNITES[s.unite]}</span>
                    <button onClick={() => toggleService(s.id, s.actif)} className="text-xs text-slate-500 hover:underline">{s.actif ? 'Désactiver' : 'Activer'}</button>
                  </div>
                </div>
              ))}
              {services.length === 0 && <p className="text-sm text-slate-400">Aucun service pour l&apos;instant.</p>}
            </div>

            <h3 className="text-sm font-semibold text-[#182038] mb-2">Ajouter un service</h3>
            <form onSubmit={createService} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input placeholder="Nom" value={newService.nom} onChange={e => setNewService({ ...newService, nom: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2" required />
              <select value={newService.filiale} onChange={e => setNewService({ ...newService, filiale: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(FILIALES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input placeholder="Prix HT" type="number" value={newService.prix_ht} onChange={e => setNewService({ ...newService, prix_ht: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              <select value={newService.unite} onChange={e => setNewService({ ...newService, unite: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(UNITES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input placeholder="Description (optionnel)" value={newService.description} onChange={e => setNewService({ ...newService, description: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-4" />
              <button disabled={busy} className="btn-gold justify-center disabled:opacity-60">+ Ajouter</button>
            </form>
          </div>
        )}

        {tab === 'factures' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => setShowInvoiceForm(!showInvoiceForm)} className="btn-gold">
                {showInvoiceForm ? 'Annuler' : '+ Nouvelle facture'}
              </button>
            </div>

            {showInvoiceForm && (
              <div className="card p-6">
                <h2 className="font-semibold text-[#182038] mb-4">Nouvelle facture</h2>
                <form onSubmit={createInvoice} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500">Lier à un devis existant (optionnel)</label>
                    <select value={selectedDevis} onChange={e => pickDevis(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1">
                      <option value="">— Aucun —</option>
                      {devis.map(d => <option key={d.id} value={d.id}>{d.nom} ({d.telephone})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input placeholder="Nom du client" value={clientNom} onChange={e => setClientNom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
                    <input placeholder="Email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Téléphone" value={clientTel} onChange={e => setClientTel(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">Ajouter une prestation</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {services.filter(s => s.actif).map(s => (
                        <button type="button" key={s.id} onClick={() => addLigne(s)} className="text-xs border border-slate-300 rounded-full px-3 py-1 hover:bg-slate-50">
                          + {s.nom}
                        </button>
                      ))}
                    </div>
                  </div>

                  {lignes.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-left text-slate-500"><th className="p-2">Prestation</th><th className="p-2 w-20">Qté</th><th className="p-2 w-32">Prix HT</th><th className="p-2 w-32">Total</th><th className="p-2 w-10"></th></tr></thead>
                        <tbody>
                          {lignes.map((l, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="p-2">{l.nom}</td>
                              <td className="p-2"><input type="number" min="1" value={l.quantite} onChange={e => updateLigneQte(i, parseFloat(e.target.value) || 1)} className="w-16 border border-slate-300 rounded px-1 py-0.5" /></td>
                              <td className="p-2">{fmtFCFA(l.prix_unitaire_ht)}</td>
                              <td className="p-2 font-medium">{fmtFCFA(l.quantite * l.prix_unitaire_ht)}</td>
                              <td className="p-2"><button type="button" onClick={() => removeLigne(i)} className="text-red-500 text-xs">✕</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bg-slate-50 p-3 text-right text-sm space-y-1">
                        <div>Total HT : <span className="font-semibold">{fmtFCFA(totalHT)}</span></div>
                        <div>Total TTC (18%) : <span className="font-semibold text-[#182038]">{fmtFCFA(totalTTC)}</span></div>
                      </div>
                    </div>
                  )}

                  <button disabled={busy || lignes.length === 0} className="btn-gold w-full justify-center disabled:opacity-60">Créer la facture</button>
                </form>
              </div>
            )}

            <div className="card p-6">
              <h2 className="font-semibold text-[#182038] mb-4">Factures émises</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-slate-500 border-b border-slate-200"><th className="py-2 pr-3">N°</th><th className="py-2 pr-3">Client</th><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Total TTC</th><th className="py-2 pr-3">Statut</th><th className="py-2 pr-3">Contrat</th><th className="py-2 pr-3"></th></tr></thead>
                  <tbody>
                    {invoices.map(inv => {
                      const st = STATUT_FACTURE[inv.statut || 'brouillon'];
                      return (
                        <tr key={inv.id} className="border-b border-slate-100">
                          <td className="py-2.5 pr-3 font-medium text-[#182038]">{inv.invoice_number}</td>
                          <td className="py-2.5 pr-3">{inv.client_nom}</td>
                          <td className="py-2.5 pr-3 text-slate-500">{fmtDate(inv.created_at)}</td>
                          <td className="py-2.5 pr-3 font-semibold">{fmtFCFA(inv.total_ttc)}</td>
                          <td className="py-2.5 pr-3">
                            <select value={inv.statut || 'brouillon'} onChange={e => updateInvoiceStatus(inv.id, e.target.value)} className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${st.cls}`}>
                              {Object.entries(STATUT_FACTURE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </td>
                          <td className="py-2.5 pr-3">
                            {inv.statut === 'payee' && inv.access_token ? (
                              <button onClick={() => copyContractLink(inv.id, inv.access_token)} className="text-xs text-emerald-700 hover:underline">
                                {copiedId === inv.id ? 'Copié !' : (inv.contract_accepted_at ? '✓ Signé — copier' : 'Copier le lien')}
                              </button>
                            ) : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="py-2.5 pr-3"><button onClick={() => setPrinting(inv)} className="text-xs text-[#2471A3] hover:underline">Voir / Imprimer</button></td>
                        </tr>
                      );
                    })}
                    {invoices.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400">Aucune facture pour l&apos;instant.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {printing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 print:hidden" onClick={() => setPrinting(null)}>
          <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="font-bold text-lg"><span className="text-[#F8C018]">COSAR</span> <span className="text-[#182038]">GROUP</span></div>
                <div className="text-xs text-slate-500">La sécurité, sans détour.</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">{printing.invoice_number}</div>
                <div className="text-slate-500">{fmtDate(printing.created_at)}</div>
              </div>
            </div>
            <div className="text-sm mb-4">
              <div className="text-slate-500 text-xs">Facturé à</div>
              <div className="font-medium">{printing.client_nom}</div>
              <div className="text-slate-500">{printing.client_email} {printing.client_telephone}</div>
            </div>
            <table className="w-full text-sm mb-4">
              <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-1">Prestation</th><th className="py-1">Qté</th><th className="py-1 text-right">Total</th></tr></thead>
              <tbody>
                {(printing.lignes || []).map((l, i) => (
                  <tr key={i} className="border-b border-slate-100"><td className="py-1.5">{l.nom}</td><td className="py-1.5">{l.quantite}</td><td className="py-1.5 text-right">{fmtFCFA(l.total_ht || l.quantite * l.prix_unitaire_ht)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="text-right text-sm space-y-1 mb-6">
              <div>Total HT : {fmtFCFA(printing.total_ht)}</div>
              <div className="font-bold text-[#182038]">Total TTC : {fmtFCFA(printing.total_ttc)}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="btn-gold flex-1 justify-center">Imprimer</button>
              <button onClick={() => setPrinting(null)} className="btn-outline flex-1 justify-center">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {printing && (
        <div className="hidden print:block p-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="font-bold text-2xl">COSAR GROUP</div>
              <div className="text-sm text-slate-500">La sécurité, sans détour.</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{printing.invoice_number}</div>
              <div className="text-slate-500">{fmtDate(printing.created_at)}</div>
            </div>
          </div>
          <div className="mb-6">
            <div className="text-xs text-slate-500">Facturé à</div>
            <div className="font-medium">{printing.client_nom}</div>
            <div className="text-slate-500">{printing.client_email} {printing.client_telephone}</div>
          </div>
          <table className="w-full mb-6">
            <thead><tr className="border-b-2 border-slate-800 text-left"><th className="py-2">Prestation</th><th className="py-2">Qté</th><th className="py-2 text-right">Total</th></tr></thead>
            <tbody>
              {(printing.lignes || []).map((l, i) => (
                <tr key={i} className="border-b border-slate-200"><td className="py-2">{l.nom}</td><td className="py-2">{l.quantite}</td><td className="py-2 text-right">{fmtFCFA(l.total_ht || l.quantite * l.prix_unitaire_ht)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="text-right space-y-1">
            <div>Total HT : {fmtFCFA(printing.total_ht)}</div>
            <div className="font-bold text-xl">Total TTC : {fmtFCFA(printing.total_ttc)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
