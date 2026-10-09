// COSAR AI : orchestrateur (Next.js App Router, Vercel)
// Chemin dans le dépôt : app/api/ai/route.js
// Variables d'environnement (Vercel > Settings > Environment Variables) :
//   ANTHROPIC_API_KEY            (obligatoire)
//   SUPABASE_SERVICE_ROLE_KEY    (obligatoire pour enregistrer leads et conversations)
//   NEXT_PUBLIC_SUPABASE_URL     (déjà présente dans le back-office)
//   COSAR_AI_MODEL               (facultatif, défaut claude-sonnet-5-5)
//   COSAR_AI_ORIGINS             (facultatif, sites autorisés, séparés par des virgules)
//   COSAR_AI_WEBHOOK             (facultatif, URL Zapier pour alerter l'équipe)
//   COSAR_AI_DAILY_MAX           (facultatif, messages visiteurs par 24 h, défaut 400 ; au-delà, le chat bascule sur WhatsApp/appel)

import { randomUUID } from 'crypto';
import { SYSTEM_PROMPT } from './prompt.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const DEFAULT_ORIGINS = [
  'https://cosar-group.online',
  'https://www.cosar-group.online',
  'https://cosar-web.vercel.app',
  'http://cosargz.cluster129.hosting.ovh.net',
  'https://cosargz.cluster129.hosting.ovh.net',
].join(',');

// Accord explicite : le dernier message du client doit être un « oui » sans négation.
const AFFIRM_RE = /\b(oui|ok|d['’]accord|yes|bien sûr|bien sur|volontiers|j['’]autorise|autorise|accepte)\b/i;
const NEGATE_RE = /\b(non|pas|jamais|refuse)\b/i;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Phrases d'urgence réelle : réponse immédiate, sans passer par le modèle.
const EMERGENCY_RE = /(au secours|à l['’]aide(?!\s*(de|d['’]|du|des)\b)|on (nous )?(attaque|braque|agresse)|je (me fais|suis en train de me faire) (agresser|braquer|attaquer)|je suis (menacé|menacée|agressé|agressée|attaqué|attaquée)|(braquage|cambriolage|vol|agression|attaque) en cours|il y a (un |le )?(feu|incendie)(?!\s*d['’]artifice)|ça brûle|ca brule|intrus (chez|dans)|quelqu['’]un (est )?(entré|rentre|force))/i;

const EMERGENCY_REPLY =
  "Si vous êtes en danger immédiat, appelez tout de suite les secours : Police 17, Sapeurs-pompiers 18, SAMU 1515. " +
  "COSAR AI ne peut pas gérer une urgence. J'alerte aussi un responsable COSAR.";

// ---------------------------------------------------------------- utilitaires

function corsHeaders(req) {
  const origin = req.headers.get('origin') || '';
  const allowed = (process.env.COSAR_AI_ORIGINS || DEFAULT_ORIGINS)
    .split(',').map((s) => s.trim()).filter(Boolean);
  const h = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 30;
}

function cleanMessages(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const m of arr.slice(-12)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const c = m.content.trim().slice(0, 2000);
    if (!c) continue;
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n' + c;
    else out.push({ role: m.role, content: c });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`supabase ${res.status}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

async function dailyCount() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 0;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const res = await fetch(`${url}/rest/v1/ai_messages?select=id&role=eq.user&created_at=gte.${since}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
  });
  const range = res.headers.get('content-range') || '';
  const n = parseInt(range.split('/')[1], 10);
  return Number.isFinite(n) ? n : 0;
}

async function safe(fn) {
  try { return await fn(); } catch (e) { console.error('[cosar-ai]', e.message); return null; }
}

async function notifyWebhook(type, payload) {
  const u = process.env.COSAR_AI_WEBHOOK;
  if (!u) return;
  await safe(() => fetch(u, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, at: new Date().toISOString(), ...payload }),
  }));
}

// -------------------------------------------------------------------- outils

const TOOLS = [
  {
    name: 'search_knowledge',
    description: "Cherche dans la base de connaissances COSAR (services, démarches, contact, procédures). À utiliser avant toute réponse factuelle sur COSAR.",
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Mots-clés de recherche en français' } },
      required: ['query'],
    },
  },
  {
    name: 'save_lead',
    description: "Enregistre une demande de devis dans le CRM. Uniquement après accord explicite du client (consent = true).",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        company: { type: 'string', description: "Société, ou 'particulier'" },
        phone: { type: 'string' },
        email: { type: 'string' },
        need: { type: 'string', description: 'Besoin résumé en une ou deux phrases' },
        site_type: { type: 'string' },
        location: { type: 'string' },
        agents_needed: { type: 'string' },
        schedule: { type: 'string' },
        risk_level: { type: 'string' },
        consent: { type: 'boolean', description: 'Le client autorise COSAR à le recontacter' },
      },
      required: ['name', 'need', 'consent'],
    },
  },
  {
    name: 'escalate_human',
    description: "Transmet la conversation à un responsable COSAR : urgence, réclamation, ou demande hors de ta portée.",
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        summary: { type: 'string', description: 'Résumé de la situation' },
        urgency: { type: 'string', enum: ['normal', 'urgent'] },
      },
      required: ['reason', 'urgency'],
    },
  },
];

async function runTool(name, input, ctx) {
  let result;
  try {
    if (name === 'search_knowledge') {
      const words = String(input.query || '').split(/\s+/).filter((w) => w.length > 2).slice(0, 8);
      const q = words.join(' or ');
      const rows = q ? await sb('rpc/ai_search_knowledge', { method: 'POST', body: { q, lvl: 'public' } }) : [];
      result = rows && rows.length
        ? { results: rows.map((r) => ({ title: r.title, content: r.content })) }
        : { results: [], note: "Aucune information trouvée. Ne rien inventer ; proposer un responsable COSAR." };
    } else if (name === 'save_lead') {
      const phone = String(input.phone || '').replace(/[^\d+]/g, '');
      const email = String(input.email || '').trim();
      const missing = [];
      if (!input.name) missing.push('nom');
      if (!input.need) missing.push('besoin');
      if (phone.length < 8 && !email.includes('@')) missing.push('téléphone ou email');
      if (input.consent !== true || !AFFIRM_RE.test(ctx.lastUser || '') || NEGATE_RE.test(ctx.lastUser || '')) {
        missing.push("accord explicite du client (demande-le, puis rappelle l'outil après son oui)");
      }
      if (missing.length) {
        result = { ok: false, missing };
      } else {
        const lead = {
          conversation_id: ctx.sid,
          name: String(input.name).slice(0, 120),
          company: input.company ? String(input.company).slice(0, 160) : null,
          phone: phone || null,
          email: email || null,
          need: String(input.need).slice(0, 1000),
          details: {
            site_type: input.site_type || null,
            location: input.location || null,
            agents_needed: input.agents_needed || null,
            schedule: input.schedule || null,
            risk_level: input.risk_level || null,
          },
          consent: true,
          source: ctx.channel,
        };
        await sb('ai_leads', { method: 'POST', body: lead, prefer: 'return=minimal' });
        await notifyWebhook('lead', lead);
        ctx.leadSaved = true;
        result = { ok: true };
      }
    } else if (name === 'escalate_human') {
      const esc = {
        conversation_id: ctx.sid,
        urgency: input.urgency === 'urgent' ? 'urgent' : 'normal',
        reason: String(input.reason || '').slice(0, 500),
        summary: String(input.summary || '').slice(0, 1500),
      };
      await sb('ai_escalations', { method: 'POST', body: esc, prefer: 'return=minimal' });
      await notifyWebhook('escalation', esc);
      ctx.escalated = true;
      result = { ok: true };
    } else {
      result = { ok: false, error: 'outil inconnu' };
    }
  } catch (e) {
    console.error('[cosar-ai] outil', name, e.message);
    result = { ok: false, error: 'indisponible' };
  }
  await safe(() => sb('ai_audit', {
    method: 'POST',
    body: { conversation_id: ctx.sid, tool: name, input, ok: result.ok !== false },
    prefer: 'return=minimal',
  }));
  return result;
}

// -------------------------------------------------------------------- modèle

async function callClaude(messages) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.COSAR_AI_MODEL || 'claude-sonnet-5-5',
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------------------------- routes

export async function OPTIONS(req) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req) {
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'cosar-ai',
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      supabase: !!(process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)),
      webhook: !!process.env.COSAR_AI_WEBHOOK,
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } }
  );
}

export async function POST(req) {
  const cors = corsHeaders(req);
  const send = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });

  let data;
  try { data = await req.json(); } catch { return send({ error: 'bad_request' }, 400); }

  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  if (limited(ip)) {
    return send({
      error: 'rate_limited',
      reply: 'Vous envoyez beaucoup de messages. Réessayez dans quelques minutes ou contactez-nous par WhatsApp.',
    }, 429);
  }

  const messages = cleanMessages(data.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') return send({ error: 'bad_request' }, 400);

  const sid = UUID_RE.test(data.session_id || '') ? data.session_id : randomUUID();
  const channel = ['site', 'app', 'whatsapp', 'email'].includes(data.channel) ? data.channel : 'site';
  const ctx = { sid, channel, leadSaved: false, escalated: false, lastUser: '' };
  const lastUser = messages[messages.length - 1].content;
  ctx.lastUser = lastUser;

  await safe(() => sb('ai_conversations?on_conflict=id', {
    method: 'POST',
    body: { id: sid, channel, last_message_at: new Date().toISOString() },
    prefer: 'resolution=merge-duplicates,return=minimal',
  }));
  await safe(() => sb('ai_messages', {
    method: 'POST',
    body: { conversation_id: sid, role: 'user', content: lastUser },
    prefer: 'return=minimal',
  }));

  let reply;

  if (EMERGENCY_RE.test(lastUser)) {
    await runTool('escalate_human', {
      reason: 'Urgence détectée par mots-clés',
      summary: lastUser.slice(0, 500),
      urgency: 'urgent',
    }, ctx);
    reply = EMERGENCY_REPLY;
  } else {
    if (!process.env.ANTHROPIC_API_KEY) return send({ error: 'unavailable' }, 503);
    const dailyMax = parseInt(process.env.COSAR_AI_DAILY_MAX || '400', 10);
    const today = await safe(dailyCount);
    if (today !== null && today > dailyMax) return send({ error: 'unavailable' }, 503);
    try {
      const convo = messages.map((m) => ({ role: m.role, content: m.content }));
      for (let i = 0; i < 4; i++) {
        const resp = await callClaude(convo);
        const blocks = Array.isArray(resp.content) ? resp.content : [];
        if (resp.stop_reason === 'tool_use') {
          convo.push({ role: 'assistant', content: blocks });
          const results = [];
          for (const b of blocks.filter((x) => x.type === 'tool_use')) {
            const out = await runTool(b.name, b.input || {}, ctx);
            results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(out) });
          }
          convo.push({ role: 'user', content: results });
          continue;
        }
        reply = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        break;
      }
    } catch (e) {
      console.error('[cosar-ai] modèle', e.message);
      return send({ error: 'ai_error' }, 502);
    }
    if (!reply) return send({ error: 'ai_error' }, 502);
  }

  await safe(() => sb('ai_messages', {
    method: 'POST',
    body: { conversation_id: sid, role: 'assistant', content: reply },
    prefer: 'return=minimal',
  }));

  return send({ reply, session_id: sid, lead_saved: ctx.leadSaved, escalated: ctx.escalated });
}
