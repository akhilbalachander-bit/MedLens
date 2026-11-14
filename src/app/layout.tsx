import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MedLensProvider } from "@/lib/store";
import { SpeechProvider } from "@/components/speech/SpeechContext";
import { AppShell } from "@/components/AppShell";
import { UiTextProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "MedLens — Understand your medical paperwork",
  description:
    "Scan a prescription label or hospital discharge document and get plain-language explanations, translations, read-aloud, recovery checklists and bill help.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047860",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MedLensProvider>
          <UiTextProvider>
            <SpeechProvider>
              <AppShell>{children}</AppShell>
            </SpeechProvider>
          </UiTextProvider>
        </MedLensProvider>
      </body>
    </html>
  );
}
