import { lgas, states } from "nigeria-inec-geo";

function titleCase(value: string) {
  return value.trim().toLocaleLowerCase("en-NG").replace(/(^|[\s/-])([a-z])/g, (_match, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("en-NG")}`);
}

export function canonicalOriginState(value: string) {
  const name = titleCase(value.trim());
  return name === "Fct" || name === "Federal Capital Territory" ? "Federal Capital Territory" : name;
}

const originStates = Array.from(new Set(states().map(item => canonicalOriginState(item.name)))).sort((a, b) => a.localeCompare(b, "en-NG"));

export function listNigerianOriginStates() {
  return originStates;
}

export function listNigerianLgas(state: string) {
  const canonical = canonicalOriginState(state);
  return Array.from(new Set(lgas({ state: canonical === "Federal Capital Territory" ? "FCT" : canonical }).map(item => titleCase(item.name)))).sort((a, b) => a.localeCompare(b, "en-NG"));
}

export function normaliseNigerianOrigin(input: { stateOfOrigin?: string; localGovernmentOfOrigin?: string }) {
  const stateValue = input.stateOfOrigin?.trim();
  const lgaValue = input.localGovernmentOfOrigin?.trim();
  if (!stateValue && !lgaValue) return { stateOfOrigin: undefined, localGovernmentOfOrigin: undefined };
  if (!stateValue) throw new Error("Select a State of Origin before choosing a Local Government Area.");
  const stateOfOrigin = canonicalOriginState(stateValue);
  if (!originStates.includes(stateOfOrigin)) throw new Error("Select a valid Nigerian State of Origin.");
  if (!lgaValue) return { stateOfOrigin, localGovernmentOfOrigin: undefined };
  const localGovernmentOfOrigin = titleCase(lgaValue);
  if (!listNigerianLgas(stateOfOrigin).includes(localGovernmentOfOrigin)) throw new Error("Select a Local Government Area that belongs to the selected State of Origin.");
  return { stateOfOrigin, localGovernmentOfOrigin };
}
