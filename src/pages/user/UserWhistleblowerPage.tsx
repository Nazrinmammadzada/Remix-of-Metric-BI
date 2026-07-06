import { useState, useRef, useMemo } from "react";
import { Shield, Plus, Upload, FileText, Check, X, ChevronRight, ChevronLeft, CheckCircle2, Paperclip } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { WB_CATEGORIES, createReport, type WBAttachment } from "@/lib/whistleblowerStore";
import { useCatalogValues } from "@/lib/dropdownCatalogStore";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_SIZE = 10 * 1024 * 1024;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const NewReportDialog = ({ onCreated }: { onCreated: (id: string) => void }) => {
  const wbCategories = useCatalogValues("whistleblower_categories", [...WB_CATEGORIES]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [extraNote, setExtraNote] = useState("");
  const [files, setFiles] = useState<WBAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(1);
    setCategory("");
    setTitle("");
    setDescription("");
    setExtraNote("");
    setFiles([]);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const handleFiles = async (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const accepted: WBAttachment[] = [];
    for (const f of arr) {
      if (!ACCEPTED.includes(f.type)) {
        toast.error(`${f.name}: dəstəklənməyən format`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name}: 10MB-dan böyükdür`);
        continue;
      }
      const dataUrl = await fileToDataUrl(f);
      accepted.push({ name: f.name, size: f.size, type: f.type, dataUrl });
    }
    setFiles((prev) => [...prev, ...accepted]);
  };

  const removeFile = (i: number) => setFiles((p) => p.filter((_, idx) => idx !== i));

  const canNext1 = category && title.trim().length >= 3 && description.trim().length >= 5;

  const submit = () => {
    const r = createReport({
      category,
      title: title.trim(),
      description: description.trim(),
      extraNote: extraNote.trim() || undefined,
      attachments: files,
    });
    setOpen(false);
    reset();
    onCreated(r.id);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="w-4 h-4" /> Yeni Bildiriş Göndər
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Anonim Bildiriş</DialogTitle>
          <DialogDescription>
            Şəxsiyyətiniz tam anonim qalır. Addım {step}/3
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step >= (s as 1 | 2 | 3)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Kateqoriya *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Kateqoriya seçin" /></SelectTrigger>
                <SelectContent>
                  {wbCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Başlıq *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Qısa başlıq" />
            </div>
            <div>
              <Label>Təsvir *</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} placeholder="Hadisəni təfsilatı ilə təsvir edin..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Əlavə açıqlama (istəyə bağlı)</Label>
              <Textarea value={extraNote} onChange={(e) => setExtraNote(e.target.value)} rows={3} maxLength={1000} />
            </div>
            <div>
              <Label>Fayllar (PDF, JPG, PNG · maks 10MB)</Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm">Sürükləyib buraxın və ya seçmək üçün klik edin</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG · maks 10MB</p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </div>
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{f.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Kateqoriya</span><span className="font-medium">{category}</span></div>
                <div><span className="text-muted-foreground">Başlıq:</span> <span className="font-medium">{title}</span></div>
                <div>
                  <span className="text-muted-foreground">Təsvir:</span>
                  <p className="mt-1 whitespace-pre-wrap">{description}</p>
                </div>
                {extraNote && (
                  <div>
                    <span className="text-muted-foreground">Əlavə açıqlama:</span>
                    <p className="mt-1 whitespace-pre-wrap">{extraNote}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Fayllar:</span> <span>{files.length} ədəd</span>
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Göndərdikdən sonra məlumat anonim şəkildə HR komandasına ötürüləcək.
            </p>
          </div>
        )}

        <DialogFooter className="!justify-between gap-2">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Geri
            </Button>
          ) : <span />}
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 && !canNext1}
              className="gap-2"
            >
              Növbəti <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={submit} className="gap-2"><Check className="w-4 h-4" /> Göndər</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UserWhistleblowerPage = () => {
  const [successId, setSuccessId] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6">
      <PageHero
        icon={Shield}
        title="Anonim Bildiriş"
        subtitle="Etik pozuntular və narahatlıqlar barədə tam anonim şəkildə məlumat verin."
        right={<NewReportDialog onCreated={(id) => setSuccessId(id)} />}
      />

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <Shield className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold mb-1">100% Anonim</h3>
            <p className="text-sm text-muted-foreground">Şəxsiyyətiniz heç bir mərhələdə açıqlanmır.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <FileText className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Sənəd əlavəsi</h3>
            <p className="text-sm text-muted-foreground">Sübut kimi PDF və ya şəkil əlavə edə bilərsiniz.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CheckCircle2 className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold mb-1">İzlənilən proses</h3>
            <p className="text-sm text-muted-foreground">Hər bildiriş unikal ID alır və araşdırılır.</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!successId} onOpenChange={(v) => !v && setSuccessId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <DialogTitle className="text-center">Bildiriş uğurla göndərildi</DialogTitle>
            <DialogDescription className="text-center">
              Məlumatınız tam anonim şəkildə qəbul edildi və araşdırılacaq.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full" onClick={() => setSuccessId(null)}>Bağla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UserWhistleblowerPage;
