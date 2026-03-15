/**
 * Game TTS (Text-to-Speech) — Completely self-contained, modular TTS utility.
 *
 * Uses the Web Speech API. Can be toggled on/off via localStorage.
 * Adding new phrases is as simple as adding an entry to PHRASES.
 *
 * This module has ZERO side-effects on import. Nothing runs until you call a function.
 */

// ── Storage key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mtg-game-tts-enabled';

// ── Phrase registry ──────────────────────────────────────────────────────────

export interface TTSPhrase {
  /** Unique key used to trigger the phrase */
  key: string;
  /** The text spoken aloud */
  text: string;
  /** BCP-47 language tag (defaults to 'es-ES') */
  lang?: string;
  /** Speech rate 0.1–10 (default 1) */
  rate?: number;
  /** Pitch 0–2 (default 1) */
  pitch?: number;
}

const PHRASES: TTSPhrase[] = [
  {
    key: 'pagas',
    text: '¿Pagas el precio?',
    lang: 'es-VE',
    rate: 0.9,
    pitch: 0.8,
  },
];

// ── Voice cache (Chrome loads voices asynchronously) ─────────────────────────

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  cachedVoices = window.speechSynthesis.getVoices();
  if (cachedVoices.length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      cachedVoices = window.speechSynthesis.getVoices();
    }, { once: true });
  }
}

loadVoices();

// ── Warm up speech synthesis with user gesture ──────────────────────────────
// Chrome blocks speechSynthesis.speak() unless a user gesture has previously
// triggered it. We prime it silently on the first click/keydown so that
// socket-driven TTS events can play audio without being blocked.

let warmedUp = false;

function warmUpTTS(): void {
  if (warmedUp || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  warmedUp = true;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  window.speechSynthesis.speak(u);
  window.removeEventListener('click', warmUpTTS);
  window.removeEventListener('keydown', warmUpTTS);
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', warmUpTTS);
  window.addEventListener('keydown', warmUpTTS);
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Check whether TTS is enabled (persisted in localStorage). */
export function isTTSEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

/** Toggle TTS on/off. Returns the new state. */
export function toggleTTS(): boolean {
  const next = !isTTSEnabled();
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch { /* storage full / blocked — silently ignore */ }
  return next;
}

/** Set TTS enabled state explicitly. */
export function setTTSEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch { /* noop */ }
}

/** Check if the browser supports speech synthesis at all. */
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak a registered phrase by key. No-ops silently if TTS is off or unsupported. */
export function speakPhrase(key: string): void {
  if (!isTTSEnabled() || !isTTSSupported()) return;

  const phrase = PHRASES.find(p => p.key === key);
  if (!phrase) return;

  // Cancel any in-progress speech, then schedule the new one after a tick.
  // Chrome has a bug where cancel() + speak() in the same tick can silently fail.
  window.speechSynthesis.cancel();

  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(phrase.text);
    utterance.lang = phrase.lang ?? 'es-ES';
    utterance.rate = phrase.rate ?? 1;
    utterance.pitch = phrase.pitch ?? 1;

    // Use cached voices (pre-loaded on module init)
    const langPrefix = (phrase.lang ?? 'es').split('-')[0]!;
    const match = cachedVoices.find(v => v.lang.startsWith(langPrefix));
    if (match) utterance.voice = match;

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') console.warn('[TTS] Speech error:', e.error);
    };

    window.speechSynthesis.speak(utterance);
  }, 50);
}

/** Convenience: speak the "pagas el precio?" phrase. */
export function speakPagas(): void {
  speakPhrase('pagas');
}
