-- Crow storage schema (Supabase)
-- افتح SQL Editor في Supabase والصق هذا الملف ثم Run

create extension if not exists "pgcrypto";

-- اللاعبون والحسابات
create table if not exists profiles (
  id text primary key,
  username text unique not null,
  password_hash text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- البطولات (بما فيها الشجرة والمشاركين)
create table if not exists tournaments (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists votes (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists news (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists hall_of_fame (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- إعدادات عامة (مثل تهيئة الأدمن)
create table if not exists app_meta (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

alter table profiles enable row level security;
alter table tournaments enable row level security;
alter table votes enable row level security;
alter table news enable row level security;
alter table notifications enable row level security;
alter table hall_of_fame enable row level security;
alter table app_meta enable row level security;

-- القراءة العامة مسموحة (الكتابة تتم من السيرفر بمفتاح الخدمة)
drop policy if exists "public read profiles" on profiles;
create policy "public read profiles" on profiles for select using (true);

drop policy if exists "public read tournaments" on tournaments;
create policy "public read tournaments" on tournaments for select using (true);

drop policy if exists "public read votes" on votes;
create policy "public read votes" on votes for select using (true);

drop policy if exists "public read news" on news;
create policy "public read news" on news for select using (true);

drop policy if exists "public read notifications" on notifications;
create policy "public read notifications" on notifications for select using (true);

drop policy if exists "public read hall" on hall_of_fame;
create policy "public read hall" on hall_of_fame for select using (true);
