import { useCallback, useEffect, useRef, useState } from 'react';

const TEMPO = 108;
const STEP_DURATION = 60 / TEMPO / 2;
const MASTER_VOLUME = 0.12;

const melody = [
  76, null, 79, 81, 83, null, 81, 79,
  76, null, 72, 74, 76, null, 74, 72,
  79, null, 83, 84, 86, null, 84, 83,
  79, 81, 83, null, 79, 74, 76, null,
] as const;

const bass = [
  40, null, 40, null, 36, null, 36, null,
  33, null, 33, null, 36, null, 38, null,
  40, null, 40, null, 43, null, 43, null,
  36, null, 38, null, 40, null, 35, null,
] as const;

const chords = [
  [52, 55, 59],
  [48, 52, 55],
  [45, 48, 52],
  [47, 50, 54],
] as const;

const midiToFrequency = (note: number) => 440 * 2 ** ((note - 69) / 12);

export function useChiptuneMusic() {
  // Start each page load armed for playback. Muting applies to the current
  // session only so a stale preference cannot silently disable the soundtrack.
  const [enabled, setEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const createVoice = useCallback((
    context: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ) => {
    const masterGain = masterGainRef.current;
    if (!masterGain) return;

    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }, []);

  const scheduleStep = useCallback((context: AudioContext, step: number, time: number) => {
    const patternIndex = step % melody.length;
    const melodyNote = melody[patternIndex];
    const bassNote = bass[patternIndex];

    if (melodyNote) {
      createVoice(context, midiToFrequency(melodyNote), time, STEP_DURATION * 0.72, 'square', 0.17);
    }

    if (bassNote) {
      createVoice(context, midiToFrequency(bassNote), time, STEP_DURATION * 1.5, 'triangle', 0.2);
    }

    if (patternIndex % 8 === 0) {
      const chord = chords[Math.floor(patternIndex / 8) % chords.length];
      chord.forEach((note) => {
        createVoice(context, midiToFrequency(note), time, STEP_DURATION * 6.8, 'sine', 0.035);
      });
    }

    if (patternIndex % 2 === 0) {
      const percussionFrequency = patternIndex % 8 === 0 ? 110 : 1760;
      createVoice(context, percussionFrequency, time, 0.035, 'square', patternIndex % 8 === 0 ? 0.09 : 0.025);
    }
  }, [createVoice]);

  const runScheduler = useCallback(() => {
    const context = contextRef.current;
    if (!context || !enabledRef.current || context.state !== 'running') return;

    while (nextNoteTimeRef.current < context.currentTime + 0.12) {
      scheduleStep(context, stepRef.current, nextNoteTimeRef.current);
      nextNoteTimeRef.current += STEP_DURATION;
      stepRef.current = (stepRef.current + 1) % melody.length;
    }
  }, [scheduleStep]);

  const start = useCallback(async () => {
    if (!enabledRef.current) return;

    let context = contextRef.current;
    if (context?.state === 'suspended') {
      // Some embedded browsers will not unlock an AudioContext that was created
      // by a blocked autoplay attempt. Recreate it synchronously inside the
      // trusted interaction so playback can begin without a separate toggle.
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      void context.close();
      contextRef.current = null;
      masterGainRef.current = null;
      context = null;
    }

    if (!context) {
      context = new AudioContext();
      const masterGain = context.createGain();
      masterGain.gain.setValueAtTime(0.0001, context.currentTime);
      masterGain.connect(context.destination);
      contextRef.current = context;
      masterGainRef.current = masterGain;
    }

    try {
      await context.resume();
    } catch {
      return;
    }

    if (context.state !== 'running') return;
    const masterGain = masterGainRef.current;
    if (masterGain) {
      masterGain.gain.cancelScheduledValues(context.currentTime);
      masterGain.gain.setValueAtTime(Math.max(masterGain.gain.value, 0.0001), context.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(MASTER_VOLUME, context.currentTime + 0.35);
    }

    if (timerRef.current === null) {
      nextNoteTimeRef.current = context.currentTime + 0.05;
      runScheduler();
      timerRef.current = window.setInterval(runScheduler, 25);
    }
    setPlaying(true);
  }, [runScheduler]);

  const stop = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const context = contextRef.current;
    const masterGain = masterGainRef.current;
    if (context && masterGain && context.state === 'running') {
      masterGain.gain.cancelScheduledValues(context.currentTime);
      masterGain.gain.setValueAtTime(Math.max(masterGain.gain.value, 0.0001), context.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
      window.setTimeout(() => {
        if (context.state === 'running') void context.suspend();
      }, 140);
    }
    setPlaying(false);
  }, []);

  const toggle = useCallback(async () => {
    const nextEnabled = !enabledRef.current;
    enabledRef.current = nextEnabled;
    setEnabled(nextEnabled);

    if (nextEnabled) {
      await start();
    } else {
      await stop();
    }
  }, [start, stop]);

  useEffect(() => {
    if (!enabled) return undefined;

    // Audible autoplay is blocked by embedded browsers. Create the audio engine
    // inside the first trusted interaction so Story Mode starts with music and
    // never requires a separate toggle.
    const unlockAudio = () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      void start();
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [enabled, start]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    const context = contextRef.current;
    if (context && context.state !== 'closed') void context.close();
  }, []);

  return { enabled, playing, start, toggle };
}
