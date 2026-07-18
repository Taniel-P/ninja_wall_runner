// Global leaderboard, backed by Supabase. Every device gets one row (its
// best score), identified by a locally-generated anonymous id - there's no
// login system, so "who's who" is entirely on-device. If the Supabase
// project isn't configured (no env vars set), every function here quietly
// no-ops so the game still works fully offline/standalone.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEVICE_ID_KEY = 'wallrunner.deviceId';
const NICKNAME_KEY = 'wallrunner.nickname';
const PROMPTED_KEY = 'wallrunner.nicknamePrompted';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.info('[leaderboard] Supabase not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY) - leaderboard disabled.');
}

export function isLeaderboardEnabled(): boolean {
  return client !== null;
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getNickname(): string | null {
  return localStorage.getItem(NICKNAME_KEY);
}

export function setNickname(nickname: string) {
  const trimmed = nickname.trim().slice(0, 20);
  if (trimmed.length === 0) return;
  localStorage.setItem(NICKNAME_KEY, trimmed);
}

// Whether the one-time nickname prompt has been shown yet (regardless of
// whether the player typed a name or skipped it).
export function hasBeenPromptedForNickname(): boolean {
  return localStorage.getItem(PROMPTED_KEY) === '1';
}

export function markPromptedForNickname() {
  localStorage.setItem(PROMPTED_KEY, '1');
}

function randomDefaultNickname(): string {
  return `Ninja${Math.floor(1000 + Math.random() * 9000)}`;
}

// Ensures a nickname exists (falling back to a random default) without
// showing any UI - used when the player skips the prompt.
export function ensureNickname(): string {
  let nickname = getNickname();
  if (!nickname) {
    nickname = randomDefaultNickname();
    setNickname(nickname);
  }
  return nickname;
}

export async function submitScore(score: number): Promise<void> {
  if (!client || score <= 0) return;
  const deviceId = getDeviceId();
  const nickname = ensureNickname();
  try {
    const { error } = await client.rpc('submit_score', {
      p_device_id: deviceId,
      p_nickname: nickname,
      p_score: Math.floor(score),
    });
    if (error) {
      console.warn('[leaderboard] submitScore failed:', error.message);
    }
  } catch (err) {
    // Offline, DNS failure, etc. - the local score is unaffected either way.
    console.warn('[leaderboard] submitScore error:', err);
  }
}

export type LeaderboardEntry = { deviceId: string; nickname: string; score: number };

export async function fetchTopScores(limit = 10): Promise<LeaderboardEntry[]> {
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('leaderboard')
      .select('device_id, nickname, score')
      .order('score', { ascending: false })
      .limit(limit);
    if (error || !data) {
      console.warn('[leaderboard] fetchTopScores failed:', error?.message);
      return [];
    }
    return data.map((row) => ({ deviceId: row.device_id, nickname: row.nickname, score: row.score }));
  } catch (err) {
    console.warn('[leaderboard] fetchTopScores error:', err);
    return [];
  }
}
