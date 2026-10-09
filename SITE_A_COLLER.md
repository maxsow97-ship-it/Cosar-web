# Ce que vous mettez sur le site cosar-group.online

## 1. La balise du chat (obligatoire)

À coller dans `index.html` (et dans chaque page où vous voulez le chat), juste avant `</body>` :

```html
<script src="https://cosar-web.vercel.app/cosar-ai-widget.js"
        data-api="https://cosar-web.vercel.app/api/ai"
        data-whatsapp="221773259658"
        data-phone="+221773259658"
        data-email="commercial@cosar-group.online"
        defer></script>
```

- `data-whatsapp` : numéro au format international, sans « + » ni espaces. Celui ci-dessus vient de votre profil : remplacez-le par le numéro officiel COSAR si vous en avez un.
- `data-phone` et `data-email` : affichés dans les boutons de repli quand l'assistant est indisponible.
- Facultatif : `data-logo="https://cosar-web.vercel.app/cosar-shield.png"` pour afficher le bouclier maître dans l'en-tête du chat (il se pose sur une carte blanche, conformément à la règle de contraste).
- Ne mettez jamais de clé secrète dans le site. Le site ne contient que cette balise.

Si le fichier `cosar-ai-widget.js` n'est pas encore en ligne sur Vercel, la balise ne fait rien et le site reste intact. Mettez donc d'abord le widget sur GitHub, puis la balise sur le site.

## 2. Boutons « Demander un devis » existants

Pour que vos boutons actuels ouvrent le chat, ajoutez cet attribut :

```html
<a href="#contact" onclick="CosarAI.open(); return false;">Demander un devis</a>
```

Le lien `#contact` reste le repli si JavaScript est désactivé.

## 3. Bloc de texte à placer sur la page d'accueil (facultatif)

**Titre :** Votre assistant COSAR, 24h/24

**Texte :**
Décrivez votre besoin de sécurité à COSAR AI : type de site, localisation, nombre d'agents, horaires. Il prépare votre demande de devis et la transmet à un responsable COSAR, qui la valide et vous répond. COSAR AI ne remplace pas les secours : en cas de danger immédiat, appelez la Police au 17, les Sapeurs-pompiers au 18 ou le SAMU au 1515.

**Bouton :** Demander un devis

## 4. Mention de confidentialité (pied de page ou page « Mentions légales »)

> **Assistant COSAR AI.** Vos échanges avec COSAR AI sont conservés 90 jours pour suivre les demandes et assurer la sécurité du service, puis supprimés. Vos coordonnées (nom, société, téléphone, email) ne sont ajoutées à une demande de devis qu'avec votre accord explicite et servent uniquement à la traiter. Vous pouvez demander la suppression de vos données en écrivant à COSAR. Pour reconnaître votre navigateur d'une visite à l'autre, le chat enregistre un identifiant anonyme dans votre navigateur. COSAR AI est un assistant automatisé : ses réponses n'engagent pas COSAR tant qu'un responsable n'a pas validé un devis. N'y saisissez pas d'informations sensibles.

Faites relire ce texte par votre conseil juridique (Jean Marc) avant publication, notamment au regard de la loi sénégalaise sur les données personnelles.

## 5. Points de vigilance

- **Domaine bloqué (serverHold)** : tant que `cosar-group.online` est bloqué, testez le site par l'URL directe OVH `cosargz.cluster129.hosting.ovh.net` (déjà autorisée par l'API). Les adresses `commercial@` et `contact@` peuvent aussi être inaccessibles : mettez à jour la fiche « contact » de la base de connaissances si besoin, et envoyez les alertes de leads vers une adresse qui fonctionne.
- **Mentions légales** : gardez NINEA, RCCM et agrément du Ministère de l'Intérieur avec la mention « en cours ».
- **Pas de chiffres inventés** : ne mettez ni nombre d'années d'expérience, ni nombre de clients, ni taux de satisfaction à côté du chat tant qu'ils ne sont pas vérifiables.
- **Slogan** : le chat et le site utilisent « Exigence. Présence. Confiance. ». « L'œil qui veille » reste réservé à COSAR ONE.
