import { validateAdmissionNumber, validateDate, validateEmail, validateName, validatePhone } from "@/lib/inlineValidation";

type AdmissionBase = { firstName: string; lastName: string; guardianName: string; guardianPhone: string; guardianEmail: string };
type StudentBase = { firstName: string; lastName: string; admissionNo: string; classId: string; sessionId: string; admittedOn: string };

function isOptionalEmailValid(value: string) {
  return !value.trim() || validateEmail(value).state === "valid";
}

export function isAdmissionBiodataReady(form: AdmissionBase, declarationRequired = false, declarationAccepted = false) {
  return validateName(form.firstName).state === "valid" && validateName(form.lastName).state === "valid" && validateName(form.guardianName).state === "valid" && validatePhone(form.guardianPhone).state === "valid" && isOptionalEmailValid(form.guardianEmail) && (!declarationRequired || declarationAccepted);
}

export function isStudentBiodataReady(form: StudentBase) {
  return validateName(form.firstName).state === "valid" && validateName(form.lastName).state === "valid" && validateAdmissionNumber(form.admissionNo).state === "valid" && Boolean(form.classId) && Boolean(form.sessionId) && validateDate(form.admittedOn).state === "valid";
}
