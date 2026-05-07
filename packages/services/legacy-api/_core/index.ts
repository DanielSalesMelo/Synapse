import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

export const trpc = createTRPCReact<any>();

const getApiUrl = () => {
  const rawUrl = import.meta.env.VITE_API_URL;

  if (!rawUrl) {
    return "http://localhost:3001/api/trpc";
  }

  const cleanUrl = rawUrl.replace(/\/$/, "");

  if (cleanUrl.endsWith("/api/trpc")) {
    return cleanUrl;
  }

  return `${cleanUrl}/api/trpc`;
};

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getApiUrl(),
      transformer: superjson,
      headers() {
        const token = localStorage.getItem("synapse-auth-token");

        if (!token) {
          return {};
        }

        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
});