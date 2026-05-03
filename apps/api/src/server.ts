import { createApiApp } from "./app.js";
import { createMemoryGateway } from "./memory-gateway.js";
import { createSqliteRepository } from "./repository.js";

const repo = createSqliteRepository(process.env.OPENCLOG_DB_PATH ?? "openclog.db");
const app = createApiApp({ repo, gateway: createMemoryGateway() });
const port = Number(process.env.PORT ?? 8787);

await app.listen({ host: "127.0.0.1", port });

