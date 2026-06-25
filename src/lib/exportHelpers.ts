// Ümumi Excel (.xlsx) və PDF export köməkçiləri.
// Bütün modullardakı "Export" düyməsi bu funksiyalardan istifadə edir.

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportData {
  /** Cədvəlin başlığı (sənəddə görünür) */
  title: string;
  /** Sütun adları */
  headers: string[];
  /** Sətirlər (hər sətir headers-lə eyni uzunluqda olmalıdır) */
  rows: (string | number | null | undefined)[][];
  /** Yüklənəcək faylın adı (uzantısız) */
  fileName: string;
}

const cleanCell = (v: unknown): string | number => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  return String(v);
};

export const exportToExcel = (data: ExportData) => {
  const aoa = [data.headers, ...data.rows.map(r => r.map(cleanCell))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Avtomatik sütun eni (qaba)
  const colWidths = data.headers.map((h, i) => {
    const maxLen = Math.max(
      String(h).length,
      ...data.rows.map(r => String(r[i] ?? "").length),
    );
    return { wch: Math.min(50, Math.max(10, maxLen + 2)) };
  });
  (ws as any)["!cols"] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, data.title.slice(0, 31) || "Sheet1");
  XLSX.writeFile(wb, `${data.fileName}.xlsx`);
};

export const exportToPdf = (data: ExportData) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.title, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("az-AZ"), 40, 56);

  autoTable(doc, {
    head: [data.headers],
    body: data.rows.map(r => r.map(v => String(cleanCell(v)))),
    startY: 70,
    styles: { font: "helvetica", fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 30, right: 30 },
  });

  doc.save(`${data.fileName}.pdf`);
};
