import { useEffect, useState } from "react";
import { pictureUrl } from "@/ui/avatar-style";

/**
 * Loads a profile picture for drawing on a 3D sign. It comes from this site, so the canvas may use
 * it. Null until it has loaded, and if it fails, so the sign keeps showing initials.
 */
export function usePicture(pictureId: string | null): HTMLImageElement | null {
  const [loaded, setLoaded] = useState<{ id: string; image: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!pictureId) return;
    const image = new Image();
    let current = true;
    image.onload = () => {
      if (current) setLoaded({ id: pictureId, image });
    };
    image.src = pictureUrl(pictureId);
    return () => {
      current = false;
      image.onload = null;
    };
  }, [pictureId]);

  // A picture loaded for an earlier id is never shown for the new one.
  return loaded && loaded.id === pictureId ? loaded.image : null;
}
