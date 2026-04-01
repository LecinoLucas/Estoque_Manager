export type Product = {
  id: number;
  name: string;
  marca: string | null;
  medida: string;
  categoria: string;
  quantidade: number;
  estoqueMinimo: number;
  ativoParaVenda: boolean;
  arquivado: boolean;
  motivoInativacao: string | null;
  motivoArquivamento: string | null;
  statusProduto?: "ATIVO" | "INATIVO" | "ARQUIVADO";
};

export type ProductViewMode = "table" | "cards";

export type ProductFormData = {
  name: string;
  marca: string;
  medida: string;
  categoria: string;
  quantidade: number;
  estoqueMinimo: number;
};

export type DuplicateIdentityMatch = {
  id: number;
  name: string;
  marca: string | null;
  medida: string;
  categoria: string;
  quantidade: number;
  ativoParaVenda: boolean;
  arquivado: boolean;
};

export const PRODUCT_CATEGORY_OPTIONS = [
  "Colchões",
  "Roupas de Cama",
  "Pillow Top",
  "Travesseiros",
  "Cabeceiras",
  "Box Baú",
  "Box Premium",
  "Box Tradicional",
  "Acessórios",
  "Bicamas",
  "Camas",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORY_OPTIONS)[number];

const PRODUCT_CATEGORY_NORMALIZATION_MAP: Record<string, ProductCategory> = {
  colchoes: "Colchões",
  "roupa de cama": "Roupas de Cama",
  "roupas de cama": "Roupas de Cama",
  pillowtop: "Pillow Top",
  "pillow top": "Pillow Top",
  travesseiros: "Travesseiros",
  cabeceiras: "Cabeceiras",
  "box bau": "Box Baú",
  "box premium": "Box Premium",
  "box tradicional": "Box Tradicional",
  acessorios: "Acessórios",
  bicamas: "Bicamas",
  camas: "Camas",
};

function normalizeCategoryKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeProductCategory(value: string): ProductCategory | null {
  return PRODUCT_CATEGORY_NORMALIZATION_MAP[normalizeCategoryKey(value)] ?? null;
}