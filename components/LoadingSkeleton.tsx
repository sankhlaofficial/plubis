interface LoadingSkeletonProps {
  variant: 'header' | 'library-grid' | 'job-card' | 'text-line';
  className?: string;
}

export default function LoadingSkeleton({ variant, className }: LoadingSkeletonProps) {
  switch (variant) {
    case 'text-line':
      return <div className={`h-4 w-48 rounded animate-shimmer ${className || ''}`} />;

    case 'header':
      return <div className={`h-16 w-full rounded animate-shimmer ${className || ''}`} />;

    case 'library-grid':
      return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className || ''}`}>
          <div className="h-64 rounded-[28px] animate-shimmer" />
          <div className="h-64 rounded-[28px] animate-shimmer" />
          <div className="h-64 rounded-[28px] animate-shimmer" />
        </div>
      );

    case 'job-card':
      return (
        <div className={`w-full max-w-md h-80 rounded-[28px] animate-shimmer ${className || ''}`} />
      );

    default:
      return null;
  }
}
