import type { Metadata } from "next";
import config from "@/payload.config";
import importMap from "../importMap.js";
import { RootPage, generatePageMetadata } from "@payloadcms/next/views";

const configPromise = Promise.resolve(config);

type Args = {
    params: Promise<{ segments: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] }>;
};

export default async function Page({ params, searchParams }: Args) {
    return RootPage({
        config: configPromise,
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
        config: configPromise,
        params,
        searchParams,
    });
}
