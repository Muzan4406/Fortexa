import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { FCFA_COUNTRIES, USDT_COUNTRIES, getCurrencyForCountry } from '@/lib/countries';

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const currency = value ? getCurrencyForCountry(value) : null;

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-12 justify-between font-normal text-left"
            data-testid="input-country"
          >
            <span className={cn(!value && 'text-muted-foreground')}>
              {value || 'Sélectionnez votre pays'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          align="start"
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          <Command>
            <CommandInput placeholder="Rechercher un pays..." />
            <CommandList>
              <CommandEmpty>Aucun pays trouvé.</CommandEmpty>

              <CommandGroup heading="🌍 FCFA (XOF) — Togo, Bénin, Burkina Faso, Côte d'Ivoire…">
                {FCFA_COUNTRIES.map((country) => (
                  <CommandItem
                    key={country.name}
                    value={country.name}
                    onSelect={(val) => {
                      onChange(val === value ? '' : val);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === country.name ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {country.name}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="🌍 USDT (BEP20) — Autres pays">
                {USDT_COUNTRIES.map((country) => (
                  <CommandItem
                    key={country.name}
                    value={country.name}
                    onSelect={(val) => {
                      onChange(val === value ? '' : val);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === country.name ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {country.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {currency && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
          <span>Devise utilisée pour vos dépôts et retraits :</span>
          <Badge variant="secondary" className="text-xs font-semibold">
            {currency}
          </Badge>
        </p>
      )}
    </div>
  );
}
