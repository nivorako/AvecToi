import { beforeAll, describe, expect, it, jest } from "@jest/globals";

let parseWhereParams: typeof import("@/lib/payloadRest").parseWhereParams;

beforeAll(async () => {
    // Avoid loading payload.config (requires PAYLOAD_SECRET/MONGODB_URI) —
    // we only need the pure query-string parser from the module.
    jest.unstable_mockModule("@/lib/payloadConfig", () => ({
        getPayloadInstance: jest.fn(),
    }));
    ({ parseWhereParams } = await import("@/lib/payloadRest"));
});

describe("parseWhereParams", () => {
    it("returns undefined when no where params are present", () => {
        expect(parseWhereParams(new URLSearchParams("limit=10"))).toBeUndefined();
        expect(parseWhereParams(new URLSearchParams(""))).toBeUndefined();
    });

    it("parses equals filters", () => {
        const where = parseWhereParams(
            new URLSearchParams("where[careGroup][equals]=group-1&limit=50"),
        );
        expect(where).toEqual({ careGroup: { equals: "group-1" } });
    });

    it("parses not_equals filters", () => {
        const where = parseWhereParams(
            new URLSearchParams("where[status][not_equals]=archived"),
        );
        expect(where).toEqual({ status: { not_equals: "archived" } });
    });

    it("merges several filters on different fields", () => {
        const where = parseWhereParams(
            new URLSearchParams(
                "where[user][equals]=u1&where[careGroup][equals]=g1&where[status][equals]=pending",
            ),
        );
        expect(where).toEqual({
            user: { equals: "u1" },
            careGroup: { equals: "g1" },
            status: { equals: "pending" },
        });
    });

    it("splits comma-separated values for `in`", () => {
        const where = parseWhereParams(
            new URLSearchParams("where[task][in]=a%2Cb%2Cc"),
        );
        expect(where).toEqual({ task: { in: ["a", "b", "c"] } });
    });

    it("ignores malformed params", () => {
        const where = parseWhereParams(
            new URLSearchParams("where[field]=x&where[field][op]=y"),
        );
        expect(where).toEqual({ field: { op: "y" } });
    });
});
