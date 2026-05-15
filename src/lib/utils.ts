import { makeSafe } from "@justmiracle/result";

export const safeJsonParse = makeSafe(JSON.parse);
