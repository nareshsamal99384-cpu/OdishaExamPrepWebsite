import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const apiKey = (process.env.VITE_DEEPSEEK_API_KEY || process.env.VITE_DENTA_RESPONSE_AI || "").replace(/^"|"$/g, '');
const baseUrl = (process.env.VITE_DEEPSEEK_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/^"|"$/g, '');

console.log("Using API Key:", apiKey.substring(0, 10) + "...");
console.log("Using Base URL:", baseUrl);

async function test() {
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: "Say hello!" }],
        temperature: 0.2,
      }),
    });

    console.log("Response Status:", response.status);
    const text = await response.text();
    console.log("Response Body:", text);
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

test();
