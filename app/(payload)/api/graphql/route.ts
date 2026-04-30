import { GRAPHQL_PLAYGROUND_GET, GRAPHQL_POST } from "@payloadcms/next/routes";

import { payloadConfigPromise } from "@/lib/payloadConfig";

export const POST = GRAPHQL_POST(payloadConfigPromise);
export const GET = GRAPHQL_PLAYGROUND_GET(payloadConfigPromise);
