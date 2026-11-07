export const CASE_TYPES = [
    "medical",
    "administrative",
    "transport",
    "financial",
    "social",
    "legal",
    "other",
] as const;

export type CaseType = (typeof CASE_TYPES)[number];

export const CASE_TYPE_OPTIONS = [
    { label: "Médical", value: "medical" },
    { label: "Administratif", value: "administrative" },
    { label: "Transport", value: "transport" },
    { label: "Financier", value: "financial" },
    { label: "Social", value: "social" },
    { label: "Juridique", value: "legal" },
    { label: "Autres", value: "other" },
] satisfies Array<{ label: string; value: CaseType }>;

export function isCaseType(value: unknown): value is CaseType {
    return (
        typeof value === "string" &&
        CASE_TYPES.includes(value as CaseType)
    );
}