function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}. See .env.example.`);
  }
  return value;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get port() {
    return Number(process.env.PORT ?? 4000);
  },
  get nodeEnv() {
    return process.env.NODE_ENV ?? "development";
  },
};
