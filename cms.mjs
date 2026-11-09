import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_ROOT = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.CMS_DATA_DIR || path.join(ROOT, 'data');
export const CMS_FILE = path.join(STORAGE_ROOT, 'cms.json');
export const MEDIA_DIR = path.join(STORAGE_ROOT, 'media');
const defaults = JSON.parse(await fs.readFile(path.join(ROOT,'data','properties.json'),'utf8'));
const TEMPLATE = await fs.readFile(path.join(ROOT,'home.template.html'),'utf8');
export const DEFAULT_SITE = Object.freeze({
  heroTop:'مش مجرد وحدة.', heroAccent:'قرار يصنع الفرق.',
  heroDescription:'في EVACON بنجمع بين فهم احتياجك وسهولة الوصول للوحدات المناسبة. شركاؤك في البحث والمقارنة وترتيب المعاينات علشان تختار بوضوح وثقة.',
  heroImage:'/assets/hero-home.webp',fontFamily:'IBM Plex Sans Arabic',
  about:'إيفاكون شركة وساطة عقارية (Real Estate Brokerage) بتربط العميل بالاختيارات المناسبة من الوحدات، وبتساعده في رحلة البحث والمقارنة والتواصل والمتابعة.',
  aboutSecondary:'دورنا إننا نفهم أولوياتك قبل ما نرشحلك أي عقار. سواء بتدور على بيت للعيلة، مكان جديد، أو فرصة استثمارية محتملة، هدفنا نقدملك معلومات أوضح وتجربة أسهل.',
  vision:'أن نُحدث فرقًا في سوق الوساطة العقارية بتجربة أسهل، وخيارات أوضح، وقرارات مبنية على معرفة.',
  mission:'نربط العملاء بالفرص العقارية المناسبة، ونوفّر لهم معلومات منظمة ومتابعة شخصية طوال رحلة الاختيار.',
  goal:'نوصل كل عميل لاختيارات واقعية مناسبة لاحتياجاته وميزانيته، ونساعده يفهم التفاصيل قبل اتخاذ القرار.',
  facebook:'https://www.facebook.com/p/Evacon-61594188086644/',
  instagram:'',whatsapp:'',demoMode:true,allowIndexing:false
});
const e = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const num = (n) => Number(n||0).toLocaleString('en-US');
const icon = name => `<svg class="i" aria-hidden="true"><use href="/assets/icons.svg#${name}"></use></svg>`;
const safeURL = value => {
  const v=String(value||'');
  if(/^\/(?:assets|media)\/[a-zA-Z0-9_.-]+\.(?:webp|png|jpe?g|svg)$/.test(v)) return v;
  return '/assets/property-1.svg';
};
export const normalizeProperty = (p,existingId=null) => {
  if(!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('بيانات الوحدة غير صحيحة');
  const req=(key,max=150)=>{
    const v=String(p[key]??'').trim(); if(v.length<2||v.length>max) throw new Error(`راجع خانة ${key}`); return v;
  };
  const integer=(key,low,high)=>{const n=Number(p[key]);if(!Number.isSafeInteger(n)||n<low||n>high) throw new Error(`قيمة ${key} غير صحيحة`);return n;};
  const id=existingId==null?integer('id',1,10000000):existingId;
  const rawSlug=String(p.slug||`unit-${id}`).trim().toLowerCase();
  if(!/^[a-z0-9-]{3,95}$/.test(rawSlug)) throw new Error('رابط الوحدة يجب أن يكون حروف إنجليزية صغيرة وأرقام وشرطة');
  const image=safeURL(p.image);
  return {
    id,slug:rawSlug,title:req('title'),location:req('location'),district:req('district'),type:req('type',40),status:req('status',80),
    price:integer('price',0,1000000000000),area:integer('area',1,1000000),beds:integer('beds',0,100),baths:integer('baths',0,100),
    tag:req('tag',60),image,description:req('description',3000),
    features:Array.isArray(p.features)?p.features.map(x=>String(x).trim().slice(0,100)).filter(Boolean).slice(0,15):[]
  };
};
export function normalizeSite(input) {
  if(!input || typeof input!=='object'||Array.isArray(input))throw new Error('بيانات الشركة غير صحيحة');
  const result={};
  for(const [key,v] of Object.entries(DEFAULT_SITE)) {
    if (key==='demoMode'||key==='allowIndexing') result[key]=input[key]===true;
    else if(key==='heroImage') result[key]=safeURL(input[key]||v);
    else if(key==='fontFamily') result[key]=['IBM Plex Sans Arabic','Cairo','Tajawal'].includes(input[key])?input[key]:v;
    else if(['facebook','instagram','whatsapp'].includes(key)) {
      const val=String(input[key]||'').trim();if(val && !/^https:\/\/[a-z\d.-]+(?:\/[^\s]*)?$/i.test(val))throw new Error(`رابط ${key} لازم يبدأ بـ https://`);
      if(val.length>300)throw new Error(`رابط ${key} طويل`);
      result[key]=val;
    } else result[key]=String(input[key]??v).trim().slice(0,1200);
  }
  return result;
}
let writeQueue=Promise.resolve();
export async function loadContent() {
  try {
    const obj=JSON.parse(await fs.readFile(CMS_FILE,'utf8'));
    if (!Array.isArray(obj.properties)||!obj.site) throw new Error('محتوى غير صحيح');
    return {site:normalizeSite(obj.site),properties:obj.properties};
  } catch(err) {
    if(err.code!=='ENOENT') throw err;
    return {site:{...DEFAULT_SITE},properties:structuredClone(defaults)};
  }
}
export function updateContent(mutator) {
  const op = writeQueue.then(async()=>{
    const current=await loadContent();
    const result=await mutator(current);
    await fs.mkdir(path.dirname(CMS_FILE),{recursive:true});
    const temp=path.join(path.dirname(CMS_FILE),`.cms-${process.pid}-${crypto.randomUUID()}.tmp`);
    await fs.writeFile(temp,JSON.stringify(current,null,2),{mode:0o600});
    await fs.rename(temp,CMS_FILE);
    return result;
  });
  writeQueue=op.catch(err=>console.error('CMS write error:',err.message));
  return op;
}
function card(p) {
  const url=`/properties/${e(p.slug)}.html`;
  return `<article class="property-card" data-type="${e(p.type)}" data-location="${e(p.location)}" data-price="${Number(p.price)}" data-title="${e(p.title)}">
  <a href="${url}" class="property-photo" aria-label="تفاصيل ${e(p.title)}"><img src="${safeURL(p.image)}" alt="${e(p.title)}" loading="lazy" width="680" height="500"><span class="property-tag">${e(p.tag)}</span><span class="photo-arrow">↗</span></a>
  <div class="property-content"><p class="property-loc">${icon('pin')}${e(p.location)}، ${e(p.district)}</p><a href="${url}" class="property-title">${e(p.title)}</a><div class="property-features"><span>${icon('area')}${Number(p.area)} م²</span><span>${icon('bed')}${Number(p.beds)} غرف</span><span>${icon('bath')}${Number(p.baths)} حمام</span></div><div class="property-bottom"><div><small>السعر الاسترشادي</small><strong>${num(p.price)} <em>ج.م</em></strong></div><a class="round-arrow" href="${url}" aria-label="اعرف المزيد">↗</a></div></div></article>`;
}
function socials(site) {
 const links=[];
 if(site.facebook)links.push(`<a href="${e(site.facebook)}" target="_blank" rel="noopener noreferrer">فيسبوك EVACON</a>`);
 if(site.instagram)links.push(`<a href="${e(site.instagram)}" target="_blank" rel="noopener noreferrer">إنستجرام</a>`);
 if(site.whatsapp)links.push(`<a href="${e(site.whatsapp)}" target="_blank" rel="noopener noreferrer">واتساب</a>`);
 return links.join('');
}
function replacements(source,site) {
 const map={
  '{{HERO_TOP}}':e(site.heroTop),'{{HERO_ACCENT}}':e(site.heroAccent),'{{HERO_DESCRIPTION}}':e(site.heroDescription),
  '{{HERO_IMAGE}}':safeURL(site.heroImage),'{{FONT_CSS}}':`<style>:root{--font:'${site.fontFamily}',Tahoma,Arial,sans-serif}</style>`,'{{ABOUT}}':e(site.about),'{{ABOUT_SECONDARY}}':e(site.aboutSecondary),
  '{{VISION}}':e(site.vision),'{{MISSION}}':e(site.mission),'{{GOAL}}':e(site.goal),
  '{{SOCIAL_LINKS}}':socials(site),
  '{{FLOATING_FACEBOOK}}':site.facebook?`<a class="floating-facebook" href="${e(site.facebook)}" aria-label="صفحتنا على فيسبوك" target="_blank" rel="noopener noreferrer">f</a>`:'',
  '{{DEMO_BAR}}':site.demoMode?'<div class="demo-bar">نسخة تجريبية — الوحدات والأسعار والصور توضيحية، وليست عروض بيع فعلية</div>':'',
  '{{DISCLAIMER}}':site.demoMode?'<p class="disclaimer">* الوحدات والصور والأسعار المعروضة تجريبية وليست عروض بيع فعلية.</p>':'',
  '{{ROBOTS}}':site.allowIndexing && !site.demoMode?'index,follow':'noindex,follow'
 };
 for(const [k,v] of Object.entries(map))source=source.replaceAll(k,v);
 return source;
}
export function renderHome(content) {
 const {site,properties}=content;
 let html=TEMPLATE.replace('{{PROPERTY_CARDS}}',properties.map(card).join('\n'));
 html=html.replace('{{PROPERTY_OPTIONS}}',properties.map(p=>`<option value="${Number(p.id)}">${e(p.title)}</option>`).join(''));
 const locations=[...new Set(properties.map(p=>p.location))];
 const types=[...new Set(properties.map(p=>p.type))];
 html=html.replace('{{LOCATION_OPTIONS}}',locations.map(x=>`<option value="${e(x)}">${e(x)}</option>`).join(''));
 html=html.replace('{{TYPE_OPTIONS}}',types.map(x=>`<option value="${e(x)}">${e(x)}</option>`).join(''));
 html=html.replace('{{FILTER_CHIPS}}',types.map(x=>`<button type="button" class="filter-chip" data-type-filter="${e(x)}">${e(x)}</button>`).join(''));
 return replacements(html,site);
}
export function renderDetail(content,slug) {
 const {site,properties}=content;
 const p=properties.find(p=>p.slug===slug);
 if(!p)return null;
 const url=`/properties/${p.slug}.html`;
 const title=`${p.title} | إيفاكون العقارية`;
 const desc=`${p.type} في ${p.location}، المساحة ${p.area} م²، السعر ${num(p.price)} جنيه. التفاصيل والمعاينات لدى إيفاكون.`;
 const related=properties.filter(x=>x.id!==p.id).slice(0,3).map(card).join('');
 const features=p.features.map(x=>`<li>${icon('check')}${e(x)}</li>`).join('');
 const demo=site.demoMode?'<div class="demo-bar">نسخة تجريبية — الوحدات والأسعار والصور توضيحية، وليست عروض بيع فعلية</div>':'';
 const demoPrice=site.demoMode?'<span>السعر والبيانات للعرض التجريبي فقط</span>':'';
 return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0b0b0e"><title>${e(title)}</title><meta name="description" content="${e(desc)}"><meta name="robots" content="${site.allowIndexing&&!site.demoMode?'index,follow':'noindex,follow'}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(desc)}"><link rel="canonical" href="${e(url)}"><link rel="stylesheet" href="/assets/styles.css"><style>:root{--font:'${site.fontFamily}',Tahoma,Arial,sans-serif}</style><link rel="icon" href="/assets/evacon-favicon.png" type="image/png"><script defer src="/assets/app.js"></script></head><body>${demo}
 <header class="site-header scrolled"><div class="container nav-shell"><a href="/" class="brand" aria-label="إيفاكون — الرئيسية"><span class="brand-mark"><img src="/assets/evacon-mark.png" alt="" width="52" height="52"></span><span class="brand-letters"><b>EVACON</b><small>إيفاكون • REAL ESTATE BROKERAGE</small></span></a><nav class="desktop-nav" aria-label="القائمة الرئيسية"><a href="/#about">عن إيفاكون</a><a href="/#properties">الوحدات</a><a href="/#contact">تواصل معنا</a>${socials(site)}</nav><a href="/#contact" class="nav-cta">احجز استشارتك ${icon('arrow')}</a><button class="menu-toggle" type="button" aria-label="فتح القائمة" aria-expanded="false">☰</button></div><nav class="mobile-nav" aria-label="قائمة الهاتف"><a href="/#about">عن إيفاكون</a><a href="/#properties">الوحدات</a><a href="/#contact">تواصل معنا</a>${socials(site)}</nav></header>
 <main><section class="details-hero container"><div class="breadcrumb"><a href="/">الرئيسية</a><span>/</span><a href="/#properties">الوحدات</a><span>/</span><span>${e(p.location)}</span></div><div class="details-layout"><div class="details-image"><img src="${safeURL(p.image)}" alt="${e(p.title)}"><span class="property-tag">${e(p.tag)}</span></div><div class="details-info"><div class="eyebrow dark">وحدة رقم EV-${Number(p.id)}</div><h1>${e(p.title)}</h1><p class="muted large">${icon('pin')}${e(p.location)}، ${e(p.district)} · ${e(p.status)}</p><div class="details-price"><small>السعر الاسترشادي</small><strong>${num(p.price)} جنيه مصري</strong>${demoPrice}</div><div class="detail-specs"><div>${icon('area')}<b>${Number(p.area)} م²</b><span>المساحة</span></div><div>${icon('bed')}<b>${Number(p.beds)}</b><span>غرف نوم</span></div><div>${icon('bath')}<b>${Number(p.baths)}</b><span>حمام</span></div></div><button class="btn btn-primary full" data-inquire="${Number(p.id)}">استفسر عن الوحدة ${icon('arrow')}</button></div></div></section>
 <section class="detail-body container"><div class="copy"><div class="eyebrow dark">التفاصيل</div><h2>كل اللي محتاج تعرفه</h2><p>${e(p.description)}</p><h3>المميزات</h3><ul class="feature-list">${features}</ul></div><aside class="inquiry-aside"><h3>عايز تعرف أكتر؟</h3><p>ابعت بياناتك وفريق إيفاكون يتواصل معاك بخصوص الوحدة.</p><a href="/?property=${Number(p.id)}#contact" class="btn btn-dark">اطلب مكالمة ${icon('arrow')}</a></aside></section>
 <section class="section soft-bg"><div class="container"><div class="section-head"><div><div class="eyebrow dark">اختيارات تانية</div><h2>يمكن تعجبك كمان</h2></div><a href="/#properties" class="text-link">كل الوحدات ${icon('arrow')}</a></div><div class="property-grid">${related}</div></div></section></main>
 <footer class="footer"><div class="container footer-inner"><a href="/" class="brand brand-light"><span class="brand-mark"><img src="/assets/evacon-mark.png" alt="" width="52" height="52"></span><span class="brand-letters"><b>EVACON</b><small>إيفاكون • REAL ESTATE BROKERAGE</small></span></a><p>شريكك في قرار عقاري أوضح.</p><div class="footer-socials">${socials(site)}</div><a href="/privacy.html">سياسة الخصوصية</a></div></footer>${site.facebook?`<a class="floating-facebook" href="${e(site.facebook)}" aria-label="فيسبوك EVACON" target="_blank" rel="noopener noreferrer">f</a>`:''}</body></html>`;
}
