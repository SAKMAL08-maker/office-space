import { personColors } from "@/world/colors";

// Shared by the page avatars and the 3D name signs, so a person looks the same in both.

/** Where the server sends a picture from. A new picture has a new id, so browsers keep each one. */
export const pictureUrl = (pictureId: string) => `/api/pictures/${encodeURIComponent(pictureId)}`;

/** Up to two letters: the first of the first and of the last word. "?" for a blank name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = (word: string) => Array.from(word)[0].toLocaleUpperCase();
  return words.length === 1 ? first(words[0]) : first(words[0]) + first(words[words.length - 1]);
}

/** How bright a colour looks, from 0 (black) to 1 (white), as WCAG measures it. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const value = parseInt(hex.slice(i, i + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

const DARK_INK = "#000000";
const LIGHT_INK = "#ffffff";

/** The contrast between two colours, from 1 (none) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The circle behind someone's initials is their shirt colour, so it matches their character.
 * The letters are white or black, whichever reads better on it.
 */
export function avatarColors(userId: string): { background: string; ink: string } {
  const background = personColors(userId).shirt;
  const ink =
    contrast(background, LIGHT_INK) >= contrast(background, DARK_INK) ? LIGHT_INK : DARK_INK;
  return { background, ink };
}
