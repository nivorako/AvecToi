import { getPayload, type SanitizedConfig } from "payload";
import type { Connection } from "mongoose";

import config from "@/payload.config";

// Prevent MongoDB connection from being initialized in the browser
if (typeof window !== "undefined") {
    throw new Error("payloadConfig.ts should only be imported server-side");
}

// Lazy initialization: only connect to MongoDB when actually needed (server-side only)
// This prevents the connection from being bundled and executed in the browser
//let payloadConfigPromiseCache: Promise<SanitizedConfig> | null = null;

let payloadInstanceCache: Awaited<ReturnType<typeof getPayload>> | null = null;
 
// function _getPayloadConfigPromise() {
//     if (!payloadConfigPromiseCache) {
//         payloadConfigPromiseCache = getPayload({
//             config,
//         }).then((payload) => payload.config);
//     }
//     return payloadConfigPromiseCache;
// }

// Export a lazy Promise that only initializes when awaited
// Using a Thenable to delay getPayload() call until the promise is actually used

// export const payloadConfigPromise = {
//     then: (
//         onFulfilled?: (value: SanitizedConfig) => unknown,
//         onRejected?: (reason: unknown) => unknown,
//     ) => {
//         return _getPayloadConfigPromise().then(onFulfilled, onRejected);
//     },
//     catch: (onRejected?: (reason: unknown) => unknown) => {
//         return _getPayloadConfigPromise().catch(onRejected);
//     },
//     finally: (onFinally?: () => void) => {
//         return _getPayloadConfigPromise().finally(onFinally);
//     },
// } as Promise<SanitizedConfig>;

export async function getPayloadInstance() {
    if (!payloadInstanceCache) {
        payloadInstanceCache = await getPayload({ config });
    }
    return payloadInstanceCache;
}
 
// Expose la connexion mongoose brute pour les mesures de latence
export async function getMongooseConnection(): Promise<Connection> {
    const payload = await getPayloadInstance();
    // Avec @payloadcms/db-mongodb, la connexion est dans payload.db
    return (payload as unknown as { db: { connection: Connection } }).db.connection;
}
 
// Helper pour mesurer le ping MongoDB
export async function measureMongoLatency(): Promise<number> {
    const conn = await getMongooseConnection();
    const start = performance.now();
    //await conn.db.admin().ping();
     // Vérification que db existe avant de pinger
    if (!conn.db) {
        throw new Error("MongoDB database not available");
    }
    
    await conn.db.admin().ping();
    const end = performance.now();
    return end - start; // latence en ms
}
 
// Garder payloadConfigPromise pour compatibilité
export const payloadConfigPromise = {
    then: (onFulfilled?: (value: SanitizedConfig) => unknown, onRejected?: (reason: unknown) => unknown) => {
        return getPayloadInstance().then(p => p.config).then(onFulfilled, onRejected);
    },
} as Promise<SanitizedConfig>;