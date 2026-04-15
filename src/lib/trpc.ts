import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../packages/services/legacy-api/routers";

export const trpc = createTRPCReact<AppRouter>();
