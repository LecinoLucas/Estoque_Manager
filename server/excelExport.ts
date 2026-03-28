import ExcelJS from "exceljs";
import { storagePut } from "./storage";

export async function generateVendasExcel(vendas: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Relatório de Vendas");

  // Define columns
  worksheet.columns = [
    { header: "Data", key: "dataVenda", width: 15 },
    { header: "Produto", key: "produto", width: 30 },
    { header: "Medida", key: "medida", width: 15 },
    { header: "Marca", key: "marca", width: 15 },
    { header: "Categoria", key: "categoria", width: 20 },
    { header: "Quantidade", key: "quantidade", width: 12 },
    { header: "Vendedor", key: "vendedor", width: 20 },
    { header: "Cliente", key: "nomeCliente", width: 25 },
    { header: "Status", key: "status", width: 12 },
    { header: "Observações", key: "observacoes", width: 30 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Add data rows
  vendas.forEach((venda) => {
    worksheet.addRow({
      dataVenda: new Date(venda.dataVenda).toLocaleDateString("pt-BR"),
      produto: venda.produto || "Produto não encontrado",
      medida: venda.medida || "-",
      marca: venda.marca || "-",
      categoria: venda.categoria || "-",
      quantidade: venda.quantidade,
      vendedor: venda.vendedor,
      nomeCliente: venda.nomeCliente || "-",
      status: venda.status,
      observacoes: venda.observacoes || "-",
    });
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Upload to S3
  const timestamp = Date.now();
  const fileName = `relatorio-vendas-${timestamp}.xlsx`;
  const { url } = await storagePut(fileName, Buffer.from(buffer), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  return { url };
}

export async function generateEncomendasExcel(encomendas: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Relatório de Encomendas");

  // Define columns
  worksheet.columns = [
    { header: "Data", key: "dataVenda", width: 15 },
    { header: "Produto", key: "produto", width: 30 },
    { header: "Medida", key: "medida", width: 15 },
    { header: "Marca", key: "marca", width: 15 },
    { header: "Qtd. Vendida", key: "quantidadeVendida", width: 15 },
    { header: "Estoque Atual", key: "estoqueAtual", width: 15 },
    { header: "Faltam", key: "faltam", width: 12 },
    { header: "Cliente", key: "nomeCliente", width: 25 },
    { header: "Observações", key: "observacoes", width: 35 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEF4444" },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Add data rows
  encomendas.forEach((encomenda) => {
    worksheet.addRow({
      dataVenda: new Date(encomenda.dataVenda).toLocaleDateString("pt-BR"),
      produto: encomenda.produto || "Produto não encontrado",
      medida: encomenda.medida || "-",
      marca: encomenda.marca || "-",
      quantidadeVendida: encomenda.quantidadeVendida,
      estoqueAtual: encomenda.estoqueAtual,
      faltam: encomenda.faltam,
      nomeCliente: encomenda.nomeCliente || "-",
      observacoes: encomenda.observacoes || "-",
    });
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Highlight negative stock rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const faltamCell = row.getCell("faltam");
      if (faltamCell.value && Number(faltamCell.value) > 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEF2F2" },
          };
        });
      }
    }
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Upload to S3
  const timestamp = Date.now();
  const fileName = `relatorio-encomendas-${timestamp}.xlsx`;
  const { url } = await storagePut(fileName, Buffer.from(buffer), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  return { url };
}
