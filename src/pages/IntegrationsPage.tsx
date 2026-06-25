import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { Database, Mail, Shield, Boxes, Settings as SettingsIcon, Sparkles, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import chrLogo from "@/assets/chr-logo.jpeg";
import ExportMenu from "@/components/common/ExportMenu";

interface DataField { name: string; description: string; }
interface IntegrationError { code: string; message: string; time: string; }
interface Integration {
  name: string; fullName: string; description: string;
  status: "Aktiv" | "Xəta"; errorCount?: number;
  icon: any; logo?: string; details: string;
  modules: string[]; lastSync: string; dataFields: DataField[];
  direction: "in" | "out";
  errors?: IntegrationError[];
}

const integrations: Integration[] = [
  {
    name: "CHR", fullName: "Core Human Resources",
    description: "HR idarəetmə sistemi inteqrasiyası",
    status: "Aktiv", icon: Boxes, logo: chrLogo, direction: "in",
    details: "CHR sistemindən işçi məlumatları və maaş hesablamaları daxil olur.",
    modules: ["İşçi Məlumatları", "Maaş Hesablaması", "Davamiyyət", "Məzuniyyət"],
    lastSync: "14.04.2026 09:30",
    dataFields: [
      { name: "employee_id", description: "Əməkdaş identifikatoru" },
      { name: "full_name", description: "Tam ad və soyad" },
      { name: "department_code", description: "Departament kodu" },
      { name: "position_title", description: "Vəzifə adı" },
      { name: "base_salary", description: "Baza maaş (AZN)" },
      { name: "hire_date", description: "İşə qəbul tarixi" },
    ],
  },
  {
    name: "CRM Sistemi", fullName: "Customer Relationship Management",
    description: "Müştəri əlaqələri sistemi",
    status: "Aktiv", icon: Database, direction: "in",
    details: "CRM sistemindən müştəri və satış göstəriciləri daxil olur.",
    modules: ["Müştəri Bazası", "Satış Pipeline", "CSAT"],
    lastSync: "14.04.2026 08:45",
    dataFields: [
      { name: "sales_total", description: "Dövrlük satış cəmi" },
      { name: "new_customers", description: "Yeni müştəri sayı" },
      { name: "pipeline_value", description: "Aktiv pipeline (AZN)" },
      { name: "csat_score", description: "Müştəri məmnuniyyət xalı" },
    ],
  },
  {
    name: "SIEM Platform", fullName: "Security Incident & Event Management",
    description: "Kibertəhlükəsizlik hadisələrinin ötürülməsi",
    status: "Xəta", errorCount: 1, icon: Shield, direction: "out",
    details: "Sistemdən insident və audit hadisələri SIEM platformasına ötürülür.",
    modules: ["İnsidentlər", "Audit Logları"],
    lastSync: "14.04.2026 11:00",
    dataFields: [
      { name: "incident_id", description: "İnsident identifikatoru" },
      { name: "severity_level", description: "Təhlükə səviyyəsi" },
      { name: "compliance_score", description: "Uyğunluq xalı (%)" },
    ],
    errors: [
      { code: "SIEM-503", message: "API timeout — endpoint cavab vermir (30s)", time: "14.04.2026 10:55" },
    ],
  },
  {
    name: "Microsoft 365", fullName: "Microsoft 365 Suite",
    description: "Hesabat və bildirişlərin ötürülməsi",
    status: "Xəta", errorCount: 3, icon: Mail, direction: "out",
    details: "Outlook, Excel və Teams kanallarına hesabatlar göndərilir.",
    modules: ["Outlook E-poçt", "Excel Hesabatlar", "Teams Bildirişlər"],
    lastSync: "14.04.2026 10:15",
    dataFields: [
      { name: "report_file_url", description: "Excel hesabat linki" },
      { name: "calendar_events", description: "Təqvim hadisələri" },
      { name: "teams_channel_id", description: "Teams kanal ID" },
    ],
    errors: [
      { code: "M365-401", message: "OAuth token müddəti bitib", time: "14.04.2026 09:00" },
      { code: "M365-429", message: "API rate-limit aşılıb", time: "14.04.2026 09:30" },
      { code: "M365-500", message: "Teams kanal tapılmadı (channel_id: prj-42)", time: "14.04.2026 10:10" },
    ],
  },
];

const StatusBadge = ({ item }: { item: Integration }) => {
  if (item.status === "Xəta") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-zone-red-bg text-zone-red-text">
        <AlertTriangle className="w-3 h-3" />
        Xəta
        <span className="ml-1 px-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold inline-flex items-center justify-center">{item.errorCount}</span>
      </span>
    );
  }
  return <span className="px-3 py-1 text-xs font-medium rounded-full bg-zone-green-bg text-zone-green-text">Aktiv</span>;
};

const IntegrationsPage = () => {
  const [tab, setTab] = useState<"in" | "out">("in");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [settingsFor, setSettingsFor] = useState<Integration | null>(null);
  const [errorFor, setErrorFor] = useState<Integration | null>(null);
  const [pickedFields, setPickedFields] = useState<Record<string, string[]>>({});

  const visible = useMemo(() => integrations.filter(i => i.direction === tab), [tab]);

  const toggleField = (intName: string, field: string) => {
    setPickedFields(prev => {
      const cur = prev[intName] || [];
      return { ...prev, [intName]: cur.includes(field) ? cur.filter(f => f !== field) : [...cur, field] };
    });
  };

  const buildExportData = () => ({
    title: tab === "in" ? "Məlumat daxil olan inteqrasiyalar" : "Məlumat ötürülən inteqrasiyalar",
    headers: ["Ad", "Status", "İstiqamət", "Son sinxronizasiya", "Modullar"],
    rows: visible.map(i => [
      i.name,
      i.status,
      i.direction === "in" ? "Daxil olan" : "Ötürülən",
      i.lastSync,
      i.modules.join(" | "),
    ]),
    fileName: `inteqrasiyalar-${tab}`,
  });

  return (
    <div className="min-h-screen">
      <Header title="İnteqrasiyalar" />
      <main className="p-6 pb-24">
        <PageHero
          badge="Sistem Bağlantıları"
          icon={Sparkles}
          title="İnteqrasiyalar"
          subtitle="Daxil olan və ötürülən sistem bağlantılarını idarə edin"
          right={<ExportMenu getData={buildExportData} />}
        />


        <div className="flex gap-1 border-b border-border mb-4">
          <button
            onClick={() => setTab("in")}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${tab === "in" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ArrowDownToLine className="w-4 h-4" /> Məlumat daxil olması
          </button>
          <button
            onClick={() => setTab("out")}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${tab === "out" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ArrowUpFromLine className="w-4 h-4" /> Məlumat ötürülməsi
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((item, i) => (
            <div key={i} className="bg-card rounded-xl p-5 border border-border flex items-center gap-4 hover:shadow-md transition-shadow">
              <div onClick={() => setSelectedIntegration(item)} className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center cursor-pointer overflow-hidden">
                {item.logo ? (
                  <img src={item.logo} alt={item.name} className="w-9 h-9 object-contain" />
                ) : (
                  <item.icon className="w-6 h-6 text-primary" />
                )}
              </div>
              <div onClick={() => setSelectedIntegration(item)} className="flex-1 cursor-pointer min-w-0">
                <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
              </div>
              {item.status === "Xəta" ? (
                <button onClick={(e) => { e.stopPropagation(); setErrorFor(item); }} className="cursor-pointer">
                  <StatusBadge item={item} />
                </button>
              ) : (
                <StatusBadge item={item} />
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setSettingsFor(item); }}
                title="Ayarlar"
                className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center transition-colors shrink-0"
              >
                <SettingsIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="md:col-span-2 p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              Bu kateqoriyada inteqrasiya yoxdur
            </div>
          )}
        </div>
      </main>

      {/* Settings — burada mübadilə olunan məlumatlar göstərilir və seçilə bilər */}
      <Dialog open={!!settingsFor} onOpenChange={() => setSettingsFor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {settingsFor && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-primary" /> {settingsFor.name} — Ayarlar
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Mübadilə olunan məlumatlar
                    <span className="ml-2 text-xs text-muted-foreground">(qiymətləndiriciyə təyin etmək üçün seçin)</span>
                  </p>
                  <div className="border border-border rounded-lg divide-y divide-border">
                    {settingsFor.dataFields.map((f) => {
                      const checked = (pickedFields[settingsFor.name] || []).includes(f.name);
                      return (
                        <label key={f.name} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${checked ? "bg-primary/5" : "hover:bg-muted/40"}`}>
                          <Checkbox checked={checked} onCheckedChange={() => toggleField(settingsFor.name, f.name)} />
                          <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">{f.name}</code>
                          <span className="text-xs text-muted-foreground truncate">{f.description}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Seçilmiş sahələr KPI yaradılışında qiymətləndirici (inteqrasiya) kimi istifadə oluna bilər.
                  </p>
                </div>
              </div>
              <button onClick={() => setSettingsFor(null)} className="w-full py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium">Bağla</button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Error details */}
      <Dialog open={!!errorFor} onOpenChange={() => setErrorFor(null)}>
        <DialogContent className="max-w-2xl">
          {errorFor && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" /> {errorFor.name} — Xəta detalları
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {(errorFor.errors || []).map((e, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-destructive/10 text-destructive">{e.code}</span>
                      <span className="text-[11px] text-muted-foreground">{e.time}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-foreground">{e.message}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Integration details — yalnız ümumi məlumat (mübadilə sahələri ayarlarda göstərilir) */}
      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                    {selectedIntegration.logo ? (
                      <img src={selectedIntegration.logo} alt={selectedIntegration.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <selectedIntegration.icon className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <DialogTitle>{selectedIntegration.name}</DialogTitle>
                    <p className="text-xs text-muted-foreground">{selectedIntegration.fullName}</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge item={selectedIntegration} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Son sinxronizasiya</p>
                  <p className="text-sm font-medium text-foreground">{selectedIntegration.lastSync}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Təsvir</p>
                  <p className="text-sm text-muted-foreground">{selectedIntegration.details}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">İnteqrasiya Modulları</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedIntegration.modules.map((m, i) => (
                      <span key={i} className="px-3 py-1 text-xs rounded-full bg-secondary text-foreground">{m}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
                  <SettingsIcon className="w-3.5 h-3.5 inline mr-1.5" />
                  Mübadilə olunan məlumat sahələrini görmək və qiymətləndirici üçün seçmək üçün
                  yuxarıdakı <span className="font-medium text-foreground">Ayarlar</span> düyməsindən istifadə edin.
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;
