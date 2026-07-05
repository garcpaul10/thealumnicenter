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
  get staffJwtSecret() {
    return required("STAFF_JWT_SECRET");
  },
  get adminAppOrigin() {
    return process.env.ADMIN_APP_ORIGIN ?? "http://localhost:3011";
  },
  get webAppOrigin() {
    return process.env.WEB_APP_ORIGIN ?? "http://localhost:3012";
  },
  get clerkSecretKey() {
    return required("CLERK_SECRET_KEY");
  },
  get clerkPublishableKey() {
    return required("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  },
  get stripeSecretKey() {
    return required("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
  get qrSigningSecret() {
    return required("QR_SIGNING_SECRET");
  },
  get kioskJwtSecret() {
    return required("KIOSK_JWT_SECRET");
  },
  get scanStationAppOrigin() {
    return process.env.SCAN_STATION_APP_ORIGIN ?? "http://localhost:3013";
  },
  get marketingAppOrigin() {
    return process.env.MARKETING_APP_ORIGIN ?? "http://localhost:3014";
  },
};
