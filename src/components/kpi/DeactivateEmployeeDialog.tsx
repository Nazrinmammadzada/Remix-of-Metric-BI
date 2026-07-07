import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import type { DeactivationReason } from "@/lib/employeeDeactivation";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employeeName: string;
  reasons: DeactivationReason[];
  onConfirm: () => void;
}

const REASON_BULLETS: Record<DeactivationReason["code"], string> = {
  kpi_active: "Bu əməkdaşın aktiv KPI kartları mövcuddur.",
  approval_chain: "Bu əməkdaş təsdiqləmə zəncirində iştirak edir.",
  structure_leader: "Bu əməkdaş struktur rəhbəri kimi təyin olunub.",
};

export const DeactivateEmployeeDialog = ({ open, onOpenChange, employeeName, reasons, onConfirm }: Props) => {
  const navigate = useNavigate();
  const isSingleKpi = reasons.length === 1 && reasons[0].code === "kpi_active";
  const isSingleLeader = reasons.length === 1 && reasons[0].code === "structure_leader";
  const leaderReason = reasons.find((r) => r.code === "structure_leader");
  const leader = isSingleLeader ? reasons[0] : null;
  const hasLeaderInMulti = !isSingleLeader && !!leaderReason;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {isSingleKpi
              ? "Aktiv KPI kartları mövcuddur"
              : isSingleLeader
                ? leader!.title
                : "Əməkdaş passiv edilərkən diqqət tələb olunur"}
          </DialogTitle>
        </DialogHeader>

        {isSingleKpi ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Bu əməkdaşın aktiv KPI kartları mövcuddur.</p>
            <p className="text-foreground">Passiv etməyə davam etmək istəyirsiniz?</p>
          </div>
        ) : isSingleLeader ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{leader!.message}</p>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-foreground">
              <span className="font-medium">{employeeName}</span> passiv ediləcək.
            </p>
            <p className="text-muted-foreground">Aşağıdakı aktiv əlaqələr aşkar edilmişdir:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground">
              {reasons.map((r) => (
                <li key={r.code}>{REASON_BULLETS[r.code]}</li>
              ))}
            </ul>
            <p className="text-muted-foreground">
              Bu əməkdaşı passiv etməyiniz həmin proseslərə təsir göstərə bilər. Davam etmək istədiyinizə əminsiniz?
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
          >
            Ləğv et
          </button>
          {isSingleLeader || hasLeaderInMulti ? (
            <button
              onClick={() => {
                const r = (isSingleLeader ? leader! : leaderReason!);
                onOpenChange(false);
                if (r.targetRoute) navigate(r.targetRoute);
              }}
              className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Rəhbəri dəyiş
            </button>
          ) : (
            <button
              onClick={() => { onConfirm(); onOpenChange(false); }}
              className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Yenə də passiv et
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeactivateEmployeeDialog;
