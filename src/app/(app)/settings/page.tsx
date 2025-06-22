'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Palette } from 'lucide-react';
import Link from 'next/link';

const settingsLinks = [
  {
    href: '/settings/users',
    title: 'User Management',
    description: 'Manage user accounts and roles.',
    icon: <Users className="size-8" />,
  },
  {
    href: '#',
    title: 'Theme & Appearance',
    description: 'Customize the look and feel of the application.',
    icon: <Palette className="size-8" />,
    disabled: true,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and application settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.disabled ? '#' : link.href}
            className={link.disabled ? 'pointer-events-none' : ''}
          >
            <Card className={`h-full transition-shadow hover:shadow-md ${link.disabled ? 'opacity-50' : ''}`}>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {link.icon}
                </div>
                <div>
                  <CardTitle>{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
