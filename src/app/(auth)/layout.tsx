
import type { ReactNode } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
       <Image
        src="https://placehold.co/1920x1080.png"
        alt="Construction site background"
        data-ai-hint="construction site architecture"
        fill
        className="object-cover object-center opacity-20 dark:opacity-10"
        priority
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
