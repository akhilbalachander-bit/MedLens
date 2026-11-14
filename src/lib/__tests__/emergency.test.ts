import { describe, expect, it } from "vitest";
import { detectEmergency } from "../emergency";

describe("detectEmergency", () => {
  it.each([
    "I can't breathe",
    "I can’t breathe", // typographic apostrophe from phone keyboards
    "I CANNOT BREATHE",
    "he is not breathing",
    "having trouble breathing",
    "shortness of breath",
    "I have chest pain",
    "my chest hurts",
    "I keep passing out",
    "she fainted",
    "I think I'm having a seizure",
    "slurred speech and face drooping",
    "the bleeding won’t stop",
    "heavy bleeding from the cut",
    "there is blood in my stool",
    "vomiting blood",
    "my lips and  throat are swelling",
    "swelling of my tongue",
    "I feel confused",
    "I want to kill myself",
    "I took too many pills",
    "worst headache of my life",
  ])("flags %j", (q) => {
    expect(detectEmergency(q)).toBe(true);
  });

  it.each([
    "How do I take my medicines?",
    "When is my follow-up appointment?",
    "Can I eat normally?",
    "What does ondansetron do?",
    "Is it okay to drive?",
  ])("does not flag routine question %j", (q) => {
    expect(detectEmergency(q)).toBe(false);
  });
});
