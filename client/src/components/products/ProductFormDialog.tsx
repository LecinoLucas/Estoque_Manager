import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";

type ProductFormData = {
  name: string;
  marca: string;
  medida: string;
  categoria: string;
  quantidade: number;
  estoqueMinimo: number;
};

type Marca = {
  id: number;
  nome: string;
};

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  formData: ProductFormData;
  setFormData: (value: ProductFormData) => void;
  medidas: string[];
  categorias: string[];
  marcas?: Marca[];
  modelSuggestions?: string[];
  enableModelSelector?: boolean;
  lockCatalogValues?: boolean;
  onRequestCreateModel?: () => void;
  inputIdPrefix: string;
  showAuditJustification?: boolean;
  auditJustification?: string;
  setAuditJustification?: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export default function ProductFormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isSubmitting,
  formData,
  setFormData,
  medidas,
  categorias,
  marcas,
  modelSuggestions = [],
  enableModelSelector = false,
  lockCatalogValues = false,
  onRequestCreateModel,
  inputIdPrefix,
  showAuditJustification = false,
  auditJustification = "",
  setAuditJustification,
  onSubmit,
  onCancel,
}: ProductFormDialogProps) {
  const marcasNomes = useMemo(() => (marcas ?? []).map((marca) => marca.nome), [marcas]);
  const canRenderCatalogSelectors = marcasNomes.length > 0 && medidas.length > 0 && categorias.length > 0;
  const [modelInputMode, setModelInputMode] = useState<"select" | "manual">(
    enableModelSelector && modelSuggestions.length > 0 ? "select" : "manual"
  );

  useEffect(() => {
    if (!enableModelSelector) return;
    if (modelSuggestions.length === 0) {
      setModelInputMode("manual");
      return;
    }
    if (!formData.name) {
      setModelInputMode("select");
      return;
    }
    if (modelSuggestions.includes(formData.name)) {
      setModelInputMode("select");
      return;
    }
    setModelInputMode("manual");
  }, [enableModelSelector, formData.name, modelSuggestions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={`${inputIdPrefix}-name`}>Nome do Produto</Label>
            {enableModelSelector && modelInputMode === "select" && modelSuggestions.length > 0 ? (
              <>
                <Select
                  value={formData.name && modelSuggestions.includes(formData.name) ? formData.name : "__new__"}
                  onValueChange={(value) => {
                    if (value === "__new__") {
                      if (onRequestCreateModel) {
                        onRequestCreateModel();
                      } else {
                        setModelInputMode("manual");
                        setFormData({ ...formData, name: "" });
                      }
                      return;
                    }
                    setFormData({ ...formData, name: value });
                  }}
                >
                  <SelectTrigger id={`${inputIdPrefix}-name`}>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelSuggestions.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Cadastrar novo modelo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Modelos sugeridos com base no catálogo atual ({modelSuggestions.length}).
                </p>
              </>
            ) : (
              <>
                <Input
                  id={`${inputIdPrefix}-name`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: AMX BRAVISSIMO"
                />
                {enableModelSelector && modelSuggestions.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-0 text-xs h-auto"
                      onClick={() => setModelInputMode("select")}
                    >
                      Escolher modelo já cadastrado
                    </Button>
                    {onRequestCreateModel && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-0 text-xs h-auto"
                        onClick={onRequestCreateModel}
                      >
                        + Cadastrar novo modelo
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${inputIdPrefix}-marca`}>Marca</Label>
            <Select
              value={formData.marca || "__none__"}
              disabled={lockCatalogValues && marcasNomes.length === 0}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  marca: value === "__none__" ? "" : value,
                })
              }
            >
              <SelectTrigger id={`${inputIdPrefix}-marca`}>
                <SelectValue placeholder="Selecione uma marca" />
              </SelectTrigger>
              <SelectContent>
                {!lockCatalogValues && <SelectItem value="__none__">Sem marca</SelectItem>}
                {marcasNomes.map((marca) => (
                  <SelectItem key={marca} value={marca}>
                    {marca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${inputIdPrefix}-medida`}>Medida</Label>
              <Select
                value={formData.medida}
                disabled={lockCatalogValues && medidas.length === 0}
                onValueChange={(value) => setFormData({ ...formData, medida: value })}
              >
                <SelectTrigger id={`${inputIdPrefix}-medida`}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {medidas.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${inputIdPrefix}-categoria`}>Categoria</Label>
              <Select
                value={formData.categoria}
                disabled={lockCatalogValues && categorias.length === 0}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger id={`${inputIdPrefix}-categoria`}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {lockCatalogValues && !canRenderCatalogSelectors && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-xs text-amber-900 dark:text-amber-200">
                Categorias incompletas. Cadastre marcas, medidas e tipos na tela de Categorias para continuar.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${inputIdPrefix}-quantidade`}>Quantidade</Label>
              <Input
                id={`${inputIdPrefix}-quantidade`}
                type="number"
                min="0"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: Number.parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${inputIdPrefix}-estoque-minimo`}>Estoque Mínimo</Label>
              <Input
                id={`${inputIdPrefix}-estoque-minimo`}
                type="number"
                min="0"
                value={formData.estoqueMinimo}
                onChange={(e) => setFormData({ ...formData, estoqueMinimo: Number.parseInt(e.target.value, 10) || 1 })}
              />
            </div>
          </div>
          {showAuditJustification && (
            <div className="space-y-2">
              <Label htmlFor={`${inputIdPrefix}-audit-justification`}>
                Justificativa da alteração
              </Label>
              <Textarea
                id={`${inputIdPrefix}-audit-justification`}
                value={auditJustification}
                onChange={(e) => setAuditJustification?.(e.target.value)}
                placeholder="Explique o motivo da alteração para rastreabilidade e auditoria."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{auditJustification.length}/500</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
