import type { CSSProperties } from "react";

export function MIcon({
  name,
  size = 20,
  color,
  outlined = true,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  outlined?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={outlined ? "material-icons-outlined" : "material-icons"}
      style={{ fontSize: size, color, ...style }}
      aria-hidden
    >
      {name}
    </span>
  );
}
