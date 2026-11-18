/*! COSAR AI widget v1 : un seul fichier, aucune dépendance.
 * Chemin dans le dépôt : public/cosar-ai-widget.js
 * Balise à coller dans le site :
 * <script src="https://cosar-web.vercel.app/cosar-ai-widget.js"
 *   data-api="https://cosar-web.vercel.app/api/ai"
 *   data-whatsapp="221773259658" data-phone="+221773259658"
 *   data-email="commercial@cosar-group.online" defer></script>
 * Options : data-demo="true" (réponses simulées, aucune donnée envoyée),
 *           data-open="true" (ouvre le chat au chargement),
 *           data-logo="URL du bouclier PNG" (affiché sur carte blanche).
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------
   * Moteur de démonstration (sans serveur) : qualification d'un devis
   * ------------------------------------------------------------------ */
  function demoEngine() {
    var QUESTIONS = [
      { k: 'site', q: "Quel type de site souhaitez-vous protéger ? Bureaux, entrepôt, résidence, chantier, événement…" },
      { k: 'lieu', q: "Dans quel quartier ou quelle ville se trouve le site ?" },
      { k: 'agents', q: "Combien d'agents estimez-vous nécessaires, et sur quels horaires : jour, nuit ou 24h/24 ?" },
      { k: 'risque', q: "Y a-t-il un besoin particulier : contrôle des accès, rondes, sécurité incendie ?" },
      { k: 'nom', q: "Merci. Pour préparer votre demande de devis, quel est votre nom ?" },
      { k: 'tel', q: "Quel est votre numéro de téléphone ou votre email ?" },
      { k: 'societe', q: "Pour quelle société ? Répondez « particulier » si c'est à titre personnel." },
      { k: 'consent', q: "Autorisez-vous COSAR à vous recontacter avec ces informations ? Répondez oui ou non." }
    ];
    var i = -1, data = {};
    var YES = /^\s*(oui|ok|yes|d'accord|bien sûr|bien sur|volontiers)/i;

    function reply(text) {
      var t = String(text || '').trim();
      if (i >= 0) {
        data[QUESTIONS[i].k] = t;
        i++;
        if (i < QUESTIONS.length) return { text: QUESTIONS[i].q };
        i = -1;
        if (YES.test(data.consent)) {
          var lead = {
            name: data.nom, company: data.societe, contact: data.tel,
            need: data.site + ', ' + data.lieu + ', ' + data.agents + (data.risque ? ', ' + data.risque : ''),
            at: new Date().toISOString()
          };
          data = {};
          return {
            text: "Merci " + lead.name + ". Votre demande est enregistrée et un responsable COSAR vous recontactera pour valider le devis. Souhaitez-vous autre chose ?",
            lead: lead
          };
        }
        data = {};
        return { text: "C'est noté, rien n'a été enregistré. Vous pouvez aussi joindre un responsable directement par WhatsApp ou par téléphone." };
      }
      if (/urgen|au secours|à l'aide|agress|cambriol|braquage|incendie en cours|il y a le feu/i.test(t)) {
        return { text: "Si vous êtes en danger immédiat, appelez tout de suite : Police 17, Sapeurs-pompiers 18, SAMU 1515. Awa ne gère pas les urgences.", contact: true };
      }
      if (/devis|prix|tarif|combien|besoin|gardien|surveill|protéger|proteger/i.test(t)) {
        i = 0;
        return { text: "Avec plaisir, je prépare votre demande de devis. " + QUESTIONS[0].q };
      }
      if (/k9|chien|cynophil/i.test(t)) {
        return { text: "COSAR K9 (cynophilie) est en développement, sans date annoncée. Je peux enregistrer votre intérêt si vous le souhaitez." };
      }
      if (/service|propos|faites|offre/i.test(t)) {
        return { text: "Au lancement : gardiennage et surveillance humaine (COSAR SÉCURITÉ) et la plateforme COSAR ONE (COSAR TECH). En développement : sécurité incendie, formation, protection rapprochée, cynophilie, facility management et d'autres services. Souhaitez-vous un devis ?" };
      }
      if (/responsable|humain|parler|appeler|contact/i.test(t)) {
        return { text: "Bien sûr, voici comment joindre un responsable COSAR.", contact: true };
      }
      if (/bonjour|salut|hello|bonsoir/i.test(t)) {
        return { text: "Bonjour, ravi de vous aider. Souhaitez-vous découvrir nos services ou préparer un devis ?" };
      }
      return { text: "Je n'ai pas cette information. Je peux préparer une demande de devis, ou vous mettre en relation avec un responsable COSAR." };
    }
    return { reply: reply };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { demoEngine: demoEngine };
  if (typeof document === 'undefined') return;

  /* ------------------------------------------------------------------
   * Configuration
   * ------------------------------------------------------------------ */
  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  function attr(n, d) { var v = script && script.getAttribute('data-' + n); return v == null || v === '' ? d : v; }

  var CFG = {
    api: attr('api', ''),
    demo: attr('demo', 'false') === 'true',
    open: attr('open', 'false') === 'true',
    logo: attr('logo', ''),
    whatsapp: attr('whatsapp', ''),
    phone: attr('phone', ''),
    email: attr('email', '')
  };

  var CHIPS = ['Demander un devis', 'Nos services', 'Parler à un responsable'];
  var WELCOME = "Bonjour, je suis Awa, l'assistante COSAR GROUP. Je peux vous présenter nos services et préparer une demande de devis. Comment puis-je vous aider ?";

  var history = [];
  var sessionId = null;
  var demo = CFG.demo ? demoEngine() : null;
  var busy = false;

  try {
    sessionId = localStorage.getItem('cosar_ai_sid');
    if (!sessionId) {
      sessionId = (root.crypto && root.crypto.randomUUID) ? root.crypto.randomUUID() : null;
      if (sessionId) localStorage.setItem('cosar_ai_sid', sessionId);
    }
  } catch (e) { /* stockage indisponible : le serveur créera la session */ }

  /* ------------------------------------------------------------------
   * Styles : palette officielle (noir, or, marine, blanc)
   * ------------------------------------------------------------------ */
  var css = [
    '.cai,.cai *{box-sizing:border-box}',
    '.cai{font-family:"Work Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:15px;line-height:1.45;color:#10182C}',
    '.cai-fab{position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;align-items:center;gap:10px;border:0;cursor:pointer;background:#F8C018;color:#10182C;font:600 15px/1 "Work Sans",system-ui,sans-serif;padding:14px 18px;border-radius:999px;box-shadow:0 6px 20px rgba(16,24,44,.35)}',
    '.cai-fab:hover{background:#D9A600}',
    '.cai-fab:focus-visible,.cai-send:focus-visible,.cai-chip:focus-visible,.cai-x:focus-visible,.cai-in:focus-visible,.cai-btn:focus-visible{outline:3px solid #F8C018;outline-offset:2px}',
    '.cai-fab svg{width:22px;height:22px}',
    '.cai-panel{position:fixed;right:18px;bottom:18px;z-index:2147483001;width:370px;height:min(600px,calc(100vh - 36px));display:none;flex-direction:column;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 14px 44px rgba(16,24,44,.45)}',
    '.cai-panel.on{display:flex}',
    '.cai-head{display:flex;align-items:center;gap:12px;background:#182038;color:#fff;padding:12px 14px;border-bottom:3px solid #F8C018}',
    '.cai-logo{flex:none;width:40px;height:40px;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;font:700 15px/1 Oswald,"Work Sans",sans-serif;color:#182038;letter-spacing:.5px}',
    '.cai-logo img{max-width:80%;max-height:80%}',
    '.cai-ttl{flex:1;min-width:0}',
    '.cai-ttl b{display:block;font:600 17px/1.1 Oswald,"Work Sans",sans-serif;letter-spacing:.4px}',
    '.cai-ttl span{font-size:12px;color:#c9cfdd}',
    '.cai-x{flex:none;background:transparent;border:0;color:#fff;font-size:26px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:6px}',
    '.cai-log{flex:1;overflow-y:auto;padding:14px;background:#f4f5f8;display:flex;flex-direction:column;gap:10px}',
    '.cai-m{max-width:86%;padding:10px 12px;border-radius:12px;word-wrap:break-word;white-space:normal}',
    '.cai-m.bot{align-self:flex-start;background:#fff;color:#10182C;border:1px solid #dfe2ea;border-bottom-left-radius:4px}',
    '.cai-m.me{align-self:flex-end;background:#182038;color:#fff;border-bottom-right-radius:4px}',
    '.cai-dots{display:inline-flex;gap:4px;align-items:center;height:14px}',
    '.cai-dots i{width:6px;height:6px;border-radius:50%;background:#8a93a8;animation:caib 1s infinite ease-in-out}',
    '.cai-dots i:nth-child(2){animation-delay:.15s}.cai-dots i:nth-child(3){animation-delay:.3s}',
    '@keyframes caib{0%,80%,100%{opacity:.3}40%{opacity:1}}',
    '.cai-chips{display:flex;flex-wrap:wrap;gap:8px;align-self:flex-start}',
    '.cai-chip{border:1.5px solid #182038;background:#fff;color:#182038;font:500 14px/1 "Work Sans",system-ui,sans-serif;padding:9px 12px;border-radius:999px;cursor:pointer}',
    '.cai-chip:hover{background:#182038;color:#fff}',
    '.cai-card{align-self:stretch;background:#fff;border:1px solid #dfe2ea;border-left:4px solid #F8C018;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px}',
    '.cai-card p{margin:0;font-size:14px}',
    '.cai-btn{display:block;text-align:center;text-decoration:none;font:600 14px/1 "Work Sans",system-ui,sans-serif;padding:11px 12px;border-radius:8px;background:#182038;color:#fff}',
    '.cai-btn.g{background:#F8C018;color:#10182C}',
    '.cai-form{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #dfe2ea}',
    '.cai-in{flex:1;min-width:0;border:1.5px solid #c8ccd8;border-radius:10px;padding:11px 12px;font:16px "Work Sans",system-ui,sans-serif;color:#10182C}',
    '.cai-send{flex:none;border:0;cursor:pointer;background:#F8C018;color:#10182C;border-radius:10px;padding:0 16px;font:600 15px "Work Sans",system-ui,sans-serif}',
    '.cai-send:disabled{opacity:.5;cursor:default}',
    '.cai-foot{padding:7px 12px 9px;background:#fff;font-size:11.5px;color:#5b6479;text-align:center}',
    '@media (max-width:480px){.cai-panel{right:0;left:0;bottom:0;width:100%;height:88vh;border-radius:16px 16px 0 0}.cai-fab{right:12px;bottom:12px}}',
    '@media (prefers-reduced-motion:reduce){.cai-dots i{animation:none;opacity:.7}}'
  ].join('\n');

  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ------------------------------------------------------------------
   * Interface
   * ------------------------------------------------------------------ */
  var wrap = document.createElement('div');
  wrap.className = 'cai';
  var logoHtml = CFG.logo ? '<img src="' + CFG.logo.replace(/"/g, '') + '" alt="COSAR">' : 'AI';
  wrap.innerHTML =
    '<button class="cai-fab" type="button" aria-label="Ouvrir le chat avec Awa">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg>' +
      '<span>Parler à Awa</span></button>' +
    '<section class="cai-panel" role="dialog" aria-label="Assistante Awa">' +
      '<header class="cai-head"><div class="cai-logo">' + logoHtml + '</div>' +
        '<div class="cai-ttl"><b>Awa</b><span>Assistante COSAR GROUP — 24h/24</span></div>' +
        '<button class="cai-x" type="button" aria-label="Fermer">&times;</button></header>' +
      '<div class="cai-log" aria-live="polite"></div>' +
      '<form class="cai-form"><input class="cai-in" type="text" maxlength="500" placeholder="Écrivez votre message" aria-label="Votre message" autocomplete="off">' +
        '<button class="cai-send" type="submit">Envoyer</button></form>' +
      '<div class="cai-foot">Assistant automatisé : les devis sont validés par un responsable COSAR. En cas d\'urgence, appelez la Police 17, les Pompiers 18 ou le SAMU 1515.</div>' +
    '</section>';
  document.body.appendChild(wrap);

  var fab = wrap.querySelector('.cai-fab');
  var panel = wrap.querySelector('.cai-panel');
  var log = wrap.querySelector('.cai-log');
  var form = wrap.querySelector('.cai-form');
  var input = wrap.querySelector('.cai-in');
  var send = wrap.querySelector('.cai-send');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }
  function scroll() { log.scrollTop = log.scrollHeight; }

  function addMsg(role, text) {
    var d = document.createElement('div');
    d.className = 'cai-m ' + (role === 'user' ? 'me' : 'bot');
    d.innerHTML = fmt(text);
    log.appendChild(d);
    scroll();
    return d;
  }

  function addChips() {
    var c = document.createElement('div');
    c.className = 'cai-chips';
    CHIPS.forEach(function (label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cai-chip';
      b.textContent = label;
      b.addEventListener('click', function () { c.remove(); submit(label); });
      c.appendChild(b);
    });
    log.appendChild(c);
    scroll();
  }

  function contactCard(intro) {
    var d = document.createElement('div');
    d.className = 'cai-card';
    var html = '<p>' + esc(intro || 'Joindre un responsable COSAR :') + '</p>';
    if (CFG.whatsapp) {
      html += '<a class="cai-btn g" target="_blank" rel="noopener" href="https://wa.me/' + esc(CFG.whatsapp) +
        '?text=' + encodeURIComponent('Bonjour COSAR, je souhaite un renseignement ou un devis.') + '">Écrire sur WhatsApp</a>';
    }
    if (CFG.phone) html += '<a class="cai-btn" href="tel:' + esc(CFG.phone) + '">Appeler COSAR</a>';
    if (CFG.email) html += '<a class="cai-btn" href="mailto:' + esc(CFG.email) + '?subject=' + encodeURIComponent('Demande de devis COSAR') + '">Envoyer un email</a>';
    d.innerHTML = html;
    log.appendChild(d);
    scroll();
  }

  function typing() {
    var d = document.createElement('div');
    d.className = 'cai-m bot';
    d.innerHTML = '<span class="cai-dots" aria-label="Awa écrit"><i></i><i></i><i></i></span>';
    log.appendChild(d);
    scroll();
    return d;
  }

  function setBusy(v) { busy = v; send.disabled = v; input.disabled = v; if (!v) input.focus(); }

  /* ------------------------------------------------------------------
   * Envoi d'un message
   * ------------------------------------------------------------------ */
  function submit(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';

    if (text === 'Parler à un responsable') {
      var r0 = 'Bien sûr. Voici comment joindre un responsable COSAR.';
      addMsg('assistant', r0); history.push({ role: 'assistant', content: r0 });
      contactCard();
      return;
    }

    setBusy(true);
    var t = typing();

    if (demo) {
      setTimeout(function () {
        t.remove();
        var out = demo.reply(text);
        addMsg('assistant', out.text);
        history.push({ role: 'assistant', content: out.text });
        if (out.contact) contactCard();
        if (out.lead) {
          try { root.dispatchEvent(new CustomEvent('cosar-ai-lead', { detail: out.lead })); } catch (e) { /* ignoré */ }
        }
        setBusy(false);
      }, 650);
      return;
    }

    fetch(CFG.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12), session_id: sessionId, channel: 'site' })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, j: j }; });
    }).then(function (o) {
      t.remove();
      if (o.j && o.j.session_id) {
        sessionId = o.j.session_id;
        try { localStorage.setItem('cosar_ai_sid', sessionId); } catch (e) { /* ignoré */ }
      }
      if (o.j && o.j.reply) {
        addMsg('assistant', o.j.reply);
        history.push({ role: 'assistant', content: o.j.reply });
        if (o.j.escalated) contactCard('Un responsable COSAR est alerté. Vous pouvez aussi le joindre directement :');
      } else {
        history.pop();
        addMsg('assistant', "Je ne suis pas disponible pour le moment. Vous pouvez joindre l'équipe COSAR directement :");
        contactCard();
      }
      setBusy(false);
    }).catch(function () {
      t.remove();
      history.pop();
      addMsg('assistant', "Je ne suis pas disponible pour le moment. Vous pouvez joindre l'équipe COSAR directement :");
      contactCard();
      setBusy(false);
    });
  }

  /* ------------------------------------------------------------------
   * Ouverture, fermeture
   * ------------------------------------------------------------------ */
  var started = false;
  function openChat() {
    panel.classList.add('on');
    fab.style.display = 'none';
    if (!started) {
      started = true;
      addMsg('assistant', WELCOME);
      addChips();
    }
    setTimeout(function () { input.focus(); }, 50);
  }
  function closeChat() {
    panel.classList.remove('on');
    fab.style.display = '';
    fab.focus();
  }

  fab.addEventListener('click', openChat);
  wrap.querySelector('.cai-x').addEventListener('click', closeChat);
  form.addEventListener('submit', function (e) { e.preventDefault(); submit(input.value); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('on')) closeChat();
  });

  root.CosarAI = { open: openChat, close: closeChat };
  if (CFG.open) setTimeout(openChat, 900);
})(typeof window !== 'undefined' ? window : this);
