// src/components/ui/Skeleton.tsx
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ 
  className = "", 
  variant = 'rectangular' 
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-200";
  
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded"
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-label="Cargando contenido"
      role="status"
    />
  );
}