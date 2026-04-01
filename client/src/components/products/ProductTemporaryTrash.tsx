import { Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "./types";

type ProductTemporaryTrashProps = {
  canManageProducts: boolean;
  isActionMode: boolean;
  pendingDeletionCount: number;
  lastDeleteSummary: { successCount: number; failCount: number } | null;
  pendingDeletionItems: Product[];
  restorePendingDeletion: (id: number) => void;
  undoPendingDeletions: () => void;
  openDeleteConfirm: () => void;
};

export function ProductTemporaryTrash({
  canManageProducts,
  isActionMode,
  pendingDeletionCount,
  lastDeleteSummary,
  pendingDeletionItems,
  restorePendingDeletion,
  undoPendingDeletions,
  openDeleteConfirm,
}: ProductTemporaryTrashProps) {
  if (!canManageProducts || !isActionMode || pendingDeletionCount === 0) {
    return null;
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Lixeira Temporária
          {lastDeleteSummary && (
            <>
              <Badge variant="secondary">{lastDeleteSummary.successCount} excluído(s)</Badge>
              {lastDeleteSummary.failCount > 0 && (
                <Badge variant="destructive">{lastDeleteSummary.failCount} bloqueado(s)</Badge>
              )}
            </>
          )}
        </CardTitle>
        <CardDescription>
          Itens marcados para exclusão. Você pode restaurar antes da confirmação final.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-56 space-y-2 overflow-auto rounded-md border bg-background/80 p-2">
          {pendingDeletionItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.marca ? `${item.marca} - ` : ""}
                  {item.medida} - {item.categoria}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => restorePendingDeletion(item.id)}>
                Restaurar
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={undoPendingDeletions}>
            <Undo2 className="h-4 w-4 mr-2" />
            Restaurar todos
          </Button>
          <Button variant="destructive" onClick={openDeleteConfirm}>
            <Trash2 className="h-4 w-4 mr-2" />
            Confirmar exclusão definitiva
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}