import type { Permission } from "@/domain/permissions";
import type { Role } from "@/domain/roles";
import { ROLE_PERMISSIONS } from "@/domain/rolePermissions";

// Does the role have this permission?

export function hasPermission(
    role: Role,
    permission: Permission,
): boolean {
    return ROLE_PERMISSIONS[role].includes(permission);
}