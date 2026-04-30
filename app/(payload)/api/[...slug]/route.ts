import {
    REST_DELETE,
    REST_GET,
    REST_OPTIONS,
    REST_PATCH,
    REST_POST,
    REST_PUT,
} from "@payloadcms/next/routes";

import { payloadConfigPromise } from "@/lib/payloadConfig";

export const GET = REST_GET(payloadConfigPromise);
export const POST = REST_POST(payloadConfigPromise);
export const DELETE = REST_DELETE(payloadConfigPromise);
export const PATCH = REST_PATCH(payloadConfigPromise);
export const PUT = REST_PUT(payloadConfigPromise);
export const OPTIONS = REST_OPTIONS(payloadConfigPromise);
