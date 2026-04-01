import { useMemo } from "react";
import type { ChangeEvent, DragEvent, Dispatch, RefObject, SetStateAction } from "react";
import { X, UploadCloud, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductLinkCombobox } from "./ProductLinkCombobox";

export type PaymentMethodOption = { key: string; label: string; category: string };

export type ImportedDraftItem = {
  productId: number | null;
  productName: string;
  medida: string | null;
  quantidade: number;
  valorUnitario: number | null;
  valorTotal: number | null;
  confidence: number;
  sourceLine: string;
};

export type ImportedDraft = {
  fileName: string;
  filePath: string;
  fileHash: string;
  documentNumber: string | null;
  parsedAt: string;
  cliente: string | null;
  telefoneCliente: string | null;
  vendedor: string | null;
  dataVenda: string | null;
  formaPagamento: string | null;
  formasPagamentoExtraidas: Array<{
    descricao: string;
    categoria: "instantaneo" | "entrega" | "cartao" | "boleto" | "dinheiro" | "transferencia" | "outros";
    vencimento: string | null;
    valor: number | null;
    documento: string | null;
  }>;
  endereco: string | null;
  total: number | null;
  desconto: number | null;
  subtotal: number | null;
  itens: ImportedDraftItem[];
  warnings: string[];
};

export type DraftReviewState = {
  includeByIndex: Record<number, boolean>;
  quantityByIndex: Record<number, number>;
  manualProductByIndex: Record<number, number | null>;
  clienteOverride: string;
  vendedorKey: string;
  pagamentoKeys: string[];
};

export type MappingProduct = { id: number; name: string; medida: string; marca: string | null; quantidade: number };

type SalesImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Upload
  isDragOver: boolean;
  setIsDragOver: Dispatch<SetStateAction<boolean>>;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFilesSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  manualFileInputRef: RefObject<HTMLInputElement | null>;
  isProcessing: boolean;
  // Draft data
  importedDrafts: ImportedDraft[];
  setImportedDrafts: Dispatch<SetStateAction<ImportedDraft[]>>;
  pendingImportCount: number;
  processedImports: Record<string, boolean>;
  setProcessedImports: Dispatch<SetStateAction<Record<string, boolean>>>;
  setDraftReviewMap: Dispatch<SetStateAction<Record<string, DraftReviewState>>>;
  // Draft operations
  getDraftKey: (draft: ImportedDraft) => string;
  getDraftState: (draft: ImportedDraft) => DraftReviewState;
  getMissingMappingsCount: (draft: ImportedDraft) => number;
  getApprovedItems: (draft: ImportedDraft) => { productId: number; quantidade: number }[];
  updateDraftState: (draft: ImportedDraft, updater: (current: DraftReviewState) => DraftReviewState) => void;
  registerDraftNow: (draft: ImportedDraft) => Promise<void>;
  isRegistering: boolean;
  // Catalog
  sellers: string[];
  paymentMethods: PaymentMethodOption[];
  mappingProducts: MappingProduct[];
};

export function SalesImportDialog({
  open,
  onOpenChange,
  isDragOver,
  setIsDragOver,
  onDrop,
  onFilesSelected,
  manualFileInputRef,
  isProcessing,
  importedDrafts,
  setImportedDrafts,
  pendingImportCount,
  processedImports,
  setProcessedImports,
  setDraftReviewMap,
  getDraftKey,
  getDraftState,
  getMissingMappingsCount,
  getApprovedItems,
  updateDraftState,
  registerDraftNow,
  isRegistering,
  sellers,
  paymentMethods,
  mappingProducts,
}: SalesImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,860px)] max-w-none max-h-[90vh] overflow-hidden p-0">
        <div className="max-h-[90vh] overflow-y-auto p-5">
          <DialogHeader className="mb-4">
            <DialogTitle>Importar venda por PDF</DialogTitle>
            <DialogDescription>
              Suba o PDF, vincule os itens ao seu estoque e lance a venda.
            </DialogDescription>
          </DialogHeader>

          {/* Upload zone */}
          <div
            className={`rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
              isDragOver ? "border-primary bg-primary/5" : "border-border bg-muted/10"
            }`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
            onDrop={(e) => void onDrop(e)}
            onClick={() => manualFileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <UploadCloud className="h-8 w-8" />
              <span className="font-medium">
                {isProcessing ? "Processando..." : "Clique ou arraste PDF(s) aqui"}
              </span>
              <span className="text-xs">Suporta múltiplos arquivos</span>
            </div>
          </div>
          <input
            ref={manualFileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={onFilesSelected}
          />

          {/* Draft list */}
          {importedDrafts.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {importedDrafts.length} arquivo(s) • {pendingImportCount} pendente(s)
                </p>
                {importedDrafts.every((d) => processedImports[getDraftKey(d)]) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setImportedDrafts([]);
                      setProcessedImports({});
                      setDraftReviewMap({});
                    }}
                  >
                    Limpar tudo
                  </Button>
                )}
              </div>

              {importedDrafts.map((draft) => {
                const key = getDraftKey(draft);
                const state = getDraftState(draft);
                const done = processedImports[key];
                const missing = getMissingMappingsCount(draft);
                const approvedItems = getApprovedItems(draft);

                // Detect duplicate product IDs across included items
                const linkedIds = draft.itens
                  .map((item, idx) => {
                    if (state.includeByIndex[idx] === false) return null;
                    return state.manualProductByIndex[idx] ?? item.productId ?? null;
                  })
                  .filter((id): id is number => id != null);
                const uniqueLinkedIds = new Set(linkedIds);
                const hasDuplicateProducts = uniqueLinkedIds.size < linkedIds.length;

                const canLaunch =
                  !done &&
                  state.clienteOverride.trim() &&
                  state.vendedorKey &&
                  state.pagamentoKeys.filter((k) => k.trim()).length > 0 &&
                  missing === 0 &&
                  approvedItems.length > 0 &&
                  !hasDuplicateProducts;

                return (
                  <div
                    key={key}
                    className={`rounded-lg border p-4 space-y-3 ${
                      done ? "bg-emerald-50 border-emerald-200" : "bg-background"
                    }`}
                  >
                    {/* Draft header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{draft.fileName}</p>
                        {draft.dataVenda && (
                          <p className="text-xs text-muted-foreground">
                            Data PDF: {new Date(draft.dataVenda).toLocaleDateString("pt-BR")}
                            {draft.total != null && ` • Total: R$ ${draft.total.toFixed(2)}`}
                          </p>
                        )}
                      </div>
                      {done ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 shrink-0">
                          Lançado
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => {
                            setImportedDrafts((prev) => prev.filter((d) => getDraftKey(d) !== key));
                            setDraftReviewMap((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Editable fields */}
                    {!done && (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Cliente</Label>
                            <Input
                              className="h-8 text-xs"
                              placeholder="Nome do cliente"
                              value={state.clienteOverride}
                              onChange={(e) =>
                                updateDraftState(draft, (s) => ({
                                  ...s,
                                  clienteOverride: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Vendedor</Label>
                            <Select
                              value={state.vendedorKey || "__none"}
                              onValueChange={(v) =>
                                updateDraftState(draft, (s) => ({
                                  ...s,
                                  vendedorKey: v === "__none" ? "" : v,
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none">— Selecionar —</SelectItem>
                                {sellers.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Formas de Pagamento (até 3)</Label>
                          <div className="space-y-1">
                            {(state.pagamentoKeys.length === 0 ? [""] : state.pagamentoKeys).map((pKey, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-1">
                                <Select
                                  value={pKey || "__none"}
                                  onValueChange={(v) =>
                                    updateDraftState(draft, (s) => {
                                      const next = [...s.pagamentoKeys];
                                      if (v === "__none") {
                                        next.splice(pIdx, 1);
                                      } else if (pIdx < next.length) {
                                        next[pIdx] = v;
                                      } else {
                                        next.push(v);
                                      }
                                      return { ...s, pagamentoKeys: next };
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs flex-1">
                                    <SelectValue placeholder="Selecionar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none">— Selecionar —</SelectItem>
                                    {paymentMethods.map((m) => (
                                      <SelectItem key={m.key} value={m.key}>
                                        {m.label} — {m.category}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {state.pagamentoKeys.length > 0 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() =>
                                      updateDraftState(draft, (s) => ({
                                        ...s,
                                        pagamentoKeys: s.pagamentoKeys.filter((_, i) => i !== pIdx),
                                      }))
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            {state.pagamentoKeys.length < 3 && state.pagamentoKeys.length > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-7"
                                onClick={() =>
                                  updateDraftState(draft, (s) => ({
                                    ...s,
                                    pagamentoKeys: [...s.pagamentoKeys, ""],
                                  }))
                                }
                              >
                                + Adicionar forma ({state.pagamentoKeys.length}/3)
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    {draft.itens.length > 0 && !done && (
                      <DraftItemsGrid
                        draft={draft}
                        draftKey={key}
                        state={state}
                        mappingProducts={mappingProducts}
                        updateDraftState={updateDraftState}
                      />
                    )}

                    {/* Warnings */}
                    {draft.warnings.length > 0 && !done && (
                      <p className="text-xs text-amber-700">{draft.warnings[0]}</p>
                    )}

                    {/* Footer */}
                    {!done && (
                      <div className="space-y-1.5 pt-1">
                        {hasDuplicateProducts && (
                          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>Produtos duplicados — cada item deve vincular a um produto diferente.</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            {approvedItems.length} de {draft.itens.length} item(ns) vinculado(s)
                            {missing > 0 && (
                              <span className="text-amber-700 font-medium"> • {missing} pendente(s)</span>
                            )}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!canLaunch || isRegistering}
                            onClick={() => void registerDraftNow(draft)}
                          >
                            {isRegistering ? "Lançando..." : "Lançar venda"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {done && (
                      <p className="text-xs text-emerald-700 font-medium">Venda registrada com sucesso.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Extracted items grid with searchable combobox + duplicate detection       */
/* ────────────────────────────────────────────────────────────────────────── */

function DraftItemsGrid({
  draft,
  draftKey,
  state,
  mappingProducts,
  updateDraftState,
}: {
  draft: ImportedDraft;
  draftKey: string;
  state: DraftReviewState;
  mappingProducts: MappingProduct[];
  updateDraftState: SalesImportDialogProps["updateDraftState"];
}) {
  // Collect product IDs currently used in OTHER rows so the combobox can flag them
  const usedProductIdsByRow = useMemo(() => {
    const map = new Map<number, Set<number>>();
    const allMapped: { index: number; productId: number }[] = [];

    draft.itens.forEach((item, index) => {
      if (state.includeByIndex[index] === false) return;
      const pid = state.manualProductByIndex[index] ?? item.productId ?? null;
      if (pid != null) allMapped.push({ index, productId: pid });
    });

    // For each row, build a set of product IDs used by OTHER rows
    draft.itens.forEach((_, rowIndex) => {
      const others = new Set<number>();
      for (const entry of allMapped) {
        if (entry.index !== rowIndex) others.add(entry.productId);
      }
      map.set(rowIndex, others);
    });

    return map;
  }, [draft.itens, state.includeByIndex, state.manualProductByIndex]);

  return (
    <div className="rounded border bg-muted/30 overflow-hidden">
      <div className="grid grid-cols-[auto,1fr,minmax(200px,260px),60px] gap-2 px-2 py-1 text-[11px] font-medium text-muted-foreground border-b">
        <span />
        <span>Item do PDF</span>
        <span>Produto no estoque</span>
        <span className="text-center">Qtd</span>
      </div>
      <div className="divide-y max-h-64 overflow-auto">
        {draft.itens.map((item, index) => {
          const included = state.includeByIndex[index] !== false;
          const qty = state.quantityByIndex[index] ?? item.quantidade;
          const mappedId = state.manualProductByIndex[index] ?? item.productId ?? null;
          const isUnlinked = mappedId == null && included;

          return (
            <div
              key={`${draftKey}-${index}`}
              className={`grid grid-cols-[auto,1fr,minmax(200px,260px),60px] gap-2 px-2 py-1.5 items-center text-xs ${
                isUnlinked ? "bg-amber-50" : ""
              }`}
            >
              <Checkbox
                checked={included}
                onCheckedChange={(checked) =>
                  updateDraftState(draft, (s) => ({
                    ...s,
                    includeByIndex: { ...s.includeByIndex, [index]: Boolean(checked) },
                  }))
                }
              />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {item.productName}
                  {item.medida ? ` (${item.medida})` : ""}
                </p>
                {isUnlinked && (
                  <p className="text-[10px] text-amber-700">
                    Sem vínculo — busque o produto ao lado
                  </p>
                )}
              </div>
              <ProductLinkCombobox
                products={mappingProducts}
                value={mappedId}
                onChange={(newId) =>
                  updateDraftState(draft, (s) => ({
                    ...s,
                    manualProductByIndex: {
                      ...s.manualProductByIndex,
                      [index]: newId,
                    },
                    includeByIndex: {
                      ...s.includeByIndex,
                      [index]: newId != null,
                    },
                  }))
                }
                usedProductIds={usedProductIdsByRow.get(index)}
                disabled={!included}
              />
              <Input
                type="number"
                min={1}
                value={qty}
                className="h-7 text-center text-xs"
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  updateDraftState(draft, (s) => ({
                    ...s,
                    quantityByIndex: {
                      ...s.quantityByIndex,
                      [index]: Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
                    },
                  }));
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
