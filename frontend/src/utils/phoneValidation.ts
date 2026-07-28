/**
 * Philippine mobile number helpers.
 * Canonical format: 09XXXXXXXXX (exactly 11 digits, starts with 09).
 */

export function sanitizePhMobileInput(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");

  // +63 / 63XXXXXXXXXX → 09XXXXXXXXX
  if (digits.startsWith("63") && digits.length >= 12) {
    digits = `0${digits.slice(2)}`;
  }

  // User typed 9XXXXXXXXX (10 digits, missing leading 0)
  if (digits.length === 10 && digits.startsWith("9")) {
    digits = `0${digits}`;
  }

  return digits.slice(0, 11);
}

export function isValidPhMobile(contact: string): boolean {
  return validatePhMobile(contact) === null;
}

/**
 * @returns error message, or null when valid
 */
export function validatePhMobile(
  contact: string,
  options: { required?: boolean } = { required: true }
): string | null {
  const trimmed = (contact || "").trim();

  if (!trimmed) {
    return options.required === false ? null : "Contact number is required";
  }

  if (!/^\d+$/.test(trimmed)) {
    return "Contact number must contain only digits";
  }

  if (!trimmed.startsWith("09")) {
    return "Contact number must start with 09";
  }

  if (trimmed.length !== 11) {
    return "Contact number must be exactly 11 digits (09XXXXXXXXX)";
  }

  if (/^(\d)\1{10}$/.test(trimmed)) {
    return "Please enter a valid contact number";
  }

  return null;
}
