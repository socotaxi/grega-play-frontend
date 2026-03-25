-- ============================================================
-- MIGRATION : Synchroniser les données d'inscription vers profiles
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Ajouter la colonne gender si elle n'existe pas encore
alter table public.profiles
  add column if not exists gender text;

-- 2. Corriger le trigger pour copier TOUTES les données de l'inscription
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
