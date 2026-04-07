import { GoogleGenerativeAI } from '@google/generative-ai';

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

function getGeminiModel() {
  return getGenAI().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-pro' });
}

export async function generateStructuredData(prompt, imageBuffer = null, mimeType = 'image/jpeg') {
  const model = getGeminiModel();

  const content = [prompt];
  if (imageBuffer) {
    content.push({
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType
      }
    });
  }

  const result = await model.generateContent(content);
  const response = await result.response;
  const text = response.text();

  // Strip markdown code blocks if any
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');

  return JSON.parse(jsonMatch[0]);
}

export async function generateFloorPlanImage(prompt) {
  const imageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp-image-generation';
  const model = getGenAI().getGenerativeModel({
    model: imageModel,
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const parts = response.candidates?.[0]?.content?.parts || [];

  let imageBase64 = null;
  let imageMimeType = 'image/png';
  let textContent = '';

  for (const part of parts) {
    if (part.inlineData) {
      imageBase64 = part.inlineData.data;
      imageMimeType = part.inlineData.mimeType || 'image/png';
    }
    if (part.text) {
      textContent += part.text;
    }
  }

  return { imageBase64, imageMimeType, textContent };
}
