import { useMemo, useState } from "react";
import { Lock, ChevronRight, CheckCircle2, Star } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingCircles } from "@/components/evaluation/RatingCircles";
import {
  buildPeerAssignments,
  CURRENT_CYCLE_ID,
  EVALUATION_CATEGORIES,
  CategoryKey,
  getInitials,
  MockEmployee,
} from "@/data/mockData";
import { submitPeerReviews, hasReviewerSubmitted } from "@/lib/peerReviewStore";
import { toast } from "sonner";

type ScoresMap = Record<CategoryKey, number>;
const initialScores = (): ScoresMap =>
  EVALUATION_CATEGORIES.reduce((acc, c) => ({ ...acc, [c.key]: 0 }), {} as ScoresMap);

interface PeerEvaluationDialogProps {
  reviewerId: string;
  cycleId?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
}

export const PeerEvaluationDialog = ({
  reviewerId,
  cycleId = CURRENT_CYCLE_ID,
  triggerLabel = "Qiymətləndirməyə başla",
  triggerVariant = "default",
}: PeerEvaluationDialogProps) => {
  const [open, setOpen] = useState(false);
  const peers = useMemo(() => buildPeerAssignments(cycleId)[reviewerId] || [], [cycleId, reviewerId]);
  const alreadySubmitted = useMemo(() => hasReviewerSubmitted(reviewerId, cycleId), [open, reviewerId, cycleId]);

  const [activeTab, setActiveTab] = useState<string>(peers[0]?.id || "");
  const [scoresByPeer, setScoresByPeer] = useState<Record<string, ScoresMap>>(() =>
    peers.reduce((acc, p) => ({ ...acc, [p.id]: initialScores() }), {})
  );
  const [commentsByPeer, setCommentsByPeer] = useState<Record<string, string>>(() =>
    peers.reduce((acc, p) => ({ ...acc, [p.id]: "" }), {})
  );

  // 0 bal da etibarlı seçimdir — tab "tamamlanmış" sayılır.
  const isPeerComplete = (_id: string) => true;
  const allComplete = peers.length > 0;

  const updateScore = (peerId: string, cat: CategoryKey, value: number) =>
    setScoresByPeer((prev) => ({ ...prev, [peerId]: { ...prev[peerId], [cat]: value } }));

  const goNext = () => {
    const idx = peers.findIndex((p) => p.id === activeTab);
    if (idx < peers.length - 1) setActiveTab(peers[idx + 1].id);
  };

  const submit = () => {
    if (!allComplete) return;
    submitPeerReviews(
      peers.map((p) => ({
        cycleId,
        reviewerId,
        revieweeId: p.id,
        scores: scoresByPeer[p.id],
        comment: commentsByPeer[p.id] || "",
      }))
    );
    toast.success("Qiymətləndirmə təsdiqləndi", {
      description: `${peers.length} həmkar üçün anonim qiymət göndərildi.`,
    });
    setOpen(false);
  };

  if (peers.length === 0) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Star className="w-4 h-4" />
        Qiymətləndirmə üçün həmkar yoxdur
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className="gap-2">
          <Star className="w-4 h-4" />
          {alreadySubmitted ? "Qiymətləndirməni yenilə" : triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Anonim Həmkar Qiymətləndirməsi
          </DialogTitle>
          <DialogDescription>
            Hər həmkarınızı 5 kateqoriya üzrə qiymətləndirin — hər kateqoriyada 0-dan 5-ə qədər dairə ilə bal verin. Qiymətlər tam anonimdir.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {peers.map((p, i) => (
              <TabsTrigger key={p.id} value={p.id} className="gap-2">
                {isPeerComplete(p.id) && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                <span className="truncate">Həmkar {i + 1}: {p.fullName.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {peers.map((p) => (
            <TabsContent key={p.id} value={p.id} className="space-y-4 pt-4">
              <PeerHeaderCard peer={p} />

              <div className="flex items-start gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  Sizin verdiyiniz qiymət <strong>anonimdir</strong>. Qiymətləndirilən şəxs kimin qiymət verdiyini görməyəcək.
                </p>
              </div>

              <div className="space-y-5">
                {EVALUATION_CATEGORIES.map((cat) => (
                  <div key={cat.key} className="space-y-2 p-3 rounded-lg border border-border bg-background">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-foreground">{cat.label}</label>
                      <Badge variant={scoresByPeer[p.id][cat.key] > 0 ? "default" : "secondary"}>
                        {scoresByPeer[p.id][cat.key]} / 5 bal
                      </Badge>
                    </div>
                    <RatingCircles
                      value={scoresByPeer[p.id][cat.key]}
                      onChange={(v) => updateScore(p.id, cat.key, v)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Anonim şərh <span className="text-muted-foreground font-normal">(opsional)</span>
                </label>
                <Textarea
                  placeholder="Bu həmkar haqqında anonim şərhinizi qeyd edin..."
                  value={commentsByPeer[p.id]}
                  onChange={(e) =>
                    setCommentsByPeer((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="gap-2">
          {peers.findIndex((p) => p.id === activeTab) < peers.length - 1 ? (
            <Button variant="outline" onClick={goNext} className="gap-2">
              Növbəti həmkara keç <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button disabled={!allComplete} onClick={submit} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Bütün qiymətləndirmələri təsdiqlə
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PeerHeaderCard = ({ peer }: { peer: MockEmployee }) => (
  <Card className="p-4 flex items-center gap-3">
    <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
      {getInitials(peer.fullName)}
    </div>
    <div className="min-w-0">
      <p className="text-base font-semibold text-foreground truncate">{peer.fullName}</p>
      <p className="text-xs text-muted-foreground truncate">
        {peer.position} · {peer.department}
      </p>
    </div>
  </Card>
);
