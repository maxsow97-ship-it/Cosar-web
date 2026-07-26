'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import QRCode from 'qrcode';

export default function SitesClient({ userName, initialSites, initialPoints }) {
  const [sites, setSites] = useState(initialSites);
  const [points, setPoints] = useState(initialPoints);
  const [selectedSite, setSelectedSite] = useState(initialSites[0]?.id || null);
  const [qrImages, setQrImages] = useState({});
  const [newSite, setNewSite] = useState({ nom: '', client_nom: '', adresse: '', dispositif: '' });
  const [newPointNom, setNewPointNom] = useState('');
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const sitePoints = points.filter(p => p.site_id === selectedSite);

  const genQR = useCallback(async (point) => {
    if (!point.qr_code) return;
    const url = await QRCode.toDataURL(point.qr_code, { width: 320, margin: 2, color: { dark: '#182038', light: '#FFFFFF' } });
    setQrImages(prev => ({ ...prev, [point.id]: url }));
  }, []);

  useEffect(() => {
    sitePoints.forEach(p => { if (!qrImages[p.id]) genQR(p); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite, points]);

  async function createSite(e) {
    e.preventDefault();
    if (!newSite.nom.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.from('sites').insert(newSite).select().single();
    setBusy(false);
    if (!error && data) {
      setSites(prev => [data, ...prev]);
      setSelectedSite(data.id);
      setNewSite({ nom: '', client_nom: '', adresse: '', dispositif: '' });
    } else {
      alert("Erreur lors de la creation du site.");
    }
  }

  async function createPoint(e) {
    e.preventDefault();
    if (!newPointNom.trim() || !selectedSite) return;
    setBusy(true);
    const posP = await new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => resolve({}),
        { timeout: 6000, enableHighAccuracy: true }
      );
    });
    const ordre = sitePoints.length + 1;
    const { data, error } = await supabase.from('points_ronde').insert({
      site_id: selectedSite, nom: newPointNom.trim(), ordre,
      latitude: posP.latitude || null, longitude: posP.longitude || null,
    }).select().single();
    setBusy(false);
    if (!error && data) {
      setPoints(prev => [...prev, data]);
      setNewPointNom('');
    } else {
      alert("Erreur lors de la creation du point. As-tu autorise la localisation ?");
    }
  }

  async function deletePoint(id) {
    if (!confirm('Supprimer ce point de ronde ?')) return;
    const { error } = await supabase.from('points_ronde').delete().eq('id', id);
    if (!error) setPoints(prev => prev.filter(p => p.id !== id));
  }

  function printSite() {
    window.print();
  }

  const currentSite = sites.find(s => s.id === selectedSite);

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-[#182038] to-[#10182C] text-white px-6 py-4 flex items-center justify-between print:hidden">
        <div>
          <div className="font-bold text-lg"><span className="text-[#F8C018]">COSAR</span> ONE — Sites &amp; Rondes</div>
          <div className="text-xs text-slate-300">Connecté : {userName}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <a href="/dashboard" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Devis &amp; Leads</a>
          <a href="/dashboard/operations" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Centre Opérationnel</a>
          <a href="/dashboard/track" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">COSAR TRACK</a>
          <a href="/dashboard/catalogue" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Catalogue &amp; Factures</a>
          <a href="/dashboard/k9" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Registre K9</a>
          <a href="/dashboard/stock" className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">Stock &amp; Matériel</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8 print:hidden">
        <div className="card p-6">
          <h2 className="font-semibold text-[#182038] mb-4">Sites</h2>
          <div className="flex flex-wrap gap-2 mb-5">
            {sites.map(s => (
              <button key={s.id} onClick={() => setSelectedSite(s.id)}
                className={`text-sm px-3 py-1.5 rounded-full border ${selectedSite === s.id ? 'bg-[#182038] text-white border-[#182038]' : 'border-slate-300 text-slate-700'}`}>
                {s.nom}
              </button>
            ))}
            {sites.length === 0 && <span className="text-sm text-slate-400">Aucun site pour l&apos;instant — cree le premier ci-dessous.</span>}
          </div>

          <form onSubmit={createSite} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input placeholder="Nom du site" value={newSite.nom} onChange={e => setNewSite({ ...newSite, nom: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
            <input placeholder="Client" value={newSite.client_nom} onChange={e => setNewSite({ ...newSite, client_nom: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Adresse" value={newSite.adresse} onChange={e => setNewSite({ ...newSite, adresse: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button disabled={busy} className="btn-gold justify-center disabled:opacity-60">+ Ajouter le site</button>
          </form>
        </div>

        {currentSite && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#182038]">Points de ronde — {currentSite.nom}</h2>
              {sitePoints.length > 0 && <button onClick={printSite} className="btn-outline text-sm">Imprimer les QR codes</button>}
            </div>

            <form onSubmit={createPoint} className="flex gap-3 mb-6">
              <input placeholder="Nom du point (ex: Entree principale)" value={newPointNom} onChange={e => setNewPointNom(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              <button disabled={busy} className="btn-gold disabled:opacity-60">+ Ajouter (capture ma position)</button>
            </form>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sitePoints.map(p => (
                <div key={p.id} className="border border-slate-200 rounded-xl p-3 text-center">
                  {qrImages[p.id] ? (
                    <img src={qrImages[p.id]} alt={p.nom} className="w-full rounded-lg" />
                  ) : (
                    <div className="aspect-square bg-slate-100 rounded-lg animate-pulse" />
                  )}
                  <div className="text-xs font-semibold text-[#182038] mt-2">{p.nom}</div>
                  <div className="text-[10px] text-slate-400">{p.latitude ? 'Position enregistree' : 'Sans position de reference'}</div>
                  <button onClick={() => deletePoint(p.id)} className="text-[10px] text-red-500 mt-1 hover:underline">Supprimer</button>
                </div>
              ))}
              {sitePoints.length === 0 && <p className="text-sm text-slate-400 col-span-full">Aucun point de ronde pour ce site.</p>}
            </div>
          </div>
        )}
      </main>

      <div className="hidden print:block p-8">
        <h1 className="text-2xl font-bold mb-1">{currentSite?.nom}</h1>
        <p className="text-sm text-slate-500 mb-6">QR codes des points de ronde COSAR ONE — a coller sur site</p>
        <div className="grid grid-cols-3 gap-8">
          {sitePoints.map(p => (
            <div key={p.id} className="text-center break-inside-avoid">
              {qrImages[p.id] && <img src={qrImages[p.id]} alt={p.nom} className="w-full" />}
              <div className="font-semibold mt-2">{p.nom}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
