# طويق — الموقع الرسمي

موقع وسيرفر مستقلان مخصصان لقروب طويق فقط.

## التشغيل المحلي

```bash
npm install
npm start
```

ثم افتح: [http://localhost:3847](http://localhost:3847)

## النشر العام (رابط مجاني)

```powershell
.\publish.ps1
```

يفتح نفق Cloudflare ويعطيك رابط `https://....trycloudflare.com`.

ملاحظة:
- ما فيه IP ثابت مجاني حقيقي.
- رابط Quick Tunnel يتغير إذا أعدت التشغيل.
- عشان رابط ثابت دائم: حساب Cloudflare مجاني + Named Tunnel، أو نشر على Render من `render.yaml`.

## البنية

- `server.js` — سيرفر Express مستقل
- `data/db.json` — قاعدة بيانات محلية خاصة بالموقع
- `public/` — واجهة الموقع
- `Dockerfile` / `render.yaml` — للنشر الدائم
