# تفعيل سيرفر التخزين (Supabase) — مجاني

بهذا يصير كل القروب يشوف نفس البطولات والنتائج والحسابات.

## 1) إنشاء مشروع Supabase

1. ادخل: https://supabase.com
2. سجّل / ادخل
3. New Project
4. اختر اسم مثل `crow-db` وكلمة مرور قوية لقاعدة البيانات
5. انتظر حتى يجهز المشروع (دقيقة أو دقيقتين)

## 2) إنشاء الجداول

1. من القائمة: **SQL Editor**
2. New query
3. افتح ملف المشروع: `supabase/schema.sql`
4. انسخ كل المحتوى → الصقه في Supabase → **Run**

## 3) نسخ مفاتيح API

1. **Project Settings → API**
2. انسخ:
   - Project URL
   - `anon` `public` key
   - `service_role` key (سرّي — لا تنشره)

## 4) ملف البيئة المحلي

أنشئ ملف `.env.local` في جذر المشروع:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=الصق_هنا
SUPABASE_SERVICE_ROLE_KEY=الصق_هنا
AUTH_SECRET=اي-نص-طويل-عشوائي
```

ثم أعد تشغيل الموقع:

```bash
npm run dev
```

إذا نجح الربط، في أعلى الموقع يظهر شارة **سيرفر**.

## 5) ربط الموقع المنشور على Vercel

1. ادخل https://vercel.com → مشروع `crow-tournament`
2. Settings → Environment Variables
3. أضف نفس المتغيرات الأربعة
4. Deployments → Redeploy

الرابط الرسمي بعدها يستخدم قاعدة البيانات:

**https://crow-tournament.vercel.app**

## حساب المشرف بعد الربط

أول ما تشتغل القاعدة، يننشأ تلقائياً:

- اليوزر: `CrowAdmin`
- الباسورد: `crow123`

غيّر الباسورد لاحقاً من لوحة الإدارة أو بإنشاء مشرف جديد.

## ملاحظات

- الخطة المجانية من Supabase كافية للقروب
- البيانات مشتركة بين كل الأجهزة
- لا تشارك `SERVICE_ROLE_KEY` مع أحد
