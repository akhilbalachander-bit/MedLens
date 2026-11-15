"use client";

import { CONTACT, LegalPage } from "@/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms & Disclaimers"
      title="Using MedLens safely"
      lead="MedLens helps you understand paperwork. It does not replace your doctor, nurse or pharmacist. Please read these terms before you rely on it."
      updated="November 15, 2026"
      sections={[
        {
          title: "Not medical advice",
          body: [
            "MedLens explains the words on your documents in plain language. It does not diagnose, treat or give medical advice, and using it does not create a doctor–patient relationship.",
            "Always follow your care team's instructions and the label on your medicine. Do not start, stop or change a medicine because of anything MedLens shows.",
          ],
        },
        {
          title: "Emergencies",
          body: [
            "If you think you are having a medical emergency, call 911 or go to the nearest emergency room now. If you are thinking about harming yourself, call or text 988 (Suicide & Crisis Lifeline). Do not wait for MedLens.",
          ],
        },
        {
          title: "AI can make mistakes",
          body: [
            "Explanations are produced by artificial intelligence and may be incomplete or wrong, especially with blurry photos or handwriting. Items MedLens is unsure about are flagged; check them with your pharmacist or doctor.",
            "Your original document always comes first. Use \"Show original\" to compare.",
          ],
        },
        {
          title: "Translations and voices",
          body: ["Translations and read-aloud voices are automatic and may contain errors. Medicine names, doses and numbers are kept as printed where possible; when in doubt, ask for a professional interpreter, which hospitals and pharmacies in the U.S. usually provide free of charge."],
        },
        {
          title: "Prices, bills and letters",
          body: [
            [
              "Medicine and test prices are rough estimates, not quotes.",
              "The bill review lists questions worth asking. It never decides that a charge is wrong, fraudulent or incorrectly coded.",
              "Letters are templates you edit and send yourself. MedLens never sends anything for you, and the letters are not legal or financial advice.",
            ],
          ],
        },
        {
          title: "Your responsibilities",
          body: [
            [
              "Upload only your own documents, or documents you have permission to use (for example as a parent or caregiver).",
              "Review the privacy check before sending and cover anything personal that was missed.",
              "Do not use MedLens to harm others, to break the law, or to overload or attack the service.",
            ],
          ],
        },
        {
          title: "No warranty",
          body: [
            "MedLens is provided \"as is\" and \"as available\", without warranties of any kind, including accuracy, availability or fitness for a particular purpose. To the fullest extent allowed by law, the MedLens team is not liable for decisions made or harm resulting from use of the service.",
          ],
        },
        {
          title: "Changes and contact",
          body: [
            "We may update these terms; the date above shows the latest version. Continuing to use MedLens means you accept the current terms.",
            CONTACT ? `Contact: ${CONTACT}.` : "Contact the MedLens team through the website where you found MedLens.",
          ],
        },
      ]}
    />
  );
}
