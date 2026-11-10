import type { ThreeEvent } from "@react-three/fiber";

/** Shows a hand cursor over things that can be clicked. */
export const clickable = {
  onPointerOver: (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
  },
  onPointerOut: () => {
    document.body.style.cursor = "";
  },
};
