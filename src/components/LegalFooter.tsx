import { Link } from "react-router-dom";

/**
 * Fixed legal disclaimer footer for dashboard/search pages.
 * Stays visible above BottomNav.
 */
export function LegalFooter() {
  return (
    <div className="sticky bottom-[57px] z-20 border-t border-border bg-muted/95 backdrop-blur">
      <div className="container max-w-2xl px-4 py-2">
        <p className="text-[10px] leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground">Disclaimer:</span> MedP-AI provides
          pharmaceutical information for academic purposes only. It is not a substitute for
          professional medical advice. Always consult a licensed pharmacist or doctor.{" "}
          <Link to="/privacy-policy" className="underline hover:text-foreground">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link to="/terms-of-service" className="underline hover:text-foreground">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
