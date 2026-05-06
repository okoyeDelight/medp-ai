import { AppHeader } from "@/components/AppHeader";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-3xl py-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 font-mono-tech text-xs uppercase text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <article className="prose prose-slate max-w-none">
          <header className="mb-8 border-b-2 border-foreground pb-6">
            <p className="font-mono-tech text-xs uppercase tracking-wider text-muted-foreground">
              Legal · MedP-AI
            </p>
            <h1 className="mt-2 font-display text-4xl leading-tight">
              Privacy Policy & Data Protection Agreement
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              <strong>Effective Date:</strong> April 29, 2026 ·{" "}
              <strong>Last Updated:</strong> April 29, 2026
            </p>
          </header>

          <section className="space-y-8 text-[15px] leading-relaxed text-foreground">
            <div>
              <h2 className="font-display text-2xl">1. Introduction</h2>
              <p className="mt-2">
                Welcome to MedP-AI (also referred to as "Desprix Med AI"). We are committed to
                protecting your personal and medical information. This Privacy Policy explains how
                we collect, use, disclose, and safeguard your data when you use our mobile
                application and services in accordance with the{" "}
                <strong>Nigeria Data Protection Regulation (NDPR)</strong> and other applicable
                data protection laws.
              </p>
              <p className="mt-2">
                By using MedP-AI, you consent to the data practices described in this policy. If
                you do not agree with these terms, please do not access the application.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl">2. Information We Collect</h2>
              <p className="mt-2">
                To provide accurate pharmaceutical insights and AI-driven health support, we
                collect several types of information:
              </p>

              <h3 className="mt-4 font-display text-lg">2.1 Personal Identification Information</h3>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>Name, email address, and phone number.</li>
                <li>Professional or academic affiliation (for pharmacy students or practitioners).</li>
              </ul>

              <h3 className="mt-4 font-display text-lg">2.2 Sensitive Medical Information</h3>
              <p className="mt-2">
                As a health-tech platform, we may process sensitive data provided voluntarily by
                you, including:
              </p>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>Current medications and dosage history.</li>
                <li>Known allergies or drug contraindications.</li>
                <li>Health conditions or symptoms entered for AI analysis.</li>
              </ul>

              <h3 className="mt-4 font-display text-lg">2.3 Technical and Usage Data</h3>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>Device information (model, operating system, unique device identifiers).</li>
                <li>Log data (IP address, browser type, pages viewed, and time spent on the app).</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl">3. How We Use Your Information</h2>
              <p className="mt-2">We process your information for the following purposes:</p>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>
                  <strong>Service Delivery:</strong> To operate the AI engine that analyzes drug
                  interactions and provides medical academic resources.
                </li>
                <li>
                  <strong>Personalization:</strong> To tailor health alerts and study materials to
                  your specific profile.
                </li>
                <li>
                  <strong>Safety & Compliance:</strong> To ensure the accuracy of pharmaceutical
                  logic and comply with healthcare regulations.
                </li>
                <li>
                  <strong>Improvement:</strong> To train and refine our AI models (using
                  de-identified/anonymized data).
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl">4. Legal Basis for Processing</h2>
              <p className="mt-2">Under the NDPR, we process your data based on:</p>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>
                  <strong>Consent:</strong> Your explicit agreement when signing up or entering
                  medical data.
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> To provide and improve the functionality
                  of MedP-AI.
                </li>
                <li>
                  <strong>Legal Obligations:</strong> When required by Nigerian health or data
                  authorities.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl">5. Data Security and Storage</h2>
              <p className="mt-2">
                The security of your data is our priority. We implement industry-standard technical
                and organizational measures, including:
              </p>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>End-to-end encryption for sensitive medical data.</li>
                <li>Secure cloud storage with restricted access protocols.</li>
                <li>Regular security audits of our AI infrastructure.</li>
              </ul>
              <p className="mt-2">
                Data is stored primarily on secure servers, and we ensure that any cross-border
                data transfers comply with NDPR requirements for adequate protection.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl">6. Sharing of Information</h2>
              <p className="mt-2">
                We do not sell your personal or medical data. We only share information in the
                following circumstances:
              </p>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>
                  <strong>Service Providers:</strong> Third-party cloud or AI processing partners
                  who are bound by strict confidentiality agreements.
                </li>
                <li>
                  <strong>Legal Requirement:</strong> If required by law to protect our rights or
                  comply with a judicial proceeding.
                </li>
                <li>
                  <strong>Anonymized Research:</strong> We may share aggregated, non-identifiable
                  data with academic or medical institutions for research purposes.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl">6.1 Clinical Data Sharing — Live Stream to Provider</h2>
              <p className="mt-2">
                MedP-AI offers an optional <strong>"Live Stream to Provider"</strong> feature. When
                you enable this toggle, you grant <strong>temporary, revocable access</strong> to a
                limited set of your clinical data — including vitals readings, medication and
                herbal-dose logs, symptom check-ins, and active condition flags — to the licensed
                healthcare professional or HMO desk you have selected.
              </p>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>
                  Access is scoped to <strong>clinical data only</strong>. Providers cannot view
                  your account settings, authentication credentials, private diary notes, or any
                  personal content unrelated to clinical safety.
                </li>
                <li>
                  You may <strong>disconnect or "Stop Stream"</strong> at any time from the Health
                  Sync dashboard. Revocation takes effect immediately and the provider's live
                  session is terminated.
                </li>
                <li>
                  A timestamped record of every stream session (start, stop, recipient) is kept in
                  your account for audit and transparency.
                </li>
                <li>
                  Emergency overrides (e.g. critical BP readings) may push a one-time alert to your
                  HMO emergency desk even when the live stream is off, in line with safety duty of
                  care.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl">7. User Rights</h2>
              <p className="mt-2">Under Nigerian law, you have the right to:</p>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>
                  <strong>Access:</strong> Request a copy of the personal data we hold about you.
                </li>
                <li>
                  <strong>Correction:</strong> Update or fix any inaccurate information.
                </li>
                <li>
                  <strong>Deletion:</strong> Request that we delete your data (the "Right to be
                  Forgotten"), subject to legal retention requirements.
                </li>
                <li>
                  <strong>Portability:</strong> Request a transfer of your data to another service
                  provider.
                </li>
              </ul>
            </div>

            <div className="rounded-xl border-2 border-foreground bg-danger/10 p-5">
              <h2 className="font-display text-2xl">8. Medical Disclaimer</h2>
              <p className="mt-2 font-semibold">
                MedP-AI is an informational and academic tool. It does not provide medical
                diagnoses or professional medical advice.
              </p>
              <p className="mt-2">
                Users should always consult a qualified healthcare professional or pharmacist
                before making medical decisions or changing medication regimens.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl">9. Changes to This Policy</h2>
              <p className="mt-2">
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new policy on this page and updating the "Effective Date."
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl">10. Contact Us</h2>
              <p className="mt-2">
                If you have questions about this policy or our data practices, please contact our
                Data Protection Officer at:
              </p>
              <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4">
                <p>
                  <strong>Data Controller / DPO:</strong> MedP-AI Privacy Office
                </p>
                <p className="mt-1">
                  <strong>Email:</strong>{" "}
                  <a className="underline" href="mailto:chinedubisiola04@gmail.com">
                    chinedubisiola04@gmail.com
                  </a>
                </p>
                <p className="mt-1">
                  <strong>Phone:</strong>{" "}
                  <a className="underline" href="tel:+2349079543695">
                    +234 907 954 3695
                  </a>
                </p>
                <p className="mt-1">
                  <strong>Jurisdiction:</strong> Nigeria (NDPR)
                </p>
              </div>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
