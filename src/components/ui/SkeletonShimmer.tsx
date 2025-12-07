// src/components/ui/SkeletonShimmer.tsx
export function SkeletonShimmer({ className = "" }: { className?: string }) {
  return (
    <div 
      className={`relative overflow-hidden bg-gray-200 ${className}`}
    >
      {/* Capa animada que se mueve */}
      <div 
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />
    </div>
  );
}