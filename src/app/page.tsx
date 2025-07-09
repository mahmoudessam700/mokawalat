
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import Link from 'next/link';
import Image from 'next/image';

export default function WelcomePage() {
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
        <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <Logo className="size-16 text-primary" />
            </div>
            <CardTitle className="font-headline text-3xl font-bold">
              Welcome to Mokawalat ERP
            </CardTitle>
            <CardDescription>
              Your comprehensive solution for construction management.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button asChild size="lg">
              <Link href="/login">Login to Your Account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
