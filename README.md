# طويق — الموقع الرسمي

موقع وسيرفر مستقلان مخصصان لقروب طويق فقط.  
واجهة طويق + منصة البطولات (بطولات، تسجيل، ترتيب، متجر، إدارة…).

## التشغيل المحلي

```bash
npm install
npm run build
npm start
```

ثم افتح: [http://localhost:3847](http://localhost:3847)

للتطوير بدون بناء إنتاج:

```bash
npm run dev
```

## الرابط الرسمي الثابت

**https://tuwaiq-official-production.up.railway.app**

منشور على Railway — يشتغل حتى لو الجهاز مطفي.

## البنية

- `server.js` — Express لواجهة طويق وواجهات الأعضاء/الآراء
- `public/` — واجهة طويق الحالية
- `data/` — قاعدة بيانات الأعضاء والآراء
- `platform/` — منصة البطولات (Next.js) بهوية طويق

## متغيرات منصة البطولات (Railway)

للتخزين المشترك عبر Supabase أضف على الخدمة:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SECRET`
