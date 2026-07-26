'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const TYPE_LABELS = { vehicule: '🚗 Véhicule', animal: '🐕 Animal domestique', betail: '🐄 Bétail', equipement: '📦 Équipement' };

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

function timeAgo(iso) {
  if (!iso) return 'jamais';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'a l\'instant';
  if (diff < 60) return 'il y a ' + diff + ' min';
  const h = Math.floor(diff / 60);
  if (h < 24) return 'il y a ' + h + 'h';
  return 'il y a ' + Math.floor(h / 24) + 'j';
}

export default function TrackClient({ userName, initialAssets }) {
  const [assets, setAssets] = useState(initialAssets);
  const [form, setForm] = useState({ client_nom: '', type: 'vehicule', nom: '', identifiant: '', device_id: '' });
  const [busy, setBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markers = useRef({});
  const supabase = createClient();

  useEffect(() => {
    if (window.L) { setMapReady(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    leafletMap.current = L.map(mapRef.current).setView([14.7167, -17.4677], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(leafletMap.current);
  }, [mapReady]);

  const refreshMarkers = useCallback(() => {
    if (!leafletMap.current || !window.L) return;
    const L = window.L;
    Object.values(markers.current).forEach(m => leafletMap.current.removeLayer(m));
    markers.current = {};
    assets.filter(a => a.derniere_latitude && a.derniere_longitude).forEach(a => {
      const color = a.statut === 'alerte' ? '#B03A2E' : '#182038';
      const icon = L.divIcon({ html: `<div style="background:${color};color:#F8C018;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);">${a.type === 'vehicule' ? '🚗' : a.type === 'betail' ? '🐄' : a.type === 'animal' ? '🐕' : '📦'}</div>`, className: '', iconSize: [28, 28] });
      const m = L.marker([a.derniere_latitude, a.derniere_longitude], { icon }).addTo(leafletMap.current)
        .bindPopup(`<b>${a.nom}</b><br/>${a.client_nom}<br/>${timeAgo(a.derniere_maj)}`);
      markers.current[a.id] = m;
    });
  }, [assets]);

  useEffect(() => { refreshMarkers(); }, [refreshMarkers]);

  useEffect(() => {
    const channel = supabase.channel('track-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracked_assets' }, (payload) => {
        if (payload.eventType === 'UPDATE') setAssets(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        else if (payload.eventType === 'INSERT') setAssets(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAsset(e) {
    e.preventDefault();
    if (!form.client_nom.trim() || !form.nom.trim()) return;
    setBusy(true);
    const payload = { ...form, device_id: form.device_id.trim() || null };
    const { data, error } = await supabase.from('tracked_assets').insert(payload).select().single();
    setBusy(false);
    if (!error && data) {
      setAssets(prev => [data, ...prev]);
      setForm({ client_nom: '', type: 'vehicule', nom: '', identifiant: '', device_id: '' });
    } else {
      alert("Erreur : " + (error?.message || 'inconnue') + (error?.message?.includes('device_id') ? ' (cet identifiant boitier est deja utilise)' : ''));
    }
  }

  async function deleteAsset(id) {
    if (!confirm('Supprimer ce suivi ?')) return;
    const { error } = await supabase.from('tracked_assets').delete().eq('id', id);
    if (!error) setAssets(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-[#182038] to-[#10182C] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg"><span className="text-[#F8C018]">COSAR</span> TRACK</div>
          <div className="text-xs text-slate-300">Connecté : {userName}</div>
        </div>
      </header>

      <QuickNav current="/dashboard/track" />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="card p-2 overflow-hidden">
          <div ref={mapRef} style={{ height: '380px', width: '100%', borderRadius: '10px' }} />
          {!mapReady && <p className="text-sm text-slate-400 p-4">Chargement de la carte…</p>}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-[#182038] mb-4">Enregistrer un nouvel élément suivi</h2>
          <form onSubmit={createAsset} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input placeholder="Client" value={form.client_nom} onChange={e => setForm({ ...form, client_nom: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input placeholder="Nom (ex: Camion Renault, Vache 12)" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
            <input placeholder="Identifiant / plaque (optionnel)" value={form.identifiant} onChange={e => setForm({ ...form, identifiant: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="ID boîtier GPS (si déjà installé)" value={form.device_id} onChange={e => setForm({ ...form, device_id: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button disabled={busy} className="btn-gold md:col-span-5 justify-center disabled:opacity-60">+ Ajouter au suivi</button>
          </form>
          <p className="text-xs text-slate-400 mt-3">L&apos;ID boîtier GPS n&apos;est nécessaire que lorsque le traceur physique est installé chez le client (partenariat matériel à mettre en place). Sans boîtier, l&apos;élément reste enregistré mais sans position.</p>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-[#182038] mb-4">Éléments suivis ({assets.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Nom</th>
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Boîtier</th>
                  <th className="py-2 pr-3">Dernière position</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 pr-3">{TYPE_LABELS[a.type]}</td>
                    <td className="py-2.5 pr-3 font-medium text-[#182038]">{a.nom}{a.identifiant && <span className="text-slate-400"> ({a.identifiant})</span>}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{a.client_nom}</td>
                    <td className="py-2.5 pr-3">
                      {a.device_id ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Connecté</span> : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Sans boîtier</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-500">{timeAgo(a.derniere_maj)}</td>
                    <td className="py-2.5 pr-3"><button onClick={() => deleteAsset(a.id)} className="text-xs text-red-500 hover:underline">Supprimer</button></td>
                  </tr>
                ))}
                {assets.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Aucun élément suivi pour l&apos;instant.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
