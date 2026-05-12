import { buildOriginFromForwardedHeaders } from "@/lib/payloadRest";

describe("buildOriginFromForwardedHeaders", () => {
    it("returns null when host is missing", () => {
        expect(buildOriginFromForwardedHeaders({})).toBeNull();
        expect(buildOriginFromForwardedHeaders({ host: null })).toBeNull();
        expect(buildOriginFromForwardedHeaders({ xForwardedHost: null })).toBeNull();
    });

    it("uses x-forwarded-host over host", () => {
        expect(
            buildOriginFromForwardedHeaders({
                host: "prod.example.com",
                xForwardedHost: "preview.example.com",
                xForwardedProto: "https",
            }),
        ).toBe("https://preview.example.com");
    });

    it("defaults proto to https", () => {
        expect(
            buildOriginFromForwardedHeaders({
                host: "avec-toi-hazel.vercel.app",
            }),
        ).toBe("https://avec-toi-hazel.vercel.app");
    });

    it("uses x-forwarded-proto when present", () => {
        expect(
            buildOriginFromForwardedHeaders({
                host: "example.com",
                xForwardedProto: "http",
            }),
        ).toBe("http://example.com");
    });
});
