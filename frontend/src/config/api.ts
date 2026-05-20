export const config = {
  gemini: {
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    model: 'gemini-2.5-flash',
    apiVersion: 'v1beta',
    endpoint: 'https://generativelanguage.googleapis.com',
    projectId: 'gen-lang-client-0894198249',
    projectNumber: '331591298'
  },
  groq: {
    apiKey: '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',
    orgId: 'org_01ks30neekezb80p6vwxenvmmx',
    endpoint: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile' // Fast and capable model
  },
  openrouter: {
    apiKey: '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',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.1-8b-instruct:free' // Free tier model
  }
};