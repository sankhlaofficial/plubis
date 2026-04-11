interface DecorativeShapeProps {
  kind:
    | 'airplane'
    | 'balloon'
    | 'star'
    | 'sparkle'
    | 'cloud'
    | 'book-stack'
    | 'squiggle'
    | 'heart';
  className?: string;
  size?: number;
}

export default function DecorativeShape({
  kind,
  className,
  size = 48,
}: DecorativeShapeProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true' as const,
    className,
  };

  switch (kind) {
    case 'star':
      return (
        <svg {...commonProps}>
          <polygon
            points="24,5 28.5,17.5 42,17.5 31.5,26 35,38.5 24,30 13,38.5 16.5,26 6,17.5 19.5,17.5"
            fill="#FFCC4D"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'sparkle':
      return (
        <svg {...commonProps}>
          <path
            d="M24 4L26.5 21.5L44 24L26.5 26.5L24 44L21.5 26.5L4 24L21.5 21.5L24 4Z"
            fill="#FFCC4D"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'cloud':
      return (
        <svg {...commonProps}>
          <path
            d="M12 32C8 32 5 29 5 25C5 21.5 7.5 18.5 11 18C11.5 13.5 15 10 20 10C23 10 25.5 11.5 27 13.5C28 13 29 12.5 30.5 12.5C34.5 12.5 37.5 15.5 37.5 19.5C37.5 19.7 37.5 19.9 37.5 20C40 20.5 42 22.5 42 25C42 28.3 39.3 31 36 31L12 32Z"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'airplane':
      return (
        <svg {...commonProps}>
          <path
            d="M6 24L42 6L30 42L22 28L6 24Z"
            fill="#FFD9C4"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M22 28L30 18"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'balloon':
      return (
        <svg {...commonProps}>
          <ellipse
            cx="24"
            cy="18"
            rx="12"
            ry="15"
            fill="#FCE4EC"
            stroke="#0F172A"
            strokeWidth="2"
          />
          <path
            d="M24 33C24 33 22 36 24 38C26 40 24 43 24 43"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M20 33L28 33"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'book-stack':
      return (
        <svg {...commonProps}>
          {/* Bottom book */}
          <rect
            x="6"
            y="30"
            width="36"
            height="10"
            rx="2"
            fill="#D4F0E0"
            stroke="#0F172A"
            strokeWidth="2"
          />
          {/* Middle book */}
          <rect
            x="9"
            y="20"
            width="32"
            height="10"
            rx="2"
            fill="#FFCC4D"
            stroke="#0F172A"
            strokeWidth="2"
          />
          {/* Top book */}
          <rect
            x="12"
            y="10"
            width="28"
            height="10"
            rx="2"
            fill="#FFD9C4"
            stroke="#0F172A"
            strokeWidth="2"
          />
        </svg>
      );

    case 'squiggle':
      return (
        <svg {...commonProps}>
          <path
            d="M6 32C10 24 14 16 18 24C22 32 26 16 30 24C34 32 38 20 42 16"
            fill="none"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'heart':
      return (
        <svg {...commonProps}>
          <path
            d="M24 38C24 38 6 28 6 17C6 12.5 9.5 9 14 9C17.5 9 20.5 11 22 13.5C23.5 11 26.5 9 30 9C34.5 9 38 12.5 38 17C38 28 24 38 24 38Z"
            fill="#FCE4EC"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    default:
      return null;
  }
}
