
'use client';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Truck,
  Warehouse,
  ShoppingCart,
  Contact,
  DollarSign,
  BarChart3,
  CheckSquare,
  Settings,
  LogOut,
  ClipboardList,
  History,
  Wrench,
  ClipboardCheck,
  Receipt,
  User as UserIcon,
  UsersRound,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from './ui/separator';
import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from './ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { useLanguage } from '@/hooks/use-language';


export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const { t } = useLanguage();

  const menuGroups = React.useMemo(() => [
    {
      items: [
        { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { href: '/approvals', label: t('approvals.page_title'), icon: ClipboardCheck },
        { href: '/activity-log', label: t('activity_log'), icon: History },
      ],
    },
    {
      items: [
        { href: '/projects', label: t('projects.page_title'), icon: Briefcase },
        { href: '/assets', label: t('assets.page_title'), icon: Wrench },
        { href: '/inventory', label: t('inventory.page_title'), icon: Warehouse },
        { href: '/procurement', label: t('procurement.page_title'), icon: ShoppingCart },
        { href: '/material-requests', label: t('material_requests.page_title'), icon: ClipboardList },
      ],
    },
    {
      items: [
        { href: '/clients', label: t('clients.page_title'), icon: Contact },
        { href: '/suppliers', label: t('suppliers.page_title'), icon: Truck },
        { href: '/hr', label: t('human_capital_management.page_title'), icon: UsersRound },
      ],
    },
    {
      items: [
        { href: '/financials', label: t('financials.page_title'), icon: DollarSign },
        { href: '/invoices', label: t('invoices.page_title'), icon: Receipt },
        { href: '/reports', label: t('reports'), icon: BarChart3 },
      ],
    },
     {
      items: [
        { href: '/iso-compliance', label: t('iso_compliance_title'), icon: CheckSquare },
        { href: '/roadmap', label: t('roadmap_title'), icon: CheckSquare },
      ],
    },
  ], [t]);

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };
  
  const handleLogout = () => {
    setIsLoggingOut(true);
    // Navigate away first. This will start the process of unmounting
    // all the components that have active database listeners.
    router.push('/login');

    // We defer the actual sign-out call. A longer delay makes it more robust,
    // ensuring Next.js has time to unmount components and their listeners.
    setTimeout(async () => {
      try {
        await signOut(auth);
        toast({
          title: t('success'),
          description: t('logout_confirm_desc'),
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: 'An error occurred while signing out.',
        });
      } finally {
        // This state change is for completeness, in case the component
        // somehow doesn't unmount immediately.
        setIsLoggingOut(false);
      }
    }, 1500);
  };

  return (
    <AlertDialog>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="font-headline text-xl font-semibold">Mokawalat</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <SidebarMenu className="flex-1 p-2">
           {menuGroups.map((group, index) => (
            <React.Fragment key={index}>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {index < menuGroups.length -1 && <Separator className="my-1" />}
            </React.Fragment>
          ))}
            {profile?.role === 'admin' && (
              <>
                <Separator className="my-1" />
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip={t('settings')}>
                        <Link href="/settings">
                            <Settings />
                            <span>{t('settings')}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className='mt-auto'>
         <Separator className="my-2" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full h-auto p-2 justify-start text-left">
                    <div className="flex items-center gap-3 w-full">
                        {isAuthLoading ? (
                        <>
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex flex-col gap-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </>
                        ) : user ? (
                        <>
                            <Avatar>
                                <AvatarImage src={profile?.photoUrl || `https://placehold.co/40x40.png`} alt={profile?.email || user?.email || ''} data-ai-hint="profile picture" />
                                <AvatarFallback>{(profile?.email || user?.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col overflow-hidden text-start">
                                <span className="text-sm font-semibold truncate">{profile?.email || user?.email}</span>
                                <span className="text-xs text-muted-foreground capitalize">{t(`roles.${profile?.role || 'user'}`)}</span>
                            </div>
                        </>
                        ) : (
                        <div className="flex flex-col text-start">
                            <span className="text-sm font-semibold">Not logged in</span>
                        </div>
                        )}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end">
                <DropdownMenuLabel>{t('account_menu_title')}</DropdownMenuLabel>
                <DropdownMenuItem disabled>{profile?.email || user?.email}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/profile">
                        <UserIcon className="mr-2" />
                        <span>{t('profile')}</span>
                    </Link>
                </DropdownMenuItem>
                {profile?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                        <Link href="/settings">
                            <Settings className="mr-2" />
                            <span>{t('settings')}</span>
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                        <LogOut className="mr-2" />
                        <span>{t('logout')}</span>
                    </DropdownMenuItem>
                </AlertDialogTrigger>
            </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <AlertDialogContent>
          <AlertDialogHeader>
          <AlertDialogTitle>{t('logout_confirm_title')}</AlertDialogTitle>
          <AlertDialogDescription>
              {t('logout_confirm_desc')}
          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} disabled={isLoggingOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isLoggingOut ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('logging_out')}</> : t('logout')}
          </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
