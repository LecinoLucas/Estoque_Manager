import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  inputIdPrefix: string;
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
  inputIdPrefix,
  onSubmit,
  onCancel,
}: ProductFormDialogProps) {
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
            <Input
              id={`${inputIdPrefix}-name`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: AMX BRAVISSIMO"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${inputIdPrefix}-marca`}>Marca</Label>
            <Input
              id={`${inputIdPrefix}-marca`}
              list={`${inputIdPrefix}-marcas-list`}
              value={formData.marca}
              onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              placeholder="Ex: AMERICANFLEX"
            />
            <datalist id={`${inputIdPrefix}-marcas-list`}>
              {marcas?.map((marca) => (
                <option key={marca.id} value={marca.nome} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${inputIdPrefix}-medida`}>Medida</Label>
              <Input
                id={`${inputIdPrefix}-medida`}
                list={`${inputIdPrefix}-medidas-list`}
                value={formData.medida}
                onChange={(e) => setFormData({ ...formData, medida: e.target.value })}
                placeholder="Ex: Queen, 50x70, etc."
              />
              <datalist id={`${inputIdPrefix}-medidas-list`}>
                {medidas.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${inputIdPrefix}-categoria`}>Categoria</Label>
              <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
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
