
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordReset } from './actions';
import { Loader2, KeyRound, User, Palette } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { ThemeToggle } from '@/components/theme-toggle';

const roleVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
  admin: 'default',
  manager: 'destructive',
  user: 'secondary',
};

type EmployeeProfileLink = {
    id: string;
    name: string;
    photoUrl?: string;
};

export default function ProfilePage() {
  const { profile, isLoading } = useAuth();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfileLink | null>(null);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(true);

  useEffect(() => {
    if (profile?.email) {
      const fetchEmployeeProfile = async () => {
        setIsEmployeeLoading(true);
        const q = query(
          collection(firestore, 'employees'),
          where('email', '==', profile.email),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const employeeDoc = querySnapshot.docs[0];
          const employeeData = employeeDoc.data();
          setEmployeeProfile({
            id: employeeDoc.id,
            name: employeeData.name,
            photoUrl: employeeData.photoUrl,
          });
        }
        setIsEmployeeLoading(false);
      };
      fetchEmployeeProfile();
    } else if (!isLoading) {
        setIsEmployeeLoading(false);
    }
  }, [profile, isLoading]);


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

  if (isLoading || isEmployeeLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-9 w-48" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card className="md:col-span-1"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
                <div className="md:col-span-2 space-y-6"><Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card><Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card></div>
            </div>
        </div>
    );
  }

  if (!profile) {
      return (
          <div className="flex flex-col items-center justify-center text-center h-[50vh]">
              <h2 className="text-2xl font-bold">Not Logged In</h2>
              <p className="text-muted-foreground">Please log in to view your profile.</p>
              <Button asChild className="mt-4"><Link href="/login">Login</Link></Button>
          </div>
      );
  }
  
  const displayName = employeeProfile?.name || profile.email;
  const displayAvatar = employeeProfile?.photoUrl || `https://placehold.co/100x100.png`;
  const avatarFallback = (displayName || 'U').split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="space-y-6">
       <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal account settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left Column */}
        <div className="md:col-span-1">
             <Card>
                <CardContent className="p-6 text-center">
                    <Avatar className="h-32 w-32 mx-auto">
                        <AvatarImage src={displayAvatar} data-ai-hint="profile picture" />
                        <AvatarFallback className="text-4xl">{avatarFallback}</AvatarFallback>
                    </Avatar>
                    <h2 className="mt-4 text-2xl font-semibold">{displayName}</h2>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    <Badge variant={roleVariant[profile.role]} className="mt-4 capitalize">{profile.role}</Badge>

                    {employeeProfile && (
                        <Button asChild className="mt-6 w-full">
                            <Link href={`/employees/${employeeProfile.id}`}>
                                <User className="mr-2" /> View Full Employee Profile
                            </Link>
                        </Button>
                    )}
                </CardContent>
             </Card>
        </div>

        {/* Right Column */}
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Account Security</CardTitle>
                    <CardDescription>Manage your password and other security settings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <h3 className="font-medium">Password</h3>
                            <p className="text-sm text-muted-foreground">Click the button to send a password reset link to your email.</p>
                        </div>
                        <Button onClick={handlePasswordReset} disabled={isResetting} variant="outline">
                            {isResetting ? <Loader2 className="mr-2 animate-spin" /> : <KeyRound className="mr-2" />}
                            Reset Password
                        </Button>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>Customize the application's appearance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                        <h3 className="font-medium flex items-center gap-2"><Palette className="size-4"/> Theme Mode</h3>
                        <p className="text-sm text-muted-foreground">Select a light or dark theme for the interface.</p>
                        </div>
                        <ThemeToggle />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
