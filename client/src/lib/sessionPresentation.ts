export type SessionDeviceVisual = "desktop" | "mobile" | "tablet" | "unknown";

export function sessionPresentation(input: { deviceKind?: string | null; locationLabel?: string | null }) {
  const deviceIcon: SessionDeviceVisual = input.deviceKind === "desktop" || input.deviceKind === "mobile" || input.deviceKind === "tablet" ? input.deviceKind : "unknown";
  return {
    deviceIcon,
    locationText: input.locationLabel ? `Approximate location: ${input.locationLabel}` : "Location not reported by this device",
  };
}

export function sessionRevokeConfirmation(input: { deviceLabel?: string | null; deviceKind?: string | null; locationLabel?: string | null }) {
  const presentation = sessionPresentation(input);
  return {
    title: "Sign out this device?",
    description: "This will immediately end the selected NSOS session. The device will need to sign in again to regain access.",
    deviceLabel: input.deviceLabel || "Unrecognized device",
    locationText: presentation.locationText,
    cancelLabel: "Keep session",
    actionLabel: "Sign out device",
  };
}

export function sessionRevokeSuccessNotice(session: { deviceLabel?: string | null }) {
  const deviceLabel = session.deviceLabel?.trim().slice(0, 160) || "Device";
  return {
    title: `${deviceLabel} signed out.`,
    description: "This device no longer has access to your NSOS account.",
  };
}

export function sessionSecurityActivityPresentation(activity: { eventType?: string | null; deviceLabel?: string | null; locationLabel?: string | null }) {
  const deviceLabel = activity.deviceLabel?.trim().slice(0, 160) || "Unrecognized device";
  const locationText = activity.locationLabel ? `Approximate location: ${activity.locationLabel}` : "Location not reported by this device";
  if (activity.eventType === "session_revoked") {
    return { label: "Session revoked", title: `${deviceLabel} was signed out`, description: "This device can no longer access your NSOS account.", locationText, tone: "rose" as const };
  }
  return { label: "Security check", title: `NSOS verified ${deviceLabel}`, description: "The signed-in device passed an automated account-security check.", locationText, tone: "sage" as const };
}
