import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { MappingProduct } from "./SalesImportDialog";

type Props = {
  products: MappingProduct[];
  value: number | null;
  onChange: (productId: number | null) => void;
  /** IDs already linked in other rows of the same draft */
  usedProductIds?: Set<number>;
  disabled?: boolean;
};

export function ProductLinkCombobox({
  products,
  value,
  onChange,
  usedProductIds,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedProduct = useMemo(
    () => (value ? products.find((p) => p.id === value) : null),
    [products, value],
  );

  const isDuplicate = value != null && usedProductIds?.has(value);

  // Filter products based on search (name, medida or marca)
  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 80);
    const terms = search
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    return products
      .filter((p) => {
        const hay = `${p.name} ${p.medida} ${p.marca ?? ""}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return terms.every((t) => hay.includes(t));
      })
      .slice(0, 80);
  }, [products, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-7 w-full justify-between text-xs font-normal px-2",
            !value && "text-muted-foreground",
            isDuplicate && "border-red-400 bg-red-50",
          )}
        >
          <span className="truncate flex-1 text-left">
            {selectedProduct
              ? `${selectedProduct.name} (${selectedProduct.medida})${selectedProduct.marca ? ` — ${selectedProduct.marca}` : ""}`
              : "Buscar produto..."}
          </span>
          {isDuplicate ? (
            <AlertTriangle className="ml-1 h-3 w-3 shrink-0 text-red-500" />
          ) : (
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite para buscar..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {/* Unlink option */}
              <CommandItem
                value="__none"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-3 w-3",
                    value == null ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="text-muted-foreground">Sem vínculo</span>
              </CommandItem>
              {filtered.map((p) => {
                const isUsed = usedProductIds?.has(p.id) && p.id !== value;
                const outOfStock = p.quantidade <= 0;
                return (
                  <CommandItem
                    key={p.id}
                    value={String(p.id)}
                    onSelect={() => {
                      onChange(p.id === value ? null : p.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(isUsed && "opacity-50")}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3 shrink-0",
                        p.id === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block text-xs">
                        {p.name} ({p.medida})
                      </span>
                      {p.marca && (
                        <span className="text-[10px] text-muted-foreground">{p.marca}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-1 shrink-0">
                      <Badge
                        variant={outOfStock ? "destructive" : p.quantidade <= 3 ? "outline" : "secondary"}
                        className="text-[9px] px-1 py-0"
                      >
                        {p.quantidade} un.
                      </Badge>
                      {isUsed && (
                        <span className="text-[10px] text-amber-600">
                          já usado
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
