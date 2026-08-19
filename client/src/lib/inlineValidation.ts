export type InlineValidation = { state: "idle" | "valid" | "invalid"; message?: string };

export const idleValidation: InlineValidation = { state: "idle" };
export const validValidation: InlineValidation = { state: "valid" };

function hasValue(value: string) {
  return value.trim().length > 0;
}

export function validateName(value: string): InlineValidation {
  if (!hasValue(value)) return idleValidation;
  return value.trim().length >= 2 ? validValidation : { state: "invalid", message: "Enter at least 2 characters." };
}

export function validatePhone(value: string): InlineValidation {
  if (!hasValue(value)) return idleValidation;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? validValidation : { state: "invalid", message: "Enter a valid phone number with 10 to 15 digits." };
}

export function validateEmail(value: string): InlineValidation {
  if (!hasValue(value)) return idleValidation;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? validValidation : { state: "invalid", message: "Enter a valid email address." };
}

export function validateAdmissionNumber(value: string): InlineValidation {
  if (!hasValue(value)) return idleValidation;
  return /^[A-Z0-9][A-Z0-9/-]{2,}$/i.test(value.trim()) ? validValidation : { state: "invalid", message: "Use at least 3 letters, numbers, hyphens, or slashes." };
}

export function validateDate(value: string): InlineValidation {
  if (!hasValue(value)) return idleValidation;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { state: "invalid", message: "Enter a valid date." };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return date <= today ? validValidation : { state: "invalid", message: "Enter a date that is not in the future." };
}

export function validateCompletedValue(value: string): InlineValidation {
  return hasValue(value) ? validValidation : idleValidation;
}

export function validationControlClass(baseClass: string, validation?: InlineValidation) {
  if (validation?.state === "valid") return `${baseClass} border-[#6aa77a] bg-[#f7fcf8] focus:border-[#2e7c45] focus:ring-[#2e7c45]/10`;
  if (validation?.state === "invalid") return `${baseClass} border-[#d98a82] bg-[#fff9f8] focus:border-[#b95048] focus:ring-[#b95048]/10`;
  return baseClass;
}
