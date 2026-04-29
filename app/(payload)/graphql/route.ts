import config from "@/payload.config";
import { GRAPHQL_PLAYGROUND_GET, GRAPHQL_POST } from "@payloadcms/next/routes";

const configPromise = Promise.resolve(config);

export const POST = GRAPHQL_POST(configPromise);
export const GET = GRAPHQL_PLAYGROUND_GET(configPromise);
