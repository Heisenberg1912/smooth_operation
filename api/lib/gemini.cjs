const { GoogleGenerativeAI } = require('@google/generative-ai');

function getGeminiModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-pro' });
}

async function generateStructuredData(prompt, imageBuffer = null, mimeType = 'image/jpeg') {
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

module.exports = { generateStructuredData };
