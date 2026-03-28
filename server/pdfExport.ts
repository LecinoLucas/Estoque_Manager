import PDFDocument from "pdfkit";
import { storagePut } from "./storage";

interface Product {
  id: number;
  name: string;
  marca: string | null;
  medida: string;
  categoria: string;
  quantidade: number;
  estoqueMinimo: number;
}

export async function generateProductsPDF(products: Product[]) {
  return new Promise<{ url: string }>(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", async () => {
        const pdfBuffer = Buffer.concat(chunks);
        const timestamp = Date.now();
        const fileName = `produtos-${timestamp}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");
        resolve({ url });
      });
      doc.on("error", reject);

      // Header
      doc.fontSize(20).text("Relatório de Produtos", { align: "center" });
      doc.moveDown();
      doc.fontSize(10).text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, { align: "center" });
      doc.fontSize(10).text(`Total de produtos: ${products.length}`, { align: "center" });
      doc.moveDown(2);

      // Table header
      const tableTop = doc.y;
      const colWidths = [200, 80, 80, 80, 60];
      const headers = ["Nome", "Marca", "Medida", "Categoria", "Qtd"];
      
      doc.fontSize(10).fillColor("#000");
      headers.forEach((header, i) => {
        const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(header, x, tableTop, { width: colWidths[i], continued: false });
      });
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.moveDown();

      // Table rows
      products.forEach((product, index) => {
        const y = doc.y;
        
        // Check if we need a new page
        if (y > 700) {
          doc.addPage();
          doc.y = 50;
        }
        
        const rowData = [
          product.name,
          product.marca || "-",
          product.medida,
          product.categoria,
          product.quantidade.toString(),
        ];
        
        rowData.forEach((text, i) => {
          const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.fontSize(9).text(text, x, doc.y, { width: colWidths[i], continued: false });
        });
        
        doc.moveDown(0.5);
        
        // Add line after each row
        if (index < products.length - 1) {
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
