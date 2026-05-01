// Hospital-style Doctor Report — generates a professional PDF + share helpers.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DoseLog } from "@/lib/diary";
import { fetchVitals } from "@/lib/vitals";
import { REMEDIES } from "@/data/remedies";

export interface ReportPatient {
  name?: string;
  age?: string;
  sex?: string;
  phone?: string;
}

const BRAND = {
  primary: [37, 99, 150] as [number, number, number], // deep medical blue
  ink: [25, 25, 30] as [number, number, number],
  muted: [110, 115, 125] as [number, number, number],
  rule: [200, 205, 215] as [number, number, number],
  warn: [200, 50, 50] as [number, number, number],
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function feelLabel(feel: string | null | undefined) {
  if (!feel) return "—";
  return feel.charAt(0).toUpperCase() + feel.slice(1);
}

/** Build the PDF document. Returns the jsPDF instance. */
export function buildDoctorReportPdf(
  logs: DoseLog[],
  patient: ReportPatient = {},
  days = 7,
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = logs.filter((l) => new Date(l.taken_at).getTime() >= since);
  const reportId = `MEDP-${Date.now().toString(36).toUpperCase()}`;
  const generated = new Date();

  // ── Letterhead ────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageW, 70, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MedP-AI Health Clinic", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Pharmacy-Student Triage System · Lagos, Nigeria", margin, 48);
  doc.text("contact@medp-ai.app", margin, 60);

  // Right-aligned report meta
  doc.setFontSize(9);
  doc.text(`Report ID: ${reportId}`, pageW - margin, 32, { align: "right" });
  doc.text(`Generated: ${fmtDate(generated)}`, pageW - margin, 48, { align: "right" });
  doc.text(`Period: Last ${days} days`, pageW - margin, 60, { align: "right" });

  // ── Title ─────────────────────────────────────────────────────────────────
  let y = 100;
  doc.setTextColor(...BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("HERBAL REMEDY USE REPORT", pageW / 2, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    "For clinician / pharmacist review · Self-reported by patient via MedP-AI app",
    pageW / 2,
    y + 14,
    { align: "center" },
  );
  y += 32;

  // ── Patient section ───────────────────────────────────────────────────────
  doc.setDrawColor(...BRAND.rule);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text("PATIENT INFORMATION", margin, y);
  y += 14;

  const patientRows: [string, string][] = [
    ["Name", patient.name?.trim() || "Anonymous (app user)"],
    ["Age", patient.age?.trim() || "—"],
    ["Sex", patient.sex?.trim() || "—"],
    ["Phone", patient.phone?.trim() || "—"],
    ["Report Date", fmtDate(generated)],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.ink);
  const labelX = margin;
  const valueX = margin + 90;
  patientRows.forEach(([label, value]) => {
    doc.setTextColor(...BRAND.muted);
    doc.text(`${label}:`, labelX, y);
    doc.setTextColor(...BRAND.ink);
    doc.text(value, valueX, y);
    y += 14;
  });

  y += 6;
  doc.setDrawColor(...BRAND.rule);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  // ── Summary stats ─────────────────────────────────────────────────────────
  const uniqueRemedies = new Set(recent.map((l) => l.remedy_id));
  const feelCounts = recent.reduce(
    (acc, l) => {
      if (l.feel === "better") acc.better += 1;
      else if (l.feel === "worse") acc.worse += 1;
      else if (l.feel === "same") acc.same += 1;
      return acc;
    },
    { better: 0, same: 0, worse: 0 },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text("CLINICAL SUMMARY", margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.ink);
  const summaryLines = [
    `Total doses recorded: ${recent.length}`,
    `Distinct herbal remedies used: ${uniqueRemedies.size}`,
    `Self-reported outcomes — Better: ${feelCounts.better} · Same: ${feelCounts.same} · Worse: ${feelCounts.worse}`,
  ];
  summaryLines.forEach((line) => {
    doc.text(`• ${line}`, margin + 4, y);
    y += 14;
  });
  y += 6;

  // ── Medication / Remedy log table ────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text("HERBAL INTAKE LOG", margin, y);
  y += 8;

  if (recent.length === 0) {
    y += 14;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    doc.text(`No herbal remedies recorded in the last ${days} days.`, margin, y);
    y += 18;
  } else {
    autoTable(doc, {
      startY: y + 4,
      head: [["Date / Time", "Remedy", "Local Name", "Dose", "Patient Feel"]],
      body: recent.map((l) => [
        fmtDateTime(l.taken_at),
        l.remedy_name,
        l.remedy_local_name,
        l.dose,
        feelLabel(l.feel),
      ]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5, textColor: BRAND.ink, lineColor: BRAND.rule },
      headStyles: { fillColor: BRAND.primary, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error lastAutoTable plugin attaches at runtime
    y = (doc.lastAutoTable?.finalY ?? y) + 18;
  }

  // ── Science snapshot per remedy ──────────────────────────────────────────
  const usedIds = Array.from(new Set(recent.map((l) => l.remedy_id)));
  const sciRemedies = usedIds
    .map((id) => REMEDIES.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r?.science));

  if (sciRemedies.length > 0) {
    if (y > pageH - 200) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.primary);
    doc.text("PHARMACOLOGICAL NOTES (Science Snapshot)", margin, y);
    y += 6;
    doc.setDrawColor(...BRAND.rule);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 14;

    sciRemedies.forEach((r) => {
      const s = r.science!;
      const block: [string, string][] = [
        ["Remedy", `${r.name} (${r.localName})`],
        ["Active phytochemicals", s.phytochemicals.join(", ")],
        ["Clinical evidence", `${s.evidence.summary} [${s.evidence.citation}]`],
        ["Toxicity (LD50)", s.toxicity.ld50 ?? "Not established"],
        ["Toxicity notes", s.toxicity.notes],
        ...(s.cypInteraction ? ([["Pharmacokinetic flag", s.cypInteraction]] as [string, string][]) : []),
        ["Source", `${s.source.label} — ${s.source.url}`],
      ];

      // estimate height
      const estH = block.length * 14 + 22;
      if (y + estH > pageH - margin - 60) {
        doc.addPage();
        y = margin;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...BRAND.ink);
      doc.text(`${r.emoji} ${r.name} — ${r.localName}`, margin, y);
      y += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      block.slice(1).forEach(([label, value]) => {
        const wrapped = doc.splitTextToSize(value, pageW - margin * 2 - 110);
        doc.setTextColor(...BRAND.muted);
        doc.text(`${label}:`, margin + 4, y);
        doc.setTextColor(...BRAND.ink);
        doc.text(wrapped, margin + 110, y);
        y += wrapped.length * 11 + 2;
      });
      y += 8;
    });
  }

  // ── Disclaimer + signature ───────────────────────────────────────────────
  if (y > pageH - 130) {
    doc.addPage();
    y = margin;
  }
  doc.setDrawColor(...BRAND.rule);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.warn);
  doc.text("CLINICAL DISCLAIMER", margin, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.ink);
  const disc = doc.splitTextToSize(
    "MedP-AI is an educational triage app built by a pharmacy student. Entries are self-reported and have NOT been verified by a licensed clinician. This document is intended to support — not replace — your clinical assessment. Please verify all herb-drug interactions before prescribing or dispensing.",
    pageW - margin * 2,
  );
  doc.text(disc, margin, y);
  y += disc.length * 11 + 18;

  // signature line
  const signY = Math.min(y, pageH - 60);
  doc.setDrawColor(...BRAND.ink);
  doc.setLineWidth(0.7);
  doc.line(margin, signY, margin + 200, signY);
  doc.line(pageW - margin - 200, signY, pageW - margin, signY);
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text("Reviewing Pharmacist / Doctor", margin, signY + 12);
  doc.text("Date", pageW - margin - 200, signY + 12);

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(
      `MedP-AI · Report ${reportId} · Page ${i} of ${pageCount}`,
      pageW / 2,
      pageH - 18,
      { align: "center" },
    );
  }

  return doc;
}

export function downloadReport(
  logs: DoseLog[],
  patient: ReportPatient = {},
  days = 7,
): string {
  const doc = buildDoctorReportPdf(logs, patient, days);
  const fname = `MedP-AI-Doctor-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
  return fname;
}

export function reportBlob(
  logs: DoseLog[],
  patient: ReportPatient = {},
  days = 7,
): { blob: Blob; filename: string } {
  const doc = buildDoctorReportPdf(logs, patient, days);
  const filename = `MedP-AI-Doctor-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  return { blob: doc.output("blob"), filename };
}

/** Try Web Share API with the PDF file; fall back to download + WhatsApp text. */
export async function shareReportWhatsApp(
  logs: DoseLog[],
  patient: ReportPatient = {},
  days = 7,
): Promise<"shared" | "downloaded"> {
  const { blob, filename } = reportBlob(logs, patient, days);
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({
        files: [file],
        title: "MedP-AI Doctor Report",
        text: "My 7-day herbal remedy report from MedP-AI.",
      });
      return "shared";
    } catch (e) {
      // user cancelled — fall through to fallback
      console.warn("share cancelled", e);
    }
  }
  // Fallback: download the file then open WhatsApp with a text message.
  downloadReport(logs, patient, days);
  const msg = encodeURIComponent(
    "Hi — please find attached my MedP-AI 7-day herbal remedy report (PDF). Thank you.",
  );
  window.open(`https://wa.me/?text=${msg}`, "_blank");
  return "downloaded";
}

export async function shareReportEmail(
  logs: DoseLog[],
  patient: ReportPatient = {},
  days = 7,
): Promise<"shared" | "downloaded"> {
  const { blob, filename } = reportBlob(logs, patient, days);
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({
        files: [file],
        title: "MedP-AI Doctor Report",
        text: "My 7-day herbal remedy report.",
      });
      return "shared";
    } catch (e) {
      console.warn("share cancelled", e);
    }
  }
  downloadReport(logs, patient, days);
  const subject = encodeURIComponent("MedP-AI Doctor Report (7-day)");
  const body = encodeURIComponent(
    "Hello,\n\nPlease find attached my MedP-AI 7-day herbal remedy report.\n\nThank you.",
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  return "downloaded";
}
