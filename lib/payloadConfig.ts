import { getPayload, type SanitizedConfig } from "payload";

import config from "@/payload.config";

// Prevent MongoDB connection from being initialized in the browser
if (typeof window !== "undefined") {
    throw new Error("payloadConfig.ts should only be imported server-side");
}

// Lazy initialization: only connect to MongoDB when actually needed (server-side only)
// This prevents the connection from being bundled and executed in the browser
let payloadConfigPromiseCache: Promise<SanitizedConfig> | null = null;

function _getPayloadConfigPromise() {
    if (!payloadConfigPromiseCache) {
        payloadConfigPromiseCache = getPayload({
            config,
        }).then((payload) => payload.config);
    }
    return payloadConfigPromiseCache;
}

// Export a lazy Promise that only initializes when awaited
// Using a Thenable to delay getPayload() call until the promise is actually used
export const payloadConfigPromise = {
    then: (
        onFulfilled?: (value: SanitizedConfig) => unknown,
        onRejected?: (reason: unknown) => unknown,
    ) => {
        return _getPayloadConfigPromise().then(onFulfilled, onRejected);
    },
    catch: (onRejected?: (reason: unknown) => unknown) => {
        return _getPayloadConfigPromise().catch(onRejected);
    },
    finally: (onFinally?: () => void) => {
        return _getPayloadConfigPromise().finally(onFinally);
    },
} as Promise<SanitizedConfig>;
