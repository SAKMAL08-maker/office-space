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

/** A floating sign that always faces the camera and is drawn on top, so walls never hide it. */
export function Label({
  text,
  position,
  strong = false,
}: {
  text: string;
  position: [number, number, number];
  strong?: boolean;
}) {
  const label = useMemo(() => drawLabel(text, strong ? "#047857" : "#18181bd9"), [text, strong]);
  useEffect(() => () => label.texture.dispose(), [label]);

  return (
    <sprite position={position} scale={[label.width, HEIGHT, 1]} renderOrder={10}>
      <spriteMaterial map={label.texture} transparent depthTest={false} />
    </sprite>
  );
}
