'use client';
import { useState, useEffect } from 'react';
import DashboardShell from '../DashboardShell';
import { logActivity } from '../shared/ui';

export default function ParametresClient({ userName, role, profile }) {
  const [theme, setTheme] = useState('light');
  const [lang, setLang] = useState('fr');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      setTheme(localStorage.getItem('cosar_theme') || 'light');
      setLang(localStorage.getItem('cosar_lang') || 'fr');
    } catch (_) {}
  }, []);

  function savePrefs() {
    try {
      localStorage.setItem('cosar_theme', theme);
      localStorage.setItem('cosar_lang', lang);
      logActivity('parametres', `Thème=${theme}, Langue=${lang}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_) {}
  }

  return (
    <DashboardShell userName={userName} role={role}>
      <div className="p-6 max-w-2xl">
        <h1 className="text-xl font-bold text-[#182038] mb-1">Paramètres</h1>
        <p className="text-sm text-slate-500 mb-6">Profil, préférences d&apos;affichage et options à venir.</p>

        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-bold text-[#182038] mb-3">Profil</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Nom</dt>
              <dd className="font-medium">{profile.nom_complet || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Rôle</dt>
              <dd className="font-medium uppercase text-[#D9A600]">{profile.role}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="font-medium">{profile.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Téléphone</dt>
              <dd className="font-medium">{profile.telephone || '—'}</dd>
            </div>
            {profile.matricule && (
              <div>
                <dt className="text-xs text-slate-500">Matricule</dt>
                <dd className="font-medium">{profile.matricule}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-bold text-[#182038] mb-3">Préférences</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between text-sm">
              <span>Thème</span>
              <select value={theme} onChange={(e) => setTheme(e.target.value)} className="border rounded-lg px-2 py-1.5">
                <option value="light">Clair</option>
                <option value="dark">Sombre</option>
                <option value="system">Système</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Langue</span>
              <select value={lang} onChange={(e) => setLang(e.target.value)} className="border rounded-lg px-2 py-1.5">
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>
            <button type="button" onClick={savePrefs} className="bg-[#F8C018] text-[#182038] font-semibold text-sm px-4 py-2 rounded-lg">
              Enregistrer
            </button>
            {saved && <span className="ml-2 text-xs text-emerald-600">Enregistré</span>}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-bold text-[#182038] mb-3">À venir</h2>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>📷 Photos agents / sites (stockage Supabase)</li>
            <li>💬 WhatsApp / SMS depuis l&apos;app</li>
            <li>🗺️ Carte TRACK live + géofencing</li>
            <li>💶 Facturation automatique + relances</li>
          </ul>
        </section>
      </div>
    </DashboardShell>
  );
}
