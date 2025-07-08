
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLanguage();

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Passwords do not match.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(firestore, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'user', // Default role
      });

      toast({
        title: t('success'),
        description: 'Account created successfully. Logging you in...',
      });
      router.push('/dashboard');
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak. It must be at least 6 characters long.';
      } else {
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: t('error'),
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm bg-background/80 backdrop-blur-sm">
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <Logo className="size-12 text-primary" />
        </div>
        <CardTitle className="font-headline text-2xl font-bold">
          {t('signup.title')}
        </CardTitle>
        <CardDescription>
          {t('signup.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">{t('signup.confirm_password')}</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('signup.button')}
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm">
          {t('signup.already_have_account')}{' '}
          <Link href="/login" className="underline">
            {t('login_button')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
