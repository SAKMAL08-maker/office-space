import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

const HEIGHT = 0.42;
const FONT_PX = 32;
const PAD_PX = 14;

/** Draws the text into a small picture, with the browser's own font, so nothing loads from another site. */
function drawLabel(text: string, background: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  const font = `600 ${FONT_PX}px system-ui, sans-serif`;
  context.font = font;
  canvas.width = Math.ceil(context.measureText(text).width) + PAD_PX * 2;
  canvas.height = FONT_PX + PAD_PX * 2;

  context.fillStyle = background;
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, 12);
  context.fill();
  context.font = font;
  context.fillStyle = "#ffffff";
  context.textBaseline = "middle";
  context.fillText(text, PAD_PX, canvas.height / 2 + 1);

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

/** A floating sign that always faces the camera and is drawn on top, so walls never hide it. */
export function Label({
  text,
  position,
  tone = "plain",
}: {
  text: string;
  position: [number, number, number];
  tone?: keyof typeof BACKGROUNDS;
}) {
  const label = useMemo(() => drawLabel(text, BACKGROUNDS[tone]), [text, tone]);
  useEffect(() => () => label.texture.dispose(), [label]);

  return (
    <sprite position={position} scale={[label.width, HEIGHT, 1]} renderOrder={10}>
      {/* Signs stay crisp at any distance: the fog never fades them. */}
      <spriteMaterial map={label.texture} transparent depthTest={false} fog={false} />
    </sprite>
  );
}
