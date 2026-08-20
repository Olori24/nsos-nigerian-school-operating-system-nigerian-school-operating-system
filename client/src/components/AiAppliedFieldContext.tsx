import { createContext, type ReactNode, useContext } from "react";

const AiAppliedFieldContext = createContext<Set<string>>(new Set<string>());

const labelKeys: Record<string, string> = {
  "Applicant first name": "firstName", "Student first name": "firstName", "First name": "firstName",
  "Applicant last name": "lastName", "Student last name": "lastName", "Last name": "lastName",
  "Parent or guardian name": "guardianName", "Guardian name": "guardianName",
  "Parent or guardian phone": "guardianPhone", "Guardian phone": "guardianPhone",
  "Parent or guardian email": "guardianEmail", "Guardian email": "guardianEmail",
  "Date of birth": "dateOfBirth", "Gender": "gender", "Residential address": "residentialAddress", "Previous school": "priorSchool",
  "State of origin": "stateOfOrigin", "Local Government Area of origin": "localGovernmentOfOrigin",
};

export function AiAppliedFieldProvider({ appliedFields, children }: { appliedFields: Set<string>; children: ReactNode }) {
  return <AiAppliedFieldContext.Provider value={appliedFields}>{children}</AiAppliedFieldContext.Provider>;
}

export function useAiAppliedField(label: string) {
  const appliedFields = useContext(AiAppliedFieldContext);
  const key = labelKeys[label];
  return Boolean(key && appliedFields.has(key));
}
