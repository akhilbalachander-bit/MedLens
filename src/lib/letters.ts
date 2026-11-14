/**
 * Financial-assistance letter templates. Generated locally (no AI call) so the
 * wording is predictable; the patient edits and copies them. MedLens never
 * sends correspondence.
 */
export type LetterFields = {
  patientName: string;
  patientAddress: string;
  patientPhone: string;
  patientEmail: string;
  facilityName: string;
  facilityAddress: string;
  accountNumber: string;
  serviceDates: string;
  amountDue: string;
  householdSize: string;
  annualIncome: string;
  insuranceStatus: string;
  hardshipNote: string;
};

export const EMPTY_FIELDS: LetterFields = {
  patientName: "",
  patientAddress: "",
  patientPhone: "",
  patientEmail: "",
  facilityName: "",
  facilityAddress: "",
  accountNumber: "",
  serviceDates: "",
  amountDue: "",
  householdSize: "",
  annualIncome: "",
  insuranceStatus: "",
  hardshipNote: "",
};

export type LetterType = "itemized" | "assistance" | "charity" | "501r";

export const LETTER_TYPES: { id: LetterType; title: string; description: string }[] = [
  { id: "itemized", title: "Request an itemized bill", description: "Ask for a line-by-line list of every charge, with codes." },
  { id: "assistance", title: "Financial assistance inquiry", description: "Ask what help, discounts or payment plans are available." },
  { id: "charity", title: "Charity care application", description: "Ask to be considered for free or reduced-cost care." },
  { id: "501r", title: "Section 501(r) policy request", description: "Ask a nonprofit hospital for its Financial Assistance Policy (FAP) and to pause collections while you apply." },
];

const v = (s: string, placeholder: string) => (s.trim() ? s.trim() : `[${placeholder}]`);

export function buildLetter(type: LetterType, f: LetterFields, today = new Date()): { subject: string; body: string } {
  const date = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const header = [
    v(f.patientName, "Your full name"),
    v(f.patientAddress, "Your mailing address"),
    [f.patientPhone.trim(), f.patientEmail.trim()].filter(Boolean).join(" · ") || "[Your phone or email]",
    "",
    date,
    "",
    `${v(f.facilityName, "Hospital name")} — Patient Financial Services / Billing Office`,
    v(f.facilityAddress, "Hospital billing address"),
    "",
    "",
  ].join("\n");
  const ref = [
    `Patient: ${v(f.patientName, "Your full name")}`,
    `Account number: ${v(f.accountNumber, "Account number from your bill")}`,
    `Date(s) of service: ${v(f.serviceDates, "Date of your visit")}`,
    f.amountDue.trim() ? `Amount billed: ${f.amountDue.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const sign = `\nThank you for your help.\n\nSincerely,\n\n${v(f.patientName, "Your full name")}`;
  const hardship = f.hardshipNote.trim() ? `\n${f.hardshipNote.trim()}\n` : "";
  const income =
    f.householdSize.trim() || f.annualIncome.trim()
      ? `\nMy household size is ${v(f.householdSize, "number of people")} and our approximate annual household income is ${v(
          f.annualIncome,
          "annual income",
        )}.${f.insuranceStatus.trim() ? ` Insurance status: ${f.insuranceStatus.trim()}.` : ""}\n`
      : f.insuranceStatus.trim()
        ? `\nInsurance status: ${f.insuranceStatus.trim()}.\n`
        : "";

  switch (type) {
    case "itemized":
      return {
        subject: "Request for an itemized bill",
        body: `${header}RE: Request for an itemized statement\n${ref}\n\nTo whom it may concern:\n\nI am requesting a complete itemized statement for the account above. Please include, for each charge: the date of service, a description, the CPT/HCPCS and revenue codes, the quantity, and the amount charged, along with any payments and adjustments applied.\n\nPlease also send a copy of any claim submitted to my insurance (if applicable). While I review the itemized statement, I ask that this account not be sent to collections.\n\nYou can reach me at the contact information above.\n${sign}`,
      };
    case "assistance":
      return {
        subject: "Financial assistance inquiry",
        body: `${header}RE: Financial assistance inquiry\n${ref}\n\nTo whom it may concern:\n\nI am writing to ask what financial assistance is available for the bill above. Please send me information about:\n\n• Your financial assistance or charity care program and how to apply\n• Any self-pay or prompt-pay discounts\n• Interest-free payment plan options\n${income}${hardship}\nPlease let me know what documents you need from me. I ask that the account be placed on hold and not referred to collections while my request is reviewed.\n${sign}`,
      };
    case "charity":
      return {
        subject: "Application for charity care",
        body: `${header}RE: Application for charity care / financial assistance\n${ref}\n\nTo whom it may concern:\n\nI would like to apply for charity care (free or reduced-cost care) for the services listed above. Please send me your application form and a list of the documents you need, or consider this letter the start of my application.\n${income}${hardship}\nI can provide proof of income and household size on request. Please place this account on hold while my application is reviewed, and let me know in writing what is decided.\n${sign}`,
      };
    case "501r":
      return {
        subject: "Request for Financial Assistance Policy (IRS Section 501(r))",
        body: `${header}RE: Request for Financial Assistance Policy under IRS Section 501(r)\n${ref}\n\nTo whom it may concern:\n\nI understand that nonprofit hospitals are required under Section 501(r) of the Internal Revenue Code to maintain a written Financial Assistance Policy (FAP), to make it and a plain-language summary available free of charge, and to make reasonable efforts to determine whether a patient is eligible for financial assistance before taking extraordinary collection actions.\n\nPlease send me:\n\n• A copy of your Financial Assistance Policy and its plain-language summary\n• The FAP application form and instructions\n• The amounts generally billed (AGB) percentage or method used for patients eligible for assistance\n\nI intend to apply for financial assistance for this account. Please do not refer it to collections or take any extraordinary collection action while my application is pending.\n${income}${hardship}${sign}`,
      };
  }
}
