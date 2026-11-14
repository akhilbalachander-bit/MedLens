/**
 * Conservative keyword screen for possibly urgent symptoms in free-text
 * questions. It only ever ADDS an emergency prompt; it never rules one out.
 */
const PATTERNS = [
  /chest (pain|pressure|tight)/i,
  /(can'?t|cannot|trouble|hard to|difficulty|struggling to) breath/i,
  /short(ness)? of breath/i,
  /faint(ed|ing)?|pass(ed)? out|unconscious|unresponsive/i,
  /seizure|convuls/i,
  /stroke|face (droop|drooping)|slurred speech|one side (weak|numb)/i,
  /(severe|heavy|won'?t stop|uncontrolled) bleed/i,
  /blood in (my )?(vomit|stool|poop|urine)|vomit(ing)? blood|black (tarry )?stool/i,
  /swell(ing|en)? (of )?(my )?(face|lips|tongue|throat)|anaphyla/i,
  /confus(ed|ion)|can'?t wake/i,
  /suicid|kill myself|end my life|self[- ]harm|hurt myself/i,
  /overdose|took too (much|many)/i,
  /worst headache/i,
];

export function detectEmergency(text: string): boolean {
  return PATTERNS.some((p) => p.test(text));
}

export const EMERGENCY_MESSAGE =
  "What you describe could be serious. If you think this is an emergency, call 911 or go to the nearest emergency room now. If you are thinking about harming yourself, call or text 988 (Suicide & Crisis Lifeline).";
