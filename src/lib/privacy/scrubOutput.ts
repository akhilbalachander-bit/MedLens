import { scrubText } from "./redact";

/**
 * Second safety net on the server: whatever the AI sends back is scrubbed of
 * personal details before it reaches the browser, even though the pages were
 * already covered on the device. A clinic's or hospital's own phone number is
 * kept where the patient needs it to call.
 */
const KEEP_PHONE_KEYS = new Set(["phone", "facility_phone"]);
const DROP_KEYS = new Set(["patient_account_number", "patient_name", "date_of_birth", "dob", "mrn", "member_id", "patient_address"]);

export function scrubDeep<T>(value: T, key = ""): T {
  if (typeof value === "string") return scrubText(value, { keepPhones: KEEP_PHONE_KEYS.has(key) }) as T;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, key)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = DROP_KEYS.has(k) ? null : scrubDeep(v, k);
    }
    return out as T;
  }
  return value;
}
