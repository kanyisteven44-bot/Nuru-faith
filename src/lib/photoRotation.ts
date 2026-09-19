import { createElement, useEffect, useState, type ImgHTMLAttributes } from "react";
import bibleCandle from "@/assets/bible-candle.jpg";
import churchInterior from "@/assets/church-interior.jpg";
import crossSunrise from "@/assets/cross-sunrise.jpg";
import friendsDusk from "@/assets/friends-dusk.jpg";
import mountainDawn from "@/assets/mountain-dawn.jpg";
import quietNight from "@/assets/quiet-night.jpg";
import walkPurpose from "@/assets/walk-purpose.jpg";
import worshipNight from "@/assets/worship-night.jpg";

/** Shared, deliberately small image library for decorative Nuru backdrops. */
export const BACKGROUND_PHOTOS = [
  mountainDawn,
  walkPurpose,
  friendsDusk,
  churchInterior,
  crossSunrise,
  worshipNight,
  bibleCandle,
  quietNight,
] as const;

export const PHOTO_ROTATION_MS = 4 * 60 * 60 * 1000;

function slotOffset(slot: string) {
  return [...slot].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7);
}

/**
 * Picks a stable photo for the current four-hour window. Different slots use
 * different images, while every device changes at the same boundary.
 */
export function rotatingPhoto(slot: string, photos = BACKGROUND_PHOTOS) {
  const window = Math.floor(Date.now() / PHOTO_ROTATION_MS);
  return photos[(window + slotOffset(slot)) % photos.length]!;
}

/** Re-renders just after the next four-hour boundary, then every four hours. */
export function useRotatingPhoto(slot: string, photos = BACKGROUND_PHOTOS) {
  const [photoWindow, setPhotoWindow] = useState(() => Math.floor(Date.now() / PHOTO_ROTATION_MS));

  useEffect(() => {
    const schedule = () => {
      const now = Date.now();
      const delay = PHOTO_ROTATION_MS - (now % PHOTO_ROTATION_MS) + 250;
      return window.setTimeout(() => {
        setPhotoWindow(Math.floor(Date.now() / PHOTO_ROTATION_MS));
        timer = schedule();
      }, delay);
    };
    let timer = schedule();
    return () => window.clearTimeout(timer);
  }, []);

  return photos[(photoWindow + slotOffset(slot)) % photos.length]!;
}

/** An image element that updates with the shared four-hour rotation. */
export function RotatingPhoto({ slot, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement> & { slot: string }) {
  const src = useRotatingPhoto(slot);
  return createElement("img", { ...props, src, alt });
}
