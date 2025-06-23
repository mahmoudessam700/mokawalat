
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
  Map,
  ClipboardList,
  History,
  Wrench,
  ClipboardCheck,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from './ui/separator';
import { useState } from 'react';
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


const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/assets', label: 'Asset Management', icon: Wrench },
  { href: '/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/procurement', label: 'Purchase Orders', icon: ShoppingCart },
  { href: '/material-requests', label: 'Material Requests', icon: ClipboardList },
  { href: '/clients', label: 'Clients & Sales', icon: Contact },
  { href: '/financials', label: 'Financials', icon: DollarSign },
  { href: '/invoices', label: 'Invoicing', icon: Receipt },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/activity-log', label: 'Activity Log', icon: History },
  { href: '/iso-compliance', label: 'ISO Compliance', icon: CheckSquare },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { profile, isLoading: isAuthLoading } = useAuth();

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'An error occurred while logging out.',
      });
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="font-headline text-xl font-semibold">Mokawalat</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarMenu className="mt-auto">
            {profile?.role === 'admin' && (
              <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip="Settings">
                      <Link href="/settings">
                          <Settings />
                          <span>Settings</span>
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <SidebarMenuButton
                        variant="ghost"
                        className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
                        disabled={isLoggingOut}
                        tooltip="Logout"
                        >
                        <LogOut />
                        <span>Logout</span>
                        </SidebarMenuButton>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will be returned to the login page.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isLoggingOut ? 'Logging out...' : 'Logout'}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className='mt-auto'>
         <Separator className="my-2" />
         <div className="flex items-center gap-3 p-2">
            {isAuthLoading ? (
              <>
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-32" />
                  </div>
              </>
            ) : profile && profile.email ? (
              <>
                  <Avatar>
                      <AvatarImage src={`https://placehold.co/40x40.png`} alt={profile.email} data-ai-hint="profile picture" />
                      <AvatarFallback>{profile.email.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-semibold truncate">{profile.email.split('@')[0]}</span>
                      <span className="text-xs text-muted-foreground truncate">{profile.email}</span>
                  </div>
              </>
            ) : (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Not logged in</span>
              </div>
            )}
         </div>
      </SidebarFooter>
    </>
  );
}
