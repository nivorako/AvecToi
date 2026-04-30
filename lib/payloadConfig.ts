import { getPayload } from "payload";

import config from "@/payload.config";

export const payloadConfigPromise = getPayload({
  config,
}).then((payload) => payload.config);
