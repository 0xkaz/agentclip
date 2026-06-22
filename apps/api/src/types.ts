export interface Env {
  DB: D1Database;
  APP_BASE_URL: string;
  DASHBOARD_ORIGIN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // Optional comma-separated extra OAuth client ids accepted as the `aud` of a
  // native mobile Google ID token (e.g. platform-specific iOS/Android ids).
  GOOGLE_NATIVE_CLIENT_IDS?: string;
  SESSION_SECRET: string;
  // Key for field-level encryption of clips marked "encrypted".
  ENCRYPTION_KEY: string;
  // Present only in production (serves the built dashboard). Undefined in dev.
  ASSETS?: Fetcher;
  // Workers AI + Vectorize for semantic search. Absent in local dev.
  AI?: Ai;
  VECTORIZE?: VectorizeIndex;
}

// Hono context variables set by middleware.
export interface Vars {
  userId: number;
}
