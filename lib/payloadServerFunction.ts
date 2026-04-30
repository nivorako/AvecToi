"use server";

import type { ServerFunctionClient } from "payload";
import { handleServerFunctions } from "@payloadcms/next/layouts";

import { payloadConfigPromise } from "@/lib/payloadConfig";
import { importMap } from "@/app/(payload)/admin/importMap.js";

export const payloadServerFunction: ServerFunctionClient = async (args) => {
    return handleServerFunctions({
        ...args,
        config: payloadConfigPromise,
        importMap,
    });
};
