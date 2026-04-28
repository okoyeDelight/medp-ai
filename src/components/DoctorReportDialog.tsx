import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, Loader2, Mail, MessageCircle } from "lucide-react";
import {
  downloadReport,
  shareReportEmail,
  shareReportWhatsApp,
  type ReportPatient,
} from "@/lib/doctorReport";
import type { DoseLog } from "@/lib/diary";
import { toast } from "@/hooks/use-toast";

interface DoctorReportDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  logs: DoseLog[];
}

const PATIENT_KEY = "medp-patient-info";

function loadSaved(): ReportPatient {
  try {
    const raw = localStorage.getItem(PATIENT_KEY);
    return raw ? (JSON.parse(raw) as ReportPatient) : {};
  } catch {
    return {};
  }
}

export function DoctorReportDialog({ open, onOpenChange, logs }: DoctorReportDialogProps) {
  const [patient, setPatient] = useState<ReportPatient>(() => loadSaved());
  const [busy, setBusy] = useState<"download" | "wa" | "email" | null>(null);

  function persist(next: ReportPatient) {
    setPatient(next);
    try {
      localStorage.setItem(PATIENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  async function run(action: "download" | "wa" | "email") {
    setBusy(action);
    try {
      if (action === "download") {
        const fname = downloadReport(logs, patient, 7);
        toast({ title: "PDF saved 📄", description: fname });
      } else if (action === "wa") {
        const r = await shareReportWhatsApp(logs, patient, 7);
        toast({
          title: r === "shared" ? "Shared via WhatsApp ✅" : "Saved + opened WhatsApp",
          description:
            r === "shared"
              ? ""
              : "Attach the downloaded PDF to your WhatsApp chat.",
        });
      } else {
        const r = await shareReportEmail(logs, patient, 7);
        toast({
          title: r === "shared" ? "Shared via email ✅" : "Saved + opened email",
          description:
            r === "shared" ? "" : "Attach the downloaded PDF to your email.",
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Couldn't generate report",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 border-foreground p-0 shadow-brutal-lg sm:rounded-lg">
        <DialogHeader className="space-y-1 border-b-2 border-foreground bg-primary px-5 pb-4 pt-5 text-primary-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" strokeWidth={2.5} />
            <DialogTitle className="font-display text-xl uppercase tracking-tight">
              Doctor Report
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-primary-foreground/90">
            Generates a hospital-style PDF with your 7-day herbal log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5">
          <p className="text-xs text-muted-foreground">
            Patient details are optional — leave blank to stay anonymous. Saved on this device only.
          </p>

          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="pn" className="font-mono-tech text-[10px] uppercase">
                Full name
              </Label>
              <Input
                id="pn"
                placeholder="e.g. Adaeze Okeke"
                value={patient.name ?? ""}
                onChange={(e) => persist({ ...patient, name: e.target.value })}
                className="h-11 border-2 border-foreground bg-card shadow-brutal-sm focus-visible:ring-0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pa" className="font-mono-tech text-[10px] uppercase">
                  Age
                </Label>
                <Input
                  id="pa"
                  placeholder="e.g. 27"
                  value={patient.age ?? ""}
                  onChange={(e) => persist({ ...patient, age: e.target.value })}
                  className="h-11 border-2 border-foreground bg-card shadow-brutal-sm focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps" className="font-mono-tech text-[10px] uppercase">
                  Sex
                </Label>
                <Input
                  id="ps"
                  placeholder="F / M"
                  value={patient.sex ?? ""}
                  onChange={(e) => persist({ ...patient, sex: e.target.value })}
                  className="h-11 border-2 border-foreground bg-card shadow-brutal-sm focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pp" className="font-mono-tech text-[10px] uppercase">
                Phone (optional)
              </Label>
              <Input
                id="pp"
                placeholder="e.g. 0803 123 4567"
                value={patient.phone ?? ""}
                onChange={(e) => persist({ ...patient, phone: e.target.value })}
                className="h-11 border-2 border-foreground bg-card shadow-brutal-sm focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button
              size="lg"
              className="h-12 border-2 border-foreground bg-primary font-display text-sm uppercase text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90"
              onClick={() => run("download")}
              disabled={!!busy || logs.length === 0}
            >
              {busy === "download" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}{" "}
              Download PDF
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                variant="outline"
                className="h-11 border-2 border-foreground bg-safe font-display text-xs uppercase text-safe-foreground shadow-brutal-sm brutal-press hover:bg-safe/90"
                onClick={() => run("wa")}
                disabled={!!busy || logs.length === 0}
              >
                {busy === "wa" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}{" "}
                WhatsApp
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 border-2 border-foreground bg-accent font-display text-xs uppercase text-accent-foreground shadow-brutal-sm brutal-press hover:bg-accent/90"
                onClick={() => run("email")}
                disabled={!!busy || logs.length === 0}
              >
                {busy === "email" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}{" "}
                Email
              </Button>
            </div>
          </div>
          <p className="text-center font-mono-tech text-[10px] uppercase text-muted-foreground">
            PDF includes patient info, dose log table, & science snapshot.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
