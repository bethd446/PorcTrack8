import{r as A}from"./vendor-react-CLPDdcgf.js";const ze="ionicons",N={hydratedSelectorName:"hydrated",lazyLoad:!1,updatable:!0};var Ce=Object.defineProperty,Le=(e,t)=>{for(var o in t)Ce(e,o,{get:t[o],enumerable:!0})},g=e=>{if(e.__stencil__getHostRef)return e.__stencil__getHostRef()},He=(e,t)=>{const o={$flags$:0,$hostElement$:e,$cmpMeta$:t,$instanceValues$:new Map};o.$onReadyPromise$=new Promise(a=>o.$onReadyResolve$=a),e["s-p"]=[],e["s-rc"]=[];const n=o;return e.__stencil__getHostRef=()=>n,n},Y=(e,t)=>t in e,P=(e,t)=>(0,console.error)(e,t),E=new Map,Ee="slot-fb{display:contents}slot-fb[hidden]{display:none}",V="http://www.w3.org/1999/xlink",k=typeof window<"u"?window:{},je=k.HTMLElement||class{},v={$flags$:0,$resourcesUrl$:"",jmp:e=>e(),raf:e=>requestAnimationFrame(e),ael:(e,t,o,n)=>e.addEventListener(t,o,n),rel:(e,t,o,n)=>e.removeEventListener(t,o,n),ce:(e,t)=>new CustomEvent(e,t)},qe=e=>Promise.resolve(e),le=(()=>{try{return new CSSStyleSheet,typeof new CSSStyleSheet().replaceSync=="function"}catch{}return!1})(),R=!1,ee=[],de=[],Ne=(e,t)=>o=>{e.push(o),R||(R=!0,v.raf(he))},te=e=>{for(let t=0;t<e.length;t++)try{e[t](performance.now())}catch(o){P(o)}e.length=0},he=()=>{te(ee),te(de),(R=ee.length>0)&&v.raf(he)},W=e=>qe().then(e),Pe=Ne(de),Te=e=>{const t=new URL(e,v.$resourcesUrl$);return t.origin!==k.location.origin?t.href:t.pathname},F=e=>(e=typeof e,e==="object"||e==="function");function Oe(e){var t,o,n;return(n=(o=(t=e.head)==null?void 0:t.querySelector('meta[name="csp-nonce"]'))==null?void 0:o.getAttribute("content"))!=null?n:void 0}var Ie=e=>e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),Ue={};Le(Ue,{err:()=>ye,map:()=>Re,ok:()=>D,unwrap:()=>De,unwrapErr:()=>Be});var D=e=>({isOk:!0,isErr:!1,value:e}),ye=e=>({isOk:!1,isErr:!0,value:e});function Re(e,t){if(e.isOk){const o=t(e.value);return o instanceof Promise?o.then(n=>D(n)):D(o)}if(e.isErr){const o=e.value;return ye(o)}throw"should never get here"}var De=e=>{if(e.isOk)return e.value;throw e.value},Be=e=>{if(e.isErr)return e.value;throw e.value};var S;function Ze(e){var t;const o=this.attachShadow({mode:"open"});S===void 0&&(S=(t=void 0)!=null?t:null),S&&o.adoptedStyleSheets.push(S)}var _=(e,t="")=>()=>{},x=new WeakMap,We=(e,t,o)=>{let n=E.get(e);le&&o?(n=n||new CSSStyleSheet,typeof n=="string"?n=t:n.replaceSync(t)):n=t,E.set(e,n)},Fe=(e,t,o)=>{var n;const a=pe(t),c=E.get(a);if(!k.document)return a;if(e=e.nodeType===11?e:k.document,c)if(typeof c=="string"){e=e.head||e;let l=x.get(e),r;if(l||x.set(e,l=new Set),!l.has(a)){{r=k.document.createElement("style"),r.innerHTML=c;const d=(n=v.$nonce$)!=null?n:Oe(k.document);if(d!=null&&r.setAttribute("nonce",d),!(t.$flags$&1))if(e.nodeName==="HEAD"){const i=e.querySelectorAll("link[rel=preconnect]"),h=i.length>0?i[i.length-1].nextSibling:e.querySelector("style");e.insertBefore(r,(h==null?void 0:h.parentNode)===e?h:null)}else if("host"in e)if(le){const i=new CSSStyleSheet;i.replaceSync(c),e.adoptedStyleSheets.unshift(i)}else{const i=e.querySelector("style");i?i.innerHTML=c+i.innerHTML:e.prepend(r)}else e.append(r);t.$flags$&1&&e.insertBefore(r,null)}t.$flags$&4&&(r.innerHTML+=Ee),l&&l.add(a)}}else e.adoptedStyleSheets.includes(c)||e.adoptedStyleSheets.push(c);return a},Xe=e=>{const t=e.$cmpMeta$,o=e.$hostElement$,n=t.$flags$,a=_("attachStyles",t.$tagName$),c=Fe(o.shadowRoot?o.shadowRoot:o.getRootNode(),t);n&10&&(o["s-sc"]=c,o.classList.add(c+"-h")),a()},pe=(e,t)=>"sc-"+e.$tagName$,L=(e,t,...o)=>{let n=null,a=null,c=!1,l=!1;const r=[],d=h=>{for(let y=0;y<h.length;y++)n=h[y],Array.isArray(n)?d(n):n!=null&&typeof n!="boolean"&&((c=typeof e!="function"&&!F(n))&&(n=String(n)),c&&l?r[r.length-1].$text$+=n:r.push(c?B(null,n):n),l=c)};if(d(o),t){t.key&&(a=t.key);{const h=t.className||t.class;h&&(t.class=typeof h!="object"?h:Object.keys(h).filter(y=>h[y]).join(" "))}}const i=B(e,null);return i.$attrs$=t,r.length>0&&(i.$children$=r),i.$key$=a,i},B=(e,t)=>{const o={$flags$:0,$tag$:e,$text$:t,$elm$:null,$children$:null};return o.$attrs$=null,o.$key$=null,o},fe={},Ge=e=>e&&e.$tag$===fe,X=e=>{const t=Ie(e);return new RegExp(`(^|[^@]|@(?!supports\\s+selector\\s*\\([^{]*?${t}))(${t}\\b)`,"g")};X("::slotted");X(":host");X(":host-context");var $e=(e,t,o)=>e!=null&&!F(e)?t&4?e==="false"?!1:e===""||!!e:t&1?String(e):e:e,Ke=(e,t,o)=>{const n=v.ce(t,o);return e.dispatchEvent(n),n},oe=(e,t,o,n,a,c,l)=>{if(o===n)return;let r=Y(e,t),d=t.toLowerCase();if(t==="class"){const i=e.classList,h=ne(o);let y=ne(n);i.remove(...h.filter(p=>p&&!y.includes(p))),i.add(...y.filter(p=>p&&!h.includes(p)))}else if(t==="style"){for(const i in o)(!n||n[i]==null)&&(i.includes("-")?e.style.removeProperty(i):e.style[i]="");for(const i in n)(!o||n[i]!==o[i])&&(i.includes("-")?e.style.setProperty(i,n[i]):e.style[i]=n[i])}else if(t!=="key")if(t==="ref")n&&n(e);else if(!e.__lookupSetter__(t)&&t[0]==="o"&&t[1]==="n"){if(t[2]==="-"?t=t.slice(3):Y(k,d)?t=d.slice(2):t=d[2]+t.slice(3),o||n){const i=t.endsWith(ke);t=t.replace(Qe,""),o&&v.rel(e,t,o,i),n&&v.ael(e,t,n,i)}}else{const i=F(n);if(r||i&&n!==null)try{if(e.tagName.includes("-"))e[t]!==n&&(e[t]=n);else{const y=n??"";t==="list"?r=!1:(o==null||e[t]!=y)&&(typeof e.__lookupSetter__(t)=="function"?e[t]=y:e.setAttribute(t,y))}}catch{}let h=!1;d!==(d=d.replace(/^xlink\:?/,""))&&(t=d,h=!0),n==null||n===!1?(n!==!1||e.getAttribute(t)==="")&&(h?e.removeAttributeNS(V,t):e.removeAttribute(t)):(!r||c&4||a)&&!i&&e.nodeType===1&&(n=n===!0?"":n,h?e.setAttributeNS(V,t,n):e.setAttribute(t,n))}},Je=/\s/,ne=e=>(typeof e=="object"&&e&&"baseVal"in e&&(e=e.baseVal),!e||typeof e!="string"?[]:e.split(Je)),ke="Capture",Qe=new RegExp(ke+"$"),ue=(e,t,o,n)=>{const a=t.$elm$.nodeType===11&&t.$elm$.host?t.$elm$.host:t.$elm$,c=e&&e.$attrs$||{},l=t.$attrs$||{};for(const r of ae(Object.keys(c)))r in l||oe(a,r,c[r],void 0,o,t.$flags$);for(const r of ae(Object.keys(l)))oe(a,r,c[r],l[r],o,t.$flags$)};function ae(e){return e.includes("ref")?[...e.filter(t=>t!=="ref"),"ref"]:e}var G,ve=!1,j=(e,t,o)=>{const n=t.$children$[o];let a=0,c,l;if(n.$text$!==null)c=n.$elm$=k.document.createTextNode(n.$text$);else{if(!k.document)throw new Error("You are trying to render a Stencil component in an environment that doesn't support the DOM. Make sure to populate the [`window`](https://developer.mozilla.org/en-US/docs/Web/API/Window/window) object before rendering a component.");if(c=n.$elm$=k.document.createElement(n.$tag$),ue(null,n,ve),n.$children$)for(a=0;a<n.$children$.length;++a)l=j(e,n,a),l&&c.appendChild(l)}return c["s-hn"]=G,c},ge=(e,t,o,n,a,c)=>{let l=e,r;for(l.shadowRoot&&l.tagName===G&&(l=l.shadowRoot);a<=c;++a)n[a]&&(r=j(null,o,a),r&&(n[a].$elm$=r,H(l,r,t)))},_e=(e,t,o)=>{for(let n=t;n<=o;++n){const a=e[n];if(a){const c=a.$elm$;Me(a),c&&c.remove()}}},Ye=(e,t,o,n,a=!1)=>{let c=0,l=0,r=0,d=0,i=t.length-1,h=t[0],y=t[i],p=n.length-1,f=n[0],$=n[p],u,b;for(;c<=i&&l<=p;)if(h==null)h=t[++c];else if(y==null)y=t[--i];else if(f==null)f=n[++l];else if($==null)$=n[--p];else if(z(h,f,a))M(h,f,a),h=t[++c],f=n[++l];else if(z(y,$,a))M(y,$,a),y=t[--i],$=n[--p];else if(z(h,$,a))M(h,$,a),H(e,h.$elm$,y.$elm$.nextSibling),h=t[++c],$=n[--p];else if(z(y,f,a))M(y,f,a),H(e,y.$elm$,h.$elm$),y=t[--i],f=n[++l];else{for(r=-1,d=c;d<=i;++d)if(t[d]&&t[d].$key$!==null&&t[d].$key$===f.$key$){r=d;break}r>=0?(b=t[r],b.$tag$!==f.$tag$?u=j(t&&t[l],o,r):(M(b,f,a),t[r]=void 0,u=b.$elm$),f=n[++l]):(u=j(t&&t[l],o,l),f=n[++l]),u&&H(h.$elm$.parentNode,u,h.$elm$)}c>i?ge(e,n[p+1]==null?null:n[p+1].$elm$,o,n,l,p):l>p&&_e(t,c,i)},z=(e,t,o=!1)=>e.$tag$===t.$tag$?o?(o&&!e.$key$&&t.$key$&&(e.$key$=t.$key$),!0):e.$key$===t.$key$:!1,M=(e,t,o=!1)=>{const n=t.$elm$=e.$elm$,a=e.$children$,c=t.$children$,l=t.$text$;l===null?(ue(e,t,ve),a!==null&&c!==null?Ye(n,a,t,c,o):c!==null?(e.$text$!==null&&(n.textContent=""),ge(n,null,t,c,0,c.length-1)):!o&&N.updatable&&a!==null&&_e(a,0,a.length-1)):e.$text$!==l&&(n.data=l)},Me=e=>{e.$attrs$&&e.$attrs$.ref&&e.$attrs$.ref(null),e.$children$&&e.$children$.map(Me)},H=(e,t,o)=>e==null?void 0:e.insertBefore(t,o),Ve=(e,t,o=!1)=>{const n=e.$hostElement$,a=e.$cmpMeta$,c=e.$vnode$||B(null,null),r=Ge(t)?t:L(null,null,t);if(G=n.tagName,a.$attrsToReflect$&&(r.$attrs$=r.$attrs$||{},a.$attrsToReflect$.map(([d,i])=>r.$attrs$[i]=n[d])),o&&r.$attrs$)for(const d of Object.keys(r.$attrs$))n.hasAttribute(d)&&!["key","ref","style","class"].includes(d)&&(r.$attrs$[d]=n[d]);r.$tag$=null,r.$flags$|=4,e.$vnode$=r,r.$elm$=c.$elm$=n.shadowRoot||n,M(c,r,o)},xe=(e,t)=>{if(t&&!e.$onRenderResolve$&&t["s-p"]){const o=t["s-p"].push(new Promise(n=>e.$onRenderResolve$=()=>{t["s-p"].splice(o-1,1),n()}))}},K=(e,t)=>{if(e.$flags$|=16,e.$flags$&4){e.$flags$|=512;return}return xe(e,e.$ancestorComponent$),Pe(()=>et(e,t))},et=(e,t)=>{const o=e.$hostElement$,n=_("scheduleUpdate",e.$cmpMeta$.$tagName$),a=o;if(!a)throw new Error(`Can't render component <${o.tagName.toLowerCase()} /> with invalid Stencil runtime! Make sure this imported component is compiled with a \`externalRuntime: true\` flag. For more information, please refer to https://stenciljs.com/docs/custom-elements#externalruntime`);let c;return t?c=m(a,"componentWillLoad",void 0,o):c=m(a,"componentWillUpdate",void 0,o),c=se(c,()=>m(a,"componentWillRender",void 0,o)),n(),se(c,()=>ot(e,a,t))},se=(e,t)=>tt(e)?e.then(t).catch(o=>{console.error(o),t()}):t(),tt=e=>e instanceof Promise||e&&e.then&&typeof e.then=="function",ot=async(e,t,o)=>{var n;const a=e.$hostElement$,c=_("update",e.$cmpMeta$.$tagName$),l=a["s-rc"];o&&Xe(e);const r=_("render",e.$cmpMeta$.$tagName$);nt(e,t,a,o),l&&(l.map(d=>d()),a["s-rc"]=void 0),r(),c();{const d=(n=a["s-p"])!=null?n:[],i=()=>at(e);d.length===0?i():(Promise.all(d).then(i),e.$flags$|=4,d.length=0)}},nt=(e,t,o,n)=>{try{t=t.render(),e.$flags$&=-17,e.$flags$|=2,Ve(e,t,n)}catch(a){P(a,e.$hostElement$)}return null},at=e=>{const t=e.$cmpMeta$.$tagName$,o=e.$hostElement$,n=_("postUpdate",t),a=o,c=e.$ancestorComponent$;m(a,"componentDidRender",void 0,o),e.$flags$&64?(m(a,"componentDidUpdate",void 0,o),n()):(e.$flags$|=64,ct(o),m(a,"componentDidLoad",void 0,o),n(),e.$onReadyResolve$(o),c||st()),e.$onRenderResolve$&&(e.$onRenderResolve$(),e.$onRenderResolve$=void 0),e.$flags$&512&&W(()=>K(e,!1)),e.$flags$&=-517},st=e=>{W(()=>Ke(k,"appload",{detail:{namespace:ze}}))},m=(e,t,o,n)=>{if(e&&e[t])try{return e[t](o)}catch(a){P(a,n)}},ct=e=>{var t;return e.classList.add((t=N.hydratedSelectorName)!=null?t:"hydrated")},rt=(e,t)=>g(e).$instanceValues$.get(t),ce=(e,t,o,n)=>{const a=g(e),c=e,l=a.$instanceValues$.get(t),r=a.$flags$,d=c;o=$e(o,n.$members$[t][0]);const i=Number.isNaN(l)&&Number.isNaN(o);if(o!==l&&!i){a.$instanceValues$.set(t,o);{if(n.$watchers$&&r&128){const y=n.$watchers$[t];y&&y.map(p=>{try{d[p](o,l,t)}catch(f){P(f,c)}})}if((r&18)===2){if(d.componentShouldUpdate&&d.componentShouldUpdate(o,l,t)===!1)return;K(a,!1)}}}},it=(e,t,o)=>{var n,a;const c=e.prototype;if(t.$members$||t.$watchers$||e.watchers){e.watchers&&!t.$watchers$&&(t.$watchers$=e.watchers);const l=Object.entries((n=t.$members$)!=null?n:{});l.map(([r,[d]])=>{if(d&31||d&32){const{get:i,set:h}=Object.getOwnPropertyDescriptor(c,r)||{};i&&(t.$members$[r][0]|=2048),h&&(t.$members$[r][0]|=4096),Object.defineProperty(c,r,{get(){return i?i.apply(this):rt(this,r)},configurable:!0,enumerable:!0}),Object.defineProperty(c,r,{set(y){const p=g(this);if(h){const f=d&32?this[r]:p.$hostElement$[r];typeof f>"u"&&p.$instanceValues$.get(r)?y=p.$instanceValues$.get(r):!p.$instanceValues$.get(r)&&f&&p.$instanceValues$.set(r,f),h.apply(this,[$e(y,d)]),y=d&32?this[r]:p.$hostElement$[r],ce(this,r,y,t);return}{ce(this,r,y,t);return}}})}});{const r=new Map;c.attributeChangedCallback=function(d,i,h){v.jmp(()=>{var y;const p=r.get(d);if(!(this.hasOwnProperty(p)&&N.lazyLoad)){if(c.hasOwnProperty(p)&&typeof this[p]=="number"&&this[p]==h)return;if(p==null){const $=g(this),u=$==null?void 0:$.$flags$;if(u&&!(u&8)&&u&128&&h!==i){const T=this,J=(y=t.$watchers$)==null?void 0:y[d];J==null||J.forEach(Q=>{T[Q]!=null&&T[Q].call(T,h,i,d)})}return}}const f=Object.getOwnPropertyDescriptor(c,p);h=h===null&&typeof this[p]=="boolean"?!1:h,h!==this[p]&&(!f.get||f.set)&&(this[p]=h)})},e.observedAttributes=Array.from(new Set([...Object.keys((a=t.$watchers$)!=null?a:{}),...l.filter(([d,i])=>i[0]&15).map(([d,i])=>{var h;const y=i[1]||d;return r.set(y,d),i[0]&512&&((h=t.$attrsToReflect$)==null||h.push([d,y])),y})]))}}return e},re=async(e,t,o,n)=>{let a;if((t.$flags$&32)===0){t.$flags$|=32;{a=e.constructor;const r=e.localName;customElements.whenDefined(r).then(()=>t.$flags$|=128)}if(a&&a.style){let r;typeof a.style=="string"&&(r=a.style);const d=pe(o);if(!E.has(d)){const i=_("registerStyles",o.$tagName$);We(d,r,!!(o.$flags$&1)),i()}}}const c=t.$ancestorComponent$,l=()=>K(t,!0);c&&c["s-rc"]?c["s-rc"].push(l):l()},lt=(e,t)=>{},dt=e=>{{const t=g(e),o=t.$cmpMeta$,n=_("connectedCallback",o.$tagName$);if(t.$flags$&1)t!=null&&t.$lazyInstance$||t!=null&&t.$onReadyPromise$&&t.$onReadyPromise$.then(()=>lt());else{t.$flags$|=1;{let a=e;for(;a=a.parentNode||a.host;)if(a["s-p"]){xe(t,t.$ancestorComponent$=a);break}}o.$members$&&Object.entries(o.$members$).map(([a,[c]])=>{if(c&31&&e.hasOwnProperty(a)){const l=e[a];delete e[a],e[a]=l}}),N.initializeNextTick?W(()=>re(e,t,o)):re(e,t,o)}n()}},ht=async e=>{g(e),x.has(e)&&x.delete(e),e.shadowRoot&&x.has(e.shadowRoot)&&x.delete(e.shadowRoot)},yt=(e,t)=>{const o={$flags$:t[0],$tagName$:t[1]};o.$members$=t[2],o.$watchers$=e.$watchers$,o.$attrsToReflect$=[];const n=e.prototype.connectedCallback,a=e.prototype.disconnectedCallback;return Object.assign(e.prototype,{__hasHostListenerAttached:!1,__registerHost(){He(this,o)},connectedCallback(){this.__hasHostListenerAttached||(g(this),this.__hasHostListenerAttached=!0),dt(this),n&&n.call(this)},disconnectedCallback(){ht(this),a&&a.call(this)},__attachShadow(){if(!this.shadowRoot)Ze.call(this,o);else if(this.shadowRoot.mode!=="open")throw new Error(`Unable to re-use existing shadow root for ${o.$tagName$}! Mode is set to ${this.shadowRoot.mode} but Stencil only supports open shadow roots.`)}}),e.is=o.$tagName$,it(e,o)};let O;const pt=()=>{if(typeof window>"u")return new Map;if(!O){const e=window;e.Ionicons=e.Ionicons||{},O=e.Ionicons.map=e.Ionicons.map||new Map}return O},ft=e=>{let t=I(e.src);return t||(t=me(e.name,e.icon,e.mode,e.ios,e.md),t?$t(t,e):e.icon&&(t=I(e.icon),t||(t=I(e.icon[e.mode]),t))?t:null)},$t=(e,t)=>{const o=pt().get(e);if(o)return o;try{return Te(`svg/${e}.svg`)}catch(n){console.log("e",n),console.warn(`[Ionicons Warning]: Could not load icon with name "${e}". Ensure that the icon is registered using addIcons or that the icon SVG data is passed directly to the icon component.`,t)}},me=(e,t,o,n,a)=>(o=(o&&C(o))==="ios"?"ios":"md",n&&o==="ios"?e=C(n):a&&o==="md"?e=C(a):(!e&&t&&!we(t)&&(e=t),q(e)&&(e=C(e))),!q(e)||e.trim()===""||e.replace(/[a-z]|-|\d/gi,"")!==""?null:e),I=e=>q(e)&&(e=e.trim(),we(e))?e:null,we=e=>e.length>0&&/(\/|\.)/.test(e),q=e=>typeof e=="string",C=e=>e.toLowerCase(),kt=(e,t=[])=>{const o={};return t.forEach(n=>{e.hasAttribute(n)&&(e.getAttribute(n)!==null&&(o[n]=e.getAttribute(n)),e.removeAttribute(n))}),o},ut=e=>e&&e.dir!==""?e.dir.toLowerCase()==="rtl":(document==null?void 0:document.dir.toLowerCase())==="rtl",vt=e=>{const t=document.createElement("div");t.innerHTML=e;for(let n=t.childNodes.length-1;n>=0;n--)t.childNodes[n].nodeName.toLowerCase()!=="svg"&&t.removeChild(t.childNodes[n]);const o=t.firstElementChild;if(o&&o.nodeName.toLowerCase()==="svg"){const n=o.getAttribute("class")||"";if(o.setAttribute("class",(n+" s-ion-icon").trim()),be(o))return t.innerHTML}return""},be=e=>{if(e.nodeType===1){if(e.nodeName.toLowerCase()==="script")return!1;for(let t=0;t<e.attributes.length;t++){const o=e.attributes[t].name;if(q(o)&&o.toLowerCase().indexOf("on")===0)return!1}for(let t=0;t<e.childNodes.length;t++)if(!be(e.childNodes[t]))return!1}return!0},gt=e=>e.startsWith("data:image/svg+xml"),_t=e=>e.indexOf(";utf8,")!==-1,w=new Map,Ae=new Map;let U;function Z(e){return w.set(e,""),""}const Mt=(e,t)=>{const o=Ae.get(e);return o||(typeof fetch<"u"&&typeof document<"u"?gt(e)&&_t(e)?Promise.resolve(xt(e)):mt(e,t):Promise.resolve(Z(e)))};function xt(e){U||(U=new DOMParser);const o=U.parseFromString(e,"text/html").querySelector("svg");if(o)return w.set(e,o.outerHTML),o.outerHTML;throw new Error(`Could not parse svg from ${e}`)}function mt(e,t){const o=fetch(e).then(n=>n.text().then(a=>{a&&t!==!1&&(a=vt(a));const c=a||"";return w.set(e,c),c}).catch(()=>Z(e))).catch(()=>Z(e));return Ae.set(e,o),o}const wt=":host{display:inline-block;width:1em;height:1em;contain:strict;fill:currentColor;box-sizing:content-box !important}:host .ionicon{stroke:currentColor}.ionicon-fill-none{fill:none}.ionicon-stroke-width{stroke-width:var(--ionicon-stroke-width, 32px)}.icon-inner,.ionicon,svg{display:block;height:100%;width:100%}@supports (background: -webkit-named-image(i)){:host(.icon-rtl) .icon-inner{transform:scaleX(-1)}}@supports not selector(:dir(rtl)) and selector(:host-context([dir='rtl'])){:host(.icon-rtl) .icon-inner{transform:scaleX(-1)}}:host(.flip-rtl):host-context([dir='rtl']) .icon-inner{transform:scaleX(-1)}@supports selector(:dir(rtl)){:host(.flip-rtl:dir(rtl)) .icon-inner{transform:scaleX(-1)}:host(.flip-rtl:dir(ltr)) .icon-inner{transform:scaleX(1)}}:host(.icon-small){font-size:1.125rem !important}:host(.icon-large){font-size:2rem !important}:host(.ion-color){color:var(--ion-color-base) !important}:host(.ion-color-primary){--ion-color-base:var(--ion-color-primary, #3880ff)}:host(.ion-color-secondary){--ion-color-base:var(--ion-color-secondary, #0cd1e8)}:host(.ion-color-tertiary){--ion-color-base:var(--ion-color-tertiary, #f4a942)}:host(.ion-color-success){--ion-color-base:var(--ion-color-success, #10dc60)}:host(.ion-color-warning){--ion-color-base:var(--ion-color-warning, #ffce00)}:host(.ion-color-danger){--ion-color-base:var(--ion-color-danger, #f14141)}:host(.ion-color-light){--ion-color-base:var(--ion-color-light, #f4f5f8)}:host(.ion-color-medium){--ion-color-base:var(--ion-color-medium, #989aa2)}:host(.ion-color-dark){--ion-color-base:var(--ion-color-dark, #222428)}",bt=yt(class extends je{constructor(){super(),this.__registerHost(),this.__attachShadow(),this.iconName=null,this.inheritedAttributes={},this.didLoadIcon=!1,this.isVisible=!1,this.mode=At(),this.lazy=!1,this.sanitize=!0}componentWillLoad(){this.inheritedAttributes=kt(this.el,["aria-label"])}connectedCallback(){this.waitUntilVisible(this.el,"50px",()=>{this.isVisible=!0,this.loadIcon()})}componentDidLoad(){this.didLoadIcon||this.loadIcon()}disconnectedCallback(){this.io&&(this.io.disconnect(),this.io=void 0)}waitUntilVisible(t,o,n){if(!!!(this.lazy&&typeof window<"u"&&window.IntersectionObserver))return n();const c=this.io=new window.IntersectionObserver(l=>{l[0].isIntersecting&&(c.disconnect(),this.io=void 0,n())},{rootMargin:o});c.observe(t)}loadIcon(){if(this.isVisible){const t=ft(this);t&&(w.has(t)?this.svgContent=w.get(t):Mt(t,this.sanitize).then(()=>this.svgContent=w.get(t)),this.didLoadIcon=!0)}this.iconName=me(this.name,this.icon,this.mode,this.ios,this.md)}render(){const{flipRtl:t,iconName:o,inheritedAttributes:n,el:a}=this,c=this.mode||"md",l=o?(o.includes("arrow")||o.includes("chevron"))&&t!==!1:!1,r=t||l;return L(fe,Object.assign({key:"0578c899781ca145dd8205acd9670af39b57cf2e",role:"img",class:Object.assign(Object.assign({[c]:!0},St(this.color)),{[`icon-${this.size}`]:!!this.size,"flip-rtl":r,"icon-rtl":r&&ut(a)})},n),this.svgContent?L("div",{class:"icon-inner",innerHTML:this.svgContent}):L("div",{class:"icon-inner"}))}static get assetsDirs(){return["svg"]}get el(){return this}static get watchers(){return{name:["loadIcon"],src:["loadIcon"],icon:["loadIcon"],ios:["loadIcon"],md:["loadIcon"]}}static get style(){return wt}},[1,"ion-icon",{mode:[1025],color:[1],ios:[1],md:[1],flipRtl:[4,"flip-rtl"],name:[513],src:[1],icon:[8],size:[1],lazy:[4],sanitize:[4],svgContent:[32],isVisible:[32]},void 0,{name:["loadIcon"],src:["loadIcon"],icon:["loadIcon"],ios:["loadIcon"],md:["loadIcon"]}]),At=()=>typeof document<"u"&&document.documentElement.getAttribute("mode")||"md",St=e=>e?{"ion-color":!0,[`ion-color-${e}`]:!0}:null;function zt(){if(typeof customElements>"u")return;["ion-icon"].forEach(t=>{switch(t){case"ion-icon":customElements.get(t)||customElements.define(t,bt);break}})}const Ho=zt;/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ct=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Lt=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,o,n)=>n?n.toUpperCase():o.toLowerCase()),ie=e=>{const t=Lt(e);return t.charAt(0).toUpperCase()+t.slice(1)},Se=(...e)=>e.filter((t,o,n)=>!!t&&t.trim()!==""&&n.indexOf(t)===o).join(" ").trim(),Ht=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0};/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Et={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jt=A.forwardRef(({color:e="currentColor",size:t=24,strokeWidth:o=2,absoluteStrokeWidth:n,className:a="",children:c,iconNode:l,...r},d)=>A.createElement("svg",{ref:d,...Et,width:t,height:t,stroke:e,strokeWidth:n?Number(o)*24/Number(t):o,className:Se("lucide",a),...!c&&!Ht(r)&&{"aria-hidden":"true"},...r},[...l.map(([i,h])=>A.createElement(i,h)),...Array.isArray(c)?c:[c]]));/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s=(e,t)=>{const o=A.forwardRef(({className:n,...a},c)=>A.createElement(jt,{ref:c,iconNode:t,className:Se(`lucide-${Ct(ie(e))}`,`lucide-${e}`,n),...a}));return o.displayName=ie(e),o};/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qt=[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]],Eo=s("activity",qt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nt=[["path",{d:"M12 6.528V3a1 1 0 0 1 1-1h0",key:"11qiee"}],["path",{d:"M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21",key:"110c12"}]],jo=s("apple",Nt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pt=[["path",{d:"M17 7 7 17",key:"15tmo1"}],["path",{d:"M17 17H7V7",key:"1org7z"}]],qo=s("arrow-down-left",Pt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tt=[["path",{d:"m7 7 10 10",key:"1fmybs"}],["path",{d:"M17 7v10H7",key:"6fjiku"}]],No=s("arrow-down-right",Tt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ot=[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]],Po=s("arrow-left",Ot);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const It=[["path",{d:"m16 3 4 4-4 4",key:"1x1c3m"}],["path",{d:"M20 7H4",key:"zbl0bi"}],["path",{d:"m8 21-4-4 4-4",key:"h9nckh"}],["path",{d:"M4 17h16",key:"g4d7ey"}]],To=s("arrow-right-left",It);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ut=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],Oo=s("arrow-right",Ut);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rt=[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]],Io=s("arrow-up-right",Rt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dt=[["path",{d:"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",key:"1yiouv"}],["circle",{cx:"12",cy:"8",r:"6",key:"1vp47v"}]],Uo=s("award",Dt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bt=[["path",{d:"M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5",key:"1u7htd"}],["path",{d:"M15 12h.01",key:"1k8ypt"}],["path",{d:"M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1",key:"11xh7x"}],["path",{d:"M9 12h.01",key:"157uk2"}]],Ro=s("baby",Bt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zt=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]],Do=s("bell",Zt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wt=[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]],Bo=s("book-open",Wt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ft=[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]],Zo=s("box",Ft);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xt=[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]],Wo=s("briefcase",Xt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gt=[["path",{d:"M12 20v-9",key:"1qisl0"}],["path",{d:"M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z",key:"uouzyp"}],["path",{d:"M14.12 3.88 16 2",key:"qol33r"}],["path",{d:"M21 21a4 4 0 0 0-3.81-4",key:"1b0z45"}],["path",{d:"M21 5a4 4 0 0 1-3.55 3.97",key:"5cxbf6"}],["path",{d:"M22 13h-4",key:"1jl80f"}],["path",{d:"M3 21a4 4 0 0 1 3.81-4",key:"1fjd4g"}],["path",{d:"M3 5a4 4 0 0 0 3.55 3.97",key:"1d7oge"}],["path",{d:"M6 13H2",key:"82j7cp"}],["path",{d:"m8 2 1.88 1.88",key:"fmnt4t"}],["path",{d:"M9 7.13V6a3 3 0 1 1 6 0v1.13",key:"1vgav8"}]],Fo=s("bug",Gt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kt=[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]],Xo=s("calculator",Kt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jt=[["path",{d:"M16 14v2.2l1.6 1",key:"fo4ql5"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5",key:"1osxxc"}],["path",{d:"M3 10h5",key:"r794hk"}],["path",{d:"M8 2v4",key:"1cmpym"}],["circle",{cx:"16",cy:"16",r:"6",key:"qoo3c4"}]],Go=s("calendar-clock",Jt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qt=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],Ko=s("calendar",Qt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yt=[["path",{d:"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",key:"18u6gg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]],Jo=s("camera",Yt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vt=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],Qo=s("chart-column",Vt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e1=[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]],Yo=s("check-check",e1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t1=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],Vo=s("check",t1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o1=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],en=s("chevron-down",o1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n1=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],tn=s("chevron-left",n1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a1=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],on=s("chevron-right",a1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s1=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],nn=s("chevron-up",s1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],an=s("circle-alert",c1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r1=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],sn=s("circle-check-big",r1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],cn=s("circle-check",i1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}]],rn=s("circle-dot",l1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]],ln=s("circle-question-mark",d1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h1=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"m9 14 2 2 4-4",key:"df797q"}]],dn=s("clipboard-check",h1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y1=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]],hn=s("clipboard-list",y1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p1=[["path",{d:"M12 6v6l4 2",key:"mmk7yg"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],yn=s("clock",p1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f1=[["path",{d:"m17 15-5.5 5.5L9 18",key:"15q87x"}],["path",{d:"M5 17.743A7 7 0 1 1 15.71 10h1.79a4.5 4.5 0 0 1 1.5 8.742",key:"9ho6ki"}]],pn=s("cloud-check",f1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $1=[["path",{d:"m2 2 20 20",key:"1ooewy"}],["path",{d:"M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193",key:"yfwify"}],["path",{d:"M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07",key:"jlfiyv"}]],fn=s("cloud-off",$1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k1=[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",key:"p7xjir"}]],$n=s("cloud",k1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u1=[["circle",{cx:"8",cy:"8",r:"6",key:"3yglwk"}],["path",{d:"M18.09 10.37A6 6 0 1 1 10.34 18",key:"t5s6rm"}],["path",{d:"M7 6h1v4",key:"1obek4"}],["path",{d:"m16.71 13.88.7.71-2.82 2.82",key:"1rbuyh"}]],kn=s("coins",u1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v1=[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]],un=s("database",v1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g1=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],vn=s("download",g1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _1=[["path",{d:"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z",key:"1ptgy4"}],["path",{d:"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97",key:"1sl1rz"}]],gn=s("droplets",_1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M1=[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"12",cy:"5",r:"1",key:"gxeob9"}],["circle",{cx:"12",cy:"19",r:"1",key:"lyex9k"}]],_n=s("ellipsis-vertical",M1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x1=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Mn=s("eye",x1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m1=[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]],xn=s("file-text",m1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w1=[["path",{d:"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",key:"18mbvz"}],["path",{d:"M6.453 15h11.094",key:"3shlmq"}],["path",{d:"M8.5 2h7",key:"csnxdl"}]],mn=s("flask-conical",w1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b1=[["line",{x1:"22",x2:"2",y1:"12",y2:"12",key:"1y58io"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16",key:"sgf278"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16",key:"1l4acy"}]],wn=s("hard-drive",b1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A1=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}],["path",{d:"M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27",key:"auskq0"}]],bn=s("heart-pulse",A1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S1=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}]],An=s("heart",S1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z1=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"r6nss1"}]],Sn=s("house",z1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C1=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]],zn=s("image",C1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],Cn=s("info",L1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H1=[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],Ln=s("layers",H1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E1=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]],Hn=s("layout-dashboard",E1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j1=[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]],En=s("layout-grid",j1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q1=[["path",{d:"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",key:"nnexq3"}],["path",{d:"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",key:"mt58a7"}]],jn=s("leaf",q1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N1=[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]],qn=s("lightbulb",N1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P1=[["path",{d:"M3 5h.01",key:"18ugdj"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 19h.01",key:"noohij"}],["path",{d:"M8 5h13",key:"1pao27"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 19h13",key:"m83p4d"}]],Nn=s("list",P1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T1=[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],Pn=s("loader-circle",T1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O1=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],Tn=s("lock",O1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I1=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"m21 3-7 7",key:"1l2asr"}],["path",{d:"m3 21 7-7",key:"tjx5ai"}],["path",{d:"M9 21H3v-6",key:"wtvkvv"}]],On=s("maximize-2",I1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U1=[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",key:"1sd12s"}]],In=s("message-circle",U1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R1=[["path",{d:"M12 13v8",key:"1l5pq0"}],["path",{d:"M12 3v3",key:"1n5kay"}],["path",{d:"M4 6a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h13a2 2 0 0 0 1.152-.365l3.424-2.317a1 1 0 0 0 0-1.635l-3.424-2.318A2 2 0 0 0 17 6z",key:"1btarq"}]],Un=s("milestone",R1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D1=[["path",{d:"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4",key:"re6nr2"}],["path",{d:"M2 6h4",key:"aawbzj"}],["path",{d:"M2 10h4",key:"l0bgd4"}],["path",{d:"M2 14h4",key:"1gsvsf"}],["path",{d:"M2 18h4",key:"1bu2t1"}],["path",{d:"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z",key:"pqwjuv"}]],Rn=s("notebook-pen",D1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B1=[["path",{d:"M12 16h.01",key:"1drbdi"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z",key:"1fd625"}]],Dn=s("octagon-alert",B1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=[["path",{d:"m16 16 2 2 4-4",key:"gfu2re"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",key:"e7tb2h"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12",key:"a4e8g8"}]],Bn=s("package-check",Z1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W1=[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]],Zn=s("package",W1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F1=[["path",{d:"M13 21h8",key:"1jsn5i"}],["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],Wn=s("pen-line",F1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X1=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]],Fn=s("pencil",X1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G1=[["path",{d:"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",key:"9njp5v"}]],Xn=s("phone",G1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K1=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],Gn=s("plus",K1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],Kn=s("refresh-cw",J1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q1=[["path",{d:"m17 2 4 4-4 4",key:"nntrym"}],["path",{d:"M3 11v-1a4 4 0 0 1 4-4h14",key:"84bu3i"}],["path",{d:"m7 22-4-4 4-4",key:"1wqhfi"}],["path",{d:"M21 13v1a4 4 0 0 1-4 4H3",key:"1rx37r"}]],Jn=s("repeat",Q1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y1=[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]],Qn=s("save",Y1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V1=[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]],Yn=s("scale",V1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eo=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],Vn=s("search",eo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const to=[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]],ea=s("send",to);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oo=[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]],ta=s("server",oo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const no=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],oa=s("settings",no);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ao=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]],na=s("shield-alert",ao);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const so=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],aa=s("shield-check",so);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]],sa=s("shield",co);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ro=[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]],ca=s("shopping-cart",ro);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const io=[["path",{d:"m12.5 17-.5-1-.5 1h1z",key:"3me087"}],["path",{d:"M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z",key:"1o5pge"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}]],ra=s("skull",io);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lo=[["path",{d:"M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344",key:"2acyp4"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],ia=s("square-check-big",lo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ho=[["path",{d:"M8 19H5c-1 0-2-1-2-2V7c0-1 1-2 2-2h3",key:"lubmu8"}],["path",{d:"M16 5h3c1 0 2 1 2 2v10c0 1-1 2-2 2h-3",key:"1ag34g"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20",key:"1tx1rr"}]],la=s("square-split-horizontal",ho);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yo=[["path",{d:"M11 2v2",key:"1539x4"}],["path",{d:"M5 2v2",key:"1yf1q8"}],["path",{d:"M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1",key:"rb5t3r"}],["path",{d:"M8 15a6 6 0 0 0 12 0v-3",key:"x18d4x"}],["circle",{cx:"20",cy:"10",r:"2",key:"ts1r5v"}]],da=s("stethoscope",yo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const po=[["path",{d:"m18 2 4 4",key:"22kx64"}],["path",{d:"m17 7 3-3",key:"1w1zoj"}],["path",{d:"M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5",key:"1exhtz"}],["path",{d:"m9 11 4 4",key:"rovt3i"}],["path",{d:"m5 19-3 3",key:"59f2uf"}],["path",{d:"m14 4 6 6",key:"yqp9t2"}]],ha=s("syringe",po);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fo=[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]],ya=s("tag",fo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $o=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],pa=s("target",$o);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ko=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],fa=s("trash-2",ko);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uo=[["path",{d:"M16 17h6v-6",key:"t6n2it"}],["path",{d:"m22 17-8.5-8.5-5 5L2 7",key:"x473p"}]],$a=s("trending-down",uo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vo=[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]],ka=s("trending-up",vo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const go=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],ua=s("triangle-alert",go);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _o=[["path",{d:"M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978",key:"1n3hpd"}],["path",{d:"M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978",key:"rfe1zi"}],["path",{d:"M18 9h1.5a1 1 0 0 0 0-5H18",key:"7xy6bh"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z",key:"1mhfuq"}],["path",{d:"M6 9H4.5a1 1 0 0 1 0-5H6",key:"tex48p"}]],va=s("trophy",_o);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mo=[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]],ga=s("truck",Mo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xo=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],_a=s("user",xo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mo=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],Ma=s("users",mo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wo=[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]],xa=s("wallet",wo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bo=[["circle",{cx:"12",cy:"5",r:"3",key:"rqqgnr"}],["path",{d:"M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z",key:"56o5sh"}]],ma=s("weight",bo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ao=[["path",{d:"M2 22 16 8",key:"60hf96"}],["path",{d:"M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",key:"1rdhi6"}],["path",{d:"M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",key:"1sdzmb"}],["path",{d:"M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",key:"eoatbi"}],["path",{d:"M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z",key:"19rau1"}],["path",{d:"M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",key:"tc8ph9"}],["path",{d:"M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",key:"2m8kc5"}],["path",{d:"M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",key:"vex3ng"}]],wa=s("wheat",Ao);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const So=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],ba=s("x",So);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],Aa=s("zap",zo);export{Vo as $,Po as A,Zo as B,on as C,ya as D,sa as E,na as F,jn as G,An as H,pn as I,Oo as J,yn as K,Ln as L,On as M,Rn as N,xn as O,Gn as P,Do as Q,Kn as R,Qn as S,fa as T,ta as U,_a as V,ma as W,ba as X,Wo as Y,Aa as Z,Xn as _,Jo as a,Hn as a0,Ma as a1,Qo as a2,ha as a3,Dn as a4,In as a5,Pn as a6,zn as a7,Ro as a8,Bn as a9,Go as aA,va as aB,$a as aC,Io as aD,No as aE,qo as aF,Fn as aG,bn as aH,To as aI,Uo as aJ,vn as aK,Tn as aL,ca as aM,fn as aa,Sn as ab,Un as ac,ga as ad,Cn as ae,jo as af,dn as ag,rn as ah,$n as ai,Bo as aj,Nn as ak,En as al,qn as am,sn as an,gn as ao,mn as ap,Xo as aq,kn as ar,ra as as,xa as at,Mn as au,_n as av,wa as aw,un as ax,wn as ay,Jn as az,an as b,aa as c,Ho as d,oa as e,Zn as f,da as g,Vn as h,ea as i,hn as j,la as k,cn as l,ln as m,Yn as n,ka as o,pa as p,ia as q,ua as r,Yo as s,Fo as t,nn as u,en as v,Ko as w,tn as x,Eo as y,Wn as z};
