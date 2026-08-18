export const schoolRoles = ["owner", "admin", "staff", "teacher", "finance", "parent", "student"] as const;
export type SchoolRole = (typeof schoolRoles)[number];

const permissionMatrix: Record<SchoolRole, string[]> = {
  owner: ["*"],
  admin: ["*"],
  staff: ["students.read", "academics.read", "attendance.read", "attendance.write", "communications.read"],
  teacher: ["students.read", "academics.read", "academics.write", "attendance.read", "attendance.write", "results.read", "results.write", "communications.read"],
  finance: ["students.read", "finance.read", "finance.write", "communications.read"],
  parent: ["portal.read", "communications.read"],
  student: ["portal.read", "communications.read"],
};

export function can(role: SchoolRole, permission: string) {
  const permissions = permissionMatrix[role];
  return permissions.includes("*") || permissions.includes(permission);
}

export function isManagementRole(role: SchoolRole) {
  return role === "owner" || role === "admin";
}
