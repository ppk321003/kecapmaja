import React from "react";
import { useKuitansiStore } from "@/contexts/KuitansiStoreContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Store, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const KuitansiStoreSelector: React.FC = () => {
  const { availableStores, activeStoreId, switchStore } = useKuitansiStore();

  const activeStore = availableStores.find((store) => store.id === activeStoreId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Store className="h-4 w-4" />
          {activeStore?.storageName || "Pilih Toko"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Pilih Toko</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableStores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => switchStore(store.id)}
            className={cn(
              "cursor-pointer flex items-center justify-between",
              store.id === activeStoreId && "bg-blue-50"
            )}
          >
            <span>{store.storageName}</span>
            {store.id === activeStoreId && (
              <Check className="h-4 w-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default KuitansiStoreSelector;
