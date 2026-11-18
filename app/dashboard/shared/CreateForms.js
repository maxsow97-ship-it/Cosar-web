'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';

const NAVY = '#182038';

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-[#182038]">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-stone-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full text-sm border border-stone-200 rounded-lg px-3 py-2 outline-none focus:border-stone-400";

export function SubmitBar({ onCancel, loading, error, label = 'Créer' }) {
  return (
    <div className="pt-2">
      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
      <div className="flex gap-2">
        <button onClick={onCancel} type="button" className="flex-1 text-sm border border-stone-200 rounded-lg py-2 text-stone-600 hover:bg-stone-50">Annuler</button>
        <button type="submit" disabled={loading} style={{ background: NAVY }} className="flex-1 text-sm text-white rounded-lg py-2 disabled:opacity-50">
          {loading ? 'Création…' : label}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PIECES JOINTES -- upload vers le bucket Storage "documents"
// Convention de chemin : contracts/{agent_id}/{fichier} -- permet a l'agent de voir les siens
// ============================================================
export function AttachmentUpload({ agentId, existingUrl, onUploaded, label = 'Document' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    const path = `contracts/${agentId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (uploadErr) { setError(uploadErr.message); setUploading(false); return; }
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    onUploaded?.(path); // on stocke le chemin, pas l'URL publique (bucket prive)
    setUploading(false);
  }

  return (
    <div>
      <label className="text-xs font-medium text-stone-500 block mb-1">{label}</label>
      {existingUrl ? (
        <div className="flex items-center justify-between text-sm bg-stone-50 rounded-lg px-3 py-2">
          <span className="text-stone-600 truncate">📎 {existingUrl.split('/').pop()}</span>
          <label className="text-xs text-[#2471A3] cursor-pointer hover:underline">
            Remplacer
            <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 text-sm border-2 border-dashed border-stone-200 rounded-lg py-3 cursor-pointer hover:border-stone-300 text-stone-500">
          {uploading ? 'Envoi…' : '📎 Choisir un fichier'}
          <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      )}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}

export async function getDocumentSignedUrl(supabase, path) {
  if (!path) return null;
  const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

function ViewDocumentLink({ path }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function open() {
    setLoading(true);
    const url = await getDocumentSignedUrl(supabase, path);
    setLoading(false);
    if (url && typeof window !== 'undefined') window.open(url, '_blank');
  }

  return (
    <button onClick={open} disabled={loading} className="text-xs text-[#2471A3] hover:underline mt-1">
      {loading ? 'Ouverture…' : '📎 Voir le document'}
    </button>
  );
}

export function LeaveCalendar({ leaves = [], agents = [] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date();
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0

  const agentName = (id) => agents.find(a => a.id === id)?.nom_complet?.split(' ')[0] || 'Agent';

  function leavesOnDay(day) {
    const d = new Date(year, month, day);
    return leaves.filter(l => {
      if (l.statut !== 'valide') return false;
      const start = new Date(l.date_debut);
      const end = new Date(l.date_fin);
      return d >= new Date(start.toDateString()) && d <= new Date(end.toDateString());
    });
  }

  const monthLabel = base.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthOffset(m => m - 1)} className="text-xs px-2 py-1 rounded border border-stone-200 hover:bg-stone-50">‹</button>
        <span className="text-sm font-medium text-[#182038] capitalize">{monthLabel}</span>
        <button onClick={() => setMonthOffset(m => m + 1)} className="text-xs px-2 py-1 rounded border border-stone-200 hover:bg-stone-50">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-stone-400 mb-1 text-center">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dayLeaves = day ? leavesOnDay(day) : [];
          return (
            <div key={i} className={`min-h-[44px] rounded p-1 text-[10px] ${day ? 'bg-stone-50' : ''}`}>
              {day && <div className="text-stone-500">{day}</div>}
              {dayLeaves.slice(0, 2).map(l => (
                <div key={l.id} title={agentName(l.agent_id)} className="bg-[#F8C018]/30 text-[#182038] rounded px-1 truncate mt-0.5">{agentName(l.agent_id)}</div>
              ))}
              {dayLeaves.length > 2 && <div className="text-stone-400">+{dayLeaves.length - 2}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AgentDetailDrawer({ agent, onClose, contracts = [], evaluations = [], sanctions = [], formationStatus, onEdit }) {
  const agentContracts = contracts.filter(c => c.agent_id === agent.id);
  const agentEvals = evaluations.filter(e => e.agent_id === agent.id);
  const agentSanctions = sanctions.filter(s => s.agent_id === agent.id);
  const fmt = (d) => { if (!d) return '--'; try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return d; } };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-stone-100 z-10">
          <div>
            <h3 className="font-semibold text-[#182038]">{agent.nom_complet}</h3>
            <div className="text-xs text-stone-400">{agent.matricule || 'Pas de matricule'} {agent.actif === false && <span className="text-red-600">-- Archivé</span>}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit?.(agent)} className="text-xs px-3 py-1.5 rounded-lg bg-[#182038] text-white">Modifier</button>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Coordonnées</div>
            <div className="text-sm text-stone-700">{agent.telephone || 'Téléphone non renseigné'}</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Formation</div>
            {formationStatus ? (
              <div className="text-sm">{formationStatus.formations_completees}/{formationStatus.formations_totales} modules -- {formationStatus.formation_complete ? 'Complète' : 'En cours'}</div>
            ) : <div className="text-sm text-stone-400">Aucune donnée.</div>}
          </div>

          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Contrats ({agentContracts.length})</div>
            <div className="space-y-2">
              {agentContracts.map(c => (
                <div key={c.id} className="text-sm bg-stone-50 rounded-lg p-2.5">
                  <div className="font-medium">{c.type?.toUpperCase()} -- {c.statut}</div>
                  <div className="text-xs text-stone-500">Depuis le {fmt(c.date_debut)}{c.salaire_brut ? ` -- ${Number(c.salaire_brut).toLocaleString('fr-FR')} FCFA` : ''}</div>
                  {c.document_url && <ViewDocumentLink path={c.document_url} />}
                </div>
              ))}
              {agentContracts.length === 0 && <div className="text-sm text-stone-400">Aucun contrat.</div>}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Évaluations ({agentEvals.length})</div>
            <div className="space-y-2">
              {agentEvals.map(e => {
                const total = (e.score_assiduite || 0) + (e.score_consignes || 0) + (e.score_ecrits || 0) + (e.score_presentation || 0) + (e.score_relation_client || 0);
                return <div key={e.id} className="text-sm bg-stone-50 rounded-lg p-2.5 flex justify-between"><span>{e.periode}</span><span className="font-semibold">{total}/20</span></div>;
              })}
              {agentEvals.length === 0 && <div className="text-sm text-stone-400">Aucune évaluation.</div>}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Sanctions ({agentSanctions.length})</div>
            <div className="space-y-2">
              {agentSanctions.map(s => (
                <div key={s.id} className="text-sm bg-red-50 rounded-lg p-2.5">
                  <div className="font-medium">{s.niveau?.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-stone-500">{s.motif} -- {fmt(s.date_sanction)}</div>
                </div>
              ))}
              {agentSanctions.length === 0 && <div className="text-sm text-emerald-600">Dossier vierge.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditAgentProfileForm({ onClose, onCreated, record }) {
  const [form, setForm] = useState({
    nom_complet: record.nom_complet || '', telephone: record.telephone || '',
    matricule: record.matricule || '', actif: record.actif !== false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.from('profiles').update(form).eq('id', record.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title="Modifier l'agent" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nom complet"><input required className={inputCls} value={form.nom_complet} onChange={e => setForm({ ...form, nom_complet: e.target.value })} /></Field>
        <Field label="Téléphone"><input className={inputCls} value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} /></Field>
        <Field label="Matricule"><input className={inputCls} value={form.matricule} onChange={e => setForm({ ...form, matricule: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm text-stone-600 pt-1">
          <input type="checkbox" checked={form.actif} onChange={e => setForm({ ...form, actif: e.target.checked })} />
          Agent actif (décocher = archiver, ne supprime rien)
        </label>
        <div className="text-[11px] text-stone-400 -mt-1">Pour changer l&apos;email ou le mot de passe, contactez un administrateur système.</div>
        <SubmitBar onCancel={onClose} loading={loading} error={error} label="Enregistrer" />
      </form>
    </Modal>
  );
}

export function NewAgentForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', password: '', nom_complet: '', telephone: '', matricule: '', role: 'agent' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || data.error) { setError(data.error || 'Erreur lors de la création'); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title="Nouvel agent" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nom complet"><input required className={inputCls} value={form.nom_complet} onChange={e => setForm({ ...form, nom_complet: e.target.value })} /></Field>
        <Field label="Email (identifiant de connexion)"><input required type="email" className={inputCls} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Mot de passe provisoire"><input required type="text" minLength={8} className={inputCls} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Téléphone"><input className={inputCls} value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} /></Field>
        <Field label="Matricule"><input className={inputCls} value={form.matricule} onChange={e => setForm({ ...form, matricule: e.target.value })} /></Field>
        <Field label="Rôle">
          <select className={inputCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="agent">Agent</option>
            <option value="superviseur">Superviseur</option>
            <option value="client">Client</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <SubmitBar onCancel={onClose} loading={loading} error={error} />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVEAU SITE
// ============================================================
export function NewSiteForm({ onClose, onCreated, superviseurs = [], record = null }) {
  const isEdit = !!record;
  const [form, setForm] = useState(record ? {
    nom: record.nom || '', client_nom: record.client_nom || '', adresse: record.adresse || '',
    dispositif: record.dispositif || '', superviseur_id: record.superviseur_id || '', statut: record.statut || 'actif',
  } : { nom: '', client_nom: '', adresse: '', dispositif: '', superviseur_id: '', statut: 'actif' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const payload = { ...form, superviseur_id: form.superviseur_id || null };
    const { error: err } = isEdit
      ? await supabase.from('sites').update(payload).eq('id', record.id)
      : await supabase.from('sites').insert(payload);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Modifier le site' : 'Nouveau site'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nom du site"><input required className={inputCls} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></Field>
        <Field label="Client"><input className={inputCls} value={form.client_nom} onChange={e => setForm({ ...form, client_nom: e.target.value })} /></Field>
        <Field label="Adresse"><input className={inputCls} value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} /></Field>
        <Field label="Dispositif prévu (texte libre)"><input className={inputCls} value={form.dispositif} onChange={e => setForm({ ...form, dispositif: e.target.value })} /></Field>
        <Field label="Superviseur">
          <select className={inputCls} value={form.superviseur_id} onChange={e => setForm({ ...form, superviseur_id: e.target.value })}>
            <option value="">— Non assigné —</option>
            {superviseurs.map(s => <option key={s.id} value={s.id}>{s.nom_complet}</option>)}
          </select>
        </Field>
        {isEdit && (
          <Field label="Statut">
            <select className={inputCls} value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
              <option value="actif">Actif</option>
              <option value="inactif">Archivé</option>
            </select>
          </Field>
        )}
        <SubmitBar onCancel={onClose} loading={loading} error={error} label={isEdit ? 'Enregistrer' : 'Créer'} />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVEAU CHIEN K9
// ============================================================
export function NewK9Form({ onClose, onCreated, agents = [], record = null }) {
  const isEdit = !!record;
  const [form, setForm] = useState(record ? {
    nom: record.nom || '', race: record.race || '', specialite: record.specialite || '',
    agent_referent_id: record.agent_referent_id || '', statut: record.statut || 'actif',
  } : { nom: '', race: '', specialite: '', agent_referent_id: '', statut: 'actif' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const payload = { ...form, agent_referent_id: form.agent_referent_id || null };
    const { error: err } = isEdit
      ? await supabase.from('k9_dogs').update(payload).eq('id', record.id)
      : await supabase.from('k9_dogs').insert(payload);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Modifier le chien' : 'Nouveau chien K9'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nom"><input required className={inputCls} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></Field>
        <Field label="Race"><input className={inputCls} value={form.race} onChange={e => setForm({ ...form, race: e.target.value })} /></Field>
        <Field label="Spécialité"><input className={inputCls} placeholder="Détection, dissuasion..." value={form.specialite} onChange={e => setForm({ ...form, specialite: e.target.value })} /></Field>
        <Field label="Maître-chien référent">
          <select className={inputCls} value={form.agent_referent_id} onChange={e => setForm({ ...form, agent_referent_id: e.target.value })}>
            <option value="">— Non assigné —</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.nom_complet}</option>)}
          </select>
        </Field>
        {isEdit && (
          <Field label="Statut">
            <select className={inputCls} value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
              <option value="actif">Actif</option>
              <option value="retraite">Retraité</option>
              <option value="inactif">Archivé</option>
            </select>
          </Field>
        )}
        <SubmitBar onCancel={onClose} loading={loading} error={error} label={isEdit ? 'Enregistrer' : 'Créer'} />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVEAU DISPOSITIF (CCTV/alarme/tracking)
// ============================================================
export function NewDeviceForm({ onClose, onCreated, sites = [], record = null }) {
  const isEdit = !!record;
  const [form, setForm] = useState(record ? {
    site_id: record.site_id || '', type: record.type || 'cctv_camera', label: record.label || '',
    statut: record.statut || 'actif', stream_url: record.stream_url || '',
  } : { site_id: '', type: 'cctv_camera', label: '', statut: 'actif', stream_url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const payload = { ...form, site_id: form.site_id || null, stream_url: form.stream_url || null };
    const { error: err } = isEdit
      ? await supabase.from('devices').update(payload).eq('id', record.id)
      : await supabase.from('devices').insert(payload);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Modifier le dispositif' : 'Nouveau dispositif'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Type">
          <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="cctv_camera">Caméra CCTV</option>
            <option value="alarm_panel">Centrale alarme</option>
            <option value="smart_lock">Serrure connectée</option>
            <option value="fire_detector">Détecteur incendie</option>
            <option value="panic_button">Bouton panique</option>
            <option value="gps_tracker">Traceur GPS</option>
          </select>
        </Field>
        <Field label="Libellé"><input className={inputCls} placeholder="Ex: Entrée principale" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></Field>
        <Field label="Site">
          <select className={inputCls} value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })}>
            <option value="">— Sélectionner —</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </Field>
        {isEdit && (
          <>
            <Field label="URL du flux vidéo (une fois raccordé)"><input className={inputCls} placeholder="https://..." value={form.stream_url} onChange={e => setForm({ ...form, stream_url: e.target.value })} /></Field>
            <Field label="Statut">
              <select className={inputCls} value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                <option value="actif">Actif</option>
                <option value="hors_ligne">Hors ligne</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </Field>
          </>
        )}
        <SubmitBar onCancel={onClose} loading={loading} error={error} label={isEdit ? 'Enregistrer' : 'Créer'} />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVEAU CONTRAT (RH)
// ============================================================
// ============================================================
// FORMULAIRE : NOUVEAU POINT DE RONDE (checkpoint)
// ============================================================
export function NewCheckpointForm({ onClose, onCreated, sites = [] }) {
  const [form, setForm] = useState({ site_id: '', nom: '', ordre: '1', qr_code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  function genCode() {
    setForm(f => ({ ...f, qr_code: 'CKPT-' + Math.random().toString(36).slice(2, 10).toUpperCase() }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.site_id) { setError('Sélectionnez un site'); return; }
    setLoading(true); setError('');
    const payload = { ...form, ordre: Number(form.ordre) || 1, qr_code: form.qr_code || null };
    const { error: err } = await supabase.from('points_ronde').insert(payload);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title="Nouveau point de ronde" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Site">
          <select required className={inputCls} value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })}>
            <option value="">— Sélectionner —</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </Field>
        <Field label="Nom du point"><input required className={inputCls} placeholder="Ex: Entrée principale" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></Field>
        <Field label="Ordre dans la ronde"><input type="number" min="1" className={inputCls} value={form.ordre} onChange={e => setForm({ ...form, ordre: e.target.value })} /></Field>
        <Field label="Code QR">
          <div className="flex gap-2">
            <input className={inputCls} value={form.qr_code} onChange={e => setForm({ ...form, qr_code: e.target.value })} />
            <button type="button" onClick={genCode} className="text-xs px-3 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 whitespace-nowrap">Générer</button>
          </div>
        </Field>
        <SubmitBar onCancel={onClose} loading={loading} error={error} />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVEL ARTICLE DE STOCK
// ============================================================
export function NewStockForm({ onClose, onCreated, sites = [] }) {
  const [form, setForm] = useState({ reference: '', nom: '', type: '', quantite_totale: '1', quantite_disponible: '1', site_id: '', prix_unitaire: '', fournisseur: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const payload = {
      ...form, site_id: form.site_id || null,
      quantite_totale: Number(form.quantite_totale) || 0,
      quantite_disponible: Number(form.quantite_disponible) || 0,
      prix_unitaire: form.prix_unitaire ? Number(form.prix_unitaire) : null,
    };
    const { error: err } = await supabase.from('materiel_stock').insert(payload);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title="Nouvel article de stock" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nom de l'article"><input required className={inputCls} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></Field>
        <Field label="Référence"><input className={inputCls} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></Field>
        <Field label="Type"><input className={inputCls} placeholder="Tenue, radio, torche..." value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantité totale"><input type="number" min="0" className={inputCls} value={form.quantite_totale} onChange={e => setForm({ ...form, quantite_totale: e.target.value })} /></Field>
          <Field label="Quantité disponible"><input type="number" min="0" className={inputCls} value={form.quantite_disponible} onChange={e => setForm({ ...form, quantite_disponible: e.target.value })} /></Field>
        </div>
        <Field label="Site (si affecté)">
          <select className={inputCls} value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })}>
            <option value="">— Stock central —</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </Field>
        <Field label="Prix unitaire (FCFA)"><input type="number" className={inputCls} value={form.prix_unitaire} onChange={e => setForm({ ...form, prix_unitaire: e.target.value })} /></Field>
        <Field label="Fournisseur"><input className={inputCls} value={form.fournisseur} onChange={e => setForm({ ...form, fournisseur: e.target.value })} /></Field>
        <SubmitBar onCancel={onClose} loading={loading} error={error} />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVELLE EVALUATION
// ============================================================
export function NewEvaluationForm({ onClose, onCreated, agents = [] }) {
  const [form, setForm] = useState({ agent_id: '', periode: '', score_assiduite: '2', score_consignes: '2', score_ecrits: '2', score_presentation: '2', score_relation_client: '2', commentaire: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    if (!form.agent_id) { setError('Sélectionnez un agent'); return; }
    setLoading(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      ...form,
      score_assiduite: Number(form.score_assiduite), score_consignes: Number(form.score_consignes),
      score_ecrits: Number(form.score_ecrits), score_presentation: Number(form.score_presentation),
      score_relation_client: Number(form.score_relation_client), evalue_par: user?.id,
    };
    const { error: err } = await supabase.from('evaluations').insert(payload);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  const scoreField = (label, key) => (
    <Field label={`${label} (0-4)`}>
      <input type="number" min="0" max="4" className={inputCls} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
    </Field>
  );

  return (
    <Modal title="Nouvelle évaluation" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Agent">
          <select required className={inputCls} value={form.agent_id} onChange={e => setForm({ ...form, agent_id: e.target.value })}>
            <option value="">— Sélectionner —</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.nom_complet}</option>)}
          </select>
        </Field>
        <Field label="Période"><input required className={inputCls} placeholder="Ex: S1 2026" value={form.periode} onChange={e => setForm({ ...form, periode: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          {scoreField('Assiduité', 'score_assiduite')}
          {scoreField('Consignes', 'score_consignes')}
          {scoreField('Écrits', 'score_ecrits')}
          {scoreField('Présentation', 'score_presentation')}
        </div>
        {scoreField('Relation client', 'score_relation_client')}
        <Field label="Commentaire"><textarea rows={3} className={inputCls} value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} /></Field>
        <SubmitBar onCancel={onClose} loading={loading} error={error} />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVELLE SANCTION
// ============================================================
export function NewSanctionForm({ onClose, onCreated, agents = [] }) {
  const [form, setForm] = useState({ agent_id: '', niveau: 'rappel_verbal', motif: '', date_sanction: new Date().toISOString().slice(0, 10) });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    if (!form.agent_id) { setError('Sélectionnez un agent'); return; }
    setLoading(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('sanctions').insert({ ...form, decide_par: user?.id });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title="Nouvelle sanction" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Agent">
          <select required className={inputCls} value={form.agent_id} onChange={e => setForm({ ...form, agent_id: e.target.value })}>
            <option value="">— Sélectionner —</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.nom_complet}</option>)}
          </select>
        </Field>
        <Field label="Niveau">
          <select className={inputCls} value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })}>
            <option value="rappel_verbal">Rappel verbal</option>
            <option value="avertissement_ecrit">Avertissement écrit</option>
            <option value="mise_a_pied">Mise à pied</option>
            <option value="licenciement">Licenciement</option>
          </select>
        </Field>
        <Field label="Motif"><textarea required rows={3} className={inputCls} value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} /></Field>
        <Field label="Date"><input type="date" className={inputCls} value={form.date_sanction} onChange={e => setForm({ ...form, date_sanction: e.target.value })} /></Field>
        <SubmitBar onCancel={onClose} loading={loading} error={error} label="Enregistrer" />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : DEMANDE DE CONGE (cote agent)
// ============================================================
export function NewLeaveRequestForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ type: 'conge', date_debut: '', date_fin: '', motif: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('leaves').insert({ ...form, agent_id: user?.id, statut: 'demande' });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title="Demander un congé" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Type">
          <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="conge">Congé</option>
            <option value="maladie">Maladie</option>
            <option value="autre">Autre</option>
          </select>
        </Field>
        <Field label="Date de début"><input required type="date" className={inputCls} value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} /></Field>
        <Field label="Date de fin"><input required type="date" className={inputCls} value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} /></Field>
        <Field label="Motif (optionnel)"><textarea rows={2} className={inputCls} value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} /></Field>
        <SubmitBar onCancel={onClose} loading={loading} error={error} label="Envoyer la demande" />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVELLE PROMOTION
// ============================================================
export function NewPromotionForm({ onClose, onCreated, agents = [] }) {
  const [form, setForm] = useState({ agent_id: '', ancien_poste: '', nouveau_poste: '', date_effet: new Date().toISOString().slice(0, 10) });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    if (!form.agent_id) { setError('Sélectionnez un agent'); return; }
    setLoading(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('promotions').insert({ ...form, decide_par: user?.id });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title="Nouvelle promotion" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Agent">
          <select required className={inputCls} value={form.agent_id} onChange={e => setForm({ ...form, agent_id: e.target.value })}>
            <option value="">— Sélectionner —</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.nom_complet}</option>)}
          </select>
        </Field>
        <Field label="Ancien poste"><input className={inputCls} value={form.ancien_poste} onChange={e => setForm({ ...form, ancien_poste: e.target.value })} /></Field>
        <Field label="Nouveau poste"><input required className={inputCls} value={form.nouveau_poste} onChange={e => setForm({ ...form, nouveau_poste: e.target.value })} /></Field>
        <Field label="Date d'effet"><input type="date" className={inputCls} value={form.date_effet} onChange={e => setForm({ ...form, date_effet: e.target.value })} /></Field>
        <SubmitBar onCancel={onClose} loading={loading} error={error} />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVEL ABONNEMENT
// ============================================================
export function NewSubscriptionForm({ onClose, onCreated, sites = [], clients = [] }) {
  const [form, setForm] = useState({ client_id: '', site_id: '', type_abonnement: 'telesurveillance', montant_mensuel: '', date_debut: new Date().toISOString().slice(0, 10) });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    if (!form.client_id) { setError('Sélectionnez un client'); return; }
    setLoading(true); setError('');
    const payload = { ...form, site_id: form.site_id || null, montant_mensuel: Number(form.montant_mensuel) || 0 };
    const { error: err } = await supabase.from('subscriptions').insert(payload);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title="Nouvel abonnement" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Client">
          <select required className={inputCls} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
            <option value="">— Sélectionner —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nom_complet}</option>)}
          </select>
        </Field>
        <Field label="Site (optionnel)">
          <select className={inputCls} value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })}>
            <option value="">— Non lié à un site —</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className={inputCls} value={form.type_abonnement} onChange={e => setForm({ ...form, type_abonnement: e.target.value })}>
            <option value="telesurveillance">Télésurveillance</option>
            <option value="tracking_flotte">Tracking flotte</option>
            <option value="maintenance_preventive">Maintenance préventive</option>
            <option value="cosar_one_premium">COSAR ONE Premium</option>
          </select>
        </Field>
        <Field label="Montant mensuel (FCFA)"><input required type="number" className={inputCls} value={form.montant_mensuel} onChange={e => setForm({ ...form, montant_mensuel: e.target.value })} /></Field>
        <Field label="Date de début"><input type="date" className={inputCls} value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} /></Field>
        <SubmitBar onCancel={onClose} loading={loading} error={error} />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVEAU CONTRAT AGENT (RH)
// ============================================================
export function NewContractForm({ onClose, onCreated, agents = [], record = null }) {
  const isEdit = !!record;
  const [form, setForm] = useState(record ? {
    agent_id: record.agent_id || '', type: record.type || 'cdi', date_debut: record.date_debut || '',
    date_fin: record.date_fin || '', salaire_brut: record.salaire_brut ?? '', statut: record.statut || 'actif',
    document_url: record.document_url || '',
  } : { agent_id: '', type: 'cdi', date_debut: '', date_fin: '', salaire_brut: '', statut: 'actif', document_url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    if (!form.agent_id) { setError('Sélectionnez un agent'); return; }
    setLoading(true); setError('');
    const payload = { ...form, date_fin: form.date_fin || null, salaire_brut: form.salaire_brut ? Number(form.salaire_brut) : null };
    const { error: err } = isEdit
      ? await supabase.from('contracts').update(payload).eq('id', record.id)
      : await supabase.from('contracts').insert(payload);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Modifier le contrat' : 'Nouveau contrat agent'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Agent">
          <select required className={inputCls} value={form.agent_id} onChange={e => setForm({ ...form, agent_id: e.target.value })}>
            <option value="">— Sélectionner —</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.nom_complet}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="cdi">CDI</option>
            <option value="cdd">CDD</option>
            <option value="vacation">Vacation</option>
            <option value="prestation">Prestation</option>
          </select>
        </Field>
        <Field label="Date de début"><input required type="date" className={inputCls} value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} /></Field>
        <Field label="Date de fin (si CDD)"><input type="date" className={inputCls} value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} /></Field>
        <Field label="Salaire brut (FCFA)"><input type="number" className={inputCls} value={form.salaire_brut} onChange={e => setForm({ ...form, salaire_brut: e.target.value })} /></Field>
        {form.agent_id && (
          <AttachmentUpload agentId={form.agent_id} existingUrl={form.document_url} label="Contrat signé (PDF/photo)"
                             onUploaded={(path) => setForm(f => ({ ...f, document_url: path }))} />
        )}
        {isEdit && (
          <Field label="Statut">
            <select className={inputCls} value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
              <option value="actif">Actif</option>
              <option value="termine">Terminé</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </Field>
        )}
        <SubmitBar onCancel={onClose} loading={loading} error={error} label={isEdit ? 'Enregistrer' : 'Créer'} />
      </form>
    </Modal>
  );
}

// ============================================================
// FORMULAIRE : NOUVEAU CONTRAT COMMERCIAL (CRM, distinct des devis)
// ============================================================
export function NewCrmContractForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ client_nom: '', client_email: '', type_prestation: '', date_debut: new Date().toISOString().slice(0, 10), duree_mois: '', montant_mensuel: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const payload = {
      ...form,
      duree_mois: form.duree_mois ? Number(form.duree_mois) : null,
      montant_mensuel: form.montant_mensuel ? Number(form.montant_mensuel) : null,
      date_signature: form.date_debut,
    };
    const { error: err } = await supabase.from('crm_contracts').insert(payload);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose();
  }

  return (
    <Modal title="Nouveau contrat commercial" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Client"><input required className={inputCls} value={form.client_nom} onChange={e => setForm({ ...form, client_nom: e.target.value })} /></Field>
        <Field label="Email client"><input type="email" className={inputCls} value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} /></Field>
        <Field label="Type de prestation"><input className={inputCls} value={form.type_prestation} onChange={e => setForm({ ...form, type_prestation: e.target.value })} /></Field>
        <Field label="Date de début"><input type="date" className={inputCls} value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} /></Field>
        <Field label="Durée (mois)"><input type="number" className={inputCls} value={form.duree_mois} onChange={e => setForm({ ...form, duree_mois: e.target.value })} /></Field>
        <Field label="Montant mensuel (FCFA)"><input type="number" className={inputCls} value={form.montant_mensuel} onChange={e => setForm({ ...form, montant_mensuel: e.target.value })} /></Field>
        <SubmitBar onCancel={onClose} loading={loading} error={error} />
      </form>
    </Modal>
  );
}

