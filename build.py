from pathlib import Path
import json, html, urllib.parse
base=Path(__file__).parent
props=json.loads((base/'data/properties.json').read_text(encoding='utf-8'))
fmt=lambda x:f'{x:,}'
escape=html.escape

def icon(name):
 return f'<svg class="i" aria-hidden="true"><use href="/assets/icons.svg#{name}"></use></svg>'

def card(p):
 return f'''<article class="property-card" data-type="{escape(p['type'])}" data-location="{escape(p['location'])}" data-price="{p['price']}" data-title="{escape(p['title'])}">
  <a href="/properties/{p['slug']}.html" class="property-photo" aria-label="تفاصيل {escape(p['title'])}">
    <img src="/assets/{p['image']}" alt="تصور معماري توضيحي لـ{escape(p['title'])}" loading="lazy" width="680" height="500">
    <span class="property-tag">{escape(p['tag'])}</span><span class="photo-arrow">↗</span>
  </a>
  <div class="property-content"><p class="property-loc">{icon('pin')}{escape(p['location'])}، {escape(p['district'])}</p>
    <a href="/properties/{p['slug']}.html" class="property-title">{escape(p['title'])}</a>
    <div class="property-features"><span>{icon('area')}{p['area']} م²</span><span>{icon('bed')}{p['beds']} غرف</span><span>{icon('bath')}{p['baths']} حمام</span></div>
    <div class="property-bottom"><div><small>السعر الاسترشادي</small><strong>{fmt(p['price'])} <em>ج.م</em></strong></div><a class="round-arrow" href="/properties/{p['slug']}.html" aria-label="اعرف المزيد">↗</a></div>
  </div></article>'''

home=(base/'home.template.html').read_text(encoding='utf-8')
home=home.replace('{{PROPERTY_CARDS}}','\n'.join(card(p) for p in props))
home=home.replace('{{PROPERTY_OPTIONS}}','\n'.join(f'<option value="{p["id"]}">{escape(p["title"])}</option>' for p in props))
(base/'index.html').write_text(home,encoding='utf-8')

for p in props:
 meta=f'{p["title"]} | إيفاكون للعقارات'
 desc=f'{p["type"]} في {p["location"]} بمساحة {p["area"]} م²، السعر الاسترشادي {fmt(p["price"])} جنيه. تعرف على المواصفات وأرسل طلب معاينة.'
 details=''.join(f'<li>{icon("check")}{escape(f)}</li>' for f in p['features'])
 related='\n'.join(card(other) for other in [x for x in props if x['id']!=p['id']][:3])
 page=f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0b0b0e"><title>{escape(meta)}</title><meta name="description" content="{escape(desc)}"><link rel="stylesheet" href="/assets/styles.css"><link rel="icon" href="/assets/evacon-favicon.png" type="image/png"><meta name="robots" content="noindex,follow"><script defer src="/assets/app.js"></script></head>
 <body><div class="demo-bar">نسخة تجريبية — الوحدات والأسعار والصور توضيحية، وليست عروض بيع فعلية</div>
 <header class="site-header scrolled"><div class="container nav-shell"><a href="/" class="brand" aria-label="إيفاكون — الرئيسية"><span class="brand-mark"><img src="/assets/evacon-mark.png" alt="" width="52" height="52"></span><span class="brand-letters"><b>EVACON</b><small>إيفاكون • REAL ESTATE BROKERAGE</small></span></a><nav class="desktop-nav" aria-label="القائمة الرئيسية"><a href="/#about">عن إيفاكون</a><a href="/#properties">الوحدات</a><a href="/#why">ليه إيفاكون؟</a><a href="/#contact">تواصل معنا</a></nav><a href="/#contact" class="nav-cta">احجز استشارتك {icon('arrow')}</a><button class="menu-toggle" type="button" aria-label="فتح القائمة" aria-expanded="false">☰</button></div><nav class="mobile-nav" aria-label="قائمة الهاتف"><a href="/#about">عن إيفاكون</a><a href="/#properties">الوحدات</a><a href="/#why">ليه إيفاكون؟</a><a href="/#contact">تواصل معنا</a></nav></header>
 <main><section class="details-hero container"><div class="breadcrumb"><a href="/">الرئيسية</a><span>/</span><a href="/#properties">الوحدات</a><span>/</span><span>{escape(p['location'])}</span></div><div class="details-layout"><div class="details-image"><img src="/assets/{p['image']}" alt="تصور معماري توضيحي لـ{escape(p['title'])}"><span class="property-tag">{escape(p['tag'])}</span></div><div class="details-info"><div class="eyebrow dark">وحدة رقم EV-{p['id']:03d}</div><h1>{escape(p['title'])}</h1><p class="muted large">{icon('pin')}{escape(p['location'])}، {escape(p['district'])} · {escape(p['status'])}</p><div class="details-price"><small>السعر الاسترشادي</small><strong>{fmt(p['price'])} جنيه مصري</strong><span>السعر والبيانات للعرض التجريبي فقط</span></div><div class="detail-specs"><div>{icon('area')}<b>{p['area']} م²</b><span>المساحة</span></div><div>{icon('bed')}<b>{p['beds']}</b><span>غرف نوم</span></div><div>{icon('bath')}<b>{p['baths']}</b><span>حمام</span></div></div><button class="btn btn-primary full" data-inquire="{p['id']}">استفسر عن الوحدة {icon('arrow')}</button></div></div></section>
 <section class="detail-body container"><div class="copy"><div class="eyebrow dark">التفاصيل</div><h2>كل اللي محتاج تعرفه</h2><p>{escape(p['description'])}</p><h3>المميزات</h3><ul class="feature-list">{details}</ul></div><aside class="inquiry-aside"><h3>عايز تعرف أكتر؟</h3><p>ابعت بياناتك وفريق المبيعات يتواصل معاك بعد تفعيل بيانات الشركة الحقيقية.</p><a href="/?property={p['id']}#contact" class="btn btn-dark">اطلب مكالمة {icon('arrow')}</a></aside></section>
 <section class="section soft-bg"><div class="container"><div class="section-head"><div><div class="eyebrow dark">اختيارات تانية</div><h2>يمكن تعجبك كمان</h2></div><a href="/#properties" class="text-link">كل الوحدات {icon('arrow')}</a></div><div class="property-grid">{related}</div></div></section></main>
 <footer class="footer"><div class="container footer-inner"><a href="/" class="brand brand-light"><span class="brand-mark"><img src="/assets/evacon-mark.png" alt="" width="52" height="52"></span><span class="brand-letters"><b>EVACON</b><small>إيفاكون • REAL ESTATE BROKERAGE</small></span></a><p>شريكك في قرار عقاري أوضح — نسخة عرض قابلة للتخصيص.</p><a href="/privacy.html">سياسة الخصوصية</a><span>© <span id="year">2026</span> EVACON</span></div></footer></body></html>'''
 (base/'properties'/f'{p["slug"]}.html').write_text(page,encoding='utf-8')

# sitemap only relative routes, real domain to be set on deployment
(base/'data'/'site-routes.txt').write_text('\n'.join(['/','/privacy.html']+[f'/properties/{p["slug"]}.html' for p in props]),encoding='utf-8')
print('Generated',len(props),'property detail pages and homepage')
