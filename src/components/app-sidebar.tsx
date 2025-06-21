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
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from './ui/separator';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/procurement', label: 'Procurement', icon: ShoppingCart },
  { href: '/clients', label: 'Clients & Sales', icon: Contact },
  { href: '/financials', label: 'Financials', icon: DollarSign },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/iso-compliance', label: 'ISO Compliance', icon: CheckSquare },
];

const bottomMenuItems = [
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/logout', label: 'Logout', icon: LogOut },
]

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="font-headline text-xl font-semibold">Mokawalat</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
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
      </SidebarContent>
      <SidebarFooter className='mt-auto'>
         <Separator className="my-2" />
         <div className="flex items-center gap-3 p-2">
            <Avatar>
                <AvatarImage src="https://placehold.co/40x40" alt="@shadcn" />
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="text-sm font-semibold">John Doe</span>
                <span className="text-xs text-muted-foreground">john.doe@mokawalat.com</span>
            </div>
         </div>
      </SidebarFooter>
    </>
  );
}
