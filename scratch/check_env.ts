import dotenv from 'dotenv';
dotenv.config();
console.log("Loaded environment variables from .env:");
Object.keys(process.env).forEach(key => {
  if (key.includes("API") || key.includes("KEY") || key.includes("GEMINI") || key.includes("DEEPSEEK") || key.includes("NVIDIA") || key.includes("SUPABASE") || key.includes("SECRET")) {
    console.log(`- ${key}: ${process.env[key] ? 'DEFINED (length ' + process.env[key]!.length + ')' : 'UNDEFINED'}`);
  }
});
