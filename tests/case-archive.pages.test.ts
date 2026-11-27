import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { isValidElement } from "react";

const requireUserMock = jest.fn<() => Promise<{ id: string }>>();
const payloadRESTMock = jest.fn<(path: string) => Promise<unknown>>();

let CasesPage: typeof import("@/app/app/caregroup/[id]/cases/page").default;
let ArchivedCasesPage: typeof import("@/app/app/caregroup/[id]/cases/archived/page").default;

beforeAll(async () => {
    jest.unstable_mockModule("@/lib/requireUser", () => ({
        requireUser: requireUserMock,
    }));
    jest.unstable_mockModule("@/lib/payloadRest", () => ({
        payloadREST: payloadRESTMock,
    }));
    jest.unstable_mockModule("@/components/caregroup/AddDossierPanel", () => ({
        default: () => null,
    }));
    jest.unstable_mockModule("@/components/ui/PageSummary", () => ({
        default: () => null,
    }));
    jest.unstable_mockModule("@/components/case/CaseSummaryCard", () => ({
        default: () => null,
    }));
    jest.unstable_mockModule("@/components/ui/FilterPills", () => ({
        default: () => null,
    }));
    jest.unstable_mockModule("@/components/ui/SearchInput", () => ({
        default: () => null,
    }));

    ({ default: CasesPage } = await import(
        "@/app/app/caregroup/[id]/cases/page"
    ));
    ({ default: ArchivedCasesPage } = await import(
        "@/app/app/caregroup/[id]/cases/archived/page"
    ));
});

beforeEach(() => {
    jest.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-1" });
});

type ElementProps = Record<string, unknown> & { children?: unknown };

function collectElementProps(node: unknown, result: ElementProps[] = []) {
    if (Array.isArray(node)) {
        node.forEach((child) => collectElementProps(child, result));
    } else if (isValidElement(node)) {
        const props = node.props as ElementProps;
        result.push(props);
        collectElementProps(props.children, result);
    }
    return result;
}

function readText(node: unknown): string {
    if (typeof node === "string" || typeof node === "number") {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(readText).join("");
    }
    if (isValidElement(node)) {
        return readText((node.props as ElementProps).children);
    }
    return "";
}

describe("case archive pages", () => {
    test("the active list applies the medical filter and exposes archives with their count", async () => {
        payloadRESTMock.mockImplementation(async (path) => {
            if (path.includes("where[status][not_equals]=archived")) {
                return {
                    docs: [
                        {
                            id: "medical-1",
                            title: "Suivi médical",
                            type: "medical",
                            updatedAt: "2026-01-02T00:00:00.000Z",
                        },
                        {
                            id: "other-1",
                            title: "Autre dossier",
                            type: "other",
                            updatedAt: "2026-01-01T00:00:00.000Z",
                        },
                    ],
                };
            }
            if (path.includes("where[status][equals]=archived")) {
                return { totalDocs: 2 };
            }
            if (path.startsWith("/api/tasks?")) return { docs: [] };
            if (path.startsWith("/api/case-attachments?")) return { docs: [] };
            if (path.startsWith("/api/memberships?")) {
                return { docs: [{ role: "admin" }] };
            }
            throw new Error(`Unexpected Payload request: ${path}`);
        });

        const view = await CasesPage({
            params: Promise.resolve({ id: "group-1" }),
            searchParams: Promise.resolve({ filter: "medical" }),
        });
        const props = collectElementProps(view);

        expect(payloadRESTMock).toHaveBeenCalledWith(
            "/api/cases?where[careGroup][equals]=group-1&where[status][not_equals]=archived&limit=50&depth=0",
        );
        expect(payloadRESTMock).toHaveBeenCalledWith(
            "/api/cases?where[careGroup][equals]=group-1&where[status][equals]=archived&limit=1&depth=0",
        );

        const caseCards = props.filter(
            (item) =>
                typeof item.href === "string" &&
                item.href.startsWith("/app/caregroup/group-1/case/") &&
                typeof item.title === "string",
        );
        expect(caseCards.map((item) => item.title)).toEqual(["Suivi médical"]);

        const filters = props.find((item) => Array.isArray(item.pills));
        expect(filters?.pills).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ label: "Tous", value: "tous" }),
                expect.objectContaining({ label: "Médical", value: "medical" }),
                expect.objectContaining({ label: "Autres", value: "other" }),
            ]),
        );

        const archiveLink = props.find(
            (item) => item.href === "/app/caregroup/group-1/cases/archived",
        );
        expect(archiveLink).toBeDefined();
        expect(readText(archiveLink?.children)).toContain("Dossiers archivés");
        expect(readText(archiveLink?.children)).toContain("2");
    });

    test("the archive page only requests and displays archived cases", async () => {
        payloadRESTMock.mockResolvedValue({
            docs: [
                {
                    id: "archived-1",
                    title: "Ancien dossier",
                    type: "other",
                    updatedAt: "2026-01-01T00:00:00.000Z",
                },
            ],
            totalDocs: 1,
        });

        const view = await ArchivedCasesPage({
            params: Promise.resolve({ id: "group-1" }),
        });
        const props = collectElementProps(view);

        expect(payloadRESTMock).toHaveBeenCalledWith(
            "/api/cases?where[careGroup][equals]=group-1&where[status][equals]=archived&limit=50&depth=0",
        );
        expect(readText(view)).toContain("Dossiers archivés");
        expect(readText(view)).toContain("Ancien dossier");
        expect(readText(view)).toContain("1 dossier(s) archivé(s)");
        expect(props).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    href: "/app/caregroup/group-1/case/archived-1",
                }),
            ]),
        );
    });
});
