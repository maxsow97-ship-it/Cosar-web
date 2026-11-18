'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '../DashboardShell';
import { StatusBadge, EmptyState, FilterBar, FilterSelect, FilterInput, downloadCSV, printAsPDF, logActivity } from '../shared/ui';
import { NewDeviceForm } from '../shared/CreateForms';
import { Radio, Camera, MapPin, PlusCircle, MessageSquare } from 'lucide-react';

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "a l'instant";
  if (diff < 60) return `il y a ${diff} min`;
  const h = Math.floor(diff / 60);
  return h < 24 ? `il y a ${h}h` : `il y a ${Math.floor(h / 24)}j`;
}
function fmtDateTime(iso) {
  if (!iso) return '--';
  try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; }
}

const TYPE_LABELS = { intrusion: 'Intrusion', fumee: 'Fumee', panique: 'Panique', sabotage: 'Sabotage' };
const STATUT_ALARM = {
  declenchee: { label: 'Declenchee', cls: 'bg-red-100 text-red-700' },
  verifiee_fausse: { label: 'Fausse alerte', cls: 'bg-stone-100 text-stone-600' },
  verifiee_confirmee: { label: 'Confirmee', cls: 'bg-orange-100 text-orange-700' },
  technique: { label: 'Probleme technique', cls: 'bg-amber-100 text-amber-700' },
};
const DEVICE_ICON = { cctv_camera: '📷', alarm_panel: '🔔', smart_lock: '🔒', fire_detector: '🔥', panic_button: '🆘', gps_tracker: '📍' };

const TABS = [
  { id: 'alarmes', label: 'Alarmes & Dispositifs', icon: Radio },
  { id: 'cameras', label: 'Caméras', icon: Camera },
  { id: 'tracking', label: 'Tracking', icon: MapPin },
  { id: 'messages', label: 'Messages clients', icon: MessageSquare },
];

export default function AlarmesClient({ userName, role = 'admin', badges, initialAlarms, initialDevices, initialSites, initialTrackedAssets, initialTrackedPositions, initialClientMessages }) {
  const [tab, setTab] = useState('alarmes');
  const [alarms, setAlarms] = useState(initialAlarms);
  const [devices] = useState(initialDevices);
  const [sites] = useState(initialSites);
  const [trackedAssets] = useState(initialTrackedAssets || []);
  const [trackedPositions] = useState(initialTrackedPositions || []);
  const [clientMessages, setClientMessages] = useState(initialClientMessages || []);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [live, setLive] = useState(false);
  const [showNewDevice, setShowNewDevice] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterSite, setFilterSite] = useState('tous');
  const [filterPeriod, setFilterPeriod] = useState('tous');

  function refresh() {
    if (typeof window !== 'undefined') window.location.reload();
  }
  const supabase = createClient();

  const siteName = (id) => sites.find(s => s.id === id)?.nom || 'Site inconnu';
  const lastPosition = (assetId) => trackedPositions.filter(p => p.asset_id === assetId).sort((a, b) => new Date(b.horodatage) - new Date(a.horodatage))[0];

  const filteredAlarms = useMemo(() => {
    let list = alarms;
    if (filterStatut !== 'tous') list = list.filter(a => String(a.statut || '').toLowerCase() === filterStatut);
    if (filterSite !== 'tous') list = list.filter(a => a.site_id === filterSite);
    if (filterPeriod === 'aujourd_hui') {
      const today = new Date().toDateString();
      list = list.filter(a => a.declenchee_at && new Date(a.declenchee_at).toDateString() === today);
    } else if (filterPeriod === '7j') {
      const min = Date.now() - 7 * 86400000;
      list = list.filter(a => a.declenchee_at && new Date(a.declenchee_at).getTime() >= min);
    }
    return list;
  }, [alarms, filterStatut, filterSite, filterPeriod]);

  useEffect(() => {
    const channel = supabase.channel('alarmes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alarms' }, (payload) => {
        setLive(true);
        if (payload.eventType === 'INSERT') setAlarms(prev => [payload.new, ...prev]);
        else if (payload.eventType === 'UPDATE') setAlarms(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyAlarm(id, statut) {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, statut, verifiee_at: new Date().toISOString() } : a));
    await supabase.from('alarms').update({ statut, verifiee_at: new Date().toISOString(), verifiee_par: (await supabase.auth.getUser()).data.user?.id }).eq('id', id);
    logActivity('alarme', `Vérification → ${statut}`);
  }

  async function replyToMessage(id) {
    const reponse = replyDrafts[id];
    if (!reponse?.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    setClientMessages(prev => prev.map(m => m.id === id ? { ...m, reponse, statut: 'traite', repondu_par: user?.id, repondu_at: new Date().toISOString() } : m));
    setReplyDrafts(prev => ({ ...prev, [id]: '' }));
    await supabase.from('client_messages').update({ reponse, statut: 'traite', repondu_par: user?.id, repondu_at: new Date().toISOString() }).eq('id', id);
  }

  async function markMessageRead(id) {
    if (clientMessages.find(m => m.id === id)?.statut !== 'nouveau') return;
    setClientMessages(prev => prev.map(m => m.id === id ? { ...m, statut: 'lu' } : m));
    await supabase.from('client_messages').update({ statut: 'lu' }).eq('id', id);
  }

  const alarmesOuvertes = alarms.filter(a => a.statut === 'declenchee');
  const devicesHorsLigne = devices.filter(d => d.statut === 'hors_ligne');
  const cameras = devices.filter(d => d.type === 'cctv_camera');

  const kpis = [
    { label: 'Alarmes a verifier', value: alarmesOuvertes.length, accent: alarmesOuvertes.length > 0 },
    { label: 'Dispositifs actifs', value: devices.filter(d => d.statut === 'actif').length },
    { label: 'Dispositifs hors ligne', value: devicesHorsLigne.length, accent: devicesHorsLigne.length > 0 },
    { label: 'Alarmes aujourd\u2019hui', value: alarms.filter(a => new Date(a.declenchee_at).toDateString() === new Date().toDateString()).length },
  ];

  return (
    <DashboardShell userName={userName} role={role} badges={badges || {}}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#182038]">Supervision IoT (ARC)</h1>
            <span className={`inline-block w-2 h-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse ring-2 ring-emerald-200' : 'bg-stone-400'}`} title={live ? 'Connexion temps reel active' : 'En attente'} />
          </div>
          <button onClick={() => setShowNewDevice(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#182038] text-white hover:bg-[#0f1526]"><PlusCircle size={14} /> Nouveau dispositif</button>
        </div>

        <FilterBar>
          <FilterSelect label="Statut" value={filterStatut} onChange={setFilterStatut} options={[
            { value: 'tous', label: 'Tous' },
            { value: 'declenchee', label: 'Déclenchée' },
            { value: 'ouvert', label: 'Ouvert' },
            { value: 'en_cours', label: 'En cours' },
            { value: 'resolu', label: 'Résolu' },
            { value: 'ferme', label: 'Fermé' },
          ]} />
          <FilterSelect label="Site" value={filterSite} onChange={setFilterSite} options={[
            { value: 'tous', label: 'Tous les sites' },
            ...sites.map(s => ({ value: s.id, label: s.nom })),
          ]} />
          <FilterSelect label="Période" value={filterPeriod} onChange={setFilterPeriod} options={[
            { value: 'tous', label: 'Toutes' },
            { value: 'aujourd_hui', label: "Aujourd'hui" },
            { value: '7j', label: '7 derniers jours' },
          ]} />
        </FilterBar>

        {alarms.length === 0 && (
          <EmptyState title="Aucune alarme" hint="Les alarmes IoT apparaîtront ici en temps réel." />
        )}

        <div className="flex gap-1 bg-white border border-stone-200 p-1 rounded-lg w-fit">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${active ? 'text-white' : 'text-stone-500 hover:bg-stone-50'}`}
                style={active ? { background: '#182038' } : {}}>
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'alarmes' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpis.map(k => (
                <div key={k.label} className="card p-5">
                  <div className={`text-3xl font-bold ${k.accent ? 'text-[#B03A2E]' : 'text-[#182038]'}`}>{k.value}</div>
                  <div className="text-xs text-stone-500 mt-1">{k.label}</div>
                </div>
              ))}
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-[#182038] mb-4">File d&apos;alarmes -- levee de doute</h2>
              <div className="space-y-3 max-h-[480px] overflow-y-auto">
                {alarms.map(a => {
                  const st = STATUT_ALARM[a.statut] || { label: a.statut, cls: 'bg-stone-100 text-stone-600' };
                  return (
                    <div key={a.id} className={`rounded-lg p-3 bg-stone-50 ${a.statut === 'declenchee' ? 'border-l-4 border-red-500' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-[#182038]">{TYPE_LABELS[a.type] || a.type} -- {siteName(a.site_id)}</div>
                          <div className="text-xs text-stone-500">{timeAgo(a.declenchee_at)}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                          {a.statut === 'declenchee' && (
                            <div className="flex gap-1">
                              <button onClick={() => verifyAlarm(a.id, 'verifiee_fausse')} className="text-xs px-2 py-0.5 rounded-full bg-stone-200 hover:bg-stone-300">Fausse</button>
                              <button onClick={() => verifyAlarm(a.id, 'verifiee_confirmee')} className="text-xs px-2 py-0.5 rounded-full bg-red-200 hover:bg-red-300">Confirmer</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {alarms.length === 0 && <p className="text-sm text-stone-400">Aucune alarme.</p>}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-[#182038] mb-4">Dispositifs installes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {devices.map(d => (
                  <button key={d.id} onClick={() => setEditDevice(d)} className="flex items-center justify-between text-sm border-b border-stone-100 pb-2 hover:bg-stone-50 text-left w-full">
                    <span>{DEVICE_ICON[d.type] || '📡'} {d.label || d.type} -- {siteName(d.site_id)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : d.statut === 'hors_ligne' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {d.statut}
                    </span>
                  </button>
                ))}
                {devices.length === 0 && <p className="text-sm text-stone-400">Aucun dispositif enregistre.</p>}
              </div>
            </div>
          </>
        )}

        {tab === 'cameras' && (
          <div className="space-y-4">
            {cameras.length === 0 ? (
              <div className="card p-8 text-center">
                <Camera size={28} className="mx-auto mb-2 text-stone-300" />
                <div className="text-sm text-stone-500">Aucune caméra enregistrée dans le systeme pour l&apos;instant.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cameras.map(cam => (
                  <div key={cam.id} className="card overflow-hidden p-0">
                    <div className="bg-stone-900 aspect-video relative flex items-center justify-center">
                      {cam.stream_url ? (
                        <video src={cam.stream_url} autoPlay muted playsInline className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-stone-500">
                          <Camera size={22} className="mx-auto mb-1 opacity-50" />
                          <div className="text-[11px]">En attente de configuration</div>
                        </div>
                      )}
                      <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${cam.statut === 'actif' ? 'bg-red-600 text-white' : 'bg-stone-600 text-white'}`}>
                        {cam.statut === 'actif' ? 'LIVE' : cam.statut}
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-medium text-[#182038]">{cam.label || 'Caméra'}</div>
                      <div className="text-xs text-stone-400">{siteName(cam.site_id)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'tracking' && (
          <div className="space-y-4">
            {trackedAssets.length === 0 ? (
              <div className="card p-8 text-center">
                <MapPin size={28} className="mx-auto mb-2 text-stone-300" />
                <div className="text-sm text-stone-500">Aucun dispositif COSAR TRACK enregistré pour l&apos;instant.</div>
              </div>
            ) : (
              <div className="card p-6">
                <h2 className="font-semibold text-[#182038] mb-4">Dispositifs suivis</h2>
                <div className="space-y-2">
                  {trackedAssets.map(a => {
                    const pos = lastPosition(a.id);
                    return (
                      <div key={a.id} className="flex items-center justify-between text-sm border-b border-stone-100 pb-2">
                        <div>
                          <span className="font-medium text-[#182038]">{a.nom}</span>
                          <span className="text-xs text-stone-400 ml-2">{a.type} -- {a.site_id ? siteName(a.site_id) : a.client_nom || 'Client independant'}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${a.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>{a.statut}</span>
                          {pos && <div className="text-[11px] text-stone-400 mt-0.5">Position : {fmtDateTime(pos.horodatage)}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'messages' && (
          <div className="card p-6">
            <h2 className="font-semibold text-[#182038] mb-4">Messages clients</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {clientMessages.map(m => (
                <div key={m.id} onClick={() => markMessageRead(m.id)}
                     className={`rounded-lg p-3 bg-stone-50 ${m.statut === 'nouveau' ? 'border-l-4 border-[#F8C018]' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[#182038]">{siteName(m.site_id)}</div>
                      <div className="text-sm text-stone-700 mt-1">{m.message}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${m.statut === 'traite' ? 'bg-emerald-100 text-emerald-700' : m.statut === 'lu' ? 'bg-amber-100 text-amber-700' : 'bg-[#F8C018] text-[#182038]'}`}>{m.statut}</span>
                  </div>
                  {m.reponse ? (
                    <div className="mt-2 pl-3 border-l-2 border-emerald-400 text-xs text-stone-600">
                      <span className="font-semibold">Votre réponse :</span> {m.reponse}
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <input value={replyDrafts[m.id] || ''} onChange={e => setReplyDrafts(prev => ({ ...prev, [m.id]: e.target.value }))}
                             placeholder="Répondre au client..."
                             className="flex-1 text-xs border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:border-stone-400" />
                      <button onClick={() => replyToMessage(m.id)} className="text-xs px-3 py-1.5 rounded-lg bg-[#182038] text-white hover:bg-[#0f1526]">Envoyer</button>
                    </div>
                  )}
                </div>
              ))}
              {clientMessages.length === 0 && <p className="text-sm text-stone-400">Aucun message client.</p>}
            </div>
          </div>
        )}
      </div>

      {showNewDevice && <NewDeviceForm onClose={() => setShowNewDevice(false)} onCreated={refresh} sites={sites} />}
      {editDevice && <NewDeviceForm record={editDevice} onClose={() => setEditDevice(null)} onCreated={refresh} sites={sites} />}
    </DashboardShell>
  );
}
