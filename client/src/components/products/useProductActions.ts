import { useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { downloadFileFromUrl } from "@/lib/download";
import { normalizeProductCategory } from "./types";
import type { DuplicateIdentityMatch, Product, ProductFormData } from "./types";

type CatalogItem = {
  id: number;
  nome: string;
};

type UseProductActionsParams = {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  auditJustification: string;
  setAuditJustification: React.Dispatch<React.SetStateAction<string>>;
  editingProduct: Product | null;
  setEditingProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  setIsCreateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCreateModelDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsArchiveDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setArchiveTarget: React.Dispatch<React.SetStateAction<Product | null>>;
  archiveTarget: Product | null;
  archiveReason: string;
  setArchiveReason: React.Dispatch<React.SetStateAction<string>>;
  setSaleStatusTarget: React.Dispatch<React.SetStateAction<Product | null>>;
  saleStatusTarget: Product | null;
  inactivationReason: string;
  setInactivationReason: React.Dispatch<React.SetStateAction<string>>;
  setIsSaleStatusDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTogglingProductId: React.Dispatch<React.SetStateAction<number | null>>;
  marcasDb?: CatalogItem[];
  tiposDb?: CatalogItem[];
  medidasCatalogo: string[];
  tiposCatalogo: string[];
  marcasCatalogo: string[];
  productsItems: Product[];
  requestDuplicateConfirmation: (
    matches: DuplicateIdentityMatch[],
    mode: "create" | "update",
    reviewType: "exact" | "similar"
  ) => Promise<boolean>;
  newModelName: string;
  setNewModelName: React.Dispatch<React.SetStateAction<string>>;
  newModelBrandId: string;
  setNewModelBrandId: React.Dispatch<React.SetStateAction<string>>;
  newModelTypeId: string;
  setNewModelTypeId: React.Dispatch<React.SetStateAction<string>>;
  debouncedSearchTerm: string;
  filterMedida: string;
  filterCategoria: string;
  filterMarca: string;
  pendingDeletionIds: Set<number>;
  setPendingDeletionIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  pendingDeletionSnapshot: Record<number, Product>;
  setPendingDeletionSnapshot: React.Dispatch<React.SetStateAction<Record<number, Product>>>;
  setLastDeleteSummary: React.Dispatch<React.SetStateAction<{ successCount: number; failCount: number } | null>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  setIsDeleteConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const normalizeIdentityValue = (value?: string | null) =>
  (value ?? "").trim().toLowerCase();

const normalizeNameForSimilarity = (name: string) =>
  normalizeIdentityValue(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildBigrams = (value: string) => {
  const padded = ` ${value} `;
  const grams: string[] = [];
  for (let i = 0; i < padded.length - 1; i += 1) {
    grams.push(padded.slice(i, i + 2));
  }
  return grams;
};

const diceSimilarity = (a: string, b: string) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aBigrams = buildBigrams(a);
  const bBigrams = buildBigrams(b);
  if (!aBigrams.length || !bBigrams.length) return 0;

  const bCounts = new Map<string, number>();
  for (const gram of bBigrams) {
    bCounts.set(gram, (bCounts.get(gram) ?? 0) + 1);
  }

  let intersection = 0;
  for (const gram of aBigrams) {
    const count = bCounts.get(gram) ?? 0;
    if (count > 0) {
      intersection += 1;
      bCounts.set(gram, count - 1);
    }
  }

  return (2 * intersection) / (aBigrams.length + bBigrams.length);
};

export function useProductActions({
  formData,
  setFormData,
  auditJustification,
  setAuditJustification,
  editingProduct,
  setEditingProduct,
  setIsCreateOpen,
  setIsEditOpen,
  setIsCreateModelDialogOpen,
  setIsArchiveDialogOpen,
  setArchiveTarget,
  archiveTarget,
  archiveReason,
  setArchiveReason,
  setSaleStatusTarget,
  saleStatusTarget,
  inactivationReason,
  setInactivationReason,
  setIsSaleStatusDialogOpen,
  setTogglingProductId,
  marcasDb,
  tiposDb,
  medidasCatalogo,
  tiposCatalogo,
  marcasCatalogo,
  productsItems,
  requestDuplicateConfirmation,
  newModelName,
  setNewModelName,
  newModelBrandId,
  setNewModelBrandId,
  newModelTypeId,
  setNewModelTypeId,
  debouncedSearchTerm,
  filterMedida,
  filterCategoria,
  filterMarca,
  pendingDeletionIds,
  setPendingDeletionIds,
  pendingDeletionSnapshot,
  setPendingDeletionSnapshot,
  setLastDeleteSummary,
  setSelectedIds,
  setIsDeleteConfirmOpen,
}: UseProductActionsParams) {
  const utils = trpc.useUtils();

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      marca: "",
      medida: "",
      categoria: "",
      quantidade: 0,
      estoqueMinimo: 1,
    });
  }, [setFormData]);

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.products.lowStock.invalidate();
      setIsCreateOpen(false);
      resetForm();
      toast.success("Produto criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar produto: " + error.message);
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.products.lowStock.invalidate();
      setIsEditOpen(false);
      setEditingProduct(null);
      setAuditJustification("");
      toast.success("Produto atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });

  const createModelMutation = trpc.catalogo.createModel.useMutation({
    onSuccess: async () => {
      await utils.catalogo.listModels.invalidate();
      toast.success("Modelo criado com sucesso.");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar modelo.");
    },
  });

  const duplicateIdentityMutation = trpc.products.checkDuplicateIdentity.useMutation();

  const toggleSaleStatusMutation = trpc.products.update.useMutation({
    onSuccess: (_, variables) => {
      utils.products.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.products.lowStock.invalidate();
      const turnedOn = variables.ativoParaVenda === true;
      toast.success(turnedOn ? "Produto ativado para novas vendas." : "Produto inativado para novas vendas.");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status de venda: " + error.message);
    },
    onSettled: () => {
      setTogglingProductId(null);
    },
  });

  const archiveMutation = trpc.products.archive.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.products.lowStock.invalidate();
      setIsArchiveDialogOpen(false);
      setArchiveTarget(null);
      setArchiveReason("");
      toast.success("Produto arquivado com sucesso.");
    },
    onError: (error) => {
      toast.error("Erro ao arquivar produto: " + error.message);
    },
  });

  const unarchiveMutation = trpc.products.unarchive.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.products.lowStock.invalidate();
      toast.success("Produto desarquivado.");
    },
    onError: (error) => {
      toast.error("Erro ao desarquivar produto: " + error.message);
    },
  });

  const deleteBatchMutation = trpc.products.deleteBatch.useMutation();

  const exportPDFMutation = trpc.products.exportPDF.useMutation({
    onSuccess: async (data) => {
      try {
        await downloadFileFromUrl(data.url, {
          fileName: `produtos-${Date.now()}.pdf`,
        });
        toast.success("PDF baixado com sucesso!");
      } catch {
        toast.error("Erro ao baixar PDF");
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao gerar PDF");
    },
  });

  const handleExportPDF = useCallback(() => {
    exportPDFMutation.mutate({
      search: debouncedSearchTerm,
      medida: filterMedida === "all" ? undefined : filterMedida,
      categoria: filterCategoria === "all" ? undefined : filterCategoria,
      marca: filterMarca === "all" ? undefined : filterMarca,
    });
  }, [debouncedSearchTerm, exportPDFMutation, filterCategoria, filterMarca, filterMedida]);

  const confirmDuplicateIdentityIfNeeded = useCallback(
    async (payload: { name: string; medida: string; marca?: string; excludeId?: number; mode: "create" | "update" }) => {
      const result = await duplicateIdentityMutation.mutateAsync(payload);
      if (result.exists) {
        return await requestDuplicateConfirmation(
          (result.matches ?? []).slice(0, 10) as DuplicateIdentityMatch[],
          payload.mode,
          "exact"
        );
      }

      const targetName = normalizeNameForSimilarity(payload.name);
      const targetMarca = normalizeIdentityValue(payload.marca);
      const targetMedida = normalizeIdentityValue(payload.medida);
      const similarCandidates = productsItems
        .filter((item) => item.id !== payload.excludeId)
        .filter((item) => normalizeIdentityValue(item.medida) === targetMedida)
        .filter((item) => normalizeIdentityValue(item.marca) === targetMarca)
        .map((item) => {
          const score = diceSimilarity(targetName, normalizeNameForSimilarity(item.name));
          return { item, score };
        })
        .filter(({ item, score }) => {
          const normalizedItemName = normalizeNameForSimilarity(item.name);
          const hasContainment =
            targetName.length >= 4 &&
            normalizedItemName.length >= 4 &&
            (targetName.includes(normalizedItemName) || normalizedItemName.includes(targetName));
          return score >= 0.72 || hasContainment;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ item }) => item as DuplicateIdentityMatch);

      if (similarCandidates.length === 0) return true;

      return await requestDuplicateConfirmation(similarCandidates, payload.mode, "similar");
    },
    [duplicateIdentityMutation, productsItems, requestDuplicateConfirmation]
  );

  const handleCreate = useCallback(async () => {
    if (!formData.name || !formData.medida || !formData.categoria) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const normalizedCategory = normalizeProductCategory(formData.categoria);
    if (!medidasCatalogo.includes(formData.medida)) {
      toast.error("Selecione uma medida válida do catálogo.");
      return;
    }
    if (!normalizedCategory || !tiposCatalogo.includes(normalizedCategory)) {
      toast.error("Selecione um tipo/categoria válido do catálogo.");
      return;
    }
    if (formData.marca && !marcasCatalogo.includes(formData.marca)) {
      toast.error("Selecione uma marca válida do catálogo.");
      return;
    }
    const canProceed = await confirmDuplicateIdentityIfNeeded({
      name: formData.name,
      medida: formData.medida,
      marca: formData.marca || undefined,
      mode: "create",
    });
    if (!canProceed) {
      toast.info("Cadastro cancelado para revisão.");
      return;
    }
    createMutation.mutate({ ...formData, categoria: normalizedCategory } as never);
  }, [confirmDuplicateIdentityIfNeeded, createMutation, formData, marcasCatalogo, medidasCatalogo, tiposCatalogo]);

  const openCreateModelDialog = useCallback(() => {
    const selectedBrand = (marcasDb ?? []).find((item) => item.nome === formData.marca);
    const selectedType = (tiposDb ?? []).find((item) => item.nome === formData.categoria);
    setNewModelName(formData.name ?? "");
    setNewModelBrandId(selectedBrand ? String(selectedBrand.id) : "");
    setNewModelTypeId(selectedType ? String(selectedType.id) : "");
    setIsCreateModelDialogOpen(true);
  }, [formData.categoria, formData.marca, formData.name, marcasDb, setIsCreateModelDialogOpen, setNewModelBrandId, setNewModelName, setNewModelTypeId, tiposDb]);

  const handleCreateModelFromDialog = useCallback(async () => {
    const nome = newModelName.trim();
    if (!nome) {
      toast.error("Informe o nome do modelo.");
      return;
    }
    if (!newModelBrandId || !newModelTypeId) {
      toast.error("Selecione marca e tipo para o modelo.");
      return;
    }

    await createModelMutation.mutateAsync({
      nome,
      brandId: Number(newModelBrandId),
      productTypeId: Number(newModelTypeId),
    });

    const selectedBrandName = (marcasDb ?? []).find((item) => item.id === Number(newModelBrandId))?.nome ?? "";
    const selectedTypeName = (tiposDb ?? []).find((item) => item.id === Number(newModelTypeId))?.nome ?? "";

    setFormData((prev) => ({
      ...prev,
      name: nome,
      marca: selectedBrandName || prev.marca,
      categoria: selectedTypeName || prev.categoria,
    }));
    setIsCreateModelDialogOpen(false);
  }, [createModelMutation, marcasDb, newModelBrandId, newModelName, newModelTypeId, setFormData, setIsCreateModelDialogOpen, tiposDb]);

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setAuditJustification("");
    const normalizedCategory = normalizeProductCategory(product.categoria) ?? product.categoria;
    setFormData({
      name: product.name,
      marca: product.marca || "",
      medida: product.medida,
      categoria: normalizedCategory,
      quantidade: product.quantidade,
      estoqueMinimo: product.estoqueMinimo,
    });
    setIsEditOpen(true);
  }, [setAuditJustification, setEditingProduct, setFormData, setIsEditOpen]);

  const handleUpdate = useCallback(async () => {
    if (!editingProduct) return;
    const normalizedCategory = normalizeProductCategory(formData.categoria);
    if (!medidasCatalogo.includes(formData.medida)) {
      toast.error("Selecione uma medida válida cadastrada em Categorias.");
      return;
    }
    if (!normalizedCategory || !tiposCatalogo.includes(normalizedCategory)) {
      toast.error("Selecione um tipo/categoria válido cadastrado em Categorias.");
      return;
    }
    if (formData.marca && !marcasCatalogo.includes(formData.marca)) {
      toast.error("Selecione uma marca válida cadastrada em Categorias.");
      return;
    }
    const canProceed = await confirmDuplicateIdentityIfNeeded({
      name: formData.name,
      medida: formData.medida,
      marca: formData.marca || undefined,
      excludeId: editingProduct.id,
      mode: "update",
    });
    if (!canProceed) {
      toast.info("Alteração cancelada para revisão.");
      return;
    }
    const payload: Record<string, unknown> = {
      id: editingProduct.id,
    };

    if (formData.name !== editingProduct.name) payload.name = formData.name;
    if ((formData.marca || null) !== (editingProduct.marca || null)) payload.marca = formData.marca;
    if (formData.medida !== editingProduct.medida) payload.medida = formData.medida;
    if (normalizedCategory !== editingProduct.categoria) payload.categoria = normalizedCategory;
    if (formData.quantidade !== editingProduct.quantidade) payload.quantidade = formData.quantidade;
    if (formData.estoqueMinimo !== editingProduct.estoqueMinimo) payload.estoqueMinimo = formData.estoqueMinimo;

    const isGoverned = editingProduct.arquivado || !editingProduct.ativoParaVenda;
    const hasStockChange = payload.quantidade !== undefined || payload.estoqueMinimo !== undefined;
    if (isGoverned && hasStockChange) {
      const reason = auditJustification.trim();
      if (!reason) {
        toast.warning("Informe a justificativa da alteração para produto inativo/arquivado.");
        return;
      }
      payload.auditJustification = reason;
    } else if (auditJustification.trim()) {
      payload.auditJustification = auditJustification.trim();
    }

    if (Object.keys(payload).length === 1) {
      toast.info("Nenhuma alteração detectada.");
      return;
    }

    updateMutation.mutate(payload as never);
  }, [auditJustification, confirmDuplicateIdentityIfNeeded, editingProduct, formData, marcasCatalogo, medidasCatalogo, tiposCatalogo, updateMutation]);

  const handleToggleSaleStatus = useCallback((product: Product) => {
    if (product.arquivado) {
      toast.warning("Desarquive o produto antes de alterar o status de venda.");
      return;
    }
    if (product.ativoParaVenda) {
      setSaleStatusTarget(product);
      setInactivationReason(product.motivoInativacao ?? "");
      setIsSaleStatusDialogOpen(true);
      return;
    }
    setTogglingProductId(product.id);
    toggleSaleStatusMutation.mutate({
      id: product.id,
      ativoParaVenda: true,
      motivoInativacao: null,
    });
  }, [setInactivationReason, setIsSaleStatusDialogOpen, setSaleStatusTarget, setTogglingProductId, toggleSaleStatusMutation]);

  const confirmInactivation = useCallback(() => {
    if (!saleStatusTarget) return;
    const reason = inactivationReason.trim();
    if (!reason) {
      toast.warning("Informe o motivo da inativação.");
      return;
    }
    setTogglingProductId(saleStatusTarget.id);
    toggleSaleStatusMutation.mutate({
      id: saleStatusTarget.id,
      ativoParaVenda: false,
      motivoInativacao: reason,
    });
    setIsSaleStatusDialogOpen(false);
    setSaleStatusTarget(null);
    setInactivationReason("");
  }, [inactivationReason, saleStatusTarget, setInactivationReason, setIsSaleStatusDialogOpen, setSaleStatusTarget, setTogglingProductId, toggleSaleStatusMutation]);

  const handleArchive = useCallback((product: Product) => {
    setArchiveTarget(product);
    setArchiveReason(product.motivoArquivamento ?? "");
    setIsArchiveDialogOpen(true);
  }, [setArchiveReason, setArchiveTarget, setIsArchiveDialogOpen]);

  const confirmArchive = useCallback(() => {
    if (!archiveTarget) return;
    const reason = archiveReason.trim();
    if (!reason) {
      toast.warning("Informe o motivo do arquivamento.");
      return;
    }
    archiveMutation.mutate({
      id: archiveTarget.id,
      motivoArquivamento: reason,
    });
  }, [archiveMutation, archiveReason, archiveTarget]);

  const handleUnarchive = useCallback((product: Product) => {
    unarchiveMutation.mutate({
      id: product.id,
      reativarParaVenda: false,
    });
  }, [unarchiveMutation]);

  const confirmDelete = useCallback(async () => {
    const ids = Array.from(pendingDeletionIds);
    if (ids.length === 0) return;

    try {
      const result = await deleteBatchMutation.mutateAsync({ ids });
      const successCount = result.successCount;
      const failCount = result.failCount;
      const failedIdSet = new Set((result.failures ?? []).map((failure) => failure.id));

      await Promise.all([
        utils.products.list.invalidate(),
        utils.dashboard.stats.invalidate(),
        utils.products.lowStock.invalidate(),
      ]);

      if (successCount > 0) {
        toast.success(`${successCount} produto(s) excluído(s) com sucesso.`);
      }
      if (failCount > 0) {
        const reasons = (result.failures ?? [])
          .slice(0, 3)
          .map((failure) => `#${failure.id}: ${failure.message}`)
          .join(" | ");
        toast.error(
          reasons
            ? `${failCount} produto(s) não puderam ser excluídos. ${reasons}`
            : `${failCount} produto(s) não puderam ser excluídos.`
        );
      }
      setLastDeleteSummary({ successCount, failCount });

      if (failCount > 0) {
        setPendingDeletionIds((prev) => {
          const next = new Set<number>();
          prev.forEach((id) => {
            if (failedIdSet.has(id)) next.add(id);
          });
          return next;
        });
        setPendingDeletionSnapshot((prev) => {
          const next: Record<number, Product> = {};
          Object.entries(prev).forEach(([rawId, item]) => {
            const id = Number(rawId);
            if (failedIdSet.has(id)) next[id] = item;
          });
          return next;
        });
      } else {
        setPendingDeletionIds(new Set());
        setPendingDeletionSnapshot({});
      }
    } catch {
      toast.error("Erro ao excluir produtos.");
    } finally {
      setSelectedIds(new Set());
      setIsDeleteConfirmOpen(false);
    }
  }, [deleteBatchMutation, pendingDeletionIds, setIsDeleteConfirmOpen, setLastDeleteSummary, setPendingDeletionIds, setPendingDeletionSnapshot, setSelectedIds, utils.dashboard.stats, utils.products.list, utils.products.lowStock]);

  return {
    createMutation,
    updateMutation,
    createModelMutation,
    toggleSaleStatusMutation,
    archiveMutation,
    deleteBatchMutation,
    exportPDFMutation,
    resetForm,
    handleExportPDF,
    handleCreate,
    openCreateModelDialog,
    handleCreateModelFromDialog,
    handleEdit,
    handleUpdate,
    handleToggleSaleStatus,
    confirmInactivation,
    handleArchive,
    confirmArchive,
    handleUnarchive,
    confirmDelete,
  };
}