# גדוד הבוקע 5035 — Habokea App

מערכת ניהול (Next.js 16 + Supabase + PWA) — שכתוב של אפליקציית ה-Angular/FastAPI הישנה.

## Stack
- Next.js 16 (App Router, Turbopack, React 19), TypeScript
- Tailwind v4 + shadcn/ui (base-ui), RTL עברית
- Supabase (Postgres + Auth + RLS + Storage)
- TanStack Query + TanStack Table
- PWA + Web Push (VAPID, manual service worker)

## Tabs
- **רכבים** (vehicles) — טבלה מלאה: עריכה inline, סינון, מיון, קיבוץ לפי פלוגה, ייצוא CSV/וואטסאפ/העתקה, מודאל הוספה/עריכה, תצוגת כרטיסים במובייל.
- **כרטיס עבודה** (drive-card) — רישום נסיעות + ייצוא PDF בעברית.
- **הודעות וואטסאפ** (whatsapp) — מחולל מעקב תרגולות יומי.
- **ניהול** (admin) — ניהול משתמשים (יצירה, תפקידים, הרשאות per-tab), תפקידים, סוגי רכב/תפקידים, שליחת התראות push.
- **פרופיל** (profile) — עריכת פרטים, החלפת סיסמה, הרשמה להתראות.

## Setup
1. מלא את `.env.local` (ראה `.env.local.example`): מפתחות Supabase (URL/anon/service-role/ref), `GITHUB_PAT`, `VERCEL_TOKEN`. מפתחות ה-VAPID כבר מולאו.
2. החל את המיגרציות על פרויקט Supabase לפי הסדר:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_seed.sql`
3. צור משתמש אדמין ראשון (ראה למטה).
4. `npm install && npm run dev`.

## Auth
- התחברות עם **אימייל או טלפון** + סיסמה.
- סיסמה ראשונית = מספר הטלפון; המשתמש מחויב להחליף בכניסה הראשונה.
- אדמין יוצר משתמשים ממסך הניהול (אין הרשמה עצמית).

### יצירת אדמין ראשון
לאחר יצירת משתמש ב-Authentication, ב-SQL Editor:
```sql
update public.profiles
set role_id = (select id from public.roles where name = 'admin'),
    must_change_password = false,
    full_name = 'מנהל'
where email = 'YOUR_ADMIN_EMAIL';
```

## Deploy (Vercel)
- חבר את הריפו `gdud5035/habokea-app` ל-Vercel (או דרך `vercel` CLI).
- הגדר את כל משתני הסביבה (כולל `NEXT_PUBLIC_APP_URL` = דומיין הפרודקשן — נחוץ ל-push ול-manifest).
