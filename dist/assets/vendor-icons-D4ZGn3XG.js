import{r as S}from"./vendor-react-DvawyJIB.js";const zt="ionicons",N={hydratedSelectorName:"hydrated",lazyLoad:!1,updatable:!0};var Lt=Object.defineProperty,Ct=(t,e)=>{for(var o in e)Lt(t,o,{get:e[o],enumerable:!0})},g=t=>{if(t.__stencil__getHostRef)return t.__stencil__getHostRef()},Ht=(t,e)=>{const o={$flags$:0,$hostElement$:t,$cmpMeta$:e,$instanceValues$:new Map};o.$onReadyPromise$=new Promise(n=>o.$onReadyResolve$=n),t["s-p"]=[],t["s-rc"]=[];const a=o;return t.__stencil__getHostRef=()=>a,a},J=(t,e)=>e in t,P=(t,e)=>(0,console.error)(t,e),E=new Map,Et="slot-fb{display:contents}slot-fb[hidden]{display:none}",Y="http://www.w3.org/1999/xlink",$=typeof window<"u"?window:{},qt=$.HTMLElement||class{},v={$flags$:0,$resourcesUrl$:"",jmp:t=>t(),raf:t=>requestAnimationFrame(t),ael:(t,e,o,a)=>t.addEventListener(e,o,a),rel:(t,e,o,a)=>t.removeEventListener(e,o,a),ce:(t,e)=>new CustomEvent(t,e)},jt=t=>Promise.resolve(t),lt=(()=>{try{return new CSSStyleSheet,typeof new CSSStyleSheet().replaceSync=="function"}catch{}return!1})(),R=!1,tt=[],dt=[],Nt=(t,e)=>o=>{t.push(o),R||(R=!0,v.raf(ht))},et=t=>{for(let e=0;e<t.length;e++)try{t[e](performance.now())}catch(o){P(o)}t.length=0},ht=()=>{et(tt),et(dt),(R=tt.length>0)&&v.raf(ht)},Z=t=>jt().then(t),Pt=Nt(dt),Tt=t=>{const e=new URL(t,v.$resourcesUrl$);return e.origin!==$.location.origin?e.href:e.pathname},F=t=>(t=typeof t,t==="object"||t==="function");function Ot(t){var e,o,a;return(a=(o=(e=t.head)==null?void 0:e.querySelector('meta[name="csp-nonce"]'))==null?void 0:o.getAttribute("content"))!=null?a:void 0}var It=t=>t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),Ut={};Ct(Ut,{err:()=>yt,map:()=>Rt,ok:()=>B,unwrap:()=>Bt,unwrapErr:()=>Dt});var B=t=>({isOk:!0,isErr:!1,value:t}),yt=t=>({isOk:!1,isErr:!0,value:t});function Rt(t,e){if(t.isOk){const o=e(t.value);return o instanceof Promise?o.then(a=>B(a)):B(o)}if(t.isErr){const o=t.value;return yt(o)}throw"should never get here"}var Bt=t=>{if(t.isOk)return t.value;throw t.value},Dt=t=>{if(t.isErr)return t.value;throw t.value};var A;function Wt(t){var e;const o=this.attachShadow({mode:"open"});A===void 0&&(A=(e=void 0)!=null?e:null),A&&o.adoptedStyleSheets.push(A)}var _=(t,e="")=>()=>{},x=new WeakMap,Zt=(t,e,o)=>{let a=E.get(t);lt&&o?(a=a||new CSSStyleSheet,typeof a=="string"?a=e:a.replaceSync(e)):a=e,E.set(t,a)},Ft=(t,e,o)=>{var a;const n=pt(e),c=E.get(n);if(!$.document)return n;if(t=t.nodeType===11?t:$.document,c)if(typeof c=="string"){t=t.head||t;let l=x.get(t),r;if(l||x.set(t,l=new Set),!l.has(n)){{r=$.document.createElement("style"),r.innerHTML=c;const d=(a=v.$nonce$)!=null?a:Ot($.document);if(d!=null&&r.setAttribute("nonce",d),!(e.$flags$&1))if(t.nodeName==="HEAD"){const i=t.querySelectorAll("link[rel=preconnect]"),h=i.length>0?i[i.length-1].nextSibling:t.querySelector("style");t.insertBefore(r,(h==null?void 0:h.parentNode)===t?h:null)}else if("host"in t)if(lt){const i=new CSSStyleSheet;i.replaceSync(c),t.adoptedStyleSheets.unshift(i)}else{const i=t.querySelector("style");i?i.innerHTML=c+i.innerHTML:t.prepend(r)}else t.append(r);e.$flags$&1&&t.insertBefore(r,null)}e.$flags$&4&&(r.innerHTML+=Et),l&&l.add(n)}}else t.adoptedStyleSheets.includes(c)||t.adoptedStyleSheets.push(c);return n},Xt=t=>{const e=t.$cmpMeta$,o=t.$hostElement$,a=e.$flags$,n=_("attachStyles",e.$tagName$),c=Ft(o.shadowRoot?o.shadowRoot:o.getRootNode(),e);a&10&&(o["s-sc"]=c,o.classList.add(c+"-h")),n()},pt=(t,e)=>"sc-"+t.$tagName$,C=(t,e,...o)=>{let a=null,n=null,c=!1,l=!1;const r=[],d=h=>{for(let y=0;y<h.length;y++)a=h[y],Array.isArray(a)?d(a):a!=null&&typeof a!="boolean"&&((c=typeof t!="function"&&!F(a))&&(a=String(a)),c&&l?r[r.length-1].$text$+=a:r.push(c?D(null,a):a),l=c)};if(d(o),e){e.key&&(n=e.key);{const h=e.className||e.class;h&&(e.class=typeof h!="object"?h:Object.keys(h).filter(y=>h[y]).join(" "))}}const i=D(t,null);return i.$attrs$=e,r.length>0&&(i.$children$=r),i.$key$=n,i},D=(t,e)=>{const o={$flags$:0,$tag$:t,$text$:e,$elm$:null,$children$:null};return o.$attrs$=null,o.$key$=null,o},kt={},Gt=t=>t&&t.$tag$===kt,X=t=>{const e=It(t);return new RegExp(`(^|[^@]|@(?!supports\\s+selector\\s*\\([^{]*?${e}))(${e}\\b)`,"g")};X("::slotted");X(":host");X(":host-context");var ft=(t,e,o)=>t!=null&&!F(t)?e&4?t==="false"?!1:t===""||!!t:e&1?String(t):t:t,Vt=(t,e,o)=>{const a=v.ce(e,o);return t.dispatchEvent(a),a},ot=(t,e,o,a,n,c,l)=>{if(o===a)return;let r=J(t,e),d=e.toLowerCase();if(e==="class"){const i=t.classList,h=at(o);let y=at(a);i.remove(...h.filter(p=>p&&!y.includes(p))),i.add(...y.filter(p=>p&&!h.includes(p)))}else if(e==="style"){for(const i in o)(!a||a[i]==null)&&(i.includes("-")?t.style.removeProperty(i):t.style[i]="");for(const i in a)(!o||a[i]!==o[i])&&(i.includes("-")?t.style.setProperty(i,a[i]):t.style[i]=a[i])}else if(e!=="key")if(e==="ref")a&&a(t);else if(!t.__lookupSetter__(e)&&e[0]==="o"&&e[1]==="n"){if(e[2]==="-"?e=e.slice(3):J($,d)?e=d.slice(2):e=d[2]+e.slice(3),o||a){const i=e.endsWith($t);e=e.replace(Qt,""),o&&v.rel(t,e,o,i),a&&v.ael(t,e,a,i)}}else{const i=F(a);if(r||i&&a!==null)try{if(t.tagName.includes("-"))t[e]!==a&&(t[e]=a);else{const y=a??"";e==="list"?r=!1:(o==null||t[e]!=y)&&(typeof t.__lookupSetter__(e)=="function"?t[e]=y:t.setAttribute(e,y))}}catch{}let h=!1;d!==(d=d.replace(/^xlink\:?/,""))&&(e=d,h=!0),a==null||a===!1?(a!==!1||t.getAttribute(e)==="")&&(h?t.removeAttributeNS(Y,e):t.removeAttribute(e)):(!r||c&4||n)&&!i&&t.nodeType===1&&(a=a===!0?"":a,h?t.setAttributeNS(Y,e,a):t.setAttribute(e,a))}},Kt=/\s/,at=t=>(typeof t=="object"&&t&&"baseVal"in t&&(t=t.baseVal),!t||typeof t!="string"?[]:t.split(Kt)),$t="Capture",Qt=new RegExp($t+"$"),ut=(t,e,o,a)=>{const n=e.$elm$.nodeType===11&&e.$elm$.host?e.$elm$.host:e.$elm$,c=t&&t.$attrs$||{},l=e.$attrs$||{};for(const r of nt(Object.keys(c)))r in l||ot(n,r,c[r],void 0,o,e.$flags$);for(const r of nt(Object.keys(l)))ot(n,r,c[r],l[r],o,e.$flags$)};function nt(t){return t.includes("ref")?[...t.filter(e=>e!=="ref"),"ref"]:t}var G,vt=!1,q=(t,e,o)=>{const a=e.$children$[o];let n=0,c,l;if(a.$text$!==null)c=a.$elm$=$.document.createTextNode(a.$text$);else{if(!$.document)throw new Error("You are trying to render a Stencil component in an environment that doesn't support the DOM. Make sure to populate the [`window`](https://developer.mozilla.org/en-US/docs/Web/API/Window/window) object before rendering a component.");if(c=a.$elm$=$.document.createElement(a.$tag$),ut(null,a,vt),a.$children$)for(n=0;n<a.$children$.length;++n)l=q(t,a,n),l&&c.appendChild(l)}return c["s-hn"]=G,c},gt=(t,e,o,a,n,c)=>{let l=t,r;for(l.shadowRoot&&l.tagName===G&&(l=l.shadowRoot);n<=c;++n)a[n]&&(r=q(null,o,n),r&&(a[n].$elm$=r,H(l,r,e)))},_t=(t,e,o)=>{for(let a=e;a<=o;++a){const n=t[a];if(n){const c=n.$elm$;Mt(n),c&&c.remove()}}},Jt=(t,e,o,a,n=!1)=>{let c=0,l=0,r=0,d=0,i=e.length-1,h=e[0],y=e[i],p=a.length-1,k=a[0],f=a[p],u,b;for(;c<=i&&l<=p;)if(h==null)h=e[++c];else if(y==null)y=e[--i];else if(k==null)k=a[++l];else if(f==null)f=a[--p];else if(z(h,k,n))M(h,k,n),h=e[++c],k=a[++l];else if(z(y,f,n))M(y,f,n),y=e[--i],f=a[--p];else if(z(h,f,n))M(h,f,n),H(t,h.$elm$,y.$elm$.nextSibling),h=e[++c],f=a[--p];else if(z(y,k,n))M(y,k,n),H(t,y.$elm$,h.$elm$),y=e[--i],k=a[++l];else{for(r=-1,d=c;d<=i;++d)if(e[d]&&e[d].$key$!==null&&e[d].$key$===k.$key$){r=d;break}r>=0?(b=e[r],b.$tag$!==k.$tag$?u=q(e&&e[l],o,r):(M(b,k,n),e[r]=void 0,u=b.$elm$),k=a[++l]):(u=q(e&&e[l],o,l),k=a[++l]),u&&H(h.$elm$.parentNode,u,h.$elm$)}c>i?gt(t,a[p+1]==null?null:a[p+1].$elm$,o,a,l,p):l>p&&_t(e,c,i)},z=(t,e,o=!1)=>t.$tag$===e.$tag$?o?(o&&!t.$key$&&e.$key$&&(t.$key$=e.$key$),!0):t.$key$===e.$key$:!1,M=(t,e,o=!1)=>{const a=e.$elm$=t.$elm$,n=t.$children$,c=e.$children$,l=e.$text$;l===null?(ut(t,e,vt),n!==null&&c!==null?Jt(a,n,e,c,o):c!==null?(t.$text$!==null&&(a.textContent=""),gt(a,null,e,c,0,c.length-1)):!o&&N.updatable&&n!==null&&_t(n,0,n.length-1)):t.$text$!==l&&(a.data=l)},Mt=t=>{t.$attrs$&&t.$attrs$.ref&&t.$attrs$.ref(null),t.$children$&&t.$children$.map(Mt)},H=(t,e,o)=>t==null?void 0:t.insertBefore(e,o),Yt=(t,e,o=!1)=>{const a=t.$hostElement$,n=t.$cmpMeta$,c=t.$vnode$||D(null,null),r=Gt(e)?e:C(null,null,e);if(G=a.tagName,n.$attrsToReflect$&&(r.$attrs$=r.$attrs$||{},n.$attrsToReflect$.map(([d,i])=>r.$attrs$[i]=a[d])),o&&r.$attrs$)for(const d of Object.keys(r.$attrs$))a.hasAttribute(d)&&!["key","ref","style","class"].includes(d)&&(r.$attrs$[d]=a[d]);r.$tag$=null,r.$flags$|=4,t.$vnode$=r,r.$elm$=c.$elm$=a.shadowRoot||a,M(c,r,o)},xt=(t,e)=>{if(e&&!t.$onRenderResolve$&&e["s-p"]){const o=e["s-p"].push(new Promise(a=>t.$onRenderResolve$=()=>{e["s-p"].splice(o-1,1),a()}))}},V=(t,e)=>{if(t.$flags$|=16,t.$flags$&4){t.$flags$|=512;return}return xt(t,t.$ancestorComponent$),Pt(()=>te(t,e))},te=(t,e)=>{const o=t.$hostElement$,a=_("scheduleUpdate",t.$cmpMeta$.$tagName$),n=o;if(!n)throw new Error(`Can't render component <${o.tagName.toLowerCase()} /> with invalid Stencil runtime! Make sure this imported component is compiled with a \`externalRuntime: true\` flag. For more information, please refer to https://stenciljs.com/docs/custom-elements#externalruntime`);let c;return e?c=m(n,"componentWillLoad",void 0,o):c=m(n,"componentWillUpdate",void 0,o),c=st(c,()=>m(n,"componentWillRender",void 0,o)),a(),st(c,()=>oe(t,n,e))},st=(t,e)=>ee(t)?t.then(e).catch(o=>{console.error(o),e()}):e(),ee=t=>t instanceof Promise||t&&t.then&&typeof t.then=="function",oe=async(t,e,o)=>{var a;const n=t.$hostElement$,c=_("update",t.$cmpMeta$.$tagName$),l=n["s-rc"];o&&Xt(t);const r=_("render",t.$cmpMeta$.$tagName$);ae(t,e,n,o),l&&(l.map(d=>d()),n["s-rc"]=void 0),r(),c();{const d=(a=n["s-p"])!=null?a:[],i=()=>ne(t);d.length===0?i():(Promise.all(d).then(i),t.$flags$|=4,d.length=0)}},ae=(t,e,o,a)=>{try{e=e.render(),t.$flags$&=-17,t.$flags$|=2,Yt(t,e,a)}catch(n){P(n,t.$hostElement$)}return null},ne=t=>{const e=t.$cmpMeta$.$tagName$,o=t.$hostElement$,a=_("postUpdate",e),n=o,c=t.$ancestorComponent$;m(n,"componentDidRender",void 0,o),t.$flags$&64?(m(n,"componentDidUpdate",void 0,o),a()):(t.$flags$|=64,ce(o),m(n,"componentDidLoad",void 0,o),a(),t.$onReadyResolve$(o),c||se()),t.$onRenderResolve$&&(t.$onRenderResolve$(),t.$onRenderResolve$=void 0),t.$flags$&512&&Z(()=>V(t,!1)),t.$flags$&=-517},se=t=>{Z(()=>Vt($,"appload",{detail:{namespace:zt}}))},m=(t,e,o,a)=>{if(t&&t[e])try{return t[e](o)}catch(n){P(n,a)}},ce=t=>{var e;return t.classList.add((e=N.hydratedSelectorName)!=null?e:"hydrated")},re=(t,e)=>g(t).$instanceValues$.get(e),ct=(t,e,o,a)=>{const n=g(t),c=t,l=n.$instanceValues$.get(e),r=n.$flags$,d=c;o=ft(o,a.$members$[e][0]);const i=Number.isNaN(l)&&Number.isNaN(o);if(o!==l&&!i){n.$instanceValues$.set(e,o);{if(a.$watchers$&&r&128){const y=a.$watchers$[e];y&&y.map(p=>{try{d[p](o,l,e)}catch(k){P(k,c)}})}if((r&18)===2){if(d.componentShouldUpdate&&d.componentShouldUpdate(o,l,e)===!1)return;V(n,!1)}}}},ie=(t,e,o)=>{var a,n;const c=t.prototype;if(e.$members$||e.$watchers$||t.watchers){t.watchers&&!e.$watchers$&&(e.$watchers$=t.watchers);const l=Object.entries((a=e.$members$)!=null?a:{});l.map(([r,[d]])=>{if(d&31||d&32){const{get:i,set:h}=Object.getOwnPropertyDescriptor(c,r)||{};i&&(e.$members$[r][0]|=2048),h&&(e.$members$[r][0]|=4096),Object.defineProperty(c,r,{get(){return i?i.apply(this):re(this,r)},configurable:!0,enumerable:!0}),Object.defineProperty(c,r,{set(y){const p=g(this);if(h){const k=d&32?this[r]:p.$hostElement$[r];typeof k>"u"&&p.$instanceValues$.get(r)?y=p.$instanceValues$.get(r):!p.$instanceValues$.get(r)&&k&&p.$instanceValues$.set(r,k),h.apply(this,[ft(y,d)]),y=d&32?this[r]:p.$hostElement$[r],ct(this,r,y,e);return}{ct(this,r,y,e);return}}})}});{const r=new Map;c.attributeChangedCallback=function(d,i,h){v.jmp(()=>{var y;const p=r.get(d);if(!(this.hasOwnProperty(p)&&N.lazyLoad)){if(c.hasOwnProperty(p)&&typeof this[p]=="number"&&this[p]==h)return;if(p==null){const f=g(this),u=f==null?void 0:f.$flags$;if(u&&!(u&8)&&u&128&&h!==i){const T=this,K=(y=e.$watchers$)==null?void 0:y[d];K==null||K.forEach(Q=>{T[Q]!=null&&T[Q].call(T,h,i,d)})}return}}const k=Object.getOwnPropertyDescriptor(c,p);h=h===null&&typeof this[p]=="boolean"?!1:h,h!==this[p]&&(!k.get||k.set)&&(this[p]=h)})},t.observedAttributes=Array.from(new Set([...Object.keys((n=e.$watchers$)!=null?n:{}),...l.filter(([d,i])=>i[0]&15).map(([d,i])=>{var h;const y=i[1]||d;return r.set(y,d),i[0]&512&&((h=e.$attrsToReflect$)==null||h.push([d,y])),y})]))}}return t},rt=async(t,e,o,a)=>{let n;if((e.$flags$&32)===0){e.$flags$|=32;{n=t.constructor;const r=t.localName;customElements.whenDefined(r).then(()=>e.$flags$|=128)}if(n&&n.style){let r;typeof n.style=="string"&&(r=n.style);const d=pt(o);if(!E.has(d)){const i=_("registerStyles",o.$tagName$);Zt(d,r,!!(o.$flags$&1)),i()}}}const c=e.$ancestorComponent$,l=()=>V(e,!0);c&&c["s-rc"]?c["s-rc"].push(l):l()},le=(t,e)=>{},de=t=>{{const e=g(t),o=e.$cmpMeta$,a=_("connectedCallback",o.$tagName$);if(e.$flags$&1)e!=null&&e.$lazyInstance$||e!=null&&e.$onReadyPromise$&&e.$onReadyPromise$.then(()=>le());else{e.$flags$|=1;{let n=t;for(;n=n.parentNode||n.host;)if(n["s-p"]){xt(e,e.$ancestorComponent$=n);break}}o.$members$&&Object.entries(o.$members$).map(([n,[c]])=>{if(c&31&&t.hasOwnProperty(n)){const l=t[n];delete t[n],t[n]=l}}),N.initializeNextTick?Z(()=>rt(t,e,o)):rt(t,e,o)}a()}},he=async t=>{g(t),x.has(t)&&x.delete(t),t.shadowRoot&&x.has(t.shadowRoot)&&x.delete(t.shadowRoot)},ye=(t,e)=>{const o={$flags$:e[0],$tagName$:e[1]};o.$members$=e[2],o.$watchers$=t.$watchers$,o.$attrsToReflect$=[];const a=t.prototype.connectedCallback,n=t.prototype.disconnectedCallback;return Object.assign(t.prototype,{__hasHostListenerAttached:!1,__registerHost(){Ht(this,o)},connectedCallback(){this.__hasHostListenerAttached||(g(this),this.__hasHostListenerAttached=!0),de(this),a&&a.call(this)},disconnectedCallback(){he(this),n&&n.call(this)},__attachShadow(){if(!this.shadowRoot)Wt.call(this,o);else if(this.shadowRoot.mode!=="open")throw new Error(`Unable to re-use existing shadow root for ${o.$tagName$}! Mode is set to ${this.shadowRoot.mode} but Stencil only supports open shadow roots.`)}}),t.is=o.$tagName$,ie(t,o)};let O;const pe=()=>{if(typeof window>"u")return new Map;if(!O){const t=window;t.Ionicons=t.Ionicons||{},O=t.Ionicons.map=t.Ionicons.map||new Map}return O},ke=t=>{let e=I(t.src);return e||(e=mt(t.name,t.icon,t.mode,t.ios,t.md),e?fe(e,t):t.icon&&(e=I(t.icon),e||(e=I(t.icon[t.mode]),e))?e:null)},fe=(t,e)=>{const o=pe().get(t);if(o)return o;try{return Tt(`svg/${t}.svg`)}catch(a){console.log("e",a),console.warn(`[Ionicons Warning]: Could not load icon with name "${t}". Ensure that the icon is registered using addIcons or that the icon SVG data is passed directly to the icon component.`,e)}},mt=(t,e,o,a,n)=>(o=(o&&L(o))==="ios"?"ios":"md",a&&o==="ios"?t=L(a):n&&o==="md"?t=L(n):(!t&&e&&!wt(e)&&(t=e),j(t)&&(t=L(t))),!j(t)||t.trim()===""||t.replace(/[a-z]|-|\d/gi,"")!==""?null:t),I=t=>j(t)&&(t=t.trim(),wt(t))?t:null,wt=t=>t.length>0&&/(\/|\.)/.test(t),j=t=>typeof t=="string",L=t=>t.toLowerCase(),$e=(t,e=[])=>{const o={};return e.forEach(a=>{t.hasAttribute(a)&&(t.getAttribute(a)!==null&&(o[a]=t.getAttribute(a)),t.removeAttribute(a))}),o},ue=t=>t&&t.dir!==""?t.dir.toLowerCase()==="rtl":(document==null?void 0:document.dir.toLowerCase())==="rtl",ve=t=>{const e=document.createElement("div");e.innerHTML=t;for(let a=e.childNodes.length-1;a>=0;a--)e.childNodes[a].nodeName.toLowerCase()!=="svg"&&e.removeChild(e.childNodes[a]);const o=e.firstElementChild;if(o&&o.nodeName.toLowerCase()==="svg"){const a=o.getAttribute("class")||"";if(o.setAttribute("class",(a+" s-ion-icon").trim()),bt(o))return e.innerHTML}return""},bt=t=>{if(t.nodeType===1){if(t.nodeName.toLowerCase()==="script")return!1;for(let e=0;e<t.attributes.length;e++){const o=t.attributes[e].name;if(j(o)&&o.toLowerCase().indexOf("on")===0)return!1}for(let e=0;e<t.childNodes.length;e++)if(!bt(t.childNodes[e]))return!1}return!0},ge=t=>t.startsWith("data:image/svg+xml"),_e=t=>t.indexOf(";utf8,")!==-1,w=new Map,St=new Map;let U;function W(t){return w.set(t,""),""}const Me=(t,e)=>{const o=St.get(t);return o||(typeof fetch<"u"&&typeof document<"u"?ge(t)&&_e(t)?Promise.resolve(xe(t)):me(t,e):Promise.resolve(W(t)))};function xe(t){U||(U=new DOMParser);const o=U.parseFromString(t,"text/html").querySelector("svg");if(o)return w.set(t,o.outerHTML),o.outerHTML;throw new Error(`Could not parse svg from ${t}`)}function me(t,e){const o=fetch(t).then(a=>a.text().then(n=>{n&&e!==!1&&(n=ve(n));const c=n||"";return w.set(t,c),c}).catch(()=>W(t))).catch(()=>W(t));return St.set(t,o),o}const we=":host{display:inline-block;width:1em;height:1em;contain:strict;fill:currentColor;box-sizing:content-box !important}:host .ionicon{stroke:currentColor}.ionicon-fill-none{fill:none}.ionicon-stroke-width{stroke-width:var(--ionicon-stroke-width, 32px)}.icon-inner,.ionicon,svg{display:block;height:100%;width:100%}@supports (background: -webkit-named-image(i)){:host(.icon-rtl) .icon-inner{transform:scaleX(-1)}}@supports not selector(:dir(rtl)) and selector(:host-context([dir='rtl'])){:host(.icon-rtl) .icon-inner{transform:scaleX(-1)}}:host(.flip-rtl):host-context([dir='rtl']) .icon-inner{transform:scaleX(-1)}@supports selector(:dir(rtl)){:host(.flip-rtl:dir(rtl)) .icon-inner{transform:scaleX(-1)}:host(.flip-rtl:dir(ltr)) .icon-inner{transform:scaleX(1)}}:host(.icon-small){font-size:1.125rem !important}:host(.icon-large){font-size:2rem !important}:host(.ion-color){color:var(--ion-color-base) !important}:host(.ion-color-primary){--ion-color-base:var(--ion-color-primary, #3880ff)}:host(.ion-color-secondary){--ion-color-base:var(--ion-color-secondary, #0cd1e8)}:host(.ion-color-tertiary){--ion-color-base:var(--ion-color-tertiary, #f4a942)}:host(.ion-color-success){--ion-color-base:var(--ion-color-success, #10dc60)}:host(.ion-color-warning){--ion-color-base:var(--ion-color-warning, #ffce00)}:host(.ion-color-danger){--ion-color-base:var(--ion-color-danger, #f14141)}:host(.ion-color-light){--ion-color-base:var(--ion-color-light, #f4f5f8)}:host(.ion-color-medium){--ion-color-base:var(--ion-color-medium, #989aa2)}:host(.ion-color-dark){--ion-color-base:var(--ion-color-dark, #222428)}",be=ye(class extends qt{constructor(){super(),this.__registerHost(),this.__attachShadow(),this.iconName=null,this.inheritedAttributes={},this.didLoadIcon=!1,this.isVisible=!1,this.mode=Se(),this.lazy=!1,this.sanitize=!0}componentWillLoad(){this.inheritedAttributes=$e(this.el,["aria-label"])}connectedCallback(){this.waitUntilVisible(this.el,"50px",()=>{this.isVisible=!0,this.loadIcon()})}componentDidLoad(){this.didLoadIcon||this.loadIcon()}disconnectedCallback(){this.io&&(this.io.disconnect(),this.io=void 0)}waitUntilVisible(e,o,a){if(!!!(this.lazy&&typeof window<"u"&&window.IntersectionObserver))return a();const c=this.io=new window.IntersectionObserver(l=>{l[0].isIntersecting&&(c.disconnect(),this.io=void 0,a())},{rootMargin:o});c.observe(e)}loadIcon(){if(this.isVisible){const e=ke(this);e&&(w.has(e)?this.svgContent=w.get(e):Me(e,this.sanitize).then(()=>this.svgContent=w.get(e)),this.didLoadIcon=!0)}this.iconName=mt(this.name,this.icon,this.mode,this.ios,this.md)}render(){const{flipRtl:e,iconName:o,inheritedAttributes:a,el:n}=this,c=this.mode||"md",l=o?(o.includes("arrow")||o.includes("chevron"))&&e!==!1:!1,r=e||l;return C(kt,Object.assign({key:"0578c899781ca145dd8205acd9670af39b57cf2e",role:"img",class:Object.assign(Object.assign({[c]:!0},Ae(this.color)),{[`icon-${this.size}`]:!!this.size,"flip-rtl":r,"icon-rtl":r&&ue(n)})},a),this.svgContent?C("div",{class:"icon-inner",innerHTML:this.svgContent}):C("div",{class:"icon-inner"}))}static get assetsDirs(){return["svg"]}get el(){return this}static get watchers(){return{name:["loadIcon"],src:["loadIcon"],icon:["loadIcon"],ios:["loadIcon"],md:["loadIcon"]}}static get style(){return we}},[1,"ion-icon",{mode:[1025],color:[1],ios:[1],md:[1],flipRtl:[4,"flip-rtl"],name:[513],src:[1],icon:[8],size:[1],lazy:[4],sanitize:[4],svgContent:[32],isVisible:[32]},void 0,{name:["loadIcon"],src:["loadIcon"],icon:["loadIcon"],ios:["loadIcon"],md:["loadIcon"]}]),Se=()=>typeof document<"u"&&document.documentElement.getAttribute("mode")||"md",Ae=t=>t?{"ion-color":!0,[`ion-color-${t}`]:!0}:null;function ze(){if(typeof customElements>"u")return;["ion-icon"].forEach(e=>{switch(e){case"ion-icon":customElements.get(e)||customElements.define(e,be);break}})}const jo=ze;/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Le=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Ce=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,o,a)=>a?a.toUpperCase():o.toLowerCase()),it=t=>{const e=Ce(t);return e.charAt(0).toUpperCase()+e.slice(1)},At=(...t)=>t.filter((e,o,a)=>!!e&&e.trim()!==""&&a.indexOf(e)===o).join(" ").trim(),He=t=>{for(const e in t)if(e.startsWith("aria-")||e==="role"||e==="title")return!0};/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Ee={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qe=S.forwardRef(({color:t="currentColor",size:e=24,strokeWidth:o=2,absoluteStrokeWidth:a,className:n="",children:c,iconNode:l,...r},d)=>S.createElement("svg",{ref:d,...Ee,width:e,height:e,stroke:t,strokeWidth:a?Number(o)*24/Number(e):o,className:At("lucide",n),...!c&&!He(r)&&{"aria-hidden":"true"},...r},[...l.map(([i,h])=>S.createElement(i,h)),...Array.isArray(c)?c:[c]]));/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s=(t,e)=>{const o=S.forwardRef(({className:a,...n},c)=>S.createElement(qe,{ref:c,iconNode:e,className:At(`lucide-${Le(it(t))}`,`lucide-${t}`,a),...n}));return o.displayName=it(t),o};/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const je=[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]],No=s("activity",je);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ne=[["path",{d:"M12 6.528V3a1 1 0 0 1 1-1h0",key:"11qiee"}],["path",{d:"M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21",key:"110c12"}]],Po=s("apple",Ne);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pe=[["path",{d:"M17 7 7 17",key:"15tmo1"}],["path",{d:"M17 17H7V7",key:"1org7z"}]],To=s("arrow-down-left",Pe);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Te=[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]],Oo=s("arrow-left",Te);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oe=[["path",{d:"m16 3 4 4-4 4",key:"1x1c3m"}],["path",{d:"M20 7H4",key:"zbl0bi"}],["path",{d:"m8 21-4-4 4-4",key:"h9nckh"}],["path",{d:"M4 17h16",key:"g4d7ey"}]],Io=s("arrow-right-left",Oe);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ie=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],Uo=s("arrow-right",Ie);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ue=[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]],Ro=s("arrow-up-right",Ue);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Re=[["path",{d:"M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5",key:"1u7htd"}],["path",{d:"M15 12h.01",key:"1k8ypt"}],["path",{d:"M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1",key:"11xh7x"}],["path",{d:"M9 12h.01",key:"157uk2"}]],Bo=s("baby",Re);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Be=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M22 8c0-2.3-.8-4.3-2-6",key:"5bb3ad"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}],["path",{d:"M4 2C2.8 3.7 2 5.7 2 8",key:"tap9e0"}]],Do=s("bell-ring",Be);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const De=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]],Wo=s("bell",De);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const We=[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]],Zo=s("box",We);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ze=[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]],Fo=s("briefcase",Ze);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fe=[["path",{d:"M12 20v-9",key:"1qisl0"}],["path",{d:"M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z",key:"uouzyp"}],["path",{d:"M14.12 3.88 16 2",key:"qol33r"}],["path",{d:"M21 21a4 4 0 0 0-3.81-4",key:"1b0z45"}],["path",{d:"M21 5a4 4 0 0 1-3.55 3.97",key:"5cxbf6"}],["path",{d:"M22 13h-4",key:"1jl80f"}],["path",{d:"M3 21a4 4 0 0 1 3.81-4",key:"1fjd4g"}],["path",{d:"M3 5a4 4 0 0 0 3.55 3.97",key:"1d7oge"}],["path",{d:"M6 13H2",key:"82j7cp"}],["path",{d:"m8 2 1.88 1.88",key:"fmnt4t"}],["path",{d:"M9 7.13V6a3 3 0 1 1 6 0v1.13",key:"1vgav8"}]],Xo=s("bug",Fe);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xe=[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]],Go=s("calculator",Xe);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ge=[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M17 14h-6",key:"bkmgh3"}],["path",{d:"M13 18H7",key:"bb0bb7"}],["path",{d:"M7 14h.01",key:"1qa3f1"}],["path",{d:"M17 18h.01",key:"1bdyru"}]],Vo=s("calendar-range",Ge);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ve=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],Ko=s("calendar",Ve);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ke=[["path",{d:"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",key:"18u6gg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]],Qo=s("camera",Ke);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qe=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],Jo=s("chart-column",Qe);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Je=[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]],Yo=s("check-check",Je);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ye=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],ta=s("check",Ye);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t1=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],ea=s("chevron-down",t1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e1=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],oa=s("chevron-left",e1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o1=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],aa=s("chevron-right",o1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a1=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],na=s("chevron-up",a1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],sa=s("circle-alert",n1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s1=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],ca=s("circle-check-big",s1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],ra=s("circle-check",c1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}]],ia=s("circle-dot",r1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]],la=s("circle-question-mark",i1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l1=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"m9 14 2 2 4-4",key:"df797q"}]],da=s("clipboard-check",l1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d1=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]],ha=s("clipboard-list",d1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h1=[["path",{d:"M12 6v6l4 2",key:"mmk7yg"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],ya=s("clock",h1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y1=[["circle",{cx:"8",cy:"8",r:"6",key:"3yglwk"}],["path",{d:"M18.09 10.37A6 6 0 1 1 10.34 18",key:"t5s6rm"}],["path",{d:"M7 6h1v4",key:"1obek4"}],["path",{d:"m16.71 13.88.7.71-2.82 2.82",key:"1rbuyh"}]],pa=s("coins",y1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p1=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],ka=s("download",p1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k1=[["path",{d:"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z",key:"1ptgy4"}],["path",{d:"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97",key:"1sl1rz"}]],fa=s("droplets",k1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f1=[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"12",cy:"5",r:"1",key:"gxeob9"}],["circle",{cx:"12",cy:"19",r:"1",key:"lyex9k"}]],$a=s("ellipsis-vertical",f1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $1=[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"19",cy:"12",r:"1",key:"1wjl8i"}],["circle",{cx:"5",cy:"12",r:"1",key:"1pcz8c"}]],ua=s("ellipsis",$1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u1=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],va=s("external-link",u1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v1=[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]],ga=s("file-text",v1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g1=[["path",{d:"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",key:"18mbvz"}],["path",{d:"M6.453 15h11.094",key:"3shlmq"}],["path",{d:"M8.5 2h7",key:"csnxdl"}]],_a=s("flask-conical",g1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _1=[["path",{d:"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",key:"1fvzgz"}],["path",{d:"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",key:"1kc0my"}],["path",{d:"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",key:"10h0bg"}],["path",{d:"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",key:"1s1gnw"}]],Ma=s("hand",_1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M1=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}],["path",{d:"M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27",key:"auskq0"}]],xa=s("heart-pulse",M1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x1=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}]],ma=s("heart",x1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m1=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"r6nss1"}]],wa=s("house",m1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w1=[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12",key:"o97t9d"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}]],ba=s("inbox",w1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b1=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],Sa=s("info",b1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S1=[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],Aa=s("layers",S1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A1=[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]],za=s("layout-grid",A1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z1=[["path",{d:"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",key:"nnexq3"}],["path",{d:"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",key:"mt58a7"}]],La=s("leaf",z1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L1=[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]],Ca=s("lightbulb",L1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C1=[["path",{d:"M3 5h.01",key:"18ugdj"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 19h.01",key:"noohij"}],["path",{d:"M8 5h13",key:"1pao27"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 19h13",key:"m83p4d"}]],Ha=s("list",C1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H1=[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],Ea=s("loader-circle",H1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E1=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],qa=s("lock",E1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q1=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],ja=s("log-out",q1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j1=[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]],Na=s("mail",j1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N1=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"m21 3-7 7",key:"1l2asr"}],["path",{d:"m3 21 7-7",key:"tjx5ai"}],["path",{d:"M9 21H3v-6",key:"wtvkvv"}]],Pa=s("maximize-2",N1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P1=[["path",{d:"M12 13v8",key:"1l5pq0"}],["path",{d:"M12 3v3",key:"1n5kay"}],["path",{d:"M4 6a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h13a2 2 0 0 0 1.152-.365l3.424-2.317a1 1 0 0 0 0-1.635l-3.424-2.318A2 2 0 0 0 17 6z",key:"1btarq"}]],Ta=s("milestone",P1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T1=[["path",{d:"M8 2h8",key:"1ssgc1"}],["path",{d:"M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2",key:"qtp12x"}],["path",{d:"M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0",key:"ygeh44"}]],Oa=s("milk",T1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O1=[["path",{d:"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4",key:"re6nr2"}],["path",{d:"M2 6h4",key:"aawbzj"}],["path",{d:"M2 10h4",key:"l0bgd4"}],["path",{d:"M2 14h4",key:"1gsvsf"}],["path",{d:"M2 18h4",key:"1bu2t1"}],["path",{d:"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z",key:"pqwjuv"}]],Ia=s("notebook-pen",O1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I1=[["path",{d:"M12 16h.01",key:"1drbdi"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z",key:"1fd625"}]],Ua=s("octagon-alert",I1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U1=[["path",{d:"m16 16 2 2 4-4",key:"gfu2re"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",key:"e7tb2h"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12",key:"a4e8g8"}]],Ra=s("package-check",U1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R1=[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]],Ba=s("package",R1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B1=[["circle",{cx:"11",cy:"4",r:"2",key:"vol9p0"}],["circle",{cx:"18",cy:"8",r:"2",key:"17gozi"}],["circle",{cx:"20",cy:"16",r:"2",key:"1v9bxh"}],["path",{d:"M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z",key:"1ydw1z"}]],Da=s("paw-print",B1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D1=[["path",{d:"M13 21h8",key:"1jsn5i"}],["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],Wa=s("pen-line",D1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W1=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]],Za=s("pencil",W1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=[["path",{d:"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",key:"9njp5v"}]],Fa=s("phone",Z1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F1=[["path",{d:"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z",key:"wa1lgi"}],["path",{d:"m8.5 8.5 7 7",key:"rvfmvr"}]],Xa=s("pill",F1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X1=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],Ga=s("plus",X1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G1=[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]],Va=s("printer",G1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V1=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],Ka=s("refresh-cw",V1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K1=[["path",{d:"m17 2 4 4-4 4",key:"nntrym"}],["path",{d:"M3 11v-1a4 4 0 0 1 4-4h14",key:"84bu3i"}],["path",{d:"m7 22-4-4 4-4",key:"1wqhfi"}],["path",{d:"M21 13v1a4 4 0 0 1-4 4H3",key:"1rx37r"}]],Qa=s("repeat",K1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q1=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]],Ja=s("rotate-ccw",Q1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]],Ya=s("save",J1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y1=[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]],tn=s("scale",Y1);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const to=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],en=s("search",to);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eo=[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]],on=s("send",eo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oo=[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]],an=s("server",oo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ao=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],nn=s("settings",ao);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const no=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]],sn=s("shield-alert",no);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const so=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],cn=s("shield-check",so);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]],rn=s("shield",co);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ro=[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]],ln=s("shopping-cart",ro);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const io=[["path",{d:"m12.5 17-.5-1-.5 1h1z",key:"3me087"}],["path",{d:"M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z",key:"1o5pge"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}]],dn=s("skull",io);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lo=[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],hn=s("sparkles",lo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ho=[["path",{d:"M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3",key:"139s4v"}],["path",{d:"M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4",key:"1dlkgp"}],["path",{d:"M5 21h14",key:"11awu3"}]],yn=s("sprout",ho);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yo=[["path",{d:"M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344",key:"2acyp4"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],pn=s("square-check-big",yo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const po=[["path",{d:"M8 19H5c-1 0-2-1-2-2V7c0-1 1-2 2-2h3",key:"lubmu8"}],["path",{d:"M16 5h3c1 0 2 1 2 2v10c0 1-1 2-2 2h-3",key:"1ag34g"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20",key:"1tx1rr"}]],kn=s("square-split-horizontal",po);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ko=[["path",{d:"M11 2v2",key:"1539x4"}],["path",{d:"M5 2v2",key:"1yf1q8"}],["path",{d:"M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1",key:"rb5t3r"}],["path",{d:"M8 15a6 6 0 0 0 12 0v-3",key:"x18d4x"}],["circle",{cx:"20",cy:"10",r:"2",key:"ts1r5v"}]],fn=s("stethoscope",ko);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fo=[["path",{d:"m18 2 4 4",key:"22kx64"}],["path",{d:"m17 7 3-3",key:"1w1zoj"}],["path",{d:"M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5",key:"1exhtz"}],["path",{d:"m9 11 4 4",key:"rovt3i"}],["path",{d:"m5 19-3 3",key:"59f2uf"}],["path",{d:"m14 4 6 6",key:"yqp9t2"}]],$n=s("syringe",fo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $o=[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]],un=s("tag",$o);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uo=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],vn=s("target",uo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vo=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],gn=s("trash-2",vo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const go=[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]],_n=s("trending-up",go);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _o=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],Mn=s("triangle-alert",_o);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mo=[["path",{d:"M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978",key:"1n3hpd"}],["path",{d:"M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978",key:"rfe1zi"}],["path",{d:"M18 9h1.5a1 1 0 0 0 0-5H18",key:"7xy6bh"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z",key:"1mhfuq"}],["path",{d:"M6 9H4.5a1 1 0 0 1 0-5H6",key:"tex48p"}]],xn=s("trophy",Mo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xo=[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]],mn=s("truck",xo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mo=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]],wn=s("user-plus",mo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wo=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],bn=s("user",wo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bo=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],Sn=s("users",bo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const So=[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]],An=s("wallet",So);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ao=[["path",{d:"M2 22 16 8",key:"60hf96"}],["path",{d:"M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",key:"1rdhi6"}],["path",{d:"M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",key:"1sdzmb"}],["path",{d:"M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",key:"eoatbi"}],["path",{d:"M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z",key:"19rau1"}],["path",{d:"M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",key:"tc8ph9"}],["path",{d:"M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",key:"2m8kc5"}],["path",{d:"M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",key:"vex3ng"}]],zn=s("wheat",Ao);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}],["path",{d:"M5 12.859a10 10 0 0 1 5.17-2.69",key:"1dl1wf"}],["path",{d:"M19 12.859a10 10 0 0 0-2.007-1.523",key:"4k23kn"}],["path",{d:"M2 8.82a15 15 0 0 1 4.177-2.643",key:"1grhjp"}],["path",{d:"M22 8.82a15 15 0 0 0-11.288-3.764",key:"z3jwby"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],Ln=s("wifi-off",zo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lo=[["path",{d:"M12.8 19.6A2 2 0 1 0 14 16H2",key:"148xed"}],["path",{d:"M17.5 8a2.5 2.5 0 1 1 2 4H2",key:"1u4tom"}],["path",{d:"M9.8 4.4A2 2 0 1 1 11 8H2",key:"75valh"}]],Cn=s("wind",Lo);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Co=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],Hn=s("x",Co);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ho=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],En=s("zap",Ho);export{Wo as $,Oo as A,Do as B,Jo as C,oa as D,No as E,Ko as F,Ea as G,ma as H,ba as I,Wa as J,un as K,za as L,Pa as M,Ia as N,hn as O,Da as P,rn as Q,Ja as R,en as S,gn as T,Sn as U,sn as V,zn as W,Hn as X,La as Y,En as Z,ga as _,pn as a,Ua as a0,an as a1,ya as a2,bn as a3,Fo as a4,Fa as a5,Uo as a6,Na as a7,Vo as a8,Ln as a9,Cn as aA,xn as aB,pa as aC,To as aD,Ro as aE,$a as aF,Za as aG,dn as aH,xa as aI,Io as aJ,Va as aK,ka as aL,Ra as aM,Qa as aN,qa as aO,ln as aP,yn as aa,Ma as ab,ta as ac,Bo as ad,ua as ae,$n as af,Oa as ag,ja as ah,wn as ai,Ta as aj,mn as ak,vn as al,Sa as am,Po as an,da as ao,ia as ap,wa as aq,Ha as ar,ca as as,Ca as at,Ka as au,fa as av,_a as aw,va as ax,Go as ay,An as az,Aa as b,Ba as c,jo as d,nn as e,la as f,Ga as g,Xa as h,ea as i,Qo as j,Ya as k,sa as l,cn as m,Zo as n,fn as o,aa as p,on as q,ha as r,kn as s,ra as t,Mn as u,Xo as v,na as w,Yo as x,tn as y,_n as z};
