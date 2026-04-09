import { GoogleGenAI, Modality, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { RefinementResult, ImageAsset, AnalysisResult, ChatMessage } from '@/types/studio';
import { getMaxOutputTokens } from './ai-provider';

// Custom error class for quota/rate limit errors
export class QuotaExceededError extends Error {
  retryAfter: number; // seconds to wait before retry
  quotaDetails: string;

  constructor(message: string, retryAfter: number, quotaDetails: string) {
    super(message);
    this.name = 'QuotaExceededError';
    this.retryAfter = retryAfter;
    this.quotaDetails = quotaDetails;
  }
}

// Helper to parse and handle API errors
function handleApiError(error: any): never {
  // If error is already a string, wrap it
  if (typeof error === 'string') {
    throw new Error(error);
  }

  // Check for quota/rate limit errors (429)
  if (error?.error?.code === 429 || error?.error?.status === 'RESOURCE_EXHAUSTED') {
    const retryInfo = error.error.details?.find((d: any) => d['@type']?.includes('RetryInfo'));
    const retrySeconds = retryInfo?.retryDelay ? parseInt(retryInfo.retryDelay) : 60;
    
    const quotaFailure = error.error.details?.find((d: any) => d['@type']?.includes('QuotaFailure'));
    const violations = quotaFailure?.violations || [];
    
    // Create simple, user-friendly message
    const retryMinutes = Math.ceil(retrySeconds / 60);
    let quotaMessage = `Free tier limit reached. Please wait ${retryMinutes} minute${retryMinutes > 1 ? 's' : ''} or upgrade your plan.`;
    
    throw new QuotaExceededError(quotaMessage, retrySeconds, error.error.message || '');
  }
  
  // Handle billing/access errors
  if (error?.message?.includes('only accessible to billed users') || 
      error?.message?.includes('billing') ||
      error?.error?.message?.includes('only accessible to billed users')) {
    throw new Error('This feature requires a paid Google Cloud account with billing enabled. Please enable billing at https://console.cloud.google.com/billing');
  }
  
  // Handle other API errors - never show raw JSON
  if (error?.error?.message) {
    // Extract just the first line or first sentence of the error message
    const msg = error.error.message.split('\n')[0].split('.')[0];
    throw new Error(msg);
  }
  
  // If error has a message property
  if (error?.message) {
    throw new Error(error.message);
  }
  
  // Last resort - generic error message
  throw new Error('An unexpected error occurred. Please try again.');
}

// Standard safety settings to be less restrictive and prevent "API did not return an image" errors
// caused by false positives on safety checks.
const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

export async function generateSceneWithGemini(
  prompt: string,
  negativePrompt: string,
  characterImage: ImageAsset | null,
  styleImages: ImageAsset[],
  modelMode: 'light' | 'pro' | 'edit',
  resolution: '1K' | '2K' | '4K',
  aspectRatio: string,
  maskImage?: ImageAsset | null
): Promise<Omit<RefinementResult, 'id' | 'isFavorite' | 'prompt' | 'negativePrompt'>> {

  const API_KEY = localStorage.getItem('gemini_api_key');
  if (!API_KEY) {
    throw new Error("API Key is missing. Please set your API Key in settings.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Use Gemini 3 Pro for Edit mode as it follows complex instructions (Image + Mask) significantly better than Flash
  const modelName = (modelMode === 'pro' || modelMode === 'edit') ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

  const parts: any[] = [];
  
  // 1. Add Images first to establish visual context
  if (characterImage) {
    parts.push({
      inlineData: {
        data: characterImage.base64,
        mimeType: characterImage.mimeType,
      },
    });
  }
  
  if (modelMode === 'edit' && maskImage) {
      parts.push({
          inlineData: {
              data: maskImage.base64,
              mimeType: maskImage.mimeType,
          },
      });
  }

  if (styleImages.length > 0 && modelMode !== 'edit') {
      if (modelMode === 'light') {
          // Light mode only supports one style image effectively in this UI flow
          const img = styleImages[0];
          parts.push({
            inlineData: {
                data: img.base64,
                mimeType: img.mimeType,
            },
          });
      } else {
          // Pro mode: Add all style images
          for (const img of styleImages) {
              parts.push({
                  inlineData: {
                      data: img.base64,
                      mimeType: img.mimeType,
                  },
              });
          }
      }
  }

  // 2. Construct a very specific prompt for editing
  let fullPrompt = prompt;
  if (modelMode === 'edit') {
      fullPrompt = `Task: Inpainting and Image Editing.
Input 1: Original Source Image.
Input 2: Mask Image (White pixels define the area to edit; Black pixels define the area to keep unchanged).

INSTRUCTIONS:
1. Analyze Input 1 (Source) and Input 2 (Mask).
2. Keep the area corresponding to the BLACK pixels in the mask EXACTLY as it is in the Source Image.
3. Modify ONLY the area corresponding to the WHITE pixels in the mask.
4. The modification to apply in the white masked area is: "${prompt}".
5. Ensure seamless blending between the modified area and the original surrounding.`;
  }

  if (negativePrompt.trim()) {
    fullPrompt += `\n\nNegative prompt (avoid these elements): ${negativePrompt.trim()}`;
  }

  // 3. Add the text prompt last
  parts.push({ text: fullPrompt });

  const imageConfig: any = {
      // Flash Image supports aspect ratio, but user requested to hide UI. 
      // We pass the aspect ratio if it's set, or default "1:1".
      aspectRatio: aspectRatio, 
  };

  // imageSize is exclusive to Pro (Gemini 3 Pro Image)
  // We enable it for 'edit' as well since we switched 'edit' to use the Pro model
  if (modelMode === 'pro' || modelMode === 'edit') {
    imageConfig.imageSize = resolution;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: parts,
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        imageConfig: imageConfig,
        safetySettings: SAFETY_SETTINGS,
      },
    });

    let imageUrl: string | null = null;
    let text: string | null = null;

    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          } else if (part.text) {
            text = part.text;
          }
        }
    }

    if (!imageUrl) {
      throw new Error("API did not return an image. It might have been blocked due to safety settings.");
    }
    
    return { type: 'image', imageUrl, text };
  } catch (error) {
    handleApiError(error);
  }
}

export async function generateVideoWithVeo(
    prompt: string,
    image: ImageAsset | null,
    resolution: '720p' | '1080p',
    aspectRatio: string
): Promise<Omit<RefinementResult, 'id' | 'isFavorite' | 'prompt' | 'negativePrompt' | 'text'>> {
    
    const API_KEY = localStorage.getItem('gemini_api_key');
    if (!API_KEY) {
        throw new Error("API Key is missing. Please set your API Key in settings.");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Defensive check: Ensure resolution and aspect ratio are strictly valid for Veo
    // to prevent errors like "The string value 1K for resolution is invalid" if state is stale.
    const validAspectRatios = ['16:9', '9:16'];
    const finalAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '16:9';

    const validResolutions = ['720p', '1080p'];
    const finalResolution = validResolutions.includes(resolution) ? resolution : '720p';

    const model = 'veo-3.1-fast-generate-preview';
    
    try {
        // Construct payload
        let operation = await ai.models.generateVideos({
            model: model,
            prompt: prompt,
            image: image ? {
                imageBytes: image.base64,
                mimeType: image.mimeType,
            } : undefined,
            config: {
                numberOfVideos: 1,
                resolution: finalResolution as '720p' | '1080p',
                aspectRatio: finalAspectRatio
            }
        });

        // Polling loop
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.error) {
            throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (!downloadLink) {
            throw new Error("No video URI returned from the API.");
        }

        // Fetch the video content using the API key
        // Ensure we don't break the URL if it already has query parameters
        const separator = downloadLink.includes('?') ? '&' : '?';
        const response = await fetch(`${downloadLink}${separator}key=${API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }

        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);

        const thumbUrl = image ? image.dataUrl : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

        return {
            type: 'video',
            imageUrl: thumbUrl,
            videoUrl: videoUrl
        };
    } catch (error) {
        handleApiError(error);
    }
}

export async function generateImageAnalysis(
    image: ImageAsset
): Promise<AnalysisResult> {
    const API_KEY = localStorage.getItem('gemini_api_key');
    if (!API_KEY) {
        throw new Error("API Key is missing. Please set your API Key in settings.");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = 'gemini-3-flash-preview';

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: image.base64,
                            mimeType: image.mimeType
                        }
                    },
                    {
                        text: "Analyze this image. Provide a detailed description in 'description'. Then provide a short, precise prompt for image generation based on this image, maximum 100 characters, in 'shortPrompt'."
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING, description: "Detailed description of the image content and style." },
                        shortPrompt: { type: Type.STRING, description: "A concise image generation prompt, max 100 characters." }
                    },
                    required: ["description", "shortPrompt"]
                },
                safetySettings: SAFETY_SETTINGS,
            }
        });

        const resultText = response.text;
        if (!resultText) {
            throw new Error("No analysis returned from the model.");
        }

        try {
            const json = JSON.parse(resultText);
            return {
                description: json.description || "No description available.",
                shortPrompt: json.shortPrompt || "No prompt available."
            };
        } catch (e) {
            throw new Error("Failed to parse analysis results.");
        }
    } catch (error) {
        handleApiError(error);
    }
}

export async function generateConceptChat(
    history: ChatMessage[],
    newMessage: string,
    image?: ImageAsset | null,
    options?: {
        model?: 'gemini-3-flash-preview' | 'gemini-3-pro-preview';
        composedPrompt?: string;
        webSearchEnabled?: boolean;
    }
): Promise<string> {
    const API_KEY = localStorage.getItem('gemini_api_key');
    if (!API_KEY) {
        throw new Error("API Key is missing. Please set your API Key in settings.");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = options?.model || 'gemini-3-flash-preview';

    try {
        // Convert chat history to Content format expected by generateContent
        const contents: any[] = history.map(msg => ({
            role: msg.role,
            parts: msg.imageUrl ? [
                 { text: msg.text }
            ] : [{ text: msg.text }]
        }));

        // Add the current new message
        const currentParts: any[] = [];
        if (image) {
            currentParts.push({
                inlineData: {
                    data: image.base64,
                    mimeType: image.mimeType
                }
            });
        }
        
        // Use composed prompt if provided, otherwise use raw newMessage
        const messageText = options?.composedPrompt || newMessage;
        currentParts.push({ text: messageText });
        
        contents.push({
            role: 'user',
            parts: currentParts
        });

        // Build config with optional tools for web search
        const config: any = {
            temperature: 0.6,
            maxOutputTokens: getMaxOutputTokens(model),
            responseModalities: ["TEXT"],
            safetySettings: SAFETY_SETTINGS,
        };

        // Add tools if web search is enabled
        const tools: any[] = [];
        if (options?.webSearchEnabled) {
            tools.push({ googleSearch: {} });
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            tools: tools.length > 0 ? tools : undefined,
            config: config
        });

        return response.text || "No response generated.";
    } catch (error) {
        handleApiError(error);
    }
}
