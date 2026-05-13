export const config = {
  gemini: {
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    model: 'gemini-2.5-flash',
    apiVersion: 'v1beta',
    endpoint: 'https://generativelanguage.googleapis.com',
    projectId: 'gen-lang-client-0894198249',
    projectNumber: '331591298'
  }
};