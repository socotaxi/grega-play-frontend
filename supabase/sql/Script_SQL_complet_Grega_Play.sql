-- Supprime d'abord les anciennes tables si elles existent (optionnel mais utile pour un reset)
drop table if exists videos cascade;
drop table if exists invitations cascade;
drop table if exists events cascade;

-- Table EVENTS (événements créés par les utilisateurs)
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  theme text,
  deadline timestamptz,
  max_videos integer,
  status text default 'open',
  created_at timestamptz default now(),
  final_video_url text
);

-- Table INVITATIONS (emails invités à un événement)
create table invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  email text not null,
  created_at timestamptz default now()
);

-- Table VIDEOS (vidéos envoyées pour un événement)
create table videos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  video_url text not null,
  created_at timestamptz default now()
);
