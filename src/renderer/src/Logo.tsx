type Props = {
  size?: number;
  variant?: 'icon' | 'mark';
  className?: string;
};

/**
 * Skills Installer brand mark.
 *
 * variant="icon" → rounded dark tile + S monogram + ambient glow (use as app icon)
 * variant="mark" → S monogram only on transparent bg (use inline with text)
 */
export function Logo({ size = 32, variant = 'mark', className }: Props) {
  if (variant === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Skills Installer"
        className={className}
      >
        <rect width="256" height="256" rx="56" fill="#0a0b0e" />
        <circle cx="32" cy="32" r="140" fill="#7aa2ff" fillOpacity="0.06" />
        <path
          d="M 188 76 L 68 76 L 68 128 L 188 128 L 188 180 L 68 180"
          stroke="#7aa2ff"
          strokeWidth="32"
          strokeLinejoin="miter"
          fill="none"
        />
        <circle cx="52" cy="180" r="9" fill="#7ee2a8" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Skills Installer"
      className={className}
    >
      <path
        d="M 188 76 L 68 76 L 68 128 L 188 128 L 188 180 L 68 180"
        stroke="currentColor"
        strokeWidth="32"
        strokeLinejoin="miter"
        fill="none"
      />
      <circle cx="52" cy="180" r="9" fill="#7ee2a8" />
    </svg>
  );
}
