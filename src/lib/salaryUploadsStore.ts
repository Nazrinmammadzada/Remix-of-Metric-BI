// Uploaded salary documents store (localStorage demo)

export interface UploadRowDetail {
  no: number;
  firstName: string;
  lastName: string;
  fatherName: string;
  monthPay: number;
  totalPaid: number;
  avgMonthly: number;
  pctCurrent: number;
  pct12m: number;
  status: "Uyğunlaşdırıldı" | "Uyğunsuz";
  qeyd: string;
}

export interface SalaryUpload {
  id: number;
  operator: string;
  year: number;
  month: string;
  status: "Aktiv" | "Passiv";
  totalAmount: number;
  totalRows: number;
  matched: number;
  unmatched: number;
  fileName: string;
  uploadedBy: string;
  createdAt: string;
  title: string;
  details: UploadRowDetail[];
}

const STORAGE = "kpi_salary_uploads_v3";

// Seed mirrors real org employees + salary template columns
const seedRows: Omit<UploadRowDetail, "no">[] = [
  { firstName: "Günel",   lastName: "Əlizadə",    fatherName: "Vüqar",     monthPay: 4200, totalPaid: 12600, avgMonthly: 4200, pctCurrent: 100.0, pct12m: 100.0, status: "Uyğunlaşdırıldı", qeyd: "FIN və əməkdaş NO üzrə uyğunlaşdırıldı" },
  { firstName: "Nigar",   lastName: "Hüseynova",  fatherName: "Elxan",     monthPay: 5000, totalPaid: 15000, avgMonthly: 5000, pctCurrent: 100.0, pct12m: 100.0, status: "Uyğunlaşdırıldı", qeyd: "FIN və əməkdaş NO üzrə uyğunlaşdırıldı" },
  { firstName: "Samir",   lastName: "Həsənov",    fatherName: "Rauf",      monthPay: 2800, totalPaid: 8400,  avgMonthly: 2800, pctCurrent: 100.0, pct12m: 100.0, status: "Uyğunlaşdırıldı", qeyd: "FIN və əməkdaş NO üzrə uyğunlaşdırıldı" },
  { firstName: "Leyla",   lastName: "Məmmədova",  fatherName: "İlqar",     monthPay: 1800, totalPaid: 5400,  avgMonthly: 1800, pctCurrent: 100.0, pct12m: 100.0, status: "Uyğunlaşdırıldı", qeyd: "FIN və əməkdaş NO üzrə uyğunlaşdırıldı" },
  { firstName: "Rəşad",   lastName: "Əliyev",     fatherName: "Tahir",     monthPay: 1800, totalPaid: 5400,  avgMonthly: 1800, pctCurrent: 100.0, pct12m: 100.0, status: "Uyğunlaşdırıldı", qeyd: "FIN və əməkdaş NO üzrə uyğunlaşdırıldı" },
  { firstName: "Farid",   lastName: "Həsənov",    fatherName: "Akif",      monthPay: 4500, totalPaid: 13500, avgMonthly: 4500, pctCurrent: 100.0, pct12m: 100.0, status: "Uyğunlaşdırıldı", qeyd: "FIN və əməkdaş NO üzrə uyğunlaşdırıldı" },
  { firstName: "Emin",    lastName: "Məmmədov",   fatherName: "Səxavət",   monthPay: 1700, totalPaid: 5100,  avgMonthly: 1700, pctCurrent: 100.0, pct12m: 100.0, status: "Uyğunlaşdırıldı", qeyd: "FIN və əməkdaş NO üzrə uyğunlaşdırıldı" },
  { firstName: "Kamran",  lastName: "Quliyev",    fatherName: "Zaur",      monthPay: 1900, totalPaid: 5700,  avgMonthly: 1900, pctCurrent: 100.0, pct12m: 100.0, status: "Uyğunlaşdırıldı", qeyd: "FIN və əməkdaş NO üzrə uyğunlaşdırıldı" },
];

const seedDetails: UploadRowDetail[] = seedRows.map((r, i) => ({ no: i + 1, ...r }));

// Nümunə uyğunsuz fayl — bir sətirdə FIN/əməkdaş kodu üst-üstə düşmür
const mismatchRows: UploadRowDetail[] = [
  { no: 1, firstName: "Aysel",   lastName: "Quliyeva", fatherName: "Vidadi", monthPay: 2100, totalPaid: 6300, avgMonthly: 2100, pctCurrent: 100, pct12m: 100, status: "Uyğunlaşdırıldı", qeyd: "FIN üzrə uyğunlaşdırıldı" },
  { no: 2, firstName: "Tural",   lastName: "İsmayılov", fatherName: "Akif",  monthPay: 2300, totalPaid: 6900, avgMonthly: 2300, pctCurrent: 100, pct12m: 100, status: "Uyğunlaşdırıldı", qeyd: "FIN üzrə uyğunlaşdırıldı" },
  { no: 3, firstName: "Vüsal",   lastName: "Hüseynli", fatherName: "Ramiz",  monthPay: 1950, totalPaid: 5850, avgMonthly: 1950, pctCurrent: 100, pct12m: 100, status: "Uyğunsuz", qeyd: "FIN və ya əməkdaş kodu sistemdə tapılmadı" },
];

const seed: SalaryUpload[] = [
  {
    id: 1,
    operator: "HR Departamenti",
    year: 2026,
    month: "Mart",
    status: "Aktiv",
    totalAmount: seedDetails.reduce((s, d) => s + d.monthPay, 0),
    totalRows: seedDetails.length,
    matched: seedDetails.filter(d => d.status === "Uyğunlaşdırıldı").length,
    unmatched: seedDetails.filter(d => d.status !== "Uyğunlaşdırıldı").length,
    fileName: "emekhaqqi_mart_2026.xlsx",
    uploadedBy: "Admin",
    createdAt: new Date().toISOString(),
    title: "Əməkhaqqı detalları",
    details: seedDetails,
  },
  {
    id: 2,
    operator: "HR Departamenti",
    year: 2026,
    month: "Aprel",
    status: "Aktiv",
    totalAmount: mismatchRows.reduce((s, d) => s + d.monthPay, 0),
    totalRows: mismatchRows.length,
    matched: mismatchRows.filter(d => d.status === "Uyğunlaşdırıldı").length,
    unmatched: mismatchRows.filter(d => d.status !== "Uyğunlaşdırıldı").length,
    fileName: "emekhaqqi_aprel_2026_uygunsuzluq.xlsx",
    uploadedBy: "Admin",
    createdAt: new Date().toISOString(),
    title: "Əməkhaqqı detalları (nümunə: uyğunsuzluq)",
    details: mismatchRows,
  },
];

const load = (): SalaryUpload[] => {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(STORAGE, JSON.stringify(seed));
  return seed;
};

const save = (list: SalaryUpload[]) => {
  localStorage.setItem(STORAGE, JSON.stringify(list));
  window.dispatchEvent(new Event("salary-uploads-updated"));
};

export const getUploads = (): SalaryUpload[] => load();

export const addUpload = (data: Omit<SalaryUpload, "id" | "createdAt">) => {
  const list = load();
  const id = list.length ? Math.max(...list.map(r => r.id)) + 1 : 1;
  list.push({ ...data, id, createdAt: new Date().toISOString() });
  save(list);
  return list;
};
