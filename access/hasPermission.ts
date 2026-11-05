import type { Permission } from "@/domain/permissions";
import type { Role } from "@/domain/roles";
import { ROLE_PERMISSIONS } from "@/domain/rolePermissions";

// Does the role have this permission?

export function hasPermission(
    role: unknown,
    permission: Permission,
): boolean {
    const permissions = ROLE_PERMISSIONS[role as Role];
    return permissions?.includes(permission) ?? false;
}