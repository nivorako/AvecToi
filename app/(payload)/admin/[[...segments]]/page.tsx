import type { Metadata } from "next";
import { importMap } from "../importMap.js";
import { RootPage, generatePageMetadata } from "@payloadcms/next/views";

import { payloadConfigPromise } from "@/lib/payloadConfig";

type Args = {
    params: Promise<{ segments: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] }>;
};

export default async function Page({ params, searchParams }: Args) {
    return RootPage({
        config: payloadConfigPromise,
        importMap,
        params,
        searchParams,
    });
}

export async function generateMetadata({
    params,
    searchParams,
}: Args): Promise<Metadata> {
    return generatePageMetadata({
        config: payloadConfigPromise,
        params,
        searchParams,
    });
}
