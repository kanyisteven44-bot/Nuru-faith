/** Bound each utterance so mobile speech engines do not receive entire essays. */
export function readingAudioSections(parts: (string | null | undefined)[]): { text: string }[] {
  return parts.flatMap((part) => {
    if (!part?.trim()) return [];
    const sentences = part.match(/[^.!?]+[.!?]*/g) ?? [part];
    return sentences.flatMap((sentence) => {
      const words = sentence.trim().split(/\s+/);
      const chunks: { text: string }[] = [];
      let text = "";
      for (const word of words) {
        if (text && text.length + word.length > 220) {
          chunks.push({ text });
          text = "";
        }
        text = text ? `${text} ${word}` : word;
      }
      if (text) chunks.push({ text });
      return chunks;
    });
  });
}
