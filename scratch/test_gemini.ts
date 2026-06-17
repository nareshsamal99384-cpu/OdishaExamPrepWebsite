import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testGemini(key: string) {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gemini-1.5-flash",
        messages: [{ role: "user", content: "Say hello in one word!" }],
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

const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
if (key) {
  console.log("Testing with Gemini key from environment...");
  testGemini(key.replace(/^"|"$/g, ''));
} else {
  console.log("No Gemini API key found in env. Please pass it as argument: npx tsx scratch/test_gemini.ts <YOUR_KEY>");
  const arg = process.argv[2];
  if (arg) {
    testGemini(arg);
  }
}
