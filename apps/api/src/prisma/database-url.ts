export function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const password = process.env.POSTGRES_PASSWORD;
  if (!password) throw new Error("POSTGRES_PASSWORD is required.");
  const user = encodeURIComponent(process.env.POSTGRES_USER ?? "g_scores");
  const database = encodeURIComponent(process.env.POSTGRES_DB ?? "g_scores");
  const host = process.env.POSTGRES_HOST ?? "127.0.0.1";
  const port = process.env.POSTGRES_PORT ?? "5432";
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}?schema=public`;
}
