export function getRelationshipID(
    value: unknown,
): string | number | undefined {
    if (typeof value === "string" || typeof value === "number") {
        return value;
    }

    if (!value || typeof value !== "object") {
        return undefined;
    }

    const relationship = value as {
        id?: unknown;
        value?: unknown;
    };

    const id = relationship.id ?? relationship.value;

    return typeof id === "string" || typeof id === "number"
        ? id
        : undefined;
}