import { config } from '../config/api';

const BASE_URL = `${config.gemini.endpoint}/${config.gemini.apiVersion}`;
const MODEL = config.gemini.model;

interface ImageAnalysisResult {
  isBullying: boolean;
  isHarassment: boolean;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendations: string[];
  confidence: number;
}

// Convert image file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data:image/xxx;base64, prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeImageForBullying = async (imageFile: File): Promise<ImageAnalysisResult> => {
  try {
    console.log('🖼️ Analyzing image for bullying/harassment...', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type,
      model: MODEL
    });

    // Validate API key
    if (!config.gemini.apiKey) {
      throw new Error('API_KEY_MISSING: Gemini API key is missing');
    }

    // Convert image to base64
    const base64Image = await fileToBase64(imageFile);
    
    // Determine mime type
    const mimeType = imageFile.type || 'image/jpeg';

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `You are an AI expert in detecting bullying, harassment, and harmful content in images for the SpeakUp GC incident reporting system. Analyze this image carefully and determine:

1. Is this image evidence of bullying or harassment?
2. What type of bullying/harassment is shown (if any)?
   - Cyberbullying (offensive messages, threats, mocking)
   - Physical bullying (violence, intimidation)
   - Social bullying (exclusion, humiliation)
   - Sexual harassment
   - Verbal abuse
   - Other forms of harassment

3. Severity level: low, medium, high, or critical
4. Brief description of what you see
5. Recommendations specific to SpeakUp GC system users

IMPORTANT: 
- Be objective and thorough
- Look for text in images (screenshots of messages, social media posts)
- Check for threatening gestures, violent imagery, or harmful content
- Consider context and intent
- If image shows self-harm or extreme violence, mark as CRITICAL
- Recommendations should be specific to using SpeakUp GC reporting system (e.g., "File a formal complaint through SpeakUp GC", "Use SpeakUp GC's anonymous reporting feature", "Document this incident in SpeakUp GC with additional details")

Respond in this EXACT JSON format (no additional text):
{
  "isBullying": true/false,
  "isHarassment": true/false,
  "category": "specific type or 'none'",
  "severity": "low/medium/high/critical",
  "description": "brief description of image content",
  "recommendations": ["SpeakUp GC-specific action 1", "SpeakUp GC-specific action 2", "SpeakUp GC-specific action 3"],
  "confidence": 0.0-1.0
}`
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 2048, // INCREASED from 1024 to 2048
      }
    };

    // ✅ Correct URL format with /models/
    const API_URL = `${BASE_URL}/models/${MODEL}:generateContent?key=${config.gemini.apiKey}`;
    
    console.log('📡 Sending image to Gemini Vision API...', { url: API_URL });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('📨 Vision API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Vision API Error:', {
        status: response.status,
        body: errorText
      });
      throw new Error(`API_ERROR_${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Vision API Success:', JSON.stringify(data, null, 2));

    // Try multiple response format paths
    let rawText = null;

    // Format 1: Standard candidates format
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      rawText = data.candidates[0].content.parts[0].text;
      console.log('📝 Using format 1: candidates');
    }
    // Format 2: Direct content
    else if (data.content?.parts?.[0]?.text) {
      rawText = data.content.parts[0].text;
      console.log('📝 Using format 2: content');
    }
    // Format 3: Direct text
    else if (data.text) {
      rawText = data.text;
      console.log('📝 Using format 3: direct text');
    }
    // Format 4: First candidate in array
    else if (Array.isArray(data) && data[0]?.content?.parts?.[0]?.text) {
      rawText = data[0].content.parts[0].text;
      console.log('📝 Using format 4: array candidate');
    }

    if (!rawText) {
      console.warn('⚠️ Unexpected response format:', data);
      console.log('📊 Response keys:', Object.keys(data));
      throw new Error('UNEXPECTED_RESPONSE_FORMAT: Could not extract text from response');
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = rawText;
    if (rawText.includes('```json')) {
      jsonText = rawText.split('```json')[1].split('```')[0].trim();
    } else if (rawText.includes('```')) {
      jsonText = rawText.split('```')[1].split('```')[0].trim();
    }
    
    console.log('🔍 Extracted JSON:', jsonText.substring(0, 100) + '...');
    
    // Handle incomplete JSON (if response was cut off)
    let cleanJson = jsonText;
    if (!jsonText.trim().endsWith('}')) {
      console.warn('⚠️ JSON appears incomplete, attempting to complete it...');
      // Count open/close braces
      const openBraces = (jsonText.match(/{/g) || []).length;
      const closeBraces = (jsonText.match(/}/g) || []).length;
      const missingBraces = openBraces - closeBraces;
      cleanJson = jsonText + '}'.repeat(Math.max(missingBraces, 1));
      console.log('✅ Completed JSON with', missingBraces, 'closing braces');
    }
    
    const result: ImageAnalysisResult = JSON.parse(cleanJson);
    
    console.log('🎯 Analysis Result:', result);
    return result;

  } catch (error: any) {
    console.error('💥 Image Analysis Error:', error);
    
    // Return safe default on error
    return {
      isBullying: false,
      isHarassment: false,
      category: 'error',
      severity: 'low',
      description: 'Unable to analyze image at this time. Please try again.',
      recommendations: [
        'Try uploading the image again',
        'Make sure the image is clear and readable',
        'If issue persists, contact support'
      ],
      confidence: 0
    };
  }
};

// Generate friendly explanation from analysis result (plain text, no formatting)
export const generateAnalysisExplanation = (result: ImageAnalysisResult): string => {
  if (!result.isBullying && !result.isHarassment) {
    return `I've analyzed the image and it doesn't appear to show evidence of bullying or harassment. ${result.description}`;
  }

  const severityEmoji = {
    low: '⚠️',
    medium: '🔶',
    high: '🔴',
    critical: '🚨'
  };

  const emoji = severityEmoji[result.severity];
  
  let explanation = `${emoji} Analysis Result\n\n`;
  explanation += `Detection: ${result.isBullying ? 'Bullying detected' : ''} ${result.isHarassment ? 'Harassment detected' : ''}\n`;
  explanation += `Category: ${result.category}\n`;
  explanation += `Severity: ${result.severity.toUpperCase()}\n\n`;
  explanation += `What I see: ${result.description}\n\n`;
  explanation += `Recommended Actions:\n`;
  result.recommendations.forEach((rec, i) => {
    explanation += `${i + 1}. ${rec}\n`;
  });
  
  if (result.severity === 'critical' || result.severity === 'high') {
    explanation += `\nIMPORTANT: This appears to be a serious incident. Please file a formal complaint through SpeakUp GC immediately to ensure proper investigation and protection.`;
  }
  
  return explanation;
};