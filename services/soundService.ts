import { Rarity } from "../types";

let audioCtx: AudioContext | null = null;
let isMuted = false;

// Initialize or get the shared AudioContext
const getCtx = () => {
  if (typeof window === 'undefined') return null;
  
  if (!audioCtx) {
    // Cross-browser support
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  
  // Resume context if suspended (browser policy often suspends until interaction)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch((err) => console.warn("Audio resume failed", err));
  }
  
  return audioCtx;
};

// Global Mute Controls
export const toggleMute = (): boolean => {
  isMuted = !isMuted;
  return isMuted;
};

export const getMuted = (): boolean => isMuted;

// Helper to create a simple tone (Oscillator)
const playTone = (
  freq: number, 
  type: OscillatorType, 
  startTime: number, 
  duration: number, 
  vol: number = 0.1
) => {
  const ctx = getCtx();
  if (!ctx || isMuted) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Envelope
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.02); // Fast attack
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Decay

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
};

export const playChestOpen = () => {
  const ctx = getCtx();
  if (!ctx || isMuted) return;
  const t = ctx.currentTime;

  // 1. Thud / Low impact
  playTone(60, 'square', t, 0.2, 0.3);
  
  // 2. Creak (Pitch slide)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
  
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.4);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.4);
};

export const playLootReveal = (rarity: Rarity) => {
  const ctx = getCtx();
  if (!ctx || isMuted) return;
  const t = ctx.currentTime;

  // Helper for delays
  const note = (freq: number, delay: number, type: OscillatorType = 'sine', len: number = 0.8) => {
    playTone(freq, type, t + delay, len, 0.15);
  };

  switch (rarity) {
    case Rarity.COMMON:
      // Simple Major chord
      note(523.25, 0.0); // C5
      note(659.25, 0.1); // E5
      break;
      
    case Rarity.UNCOMMON:
      // Ascending triad
      note(523.25, 0.0); // C5
      note(659.25, 0.1); // E5
      note(783.99, 0.2); // G5
      break;
      
    case Rarity.RARE:
      // Bright Major 7th
      note(440.00, 0.0); // A4
      note(554.37, 0.1); // C#5
      note(659.25, 0.2); // E5
      note(880.00, 0.4); // A5
      break;
      
    case Rarity.EPIC:
      // Mystical / Spacey
      note(392.00, 0.0, 'sine'); // G4
      note(493.88, 0.1, 'sine'); // B4
      note(587.33, 0.2, 'triangle'); // D5
      note(783.99, 0.3, 'sine'); // G5
      note(1174.66, 0.5, 'sine', 1.5); // D6
      break;
      
    case Rarity.LEGENDARY:
      // Fanfare
      note(523.25, 0.0, 'square', 0.1); // C5
      note(523.25, 0.15, 'square', 0.1); // C5
      note(523.25, 0.3, 'square', 0.1); // C5
      note(698.46, 0.45, 'square', 0.8); // F5 (Held)
      note(880.00, 0.45, 'sine', 1.0); // A5 (Harmony)
      break;
      
    case Rarity.CURSED:
      // Diminished / Dissonant
      note(220.00, 0.0, 'sawtooth', 1.0); // A3
      note(311.13, 0.2, 'sawtooth', 1.0); // Eb4 (Tritone)
      note(293.66, 0.4, 'sawtooth', 1.0); // D4
      note(155.56, 0.6, 'sawtooth', 1.5); // Eb3
      break;
      
    default:
      note(440, 0);
  }
};

export const playUiClick = () => {
  const t = getCtx()?.currentTime || 0;
  playTone(800, 'sine', t, 0.1, 0.05);
};

export const playUiClose = () => {
  const t = getCtx()?.currentTime || 0;
  playTone(400, 'sine', t, 0.15, 0.05);
};
