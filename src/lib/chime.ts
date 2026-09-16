/**
 * A soft two-note shimmer for the app-open moment, synthesized with the Web
 * Audio API rather than shipped as an audio file — zero bytes, no asset to
 * license. Autoplay-without-a-gesture is blocked by most browsers on a cold
 * app launch, so every failure here (no Web Audio, suspended context,
 * blocked autoplay) is swallowed silently: the sound is a bonus, never a
 * requirement for the splash to "work".
 */
export function playOpeningChime(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.07, now + 0.09);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    master.connect(ctx.destination);

    for (const [freq, level, delay] of [
      [880, 1, 0],
      [1318.5, 0.55, 0.06],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + delay);
      osc.stop(now + 1.5);
    }

    const resumed = ctx.resume?.();
    if (resumed && typeof resumed.catch === "function") resumed.catch(() => {});

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1700);
  } catch {
    // Sound is a bonus, not a requirement — never let it affect the splash.
  }
}
