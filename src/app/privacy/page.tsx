"use client";

import { CONTACT, LegalPage } from "@/components/LegalPage";

const contactLine = CONTACT
  ? `Questions about privacy: ${CONTACT}.`
  : "Questions about privacy: contact the MedLens team through the website where you found MedLens.";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="Your privacy"
      lead="MedLens is built so that your name and other personal details never reach the AI and are never stored by us. This page explains exactly what happens to your information."
      updated="November 15, 2026"
      sections={[
        {
          title: "The short version",
          body: [
            [
              "No account, no sign-up, no ads, no tracking cookies and no analytics.",
              "Before a page leaves your device, MedLens covers personal details on your device: names, birth dates, addresses, phone numbers, email addresses and ID numbers.",
              "A birth date is replaced by an age range (for example \"Age 60–69\"), so explanations stay accurate.",
              "You see exactly what will be sent and can cover more before anything is uploaded.",
              "MedLens has no database. We do not store your documents, results, name or contact details on our servers.",
              "Your results stay in this browser tab and disappear when you close it. You can delete them at any time in Settings.",
            ],
          ],
        },
        {
          title: "What happens when you scan or upload",
          body: [
            "1. Your photo or PDF is read on your own device. Personal details are found and covered with black boxes labelled with the kind of detail (for example [NAME] or [ID NUMBER]). This step needs no internet connection to our servers.",
            "2. You review the covered page and can cover anything we missed by tapping or dragging.",
            "3. Only the covered page is sent over an encrypted connection (HTTPS) for analysis. It is re-saved as a new image, which removes hidden photo data such as location (GPS) and camera details, and it is given a neutral file name.",
            "4. Our server passes the covered page to the AI service, receives the explanation, removes any personal detail that may still appear in it, and sends the result back to you. The page is processed in memory and discarded; it is not written to disk or kept.",
          ],
        },
        {
          title: "Who processes your information",
          body: [
            "MedLens uses these service providers only to deliver the features you use:",
            [
              "Google (Gemini AI): reads the covered page, writes the plain-language explanation, translates text and produces read-aloud voices. It receives covered pages and medical text, not the details MedLens covered. Google's own terms govern how it handles this content.",
              "Vercel: hosts the MedLens website. Like any web host, it may keep short-term technical logs (such as IP address and time of a request) for security and reliability.",
            ],
            "We do not sell or share your information with anyone else, and we do not use it for advertising.",
          ],
        },
        {
          title: "What is stored, and where",
          body: [
            [
              "On our servers: nothing from your documents. There is no database of patients, names or results.",
              "In your browser tab (session storage): your results, checklist, reminders and bill review, so the app keeps working while the tab is open. This is cleared when the tab is closed.",
              "On your device (local storage): only preferences such as language, voice speed and text size.",
              "To prevent abuse, our server counts requests per visitor for up to one hour using a scrambled (hashed) form of the IP address, never the address itself, and only in memory.",
            ],
          ],
        },
        {
          title: "Voice assistant, translation and read-aloud",
          body: [
            "Questions you type or speak are checked on your device, and details such as phone numbers, email addresses and ID numbers are removed before sending. Please do not include your name or other personal details in questions.",
            "Translation and read-aloud send only the medical text of your results (already without personal details). MedLens keeps no copy of the spoken text on its servers.",
          ],
        },
        {
          title: "How we protect your information",
          body: [
            [
              "Encrypted connections only (HTTPS with HSTS).",
              "A strict content security policy, so only MedLens's own code runs on its pages, and the app cannot be embedded in other websites.",
              "Personal details are covered on your device first, and a second check removes any that may appear in the AI's response.",
              "No database to breach: we deliberately do not collect what we do not need.",
              "Request limits per visitor to prevent misuse.",
            ],
            "No system is perfectly secure. If you are concerned, use the sample document, or cover more of the page before sending.",
          ],
        },
        {
          title: "Your choices",
          body: [
            [
              "Review and cover any part of a page before it is sent.",
              "Delete your results at any time: Settings → Delete my session data, or simply close the tab.",
              "Use MedLens without uploading anything by trying the fictional sample document.",
            ],
          ],
        },
        {
          title: "Children",
          body: ["MedLens is intended for adults and for parents or caregivers helping someone. Children under 13 should use it only with a parent or guardian."],
        },
        {
          title: "Health privacy laws",
          body: [
            "MedLens is a tool you choose to use; it is not your doctor, hospital, pharmacy or health plan. We designed it to follow de-identification principles similar to the HIPAA Safe Harbor method (removing names, contact details, identification numbers and exact birth dates, and grouping ages over 89).",
          ],
        },
        {
          title: "Changes and contact",
          body: ["If we change how MedLens handles information, we will update this page and the date above.", contactLine],
        },
      ]}
    />
  );
}
