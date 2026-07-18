// Sound effects and music. Plain <audio> elements rather than the Web
// Audio API, consistent with how the rest of the game keeps things
// simple - a small pool of pre-created elements per sound lets rapid
// repeats (chained wall jumps, running footsteps) overlap cleanly instead
// of a single shared element cutting itself off every time it's
// re-triggered.

import footstep0Url from './assets/audio/footstep-0.ogg';
import footstep1Url from './assets/audio/footstep-1.ogg';
import footstep2Url from './assets/audio/footstep-2.ogg';
import footstep3Url from './assets/audio/footstep-3.ogg';
import footstep4Url from './assets/audio/footstep-4.ogg';
import jumpUrl from './assets/audio/jump.ogg';
import wallJumpUrl from './assets/audio/wall-jump.ogg';
import doubleJumpUrl from './assets/audio/double-jump.ogg';
import goalUrl from './assets/audio/goal.ogg';
import rumbleUrl from './assets/audio/rumble.ogg';
import explosionUrl from './assets/audio/explosion.ogg';
import gongUrl from './assets/audio/gong.ogg';
import musicMenuUrl from './assets/audio/music-menu.mp3';
import musicForestUrl from './assets/audio/music-forest.mp3';
import musicCityUrl from './assets/audio/music-city.mp3';
import musicMountainUrl from './assets/audio/music-mountain.mp3';
import musicTempleUrl from './assets/audio/music-temple.ogg';
import musicFinalLevelUrl from './assets/audio/music-final-level.mp3';
import musicCreditsUrl from './assets/audio/music-credits.mp3';

type Pool = { elements: HTMLAudioElement[]; next: number };

function createPool(url: string, size: number): Pool {
  const elements = Array.from({ length: size }, () => {
    const el = new Audio(url);
    el.preload = 'auto';
    return el;
  });
  return { elements, next: 0 };
}

const jumpPool = createPool(jumpUrl, 4);
const wallJumpPool = createPool(wallJumpUrl, 4);
const doubleJumpPool = createPool(doubleJumpUrl, 4);
const goalPool = createPool(goalUrl, 2);
const explosionPool = createPool(explosionUrl, 2);
const gongPool = createPool(gongUrl, 1);
const footstepPools = [footstep0Url, footstep1Url, footstep2Url, footstep3Url, footstep4Url].map((url) => createPool(url, 2));

// The ending sequence's screen-shake rumble is a single looping element
// (started/stopped explicitly) rather than a pool, since there's only ever
// one shake happening at a time and it needs to sustain for the whole
// stage instead of firing as a one-shot.
const rumbleEl = new Audio(rumbleUrl);
rumbleEl.preload = 'auto';
rumbleEl.loop = true;

// --- Music: one track per theme group, plus the menu and the credits
// crawl, switched by name rather than always being "the gameplay track".
// Each track is fetched lazily (preload: 'none') instead of eagerly like
// the short sound effects - the whole set is ~19MB, and downloading it all
// upfront on page load would be a bad first impression on a slow
// connection when only one track is going to play at a time anyway.
export type MusicTrack = 'menu' | 'forest' | 'city' | 'mountain' | 'temple' | 'finalLevel' | 'credits';

const MUSIC_VOLUME = 0.35;

function createMusicElement(url: string): HTMLAudioElement {
  const el = new Audio(url);
  el.preload = 'none';
  el.loop = true;
  return el;
}

const musicElements: Record<MusicTrack, HTMLAudioElement> = {
  menu: createMusicElement(musicMenuUrl),
  forest: createMusicElement(musicForestUrl),
  city: createMusicElement(musicCityUrl),
  mountain: createMusicElement(musicMountainUrl),
  temple: createMusicElement(musicTempleUrl),
  finalLevel: createMusicElement(musicFinalLevelUrl),
  credits: createMusicElement(musicCreditsUrl),
};

let currentTrack: MusicTrack | null = null;
let muted = false;
let unlocked = false;

function playFromPool(pool: Pool, volume: number) {
  if (muted) return;
  const el = pool.elements[pool.next];
  pool.next = (pool.next + 1) % pool.elements.length;
  try {
    el.currentTime = 0;
  } catch {
    // Some browsers throw if the element hasn't loaded enough yet - the
    // play() call below still works, it'll just start from wherever the
    // previous playback left off (rare, harmless for a <1s effect).
  }
  el.volume = volume;
  void el.play().catch(() => {});
}

export function playJump() {
  playFromPool(jumpPool, 0.5);
}

export function playWallJump() {
  playFromPool(wallJumpPool, 0.45);
}

export function playDoubleJump() {
  playFromPool(doubleJumpPool, 0.36);
}

export function playGoal() {
  playFromPool(goalPool, 0.7);
}

export function playExplosion() {
  playFromPool(explosionPool, 0.75);
}

// Returns whether playback actually started, so a caller can detect an
// autoplay block (e.g. playing this on page load, before any user gesture
// has happened yet - most mobile browsers refuse that) and retry later.
export function playGong(): Promise<boolean> {
  if (muted) return Promise.resolve(false);
  const el = gongPool.elements[0];
  el.currentTime = 0;
  el.volume = 0.6;
  return el.play().then(() => true).catch(() => false);
}

export function startRumble() {
  if (muted) return;
  rumbleEl.volume = 0.5;
  rumbleEl.currentTime = 0;
  void rumbleEl.play().catch(() => {});
}

export function stopRumble() {
  rumbleEl.pause();
  rumbleEl.currentTime = 0;
}

let footstepIndex = 0;
export function playFootstep() {
  const pool = footstepPools[footstepIndex];
  footstepIndex = (footstepIndex + 1) % footstepPools.length;
  playFromPool(pool, 0.32);
}

// Switches background music to the given track, stopping whatever was
// playing before. No-op if that track is already the one playing, so it's
// safe to call this on every level transition without causing a stutter
// every time the player just moves to the next level within the same
// theme group. Returns whether playback actually started (see playGong
// for why that matters).
export function playMusicTrack(track: MusicTrack): Promise<boolean> {
  if (currentTrack === track) return Promise.resolve(!musicElements[track].paused);
  if (currentTrack) {
    const prev = musicElements[currentTrack];
    prev.pause();
    prev.currentTime = 0;
  }
  currentTrack = track;
  if (muted) return Promise.resolve(false);
  const el = musicElements[track];
  el.volume = MUSIC_VOLUME;
  return el.play().then(() => true).catch(() => false);
}

// Hard stop (not a fade) - used the instant the player reaches the final
// level's goal, where the sudden silence is itself part of the "everything
// goes still" beat that kicks off the ending cinematic.
export function stopMusic() {
  if (currentTrack) {
    musicElements[currentTrack].pause();
    musicElements[currentTrack].currentTime = 0;
  }
  currentTrack = null;
}

// Mobile browsers (iOS Safari in particular) block any audio playback
// that isn't triggered directly by a user gesture. Call this once from
// inside a real click/tap handler (e.g. the menu's Play button) to prime
// every pooled element so later programmatic play() calls during actual
// gameplay work.
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  const allPools = [jumpPool, wallJumpPool, doubleJumpPool, goalPool, explosionPool, ...footstepPools];
  for (const pool of allPools) {
    for (const el of pool.elements) {
      el.play().then(() => {
        el.pause();
        el.currentTime = 0;
      }).catch(() => {});
    }
  }
  rumbleEl.play().then(() => {
    rumbleEl.pause();
    rumbleEl.currentTime = 0;
  }).catch(() => {});
  // Music tracks are deliberately not primed here. unlockAudio() is always
  // called from the Play button handler, which immediately starts a real
  // gameplay track in that same gesture via playMusicTrack() - priming
  // that track here would race its pause()-on-resolve against the real
  // play() and could silence it right after it starts (this bit us once
  // already with the single-track version of this system). Once the pools
  // above have successfully played following this gesture, browsers
  // generally treat the whole page as unlocked for further audio, so the
  // later tracks (city/mountain/temple/finalLevel/credits, all started
  // well after this gesture during actual gameplay) don't need individual
  // priming either.
}

export function setMuted(value: boolean) {
  muted = value;
  if (muted) {
    if (currentTrack) musicElements[currentTrack].pause();
  } else if (currentTrack) {
    const el = musicElements[currentTrack];
    el.volume = MUSIC_VOLUME;
    void el.play().catch(() => {});
  }
}

export function isMuted() {
  return muted;
}
