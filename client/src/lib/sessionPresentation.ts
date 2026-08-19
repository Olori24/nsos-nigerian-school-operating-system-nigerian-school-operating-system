export type SessionDeviceVisual = "desktop" | "mobile" | "tablet" | "unknown";

export function sessionPresentation(input: { deviceKind?: string | null; locationLabel?: string | null }) {
  const deviceIcon: SessionDeviceVisual = input.deviceKind === "desktop" || input.deviceKind === "mobile" || input.deviceKind === "tablet" ? input.deviceKind : "unknown";
  return {
    deviceIcon,
    locationText: input.locationLabel ? `Approximate location: ${input.locationLabel}` : "Location not reported by this device",
  };
}
