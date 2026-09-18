/**
 * Security HTTP headers for FundedWealth Terminal OS.
 * Applied via next.config.ts headers() configuration.
 *
 * This is an internal employee-only app — strict CSP is appropriate.
 */

export const SECURITY_HEADERS = [
  // Prevent clickjacking
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Prevent MIME sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Referrer policy — don't leak URLs to external services
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Permissions policy — disable unnecessary browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS — force HTTPS in production
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // No search engine indexing — internal app
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow",
  },
  // Content Security Policy
  // Adjust 'connect-src' to include your actual Supabase project URL
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for styles in development
      "style-src 'self' 'unsafe-inline'",
      // Next.js hydration requires unsafe-eval in development; tighten in prod
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Allow Supabase API calls — replace with your actual project URL
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];
