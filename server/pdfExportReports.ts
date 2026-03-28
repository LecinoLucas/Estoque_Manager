import PDFDocument from "pdfkit";
import { storagePut } from "./storage";

type VendasRelatorioItem = {
  id: number;
  dataVenda: Date | string;
  productName: string;
  medida: string | null;
  marca: string | null;
  quantidade: number;
  vendedor: string | null;
  nomeCliente: string | null;
  status: string;
  observacoes: string | null;
};

type EncomendasRelatorioItem = {
  id: number;
  dataVenda: Date | string;
  productName: string;
  medida: string | null;
  marca: string | null;
  quantidade: number;
  estoqueAtual: number;
  nomeCliente: string | null;
  observacoes: string | null;
};

function toDateLabel(value: Date | string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

function normalizeStatus(status: string): string {
  if (status === "concluida") return "Concluída";
  if (status === "cancelada") return "Cancelada";
  return status;
}

export async function generateVendasRelatorioPDF(vendas: VendasRelatorioItem[]) {
  return new Promise<{ url: string }>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
      const chunks: Buffer[] = [];
      const rowHeight = 18;
      const baseY = 120;
      const tableBottom = 550;
      const colWidths = [65, 170, 70, 80, 50, 100, 105, 70];
      const headers = ["Data", "Produto", "Medida", "Marca", "Qtd", "Vendedor", "Cliente", "Status"];

      const drawHeader = () => {
        doc.fontSize(18).text("Relatório de Vendas", { align: "center" });
        doc.moveDown(0.3);
        doc.fontSize(9).text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, { align: "center" });
        doc.fontSize(9).text(`Registros: ${vendas.length}`, { align: "center" });

        let cursorX = 36;
        doc.y = 96;
        doc.fontSize(9).fillColor("#111827");
        headers.forEach((header, idx) => {
          doc.text(header, cursorX, doc.y, { width: colWidths[idx] });
          cursorX += colWidths[idx];
        });
        doc.moveTo(36, 112).lineTo(806, 112).stroke("#9ca3af");
      };

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", async () => {
        const pdfBuffer = Buffer.concat(chunks);
        const fileName = `relatorio-vendas-${Date.now()}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");
        resolve({ url });
      });
      doc.on("error", reject);

      drawHeader();
      let y = baseY;
      for (const venda of vendas) {
        if (y > tableBottom) {
          doc.addPage();
          drawHeader();
          y = baseY;
        }

        const row = [
          toDateLabel(venda.dataVenda),
          venda.productName || "-",
          venda.medida || "-",
          venda.marca || "-",
          String(venda.quantidade),
          venda.vendedor || "-",
          venda.nomeCliente || "-",
          normalizeStatus(venda.status),
        ];

        let x = 36;
        doc.fontSize(8).fillColor("#111827");
        row.forEach((value, idx) => {
          doc.text(value, x, y, { width: colWidths[idx], ellipsis: true });
          x += colWidths[idx];
        });
        y += rowHeight;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateEncomendasRelatorioPDF(encomendas: EncomendasRelatorioItem[]) {
  return new Promise<{ url: string }>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
      const chunks: Buffer[] = [];
      const rowHeight = 18;
      const baseY = 120;
      const tableBottom = 550;
      const colWidths = [70, 170, 70, 70, 55, 75, 70, 95];
      const headers = ["Data", "Produto", "Medida", "Marca", "Vendida", "Estoque", "Faltam", "Cliente"];

      const drawHeader = () => {
        doc.fontSize(18).text("Relatório de Encomendas", { align: "center" });
        doc.moveDown(0.3);
        doc.fontSize(9).text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, { align: "center" });
        doc.fontSize(9).text(`Registros: ${encomendas.length}`, { align: "center" });

        let cursorX = 40;
        doc.y = 96;
        doc.fontSize(9).fillColor("#111827");
        headers.forEach((header, idx) => {
          doc.text(header, cursorX, doc.y, { width: colWidths[idx] });
          cursorX += colWidths[idx];
        });
        doc.moveTo(40, 112).lineTo(805, 112).stroke("#9ca3af");
      };

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", async () => {
        const pdfBuffer = Buffer.concat(chunks);
        const fileName = `relatorio-encomendas-${Date.now()}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");
        resolve({ url });
      });
      doc.on("error", reject);

      drawHeader();
      let y = baseY;
      for (const encomenda of encomendas) {
        if (y > tableBottom) {
          doc.addPage();
          drawHeader();
          y = baseY;
        }

        const faltam = Math.abs(encomenda.estoqueAtual);
        const row = [
          toDateLabel(encomenda.dataVenda),
          encomenda.productName || "-",
          encomenda.medida || "-",
          encomenda.marca || "-",
          String(encomenda.quantidade),
          String(encomenda.estoqueAtual),
          String(faltam),
          encomenda.nomeCliente || "-",
        ];

        let x = 40;
        doc.fontSize(8).fillColor("#111827");
        row.forEach((value, idx) => {
          doc.text(value, x, y, { width: colWidths[idx], ellipsis: true });
          x += colWidths[idx];
        });
        y += rowHeight;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
