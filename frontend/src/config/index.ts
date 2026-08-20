const config = {
  openai: {
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  }
};

/**
 * Google returns `admin_policy_enforced` for every @gordoncollege.edu.ph account
 * because the college's Workspace blocks third-party OAuth clients that are not
 * on its allowlist. Set back to true once IT marks our client as Trusted in
 * Admin console → Security → Access and data control → API controls.
 */
export const GOOGLE_SIGN_IN_ENABLED = false;

export default config;
