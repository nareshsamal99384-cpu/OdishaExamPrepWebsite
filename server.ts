import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  app.post("/api/payment/order", async (req, res) => {
    try {
      const { amount, currency = "INR" } = req.body;
      if (!amount) {
        return res.status(400).json({ success: false, message: "Amount is required" });
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
          amount: Math.round(amount), // in paise (e.g. 49900)
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
