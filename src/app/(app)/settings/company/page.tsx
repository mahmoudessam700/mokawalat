
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Building, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getCompanyProfile, updateCompanyProfile, type CompanyProfileFormValues } from './actions';
import { z } from 'zod';
import { useLanguage } from '@/hooks/use-language';

const companyProfileSchema = z.object({
  name: z.string().min(2, "Company name is required."),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  logoUrl: z.string().url().optional(),
  logoPath: z.string().optional(),
});


export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfileFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      email: '',
      logoUrl: '',
    },
  });

  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true);
      const data = await getCompanyProfile();
      if (data) {
        setProfile(data);
        form.reset(data);
      }
      setIsLoading(false);
    }
    fetchProfile();
  }, [form]);

  async function onSubmit(values: CompanyProfileFormValues) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key !== 'logo' && value) {
        formData.append(key, value as string);
      }
    });
    
    const logoInput = document.querySelector('input[type="file"][name="logo"]') as HTMLInputElement;
    if (logoInput && logoInput.files && logoInput.files[0]) {
      formData.append('logo', logoInput.files[0]);
    }
    
    const result = await updateCompanyProfile(formData);
    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      const data = await getCompanyProfile();
      if (data) {
          setProfile(data);
          form.reset(data);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-80 mt-2" />
          </div>
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
              <Link href="/settings">
                <ArrowLeft />
                <span className="sr-only">{t('back_to_settings')}</span>
              </Link>
            </Button>
            <div>
              <h1 className="font-headline text-3xl font-bold tracking-tight">{t('company_profile_title')}</h1>
              <p className="text-muted-foreground">{t('company_profile_desc')}</p>
            </div>
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <><Loader2 className="mr-2" />{t('saving')}</> : t('save_changes')}
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('company_details_title')}</CardTitle>
            <CardDescription>{t('company_details_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('company_name')}</FormLabel><FormControl><Input placeholder={t('company_name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>{t('address')}</FormLabel><FormControl><Textarea placeholder={t('address_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>{t('phone')}</FormLabel><FormControl><Input placeholder={t('phone_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>{t('email')}</FormLabel><FormControl><Input type="email" placeholder={t('email_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </div>
                <div className="space-y-2">
                    <FormLabel>{t('company_logo')}</FormLabel>
                    <Card className="flex items-center justify-center p-4 aspect-square">
                        {profile?.logoUrl ? (
                            <Image src={profile.logoUrl} alt="Company Logo" width={150} height={150} className="object-contain" />
                        ) : (
                            <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
                                <Building className="size-12"/>
                                <span>{t('no_logo_uploaded')}</span>
                            </div>
                        )}
                    </Card>
                    <Input type="file" name="logo" accept="image/png, image/jpeg, image/gif" />
                </div>
             </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
