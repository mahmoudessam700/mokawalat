
import { SidebarTrigger } from '@/components/ui/sidebar';
import { GlobalSearch } from './global-search';
import { ThemeToggle } from './theme-toggle';
import { NotificationsPopover } from './notifications-popover';
import { LanguageSwitcher } from './language-switcher';

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2">
        <NotificationsPopover />
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
