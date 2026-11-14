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

type Tr = (english: string, vars?: Record<string, string | number>) => string;
const plain: Tr = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s);

/**
 * Build a letter. `tr` translates each paragraph as a template with
 * {placeholders}; the patient's own details are filled in afterwards, so they
 * are never sent for translation. Without `tr` the letter is English.
 */
export function buildLetter(
  type: LetterType,
  f: LetterFields,
  today = new Date(),
  tr: Tr = plain,
  locale = "en-US",
): { subject: string; body: string } {
  const v = (s: string, placeholder: string) => (s.trim() ? s.trim() : `[${tr(placeholder)}]`);
  let date: string;
  try {
    date = today.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    date = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }
  const name = v(f.patientName, "Your full name");
  const header = [
    name,
    v(f.patientAddress, "Your mailing address"),
    [f.patientPhone.trim(), f.patientEmail.trim()].filter(Boolean).join(" · ") || `[${tr("Your phone or email")}]`,
    "",
    date,
    "",
    tr("{hospital} — Patient Financial Services / Billing Office", { hospital: v(f.facilityName, "Hospital name") }),
    v(f.facilityAddress, "Hospital billing address"),
    "",
    "",
  ].join("\n");
  const ref = [
    tr("Patient: {name}", { name }),
    tr("Account number: {account}", { account: v(f.accountNumber, "Account number from your bill") }),
    tr("Date(s) of service: {dates}", { dates: v(f.serviceDates, "Date of your visit") }),
    f.amountDue.trim() ? tr("Amount billed: {amount}", { amount: f.amountDue.trim() }) : null,
  ]
    .filter(Boolean)
    .join("\n");
  const sign = `\n${tr("Thank you for your help.")}\n\n${tr("Sincerely,")}\n\n${name}`;
  const hardship = f.hardshipNote.trim() ? `\n${f.hardshipNote.trim()}\n` : "";
  const insurance = f.insuranceStatus.trim() ? tr("Insurance status: {status}.", { status: f.insuranceStatus.trim() }) : "";
  const income =
    f.householdSize.trim() || f.annualIncome.trim()
      ? `\n${tr("My household size is {size} and our approximate annual household income is {income}.", {
          size: v(f.householdSize, "number of people"),
          income: v(f.annualIncome, "annual income"),
        })}${insurance ? ` ${insurance}` : ""}\n`
      : insurance
        ? `\n${insurance}\n`
        : "";
  const hello = tr("To whom it may concern:");
  const P = (text: string) => tr(text);

  switch (type) {
    case "itemized":
      return {
        subject: P("Request for an itemized bill"),
        body: `${header}${P("RE: Request for an itemized statement")}\n${ref}\n\n${hello}\n\n${P(
          "I am requesting a complete itemized statement for the account above. Please include, for each charge: the date of service, a description, the CPT/HCPCS and revenue codes, the quantity, and the amount charged, along with any payments and adjustments applied.",
        )}\n\n${P(
          "Please also send a copy of any claim submitted to my insurance (if applicable). While I review the itemized statement, I ask that this account not be sent to collections.",
        )}\n\n${P("You can reach me at the contact information above.")}\n${sign}`,
      };
    case "assistance":
      return {
        subject: P("Financial assistance inquiry"),
        body: `${header}${P("RE: Financial assistance inquiry")}\n${ref}\n\n${hello}\n\n${P(
          "I am writing to ask what financial assistance is available for the bill above. Please send me information about:",
        )}\n\n• ${P("Your financial assistance or charity care program and how to apply")}\n• ${P("Any self-pay or prompt-pay discounts")}\n• ${P(
          "Interest-free payment plan options",
        )}\n${income}${hardship}\n${P(
          "Please let me know what documents you need from me. I ask that the account be placed on hold and not referred to collections while my request is reviewed.",
        )}\n${sign}`,
      };
    case "charity":
      return {
        subject: P("Application for charity care"),
        body: `${header}${P("RE: Application for charity care / financial assistance")}\n${ref}\n\n${hello}\n\n${P(
          "I would like to apply for charity care (free or reduced-cost care) for the services listed above. Please send me your application form and a list of the documents you need, or consider this letter the start of my application.",
        )}\n${income}${hardship}\n${P(
          "I can provide proof of income and household size on request. Please place this account on hold while my application is reviewed, and let me know in writing what is decided.",
        )}\n${sign}`,
      };
    case "501r":
      return {
        subject: P("Request for Financial Assistance Policy (IRS Section 501(r))"),
        body: `${header}${P("RE: Request for Financial Assistance Policy under IRS Section 501(r)")}\n${ref}\n\n${hello}\n\n${P(
          "I understand that nonprofit hospitals are required under Section 501(r) of the Internal Revenue Code to maintain a written Financial Assistance Policy (FAP), to make it and a plain-language summary available free of charge, and to make reasonable efforts to determine whether a patient is eligible for financial assistance before taking extraordinary collection actions.",
        )}\n\n${P("Please send me:")}\n\n• ${P("A copy of your Financial Assistance Policy and its plain-language summary")}\n• ${P(
          "The FAP application form and instructions",
        )}\n• ${P("The amounts generally billed (AGB) percentage or method used for patients eligible for assistance")}\n\n${P(
          "I intend to apply for financial assistance for this account. Please do not refer it to collections or take any extraordinary collection action while my application is pending.",
        )}\n${income}${hardship}${sign}`,
      };
  }
}
