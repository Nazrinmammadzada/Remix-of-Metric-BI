import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import type { DeactivationReason } from "@/lib/employeeDeactivation";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employeeName: string;
  reasons: DeactivationReason[];
}

export const DeactivateEmployeeDialog = ({ open, onOpenChange, employeeName, reasons }: Props) => {
  const navigate = useNavigate();
  const isMulti = reasons.length > 1;
  const primary = reasons[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {isMulti ? "Əməkdaş passiv edilə bilməz" : primary?.title}
          </DialogTitle>
        </DialogHeader>
        {isMulti ? (
          <div className="space-y-3 text-sm">
            <p className="text-foreground">
              <span className="font-medium">{employeeName}</span> passiv edilə bilməz.
            </p>
            <p className="text-muted-foreground">Səbəblər:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground">
              {reasons.map((r) => (
                <li key={r.code}>{r.message.split(".")[0]}.</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{primary?.message}</p>
        )}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          {primary?.targetRoute && (
            <button
              onClick={() => {
                onOpenChange(false);
                navigate(primary.targetRoute!);
              }}
              className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              {primary.primaryLabel}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeactivateEmployeeDialog;
