import { avatarColors, initials, pictureUrl } from "./avatar-style";

const SIZES = {
  sm: "size-6 text-[0.625rem]",
  md: "size-8 text-xs",
  lg: "size-24 text-3xl",
};

/**
 * A person's round picture, or their initials on their own colour when they have none.
 * The name sits next to it on the page, so the picture itself is left out of what screen readers say.
 */
export function Avatar({
  userId,
  name,
  pictureId,
  size = "sm",
}: {
  userId: string;
  name: string;
  pictureId: string | null;
  size?: keyof typeof SIZES;
}) {
  const shape = `${SIZES[size]} shrink-0 rounded-full`;
  if (pictureId) {
    return (
      // Next's image optimiser would fetch the picture without the viewer's login, so a plain img.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pictureUrl(pictureId)}
        alt=""
        className={`${shape} bg-zinc-200 object-cover dark:bg-zinc-800`}
      />
    );
  }
  const { background, ink } = avatarColors(userId);
  return (
    <span
      aria-hidden
      className={`${shape} inline-flex items-center justify-center font-semibold select-none`}
      style={{ backgroundColor: background, color: ink }}
    >
      {initials(name)}
    </span>
  );
}
