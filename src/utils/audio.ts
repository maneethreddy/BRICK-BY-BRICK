// Web Audio API Synthesizer for Habit Tracker Completed Sound
// Self-contained, lightweight, and works offline without downloading audio files.

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    // Standard AudioContext initialization
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
};

/**
 * Play a premium, soft synthesizer chime for habit completion.
 * Harmonious double-frequency bell sound (A5 + E6) with smooth exponential decay.
 */
export const playCompleteSound = (): void => {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (browser security autoplays blocker)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // --- Tone 1: Fundamental (A5 - 880Hz) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    
    // Soft pitch slide up for a premium "lifting" feel
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1); // Slide up to C6

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.01); // Quick attack
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45); // Smooth decay

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // --- Tone 2: Harmonious Fifth (E6 - 1318.5Hz) ---
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.05); // Play slightly delayed
    
    gain2.gain.setValueAtTime(0, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.1, now + 0.06); // Quick attack
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5); // Slightly longer decay

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    // Start and stop oscillators
    osc1.start(now);
    osc1.stop(now + 0.5);

    osc2.start(now + 0.05);
    osc2.stop(now + 0.55);
  } catch (error) {
    console.warn('Failed to play complete sound:', error);
  }
};
