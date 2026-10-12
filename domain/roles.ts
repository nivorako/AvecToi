export const ROLE_OPTIONS = [
    { label: "Admin", value: "admin" },
    { label: "Family", value: "family" },
    { label: "Professional", value: "professional" },
    { label: "Patient", value: "patient" },
] as const;

export type Role = (typeof ROLE_OPTIONS)[number]["value"];
export type InvitableRole = Exclude<Role, "admin">;

export const ROLES = ROLE_OPTIONS.map(({ value }) => value);
export const INVITABLE_ROLE_OPTIONS = ROLE_OPTIONS.filter(
    ({ value }) => value !== "admin",
);
