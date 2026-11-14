/**
 * Conservative keyword screen for possibly urgent symptoms in free-text
 * questions. It only ever ADDS an emergency prompt; it never rules one out.
 */
const PATTERNS = [
  /chest (pain|pressure|tight|hurts?|is hurting)/i,
  /(can'?t|cannot|can not|not|trouble|hard to|difficulty|struggling to|unable to) breath/i,
  /short(ness)? of breath/i,
  /faint(ed|ing|s)?|pass(ed|es|ing)? out|unconscious|unresponsive/i,
  /seizure|convuls/i,
  /stroke|face (droop|drooping)|slurred speech|one side (weak|numb)/i,
  /(severe|heavy|won'?t stop|uncontrolled) bleed/i,
  /bleed(ing)? (won'?t|will not|doesn'?t|does not|that won'?t) stop|bleeding (a lot|heavily)/i,
  /blood in (my )?(vomit|stool|poop|urine)|vomit(ing)? blood|black (tarry )?stool/i,
  /swell(ing|en)? (of )?(my )?(face|lips|tongue|throat)|anaphyla/i,
  /(face|lips?|tongue|throat) (is |are )?(swelling|swollen|closing)/i,
  /confus(ed|ion)|can'?t wake/i,
  /suicid|kill myself|end my life|self[- ]harm|hurt myself/i,
  /overdose|took too (much|many)/i,
  /worst headache/i,
];

/**
 * Phone keyboards and speech recognition often produce typographic
 * apostrophes (can’t) and extra spaces; fold them so the patterns match.
 */
function fold(text: string): string {
  return text.replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'").replace(/\s+/g, " ");
}

export function detectEmergency(text: string): boolean {
  const t = fold(text);
  return PATTERNS.some((p) => p.test(t));
}

export const EMERGENCY_MESSAGE =
  "What you describe could be serious. If you think this is an emergency, call 911 or go to the nearest emergency room now. If you are thinking about harming yourself, call or text 988 (Suicide & Crisis Lifeline).";
