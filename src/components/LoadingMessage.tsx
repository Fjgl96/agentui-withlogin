// src/components/LoadingMessage.tsx
import { Skeleton } from '@/components/ui/Skeleton';

export function LoadingMessage() {
  return (
    <div className="mr-auto bg-white shadow-sm border p-4 rounded-lg max-w-[80%]">
      <div className="space-y-3">
        {/* Simula 4 líneas de texto de diferentes largos */}
        <Skeleton className="w-3/4" variant="text" />
        <Skeleton className="w-full" variant="text" />
        <Skeleton className="w-5/6" variant="text" />
        <Skeleton className="w-2/3" variant="text" />
      </div>
    </div>
  );
}