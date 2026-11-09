# تحديث موقع EVACON الحالي على Railway (من غير ما تضيع بيانات العملاء)

المستودع الحالي على GitHub: `abdoreda100/evacon-website`.
الموقع الحالي: https://evacon-website-production.up.railway.app/
لوحة الإدارة: https://evacon-website-production.up.railway.app/admin

## قبل أي تحديث

- **متشاركش كلمة مرور الإدارة**، ومتضيفش أي ملف `.env` أو `leads.json` أو `cms.json` على GitHub.
- ادخل Railway → مشروع EVACON → الخدمة → **Settings / Volumes**، واتأكد إن **Volume مربوط عند `/data`**. لو مش موجود، لازم تربطه قبل تعديل محتوى حقيقي.
- نزّل نسخة CSV من `/api/admin/export` إن أمكن. ولو متاح، اعمل Backup للـVolume.
- تأكد من وجود Variables في خدمة Railway: `ADMIN_USER`، `ADMIN_PASSWORD` (12 حرفًا أو أكثر)، `REQUIRE_PERSISTENCE=1`.

## أسهل طريقة لاستبدال ملفات الموقع: GitHub Desktop

1. نزّل GitHub Desktop من https://desktop.github.com/ وسجل الدخول بنفس حساب GitHub.
2. اختار **File → Clone repository**، وحدّد `abdoreda100/evacon-website`. اختار فولدر على الكمبيوتر واضغط Clone.
3. فك ضغط **EVACON-CMS-Ready.zip** في فولدر منفصل.
4. انسخ **كل الملفات والمجلدات التي بداخل** فولدر `EVACON-CMS-Ready` إلى فولدر المستودع اللي GitHub Desktop نسخه على جهازك، واضغط **Replace files** لما يطلب استبدال.
   - الملفات الجديدة المهمّة: `cms.mjs`، `assets/admin-cms.js`، `assets/admin-cms.css`.
   - الملفات القديمة اللي هتتبدّل: `server.mjs`، `admin.html`، `home.template.html`، `assets/styles.css`، وغيرها.
5. ارجع لـGitHub Desktop. اكتب Summary: `Upgrade EVACON with property CMS and Facebook`.
6. اضغط **Commit to main** ثم **Push origin**.
7. افتح Railway → EVACON → **Deployments**. استنى لحد ما الحالة تبقى **Active**.

## بعد النشر

1. افتح `/` واتأكد من ظهور صورة الريسبشن **بالألوان الطبيعية**.
2. افتح `/admin` وسجّل الدخول. هتلاقي تبويبات: **طلبات العملاء**، **إدارة الوحدات**، **بيانات الشركة**.
3. راجع Facebook: https://www.facebook.com/p/Evacon-61594188086644/ — ظاهر في القوائم والفوتر وزر عائم.
4. جرّب تعديل وصف الشركة ثم الحفظ، وأعد تحديث الصفحة الرئيسية.
5. جرّب رفع صورة تجريبية وإضافة وحدة جديدة، وبعدين افتح رابط تفاصيل الوحدة من الموقع.
6. أعد Deploy وتأكد من بقاء كل التغييرات والاستفسارات. لو اختفت فالمشكلة غالبًا في الـVolume أو مسار الحفظ.

## تشغيل الموقع محليًا

داخل فولدر الموقع باستخدام PowerShell:

```powershell
$env:ADMIN_USER="admin"
$env:ADMIN_PASSWORD="PutYourOwnStrongPasswordHere2026!"
& "C:\Program Files\nodejs\node.exe" server.mjs
```

بعدها افتح http://localhost:3000/admin. (كلمة المرور اللي فوق مثال؛ بدّلها.)

## بيانات البداية والتحذيرات

- الوحدات والأسعار الستة الحالية **تجريبية**. لا تقفل شريط التنبيه ولا تفتح SEO indexing قبل إدخال وحدات وأسعار موثّقة.
- في وضع التجربة: الصفحة فيها `noindex` وملف `robots.txt` بيمنع فهرسة المحتوى. بعد استبدال كل البيانات الفعلية، من لوحة الإدارة أقفل «وضع التجربة» وفعّل «السماح بالفهرسة»؛ بعد كده `robots.txt` و`sitemap.xml` بيتحدثوا تلقائيًا.
- الصور الجديدة بتنحفظ داخل الـVolume، مش GitHub. بدون Volume هتضيع مع إعادة نشر الحاوية.
- تأكد إن فيه نسخ احتياطية دورية لملفات `cms.json`, `media/`, `leads.json`؛ خدمة Railway وحدها مش بديل لخطة نسخ احتياطية.
- الواجهة الحالية مناسبة كبداية تجريبية صغيرة. قبل توسيع نشاط الشركة، يفضل تطوير دخول متعدد المستخدمين وصلاحيات، MFA، وقاعدة بيانات مخصصة وBackups مستقلة.

