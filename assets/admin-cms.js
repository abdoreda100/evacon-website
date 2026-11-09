(() => {
'use strict';
const $ = (selector,root=document)=>root.querySelector(selector);
const $$ = (selector,root=document)=>Array.from(root.querySelectorAll(selector));
let content={site:{},properties:[]};
let noticeTimer;
const notice=(message,error=false)=>{const el=$('#alert');el.textContent=message;el.classList.toggle('error',error);el.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,8500);window.scrollTo({top:0,behavior:'smooth'});};
async function json(url,options={}) {
 const response=await fetch(url,{...options,cache:'no-store',headers:options.body?{'Content-Type':'application/json'}:{}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.ok)throw new Error(data.message||`خطأ ${response.status}`);
 return data;
}
function text(tag,value){const el=document.createElement(tag);el.textContent=value==null?'—':String(value);return el;}
function showTab(name){$$('.cms-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('.cms-panel').forEach(p=>p.hidden=p.id!==`tab-${name}`);}
$$('.cms-tab').forEach(button=>button.addEventListener('click',()=>showTab(button.dataset.tab)));
async function loadLeads() {
 const body=$('#leads-body');body.replaceChildren();
 try {
  const {leads}=await json('/api/admin/leads');$('#total-leads').textContent=leads.length;
  $('#week-leads').textContent=leads.filter(l=>new Date(l.createdAt).getTime()>=Date.now()-7*86400000).length;
  if(!leads.length){const tr=text('tr','');const td=text('td','لسه مفيش طلبات.');td.colSpan=11;tr.append(td);body.append(tr);return;}
  for(const lead of leads){const tr=document.createElement('tr');const vals=[new Date(lead.createdAt).toLocaleString('ar-EG'),lead.reference,lead.name,lead.phone,lead.intent,lead.budget,lead.location,lead.timeline,lead.visitDate,lead.propertyId,lead.message];for(const v of vals)tr.append(text('td',v));body.append(tr);}
 }catch(err){const tr=document.createElement('tr');const td=text('td',err.message);td.colSpan=11;tr.append(td);body.append(tr);notice(err.message,true);}
}
function renderProperties() {
 const list=$('#properties-list');list.replaceChildren();
 if(!content.properties.length){list.append(text('p','مفيش وحدات حاليًا. اضغط إضافة وحدة جديدة.'));return;}
 for(const p of content.properties){
  const row=document.createElement('div');row.className='cms-property-row';
  const img=document.createElement('img');img.src=p.image;img.alt='';img.loading='lazy';row.append(img);
  const desc=document.createElement('div');desc.className='cms-property-text';desc.append(text('b',p.title));desc.append(text('small',`${Number(p.price).toLocaleString('en-US')} جنيه · ${p.location}`));row.append(desc);
  const buttons=document.createElement('div');buttons.className='cms-property-actions';
  const edit=text('button','تعديل');edit.className='cms-mini';edit.type='button';edit.addEventListener('click',()=>editProperty(p.id));
  const del=text('button','حذف');del.className='cms-mini danger';del.type='button';del.addEventListener('click',()=>removeProperty(p.id));
  buttons.append(edit,del);row.append(buttons);list.append(row);
 }
}
const pf=$('#property-form');
const pfields={title:'prop-title',location:'prop-location',district:'prop-district',type:'prop-type',status:'prop-status',price:'prop-price',area:'prop-area',beds:'prop-beds',baths:'prop-baths',tag:'prop-tag',slug:'prop-slug',description:'prop-description'};
function resetProperty(){pf.reset();$('#prop-id').value='';$('#prop-image').value='/assets/property-1.svg';$('#prop-image-preview').src='/assets/property-1.svg';$('#property-form-title').textContent='إضافة وحدة جديدة';$('#prop-image-file').value='';}
function editProperty(id) {
 const p=content.properties.find(x=>x.id===id);if(!p)return;
 resetProperty();$('#prop-id').value=p.id;
 for(const [key,id] of Object.entries(pfields))$('#'+id).value=p[key];
 $('#prop-features').value=(p.features||[]).join('\n');$('#prop-image').value=p.image;$('#prop-image-preview').src=p.image;
 $('#property-form-title').textContent='تعديل الوحدة: '+p.title;
 showTab('properties');pf.scrollIntoView({block:'start',behavior:'smooth'});
}
async function removeProperty(id){
 const p=content.properties.find(x=>x.id===id);if(!p||!confirm(`هل تريد حذف الوحدة «${p.title}»؟ لن تظهر للزوار بعد الحذف.`))return;
 try{await json(`/api/admin/properties/${id}`,{method:'DELETE'});await loadContent();notice('تم حذف الوحدة.');}catch(err){notice(err.message,true);}
}
function formProperty(){const item={};for(const [key,id] of Object.entries(pfields))item[key]=$('#'+id).value;
 for(const k of ['price','area','beds','baths'])item[k]=Number(item[k]);
 item.image=$('#prop-image').value;item.features=$('#prop-features').value.split('\n').map(x=>x.trim()).filter(Boolean);
 return item;
}
pf.addEventListener('submit',async event=>{event.preventDefault();const id=$('#prop-id').value;
 const button=$('#save-property');button.disabled=true;
 try {await json(id?`/api/admin/properties/${id}`:'/api/admin/properties',{method:id?'PUT':'POST',body:JSON.stringify(formProperty())});await loadContent();resetProperty();notice(id?'تم تعديل الوحدة وظهور التغييرات على الموقع.':'تمت إضافة الوحدة وظهرت على الموقع.');}
 catch(err){notice(err.message,true);}finally{button.disabled=false;}
});
$('#new-property').addEventListener('click',()=>{resetProperty();$('#property-form-title').scrollIntoView({block:'start',behavior:'smooth'});});
$('#cancel-property').addEventListener('click',resetProperty);
async function upload(file) {
 if(!file)return null;if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('اختار JPG أو PNG أو WebP.');
 if(file.size>3_000_000)throw new Error('حجم الصورة لازم يكون 3MB أو أقل.');
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
 const response=await json('/api/admin/upload',{method:'POST',body:JSON.stringify({mime:file.type,data})});return response.url;
}
async function uploadFor(input,hidden,preview){
 if(!input.files?.[0])return;input.disabled=true;notice('جاري رفع الصورة...');
 try{const url=await upload(input.files[0]);hidden.value=url;preview.src=url;notice('الصورة اترفعت بنجاح. اضغط حفظ لتطبيقها على الموقع.');}
 catch(err){notice(err.message,true);}finally{input.disabled=false;}
}
$('#prop-image-file').addEventListener('change',event=>uploadFor(event.target,$('#prop-image'),$('#prop-image-preview')));
$('#hero-image-file').addEventListener('change',event=>uploadFor(event.target,$('[name="heroImage"]'),$('#hero-image-preview')));
const sf=$('#site-form');
function populateSite() {for(const [key,value] of Object.entries(content.site)){const input=sf.elements.namedItem(key);if(!input)continue;if(input.type==='checkbox')input.checked=!!value;else input.value=value??'';}$('#hero-image-preview').src=content.site.heroImage||'/assets/hero-home.webp';}
sf.addEventListener('submit',async event=>{event.preventDefault();const item={};for(const field of $$('[name]',sf)){item[field.name]=field.type==='checkbox'?field.checked:field.value.trim();}const button=$('#save-site');button.disabled=true;
 try{await json('/api/admin/site',{method:'PUT',body:JSON.stringify(item)});await loadContent();notice('تم حفظ بيانات الشركة وروابط السوشيال والصورة بنجاح.');}catch(err){notice(err.message,true);}finally{button.disabled=false;}
});
async function loadContent(){const data=await json('/api/admin/content');content={site:data.site,properties:data.properties};renderProperties();populateSite();}
$('#refresh').addEventListener('click',loadLeads);
Promise.all([loadContent(),loadLeads()]).catch(err=>notice(err.message,true));
})();
