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
    con
