
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Contact,
  File,
  Search,
  Truck,
  Users,
  Warehouse,
  Wrench,
  Receipt,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { globalSearch, type SearchResult } from '@/app/actions';

const typeIcons: Record<SearchResult['type'], React.ReactNode> = {
  Project: <Briefcase className="size-4" />,
  Client: <Contact className="size-4" />,
  Employee: <Users className="size-4" />,
  Supplier: <Truck className="size-4" />,
  'Inventory Item': <Warehouse className="size-4" />,
  Asset: <Wrench className="size-4" />,
  Invoice: <Receipt className="size-4" />,
};

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [data, setData] = React.useState<SearchResult[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }

        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setIsOpen(false);
    command();
  }, []);

  React.useEffect(() => {
    if (!debouncedQuery) {
      setData(null);
      return;
    }

    const fetchData = async () => {
        setIsLoading(true);
        const results = await globalSearch(debouncedQuery);
        setData(results);
        setIsLoading(false);
    }
    
    fetchData();

  }, [debouncedQuery]);

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'relative h-9 w-full justify-start rounded-md bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64'
        )}
        onClick={() => setIsOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput 
            placeholder="Search across the entire ERP..." 
            value={query}
            onValueChange={setQuery}
        />
        <CommandList>
            {isLoading && <CommandEmpty>Searching...</CommandEmpty>}
            {!isLoading && !data?.length && debouncedQuery.length > 1 && <CommandEmpty>No results found.</CommandEmpty>}

            {data && data.length > 0 && (
                <CommandGroup heading="Results">
                    {data.map((item) => (
                        <CommandItem
                            key={item.url}
                            value={`${item.type}-${item.name}`}
                            onSelect={() => {
                                runCommand(() => router.push(item.url));
                            }}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                {typeIcons[item.type] || <File className="mr-2 h-4 w-4" />}
                                <div>
                                    <span>{item.name}</span>
                                    {item.context && <div className="text-xs text-muted-foreground">{item.context}</div>}
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{item.type}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>
            )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
