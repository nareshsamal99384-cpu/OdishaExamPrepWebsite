import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: 'Hello!' }]
      })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
test();
