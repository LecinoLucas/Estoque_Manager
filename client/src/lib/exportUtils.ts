import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExportData {
  products: Array<{
    name: string;
    medida: string;
    categoria: string;
    quantidade: number;
    estoqueMinimo: number;
  }>;
  stats: {
    totalProducts: number;
    totalItems: number;
    lowStockCount: number;
  };
  topSelling?: Array<{
    name: string;
    medida: string;
    categoria: string;
    quantidadeVendida: number;
  }>;
  exportDate: string;
}

export function exportToPDF(data: ExportData) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Estoque", 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dateStr = format(new Date(data.exportDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  doc.text(`Gerado em: ${dateStr}`, 14, 28);
  
  // Stats
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo", 14, 38);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Total de Produtos: ${data.stats.totalProducts}`, 14, 45);
  doc.text(`Total de Itens em Estoque: ${data.stats.totalItems}`, 14, 51);
  doc.text(`Produtos com Estoque Baixo: ${data.stats.lowStockCount}`, 14, 57);
  
  // Top Selling Products
  let currentY = 65;
  if (data.topSelling && data.topSelling.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Produtos Mais Vendidos do Mês", 14, currentY);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    currentY += 7;
    data.topSelling.forEach((product, index) => {
      doc.text(`${index + 1}. ${product.name} (${product.medida}) - ${product.quantidadeVendida} unidades`, 14, currentY);
      currentY += 6;
    });
    currentY += 5;
  }
  
  // Products table
  const tableData = data.products.map(p => [
    p.name,
    p.medida,
    p.categoria,
    p.quantidade.toString(),
    p.estoqueMinimo.toString(),
  ]);
  
  autoTable(doc, {
    head: [["Produto", "Medida", "Categoria", "Quantidade", "Estoque Mín."]],
    body: tableData,
    startY: currentY,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const quantidade = parseInt(data.cell.text[0] || "0");
        const estoqueMinimo = parseInt(tableData[data.row.index]?.[4] || "3");
        
        if (quantidade <= 1) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        } else if (quantidade <= estoqueMinimo) {
          data.cell.styles.textColor = [234, 88, 12];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  
  // Save
  doc.save(`estoque-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`);
}

export function exportToExcel(data: ExportData) {
  const wb = XLSX.utils.book_new();
  
  // Stats sheet
  const statsData = [
    ["Relatório de Estoque"],
    [""],
    ["Gerado em:", format(new Date(data.exportDate), "dd/MM/yyyy HH:mm", { locale: ptBR })],
    [""],
    ["Resumo"],
    ["Total de Produtos", data.stats.totalProducts],
    ["Total de Itens em Estoque", data.stats.totalItems],
    ["Produtos com Estoque Baixo", data.stats.lowStockCount],
  ];
  
  // Add top selling products if available
  if (data.topSelling && data.topSelling.length > 0) {
    statsData.push([""]);
    statsData.push(["Produtos Mais Vendidos do Mês"]);
    data.topSelling.forEach((product, index) => {
      statsData.push([`${index + 1}. ${product.name} (${product.medida})`, product.quantidadeVendida + " unidades"]);
    });
  }
  
  const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
  XLSX.utils.book_append_sheet(wb, statsSheet, "Resumo");
  
  // Products sheet
  const productsData = [
    ["Produto", "Medida", "Categoria", "Quantidade", "Estoque Mínimo", "Status"],
    ...data.products.map(p => [
      p.name,
      p.medida,
      p.categoria,
      p.quantidade,
      p.estoqueMinimo,
      p.quantidade <= 1 ? "CRÍTICO" : p.quantidade <= p.estoqueMinimo ? "BAIXO" : "OK",
    ]),
  ];
  
  const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
  
  // Set column widths
  productsSheet["!cols"] = [
    { wch: 30 }, // Produto
    { wch: 12 }, // Medida
    { wch: 18 }, // Categoria
    { wch: 12 }, // Quantidade
    { wch: 15 }, // Estoque Mínimo
    { wch: 10 }, // Status
  ];
  
  XLSX.utils.book_append_sheet(wb, productsSheet, "Produtos");
  
  // Save
  XLSX.writeFile(wb, `estoque-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`);
}
