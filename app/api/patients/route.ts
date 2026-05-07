import {
    GET as PAYLOAD_GET,
    OPTIONS as PAYLOAD_OPTIONS,
    POST as PAYLOAD_POST,
} from "@/app/(payload)/api/[...slug]/route";

// Convenience wrapper for the Payload REST collection endpoint.
//
// Why this exists:
// - Next.js App Router routes are file-based. Having /api/patients lets the app call a stable URL.
// - We delegate to Payload's catch-all REST route with the correct `slug` params.
// - This avoids common integration issues (405/404) and prevents accidental recursive proxying.

export function GET(req: Request) {
    return PAYLOAD_GET(req, {
        params: Promise.resolve({ slug: ["patients"] }),
    });
}

export function POST(req: Request) {
    return PAYLOAD_POST(req, {
        params: Promise.resolve({ slug: ["patients"] }),
    });
}

export function OPTIONS(req: Request) {
    return PAYLOAD_OPTIONS(req, {
        params: Promise.resolve({ slug: ["patients"] }),
    });
}
