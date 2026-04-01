import { lazy, Suspense, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DuplicateIdentityMatch, Product, ProductFormData } from "./types";

const ProductFormDialog = lazy(() => import("@/components/products/ProductFormDialog"));

export const preloadProductFormDialog = () => import("@/components/products/ProductFormDialog");

type CatalogItem = {
  id: number;
  nome: string;
};

type ProductDialogsHostProps = {
  isCreateOpen: boolean;
  setIsCreateOpen: Dispatch<SetStateAction<boolean>>;
  isEditOpen: boolean;
  setIsEditOpen: Dispatch<SetStateAction<boolean>>;
  isSaleStatusDialogOpen: boolean;
  setIsSaleStatusDialogOpen: Dispatch<SetStateAction<boolean>>;
  isCreateModelDialogOpen: boolean;
  setIsCreateModelDialogOpen: Dispatch<SetStateAction<boolean>>;
  isArchiveDialogOpen: boolean;
  setIsArchiveDialogOpen: Dispatch<SetStateAction<boolean>>;
  isDuplicateConfirmOpen: boolean;
  setIsDuplicateConfirmOpen: Dispatch<SetStateAction<boolean>>;
  isDeleteConfirmOpen: boolean;
  setIsDeleteConfirmOpen: Dispatch<SetStateAction<boolean>>;
  createPending: boolean;
  updatePending: boolean;
  createModelPending: boolean;
  toggleSaleStatusPending: boolean;
  archivePending: boolean;
  deletePending: boolean;
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  medidasCatalogo: string[];
  tiposCatalogo: string[];
  marcasDb?: CatalogItem[];
  tiposDb?: CatalogItem[];
  modelSuggestions: string[];
  editingProduct: Product | null;
  setEditingProduct: Dispatch<SetStateAction<Product | null>>;
  auditJustification: string;
  setAuditJustification: Dispatch<SetStateAction<string>>;
  handleCreate: () => void;
  handleUpdate: () => void;
  openCreateModelDialog: () => void;
  resetForm: () => void;
  saleStatusTarget: Product | null;
  setSaleStatusTarget: Dispatch<SetStateAction<Product | null>>;
  inactivationReason: string;
  setInactivationReason: Dispatch<SetStateAction<string>>;
  confirmInactivation: () => void;
  newModelName: string;
  setNewModelName: Dispatch<SetStateAction<string>>;
  newModelBrandId: string;
  setNewModelBrandId: Dispatch<SetStateAction<string>>;
  newModelTypeId: string;
  setNewModelTypeId: Dispatch<SetStateAction<string>>;
  handleCreateModelFromDialog: () => void;
  archiveTarget: Product | null;
  setArchiveTarget: Dispatch<SetStateAction<Product | null>>;
  archiveReason: string;
  setArchiveReason: Dispatch<SetStateAction<string>>;
  confirmArchive: () => void;
  duplicateReviewType: "exact" | "similar";
  duplicateMatches: DuplicateIdentityMatch[];
  duplicateContextMode: "create" | "update";
  resolveDuplicateConfirmation: (value: boolean) => void;
  pendingDeletionCount: number;
  confirmDelete: () => void;
};

export function ProductDialogsHost({
  isCreateOpen,
  setIsCreateOpen,
  isEditOpen,
  setIsEditOpen,
  isSaleStatusDialogOpen,
  setIsSaleStatusDialogOpen,
  isCreateModelDialogOpen,
  setIsCreateModelDialogOpen,
  isArchiveDialogOpen,
  setIsArchiveDialogOpen,
  isDuplicateConfirmOpen,
  setIsDuplicateConfirmOpen,
  isDeleteConfirmOpen,
  setIsDeleteConfirmOpen,
  createPending,
  updatePending,
  createModelPending,
  toggleSaleStatusPending,
  archivePending,
  deletePending,
  formData,
  setFormData,
  medidasCatalogo,
  tiposCatalogo,
  marcasDb,
  tiposDb,
  modelSuggestions,
  editingProduct,
  setEditingProduct,
  auditJustification,
  setAuditJustification,
  handleCreate,
  handleUpdate,
  openCreateModelDialog,
  resetForm,
  saleStatusTarget,
  setSaleStatusTarget,
  inactivationReason,
  setInactivationReason,
  confirmInactivation,
  newModelName,
  setNewModelName,
  newModelBrandId,
  setNewModelBrandId,
  newModelTypeId,
  setNewModelTypeId,
  handleCreateModelFromDialog,
  archiveTarget,
  setArchiveTarget,
  archiveReason,
  setArchiveReason,
  confirmArchive,
  duplicateReviewType,
  duplicateMatches,
  duplicateContextMode,
  resolveDuplicateConfirmation,
  pendingDeletionCount,
  confirmDelete,
}: ProductDialogsHostProps) {
  return (
    <>
      <Suspense fallback={null}>
        <ProductFormDialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              resetForm();
              setAuditJustification("");
            }
          }}
          title="Criar Novo Produto"
          description="Adicione um novo produto ao estoque"
          submitLabel="Criar Produto"
          isSubmitting={createPending}
          formData={formData}
          setFormData={setFormData}
          medidas={medidasCatalogo}
          categorias={tiposCatalogo}
          marcas={marcasDb}
          modelSuggestions={modelSuggestions}
          enableModelSelector
          lockCatalogValues
          onRequestCreateModel={openCreateModelDialog}
          inputIdPrefix="create-product"
          onSubmit={handleCreate}
          onCancel={() => {
            setIsCreateOpen(false);
            resetForm();
            setAuditJustification("");
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ProductFormDialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) {
              setEditingProduct(null);
              setAuditJustification("");
            }
          }}
          title="Editar Produto"
          description="Atualize as informações do produto"
          submitLabel="Salvar Alterações"
          isSubmitting={updatePending}
          formData={formData}
          setFormData={setFormData}
          medidas={medidasCatalogo}
          categorias={tiposCatalogo}
          marcas={marcasDb}
          modelSuggestions={modelSuggestions}
          enableModelSelector
          lockCatalogValues
          onRequestCreateModel={openCreateModelDialog}
          inputIdPrefix="edit-product"
          showAuditJustification={Boolean(editingProduct?.arquivado || (editingProduct && !editingProduct.ativoParaVenda))}
          auditJustification={auditJustification}
          setAuditJustification={setAuditJustification}
          onSubmit={handleUpdate}
          onCancel={() => {
            setIsEditOpen(false);
            setEditingProduct(null);
            setAuditJustification("");
          }}
        />
      </Suspense>

      <Dialog
        open={isSaleStatusDialogOpen}
        onOpenChange={(open) => {
          setIsSaleStatusDialogOpen(open);
          if (!open) {
            setSaleStatusTarget(null);
            setInactivationReason("");
          }
        }}
      >
        <DialogContent className="bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Inativar produto para novas vendas</DialogTitle>
            <DialogDescription>
              {saleStatusTarget
                ? `Informe o motivo da inativação de "${saleStatusTarget.name}".`
                : "Informe o motivo da inativação."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="inactivationReason">Motivo</Label>
            <Textarea
              id="inactivationReason"
              value={inactivationReason}
              onChange={(e) => setInactivationReason(e.target.value)}
              placeholder="Ex.: produto descontinuado, falta de fornecedor, revisão de catálogo..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{inactivationReason.length}/500</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSaleStatusDialogOpen(false);
                setSaleStatusTarget(null);
                setInactivationReason("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmInactivation} disabled={toggleSaleStatusPending}>
              {toggleSaleStatusPending ? "Salvando..." : "Confirmar inativação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateModelDialogOpen}
        onOpenChange={(open) => {
          setIsCreateModelDialogOpen(open);
        }}
      >
        <DialogContent className="bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Cadastrar novo modelo</DialogTitle>
            <DialogDescription>
              Crie um novo modelo no catálogo com marca e tipo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-model-name">Nome do modelo</Label>
              <Input
                id="new-model-name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Ex.: Box Baú Elegance"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Select value={newModelBrandId} onValueChange={setNewModelBrandId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {(marcasDb ?? []).map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newModelTypeId} onValueChange={setNewModelTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(tiposDb ?? []).map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateModelFromDialog} disabled={createModelPending}>
              {createModelPending ? "Criando..." : "Criar modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isArchiveDialogOpen}
        onOpenChange={(open) => {
          setIsArchiveDialogOpen(open);
          if (!open) {
            setArchiveTarget(null);
            setArchiveReason("");
          }
        }}
      >
        <DialogContent className="bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Arquivar produto</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `Informe o motivo do arquivamento de "${archiveTarget.name}".`
                : "Informe o motivo do arquivamento."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="archiveReason">Motivo do arquivamento</Label>
            <Textarea
              id="archiveReason"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Ex.: produto fora de linha, substituído, catálogo encerrado..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{archiveReason.length}/500</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsArchiveDialogOpen(false);
                setArchiveTarget(null);
                setArchiveReason("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmArchive} disabled={archivePending}>
              {archivePending ? "Arquivando..." : "Confirmar arquivamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDuplicateConfirmOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsDuplicateConfirmOpen(true);
            return;
          }
          resolveDuplicateConfirmation(false);
        }}
      >
        <AlertDialogContent className="bg-card text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {duplicateReviewType === "exact"
                ? "Produto já cadastrado"
                : "Produto com nome muito parecido"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateReviewType === "exact" ? (
                <>
                  Encontramos produto(s) com o mesmo <strong>Nome + Marca + Medida</strong>.
                  <br />
                  Se for realmente outro item, você pode continuar.
                </>
              ) : (
                <>
                  Encontramos produto(s) com <strong>nome muito semelhante</strong> para a mesma marca e medida.
                  <br />
                  Revise para evitar duplicidade por variação de escrita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-56 overflow-auto rounded-md border bg-background/70 p-2 space-y-2 text-sm">
            {duplicateMatches.map((item) => {
              const status = item.arquivado ? "arquivado" : item.ativoParaVenda ? "ativo" : "inativo";
              return (
                <div key={item.id} className="rounded border px-3 py-2">
                  <div className="font-medium">
                    #{item.id} - {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(item.marca ?? "SEM_MARCA")} • {item.medida} • {item.categoria} • estoque {item.quantidade} • {status}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {duplicateContextMode === "create"
              ? "Deseja cadastrar mesmo assim? (Não vamos bloquear.)"
              : "Deseja salvar a atualização mesmo assim? (Não vamos bloquear.)"}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolveDuplicateConfirmation(false)}>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={() => resolveDuplicateConfirmation(true)}>
              {duplicateContextMode === "create" ? "Cadastrar mesmo assim" : "Salvar mesmo assim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent className="bg-card text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir definitivamente {pendingDeletionCount} produto(s)?
              <br />
              Você ainda pode desfazer as marcações antes desta confirmação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deletePending}>
              {deletePending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}