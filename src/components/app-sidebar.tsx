
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
  ListChecks,
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

const menuGroups = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/approvals', label: 'Approvals', icon: ClipboardCheck },
      { href: '/activity-log', label: 'Activity Log', icon: History },
    ],
  },
  {
    items: [
      { href: '/projects', label: 'Projects', icon: Briefcase },
      { href: '/assets', label: 'Asset Management', icon: Wrench },
      { href: '/inventory', label: 'Inventory', icon: Warehouse },
      { href: '/procurement', label: 'Purchase Orders', icon: ShoppingCart },
      { href: '/material-requests', label: 'Material Requests', icon: ClipboardList },
    ],
  },
  {
    items: [
      { href: '/clients', label: 'Clients & Sales', icon: Contact },
      { href: '/suppliers', label: 'Suppliers', icon: Truck },
      { href: '/employees', label: 'Employees', icon: Users },
    ],
  },
  {
    items: [
      { href: '/financials', label: 'Financials', icon: DollarSign },
      { href: '/invoices', label: 'Invoicing', icon: Receipt },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
   {
    items: [
      { href: '/iso-compliance', label: 'ISO Compliance', icon: CheckSquare },
    ],
  },
];


export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, profile, isLoading: isAuthLoading } = useAuth();

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/approvals' || href === '/reports' || href === '/activity-log' || href === '/iso-compliance') {
      return pathname === href;
    }
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
          title: 'Logged Out',
          description: 'You have been successfully logged out.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Logout Failed',
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
      <SidebarContent className="flex flex-col p-2">
        <SidebarMenu className="flex-1">
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
                    <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip="Settings">
                        <Link href="/settings">
                            <Settings />
                            <span>Settings</span>
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
                <Button variant="ghost" className="w-full justify-start h-auto p-2">
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
                                <AvatarImage src={`https://placehold.co/40x40.png`} alt={profile?.email || user.email || ''} data-ai-hint="profile picture" />
                                <AvatarFallback>{(user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col overflow-hidden text-left">
                                <span className="text-sm font-semibold truncate">{profile?.email || user.email}</span>
                                <span className="text-xs text-muted-foreground capitalize">{profile?.role || 'User'}</span>
                            </div>
                        </>
                        ) : (
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">Not logged in</span>
                        </div>
                        )}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end">
                <DropdownMenuLabel>{profile?.email || user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/profile">
                        <UserIcon className="mr-2" />
                        <span>Profile</span>
                    </Link>
                </DropdownMenuItem>
                {profile?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                        <Link href="/settings">
                            <Settings className="mr-2" />
                            <span>Settings</span>
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                        <LogOut className="mr-2" />
                        <span>Logout</span>
                    </DropdownMenuItem>
                </AlertDialogTrigger>
            </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <AlertDialogContent>
          <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
          <AlertDialogDescription>
              You will be returned to the login page.
          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} disabled={isLoggingOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isLoggingOut ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging out...</> : 'Logout'}
          </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
