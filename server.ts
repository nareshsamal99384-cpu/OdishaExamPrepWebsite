import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(express.json());

  // Admin Login API
  app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email === adminEmail && password === adminPassword) {
      // In a real app, you would set a secure cookie or return a JWT
      res.json({ 
        success: true, 
        user: { 
          email: adminEmail,
          role: 'admin'
        }
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid email or password" });
    }
  });

  // Razorpay Create Order API
  // Secure Price Resolution Helper
  async function getItemPriceSecurely(itemId: string): Promise<number> {
    if (itemId === 'site_wide_full_access') {
      return 999;
    }

    // 1. Exam Bundle
    if (itemId.startsWith('exam_bundle_')) {
      const examId = itemId.replace('exam_bundle_', '');
      const { data: exam, error } = await supabase
        .from('exams')
        .select('description')
        .eq('id', examId)
        .single();

      if (error || !exam) {
        throw new Error(`Exam bundle not found: ${examId}`);
      }

      const desc = exam.description || '';
      if (desc.startsWith('JSON_METADATA_')) {
        try {
          const meta = JSON.parse(desc.replace('JSON_METADATA_', ''));
          if (meta.price !== undefined) {
            return Number(meta.price);
          }
        } catch (e) {}
      }
      return 499;
    }

    // 2. Question Bank
    const { data: bank } = await supabase
      .from('questionBanks')
      .select('tagline')
      .eq('id', itemId)
      .single();

    if (bank) {
      const tagline = bank.tagline || '';
      if (tagline.includes('{"text"')) {
        try {
          const parsed = JSON.parse(tagline);
          if (parsed.price !== undefined) {
            return Number(parsed.price);
          }
        } catch (e) {}
      }
      return 499;
    }

    // 3. Test Series
    const { data: series } = await supabase
      .from('testSeries')
      .select('price')
      .eq('id', itemId)
      .single();

    if (series) {
      return Number(series.price || 499);
    }

    // 4. Mock Test
    const { data: test } = await supabase
      .from('mockTests')
      .select('seriesId')
      .eq('id', itemId)
      .single();

    if (test) {
      const seriesData = test.seriesId;
      if (typeof seriesData === 'string' && seriesData.startsWith('{')) {
        try {
          const parsed = JSON.parse(seriesData);
          if (parsed.price !== undefined) {
            return Number(parsed.price);
          }
        } catch (e) {}
      }
      if (seriesData && typeof seriesData === 'string' && !seriesData.startsWith('{')) {
        const { data: parentSeries } = await supabase
          .from('testSeries')
          .select('price')
          .eq('id', seriesData)
          .single();
        if (parentSeries) {
          return Number(parentSeries.price || 499);
        }
      }
      return 499;
    }

    throw new Error(`Catalog item not found: ${itemId}`);
  }

  // Razorpay Create Order API
  app.post("/api/payment/order", async (req, res) => {
    try {
      const { itemId, amount: clientAmount, currency = "INR" } = req.body;
      
      let price: number;
      if (itemId) {
        price = await getItemPriceSecurely(itemId);
      } else if (clientAmount) {
        console.warn("WARNING: Insecure payment order creation: client specified amount directly.");
        price = clientAmount / 100;
      } else {
        return res.status(400).json({ success: false, message: "itemId or amount is required" });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        console.error("Razorpay keys are missing in env");
        return res.status(500).json({ success: false, message: "Razorpay keys not configured on server" });
      }

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: Math.round(price * 100), // in paise (e.g. 49900)
          currency,
          receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Razorpay API Error:", data);
        return res.status(response.status).json({ success: false, error: data });
      }

      res.json({
        success: true,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
      });
    } catch (error: any) {
      console.error("Order creation error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to create Razorpay order" });
    }
  });

  // Razorpay Verify Signature API
  app.post("/api/payment/verify", (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: "Missing required signature parameters" });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return res.status(500).json({ success: false, message: "Razorpay secret key not configured" });
      }

      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const isValid = expectedSignature === razorpay_signature;

      if (isValid) {
        res.json({ success: true, message: "Payment verified successfully" });
      } else {
        res.status(400).json({ success: false, message: "Invalid signature, verification failed" });
      }
    } catch (error: any) {
      console.error("Signature verification error:", error);
      res.status(500).json({ success: false, message: error.message || "Verification failed" });
    }
  });

  // AI NIM Chat completions proxy route
  app.post("/api/chat/completions", async (req, res) => {
    try {
      let apiKey = process.env.VITE_DEEPSEEK_API_KEY || process.env.VITE_DENTA_RESPONSE_AI;
      let baseUrl = process.env.VITE_DEEPSEEK_BASE_URL || 'https://integrate.api.nvidia.com/v1';

      if (apiKey) apiKey = apiKey.replace(/^"|"$/g, '');
      if (baseUrl) baseUrl = baseUrl.replace(/^"|"$/g, '');

      if (!apiKey) {
        console.error("NVIDIA NIM API key is missing in env");
        return res.status(500).json({ error: "NVIDIA NIM API key is not configured on server." });
      }

      const { model, messages, temperature, max_tokens, stream, response_format } = req.body;

      const requestBody: any = {
        model,
        messages,
        temperature,
        stream,
      };

      if (max_tokens !== undefined && max_tokens !== null) {
        requestBody.max_tokens = max_tokens;
      }

      if (response_format) {
        requestBody.response_format = response_format;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("NIM API error status:", response.status, errorText);
          return res.status(response.status).json({ error: errorText });
        }

        if (stream) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");

          const reader = response.body?.getReader();

          if (reader) {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } else {
          const data = await response.json();
          res.json(data);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.error("NIM API request timed out (25s)");
          return res.status(504).json({ error: "Upstream NIM API request timed out after 25 seconds." });
        }
        throw error;
      }
    } catch (error: any) {
      console.error("NIM proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to communicate with OdishaExamPrep AI" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
