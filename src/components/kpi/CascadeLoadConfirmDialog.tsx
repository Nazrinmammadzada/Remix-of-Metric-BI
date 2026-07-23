// Kaskad yüklənməsi (Cascade Load) təsdiq pop-up-ı — rəhbər hədəf təyin etdikdən sonra çıxır.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: number;
  unit: string;
  onConfirm: () => void;
  onDecline?: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat("az-AZ").format(n);

const CascadeLoadConfirmDialog = ({ open, onOpenChange, value, unit, onConfirm, onDecline }: Props) => {
  const hasLoad = Number(value) > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Cascade Load — Bölgü təklifi
          </DialogTitle>
        </DialogHeader>
        {hasLoad ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground space-y-1.5">
            <div>
              Sizə <span className="italic">başqa KPI kartından</span> gələn
              <span className="font-semibold"> Cascade Load</span>:
              <span className="ml-1 font-semibold">{fmt(value)} {unit || ""}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Bu limit hazırda təyin etdiyiniz hədəflə əlaqəli deyil. Tabeliyinizdəki əməkdaşlar arasında bölüşdürmək istəyirsiniz?
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
            Bu hədəf üzrə Cascade Load tapılmadı.
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { onDecline?.(); onOpenChange(false); }}>
            {hasLoad ? "Load istifadə etmədən saxla" : "Bağla"}
          </Button>
          {hasLoad && (
            <Button onClick={() => { onConfirm(); onOpenChange(false); }}>Bəli, indi bölüşdür</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CascadeLoadConfirmDialog;
