interface CloudDividerProps {
  topColor?: string;
  bottomColor?: string;
  flip?: boolean;
  className?: string;
}

export default function CloudDivider({
  topColor = '#FFCC4D',
  bottomColor = '#FBF8F1',
  flip,
  className,
}: CloudDividerProps) {
  return (
    <div
      className={className}
      style={flip ? { transform: 'rotate(180deg)' } : undefined}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        width="100%"
        height="80"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background: topColor fills everything */}
        <rect width="1440" height="80" fill={topColor} />
        {/* Wave: bottomColor forms the new floor */}
        <path
          d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1440,0 1440,40 L1440,80 L0,80 Z"
          fill={bottomColor}
        />
      </svg>
    </div>
  );
}
