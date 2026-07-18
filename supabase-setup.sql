-- Run this once in the Supabase SQL Editor (dashboard -> SQL Editor -> New query).
-- Sets up the leaderboard table so that every device holds exactly one row
-- (its best score), reads are public, and writes can only happen through
-- submit_score() - which validates input and only ever moves a score up,
-- never down - so a tampered client can't overwrite a real best with a
-- lower one or write out-of-bounds garbage directly to the table.

create table public.leaderboard (
  device_id uuid primary key,
  nickname text not null,
  score integer not null default 0,
  updated_at timestamptz not null default now()
);

create index leaderboard_score_idx on public.leaderboard (score desc);

alter table public.leaderboard enable row level security;

-- Anyone can read the leaderboard (needed for the public top-N view).
create policy "Public read access"
  on public.leaderboard
  for select
  to anon
  using (true);

-- Deliberately no insert/update/delete policies for `anon` - RLS denies
-- direct writes by default once enabled, so the only way a row gets
-- created or changed is through the function below.

create or replace function public.submit_score(
  p_device_id uuid,
  p_nickname text,
  p_score integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_score < 0 or p_score > 10000000 then
    raise exception 'invalid score';
  end if;
  if char_length(p_nickname) < 1 or char_length(p_nickname) > 20 then
    raise exception 'invalid nickname';
  end if;

  insert into public.leaderboard (device_id, nickname, score, updated_at)
  values (p_device_id, p_nickname, p_score, now())
  on conflict (device_id) do update
  set
    nickname = excluded.nickname,
    score = greatest(public.leaderboard.score, excluded.score),
    updated_at = case
      when excluded.score > public.leaderboard.score then now()
      else public.leaderboard.updated_at
    end;
end;
$$;

grant execute on function public.submit_score(uuid, text, integer) to anon;
