import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { avatarColors, initials } from "@/ui/avatar-style";
import { usePicture } from "./use-picture";

const HEIGHT = 0.42;
const FONT_PX = 32;
const PAD_PX = 14;
const BADGE_MARGIN_PX = 8;
const BADGE_GAP_PX = 10;

/** Who a sign names, so it can show their picture, or their initials, at its left end. */
export type SignPerson = { id: string; name: string; pictureId: string | null };

type Badge = { person: SignPerson; picture: HTMLImageElement | null };

/** The person's round picture, cropped to fill the circle, or their initials on their colour. */
function drawBadge(
  context: CanvasRenderingContext2D,
  { person, picture }: Badge,
  x: number,
  y: number,
  size: number,
) {
  const { background, ink } = avatarColors(person.id);
  context.save();
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  context.clip();
  if (picture) {
    const side = Math.min(picture.naturalWidth, picture.naturalHeight);
    const sx = (picture.naturalWidth - side) / 2;
    const sy = (picture.naturalHeight - side) / 2;
    context.drawImage(picture, sx, sy, side, side, x, y, size, size);
  } else {
    context.fillStyle = background;
    context.fillRect(x, y, size, size);
    context.fillStyle = ink;
    context.font = `700 ${Math.round(size * 0.42)}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(initials(person.name), x + size / 2, y + size / 2 + 1);
  }
  context.restore();
}

/** Draws the text into a small picture, with the browser's own font, so nothing loads from another site. */
function drawLabel(text: string, background: string, badge: Badge | null) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  const font = `600 ${FONT_PX}px system-ui, sans-serif`;
  const height = FONT_PX + PAD_PX * 2;
  const badgeSize = height - BADGE_MARGIN_PX * 2;
  const textLeft = badge ? BADGE_MARGIN_PX + badgeSize + BADGE_GAP_PX : PAD_PX;
  context.font = font;
  canvas.width = Math.ceil(context.measureText(text).width) + textLeft + PAD_PX;
  canvas.height = height;

  context.fillStyle = background;
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, 12);
  context.fill();
  if (badge) drawBadge(context, badge, BADGE_MARGIN_PX, BADGE_MARGIN_PX, badgeSize);
  context.font = font;
  context.fillStyle = "#ffffff";
  context.textBaseline = "middle";
  context.fillText(text, textLeft, canvas.height / 2 + 1);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return { texture, width: (HEIGHT * canvas.width) / canvas.height };
}

const BACKGROUNDS = {
  plain: "#18181bd9",
  /** The person's own office. */
  own: "#047857",
  /** Someone working right now. */
  working: "#b45309",
  /** Someone checked in whose tab has gone quiet. */
  away: "#52525bd9",
};

/**
 * A floating sign that always faces the camera and is drawn on top, so walls never hide it.
 * A sign that names a person shows their initials straight away, and their picture once it loads.
 */
export function Label({
  text,
  position,
  tone = "plain",
  person,
}: {
  text: string;
  position: [number, number, number];
  tone?: keyof typeof BACKGROUNDS;
  person?: SignPerson;
}) {
  const picture = usePicture(person?.pictureId ?? null);
  const label = useMemo(
    () => drawLabel(text, BACKGROUNDS[tone], person ? { person, picture } : null),
    // The person's parts are listed one by one, so a new object with the same values keeps the sign.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, tone, person?.id, person?.name, person?.pictureId, picture],
  );
  useEffect(() => () => label.texture.dispose(), [label]);

  return (
    <sprite position={position} scale={[label.width, HEIGHT, 1]} renderOrder={10}>
      {/* Signs stay crisp at any distance: the fog never fades them. */}
      <spriteMaterial map={label.texture} transparent depthTest={false} fog={false} />
    </sprite>
  );
}
