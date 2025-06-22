import { SidebarTrigger } from '@/components/ui/sidebar';
import { GlobalSearch } from './global-search';
import { ThemeToggle } from './theme-toggle';
import { NotificationsPopover } from './notifications-popover';

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <NotificationsPopover />
        <ThemeToggle />
      </div>
    </header>
  );
}
