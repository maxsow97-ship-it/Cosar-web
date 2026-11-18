'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, MapPin, Radio, FileText, Camera, Send, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';

const NAVY = '#182038';
const GOLD = '#F8C018';

function fmtDateTime(iso) {
  if (!iso) return '--';
  try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; }
}
function fmtFCFA(n) { return (n || 0).toLocaleString('fr-FR') + ' FCFA'; }

const TABS = [
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'activite', label: 'Activité du site', icon: MapPin },
  { id: 'tracking', label: 'Localisation', icon: MapPin, soon: true },
  { id: 'cameras', label: 'Caméras', icon: Camera, soon: true },
  { id: 'alarmes', label: 'Alarmes', icon: Radio },
  { id: 'abonnement', label: 'Abonnement', icon: FileText },
];

export default function ClientPortalClient({ userName, sites, incidents, pointages, mainCourante, rondesScans, subscriptions, alarms, devices, siteAgents, initialMessages, trackedAssets, trackedPositions }) {
  const [tab, setTab] = useState('overview');
  const [selectedSite, setSelectedSite] = useState(sites[0]?.id || null);
  const [messages, setMessages] = useState(initialMessages || []);
  const [draftMessage, setDraftMessage] = useState('');
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  async function sendMessage() {
    if (!draftMessage.trim() || sending) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('client_messages').insert({
      client_id: user.id, site_id: selectedSite, message: draftMessage.trim(),
    }).select().single();
    if (!error && data) setMessages(prev => [data, ...prev]);
    setDraftMessage('');
    setSending(false);
  }

  const site = sites.find(s => s.id === selectedSite);
  const siteIncidents = incidents.filter(i => i.site_id === selectedSite);
  const sitePointages = pointages.filter(p => p.site_id === selectedSite).sort((a, b) => new Date(b.horodatage) - new Date(a.horodatage));
  const siteMC = mainCourante.filter(m => m.site_id === selectedSite).sort((a, b) => new Date(b.horodatage) - new Date(a.horodatage));
  const siteAlarms = alarms.filter(a => a.site_id === selectedSite);
  const siteDevices = devices.filter(d => d.site_id === selectedSite);
  const siteSubscription = subscriptions.find(s => s.site_id === selectedSite);
  const siteAgentsList = (siteAgents || []).filter(a => a.site_id === selectedSite);
  const siteMessages = messages.filter(m => m.site_id === selectedSite);
  const siteCameras = (devices || []).filter(d => d.site_id === selectedSite && d.type === 'cctv_camera');
  const siteTrackedAssets = (trackedAssets || []).filter(a => a.site_id === selectedSite);
  const sitePositions = (trackedPositions || []).filter(p => siteTrackedAssets.some(a => a.id === p.asset_id))
    .sort((a, b) => new Date(b.horodatage) - new Date(a.horodatage));

  const agentsEnPoste = (() => {
    const byAgent = {};
    sitePointages.forEach(p => { if (!byAgent[p.agent_id] || new Date(p.horodatage) > new Date(byAgent[p.agent_id].horodatage)) byAgent[p.agent_id] = p; });
    return Object.values(byAgent).filter(p => p.type === 'entree');
  })();

  return (
    <div className="min-h-screen bg-stone-100" style={{ fontFamily: "'Work Sans', ui-sans-serif, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap" />

      <div style={{ background: NAVY }} className="text-white">
        <div style={{ borderColor: GOLD }} className="border-b-2">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div style={{ background: GOLD }} className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 shadow-sm">
                <Shield size={18} color={NAVY} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: '0.03em' }} className="font-semibold text-sm leading-none">COSAR GROUP</div>
                <div className="text-[10px] text-stone-400 leading-none mt-1">Espace client</div>
              </div>
            </div>
            <div className="text-xs text-stone-300">Connecté : {userName}</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {sites.length > 1 && (
          <select value={selectedSite || ''} onChange={e => setSelectedSite(e.target.value)}
                  className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white">
            {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        )}

        {!site ? (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-400">
            Aucun site associé à votre compte pour l&apos;instant. Contactez votre référent COSAR GROUP.
          </div>
        ) : (
          <>
            <div className="flex gap-1 bg-white border border-stone-200 p-1 rounded-lg w-fit overflow-x-auto">
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${active ? 'text-white' : 'text-stone-500 hover:bg-stone-50'}`}
                    style={active ? { background: NAVY } : {}}>
                    <Icon size={13} /> {t.label}
                    {t.soon && <span className="ml-0.5 text-[8px] font-bold px-1 py-px rounded" style={{ background: active ? 'rgba(255,255,255,.25)' : GOLD, color: active ? '#fff' : NAVY }}>APERÇU</span>}
                  </button>
                );
              })}
            </div>

            {tab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Agents en poste', value: agentsEnPoste.length },
                    { label: 'Incidents ouverts', value: siteIncidents.filter(i => i.statut !== 'resolu').length, accent: siteIncidents.filter(i => i.statut !== 'resolu').length > 0 },
                    { label: 'Rondes (7 derniers jours)', value: rondesScans.filter(r => sitePointages.some(p => p.site_id === selectedSite)).length },
                    { label: 'Dispositifs actifs', value: siteDevices.filter(d => d.statut === 'actif').length },
                  ].map(k => (
                    <div key={k.label} className="bg-white rounded-xl p-4 border border-stone-200">
                      <div className={`text-2xl font-bold ${k.accent ? 'text-red-600' : ''}`} style={{ fontFamily: "'Oswald', sans-serif", color: k.accent ? undefined : NAVY }}>{k.value}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{k.label}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100 font-semibold text-sm text-stone-700">Main courante récente</div>
                  <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                    {siteMC.slice(0, 10).map(m => (
                      <div key={m.id} className="px-4 py-2.5 text-sm">
                        <span className="text-stone-400 text-xs">{fmtDateTime(m.horodatage)}</span> -- {m.contenu}
                      </div>
                    ))}
                    {siteMC.length === 0 && <div className="px-4 py-4 text-sm text-stone-400">Aucune entrée pour l&apos;instant.</div>}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-amber-800 mb-1">Vous voyez ce que vous payez</div>
                  <div className="text-[11px] text-amber-700">Chaque prise de poste et chaque ronde est tracée et horodatée automatiquement.</div>
                </div>
              </div>
            )}

            {tab === 'activite' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100 font-semibold text-sm text-stone-700">Agents affectés à ce site</div>
                  <div className="divide-y divide-stone-100">
                    {siteAgentsList.map(a => (
                      <div key={a.agent_id} className="px-4 py-2.5 flex items-center gap-2 text-sm">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        {a.nom_complet}
                      </div>
                    ))}
                    {siteAgentsList.length === 0 && <div className="px-4 py-4 text-sm text-stone-400">Aucun agent affecté actuellement.</div>}
                  </div>
                  <div className="px-4 py-2 text-[11px] text-stone-400 bg-stone-50 border-t border-stone-100">{agentsEnPoste.length} en poste en ce moment</div>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100 font-semibold text-sm text-stone-700">Incidents</div>
                  <div className="divide-y divide-stone-100">
                    {siteIncidents.map(i => (
                      <div key={i.id} className="px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                          {i.description}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1 ml-5">{fmtDateTime(i.created_at)} -- {i.statut}</div>
                      </div>
                    ))}
                    {siteIncidents.length === 0 && <div className="px-4 py-4 text-sm text-stone-400">Aucun incident signalé.</div>}
                  </div>
                </div>
              </div>
            )}

            {tab === 'tracking' && (
              <div className="space-y-3">
                {siteTrackedAssets.length === 0 ? (
                  <>
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full shrink-0">Aperçu</span>
                      <span className="text-xs text-amber-800">Aucun traceur COSAR TRACK configuré sur ce site pour l&apos;instant -- exemple de ce que vous verrez une fois activé.</span>
                    </div>
                    <div className="relative rounded-xl border-2 border-dashed border-stone-300 overflow-hidden">
                      <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center pointer-events-none">
                        <span className="text-xs font-semibold text-stone-500 bg-white px-3 py-1 rounded-full shadow-sm">Exemple -- pas une position réelle</span>
                      </div>
                      <div className="relative bg-stone-50 opacity-70" style={{ paddingBottom: '50%' }}>
                        <div className="absolute" style={{ left: '48%', top: '42%' }}>
                          <span className="block w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-emerald-200" />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-stone-100 font-semibold text-sm text-stone-700">Dispositifs suivis</div>
                      <div className="divide-y divide-stone-100">
                        {siteTrackedAssets.map(a => (
                          <div key={a.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                            <span>{a.nom} ({a.type})</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${a.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>{a.statut}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-stone-100 font-semibold text-sm text-stone-700">Dernières positions</div>
                      <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                        {sitePositions.slice(0, 20).map(p => (
                          <div key={p.id} className="px-4 py-2.5 text-sm flex items-center justify-between">
                            <span className="text-stone-500 text-xs">{fmtDateTime(p.horodatage)}</span>
                            <span className="text-xs text-stone-400">{p.vitesse != null ? `${p.vitesse} km/h` : ''}</span>
                          </div>
                        ))}
                        {sitePositions.length === 0 && <div className="px-4 py-4 text-sm text-stone-400">Aucune position reçue pour l&apos;instant.</div>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'cameras' && (
              <div className="space-y-3">
                {siteCameras.length === 0 ? (
                  <>
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full shrink-0">Aperçu</span>
                      <span className="text-xs text-amber-800">Aucune caméra installée sur ce site pour l&apos;instant -- exemple de ce que vous verrez une fois déployée.</span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-stone-300">
                      <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-stone-500 bg-white px-3 py-1 rounded-full shadow-sm">Exemple -- pas un flux réel</span>
                      </div>
                      <div className="bg-stone-900 aspect-video relative flex items-center justify-center opacity-70">
                        <div className="text-center text-stone-500">
                          <Camera size={28} className="mx-auto mb-2 opacity-50" />
                          <div className="text-xs">Entrée principale</div>
                        </div>
                        <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-white rounded-full ring-2 ring-red-300" /> LIVE
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {siteCameras.map(cam => (
                      <div key={cam.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                        <div className="bg-stone-900 aspect-video relative flex items-center justify-center">
                          {cam.stream_url ? (
                            <video src={cam.stream_url} autoPlay muted playsInline className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center text-stone-500">
                              <Camera size={24} className="mx-auto mb-1 opacity-50" />
                              <div className="text-[11px]">Flux en cours de configuration</div>
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2 text-xs font-medium text-stone-700">{cam.label || 'Caméra'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'alarmes' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100 font-semibold text-sm text-stone-700">Dispositifs installés</div>
                  <div className="divide-y divide-stone-100">
                    {siteDevices.map(d => (
                      <div key={d.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                        <span>{d.label || d.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{d.statut}</span>
                      </div>
                    ))}
                    {siteDevices.length === 0 && <div className="px-4 py-4 text-sm text-stone-400">Aucun dispositif enregistré.</div>}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100 font-semibold text-sm text-stone-700">Historique des alarmes</div>
                  <div className="divide-y divide-stone-100">
                    {siteAlarms.map(a => (
                      <div key={a.id} className="px-4 py-2.5 text-sm flex items-center justify-between">
                        <span>{a.type} -- {fmtDateTime(a.declenchee_at)}</span>
                        <span className="text-xs text-stone-400">{a.statut}</span>
                      </div>
                    ))}
                    {siteAlarms.length === 0 && <div className="px-4 py-4 text-sm text-stone-400">Aucune alarme enregistrée.</div>}
                  </div>
                </div>
              </div>
            )}

            {tab === 'abonnement' && (
              <div className="bg-white rounded-xl border border-stone-200 p-4 max-w-md">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Abonnement en cours</div>
                {siteSubscription ? (
                  <>
                    <div className="text-lg font-bold" style={{ color: NAVY }}>{fmtFCFA(siteSubscription.montant_mensuel)}/mois</div>
                    <div className="text-sm text-stone-500 mt-1">{siteSubscription.type_abonnement} -- {siteSubscription.statut}</div>
                  </>
                ) : <div className="text-sm text-stone-400">Aucun abonnement actif sur ce site. Contactez votre référent COSAR GROUP pour vos factures.</div>}
              </div>
            )}

            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 font-semibold text-sm text-stone-700">
                Contacter COSAR GROUP à propos de ce site
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-3">
                  <input value={draftMessage} onChange={e => setDraftMessage(e.target.value)}
                         placeholder="Votre message pour l'équipe et le superviseur du site..."
                         onKeyDown={e => e.key === 'Enter' && sendMessage()}
                         className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 outline-none focus:border-stone-400" />
                  <button onClick={sendMessage} disabled={sending || !draftMessage.trim()}
                          style={{ background: NAVY }}
                          className="text-white rounded-lg px-4 flex items-center gap-1.5 text-sm disabled:opacity-40">
                    <Send size={14} /> Envoyer
                  </button>
                </div>
                <div className="text-[11px] text-stone-400 mb-3">Reçu directement par le superviseur de votre site et l&apos;équipe COSAR.</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {siteMessages.map(m => (
                    <div key={m.id} className="text-sm bg-stone-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-700">{m.message}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${m.statut === 'traite' ? 'bg-emerald-100 text-emerald-700' : m.statut === 'lu' ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-600'}`}>{m.statut}</span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-1">{fmtDateTime(m.created_at)}</div>
                      {m.reponse && (
                        <div className="mt-2 pl-3 border-l-2 text-xs text-stone-600" style={{ borderColor: GOLD }}>
                          <span className="font-semibold">Réponse COSAR :</span> {m.reponse}
                        </div>
                      )}
                    </div>
                  ))}
                  {siteMessages.length === 0 && <div className="text-sm text-stone-400">Aucun message envoyé pour ce site.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
