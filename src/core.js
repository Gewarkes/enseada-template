const ST=window.__ST||null,DATA=window.__DATA||{listings:[],posts:[]};
/* ===== Tudo que muda por cliente fica em SITE. ===== */
const SITE={
  brand:'Enseada', brandFull:'Enseada Imóveis', city:'Pipa', state:'RN',
  agent:{name:'Helena Cavalcanti', initials:'HC', creci:'CRECI/RN 00000-F', langs:'PT · EN · DE',
    role:{pt:'Corretora e fundadora',en:'Broker and founder',de:'Maklerin und Gründerin'}},
  phone:'+55 84 99999-0000', wa:'5500000000000', email:'contato@enseadaimoveis.com.br',
  address:'Av. Baía dos Golfinhos, 000 · Pipa, Tibau do Sul/RN',
  hours:{pt:'Seg a sáb, 9h às 18h',en:'Mon to Sat, 9 am to 6 pm',de:'Mo–Sa, 9–18 Uhr'},
  fx:{date:'2026-11-12',USD:0.17803,EUR:0.16067}, /* 1 real em moeda estrangeira; atualizado ao abrir (BCE) */
  fxUrl:'https://api.frankfurter.dev/v1/latest?base=BRL&symbols=USD,EUR',
  rate:11.5, buyCosts:0.045,
  media:{heroVideo:'',heroPoster:'70',about:'72',office:'map',team:'13',story1:'06',story2:'71',values:'73',cta:'74',publish:'21',portrait:'78',proof:'01'},
  stats:{sold:212,years:14,countries:23,rating:4.9,reviews:128},
  listings:DATA.listings,
  posts:DATA.posts
};
/* content/site.json (edited through the form) overrides the defaults above */
for(const k in (DATA.site||{})){const v=DATA.site[k];if(v!==''&&v!=null)SITE[k]=(v&&typeof v==='object'&&!Array.isArray(v)&&SITE[k]&&typeof SITE[k]==='object')?Object.assign({},SITE[k],v):v}

/* ===== Engine (shared by every template) ===== */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
/* static mode: every page is a real URL; window.__ST={base,origin,lang,route} is set by the page */
const LS={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
function pathRoute(){const p=location.pathname.slice(ST.base.length).split('/').filter(x=>x&&x!=='index.html'&&x!=='404.html');if(p[0]==='en'||p[0]==='de')ST.lang=p.shift();else ST.lang='pt';
  if(!p.length)return'home';if(p[0]==='imoveis')return p[1]?'imoveis-'+p[1]:'imoveis';if(p[0]==='imovel')return'imovel-'+(p[1]||'');if(p[0]==='blog')return p[1]?'artigo-'+p[1]:'blog';return p[0]}
if(ST&&ST.route==null)ST.route=pathRoute();
function urlFor(h,lang){h=String(h).replace(/^#/,'');const pre=ST.base+((lang||APP.lang)==='pt'?'':(lang||APP.lang)+'/');
  if(!h||h==='home')return pre;if(h.startsWith('imoveis-'))return pre+'imoveis/'+h.slice(8)+'/';if(h.startsWith('imovel-'))return pre+'imovel/'+h.slice(7)+'/';if(h.startsWith('artigo-'))return pre+'blog/'+h.slice(7)+'/';return pre+h+'/'}
const APP={lang:ST?ST.lang:(l=>l.startsWith('de')?'de':l.startsWith('pt')?'pt':l.startsWith('en')?'en':'pt')((navigator.language||'pt').toLowerCase()),cur:ST&&['USD','EUR'].includes(LS.get('cur'))?LS.get('cur'):'BRL',sys:'sac',fxLive:false,route:{view:'home',arg:''},state:{}};
const DICT={pt:{},en:{},de:{}};
const VIEWS={};
const addDict=d=>['pt','en','de'].forEach(l=>Object.assign(DICT[l],d[l]||{}));
const tr=k=>DICT[APP.lang][k]??DICT.pt[k]??k;
const L=o=>o==null?'':(typeof o==='string'?o:(o[APP.lang]??o.pt??''));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const isData=k=>/^(data:|blob:)/.test(String(k));
const B=ST?ST.base:'',ik=k=>{k=String(k).split('/').pop().replace(/\.[a-z0-9]+$/i,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');return /^\d+h$/.test(k)?k.slice(0,-1):k};
const img=k=>isData(k)?k:`${B}img/${ik(k)}.webp`;
const imgS=k=>isData(k)?k:`${B}img/${ik(k)}-s.webp`,imgX=k=>`${B}img/${ik(k)}-xs.webp`;
const srcW=k=>isData(k)||!ST?`src="${img(k)}"`:`src="${img(k)}" srcset="${imgX(k)} 480w, ${imgS(k)} 760w, ${img(k)} 1400w" sizes="(max-width:860px) 100vw, 900px"`;
const srcs=k=>isData(k)?`src="${k}"`:`src="${imgS(k)}" srcset="${ST?imgX(k)+' 480w, ':''}${imgS(k)} 760w, ${img(k)} 1400w" sizes="(max-width:860px) 100vw, 600px"`;
const sym={BRL:'R$ ',USD:'US$ ',EUR:'€ '};
const nf=(n,d=0)=>n.toLocaleString({pt:'pt-BR',en:'en-US',de:'de-DE'}[APP.lang],{minimumFractionDigits:d,maximumFractionDigits:d});
function money(v,c=APP.cur){if(c==='BRL')return sym.BRL+nf(Math.round(v));v*=SITE.fx[c];const st=v>=100000?1000:v>=1000?10:1;return sym[c]+nf(Math.round(v/st)*st)}
const price=l=>money(l.price)+(l.deal==='aluguel'?tr('perMonth'):'');
const fdate=d=>new Date(d+'T12:00:00').toLocaleDateString({pt:'pt-BR',en:'en-GB',de:'de-DE'}[APP.lang],{day:'numeric',month:'long',year:'numeric'});
const bySlug=s=>SITE.listings.find(l=>l.slug===s);
const waLink=l=>`https://wa.me/${SITE.wa}${l?`?text=${encodeURIComponent(tr('waText')+' '+l.name)}`:''}`;
const ICONS={arrow:'<path d="M4 12h15M13 6l6 6-6 6"/>',up:'<path d="M6 18 18 6M8 6h10v10"/>',check:'<path d="m5 12 5 5 9-10"/>',bed:'<path d="M3 18v-7h13a5 5 0 0 1 5 5v2M3 11V6M3 15h18M7 11V9h5v2"/>',bath:'<path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',area:'<path d="M4 4h16v16H4zM4 9h3M4 14h3M9 20v-3M14 20v-3"/>',lot:'<path d="M3 17 12 21l9-4M3 12l9 4 9-4M12 3 3 7l9 4 9-4z"/>',pin:'<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.800 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',phone:'<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',mail:'<path d="M3 6h18v12H3zM3 7l9 6 9-6"/>',plus:'<path d="M12 5v14M5 12h14"/>',menu:'<path d="M4 8h16M4 16h16"/>',close:'<path d="M6 6l12 12M18 6 6 18"/>',chev:'<path d="m6 9 6 6 6-6"/>',cal:'<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500 19 19M19 5l-1.500 1.500M6.500 17.500 5 19"/>',wave:'<path d="M2 9c3-3 5-3 8 0s5 3 8 0 3-2 4-2M2 16c3-3 5-3 8 0s5 3 8 0 3-2 4-2"/>',leaf:'<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 14M5 19c3-5 6-8 10-10"/>',car:'<path d="M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2M20 16v2M4 12h16"/><circle cx="8" cy="14" r=".6"/><circle cx="16" cy="14" r=".6"/>',snow:'<path d="M12 3v18M4.500 7.500l15 9M19.500 7.500l-15 9"/>',sofa:'<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M3 12a2 2 0 0 1 4 0v3h10v-3a2 2 0 0 1 4 0v6H3zM6 18v2M18 18v2"/>',fire:'<path d="M12 21a6 6 0 0 0 6-6c0-4-3-5-4-9-3 2-4 4-4 6-1-1-1.500-2-1.500-3C6.500 11 6 13 6 15a6 6 0 0 0 6 6z"/>',bolt:'<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>',drop:'<path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>',gate:'<path d="M4 20V8l8-4 8 4v12M4 12h16M9 20v-5h6v5"/>',bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20h4"/>',wifi:'<path d="M3 9a14 14 0 0 1 18 0M6 12.500a9 9 0 0 1 12 0M9 16a4.500 4.500 0 0 1 6 0"/><circle cx="12" cy="19" r=".8"/>',user:'<circle cx="12" cy="8" r="3.500"/><path d="M5 20a7 7 0 0 1 14 0"/>',deck:'<path d="M3 10h18M5 10v9M19 10v9M5 15h14M9 10V6h6v4"/>',doc:'<path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/>',road:'<path d="M8 3 5 21M16 3l3 18M12 5v3M12 11v3M12 17v3"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'};
const icon=n=>`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;
const WA_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.600 15.100L2 22l5-1.300A10 10 0 1 0 12 2zm0 1.800a8.200 8.200 0 1 1-4.200 15.300l-.300-.200-2.900.800.800-2.800-.200-.300A8.200 8.200 0 0 1 12 3.800zm-3.300 3.900c-.200 0-.500.100-.700.300-.300.300-1 1-1 2.300s1 2.700 1.200 2.900c.100.200 2 3.100 4.900 4.300 2.400.900 2.900.800 3.400.700.500 0 1.700-.700 1.900-1.300.200-.700.200-1.200.200-1.300-.100-.200-.300-.200-.600-.400l-2-.900c-.300-.100-.500-.200-.700.100l-.900 1.100c-.200.200-.300.200-.600.100-.300-.200-1.200-.500-2.300-1.400-.900-.800-1.400-1.700-1.600-2-.200-.300 0-.500.100-.600l.400-.500.300-.500v-.500l-.900-2.100c-.200-.500-.400-.500-.600-.500z"/></svg>';
const FEATS={pool:['wave'],seaview:['eye'],ac:['snow'],furnished:['sofa'],garage:['car'],garden:['leaf'],bbq:['fire'],solar:['sun'],well:['drop'],gated:['gate'],alarm:['bell'],fiber:['wifi'],staff:['user'],deck:['deck'],deed:['doc'],paved:['road'],power:['bolt'],water:['drop']};
addDict({
pt:{thSw:'Claro · Escuro',sendErr:'Não foi possível enviar. Tente pelo WhatsApp.',kh_sac:'SAC: as parcelas começam mais altas e diminuem todo mês.',kh_price:'Price: todas as parcelas têm o mesmo valor.',kh_rate:'Mexa nos controles e o resultado muda na hora. A taxa de juros é só um exemplo; o valor real você recebe do banco.',metaHome:'Casas, apartamentos e terrenos para comprar ou alugar em Pipa e Tibau do Sul (RN), com documentação conferida. Atendimento em português, inglês e alemão.',bed1:'quarto',bath1:'banheiro',demoFoot:'Modelo de demonstração: marca, imóveis e números são fictícios.',perMonth:'/mês',waText:'Olá! Tenho interesse em',sale:'À venda',lease:'Para alugar',st_novo:'Novo',st_disponivel:'Disponível',st_reservado:'Reservado',t_casa:'Casa',t_apartamento:'Apartamento',t_terreno:'Terreno',beds:'quartos',baths:'banheiros',built:'m² construídos',lotm:'m² de terreno',sent:'Obrigado. Isto é uma demonstração, nada foi enviado.',demo:'Modelo de demonstração. Marca, imóveis, números e textos são fictícios.',
 f_pool:'Piscina',f_seaview:'Vista para o mar',f_ac:'Ar-condicionado',f_furnished:'Mobiliada',f_garage:'Garagem',f_garden:'Jardim',f_bbq:'Churrasqueira',f_solar:'Energia solar',f_well:'Poço próprio',f_gated:'Condomínio fechado',f_alarm:'Alarme',f_fiber:'Internet por fibra',f_staff:'Casa de caseiro',f_deck:'Deck',f_deed:'Escritura e matrícula',f_paved:'Rua calçada',f_power:'Energia na rua',f_water:'Água encanada',
 kv:'Valor do imóvel (R$)',kn:'Entrada',ka:'Prazo',kj:'Juros ao ano (%)',ks:'Sistema',kr:'Primeira parcela',kl:'Última parcela',kf:'Valor financiado',ki:'Total de juros',kc:'Custos de compra (aprox. 4,5%)',kd:'Simulação sem TR, seguros e tarifas. Não é oferta de crédito. A taxa é um exemplo e você pode alterá-la.',yrs:'anos',fxn:'Câmbio de referência (BCE) de',fxl:'atualizado hoje',fxs:'valor guardado'},
en:{thSw:'Light · Dark',sendErr:'Could not send. Please try WhatsApp.',kh_sac:'SAC: instalments start higher and go down every month.',kh_price:'Price: every instalment is the same amount.',kh_rate:'Move the controls and the result changes at once. The interest rate is only an example; your bank gives you the real one.',metaHome:'Houses, apartments and land to buy or rent in Pipa and Tibau do Sul, Brazil, with paperwork checked. Service in Portuguese, English and German.',bed1:'bedroom',bath1:'bathroom',demoFoot:'Demo template: brand, listings and figures are fictional.',perMonth:'/month',waText:'Hello! I am interested in',sale:'For sale',lease:'For rent',st_novo:'New',st_disponivel:'Available',st_reservado:'Reserved',t_casa:'House',t_apartamento:'Apartment',t_terreno:'Land',beds:'bedrooms',baths:'bathrooms',built:'m² built',lotm:'m² plot',sent:'Thank you. This is a demo, nothing was sent.',demo:'Demo template. Brand, listings, figures and texts are fictional.',
 f_pool:'Pool',f_seaview:'Sea view',f_ac:'Air conditioning',f_furnished:'Furnished',f_garage:'Garage',f_garden:'Garden',f_bbq:'Barbecue',f_solar:'Solar power',f_well:'Own well',f_gated:'Gated community',f_alarm:'Alarm',f_fiber:'Fibre internet',f_staff:'Caretaker house',f_deck:'Deck',f_deed:'Deed and registry entry',f_paved:'Paved road',f_power:'Power on the road',f_water:'Mains water',
 kv:'Property price (R$)',kn:'Down payment',ka:'Term',kj:'Interest per year (%)',ks:'System',kr:'First instalment',kl:'Last instalment',kf:'Amount financed',ki:'Total interest',kc:'Purchase costs (approx. 4.5%)',kd:'Simulation without TR index, insurance and fees. Not a credit offer. The rate is an example you can change.',yrs:'years',fxn:'Reference rate (ECB) of',fxl:'updated today',fxs:'stored value'},
de:{thSw:'Hell · Dunkel',sendErr:'Senden nicht möglich. Bitte per WhatsApp versuchen.',kh_sac:'SAC: Die Raten starten höher und sinken jeden Monat.',kh_price:'Price: Alle Raten sind gleich hoch.',kh_rate:'Regler bewegen, das Ergebnis ändert sich sofort. Der Zinssatz ist nur ein Beispiel; den echten Wert nennt Ihnen die Bank.',metaHome:'Häuser, Wohnungen und Grundstücke zum Kauf oder zur Miete in Pipa und Tibau do Sul (Brasilien), mit geprüften Unterlagen. Betreuung auf Portugiesisch, Englisch und Deutsch.',bed1:'Schlafzimmer',bath1:'Bad',demoFoot:'Demo-Vorlage: Marke, Objekte und Zahlen sind frei erfunden.',perMonth:'/Monat',waText:'Guten Tag! Ich interessiere mich für',sale:'Zu verkaufen',lease:'Zu vermieten',st_novo:'Neu',st_disponivel:'Verfügbar',st_reservado:'Reserviert',t_casa:'Haus',t_apartamento:'Wohnung',t_terreno:'Grundstück',beds:'Schlafzimmer',baths:'Bäder',built:'m² Wohnfläche',lotm:'m² Grundstück',sent:'Vielen Dank. Dies ist eine Demo, es wurde nichts gesendet.',demo:'Demo-Vorlage. Marke, Objekte, Zahlen und Texte sind frei erfunden.',f_pool:'Pool',f_seaview:'Meerblick',f_ac:'Klimaanlage',f_furnished:'Möbliert',f_garage:'Garage',f_garden:'Garten',f_bbq:'Grillplatz',f_solar:'Solaranlage',f_well:'Eigener Brunnen',f_gated:'Geschlossene Wohnanlage',f_alarm:'Alarmanlage',f_fiber:'Glasfaser-Internet',f_staff:'Verwalterhaus',f_deck:'Holzterrasse',f_deed:'Urkunde und Grundbuch',f_paved:'Gepflasterte Straße',f_power:'Strom an der Straße',f_water:'Wasseranschluss',kv:'Kaufpreis (R$)',kn:'Anzahlung',ka:'Laufzeit',kj:'Zins pro Jahr (%)',ks:'Tilgungsart',kr:'Erste Rate',kl:'Letzte Rate',kf:'Darlehensbetrag',ki:'Zinsen gesamt',kc:'Nebenkosten (ca. 4,5 %)',kd:'Beispielrechnung ohne TR-Index, Versicherungen und Gebühren. Kein Kreditangebot. Der Zinssatz ist ein Beispiel und lässt sich ändern.',yrs:'Jahre',fxn:'Referenzkurs (EZB) vom',fxl:'heute aktualisiert',fxs:'gespeicherter Wert'}});

/* data line of a listing: beds · baths · m² (land: plot only) */
function dataLine(l,b){const w=b?(v,t)=>`<span><b>${v}</b> ${t}</span>`:(v,t)=>`<span>${v} ${t}</span>`;
  return (l.type==='terreno'?[]:[w(l.beds,tr(l.beds===1?'bed1':'beds')),w(l.baths,tr(l.baths===1?'bath1':'baths')),w(nf(l.area),'m²')]).concat(l.type==='terreno'?[w(nf(l.lot),tr('lotm'))]:[]).join('')}
const tagText=l=>l.status==='disponivel'?tr(l.deal==='venda'?'sale':'lease'):tr('st_'+l.status);
/* three card forms used everywhere so listings look the same on every page */
const cardBig=(l,btn)=>`<a class="pc pc--big" href="#imovel-${l.slug}"><img class="pc__img" src="${img(l.imgs[0])}" alt="${esc(l.name)}" loading="lazy"><span class="pc__tag">${tagText(l)}</span><div class="pc__body"><div><div class="pc__loc">${esc(l.loc)}</div><div class="pc__name">${esc(l.name)}</div><div class="pc__data num"><span><b>${price(l)}</b></span>${dataLine(l)}</div></div>${btn?`<span class="btn btn--light">${btn}</span>`:''}</div></a>`;
const cardPhoto=l=>`<a class="pc pc--sm" href="#imovel-${l.slug}"><img class="pc__img" ${srcs(l.imgs[0])} alt="${esc(l.name)}" loading="lazy"><span class="pc__tag">${tagText(l)}</span><div class="pc__body"><div class="pc__loc">${esc(l.loc)}</div><div class="pc__name">${esc(l.name)}</div><div class="pc__data num"><span><b>${price(l)}</b></span></div></div></a>`;
const cardBelow=l=>`<a class="pb" href="#imovel-${l.slug}"><div class="pb__ph"><img ${srcs(l.imgs[0])} alt="${esc(l.name)}" loading="lazy"><span class="pc__tag">${tagText(l)}</span></div><div class="pb__loc">${esc(l.loc)}</div><h3 class="pb__name">${esc(l.name)}</h3><div class="pb__data num"><span><b>${price(l)}</b></span>${dataLine(l)}</div></a>`;

/* financing calculator: markup + maths. The detail view places it; calcInit() wires it. */
function calcHTML(v){return `<div class="ci">
<label><span>${tr('kv')}</span><input id="k-val" type="number" min="50000" step="10000" value="${v||2400000}" inputmode="numeric"></label>
<label><span class="rowl"><span>${tr('kn')}</span><output id="o-ent"></output></span><input id="k-ent" type="range" min="20" max="90" step="5" value="30"></label>
<label><span class="rowl"><span>${tr('ka')}</span><output id="o-anos"></output></span><input id="k-anos" type="range" min="5" max="35" step="1" value="20"></label>
<div class="two"><label><span>${tr('kj')}</span><input id="k-juros" type="number" min="1" max="30" step="0.1" value="${SITE.rate}" inputmode="decimal"></label>
<label><span>${tr('ks')}</span><div class="sys" role="group"><button type="button" data-sys="sac" aria-pressed="${APP.sys==='sac'}">SAC</button><button type="button" data-sys="price" aria-pressed="${APP.sys==='price'}">Price</button></div></label></div>
<p class="ci__h" id="k-sysh"></p><p class="ci__h">${tr('kh_rate')}</p></div>
<div class="co" aria-live="polite"><div class="co__lab">${tr('kr')}</div><div class="big" id="r-first"></div><div class="co__alt" id="r-alt"></div>
<dl><div><dt>${tr('kl')}</dt><dd id="r-last"></dd></div><div><dt>${tr('kf')}</dt><dd id="r-fin"></dd></div><div><dt>${tr('ki')}</dt><dd id="r-int"></dd></div><div><dt>${tr('kc')}</dt><dd id="r-cost"></dd></div></dl>
<p class="co__fine">${tr('kd')}</p></div>`}
function calc(){if(!$('#k-val'))return;
  const V=Math.max(0,+$('#k-val').value||0),e=+$('#k-ent').value/100,y=+$('#k-anos').value,a=Math.min(40,Math.max(0.1,+$('#k-juros').value||0))/100;
  const P=V*(1-e),n=y*12,i=Math.pow(1+a,1/12)-1;let first,last,int;
  if(APP.sys==='price'){first=last=P*i/(1-Math.pow(1+i,-n));int=first*n-P}else{const am=P/n;first=am+P*i;last=am*(1+i);int=i*P*(n+1)/2}
  $('#o-ent').textContent=`${Math.round(e*100)}% · ${money(V*e)}`;$('#o-anos').textContent=`${y} ${tr('yrs')}`;
  $('#r-first').textContent=money(first);$('#r-last').textContent=money(last);$('#r-fin').textContent=money(P);$('#r-int').textContent=money(int);$('#r-cost').textContent=money(V*SITE.buyCosts);
  const sh=$('#k-sysh');if(sh)sh.textContent=tr(APP.sys==='sac'?'kh_sac':'kh_price');
  $('#r-alt').textContent=APP.cur==='BRL'?`≈ ${money(first,'USD')} · ${money(first,'EUR')}`:`= ${money(first,'BRL')}`}
function calcInit(){$$('.sys button').forEach(b=>b.onclick=()=>{APP.sys=b.dataset.sys;$$('.sys button').forEach(x=>x.setAttribute('aria-pressed',x===b));calc()});
  ['k-val','k-ent','k-anos','k-juros'].forEach(i=>{const e=$('#'+i);if(e)e.oninput=calc});calc()}
const fxText=()=>{const d=SITE.fx.date.split('-').reverse().join(APP.lang==='de'?'.':'/');return `${tr('fxn')} ${d}: US$ 1 = R$ ${nf(1/SITE.fx.USD,2)} · € 1 = R$ ${nf(1/SITE.fx.EUR,2)} (${tr(APP.fxLive?'fxl':'fxs')})`};

/* numbers that count up once when scrolled into view: <b data-count="212" data-pre="" data-suf="%" data-dec="0">212</b> */
function counters(){if(ST&&ST.snap)return;const els=$$('[data-count]:not([data-done])');if(!els.length)return;els.forEach(e=>e.dataset.done=1);
  if(matchMedia('(prefers-reduced-motion:reduce)').matches||!('IntersectionObserver' in window))return;
  const show=(e,v)=>e.textContent=(e.dataset.pre||'')+nf(v,+(e.dataset.dec||0))+(e.dataset.suf||'');
  const io=new IntersectionObserver(en=>en.forEach(x=>{if(!x.isIntersecting)return;io.unobserve(x.target);const e=x.target,end=+e.dataset.count,t0=performance.now();
    (function step(t){const p=Math.min(1,(t-t0)/1500),k=1-Math.pow(1-p,3);show(e,end*k);if(p<1)requestAnimationFrame(step);else show(e,end)})(t0)}),{threshold:.5});
  els.forEach(e=>io.observe(e))}

/* router: #home #imoveis #imoveis-venda|aluguel|terrenos #imovel-<slug> #sobre #blog #artigo-<slug> #contato #publicar */
function parseHash(){const h=ST?ST.route:(location.hash||'#home').slice(1);for(const p of ['imoveis','imovel','artigo']){if(h===p)return{view:p,arg:''};if(h.startsWith(p+'-'))return{view:p,arg:h.slice(p.length+1)}}return{view:VIEWS[h]?h:'home',arg:''}}
function rerender(keepScroll){const r=APP.route,v=VIEWS[r.view]||VIEWS.home,y=scrollY;
  $('#nav').innerHTML=VIEWS.chrome.nav(r);$('#main').innerHTML=v.render(r.arg);$('#foot').innerHTML=VIEWS.chrome.footer(r);
  document.title=(v.title?v.title(r.arg)+' · ':'')+SITE.brandFull;document.documentElement.lang=APP.lang==='pt'?'pt-BR':APP.lang;
  $('#demo').textContent=SITE.demoNote===false?'':tr('demoFoot');
  seo();if(ST&&ST.snap)return;
  if(VIEWS.chrome.mount)VIEWS.chrome.mount(r);if(v.mount)v.mount($('#main'),r.arg);calcInit();counters();if(ST)fixLinks();
  if(keepScroll)scrollTo(0,y)}
const isR=h=>h==='home'||(h!=='chrome'&&!!VIEWS[h])||/^(imoveis|imovel|artigo)-/.test(h);
function fixLinks(){$$('a[href^="#"]').forEach(a=>{const h=a.getAttribute('href').slice(1);if(isR(h))a.setAttribute('href',urlFor(h))})}
function route(){APP.route=parseHash();rerender();const h=location.hash.slice(1);const el=h&&document.getElementById(h);scrollTo(0,0);if(el&&!VIEWS[h])el.scrollIntoView()}
document.addEventListener('click',e=>{const tt=e.target.closest('[data-theme-toggle]');if(tt){const d=document.documentElement,n=d.dataset.theme==='dark'?'light':'dark';d.dataset.theme=n;LS.set('theme',n);return}const b=e.target.closest('[data-lang],[data-cur]');if(!b)return;if(ST&&b.dataset.lang){LS.set('lang',b.dataset.lang);if(b.dataset.lang!==APP.lang)location.href=urlFor(APP.route.view+(APP.route.arg?'-'+APP.route.arg:''),b.dataset.lang);return}if(b.dataset.lang)APP.lang=b.dataset.lang;if(b.dataset.cur){APP.cur=b.dataset.cur;LS.set('cur',APP.cur)}rerender(true)});
/* forms: with an address in content/site.json (newsletterUrl / contactUrl) the entry is really sent there; without one the form only confirms */
document.addEventListener('submit',e=>{const f=e.target.closest('form[data-demo]');if(!f)return;e.preventDefault();const o=$('.ok',f),u=f.closest('#foot,.news__f')?SITE.newsletterUrl:SITE.contactUrl,done=()=>{if(o)o.textContent=tr('sent')};
  if(!u){done();return}f.querySelectorAll('input,select,textarea').forEach((x,i)=>{if(!x.name)x.name=x.type==='email'?'email':(x.id||'field'+i)});
  fetch(u,{method:'POST',body:new FormData(f),headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw 0;f.reset();done()}).catch(()=>{if(o)o.textContent=tr('sendErr')})});
/* entries the broker adds are kept in this browser (real site: CMS) */
function saveOwn(){try{localStorage.setItem('enseada_own',JSON.stringify({l:SITE.listings.filter(x=>x.own),p:SITE.posts.filter(x=>x.own)}))}catch(e){}}
function loadOwn(){try{const o=JSON.parse(localStorage.getItem('enseada_own')||'null');if(o){SITE.listings.unshift(...(o.l||[]));SITE.posts.unshift(...(o.p||[]))}}catch(e){}}
/* structured data + description for search engines and AI assistants, refreshed per page */
function seo(){const r=APP.route,base=ST?ST.origin+urlFor('home'):location.origin+location.pathname,dir=ST?ST.origin:base.replace(/[^/]*$/,''),abs=h=>ST?ST.origin+urlFor(h):base+'#'+h;
  const orgId=(ST?ST.origin+ST.base:base)+'#org',org={'@type':'RealEstateAgent','@id':orgId,name:SITE.brandFull,url:ST?ST.origin+ST.base:base,image:dir+img(SITE.media.heroPoster),logo:dir+img(SITE.media.heroPoster),openingHours:SITE.openingHours||'Mo-Sa 09:00-18:00',geo:{'@type':'GeoCoordinates',latitude:(SITE.geo||{}).lat||-6.2286,longitude:(SITE.geo||{}).lng||-35.0486},founder:{'@type':'Person',name:SITE.agent.name,jobTitle:L(SITE.agent.role)},telephone:SITE.phone,email:SITE.email,address:{'@type':'PostalAddress',streetAddress:SITE.address,addressLocality:'Tibau do Sul',addressRegion:'RN',addressCountry:'BR'},areaServed:['Pipa','Tibau do Sul'],knowsLanguage:['pt-BR','en','de']};
  const g=[org];let d=tr('metaHome');const VT=()=>{const v=VIEWS[r.view];return v&&v.title?v.title(r.arg):SITE.brandFull};
  if(r.view==='imovel'){const l=bySlug(r.arg);if(l){d=L(l.desc);g.push({'@type':'RealEstateListing',name:l.name,description:L(l.desc),url:abs('imovel-'+l.slug),image:l.imgs.filter(x=>!isData(x)).map(x=>dir+img(x)),offers:{'@type':'Offer',price:l.price,priceCurrency:'BRL',...(l.deal==='aluguel'?{priceSpecification:{'@type':'UnitPriceSpecification',price:l.price,priceCurrency:'BRL',unitCode:'MON'}}:{}),availability:l.status==='reservado'?'https://schema.org/LimitedAvailability':'https://schema.org/InStock',businessFunction:l.deal==='aluguel'?'http://purl.org/goodrelations/v1#LeaseOut':'http://purl.org/goodrelations/v1#Sell'},contentLocation:{'@type':'Place',name:(l.loc==='Tibau do Sul'?'':l.loc+', ')+'Tibau do Sul, RN, Brasil'},mainEntity:Object.assign({'@type':l.type==='apartamento'?'Apartment':l.type==='casa'?'House':'Place',name:l.name},l.area?{floorSize:{'@type':'QuantitativeValue',value:l.area,unitCode:'MTK'}}:{},l.beds?{numberOfBedrooms:l.beds}:{},l.baths?{numberOfBathroomsTotal:l.baths}:{},l.lot?{additionalProperty:[{'@type':'PropertyValue',name:'Lot size',value:l.lot,unitCode:'MTK'}]}:{},l.year?{yearBuilt:l.year}:{},{address:{'@type':'PostalAddress',addressLocality:l.loc,addressRegion:'RN',addressCountry:'BR'}}),provider:{'@id':orgId}})}}
  else if(r.view==='artigo'){const p=SITE.posts.find(x=>x.slug===r.arg);if(p){d=L(p.excerpt);g.push({'@type':'BlogPosting',headline:L(p.title),description:L(p.excerpt),datePublished:p.date,dateModified:p.updated||p.date,mainEntityOfPage:abs('artigo-'+p.slug),inLanguage:APP.lang,image:isData(p.img)?undefined:dir+img(p.img),author:{'@type':'Person',name:SITE.agent.name},publisher:{'@id':orgId},url:abs('artigo-'+p.slug)})}}
  else if(r.view==='home'&&DICT.pt.fq1){g.push({'@type':'FAQPage',mainEntity:[1,2,3,4].map(i=>({'@type':'Question',name:tr('fq'+i),acceptedAnswer:{'@type':'Answer',text:tr('fq'+i+'a')}}))})}
  else if(r.view==='blog'){d=VT()+': '+SITE.posts.map(x=>L(x.title)).join(' · ');g.push({'@type':'Blog',name:VT(),url:abs('blog'),blogPost:SITE.posts.map(x=>({'@type':'BlogPosting',headline:L(x.title),datePublished:x.date,url:abs('artigo-'+x.slug)}))})}
  else if(r.view==='sobre'){d=VT()+'. '+tr('metaHome');g.push({'@type':'AboutPage',name:VT(),url:abs('sobre'),about:{'@id':orgId},mainEntity:{'@type':'Person',name:SITE.agent.name,jobTitle:L(SITE.agent.role),worksFor:{'@id':orgId},knowsLanguage:['pt-BR','en','de']}})}
  else if(r.view==='contato'){d=VT()+'. '+tr('metaHome');g.push({'@type':'ContactPage',name:VT(),url:abs('contato'),mainEntity:{'@id':orgId}})}
  else if(r.view==='imoveis'){const ls=SITE.listings.filter(l=>r.arg==='terrenos'?l.type==='terreno':r.arg==='venda'||r.arg==='aluguel'?l.deal===r.arg:true);d=VT()+': '+ls.map(l=>l.name).join(', ');g.push({'@type':'ItemList',name:VT(),itemListElement:ls.map((l,i)=>({'@type':'ListItem',position:i+1,name:l.name,url:abs('imovel-'+l.slug)}))})}
  $('#md').setAttribute('content',d);$('#ld').textContent=JSON.stringify({'@context':'https://schema.org','@graph':g})}
function boot(){loadOwn();
  if(ST){addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(isR(h))location.href=urlFor(h)});
    APP.route=parseHash();rerender();if(ST.snap)return
    /* visitor statistics only when the broker has entered a Google Analytics ID */
    if(/^G-[A-Z0-9]+$/.test(SITE.gaId||'')){const g=document.createElement('script');g.async=true;g.src='https://www.googletagmanager.com/gtag/js?id='+SITE.gaId;document.head.appendChild(g);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',SITE.gaId)}}
  else{addEventListener('hashchange',route);route()}
  fetch(SITE.fxUrl).then(r=>r.json()).then(j=>{if(j.rates&&j.rates.USD&&j.rates.EUR){SITE.fx={date:j.date,USD:j.rates.USD,EUR:j.rates.EUR};APP.fxLive=true;rerender(true)}}).catch(()=>{})}
