export function voiceSeconds(value: number | undefined | null): number {
  return value != null && Number.isFinite(value) && value > 0 ? value : 0;
}
export function voiceTime(seconds: number): string {
  const whole = Math.floor(voiceSeconds(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
