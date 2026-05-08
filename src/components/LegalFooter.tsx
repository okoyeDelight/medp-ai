import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";

/**
 * Fixed legal disclaimer footer for dashboard/search pages.
 * Stays visible above BottomNav.
 */
export function LegalFooter() {
  return (
    <div className="sticky bottom-[57px] z-20 border-t border-border bg-muted/95 backdrop-blur">
      <div className="container max-w-2xl space-y-1 px-4 py-2">
        <p className="text-[10px] leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground">Academic & Clinical Decision Support:</span>{" "}
          MedP-AI provides evidence-based pharmaceutical information for academic purposes only and is{" "}
          <span className="font-semibold">not a substitute for professional diagnosis</span>. Always
          consult a licensed pharmacist or doctor.{" "}
          <Link to="/privacy-policy" className="underline hover:text-foreground">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link to="/terms-of-service" className="underline hover:text-foreground">
            Terms
          </Link>
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3 w-3" />
            <a href="mailto:chinedubisiola04@gmail.com" className="underline hover:text-foreground">
              chinedubisiola04@gmail.com
            </a>
          </span>
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <a href="tel:+2349079543695" className="underline hover:text-foreground">
              +234 907 954 3695
            </a>
          </span>
        </p>
      </div>
    </div>
  );
}
