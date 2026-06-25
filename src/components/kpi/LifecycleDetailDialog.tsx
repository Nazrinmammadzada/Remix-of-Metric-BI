import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CardLifecycle } from "@/lib/kpiLifecycleStore";
import LifecycleView from "./LifecycleView";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lifecycle: CardLifecycle | null;
}

const LifecycleDetailDialog = ({ open, onOpenChange, lifecycle }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>KPI Lifecycle — {lifecycle?.cardName ?? "—"}</DialogTitle>
        </DialogHeader>
        <LifecycleView lifecycle={lifecycle} />
      </DialogContent>
    </Dialog>
  );
};

export default LifecycleDetailDialog;
