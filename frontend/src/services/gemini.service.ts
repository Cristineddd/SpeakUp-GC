import { config } from '../config/api';

const BASE_URL = `${config.gemini.endpoint}/${config.gemini.apiVersion}`;
const MODEL = config.gemini.model;
const FALLBACK_MODEL = 'gemini-2.0-flash';

// Enhanced response extraction with comprehensive debugging
const extractTextFromResponse = (data: any): string => {
  console.log('🔍 Starting response extraction...');
  console.log('📊 Full response structure:', JSON.stringify(data, null, 2));
  console.log('📊 Root keys:', Object.keys(data));

  let rawText = null;
  let extractionMethod = 'none';

  // Method 1: Standard Gemini format (most common)
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    rawText = data.candidates[0].content.parts[0].text;
    extractionMethod = 'candidates[0].content.parts[0].text';
  }
  // Method 2: Direct text in candidate
  else if (data.candidates?.[0]?.text) {
    rawText = data.candidates[0].text;
    extractionMethod = 'candidates[0].text';
  }
  // Method 3: Contents array (alternative structure)
  else if (data.contents?.[0]?.parts?.[0]?.text) {
    rawText = data.contents[0].parts[0].text;
    extractionMethod = 'contents[0].parts[0].text';
  }
  // Method 4: Direct response text
  else if (data.text) {
    rawText = data.text;
    extractionMethod = 'data.text';
  }
  // Method 5: Check all candidates systematically
  else if (data.candidates && Array.isArray(data.candidates)) {
    console.log(`📊 Searching through ${data.candidates.length} candidates...`);
    
    for (let i = 0; i < data.candidates.length; i++) {
      const candidate = data.candidates[i];
      console.log(`📊 Candidate[${i}] keys:`, candidate ? Object.keys(candidate) : 'null');
      
      if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
        console.log(`📊 Candidate[${i}] has ${candidate.content.parts.length} parts`);
        // Check if parts array has text
        for (let j = 0; j < candidate.content.parts.length; j++) {
          if (candidate.content.parts[j]?.text) {
            rawText = candidate.content.parts[j].text;
            extractionMethod = `candidates[${i}].content.parts[${j}].text`;
            break;
          }
        }
      }
      
      if (rawText) break;
      
      if (candidate?.text) {
        rawText = candidate.text;
        extractionMethod = `candidates[${i}].text`;
        break;
      }
    }
  }
  // Method 6: Check for error or safety blocks
  else if (data.promptFeedback?.blockReason) {
    const blockReason = data.promptFeedback.blockReason;
    console.error('🚫 Content blocked by safety filters:', blockReason);
    throw new Error(`SAFETY_BLOCKED: ${blockReason}`);
  }
  // Method 7: Check for MAX_TOKENS finish reason (incomplete response)
  else if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    console.warn('⚠️ Response reached MAX_TOKENS limit - response may be incomplete. Try reducing prompt complexity.');
    // Return a partial response or error message
    throw new Error('MAX_TOKENS_REACHED: Response exceeded token limit. Please try a shorter question or simpler request.');
  }
  // Method 8: Check for usage metadata (might indicate empty response)
  else if (data.usageMetadata) {
    console.log('📊 Usage metadata found:', data.usageMetadata);
    throw new Error('EMPTY_RESPONSE: Response contains usage data but no text content. The API may be overloaded or the request was blocked.');
  }

  console.log(`📝 Extraction result: method=${extractionMethod}, text=${rawText ? `"${rawText.substring(0, 50)}..."` : 'null'}`);

  if (!rawText) {
    // Comprehensive debugging for failed extraction
    console.error('🚫 TEXT EXTRACTION FAILED - Available data paths:');
    console.error('- data.candidates:', data.candidates);
    console.error('- data.contents:', data.contents);
    console.error('- data.text:', data.text);
    console.error('- data.promptFeedback:', data.promptFeedback);
    
    if (data.candidates?.[0]) {
      console.error('🔍 Detailed candidate[0] analysis:');
      console.error('  finishReason:', data.candidates[0].finishReason);
      console.error('  content:', JSON.stringify(data.candidates[0].content, null, 2));
    }
    
    throw new Error('NO_TEXT_EXTRACTED: Could not find text content in any expected response format. The API may be overloaded.');
  }

  return rawText.trim();
};

// Enhanced retry logic with exponential backoff
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

async function generateAIResponseWithRetry(
  message: string,
  conversationHistory: any[] = [],
  useFallback: boolean = false,
  retryCount: number = 0
): Promise<string> {
  try {
    const currentModel = useFallback ? FALLBACK_MODEL : MODEL;
    
    console.log('🚀 === GEMINI SERVICE START ===');
    console.log('💬 User message:', message);
    console.log('📝 Conversation history:', conversationHistory.length, 'messages');
    console.log('🤖 Using model:', currentModel);
    console.log('🔑 API Key available:', !!config.gemini.apiKey);
    console.log('🌐 Base URL:', BASE_URL);

    // Validate configuration
    if (!config.gemini.apiKey) {
      console.error('❌ CRITICAL: Gemini API key is missing');
      throw new Error('API_KEY_MISSING: Gemini API key is not configured');
    }

    if (!config.gemini.endpoint || !config.gemini.apiVersion) {
      console.error('❌ CRITICAL: Invalid endpoint configuration');
      throw new Error('INVALID_CONFIG: Gemini endpoint or API version is missing');
    }

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = '\n\nRECENT CONVERSATION:\n';
      // Include last 5 messages for context (excluding current message)
      const recentMessages = conversationHistory.slice(-5);
      recentMessages.forEach(msg => {
        const role = msg.isUser ? 'User' : 'Assistant';
        conversationContext += `${role}: ${msg.content}\n`;
      });
    }

    // Construct the API payload with enhanced training context
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `You are a supportive and empathetic AI assistant for SpeakUp GC (Group Chat), a real-time group communication and reporting platform for communities.

=== CRITICAL TRAINING GUIDELINES ===

WHAT IS SPEAKUP GC:
- A real-time group communication platform where users speak up, share concerns, and collaborate
- Supports group chats organized by topic, department, or concern
- Allows anonymous and identified messaging
- Includes case reporting and tracking capabilities
- Has a dashboard for overview and case tracking after login

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

SEVERITY LEVELS:
- Low: Minor incident, no immediate danger
- Medium: Serious concern, recurring pattern
- High: Urgent safety issue, needs immediate action

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

=== END TRAINING GUIDELINES ===

${conversationContext}

User message: ${message}

Response (be supportive, specific, and accurate about SpeakUp GC features):`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 800, // Reduced to avoid MAX_TOKENS issues
        stopSequences: ["\n\n"]
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    const API_URL = `${BASE_URL}/models/${currentModel}:generateContent?key=${config.gemini.apiKey}`;
    
    console.log('📡 Making API request to:', API_URL.replace(config.gemini.apiKey, '***'));
    console.log('📦 Request payload:', JSON.stringify(payload, null, 2));

    // Make the API request
    const startTime = Date.now();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    const requestDuration = Date.now() - startTime;

    console.log('📨 Response received:', {
      status: response.status,
      statusText: response.statusText,
      duration: `${requestDuration}ms`,
      ok: response.ok
    });

    // Handle HTTP errors
    if (!response.ok) {
      let errorDetail = await response.text().catch(() => 'Could not read error response');
      console.error('❌ API Error Details:', errorDetail);
      
      // Parse error if it's JSON
      try {
        const errorJson = JSON.parse(errorDetail);
        errorDetail = JSON.stringify(errorJson, null, 2);
      } catch (e) {
        // Keep as text if not JSON
      }

      // Handle specific error cases
      switch (response.status) {
        case 400:
          console.error('🚫 Bad Request - likely invalid payload or model name');
          if (!useFallback) {
            console.log('🔄 Retrying with fallback model...');
            return await generateAIResponseWithRetry(message, conversationHistory, true, retryCount);
          }
          throw new Error(`BAD_REQUEST: ${errorDetail}`);
          
        case 404:
          console.error('🚫 Model not found:', currentModel);
          if (!useFallback) {
            console.log('🔄 Retrying with fallback model...');
            return await generateAIResponseWithRetry(message, conversationHistory, true, retryCount);
          }
          throw new Error(`MODEL_NOT_FOUND: "${currentModel}" - check model name configuration`);
          
        case 429:
          console.error('🚫 Rate limit or quota exceeded');
          if (!useFallback) {
            console.log('🔄 Retrying with fallback model...');
            return await generateAIResponseWithRetry(message, conversationHistory, true, retryCount);
          }
          throw new Error('QUOTA_EXCEEDED: API quota or rate limit reached');
          
        case 403:
          console.error('🚫 Permission denied - check API key and permissions');
          throw new Error('PERMISSION_DENIED: Invalid API key or insufficient permissions');
          
        case 500:
        case 503:
          console.error('🚫 Server error - Gemini API may be experiencing issues');
          if (retryCount < MAX_RETRIES) {
            const delay = BASE_DELAY * Math.pow(2, retryCount);
            console.log(`🔄 Retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return await generateAIResponseWithRetry(message, conversationHistory, useFallback, retryCount + 1);
          }
          if (!useFallback) {
            console.log('🔄 Retrying with fallback model...');
            return await generateAIResponseWithRetry(message, conversationHistory, true, 0);
          }
          throw new Error('SERVER_ERROR: Gemini API is temporarily unavailable');
          
        default:
          throw new Error(`HTTP_${response.status}: ${errorDetail}`);
      }
    }

    // Parse successful response
    const responseData = await response.json();
    console.log('✅ Raw API response received successfully');
    
    // Extract text from response
    const aiResponse = extractTextFromResponse(responseData);
    
    console.log('🤖 AI Response extracted:', {
      length: aiResponse.length,
      preview: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
      extractionTime: `${Date.now() - startTime}ms total`
    });

    console.log('🎉 === GEMINI SERVICE COMPLETE ===');
    return aiResponse;

  } catch (error: any) {
    console.error('💥 === GEMINI SERVICE ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('🎯 === END ERROR ===');

    // Retry logic for network errors
    if (retryCount < MAX_RETRIES && 
        (error.message.includes('SERVER_ERROR') || 
         error.message.includes('NETWORK_ERROR') ||
         error.message.includes('overloaded'))) {
      const delay = BASE_DELAY * Math.pow(2, retryCount);
      console.log(`🔄 Auto-retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return await generateAIResponseWithRetry(message, conversationHistory, useFallback, retryCount + 1);
    }

    // User-friendly error messages based on error type
    const errorMessage = error.message || 'Unknown error occurred';
    
    if (errorMessage.includes('API_KEY_MISSING')) {
      return "I'm currently undergoing maintenance. Please contact support if this continues.";
    }
    
    if (errorMessage.includes('MODEL_NOT_FOUND') || errorMessage.includes('BAD_REQUEST')) {
      return "I'm updating my systems right now. Please try again in a few minutes.";
    }
    
    if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('RATE_LIMIT')) {
      return "I'm experiencing high demand right now. Please wait a moment and try again.";
    }
    
    if (errorMessage.includes('SAFETY_BLOCKED') || errorMessage.includes('CONTENT_BLOCKED')) {
      return "I apologize, but I cannot respond to that request due to safety guidelines. Please rephrase your question or ask about SpeakUp GC features and group chats.";
    }
    
    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('AUTH_ERROR')) {
      return "I'm having temporary connection issues. Please try again shortly.";
    }
    
    if (errorMessage.includes('SERVER_ERROR') || errorMessage.includes('UNAVAILABLE')) {
      return "I'm temporarily unavailable. Please try again in a few moments.";
    }
    
    if (errorMessage.includes('NO_TEXT_EXTRACTED') || errorMessage.includes('EMPTY_RESPONSE')) {
      return "I received a response but couldn't process it properly. Please try asking your question again.";
    }
    
    if (errorMessage.includes('MAX_TOKENS_REACHED')) {
      return "Your request was too complex for me to process completely. Please try breaking it down into smaller questions or simplify your request.";
    }
    
    // Generic fallback
    return "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment, or contact support if the issue persists.";
  }
}

// Fallback responses for when API is completely unavailable
const FALLBACK_RESPONSES: { [key: string]: string } = {
  'quotes': `I understand you're going through something difficult. Here are some supportive thoughts:

- "You are stronger than you think"
- "It's okay not to be okay"
- "You are not alone"
- "Your feelings are valid"
- "Small steps still move you forward"
- "Be gentle with yourself"

If you're ready, I can help guide you through reporting this incident on SpeakUp GC. Your voice matters.`,

  'report': `I hear you. Since you're already logged in, here's EXACTLY how to file your complaint:

STEP 1: Go to Your Dashboard
→ You're already in SpeakUp GC

STEP 2: Click "Complaints" Tab
→ In your Dashboard sidebar

STEP 3: Click "File Your First Complaint"
→ Start the form

STEP 4: Fill Your Information
→ Incident date & location
→ Respondent info (name or description)
→ What happened (detailed description)
→ Evidence files (REQUIRED - at least 1 file)

STEP 5: Choose Submission Options
→ Check "Submit Anonymously" if you prefer
→ Click Submit

RESULT: Get your Case ID → Track progress in Dashboard

⚡ QUICK TIP: You can also click the "File Complaint" button in this chat header to jump directly to the form!

Which step would you like help with?`,

  'default': `I'm here to support you with SpeakUp GC. I can help with:

- Creating your account and logging in
- Walking through the complaint filing process
- Explaining anonymity options
- Joining and using group chats
- Answering questions about SpeakUp GC
- Providing emotional support

What would you like help with? Remember, the "File Complaint" button in this chat can take you directly to the form!`
};

function getFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('quote') || lowerMessage.includes('sad') || lowerMessage.includes('tired') || lowerMessage.includes('exhausted') || lowerMessage.includes('difficult') || lowerMessage.includes('stressed')) {
    return FALLBACK_RESPONSES.quotes;
  }
  if (lowerMessage.includes('report') || lowerMessage.includes('how') || lowerMessage.includes('pano') || lowerMessage.includes('how to') || lowerMessage.includes('file') || lowerMessage.includes('submit') || lowerMessage.includes('step')) {
    return FALLBACK_RESPONSES.report;
  }
  
  return FALLBACK_RESPONSES.default;
}

// Main AI response generation function
export const generateAIResponse = async (message: string, conversationHistory: any[] = []): Promise<{ text: string; model: string; isFallback?: boolean }> => {
  try {
    // Try the main API with enhanced retry logic
    const response = await generateAIResponseWithRetry(message, conversationHistory, false, 0);
    return {
      text: response,
      model: MODEL,
      isFallback: false
    };
    
  } catch (error: any) {
    console.error('💥 All Gemini API attempts failed, using fallback response:', error.message);
    
    // Use fallback response as last resort
    const fallbackText = getFallbackResponse(message);
    return {
      text: fallbackText,
      model: 'fallback',
      isFallback: true
    };
  }
};

// Utility function for testing the connection
export const testGeminiConnection = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    console.log('🧪 === GEMINI CONNECTION TEST START ===');
    
    // Test configuration
    console.log('🔧 Configuration check:');
    console.log('  - API Key:', config.gemini.apiKey ? '✓ Present' : '✗ MISSING');
    console.log('  - Endpoint:', config.gemini.endpoint || '✗ MISSING');
    console.log('  - API Version:', config.gemini.apiVersion || '✗ MISSING');
    console.log('  - Model:', config.gemini.model || '✗ MISSING');
    
    if (!config.gemini.apiKey) {
      return {
        success: false,
        message: 'API key is missing from configuration'
      };
    }

    // Test with a simple message
    const testMessage = "Please respond with just the word 'TEST_OK' and nothing else.";
    console.log('🧪 Sending test message:', testMessage);
    
    const startTime = Date.now();
    const response = await generateAIResponse(testMessage);
    const duration = Date.now() - startTime;
    
    console.log('🧪 Test response:', response);
    console.log('🧪 Response time:', `${duration}ms`);
    
    const success = response.text.includes('TEST_OK');
    
    return {
      success,
      message: success ? 'Connection test passed' : 'Connection test failed - unexpected response',
      details: {
        responseTime: duration,
        response: response.text,
        model: response.model,
        isFallback: response.isFallback,
        expected: 'TEST_OK'
      }
    };
    
  } catch (error: any) {
    console.error('🧪 Connection test failed:', error);
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack
      }
    };
  } finally {
    console.log('🧪 === GEMINI CONNECTION TEST COMPLETE ===');
  }
};

// Health check function for monitoring
export const checkGeminiHealth = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  model: string;
  details: any;
}> => {``
  const startTime = Date.now();
  
  try {
    const testResult = await testGeminiConnection();
    const responseTime = Date.now() - startTime;
    
    return {
      status: testResult.success ? 'healthy' : 'degraded',
      responseTime,
      model: MODEL,
      details: testResult
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      model: MODEL,
      details: { error: error.message }
    };
  }
};

// Export for debugging purposes
export const getGeminiConfig = () => ({
  endpoint: config.gemini.endpoint,
  apiVersion: config.gemini.apiVersion,
  model: config.gemini.model,
  apiKey: config.gemini.apiKey ? '***' + config.gemini.apiKey.slice(-4) : 'MISSING',
  baseUrl: BASE_URL,
  fallbackModel: FALLBACK_MODEL,
  maxRetries: MAX_RETRIES,
  baseDelay: BASE_DELAY
});

// Export the enhanced extraction function for testing
export { extractTextFromResponse };