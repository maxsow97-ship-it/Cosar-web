'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📃', label: 'Devis & Leads', bg: '#F8C018' },
  { href: '/dashboard/operations', icon: '📡', label: 'Centre Opérationnel', bg: '#182038' },
  { href: '/dashboard/track', icon: '📍', label: 'COSAR TRACK', bg: '#2471A3' },
  { href: '/dashboard/sites', icon: '🛡️', label: 'Sites & Rondes', bg: '#182038' },
  { href: '/dashboard/catalogue', icon: '🧾', label: 'Catalogue & Factures', bg: '#F8C018' },
  { href: '/dashboard/k9', icon: '🐾', label: 'Registre K9', bg: '#B03A2E' },
  { href: '/dashboard/stock', icon: '📦', label: 'Stock & Matériel', bg: '#2471A3' },
  { href: '/dashboard/utilisateurs', icon: '👤', label: 'Utilisateurs & Accès', bg: '#182038' },
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

const ROLES = {
  admin: { label: 'Administrateur', cls: 'bg-red-100 text-red-700' },
  superviseur: { label: 'Superviseur', cls: 'bg-blue-100 text-blue-700' },
  agent: { label: 'Agent', cls: 'bg-slate-100 text-slate-600' },
};

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return iso; }
}

export default function UtilisateursClient({ userName, initialUsers }) {
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const [form, setForm] = useState({
    nom_complet: '', email: '', password: '', telephone: '', matricule: '', role: 'agent',
  });

  async function createUser(e) {
    e.preventDefault();
    if (!form.nom_complet.trim() || !form.email.trim() || form.password.length < 6) {
      setError('Vérifie le nom, l\'email et un mot de passe d\'au moins 6 caractères.');
      return;
    }
    setBusy(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error: fnError } = await supabase.functions.invoke('admin-create-user', {
      body: form,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    setBusy(false);
    if (fnError || data?.error) {
      setError(data?.error || fnError?.message || 'Erreur lors de la création du compte.');
      return;
    }
    setUsers(prev => [{ id: data.user_id, ...form, actif: true, created_at: new Date().toISOString() }, ...prev]);
    setShowForm(false);
    setForm({ nom_complet: '', email: '', password: '', telephone: '', matricule: '', role: 'agent' });
  }

  async function updateRole(id, role) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    await supabase.from('profiles').update({ role }).eq('id', id);
  }

  async function toggleActif(id, actif) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, actif: !actif } : u));
    await supabase.from('profiles').update({ actif: !actif }).eq('id', id);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-[#182038] to-[#10182C] text-white px-6 py-4">
        <div className="font-bold text-lg"><span className="text-[#F8C018]">COSAR</span> ONE — Utilisateurs &amp; Accès</div>
        <div className="text-xs text-slate-300">Connecté : {userName}</div>
      </header>

      <QuickNav current="/dashboard/utilisateurs" />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex justify-end">
          <button onClick={() => setShowForm(!showForm)} className="btn-gold">
            {showForm ? 'Annuler' : '+ Créer un compte'}
          </button>
        </div>

        {showForm && (
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Nouveau compte</h2>
            <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input placeholder="Nom complet" value={form.nom_complet} onChange={e => setForm({ ...form, nom_complet: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              <input placeholder="Mot de passe (6 car. min)" type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              <input placeholder="Téléphone" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Matricule (optionnel)" value={form.matricule} onChange={e => setForm({ ...form, matricule: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {error && <div className="text-sm text-red-600 md:col-span-3">{error}</div>}
              <button disabled={busy} className="btn-gold justify-center disabled:opacity-60 md:col-span-3">
                {busy ? 'Création…' : 'Créer le compte'}
              </button>
            </form>
          </div>
        )}

        <div className="card p-6">
          <h2 className="font-semibold text-[#182038] mb-4">Comptes ({users.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">Nom</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Téléphone</th>
                  <th className="py-2 pr-3">Rôle</th>
                  <th className="py-2 pr-3">Créé le</th>
                  <th className="py-2 pr-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={`border-b border-slate-100 ${u.actif === false ? 'opacity-50' : ''}`}>
                    <td className="py-2.5 pr-3 font-medium text-[#182038]">{u.nom_complet}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{u.email}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{u.telephone || '—'}</td>
                    <td className="py-2.5 pr-3">
                      <select value={u.role || 'agent'} onChange={e => updateRole(u.id, e.target.value)} className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${ROLES[u.role || 'agent'].cls}`}>
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-500">{fmtDate(u.created_at)}</td>
                    <td className="py-2.5 pr-3">
                      <button onClick={() => toggleActif(u.id, u.actif !== false)} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.actif === false ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {u.actif === false ? 'Désactivé' : 'Actif'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Aucun utilisateur pour l&apos;instant.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Un compte désactivé garde son profil mais n&apos;a plus accès au back office. Les administrateurs peuvent tout gérer ; les superviseurs peuvent consulter les comptes sans les modifier.
        </p>
      </main>
    </div>
  );
}
