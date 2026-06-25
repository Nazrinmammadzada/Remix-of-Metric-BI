import { useRef } from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";

interface Props {
  label?: string;
  onImported?: (file: File) => void;
  variant?: "primary" | "outline";
}

const ExcelImportButton = ({ label = "Excel import", onImported, variant = "outline" }: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      toast.error("Yalnız Excel (.xlsx, .xls, .csv) faylları dəstəklənir");
      return;
    }
    onImported?.(f);
    toast.success(`"${f.name}" yükləndi və emal üçün göndərildi`);
    e.target.value = "";
  };
  const cls = variant === "primary"
    ? "bg-primary text-primary-foreground hover:opacity-90"
    : "bg-card border border-border text-foreground hover:bg-secondary";
  return (
    <>
      <button onClick={() => ref.current?.click()} className={`px-3 py-2 text-sm rounded-lg font-medium flex items-center gap-2 ${cls}`}>
        <FileUp className="w-4 h-4" /> {label}
      </button>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" onChange={handle} className="hidden" />
    </>
  );
};

export default ExcelImportButton;
