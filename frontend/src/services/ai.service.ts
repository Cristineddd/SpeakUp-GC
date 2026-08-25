/**
 * AI Service with Multi-Provider Fallback
 * Tries Gemini → Groq → OpenRouter for high availability
 */

import { config } from '../config/api';
import { logger } from '../utils/logger';

// System context for all AI providers
const SYSTEM_CONTEXT = `You are Laya, SpeakUp GC's GBV rights assistant for Gordon College.

LENGTH (STRICT):
- Default: 2–4 short, complete sentences. No walls of text. Never stop mid-sentence.
- Every reply MUST end with a period, question mark, or exclamation point.
- Never reply with empathy only. Always add a next step or one clarifying question.
- How-to / pano / steps: 1 short line of support, then at most 5 numbered steps. Stop.
- Match the user's language (Tagalog or English).
- Do not repeat SpeakUp GC's mission, confidentiality speech, or 911 on every turn.

OFF-TOPIC:
- You cannot give, send, or process money. Never pretend you can.
- If they ask for money ("i need money", pera, cash, load): 1 complete empathy sentence, then clearly say you cannot provide money. Offer Gordon College DEIU / Guidance for campus support referrals, or DSWD Crisis Intervention (02) 8931-8101 if they are in a safety crisis. Ask one question: is this connected to a harassment/GBV case, or do they need support referrals?
- Affection ("i miss you"): You are a campus rights assistant, not a partner. One warm line, then ask how you can help with rights or reporting.

FACTS:
- File a complaint: Dashboard → File a Complaint.
- Anonymous filing is allowed. Identity stays hidden from the respondent.
- GC-CODI investigates. DEIU provides support.
- Laws: RA 11313 (Safe Spaces Act), RA 7877 (Anti-Sexual Harassment Act), RA 10173 (Data Privacy Act).
- Emergency: campus security or 911. Crisis: 0917-899-USAP (8727).
- Never give formal legal advice or promise an investigation outcome.`;

/**
 * Call Groq API (Llama 3.3 70B)
 */
async function callGroqAPI(message: string, conversationHistory: any[]): Promise<string> {
  logger.log('🟣 Trying Groq API...');
  
  // Build conversation messages
  const messages = [
    { role: 'system', content: SYSTEM_CONTEXT },
    ...conversationHistory.map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: message }
  ];

  const response = await fetch(`${config.groq.endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.groq.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.groq.model,
      messages,
      temperature: 0.7,
      max_tokens: 600,
      top_p: 0.95,
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content;
  
  if (!aiResponse) {
    throw new Error('No response from Groq API');
  }

  logger.log('✅ Groq API success');
  return aiResponse.trim();
}

/**
 * Call OpenRouter API
 */
async function callOpenRouterAPI(message: string, conversationHistory: any[]): Promise<string> {
  logger.log('🔵 Trying OpenRouter API...');
  
  // Build conversation messages
  const messages = [
    { role: 'system', content: SYSTEM_CONTEXT },
    ...conversationHistory.map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: message }
  ];

  const response = await fetch(`${config.openrouter.endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openrouter.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'SpeakUp GC',
    },
    body: JSON.stringify({
      model: config.openrouter.model,
      messages,
      temperature: 0.7,
      max_tokens: 600,
      top_p: 0.95,
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content;
  
  if (!aiResponse) {
    throw new Error('No response from OpenRouter API');
  }

  logger.log('✅ OpenRouter API success');
  return aiResponse.trim();
}

/**
 * Call Gemini API (for compatibility, wraps existing gemini.service)
 */
async function callGeminiAPI(message: string, conversationHistory: any[]): Promise<string> {
  logger.log('🟢 Trying Gemini API...');
  
  // Import and use the existing Gemini service
  const { generateAIResponse } = await import('./gemini.service');
  const response = await generateAIResponse(message, conversationHistory);
  
  logger.log('✅ Gemini API success');
  // Extract text from the response object
  return typeof response === 'string' ? response : response.text;
}

function finalizeLayaReply(text: string): string {
  const t = (text || '').trim();
  if (!t) return t;
  if (/[.!?…]["']?$/.test(t)) return t;
  return `${t}.`;
}

/**
 * Main AI function with automatic fallback
 * Tries: Gemini → Groq → OpenRouter
 */
export async function generateAIResponseWithFallback(
  message: string,
  conversationHistory: any[] = []
): Promise<string> {
  const providers = [
    { name: 'Gemini', fn: callGeminiAPI },
    { name: 'Groq', fn: callGroqAPI },
    { name: 'OpenRouter', fn: callOpenRouterAPI },
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      logger.log(`\n🤖 === Attempting ${provider.name} API ===`);
      const response = await provider.fn(message, conversationHistory);
      logger.log(`✅ === ${provider.name} API succeeded ===\n`);
      return finalizeLayaReply(response);
    } catch (error: any) {
      logger.error(`❌ ${provider.name} failed:`, error.message);
      lastError = error;
      continue; // Try next provider
    }
  }

  // All providers failed
  logger.error('💥 === ALL AI PROVIDERS FAILED ===');
  throw new Error(
    `All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`
  );
}
