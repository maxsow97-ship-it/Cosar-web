'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

function LiveMap({ agentPoints, sitePoints }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const L = await import('leaflet');
      if (cancelled || !mapRef.current) return;
      if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current).setView([14.7167, -17.4677], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(mapInstance.current);
        markersLayer.current = L.layerGroup().addTo(mapInstance.current);
      }
      markersLayer.current.clearLayers();

      const allPts = [];
      const agentIcon = L.divIcon({ className: '', html: '<div style="background:#182038;width:14px;height:14px;border-radius:50%;border:3px solid #F8C018;"></div>', iconSize: [14, 14] });
      const siteIcon = L.divIcon({ className: '', html: '<div style="background:#2471A3;width:12px;height:12px;border-radius:3px;border:2px solid #fff;"></div>', iconSize: [12, 12] });

      agentPoints.forEach(p => {
        if (p.lat == null || p.lng == null) return;
        allPts.push([p.lat, p.lng]);
        L.marker([p.lat, p.lng], { icon: agentIcon }).addTo(markersLayer.current).bindPopup(`<b>${p.label}</b><br/>${p.sub}`);
      });
      sitePoints.forEach(p => {
        if (p.lat == null || p.lng == null) return;
        allPts.push([p.lat, p.lng]);
        L.marker([p.lat, p.lng], { icon: siteIcon }).addTo(markersLayer.current).bindPopup(`<b>${p.label}</b>`);
      });

      if (allPts.length > 0) {
        mapInstance.current.fitBounds(allPts, { padding: [30, 30], maxZoom: 15 });
      }
    }
    init();
    return () => { cancelled = true; };
  }, [agentPoints, sitePoints]);

  return <div ref={mapRef} style={{ height: 360, borderRadius: 12, zIndex: 0 }} />;
}

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

  const enService = useMemo(() => {
    const byAgent = {};
    [...pointages].sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage)).forEach(p => { byAgent[p.agent_id] = p; });
    return Object.values(byAgent).filter(p => p.type === 'entree');
  }, [pointages]);

  const alertesOuvertes = useMemo(() => incidents.filter(i => (i.statut || 'nouveau') !== 'resolu'), [incidents]);
  const alertesSOS = useMemo(() => alertesOuvertes.filter(i => (i.description || '').includes('SOS')), [alertesOuvertes]);

  const mapAgentPoints = useMemo(() => enService.filter(p => p.latitude != null).map(p => ({
    lat: p.latitude, lng: p.longitude, label: agentName(p.agent_id), sub: siteName(p.site_id) + ' · depuis ' + fmtTime(p.horodatage),
  })), [enService, agentName, siteName]);
  const mapSitePoints = useMemo(() => {
    return sites.map(s => {
      if (s.latitude != null) return { lat: s.latitude, lng: s.longitude, label: s.nom };
      const pts = points.filter(p => p.site_id === s.id && p.latitude != null);
      if (!pts.length) return null;
      const lat = pts.reduce((a, p) => a + p.latitude, 0) / pts.length;
      const lng = pts.reduce((a, p) => a + p.longitude, 0) / pts.length;
      return { lat, lng, label: s.nom };
    }).filter(Boolean);
  }, [sites, points]);

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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <a href="/dashboard" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Devis &amp; Leads</a>
          <a href="/dashboard/track" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">COSAR TRACK</a>
          <a href="/dashboard/sites" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Sites &amp; Rondes</a>
          <a href="/dashboard/catalogue" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Catalogue &amp; Factures</a>
          <a href="/dashboard/k9" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Registre K9</a>
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

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#182038]">Suivi cartographique</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-[#182038] border-2 border-[#F8C018]" /> Agent en service</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#2471A3] border-2 border-white" /> Site</span>
            </div>
          </div>
          <LiveMap agentPoints={mapAgentPoints} sitePoints={mapSitePoints} />
          {mapAgentPoints.length === 0 && mapSitePoints.length === 0 && (
            <p className="text-xs text-slate-400 mt-2">Aucune position disponible pour l&apos;instant — la carte se remplit dès qu&apos;un agent pointe ou qu&apos;un point de ronde est créé.</p>
          )}
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
