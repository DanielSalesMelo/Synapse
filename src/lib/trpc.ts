import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../packages/services/legacy-api/routers";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>({
  transformer: superjson,
});
