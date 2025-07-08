
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function Logo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-16 text-primary"
    >
      <path d="M12 22v-5" />
      <path d="M20 22v-5" />
      <path d="M4 22v-5" />
      <path d="M15.13 2.69a2 2 0 0 0-2.26 0l-4 2.05a2 2 0 0 0-1.13 1.76V17a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6.5a2 2 0 0 0-1.13-1.76l-4-2.05Z" />
      <path d="M8 19h8" />
    </svg>
  );
}


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
              <Logo />
            </div>
            <CardTitle>Welcome to Mokawalat ERP</CardTitle>
            <CardDescription>
              Your comprehensive solution for construction management.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button asChild>
              <Link href="/login">Login to Your Account</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
