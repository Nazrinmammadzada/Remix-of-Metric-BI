// Kaskad yüklənməsi (Cascade Load) təsdiq pop-up-ı — rəhbər hədəf təyin etdikdən sonra çıxır.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";
import { useCascadeLoad } from "@/lib/managerCascadeLoadStore";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: number;
  unit: string;
  onConfirm: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat("az-AZ").format(n);

const CascadeLoadConfirmDialog = ({ open, onOpenChange, value, unit, onConfirm }: Props) => {
  const hasLoad = value > 0;
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
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
            Sizin üzərinizdə <span className="font-semibold">{fmt(value)} {unit}</span> məbləğində
            <span className="font-semibold"> Cascade Load</span> mövcuddur.
            Bu limit sizə <span className="italic">başqa kartdan</span> gəlir və hazırda təyin etdiyiniz hədəflə əlaqəsi yoxdur.
            Onu tabeliyinizdəki əməkdaşlar arasında bölüşdürmək istəyirsiniz?
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
            Hazırda sizin üzərinizdə paylanmalı Cascade Load yoxdur.
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bağla</Button>
          {hasLoad && (
            <Button onClick={() => { onConfirm(); onOpenChange(false); }}>Bəli, indi bölüşdür</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CascadeLoadConfirmDialog;
