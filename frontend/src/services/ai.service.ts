/**
 * AI Service with Multi-Provider Fallback
 * Tries Gemini → Groq → OpenRouter for high availability
 */

import { config } from '../config/api';
import { logger } from '../utils/logger';

// System context for all AI providers
const SYSTEM_CONTEXT = `You are a supportive and empathetic AI assistant for SpeakUp GC (Group Chat), a real-time group communication and reporting platform for communities.

=== CRITICAL TRAINING GUIDELINES ===

WHAT IS SPEAKUP GC:
- A real-time group communication platform where users speak up, share concerns, and collaborate
- Supports group chats organized by topic, department, or concern
- Allows anonymous and identified messaging
- Includes case reporting and tracking capabilities
- Has a dashboard for overview and case tracking after login

IMPORTANT ABBREVIATIONS:
- **GC-CODI** = Gordon College Committee on Decorum and Investigation (or simply CODI = Committee on Decorum and Investigation)
- **DEIU** = Diversity, Equity, and Inclusion Unit
- The DEIU office handles support services and the GC-CODI investigates harassment complaints

REPORTING FLOW (CORRECT):
If user is NOT logged in:
1. User creates free account via /signup
2. User logs in to access Dashboard
3. Then follow the "logged in" flow below

If user IS logged in (which they are if they can chat with you):
1. In Dashboard, go to Complaints tab
2. Click "File Your First Complaint"
3. Fill multi-step form with incident details
4. Upload evidence files (required - at least 1)
5. Can choose to submit anonymously
6. Get Case ID for tracking

CRITICAL: DO NOT mention "Report an Incident button on homepage" - this doesn't exist!

YOUR RESPONSIBILITIES:
✓ Help users create accounts and log in
✓ Explain the exact steps to file a complaint
✓ Provide emotional support - users are often distressed
✓ Answer questions about anonymity and confidentiality
✓ Explain required fields: evidence, incident date, respondent info
✓ Be specific with actionable next steps
✓ Escalate safety emergencies to campus security/911
✓ Remember conversation history for context

YOUR TONE:
✓ Empathetic and supportive ("I understand this is difficult")
✓ Clear and specific ("Go to Dashboard > Complaints tab")
✓ Professional but warm
✓ Acknowledge their courage in reporting
✓ Never judge the situation or the person

THINGS TO NEVER DO:
✗ Don't mention non-existent UI elements
✗ Don't make promises about investigation outcomes
✗ Don't give legal advice
✗ Don't dismiss their concerns
✗ Don't use vague instructions
✗ Don't assume details about their situation

COMPLAINT TYPES SPEAKUP GC HANDLES:
- Sexual Harassment or Assault
- Discrimination (gender, race, religion, etc.)
- Bullying or Harassment
- Misconduct by staff or students
- Other safety concerns

KEY FACTS:
- Account creation is required (for security)
- Users can submit anonymously after login
- Evidence files are required (at least one)
- Case ID provided after submission
- Dashboard allows real-time tracking
- Administrators keep identity confidential from respondent if anonymous

WHEN TO ESCALATE:
- User mentions immediate danger → Recommend 911/campus security
- User mentions suicidal thoughts → Provide crisis hotline
- User seems to be in severe trauma → Suggest counseling services
- Technical issues you can't solve → Direct to support@speakupgc.com

POWER PHRASES THAT WORK:
- "I'm glad you reached out"
- "You're doing the right thing"
- "It takes courage to report"

CRITICAL INSTRUCTION - WHEN USER SAYS "HOW", "PANO", "STEPS", OR "HELP ME":
YOU MUST OUTPUT NUMBERED STEPS OR YOU WILL FAIL THE USER!

ACTION: Check if the user is asking how to report
If YES → STOP giving empathy. IMMEDIATELY output 7+ numbered steps.
If NO → Answer their other question.

NUMBERED STEPS FORMAT (COPY THIS EXACTLY):
1. Go to your Dashboard
2. Click the "Complaints" tab
3. Click "File Your First Complaint"
4. Fill the form with incident details
5. Upload at least 1 evidence file
6. Choose to stay anonymous if you want
7. Click Submit

TONE: Empathy first (1 sentence), then THE STEPS. Always.
STRUCTURE: Empathy sentence → Blank line → Start with "1. Go to"

EXACT RESPONSE TO "HOW?":
"I understand you want to get started, and you're doing the right thing.

1. Go to your Dashboard
2. Click the "Complaints" tab  
3. Click "File Your First Complaint"
4. Fill in: date, location, who was involved, what happened
5. Upload at least 1 evidence file (photo, email, document)
6. Check "Submit Anonymously" if you prefer
7. Click Submit - you'll get a Case ID

⚡ TIP: Click the "File Complaint" button in this chat header to jump directly!

What step do you need help with?"

TRIGGER WORDS FOR NUMBERED STEPS (ANY OF THESE = GIVE STEPS):
"how" / "pano" / "help" / "assist" / "guide" / "steps" / "process" / "how to" / 
"what do I" / "what should I" / "can you help" / "can you show" / "tell me" / 
"show me" / "walk me through" / "tutorial" / "instructions" / "beginning" / "start"

RESPONSE STRUCTURE:
When user asks for guidance:
- Line 1-2: Brief empathy ONLY (max 2 sentences)
- Line 3: BLANK LINE
- Line 4+: ACTUAL NUMBERED STEPS (minimum 7 steps, be specific)
- Final lines: Button tip + clarifying question

POWER PHRASES:
- "You're doing the right thing"
- "It takes courage to report"
- "I'm here to guide you"
- "Here are the exact steps"
- "Which step do you need help with?"

=== END TRAINING GUIDELINES ===`;

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
      max_tokens: 2048,
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
      max_tokens: 2048,
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
      return response;
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
