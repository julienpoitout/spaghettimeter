-- Create user roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS: everyone can read roles (needed for UI checks)
create policy "Roles are readable by authenticated users"
on public.user_roles for select to authenticated
using (true);

-- Update spaghetti_knowledge RLS: only admins can insert/update/delete
drop policy if exists "Authenticated users can insert knowledge" on public.spaghetti_knowledge;
drop policy if exists "Authenticated users can update knowledge" on public.spaghetti_knowledge;
drop policy if exists "Authenticated users can delete knowledge" on public.spaghetti_knowledge;

create policy "Admins can insert knowledge"
on public.spaghetti_knowledge for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update knowledge"
on public.spaghetti_knowledge for update to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete knowledge"
on public.spaghetti_knowledge for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for knowledge documents
insert into storage.buckets (id, name, public)
values ('knowledge-docs', 'knowledge-docs', false);

-- Storage policies: admins can upload/read/delete
create policy "Admins can upload knowledge docs"
on storage.objects for insert to authenticated
with check (bucket_id = 'knowledge-docs' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can read knowledge docs"
on storage.objects for select to authenticated
using (bucket_id = 'knowledge-docs' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete knowledge docs"
on storage.objects for delete to authenticated
using (bucket_id = 'knowledge-docs' and public.has_role(auth.uid(), 'admin'));

-- Add file_url column to spaghetti_knowledge for document uploads
alter table public.spaghetti_knowledge add column file_url text;

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamp with time zone default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update to authenticated
using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();