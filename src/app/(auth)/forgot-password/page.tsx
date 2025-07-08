
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
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { t } = useLanguage();

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Please enter your email address.',
      });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSent(true);
      toast({
        title: t('success'),
        description: t('forgot_password_page.sent_description'),
      });
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        errorMessage = 'No user found with this email address.';
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
        <CardTitle className="font-headline text-2xl font-bold">{t('forgot_password_page.title')}</CardTitle>
        <CardDescription>
          {isSent
            ? t('forgot_password_page.sent_description')
            : t('forgot_password_page.form_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSent ? (
           <Button asChild className="w-full">
              <Link href="/login">{t('forgot_password_page.back_to_login')}</Link>
            </Button>
        ) : (
          <form onSubmit={handleResetPassword}>
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('forgot_password_page.send_button')}
              </Button>
            </div>
          </form>
        )}
        <div className="mt-4 text-center text-sm">
          {t('forgot_password_page.remembered_password')}{' '}
          <Link href="/login" className="underline">
            {t('login_button')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
