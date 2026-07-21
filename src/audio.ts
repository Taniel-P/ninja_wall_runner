// Sound effects and music - all played through the Web Audio API, not
// <audio> elements.
//
// Originally the short one-shot SFX (jump, wall-jump, double-jump, footstep,
// goal, explosion) were pooled HTMLAudioElements reset via currentTime=0 +
// play() on every retrigger. On real iOS hardware that pattern caused
// serious main-thread stalls (confirmed via on-device profiling: frame
// times spiking into the hundreds of ms) whenever a sound was retriggered
// frequently, e.g. footsteps firing every ~200ms while running.
// AudioBufferSourceNode fixed that: each play is a fresh, disposable node
// around a pre-decoded buffer, with none of HTMLMediaElement's
// seek/play/pause state-machine overhead.
//
// Music/gong/rumble were left on <audio> elements at first since they
// aren't retriggered rapidly - but any long-running, looping <audio>
// element gets automatically registered with WebKit's internal Now
// Playing/lock-screen media integration the instant it plays, and nothing
// short of dropping HTMLMediaElement entirely stopped that (confirmed:
// neither navigator.mediaSession nor native AVAudioSession/
// MPNowPlayingInfoCenter manipulation from the iOS side could suppress it -
// WebKit's <audio>/<video> integration sits at a lower level than either of
// those can reach). Web Audio API playback isn't treated as "media" by
// WebKit the same way, so it was never showing this behavior in the first
// place - moving music/gong/rumble onto the same AudioBufferSourceNode
// approach as the other SFX removes the lock-screen widget entirely rather
// than fighting it after the fact.

import footstep0Url from './assets/audio/footstep-0.m4a';
import footstep1Url from './assets/audio/footstep-1.m4a';
import footstep2Url from './assets/audio/footstep-2.m4a';
import footstep3Url from './assets/audio/footstep-3.m4a';
import footstep4Url from './assets/audio/footstep-4.m4a';
import jumpUrl from './assets/audio/jump.m4a';
import wallJumpUrl from './assets/audio/wall-jump.m4a';
import doubleJumpUrl from './assets/audio/double-jump.m4a';
import goalUrl from './assets/audio/goal.m4a';
import rumbleUrl from './assets/audio/rumble.m4a';
import explosionUrl from './assets/audio/explosion.m4a';
import gongUrl from './assets/audio/gong.m4a';
import musicMenuUrl from './assets/audio/music-menu.mp3';
import musicForestUrl from './assets/audio/music-forest.mp3';
import musicCityUrl from './assets/audio/music-city.mp3';
import musicMountainUrl from './assets/audio/music-mountain.mp3';
import musicTempleUrl from './assets/audio/music-temple.m4a';
import musicFinalLevelUrl from './assets/audio/music-final-level.mp3';
import musicCreditsUrl from './assets/audio/music-credits.mp3';

let muted = false;
let unlocked = false;

let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
    console.log('[audio] AudioContext created, initial state:', audioCtx.state);
    audioCtx.addEventListener('statechange', () => {
      console.log('[audio] AudioContext statechange ->', audioCtx?.state);
    });
  }
  return audioCtx;
}

// --- Short one-shot SFX ------------------------------------------------

type SfxAsset = { buffer: AudioBuffer | null };

// Fetched and decoded eagerly (doesn't need a user gesture, unlike
// playback) so the buffer is ready well before the player's first jump.
function loadSfxAsset(url: string): SfxAsset {
  const asset: SfxAsset = { buffer: null };
  fetch(url)
    .then((res) => res.arrayBuffer())
    .then((data) => getAudioContext().decodeAudioData(data))
    .then((decoded) => {
      asset.buffer = decoded;
      console.log('[audio] sfx decoded ok:', url);
    })
    .catch((err) => {
      console.error('[audio] sfx decode FAILED:', url, err);
    });
  return asset;
}

function playSfx(asset: SfxAsset, volume: number) {
  if (muted || !asset.buffer) return;
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = asset.buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

const jumpSfx = loadSfxAsset(jumpUrl);
const wallJumpSfx = loadSfxAsset(wallJumpUrl);
const doubleJumpSfx = loadSfxAsset(doubleJumpUrl);
const goalSfx = loadSfxAsset(goalUrl);
const explosionSfx = loadSfxAsset(explosionUrl);
const gongSfx = loadSfxAsset(gongUrl);
const rumbleSfx = loadSfxAsset(rumbleUrl);
const footstepSfx = [footstep0Url, footstep1Url, footstep2Url, footstep3Url, footstep4Url].map(loadSfxAsset);

export function playJump() {
  playSfx(jumpSfx, 0.5);
}

export function playWallJump() {
  playSfx(wallJumpSfx, 0.45);
}

export function playDoubleJump() {
  playSfx(doubleJumpSfx, 0.36);
}

export function playGoal() {
  playSfx(goalSfx, 0.7);
}

export function playExplosion() {
  playSfx(explosionSfx, 0.75);
}

let footstepIndex = 0;
export function playFootstep() {
  const asset = footstepSfx[footstepIndex];
  footstepIndex = (footstepIndex + 1) % footstepSfx.length;
  playSfx(asset, 0.32);
}

// Returns whether playback actually started, so a caller can detect an
// autoplay block (e.g. playing this on page load, before any user gesture
// has happened yet - most mobile browsers refuse that) and retry later.
export function playGong(): Promise<boolean> {
  if (muted || !gongSfx.buffer) return Promise.resolve(false);
  const ctx = getAudioContext();
  return ctx.resume().then(() => {
    if (ctx.state !== 'running') return false;
    playSfx(gongSfx, 0.6);
    return true;
  }).catch(() => false);
}

// --- Rumble (looping, explicit start/stop) ------------------------------

let rumbleSource: AudioBufferSourceNode | null = null;

function stopRumbleSource() {
  if (rumbleSource) {
    try {
      rumbleSource.stop();
    } catch {
      // Already stopped - fine.
    }
    rumbleSource.disconnect();
    rumbleSource = null;
  }
}

export function startRumble() {
  if (muted || !rumbleSfx.buffer) return;
  stopRumbleSource();
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = rumbleSfx.buffer;
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  rumbleSource = source;
}

export function stopRumble() {
  stopRumbleSource();
}

// --- Music: one track per theme group, plus the menu and the credits
// crawl, switched by name rather than always being "the gameplay track".
// Each track is fetched and decoded lazily (only once it's actually about
// to play) instead of eagerly like the short sound effects - the whole set
// is ~19MB, and downloading/decoding it all upfront on page load would be a
// bad first impression on a slow connection when only one track is going to
// play at a time anyway. Decoded buffers are cached per track after first
// use so switching back to an already-played track (e.g. returning to the
// menu) doesn't re-fetch/re-decode.
export type MusicTrack = 'menu' | 'forest' | 'city' | 'mountain' | 'temple' | 'finalLevel' | 'credits';

const MUSIC_VOLUME = 0.35;

type MusicAsset = { buffer: AudioBuffer | null; loading: Promise<AudioBuffer> | null; url: string };

function musicAsset(url: string): MusicAsset {
  return { buffer: null, loading: null, url };
}

const musicAssets: Record<MusicTrack, MusicAsset> = {
  menu: musicAsset(musicMenuUrl),
  forest: musicAsset(musicForestUrl),
  city: musicAsset(musicCityUrl),
  mountain: musicAsset(musicMountainUrl),
  temple: musicAsset(musicTempleUrl),
  finalLevel: musicAsset(musicFinalLevelUrl),
  credits: musicAsset(musicCreditsUrl),
};

function loadMusicAsset(track: MusicTrack): Promise<AudioBuffer> {
  const asset = musicAssets[track];
  if (asset.buffer) return Promise.resolve(asset.buffer);
  if (!asset.loading) {
    console.log('[audio] music fetch start:', track, asset.url);
    asset.loading = fetch(asset.url)
      .then((res) => {
        console.log('[audio] music fetch response:', track, res.status, res.ok);
        return res.arrayBuffer();
      })
      .then((data) => {
        console.log('[audio] music arrayBuffer bytes:', track, data.byteLength);
        return getAudioContext().decodeAudioData(data);
      })
      .then((decoded) => {
        console.log('[audio] music decoded ok:', track, decoded.duration);
        asset.buffer = decoded;
        return decoded;
      })
      .catch((err) => {
        console.error('[audio] music load/decode FAILED:', track, err);
        throw err;
      });
  }
  return asset.loading;
}

let musicSource: AudioBufferSourceNode | null = null;
let musicGain: GainNode | null = null;
let currentTrack: MusicTrack | null = null;
// Bumped on every play/stop/mute call so a slow decode that resolves after
// the player has already moved on to a different (or no) track doesn't
// start something stale playing on top of whatever's current.
let musicRequestId = 0;

// AudioBufferSourceNode has no native pause/resume - once started, it's
// play-to-completion or stop(). To make a background/foreground cycle feel
// like a real pause (picking back up where it was) rather than restarting
// from 0, this tracks where in the track the current source started from
// and how much context time has elapsed since, so the position at any
// moment can be reconstructed and handed back to a fresh source as its
// start offset.
let musicStartedAtCtxTime = 0;
let musicStartOffset = 0;

function currentMusicPosition(): number {
  const asset = currentTrack ? musicAssets[currentTrack] : null;
  if (!audioCtx || !asset?.buffer || !musicSource) return 0;
  const elapsed = audioCtx.currentTime - musicStartedAtCtxTime;
  return (musicStartOffset + elapsed) % asset.buffer.duration;
}

function stopMusicSource() {
  if (musicSource) {
    try {
      musicSource.stop();
    } catch {
      // Already stopped - fine.
    }
    musicSource.disconnect();
    musicSource = null;
  }
  if (musicGain) {
    musicGain.disconnect();
    musicGain = null;
  }
}

// offsetSeconds is only for resuming after a background pause (see
// currentMusicPosition) - a normal track switch (e.g. entering a level in a
// different theme) always wants to start from the beginning, so it's 0 by
// default.
function startMusicSource(track: MusicTrack, offsetSeconds = 0): Promise<boolean> {
  const requestId = ++musicRequestId;
  console.log('[audio] startMusicSource requested:', track, 'offset:', offsetSeconds, 'ctx state before:', audioCtx?.state);
  return loadMusicAsset(track)
    .then((buffer) => getAudioContext().resume().catch((err) => {
      console.error('[audio] resume() in startMusicSource rejected:', track, err);
    }).then(() => buffer))
    .then((buffer) => {
      if (requestId !== musicRequestId) {
        console.log('[audio] startMusicSource superseded, skipping:', track);
        return false;
      }
      stopMusicSource();
      const ctx = getAudioContext();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = MUSIC_VOLUME;
      source.connect(gain);
      gain.connect(ctx.destination);
      const startOffset = offsetSeconds % buffer.duration;
      source.start(0, startOffset);
      musicSource = source;
      musicGain = gain;
      musicStartedAtCtxTime = ctx.currentTime;
      musicStartOffset = startOffset;
      console.log('[audio] source.start() called for', track, 'offset:', startOffset, 'ctx state now:', ctx.state, 'gain:', gain.gain.value);
      // Unlike HTMLAudioElement.play(), source.start() never rejects just
      // because the context is autoplay-blocked - it schedules silently
      // either way. Reporting the real state here (rather than always
      // "true") is what lets playMenuMusicWithFallback's retry-on-first-
      // gesture logic actually detect the block and kick in.
      return ctx.state === 'running';
    })
    .catch((err) => {
      console.error('[audio] startMusicSource FAILED:', track, err);
      return false;
    });
}

// Switches background music to the given track, stopping whatever was
// playing before. No-op if that track is already the one playing, so it's
// safe to call this on every level transition without causing a stutter
// every time the player just moves to the next level within the same
// theme group. Returns whether playback actually started (see playGong
// for why that matters).
export function playMusicTrack(track: MusicTrack): Promise<boolean> {
  if (currentTrack === track && musicSource) return Promise.resolve(true);
  currentTrack = track;
  if (muted) {
    musicRequestId++;
    return Promise.resolve(false);
  }
  return startMusicSource(track);
}

// Hard stop (not a fade) - used the instant the player reaches the final
// level's goal, where the sudden silence is itself part of the "everything
// goes still" beat that kicks off the ending cinematic.
export function stopMusic() {
  musicRequestId++;
  stopMusicSource();
  currentTrack = null;
}

// Mobile browsers (iOS Safari in particular) block any audio playback
// that isn't triggered directly by a user gesture. Call this once from
// inside a real click/tap handler (e.g. the menu's Play button) to resume
// the shared AudioContext - every sound in this file (SFX, music, gong,
// rumble) runs through it, so this one resume() unlocks all of them at
// once for the rest of the session.
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  const ctx = getAudioContext();
  console.log('[audio] unlockAudio() called, ctx state before resume:', ctx.state);
  ctx.resume().then(() => {
    console.log('[audio] unlockAudio() resume resolved, ctx state:', ctx.state);
  }).catch((err) => {
    console.error('[audio] unlockAudio() resume rejected:', err);
  });
}

// Suspending the whole AudioContext (rather than pausing individual
// sources) silences everything at once and is the thing that actually
// stops audio from continuing after the player leaves the app entirely -
// unlike HTMLMediaElement, WKWebView doesn't keep Web Audio API playback
// alive across a background/lock on its own, but this is kept explicit
// (and applied on visibilitychange, not left implicit) to be certain.
// Captured here (rather than only inside recreateAudioContext) since the
// context this reads from is about to be suspended/discarded - this is the
// last point where its currentTime still reflects "where playback actually
// was" rather than frozen/stale.
let pausedMusicPosition = 0;

export function pauseForBackground() {
  console.log('[audio] pauseForBackground called, ctx state:', audioCtx?.state, 'currentTrack:', currentTrack, 'musicSource:', !!musicSource);
  pausedMusicPosition = currentMusicPosition();
  console.log('[audio] pauseForBackground: captured music position:', pausedMusicPosition);
  if (audioCtx && audioCtx.state === 'running') {
    void audioCtx.suspend();
  }
}

// Trying to resume the SAME AudioContext after an interruption turned out
// to be unreliable in a way that's invisible to the Web Audio API itself:
// confirmed on-device, resume() can eventually succeed and ctx.state can
// genuinely read "running", with a freshly restarted source on top of that,
// and still produce no audible output at all - the underlying iOS audio
// route apparently doesn't always come back even though the context's own
// state reporting says it did. Discarding the old context and building a
// completely fresh one sidesteps that "zombie" state instead of trying to
// detect or work around it. AudioBuffers aren't tied to a specific context,
// so nothing needs re-fetching or re-decoding - only new source/gain nodes.
function recreateAudioContext(): AudioContext {
  const old = audioCtx;
  if (old) {
    try {
      old.close();
    } catch {
      // Already closing/closed - fine.
    }
  }
  stopMusicSource();
  stopRumbleSource();
  audioCtx = null;
  return getAudioContext();
}

// Same "Failed to start the audio device" transient failure as before can
// still happen on a fresh context immediately after an interruption, so
// this keeps the short retry-with-delay loop, and falls back to waiting for
// the next real touch (same fallback the initial autoplay unlock uses) only
// once those are exhausted.
function resumeWithRetry(attemptsLeft: number) {
  const ctx = recreateAudioContext();
  ctx.resume().then(() => {
    console.log('[audio] resumeWithRetry: resume() resolved, ctx state now:', ctx.state, 'attemptsLeft:', attemptsLeft);
    if (ctx.state === 'running') {
      if (currentTrack) void startMusicSource(currentTrack, pausedMusicPosition);
      return;
    }
    if (attemptsLeft > 0) {
      setTimeout(() => resumeWithRetry(attemptsLeft - 1), 400);
      return;
    }
    armBackgroundTouchRetry();
  }).catch((err) => {
    console.error('[audio] resumeWithRetry: resume() rejected:', err, 'attemptsLeft:', attemptsLeft);
    if (attemptsLeft > 0) {
      setTimeout(() => resumeWithRetry(attemptsLeft - 1), 400);
    } else {
      armBackgroundTouchRetry();
    }
  });
}

function armBackgroundTouchRetry() {
  console.log('[audio] arming retry-on-touch fallback');
  const retry = () => {
    window.removeEventListener('pointerdown', retry);
    window.removeEventListener('keydown', retry);
    resumeWithRetry(3);
  };
  window.addEventListener('pointerdown', retry, { once: true });
  window.addEventListener('keydown', retry, { once: true });
}

export function resumeFromBackground() {
  console.log('[audio] resumeFromBackground called, ctx state:', audioCtx?.state, 'muted:', muted, 'currentTrack:', currentTrack, 'musicSource:', !!musicSource);
  if (muted) return;
  resumeWithRetry(3);
}

export function setMuted(value: boolean) {
  muted = value;
  if (muted) {
    musicRequestId++;
    stopMusicSource();
  } else if (currentTrack) {
    void startMusicSource(currentTrack);
  }
}

export function isMuted() {
  return muted;
}
