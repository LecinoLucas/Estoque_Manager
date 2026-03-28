import PDFDocument from "pdfkit";
import { storagePut } from "./storage";

interface Order {
  id: number;
  productId: number | null;
  nomeProduto: string | null;
  medidaProduto: string | null;
  quantidade: number;
  nomeCliente: string;
  telefoneCliente: string | null;
  dataCompra: Date | null;
  prazoEntregaDias: number | null;
  dataEntrega: Date;
  pedidoFeito: boolean;
  status: string;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
  produtoNome: string | null;
  produtoMedida: string | null;
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pendente: "Pendente",
    em_producao: "Em Produção",
    pronto: "Pronto",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };
  return statusMap[status] || status;
}

export async function generateEncomendasPDF(orders: Order[]) {
  return new Promise<{ url: string }>(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", async () => {
        const pdfBuffer = Buffer.concat(chunks);
        const timestamp = Date.now();
        const fileName = `encomendas-${timestamp}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");
        resolve({ url });
      });
      doc.on("error", reject);

      // Header
      doc.fontSize(20).text("Relatório de Encomendas", { align: "center" });
      doc.moveDown();
      doc.fontSize(10).text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, { align: "center" });
      doc.fontSize(10).text(`Total de encomendas: ${orders.length}`, { align: "center" });
      doc.moveDown(2);

      // Table header
      const tableTop = doc.y;
      const colWidths = [120, 140, 50, 70, 70, 80];
      const headers = ["Cliente", "Produto", "Qtd", "Entrega", "Pedido", "Status"];
      
      doc.fontSize(9).fillColor("#000");
      headers.forEach((header, i) => {
        const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(header, x, tableTop, { width: colWidths[i], continued: false });
      });
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.moveDown();

      // Table rows
      orders.forEach((order, index) => {
        const y = doc.y;
        
        // Check if we need a new page
        if (y > 700) {
          doc.addPage();
          doc.y = 50;
        }
        
        const produtoDisplay = order.produtoNome || order.nomeProduto || "-";
        const dataEntregaStr = new Date(order.dataEntrega).toLocaleDateString("pt-BR");
        const pedidoFeitoStr = order.pedidoFeito ? "Sim" : "Não";
        
        const rowData = [
          order.nomeCliente,
          produtoDisplay,
          order.quantidade.toString(),
          dataEntregaStr,
          pedidoFeitoStr,
          formatStatus(order.status),
        ];
        
        rowData.forEach((text, i) => {
          const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.fontSize(8).text(text, x, doc.y, { width: colWidths[i], continued: false });
        });
        
        doc.moveDown(0.5);
        
        // Add observações if present
        if (order.observacoes) {
          doc.fontSize(7).fillColor("#666");
          doc.text(`Obs: ${order.observacoes}`, 50, doc.y, { width: 500 });
          doc.fillColor("#000");
          doc.moveDown(0.3);
        }
        
        // Add line after each row
        if (index < orders.length - 1) {
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);
        }
      });

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor("#666").text(
        `Gerado em ${new Date().toLocaleString("pt-BR")} - Pioneira Colchões`,
        { align: "center" }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
