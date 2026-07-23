'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { createClient } from '@/lib/supabase/client';

function isCandidature(row) {
  return (row.service || '').startsWith('Candidature');
}

function extractCvUrl(message) {
  if (!message) return null;
  const m = message.match(/CV joint\s*:\s*(https?:\/\/\S+)/i);
  return m ? m[1] : null;
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}

const STATUS_LABELS = {
  nouveau: { label: 'Nouveau', cls: 'bg-amber-100 text-amber-800' },
  en_cours: { label: 'En cours', cls: 'bg-blue-100 text-blue-800' },
  traite: { label: 'Traité', cls: 'bg-emerald-100 text-emerald-800' },
  archive: { label: 'Archivé', cls: 'bg-slate-100 text-slate-600' },
};

const URGENCY_LABELS = {
  haute: { label: 'Urgent', cls: 'bg-red-100 text-red-700' },
  moyenne: { label: 'Normal', cls: 'bg-amber-100 text-amber-700' },
  faible: { label: 'Faible', cls: 'bg-slate-100 text-slate-500' },
};

export default function DashboardClient({ userName, initialDevis, analyticsEvents }) {
  const [rows, setRows] = useState(initialDevis);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [analyzing, setAnalyzing] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const kpis = useMemo(() => {
    const total = rows.length;
    const candidatures = rows.filter(isCandidature).length;
    const devisCount = total - candidatures;
    const thisWeek = rows.filter((r) => new Date(r.created_at) >= weekAgo).length;
    const nonTraites = rows.filter((r) => (r.status || 'nouveau') !== 'traite' && (r.status || 'nouveau') !== 'archive').length;
    return { total, candidatures, devisCount, thisWeek, nonTraites };
  }, [rows]);

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), visites: 0, demandes: 0 });
    }
    const map = Object.fromEntries(days.map((d) => [d.key, d]));
    analyticsEvents.forEach((e) => {
      const key = (e.created_at || '').slice(0, 10);
      if (map[key] && e.event_type === 'pageview') map[key].visites += 1;
    });
    rows.forEach((r) => {
      const key = (r.created_at || '').slice(0, 10);
      if (map[key]) map[key].demandes += 1;
    });
    return days;
  }, [analyticsEvents, rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'devis' && isCandidature(r)) return false;
      if (filter === 'candidatures' && !isCandidature(r)) return false;
      if (statusFilter !== 'all' && (r.status || 'nouveau') !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(`${r.nom} ${r.email} ${r.telephone} ${r.service}`.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [rows, filter, statusFilter, search]);

  async function updateStatus(id, status) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from('devis').update({ status }).eq('id', id);
  }

  async function analyzeWithAI(id) {
    setAnalyzing(id);
    const { data, error } = await supabase.functions.invoke('analyze-lead', { body: { id } });
    setAnalyzing(null);
    if (!error && data && !data.error) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ai_summary: data.ai_summary, ai_urgency: data.ai_urgency } : r)));
    } else {
      alert("Analyse IA indisponible. Vérifie que la fonction 'analyze-lead' est déployée et que ANTHROPIC_API_KEY est configurée sur le projet Supabase.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const topPages = useMemo(() => {
    const counts = {};
    analyticsEvents.forEach((e) => {
      if (e.event_type === 'pageview') counts[e.page] = (counts[e.page] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [analyticsEvents]);

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-[#182038] to-[#10182C] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg"><span className="text-[#F8C018]">COSAR</span> ONE — Back Office</div>
          <div className="text-xs text-slate-300">Connecté : {userName}</div>
        </div>
        <button onClick={logout} className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">
          Déconnexion
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total reçu', value: kpis.total },
            { label: 'Devis', value: kpis.devisCount },
            { label: 'Candidatures', value: kpis.candidatures },
            { label: '7 derniers jours', value: kpis.thisWeek },
            { label: 'À traiter', value: kpis.nonTraites, accent: kpis.nonTraites > 0 },
          ].map((k) => (
            <div key={k.label} className="card p-5">
              <div className={`text-3xl font-bold ${k.accent ? 'text-[#B03A2E]' : 'text-[#182038]'}`}>{k.value}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-[#182038] mb-4">Activité — 14 derniers jours</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E8EF" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#57636F' }} />
              <YAxis tick={{ fontSize: 11, fill: '#57636F' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E4E8EF', fontSize: 12 }} />
              <Line type="monotone" dataKey="visites" name="Visites" stroke="#2471A3" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="demandes" name="Demandes reçues" stroke="#D9A600" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          {analyticsEvents.length === 0 && (
            <p className="text-xs text-slate-400 mt-2">Aucune donnée de visite pour l&apos;instant — le traceur vient d&apos;être installé sur le site.</p>
          )}
        </div>

        {topPages.length > 0 && (
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Pages les plus visitées</h2>
            <div className="space-y-2">
              {topPages.map(([page, count]) => (
                <div key={page} className="flex items-center gap-3 text-sm">
                  <span className="w-40 truncate text-slate-600">{page}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-[#F8C018] h-2 rounded-full" style={{ width: `${Math.min(100, (count / topPages[0][1]) * 100)}%` }} />
                  </div>
                  <span className="w-10 text-right font-semibold text-[#182038]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="font-semibold text-[#182038] mr-auto">Devis & candidatures</h2>
            <input
              placeholder="Rechercher (nom, email, tél...)"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-56"
            />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="all">Tout</option>
              <option value="devis">Devis</option>
              <option value="candidatures">Candidatures</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="all">Tous statuts</option>
              <option value="nouveau">Nouveau</option>
              <option value="en_cours">En cours</option>
              <option value="traite">Traité</option>
              <option value="archive">Archivé</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Nom</th>
                  <th className="py-2 pr-3">Contact</th>
                  <th className="py-2 pr-3">Service / Poste</th>
                  <th className="py-2 pr-3">CV</th>
                  <th className="py-2 pr-3">Analyse IA</th>
                  <th className="py-2 pr-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const cvUrl = extractCvUrl(r.message);
                  const st = STATUS_LABELS[r.status || 'nouveau'] || STATUS_LABELS.nouveau;
                  const ug = r.ai_urgency ? URGENCY_LABELS[r.ai_urgency] : null;
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="py-2.5 pr-3 font-medium text-[#182038]">{r.nom}</td>
                      <td className="py-2.5 pr-3 text-slate-600">
                        <div>{r.telephone}</div>
                        {r.email && <div className="text-xs text-slate-400">{r.email}</div>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isCandidature(r) ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                          {r.service}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        {cvUrl ? (
                          <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="text-[#2471A3] font-medium hover:underline">
                            Télécharger
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 max-w-[240px]">
                        {r.ai_summary ? (
                          <div className="flex items-start gap-1.5">
                            {ug && <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ug.cls}`}>{ug.label}</span>}
                            <span className="text-xs text-slate-600 leading-snug">{r.ai_summary}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => analyzeWithAI(r.id)}
                            disabled={analyzing === r.id}
                            className="text-xs text-[#D9A600] font-semibold hover:underline disabled:opacity-50"
                          >
                            {analyzing === r.id ? 'Analyse…' : '✨ Analyser'}
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <select
                          value={r.status || 'nouveau'}
                          onChange={(e) => updateStatus(r.id, e.target.value)}
                          className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 ${st.cls}`}
                        >
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">Aucun résultat.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
