'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordReset } from './actions';
import { Loader2, KeyRound } from 'lucide-react';
import { useState } from 'react';

const roleVariant: { [key: string]: 'default' | 'secondary' } = {
  admin: 'default',
  user: 'secondary',
};

export default function ProfilePage() {
  const { profile, isLoading } = useAuth();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  async function handlePasswordReset() {
    if (!profile?.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find user email.' });
      return;
    }
    setIsResetting(true);
    const result = await sendPasswordReset(profile.email);
    setIsResetting(false);
    
    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }

  if (isLoading || !profile) {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <Skeleton className="h-9 w-48" />
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-6">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
       <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal account settings.
        </p>
      </div>
      <Card>
        <CardHeader>
            <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={`https://placehold.co/100x100.png`} data-ai-hint="profile picture" />
                    <AvatarFallback>{profile.email.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-2xl">{profile.email}</CardTitle>
                    <CardDescription className="mt-2">
                        Your role is: <Badge variant={roleVariant[profile.role]}>{profile.role}</Badge>
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Security</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium">Password</h3>
                        <p className="text-sm text-muted-foreground">Click the button to send a password reset link to your email.</p>
                    </div>
                    <Button onClick={handlePasswordReset} disabled={isResetting} variant="outline">
                        {isResetting ? <Loader2 className="mr-2 animate-spin" /> : <KeyRound className="mr-2" />}
                        Reset Password
                    </Button>
                </CardContent>
            </Card>
        </CardContent>
      </Card>
    </div>
  );
}
