// src/components/SidebarSkeleton.tsx
import { Skeleton } from '@/components/ui/Skeleton';

export function SidebarSkeleton() {
  return (
    <div className="p-4">
      {/* Simula 5 elementos del historial */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="mb-4 pb-3 border-b border-neutral-800">
          {/* Número de consulta */}
          <Skeleton className="h-3 w-12 mb-2 bg-neutral-700" variant="text" />
          
          {/* Texto de la consulta */}
          <Skeleton className="h-4 w-full bg-neutral-700" variant="text" />
        </div>
      ))}
    </div>
  );
}