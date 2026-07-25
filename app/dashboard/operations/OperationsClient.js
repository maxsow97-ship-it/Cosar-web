'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

function fmtTime(iso) {
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; }
}
function fmtDateTime(iso) {
  try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; }
}
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'a l\'instant';
  if (diff < 60) return 'il y a ' + diff + ' min';
  const h = Math.floor(diff / 60);
  if (h < 24) return 'il y a ' + h + 'h';
  return 'il y a ' + Math.floor(h / 24) + 'j';
}

const INC_STATUS = {
  nouveau: { label: 'Nouveau', cls: 'bg-red-100 text-red-700' },
  en_cours: { label: 'En cours', cls: 'bg-amber-100 text-amber-700' },
  resolu: { label: 'Résolu', cls: 'bg-emerald-100 text-emerald-700' },
};
const GRAVITE_CLS = { haute: 'border-l-4 border-red-500', moyenne: 'border-l-4 border-amber-400', faible: 'border-l-4 border-slate-300' };

export default function OperationsClient({ userName, initialSites, initialAgents, initialPointages, initialIncidents, initialScans, initialMC, initialPoints }) {
  const [sites] = useState(initialSites);
  const [agents] = useState(initialAgents);
  const [pointages, setPointages] = useState(initialPointages);
  const [incidents, setIncidents] = useState(initialIncidents);
  const [scans, setScans] = useState(initialScans);
  const [mc, setMc] = useState(initialMC);
  const [points] = useState(initialPoints);
  const [live, setLive] = useState(false);
  const supabase = createClient();

  const agentName = useCallback((id) => agents.find(a => a.id === id)?.nom_complet || 'Agent inconnu', [agents]);
  const siteName = useCallback((id) => sites.find(s => s.id === id)?.nom || 'Site inconnu', [sites]);
  const pointName = useCallback((id) => points.find(p => p.id === id)?.nom || 'Point inconnu', [points]);

  // Abonnement temps reel : incidents et pointages
  useEffect(() => {
    const channel = supabase.channel('ops-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
        setLive(true);
        if (payload.eventType === 'INSERT') setIncidents(prev => [payload.new, ...prev]);
        else if (payload.eventType === 'UPDATE') setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pointages' }, (payload) => {
        setLive(true);
        setPointages(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rondes_scans' }, (payload) => {
        setLive(true);
        setScans(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'main_courante' }, (payload) => {
        setLive(true);
        setMc(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Agents actuellement en service : dernier pointage du jour = 'entree' (pas encore de sortie apres)
  const enService = useMemo(() => {
    const byAgent = {};
    [...pointages].sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage)).forEach(p => { byAgent[p.agent_id] = p; });
    return Object.values(byAgent).filter(p => p.type === 'entree');
  }, [pointages]);

  const alertesOuvertes = useMemo(() => incidents.filter(i => (i.statut || 'nouveau') !== 'resolu'), [incidents]);
  const alertesSOS = useMemo(() => alertesOuvertes.filter(i => (i.description || '').includes('SOS')), [alertesOuvertes]);

  async function updateIncidentStatus(id, statut) {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, statut } : i));
    await supabase.from('incidents').update({ statut }).eq('id', id);
  }

  const kpis = [
    { label: 'Agents en service', value: enService.length, accent: false },
    { label: 'Sites actifs', value: sites.filter(s => s.statut !== 'inactif').length, accent: false },
    { label: 'Alertes ouvertes', value: alertesOuvertes.length, accent: alertesOuvertes.length > 0 },
    { label: 'Rondes aujourd\'hui', value: scans.filter(s => new Date(s.horodatage).toDateString() === new Date().toDateString()).length, accent: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-[#182038] to-[#10182C] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg flex items-center gap-2">
            <span className="text-[#F8C018]">COSAR</span> ONE — Centre Opérationnel
            <span className={`inline-block w-2 h-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} title={live ? 'Connexion temps reel active' : 'En attente'} />
          </div>
          <div className="text-xs text-slate-300">Connecté : {userName}</div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/dashboard/sites" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Sites &amp; Rondes</a>
          <a href="/dashboard" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Devis &amp; Leads</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {alertesSOS.length > 0 && (
          <div className="bg-red-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
            <span className="text-2xl">🆘</span>
            <div>
              <div className="font-bold">{alertesSOS.length} alerte{alertesSOS.length > 1 ? 's' : ''} SOS active{alertesSOS.length > 1 ? 's' : ''}</div>
              <div className="text-sm text-red-100">Intervention immédiate requise — voir ci-dessous</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="card p-5">
              <div className={`text-3xl font-bold ${k.accent ? 'text-[#B03A2E]' : 'text-[#182038]'}`}>{k.value}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Alertes &amp; incidents</h2>
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {incidents.map(i => {
                const st = INC_STATUS[i.statut || 'nouveau'];
                const isSOS = (i.description || '').includes('SOS');
                return (
                  <div key={i.id} className={`${GRAVITE_CLS[i.gravite] || ''} bg-slate-50 rounded-r-lg p-3`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[#182038]">
                          {isSOS && '🆘 '}{i.description}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {agentName(i.agent_id)} · {siteName(i.site_id)} · {timeAgo(i.created_at)}
                        </div>
                        {i.photo_url && (
                          <a href={i.photo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2471A3] hover:underline">Voir la photo</a>
                        )}
                      </div>
                      <select value={i.statut || 'nouveau'} onChange={(e) => updateIncidentStatus(i.id, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-2 py-1 border-0 shrink-0 ${st.cls}`}>
                        {Object.entries(INC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
              {incidents.length === 0 && <p className="text-sm text-slate-400">Aucun incident signalé.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Agents en service</h2>
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {enService.map(p => (
                <div key={p.agent_id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                  <div>
                    <div className="font-medium text-[#182038]">{agentName(p.agent_id)}</div>
                    <div className="text-xs text-slate-500">{siteName(p.site_id)}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />
                    <span className="text-xs text-slate-500">depuis {fmtTime(p.horodatage)}</span>
                  </div>
                </div>
              ))}
              {enService.length === 0 && <p className="text-sm text-slate-400">Aucun agent pointé actuellement.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Activité des rondes</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {scans.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                  <div>
                    <div className="font-medium text-[#182038]">{pointName(s.point_ronde_id)}</div>
                    <div className="text-xs text-slate-500">{agentName(s.agent_id)} · {fmtDateTime(s.horodatage)}</div>
                  </div>
                  {s.distance_m !== null && s.distance_m !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.distance_m > 100 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {s.distance_m} m
                    </span>
                  )}
                </div>
              ))}
              {scans.length === 0 && <p className="text-sm text-slate-400">Aucun scan de ronde pour l’instant.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Main courante récente</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {mc.map(m => (
                <div key={m.id} className="text-sm border-b border-slate-100 pb-2">
                  <div className="text-[#182038]">{m.contenu}</div>
                  <div className="text-xs text-slate-500">{agentName(m.agent_id)} · {siteName(m.site_id)} · {timeAgo(m.horodatage)}</div>
                </div>
              ))}
              {mc.length === 0 && <p className="text-sm text-slate-400">Aucune entrée de main courante.</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
