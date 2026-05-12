import{f as k}from"./index-DqvpzDjp.js";import{s as v}from"./alertes-Dtfuv4pJ.js";const G=`Tu es **Marius**, l'assistant IA spécialisé en élevage porcin de PorcTrack 8.

## Profil
Tu es un expert technique en gestion de troupeau porcin (GTTT), avec une maîtrise complète des spécificités de l'élevage en Afrique de l'Ouest, particulièrement en Côte d'Ivoire. Tu accompagnes les éleveurs sur leur cycle de production, leurs alertes biologiques, et leur performance économique.

## Connaissances métier obligatoires

### Cycle biologique porcin
- **Gestation** : 115 jours (±2)
- **Lactation / Sevrage** : 28 jours
- **Retour en chaleur post-sevrage** : 3-7 jours (médian J+5)
- **Échographie** : entre J25 et J35 post-saillie pour confirmer la gestation
- **Mise-bas** : J115, fenêtre J-3 à J+2
- **Post-sevrage** : J28 → J63 (~35 jours)
- **Croissance** : J63 → J100 (~37 jours)
- **Engraissement** : J100 → J180 (~80 jours)
- **Finition** : J180+ ou poids ≥ 100 kg
- **Sortie abattoir** : poids ≥ 110 kg

### 16 règles d'alerte biologique (R1-R16)
- R1 Mise-bas (J-3 à J+2)
- R2 Sevrage (J+28 post naissance)
- R3 Retour en chaleur (J+3 à J+7 post sevrage)
- R4 Mortalité (>15% du lot)
- R5 Stock aliment (rupture ou seuil bas)
- R5b Stock véto (rupture ou seuil bas)
- R6 Regroupement (2+ bandes sevrables)
- R7 Échographie (J25-J35)
- R8 Re-saillie (retour chaleur détecté)
- R9 Retard phase
- R10 Surdensité (>capacité loges engraissement)
- R11 Réforme performance
- R12 Réforme inactivité (>90j)
- R13 Manque de pesée (>21j)
- R14 Portée orpheline (truie morte)
- R15 Passage de phase (poids ou âge)
- R16 Sortie abattoir (poids ≥110kg)

### KPIs techniques
- **ISSE** : Indice Sevré-Saillie (porcelets sevrés / saillies). Référence : >12 excellent, 10-12 bon, <10 à améliorer
- **IEM** : Intervalle Entre Mises-bas
- **GMQ** : Gain Moyen Quotidien
- **Taux mise-bas** : pourcentage de saillies qui aboutissent à une MB
- **Nés vivants/portée** : référence métier 11-13
- **Mortalité naissance → sevrage** : référence < 8%

### Vocabulaire métier
- Truie (femelle reproductrice), verrat (mâle reproducteur), porcelet (jeune)
- Bande = lot de truies/animaux suivies en phase synchronisée
- Loge = logement physique
- Statuts : "En attente saillie", "Pleine" (gestante), "En maternité" (lactation), "Réforme", "Vide"
- Saillie = accouplement (J0 du cycle)
- Mise-bas (MB) = accouchement
- Réforme = sortie définitive du troupeau (perf insuffisante, blessure, âge)

### Contexte économique
- Devise : FCFA en Côte d'Ivoire (1 EUR ≈ 656 FCFA)
- Prix vente porc : ~2100 FCFA/kg vif
- Coûts fixes : ~5000 FCFA/porc

## Comportement
- **Réponds toujours en français**
- **Ton vouvoiement direct mais chaleureux** (style "vous" — jamais "tu")
- **Réponses courtes et actionnables** (3-5 phrases max sauf si question complexe)
- Si la question est **métier porcin**, donne une réponse précise avec les valeurs de référence
- Si la question est **hors-domaine** (politique, météo, divertissement), redirige poliment vers ton expertise élevage
- **Cite les règles GTTT** quand pertinent (ex : "selon la règle R7, l'échographie se fait entre J25 et J35")
- **Format** : listes à puces pour les énumérations, gras (**texte**) pour les valeurs critiques

## Limites
- Tu ne donnes **pas** de prescription vétérinaire (renvoie vers le véto)
- Tu ne décides **pas** à la place de l'éleveur (tu conseilles)
- Tu ne connais **pas** les données live de la ferme (truie T-001, alertes en cours) sauf si fournies dans le message`,A=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"],T={CRITIQUE:0,HAUTE:1,NORMALE:2,INFO:3};function E(e){const t=A[e.getDay()]??"",r=e.toISOString().slice(0,10);return`${t} ${r}`}function I(e){var n,o;const t=e.displayId||e.id,r=(n=e.stade)==null?void 0:n.trim(),i=((o=e.statut)==null?void 0:o.trim())||"?",s=r?`${r}, ${i}`:i;return`${t} (${s})`}function M(e){const t=k({id:e.id,idPortee:e.idPortee,truieMere:e.truie,dateMB:e.dateMB}),r=e.truie?`mère ${e.truie}`:"",i=typeof e.nv=="number"?`${e.vivants??e.nv} porcelets`:"",s=e.dateSevragePrevue?`sevrage ${e.dateSevragePrevue}`:"",n=[e.statut,r,i,s].filter(Boolean).join(", ");return`${t} (${n})`}function q(e){const t="libelle"in e?e.libelle:e.produit,r=e.stockActuel??0,i=e.unite||"",s=e.statutStock||(r<=0?"RUPTURE":"OK");return`${t} ${r}${i} (${s})`}function P(e){return`${e.priority} ${e.subjectLabel||e.subjectId} — ${e.title}`}function J(e,t){const r=i=>{const s=(i.statut||"").toLowerCase();return s.includes("maternit")?0:s.includes("attente saillie")||s.includes("surveiller")?1:s.includes("pleine")?2:3};return[...e].sort((i,s)=>r(i)-r(s)).slice(0,t)}function S(e){return e.filter(t=>{const r=(t.statutStock||"").toUpperCase();return r==="RUPTURE"||r==="BAS"?!0:(t.stockActuel??0)<=0})}function U(e,t){return[...e].sort((r,i)=>{const s=T[r.priority]-T[i.priority];return s!==0?s:(i.daysOffset??0)-(r.daysOffset??0)}).filter(r=>r.priority==="CRITIQUE"||r.priority==="HAUTE").slice(0,t)}function V(e,t={}){const{userName:r="éleveur",now:i=new Date,maxTruies:s=6,maxBandes:n=5,maxAlerts:o=8}=t,c=e.truies.filter(g=>{const m=(g.statut||"").toLowerCase();return!m.includes("réforme")&&!m.includes("reforme")&&!m.includes("mort")}),a=e.verrats.filter(g=>{const m=(g.statut||"").toLowerCase();return!m.includes("réforme")&&!m.includes("reforme")&&!m.includes("mort")}),l=e.bandes.filter(g=>(g.statut||"").toUpperCase()!=="RECAP"),u=l.reduce((g,m)=>g+(m.vivants??m.nv??0),0),f=J(c,s),h=l.slice(0,n),R=[...S(e.stockAliment),...S(e.stockVeto)],p=U(e.alerts,o),d=[];return d.push("[CONTEXTE FERME — ne pas afficher dans la réponse, utilise-le pour répondre]"),d.push(`Date : ${E(i)}. Utilisateur : ${r}.`),d.push(`Ferme : ${e.nomFerme}${e.pays?` (${e.pays})`:""}. Cheptel : ${c.length} truies actives, ${a.length} verrats actifs, ${l.length} bandes en cours, ${u} porcelets sous bandes.`),f.length>0&&d.push(`Truies à surveiller : ${f.map(I).join(" · ")}.`),h.length>0&&d.push(`Bandes en cours : ${h.map(M).join(" · ")}.`),R.length>0?d.push(`Stocks critiques : ${R.map(q).join(" · ")}.`):d.push("Stocks : OK (pas de rupture détectée)."),p.length>0?d.push(`Alertes prioritaires (${p.length}) : ${p.map(P).join(" · ")}.`):d.push("Alertes : aucune en priorité CRITIQUE/HAUTE."),d.push("[FIN CONTEXTE]"),d.join(`
`)}const y=864e5,j=new Set(["","CONFIRMEE","EN_ATTENTE","SAILLIE","PLEINE","ACTIVE"]);function $(e,t){return e?Math.floor((e.getTime()-t.getTime())/y):null}function b(e){const t=(e||"").toLowerCase();return t.includes("réforme")||t.includes("reforme")||t.includes("mort")}function B(e,t,r){const i=t.filter(a=>!b(a.statut)).filter(a=>{const l=v(a.dateMBPrevue),u=$(l,r);return u!==null&&u>=-3&&u<=3});if(i.length===0)return null;i.sort((a,l)=>{const u=v(a.dateMBPrevue),f=v(l.dateMBPrevue);return((u==null?void 0:u.getTime())??0)-((f==null?void 0:f.getTime())??0)});const s=i[0],n=$(v(s.dateMBPrevue),r)??0,o=s.displayId||s.id,c=n===0?"aujourd'hui":n>0?`J-${n}`:`J+${-n}`;return{id:`mb-imminente-${o}`,question:`Quelle checklist pour la mise-bas de ${o} (${c}) ?`,priority:1,category:"mise-bas"}}function F(e){const t=e.stockAliment.find(i=>(i.statutStock||"").toUpperCase()==="RUPTURE"||(i.stockActuel??0)<=0);if(t)return{id:`stock-rupture-${t.id}`,question:`Que commander en priorité ? ${t.libelle} est à zéro.`,priority:1,category:"stocks"};const r=e.stockVeto.find(i=>(i.statutStock||"").toUpperCase()==="RUPTURE"||(i.stockActuel??0)<=0);return r?{id:`stock-veto-rupture-${r.id}`,question:`Que commander en priorité ? ${r.produit} est à zéro.`,priority:1,category:"stocks"}:null}function L(e){const t=[...e.stockAliment,...e.stockVeto].find(i=>(i.statutStock||"").toUpperCase()==="BAS");if(!t)return null;const r="libelle"in t?t.libelle:t.produit;return{id:`stock-bas-${t.id}`,question:`Comment éviter la rupture sur ${r} (stock bas) ?`,priority:2,category:"stocks"}}function x(e,t,r){const i=e.filter(o=>(o.statut||"").toLowerCase().includes("attente saillie"));if(i.length===0)return null;let s=0;for(const o of i){const c=o.displayId||o.id,a=t.filter(u=>(u.truie||"")===c&&u.dateSevrageReelle).map(u=>v(u.dateSevrageReelle)).filter(u=>u!==null).sort((u,f)=>f.getTime()-u.getTime())[0];if(!a)continue;const l=Math.floor((r.getTime()-a.getTime())/y);l>=3&&l<=10&&(s+=1)}if(s===0)return null;const n=s>1;return{id:"retour-chaleur",question:`${s} truie${n?"s":""} attend${n?"ent":""} retour chaleur. Comment détecter et saillir au bon moment ?`,priority:2,category:"cycles"}}function N(e,t,r){if(t.length===0)return null;let i=0;for(const s of e){if(b(s.statut))continue;const n=[s.id,s.displayId].filter(Boolean),o=t.find(l=>n.includes(l.truieId)&&j.has((l.statut??"").toUpperCase()));if(!o)continue;const c=v(o.dateSaillie);if(!c)continue;const a=Math.floor((r.getTime()-c.getTime())/y);a>=25&&a<=35&&(i+=1)}return i===0?null:{id:"echo-fenetre",question:`${i} échographie${i>1?"s":""} à planifier (fenêtre J25-J35). Comment confirmer la gestation ?`,priority:2,category:"cycles"}}function O(e){const t=e.alerts.filter(r=>r.priority==="CRITIQUE");return t.length===0?null:{id:"alertes-critiques",question:`${t.length} alerte${t.length>1?"s":""} critique${t.length>1?"s":""} en cours. Par où commencer ?`,priority:1,category:"sante"}}function Q(e){const t=e.filter(r=>{const i=(r.statut||"").toUpperCase();return i.includes("CROISSANCE")||i.includes("FINITION")||i.includes("ENGRAISS")});return t.length<=6?null:{id:"surdensite",question:`${t.length} bandes en engraissement. Comment gérer la surdensité ?`,priority:2,category:"cycles"}}function w(e,t){const r=e.filter(i=>{const s=(i.statut||"").toLowerCase();if(!s.includes("sous mère")&&!s.includes("sous mere")||i.dateSevrageReelle)return!1;const n=v(i.dateMB);if(!n)return!1;const o=Math.floor((t.getTime()-n.getTime())/y);return o>=21&&o<=28});return r.length===0?null:{id:"sevrage-proche",question:`${r.length} bande${r.length>1?"s":""} bientôt sevrable${r.length>1?"s":""}. Quelle préparation post-sevrage ?`,priority:3,category:"cycles"}}const C=[{id:"fallback-priorites",question:"Que dois-je faire aujourd'hui en priorité ?",priority:4,category:"general"},{id:"fallback-tournee",question:"Quelle tournée pour mes truies pleines ?",priority:4,category:"general"},{id:"fallback-isse",question:"Comment améliorer mon ISSE ?",priority:4,category:"general"}];function K(e,t={}){const{now:r=new Date,max:i=3}=t,s=[],n=B(e.bandes,e.truies,r);n&&s.push(n);const o=F(e);o&&s.push(o);const c=O(e);c&&s.push(c);const a=x(e.truies,e.bandes,r);a&&s.push(a);const l=N(e.truies,e.saillies??[],r);l&&s.push(l);const u=Q(e.bandes);u&&s.push(u);const f=L(e);f&&s.push(f);const h=w(e.bandes,r);if(h&&s.push(h),s.length===0)return C.slice(0,i);s.sort((p,d)=>p.priority-d.priority);const R=new Set(s.map(p=>p.id));for(const p of C){if(s.length>=i)break;R.has(p.id)||s.push(p)}return s.slice(0,i)}export{G as M,V as a,K as b};
