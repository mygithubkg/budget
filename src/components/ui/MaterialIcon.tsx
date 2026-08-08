import React from "react";

interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  fill?: boolean;
  size?: number | string;
  className?: string;
}

/**
 * MaterialIcon renders a Google Material Symbol Outlined icon with optional filled state.
 */
export function MaterialIcon({
  name,
  fill = false,
  size = 24,
  className = "",
  style,
  ...props
}: MaterialIconProps) {
  const sizeStyle: React.CSSProperties = typeof size === "number" ? { fontSize: `${size}px` } : { fontSize: size };
  const fillStyle: React.CSSProperties = fill ? { fontVariationSettings: "'FILL' 1" } : {};

  return (
    <span
      className={`material-symbols-outlined select-none inline-flex items-center justify-center ${fill ? "material-symbols-filled" : ""} ${className}`}
      style={{
        ...sizeStyle,
        ...fillStyle,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}

export default MaterialIcon;
