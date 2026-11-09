/** EVACON demo server — Node.js standard library only. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(ROOT, 'data');
const LEADS = path.join(DATA, 'leads.json');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const MAX_BODY = 20_000;
const limiter = new Map();
let pendingWrites = Promise.resolve();
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};
const sendJson = (res, code, data) => {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(data));
};
const sendError = (res, code, message) => sendJson(res, code, {ok:false,message});
const normalize = value => typeof value === 'string' ? value.trim() : '';
const safeText = (value, max = 120) => normalize(value).slice(0, max).replace(/[<>\u0000-\u0008]/g, '');
function same(a,b) { const x=Buffer.from(a), y=Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x,y); }
function authorized(req) {
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) return false;
  const h=req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  try {
    const decoded=Buffer.from(h.slice(6),'base64').toString('utf8');
    const colon=decoded.indexOf(':');
    return colon !== -1 && same(decoded.slice(0,colon),ADMIN_USER) && same(decoded.slice(colon+1),ADMIN_PASSWORD);
  } catch {return false;}
}
function adminGuard(req, res) {
  if (authorized(req)) return true;
  res.writeHead(401, {'WWW-Authenticate':'Basic realm="EVACON private leads", charset="UTF-8"','Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});
  res.end(ADMIN_PASSWORD.length < 12 ? 'لوحة الإدارة غير مفعلة. اضبط ADMIN_PASSWORD بطول 12 حرفًا أو أكثر.' : 'صلاحية الدخول مطلوبة.');
  return false;
}
function getRemoteIp(req) { return req.socket.remoteAddress || 'unknown'; } // does not trust spoofable X-Forwarded-For
async function loadLeads() {
  try { const value=JSON.parse(await fs.readFile(LEADS,'utf8')); return Array.isArray(value)?value:[]; }
  catch(err) { if(err.code==='ENOENT') return []; throw err; }
}
async function saveLead(lead) {
  // serialize writes to protect data from overlapping requests
  const operation = pendingWrites.then(async () => {
    await fs.mkdir(DATA,{recursive:true});
    const rows = await loadLeads(); rows.unshift(lead);
    const temp = path.join(DATA,`.leads-${process.pid}-${crypto.randomUUID()}.tmp`);
    await fs.writeFile(temp,JSON.stringify(rows,null,2),{mode:0o600});
    await fs.rename(temp,LEADS);
  });
  pendingWrites = operation.catch(err => {console.error('Lead write failed:',err.message);});
  await operation;
}
async function readBody(req) {
  let size = 0; const chunks=[];
  for await (const chunk of req) {size += chunk.length; if (size > MAX_BODY) throw new Error('TOO_LARGE'); chunks.push(chunk);}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {throw new Error('BAD_JSON');}
}
function throttle(ip) {
  const now=Date.now(); const entries=(limiter.get(ip)||[]).filter(n => now-n<60*60*1000);
  if(entries.length>=8) return false;
  entries.push(now);limiter.set(ip,entries);
  if(limiter.size>5000) for (const [key,value] of limiter) if(value[value.length-1] < now-60*60*1000) limiter.delete(key);
  return true;
}
async function serve(res, file, privateFile=false) {
  try {
    const bytes=await fs.readFile(file);
    const ext=path.extname(file);
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':bytes.length,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Cache-Control': privateFile?'no-store':'public,max-age=300'});
    res.end(bytes);
  } catch(err) {if(err.code==='ENOENT') sendError(res,404,'الصفحة غير موجودة.');else {console.error(err);sendError(res,500,'مشكلة داخلية.');}}
}
function csvCell(v) {
  let str=String(v ?? '').replace(/\r?\n/g,' ');
  if (/^[=+@\-\t\r]/.test(str.trimStart())) str="'"+str; // spreadsheet formula injection defense
  return '"'+str.replaceAll('"','""')+'"';
}
const handler = async (req,res) => {
  const method=req.method || 'GET';
  const pathname = new URL(req.url,'http://localhost').pathname;
  if(pathname==='/api/health') return sendJson(res,200,{ok:true,app:'EVACON'});
  if(pathname==='/api/leads' && method==='POST') {
    const origin=req.headers.origin;
    if (origin) { try { if(new URL(origin).host !== req.headers.host) return sendError(res,403,'Origin غير مسموح.'); } catch {return sendError(res,403,'Origin غير صحيح.');} }
    if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')) return sendError(res,415,'مطلوب JSON.');
    if(!throttle(getRemoteIp(req))) return sendError(res,429,'تم إرسال طلبات كتير. جرّب لاحقًا.');
    let body;try {body=await readBody(req);}catch(e){return sendError(res,e.message==='TOO_LARGE'?413:400,'تعذر قراءة البيانات.');}
    if(!body || typeof body!=='object' || Array.isArray(body)) return sendError(res,400,'بيانات غير صحيحة.');
    if(safeText(body.website)) return sendJson(res,201,{ok:true,reference:'RECEIVED'}); // honeypot
    const name=safeText(body.name,90), phone=safeText(body.phone,22);
    const digits=phone.replace(/\D/g,'');
    if(name.length<2 || digits.length<10 || digits.length>15) return sendError(res,422,'الاسم أو رقم الموبايل غير صحيح.');
    if(body.consent !== true) return sendError(res,422,'موافقة الخصوصية مطلوبة.');
    const intent=['شراء للسكن','استثمار','استفسار عام'].includes(body.intent)?body.intent:'استفسار عام';
    const budget=['لم أحدد بعد','أقل من 3 مليون','3 إلى 5 مليون','5 إلى 10 مليون','أكثر من 10 مليون'].includes(body.budget)?body.budget:'لم أحدد بعد';
    const location=['لم أحدد بعد','التجمع الخامس','الشيخ زايد','العاصمة الإدارية','الساحل الشمالي','6 أكتوبر','منطقة أخرى'].includes(body.location)?body.location:'لم أحدد بعد';
    const timeline=['غير محدد','خلال شهر','1 إلى 3 شهور','3 إلى 6 شهور','بعد 6 شهور'].includes(body.timeline)?body.timeline:'غير محدد';
    let visitDate=null;
    if(typeof body.visitDate==='string' && /^\d{4}-\d{2}-\d{2}$/.test(body.visitDate)) {
      const time=new Date(body.visitDate+'T00:00:00Z');
      if(!Number.isNaN(time.getTime()) && time.toISOString().startsWith(body.visitDate)) visitDate=body.visitDate;
    }
    let propertyId=null;
    const prop=Number(body.propertyId); if(Number.isInteger(prop)&&prop>=1&&prop<=6) propertyId=prop;
    const lead = {reference:'EV-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomInt(100000,999999),createdAt:new Date().toISOString(),name,phone,intent,budget,location,timeline,visitDate,propertyId,message:safeText(body.message,1000),source:'website',consent:true};
    try {await saveLead(lead);return sendJson(res,201,{ok:true,reference:lead.reference});}
    catch {return sendError(res,500,'تعذر تسجيل الطلب. حاول مرة تانية.');}
  }
  if(pathname==='/api/admin/leads' && method==='GET') {
    if(!adminGuard(req,res)) return;
    try {return sendJson(res,200,{ok:true,leads:await loadLeads()});}catch{return sendError(res,500,'تعذر تحميل الطلبات.');}
  }
  if(pathname==='/api/admin/export' && method==='GET') {
    if(!adminGuard(req,res)) return;
    const leads=await loadLeads(); const cols=['reference','createdAt','name','phone','intent','budget','location','timeline','visitDate','propertyId','message','source'];
    const output='\uFEFF'+[cols.join(','),...leads.map(lead=>cols.map(col=>csvCell(lead[col])).join(','))].join('\r\n');
    res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="evacon-leads.csv"','Cache-Control':'no-store'});res.end(output);return;
  }
  if(method!=='GET'&&method!=='HEAD') return sendError(res,405,'طريقة الطلب غير مدعومة.');
  if(pathname==='/admin' || pathname==='/admin/') {if(!adminGuard(req,res))return;return serve(res,path.join(ROOT,'admin.html'),true);}
  if(pathname==='/' || pathname==='/index.html') return serve(res,path.join(ROOT,'index.html'));
  if(pathname==='/privacy.html') return serve(res,path.join(ROOT,'privacy.html'));
  if(pathname==='/robots.txt') return serve(res,path.join(ROOT,'robots.txt'));
  if(/^\/properties\/[a-z0-9-]+\.html$/.test(pathname)) return serve(res,path.join(ROOT,pathname));
  if(/^\/assets\/[a-zA-Z0-9_.-]+\.(?:css|js|svg|png|webp|jpg)$/.test(pathname)) return serve(res,path.join(ROOT,pathname));
  return sendError(res,404,'الصفحة غير موجودة.');
};
await fs.mkdir(DATA,{recursive:true});
const server=http.createServer((req,res)=>{handler(req,res).catch(err=>{console.error(err);if(!res.headersSent)sendError(res,500,'مشكلة داخلية.');else res.end();});});
server.listen(PORT,()=>console.log(`EVACON website: http://localhost:${PORT}\nAdmin: http://localhost:${PORT}/admin (${ADMIN_PASSWORD.length>=12?'enabled':'disabled — configure ADMIN_PASSWORD'})`));
