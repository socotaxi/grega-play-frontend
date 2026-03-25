-- ============================================================
-- GREGA PLAY — Schéma complet v2
-- À exécuter dans Supabase SQL Editor sur le nouveau projet
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- Profils utilisateurs (liés à auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  birth_date date,
  phone text,
  country text,
  gender text,
  is_premium boolean default false,
  is_premium_account boolean default false,
  premium_account_expires_at timestamptz,
  created_at timestamptz default now()
);

-- Événements
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  theme text,
  deadline timestamptz,
  status text default 'open',
  public_code text unique,
  media_url text,
  is_public boolean default false,
  is_premium_event boolean default false,
  premium_event_expires_at timestamptz,
  max_videos integer,
  video_duration integer,
  max_clip_duration integer,
  enable_notifications boolean default false,
  final_video_url text,
  created_at timestamptz default now()
);

-- Invitations
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  email text not null,
  token uuid default gen_random_uuid(),
  message text,
  status text default 'pending',
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Participants à un événement
create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  email text,
  has_submitted boolean default false,
  submitted_at timestamptz,
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

-- Vidéos soumises
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  storage_path text,
  video_url text not null,
  participant_name text,
  participant_email text,
  status text default 'uploaded',
  duration numeric,
  created_at timestamptz default now()
);

-- Jobs de traitement vidéo asynchrone
create table public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'queued',
  progress integer default 0,
  selected_video_ids jsonb,
  requested_options jsonb,
  effective_preset jsonb,
  final_video_url text,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

-- Fil d'activité
create table public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type text,
  message text,
  created_at timestamptz default now()
);

-- Abonnements push notifications
create table public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text,
  auth text,
  created_at timestamptz default now()
);

-- Notifications in-app
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  message text,
  type text default 'info',
  read boolean default false,
  link text,
  created_at timestamptz default now()
);

-- Auth par téléphone (OTP)
create table public.phone_otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

create table public.phone_users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  auth_user_id uuid references auth.users(id) on delete cascade,
  pseudo_email text,
  created_at timestamptz default now()
);

-- Tracking installs PWA
create table public.app_install_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  platform text,
  created_at timestamptz default now()
);

-- ============================================================
-- VUE : activity_feed avec infos utilisateur
-- ============================================================
create or replace view public.activity_feed_with_user as
  select
    af.id,
    af.event_id,
    af.user_id,
    af.type,
    af.message,
    af.created_at,
    p.full_name,
    p.avatar_url
  from public.activity_feed af
  left join public.profiles p on p.id = af.user_id;

-- ============================================================
-- VUE : statistiques dashboard admin
-- ============================================================
create or replace view public.grega_dashboard_stats as
  select
    (select count(*) from auth.users) as total_users,
    (select count(*) from public.events) as total_events,
    (select count(*) from public.videos) as total_videos,
    (select count(*) from public.events where status = 'done') as completed_events,
    (select count(*) from auth.users where created_at > now() - interval '7 days') as new_users_7d,
    (select count(*) from public.events where created_at > now() - interval '7 days') as new_events_7d;

-- ============================================================
-- FONCTION RPC : vérifier accès à un événement
-- ============================================================
create or replace function public.can_access_event(p_event_id uuid, p_user_id uuid)
returns boolean
language plpgsql security definer
as $$
begin
  return exists (
    select 1 from public.events where id = p_event_id and user_id = p_user_id
  ) or exists (
    select 1 from public.event_participants where event_id = p_event_id and user_id = p_user_id
  ) or exists (
    select 1 from public.events where id = p_event_id and is_public = true
  );
end;
$$;

-- ============================================================
-- FONCTION RPC : événements du dashboard
-- ============================================================
create or replace function public.get_user_events(p_user_id uuid, p_user_email text)
returns setof public.events
language plpgsql security definer
as $$
begin
  return query
    select distinct e.*
    from public.events e
    left join public.event_participants ep on ep.event_id = e.id and ep.user_id = p_user_id
    left join public.invitations inv on inv.event_id = e.id and inv.email = p_user_email and inv.status = 'accepted'
    where e.user_id = p_user_id
       or ep.user_id = p_user_id
       or inv.id is not null
    order by e.created_at desc;
end;
$$;

-- ============================================================
-- FONCTION RPC : rejoindre un événement public
-- ============================================================
create or replace function public.join_public_event(p_public_code text)
returns void
language plpgsql security definer
as $$
declare
  v_event_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Non authentifié';
  end if;

  select id into v_event_id from public.events where public_code = p_public_code and is_public = true;
  if v_event_id is null then
    raise exception 'Événement introuvable ou non public';
  end if;

  insert into public.event_participants(event_id, user_id)
  values (v_event_id, v_user_id)
  on conflict (event_id, user_id) do nothing;
end;
$$;

-- ============================================================
-- TRIGGER : créer un profil automatiquement après inscription
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles(
    id,
    full_name,
    avatar_url,
    birth_date,
    country,
    phone,
    gender
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    (new.raw_user_meta_data->>'birth_date')::date,
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'gender'
  )
  on conflict (id) do update set
    full_name   = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url  = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    birth_date  = coalesce(excluded.birth_date, public.profiles.birth_date),
    country     = coalesce(excluded.country, public.profiles.country),
    phone       = coalesce(excluded.phone, public.profiles.phone),
    gender      = coalesce(excluded.gender, public.profiles.gender);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.invitations enable row level security;
alter table public.event_participants enable row level security;
alter table public.videos enable row level security;
alter table public.video_jobs enable row level security;
alter table public.activity_feed enable row level security;
alter table public.notification_subscriptions enable row level security;
alter table public.notifications enable row level security;

-- profiles : chaque user voit/modifie son propre profil
create policy "profiles: lecture" on public.profiles for select using (true);
create policy "profiles: modification" on public.profiles for update using (auth.uid() = id);

-- events : lecture publique ou propriétaire/participant, écriture propriétaire
create policy "events: lecture" on public.events for select using (
  is_public = true or user_id = auth.uid() or
  exists(select 1 from public.event_participants where event_id = id and user_id = auth.uid())
);
create policy "events: création" on public.events for insert with check (auth.uid() = user_id);
create policy "events: modification" on public.events for update using (auth.uid() = user_id);
create policy "events: suppression" on public.events for delete using (auth.uid() = user_id);

-- invitations
create policy "invitations: lecture" on public.invitations for select using (
  exists(select 1 from public.events where id = event_id and user_id = auth.uid())
  or email = (select email from auth.users where id = auth.uid())
);
create policy "invitations: création" on public.invitations for insert with check (
  exists(select 1 from public.events where id = event_id and user_id = auth.uid())
);
create policy "invitations: suppression" on public.invitations for delete using (
  exists(select 1 from public.events where id = event_id and user_id = auth.uid())
);

-- event_participants
create policy "participants: lecture" on public.event_participants for select using (
  user_id = auth.uid() or
  exists(select 1 from public.events where id = event_id and user_id = auth.uid())
);
create policy "participants: insertion" on public.event_participants for insert with check (true);
create policy "participants: modification" on public.event_participants for update using (
  user_id = auth.uid() or
  exists(select 1 from public.events where id = event_id and user_id = auth.uid())
);

-- videos
create policy "videos: lecture" on public.videos for select using (
  user_id = auth.uid() or
  exists(select 1 from public.events where id = event_id and user_id = auth.uid())
);
create policy "videos: insertion" on public.videos for insert with check (auth.uid() = user_id);
create policy "videos: suppression" on public.videos for delete using (
  user_id = auth.uid() or
  exists(select 1 from public.events where id = event_id and user_id = auth.uid())
);

-- video_jobs
create policy "video_jobs: lecture" on public.video_jobs for select using (user_id = auth.uid());
create policy "video_jobs: insertion" on public.video_jobs for insert with check (auth.uid() = user_id);

-- activity_feed
create policy "activity_feed: lecture" on public.activity_feed for select using (
  exists(select 1 from public.events where id = event_id and user_id = auth.uid())
  or user_id = auth.uid()
);
create policy "activity_feed: insertion" on public.activity_feed for insert with check (true);

-- notifications
create policy "notifications: lecture" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: modification" on public.notifications for update using (user_id = auth.uid());

-- notification_subscriptions
create policy "subscriptions: lecture" on public.notification_subscriptions for select using (user_id = auth.uid());
create policy "subscriptions: insertion" on public.notification_subscriptions for insert with check (auth.uid() = user_id);
create policy "subscriptions: suppression" on public.notification_subscriptions for delete using (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS
-- (à créer dans Supabase Dashboard > Storage, ou via SQL)
-- ============================================================

-- Bucket vidéos (public)
insert into storage.buckets (id, name, public) values ('videos', 'videos', true) on conflict do nothing;

-- Bucket assets premium (privé)
insert into storage.buckets (id, name, public) values ('premium-assets', 'premium-assets', false) on conflict do nothing;

-- Bucket avatars (public)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

-- Policies storage
create policy "videos: lecture publique" on storage.objects for select using (bucket_id = 'videos');
create policy "videos: upload authentifié" on storage.objects for insert with check (bucket_id = 'videos' and auth.role() = 'authenticated');
create policy "videos: suppression" on storage.objects for delete using (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[2]);

create policy "avatars: lecture publique" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars: upload" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatars: suppression" on storage.objects for delete using (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "premium-assets: lecture authentifiée" on storage.objects for select using (bucket_id = 'premium-assets' and auth.role() = 'authenticated');
create policy "premium-assets: upload" on storage.objects for insert with check (bucket_id = 'premium-assets' and auth.role() = 'authenticated');
