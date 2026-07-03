import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { ROUTE_LIST } from "./src/lib/routes-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust environment variable loading for Hostinger and local setups
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Initialize Supabase Admin Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function routeToRegex(route: string): RegExp {
  const escaped = route.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const paramPattern = escaped.replace(/:[A-Za-z0-9_]+/g, '([^/]+)');
  return new RegExp(`^${paramPattern}$`, 'i');
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  const PORT = process.env.PORT || "3000";

  const distPath = __dirname.endsWith('dist') || __dirname.endsWith('dist/') || __dirname.endsWith('dist\\')
    ? path.resolve(__dirname, '.')
    : path.resolve(__dirname, 'dist');

  const isProduction = process.env.NODE_ENV === "production" || 
                        process.env.NODE_ENV === "prod" || 
                        (!process.env.npm_lifecycle_event?.includes('dev') && 
                         fs.existsSync(path.join(distPath, 'index.html')));

  // Redirect www to non-www in production for canonical SEO consistency
  app.use((req, res, next) => {
    if (isProduction && req.headers.host && req.headers.host.startsWith('www.')) {
      const newHost = req.headers.host.slice(4);
      return res.redirect(301, `https://${newHost}${req.originalUrl}`);
    }
    next();
  });

  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // CORS middleware for Web and App access
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      "https://www.odishaexamprep.in",
      "https://odishaexamprep.in",
      "http://localhost",
      "http://localhost:5173",
      "http://localhost:3000",
      "capacitor://localhost"
    ];
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else if (!origin) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Simple in-memory cache for Supabase token verification
  interface CachedUser {
    user: any;
    expiry: number;
  }
  const tokenCache = new Map<string, CachedUser>();
  const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes TTL

  // AI Rate Limiting cache and middleware
  const aiRateLimitCache = new Map<string, { count: number; resetAt: number }>();
  const ANON_LIMIT = 5;
  const USER_LIMIT = 500;
  const WINDOW_MS = 60 * 60 * 1000;

  const checkAiRateLimit = (req: any, res: any, next: any) => {
    // AI rate limiting has been disabled to allow unlimited AI queries.
    next();
  };

  // Clean up expired cached tokens periodically to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [token, cached] of tokenCache.entries()) {
      if (cached.expiry <= now) {
        tokenCache.delete(token);
      }
    }
    for (const [key, record] of aiRateLimitCache.entries()) {
      if (now > record.resetAt) {
        aiRateLimitCache.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref();

  // AI rate limiting has been disabled to allow unlimited AI queries.

  // Middleware to verify if request is from an authenticated user
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing authorization token" });
      }
      const token = authHeader.split(" ")[1];

      const now = Date.now();
      const cached = tokenCache.get(token);
      if (cached && cached.expiry > now) {
        req.user = cached.user;
        return next();
      }

      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: "Invalid authorization token" });
      }

      // Store in cache
      tokenCache.set(token, {
        user,
        expiry: now + CACHE_TTL_MS
      });

      req.user = user;
      next();
    } catch (err) {
      return res.status(500).json({ error: "Authentication check failed" });
    }
  };

  // Middleware to verify if request is from an authorized admin
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing authorization token" });
      }
      const token = authHeader.split(" ")[1];

      const now = Date.now();
      const cached = tokenCache.get(token);
      let user = cached && cached.expiry > now ? cached.user : null;

      if (!user) {
        const { data: { user: freshUser }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !freshUser) {
          return res.status(401).json({ error: "Invalid authorization token" });
        }
        user = freshUser;
        tokenCache.set(token, {
          user,
          expiry: now + CACHE_TTL_MS
        });
      }

      const adminEmails = ['odishaexamprep365@gmail.com', 'nareshsamal99384@gmail.com'];
      const isAuthorized = adminEmails.includes(user.email || '');

      let isAdmin = isAuthorized;
      if (!isAdmin) {
        const { data: profile } = await supabaseAdmin
          .from("users")
          .select("role")
          .eq("uid", user.id)
          .single();
        isAdmin = profile?.role === 'admin';
      }

      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      req.user = user;
      next();
    } catch (err) {
      return res.status(500).json({ error: "Authentication check failed" });
    }
  };

  // Admin Users List Endpoint
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      
      const mapped = users.map(au => ({
        uid: au.id,
        email: au.email,
        displayName: au.user_metadata?.displayName || au.user_metadata?.full_name || au.user_metadata?.name || au.email?.split('@')[0],
        photoURL: au.user_metadata?.photoURL || au.user_metadata?.avatar_url || au.user_metadata?.picture,
        role: au.user_metadata?.role || 'user',
        hasFullAccess: !!au.user_metadata?.hasFullAccess,
        purchasedSeries: au.user_metadata?.purchasedSeries || []
      }));
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list users" });
    }
  });

  // Admin User Update Endpoint & Entitlement Synchronization
  app.post("/api/admin/users/update", requireAdmin, async (req, res) => {
    try {
      const { userId, updates, password } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // 1. Sync the public.user_purchases table ledger BEFORE updating user auth metadata
      if (updates && (updates.purchasedSeries !== undefined || updates.hasFullAccess !== undefined)) {
        const { data: dbPurchases, error: dbErr } = await supabaseAdmin
          .from("user_purchases")
          .select("product_id, status")
          .eq("user_id", userId);
          
        if (!dbErr) {
          const dbPurchasesList = dbPurchases || [];
          
          // Determine existing active items
          const dbActiveProductIds = new Set(dbPurchasesList
            .filter((p: any) => p.status === 'active')
            .map((p: any) => p.product_id));
            
          let targetActiveProductIds: string[] = [];
          if (updates.purchasedSeries !== undefined) {
            targetActiveProductIds = [...updates.purchasedSeries];
          } else {
            // Keep current active from DB
            targetActiveProductIds = dbPurchasesList
              .filter((p: any) => p.status === 'active')
              .map((p: any) => p.product_id);
          }
          
          // Handle hasFullAccess synchronization
          const wantsFullAccess = updates.hasFullAccess !== undefined 
            ? updates.hasFullAccess 
            : targetActiveProductIds.includes('full_access');
            
          if (wantsFullAccess) {
            if (!targetActiveProductIds.includes('full_access')) {
              targetActiveProductIds.push('full_access');
            }
          } else {
            targetActiveProductIds = targetActiveProductIds.filter(id => id !== 'full_access');
          }
          
          const targetActiveSet = new Set(targetActiveProductIds);
          
          // Activate or insert new items
          for (const prodId of targetActiveProductIds) {
            if (!dbActiveProductIds.has(prodId)) {
              let productType = 'unknown';
              if (prodId === 'full_access') productType = 'system';
              else if (prodId.startsWith('exam_bundle_')) productType = 'exam_bundle';
              else if (prodId.startsWith('series_') || prodId.startsWith('test_series_')) productType = 'test_series';
              else if (prodId.startsWith('mock_test_')) productType = 'mock_test';
              else if (prodId.startsWith('question_bank_')) productType = 'question_bank';
              
              const resolvedPrice = prodId === 'full_access' ? 999 : 499;
              
              const { error: upsertErr } = await supabaseAdmin
                .from("user_purchases")
                .upsert({
                  user_id: userId,
                  product_id: prodId,
                  product_type: productType,
                  price_paid: resolvedPrice,
                  status: 'active',
                  purchase_date: new Date().toISOString()
                }, { onConflict: 'user_id,product_id' });
                
              if (upsertErr) {
                console.error(`[Admin User Update Sync] Failed to upsert purchase for ${prodId}:`, upsertErr);
              }
            }
          }
          
          // Deactivate items that were removed
          const itemsToDeactivate = dbPurchasesList
            .filter((p: any) => p.status === 'active' && !targetActiveSet.has(p.product_id))
            .map((p: any) => p.product_id);
            
          for (const prodId of itemsToDeactivate) {
            const { error: updateErr } = await supabaseAdmin
              .from("user_purchases")
              .update({ status: 'inactive' })
              .eq('user_id', userId)
              .eq('product_id', prodId);
              
            if (updateErr) {
              console.error(`[Admin User Update Sync] Failed to deactivate purchase for ${prodId}:`, updateErr);
            }
          }
        }
      }

      // 2. Perform the Auth metadata update
      const params: any = {};
      if (updates) {
        params.user_metadata = updates;
      }
      if (password) {
        params.password = password;
      }
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, params);
      if (error) throw error;
      
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Admin User Update Error]", err);
      res.status(500).json({ error: err.message || "Failed to update user" });
    }
  });

  // Admin Login API
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      // Sync with Supabase Auth
      try {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const existingAdmin = (users as any[]).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

        if (!existingAdmin) {
          const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'admin' }
          });
          if (createError) throw createError;
          console.log(`[Admin Login Sync] Created new admin user in Supabase Auth: ${email}`);
        } else {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingAdmin.id, {
            password,
            user_metadata: { ...existingAdmin.user_metadata, role: 'admin' }
          });
          if (updateError) throw updateError;
          console.log(`[Admin Login Sync] Synchronized admin password for user: ${email}`);
        }
      } catch (authSyncErr: any) {
        console.error("[Admin Login Sync Error] Non-fatal auth synchronization failure:", authSyncErr);
      }

      res.json({ 
        success: true, 
        user: { 
          email: adminEmail,
          role: 'admin'
        }
      });
    } catch (err: any) {
      console.error("[Admin Login API Error]", err);
      res.status(500).json({ success: false, message: err.message || "Internal server error" });
    }
  });

  // Helper to resolve official product prices from database
  const getProductPrice = async (productId: string, productType: string): Promise<number> => {
    if (productId === 'full_access') {
      return 999; // Fallback global Full Access price
    }

    if (productType === 'exam_bundle' || productType === 'exam' || productId.startsWith('exam_bundle_')) {
      const examId = productId.replace('exam_bundle_', '');
      const { data: exam, error } = await supabaseAdmin
        .from('exams')
        .select('description')
        .eq('id', examId)
        .single();

      if (error || !exam) {
        throw new Error(`Exam bundle not found: ${examId}`);
      }

      if ((exam.description || '').startsWith('JSON_METADATA_')) {
        try {
          const meta = JSON.parse(exam.description.replace('JSON_METADATA_', ''));
          return Number(meta.price) || 499;
        } catch (e) {
          throw new Error('Failed to parse exam metadata');
        }
      }
      throw new Error('Exam is not premium');
    }

    if (productType === 'test_series' || productType === 'series') {
      const { data: series, error } = await supabaseAdmin
        .from('testSeries')
        .select('price')
        .eq('id', productId)
        .single();

      if (error || !series) {
        throw new Error(`Test Series not found: ${productId}`);
      }
      return Number(series.price) || 499;
    }

    if (productType === 'mock_test' || productType === 'mockTest') {
      const { data: test, error } = await supabaseAdmin
        .from('mockTests')
        .select('seriesId')
        .eq('id', productId)
        .single();

      if (error || !test) {
        throw new Error(`Mock Test not found: ${productId}`);
      }

      try {
        if (test.seriesId && test.seriesId.startsWith('{')) {
          const parsed = JSON.parse(test.seriesId);
          if (parsed.isPremium) {
            return Number(parsed.price) || 499;
          }
        }
      } catch (e) {}
      throw new Error('Mock Test is not premium');
    }

    if (productType === 'question_bank' || productType === 'questionBank') {
      const { data: bank, error } = await supabaseAdmin
        .from('questionBanks')
        .select('tagline, isPremium')
        .eq('id', productId)
        .single();

      if (error || !bank) {
        throw new Error(`Question Bank not found: ${productId}`);
      }

      if (!bank.isPremium) {
        throw new Error('Question Bank is not premium');
      }

      try {
        if (bank.tagline && bank.tagline.includes('{"text"')) {
          const parsed = JSON.parse(bank.tagline);
          return Number(parsed.price) || 499;
        }
      } catch (e) {}
      return 499;
    }

    throw new Error(`Unsupported product type: ${productType}`);
  };

  // Razorpay Create Order API
  app.post("/api/payment/order", async (req, res) => {
    try {
      const { productId, productType, userId, currency = "INR" } = req.body;
      if (!productId || !productType) {
        return res.status(400).json({ success: false, message: "productId and productType are required" });
      }

      // Fetch official price to prevent pricing manipulation
      let price: number;
      try {
        price = await getProductPrice(productId, productType);
      } catch (priceErr: any) {
        return res.status(400).json({ success: false, message: priceErr.message || "Failed to resolve product price" });
      }

      const amountPaise = price * 100; // price in INR to paise

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
          amount: Math.round(amountPaise), // in paise (e.g. 49900)
          currency,
          receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          notes: {
            productId,
            productType,
            userId: userId || "unknown"
          }
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

  // Razorpay Verify Signature API & Entitlement Creation
  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        userId,
        productId,
        productType,
        pricePaid,
        snapshot
      } = req.body;

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

      if (!isValid) {
        return res.status(400).json({ success: false, message: "Invalid signature, verification failed" });
      }

      // 1. Fetch payment status and verification info from Razorpay API directly
      const keyId = process.env.RAZORPAY_KEY_ID;
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpPayRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });

      if (!rzpPayRes.ok) {
        return res.status(400).json({ success: false, message: "Failed to fetch transaction details from Razorpay" });
      }

      const paymentDetails = await rzpPayRes.json();
      if (paymentDetails.status !== 'captured') {
        return res.status(400).json({ success: false, message: "Transaction status is not captured" });
      }
      if (paymentDetails.order_id !== razorpay_order_id) {
        return res.status(400).json({ success: false, message: "Order ID mismatch" });
      }

      // Fetch the order from Razorpay to verify cryptographically bound notes
      const rzpOrderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });

      if (!rzpOrderRes.ok) {
        return res.status(400).json({ success: false, message: "Failed to fetch order details from Razorpay" });
      }

      const orderDetails = await rzpOrderRes.json();
      const verifiedNotes = orderDetails.notes || {};
      const noteProductId = verifiedNotes.productId;
      const noteUserId = verifiedNotes.userId;

      // Allow "unknown" noteUserId for legacy checkouts where the client didn't send userId during order creation.
      const hasUserIdMismatch = userId && noteUserId && noteUserId !== "unknown" && noteUserId !== userId;
      if (noteProductId !== productId || hasUserIdMismatch) {
        return res.status(400).json({ success: false, message: "Payment parameters mismatch. Secure verification failed." });
      }

      // Resolve database price to ensure no discrepancy
      let resolvedPrice = 0;
      if (userId && productId) {
        try {
          resolvedPrice = await getProductPrice(productId, productType);
        } catch (e) {
          // If we couldn't resolve price, fallback to using pricePaid or Razorpay amount
          resolvedPrice = Number(pricePaid) || (paymentDetails.amount / 100);
        }
      }

      const expectedAmountPaise = resolvedPrice * 100;
      if (Math.round(paymentDetails.amount) !== Math.round(expectedAmountPaise)) {
        return res.status(400).json({ success: false, message: "Paid amount does not match product price" });
      }

      // 2. Prevent replay attack: Check for duplicate transaction
      const { data: existingPurchase, error: checkError } = await supabaseAdmin
        .from("user_purchases")
        .select("user_id, product_id")
        .eq("razorpay_payment_id", razorpay_payment_id);

      if (existingPurchase && existingPurchase.length > 0) {
        const isSameUserAndProduct = existingPurchase.some(p => p.user_id === userId && p.product_id === productId);
        if (isSameUserAndProduct) {
          return res.json({ success: true, message: "Payment already verified and credited" });
        } else {
          return res.status(400).json({ success: false, message: "Duplicate transaction. Signature already processed." });
        }
      }

      // If user and product information are provided, record it in the ledger and update user metadata
      if (userId && productId) {
        console.log(`Payment verified. Creating entitlement in ledger for User: ${userId}, Product: ${productId}`);
        
        // 1. Insert or update the purchase record in the user_purchases table
        const { error: dbError } = await supabaseAdmin
          .from("user_purchases")
          .upsert(
            {
              user_id: userId,
              product_id: productId,
              product_type: productType || "unknown",
              price_paid: Number(resolvedPrice),
              razorpay_order_id,
              razorpay_payment_id,
              snapshot: snapshot || {},
              status: "active",
              purchase_date: new Date().toISOString()
            },
            { onConflict: "user_id,product_id" }
          );

        if (dbError) {
          console.error("Failed to insert purchase record into database ledger:", dbError);
        }

        // 2. Fetch all active purchases for this user to rebuild their cached list of entitlements
        const { data: userPurchases, error: fetchError } = await supabaseAdmin
          .from("user_purchases")
          .select("product_id")
          .eq("user_id", userId)
          .eq("status", "active");

        if (fetchError) {
          console.error("Failed to fetch user purchases to sync metadata:", fetchError);
        } else {
          // Rebuild purchasedSeries array and determine full access status
          const purchasedIds = (userPurchases || []).map(p => p.product_id);
          const hasFullAccess = purchasedIds.includes("full_access");

          // 3. Update the user metadata in Supabase Auth to refresh their browser token/session cache
          const { data: userData, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (!getUserErr && userData?.user) {
            const currentMetadata = userData.user.user_metadata || {};
            const updatedPurchased = Array.from(new Set([
              ...(currentMetadata.purchasedSeries || []),
              ...purchasedIds
            ]));

            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
              user_metadata: {
                ...currentMetadata,
                purchasedSeries: updatedPurchased,
                hasFullAccess: hasFullAccess || !!currentMetadata.hasFullAccess
              }
            });

            if (authError) {
              console.error("Failed to sync user metadata in Supabase Auth:", authError);
            } else {
              console.log(`Successfully synchronized entitlements cache for user: ${userId}`);
            }
          } else {
            console.error("Failed to fetch user auth profile to sync metadata:", getUserErr);
          }
        }
      } else {
        console.warn("Payment verified but no userId/productId context was received to create an entitlement ledger record.");
      }

      res.json({ success: true, message: "Payment verified successfully" });
    } catch (error: any) {
      console.error("Signature verification error:", error);
      res.status(500).json({ success: false, message: error.message || "Verification failed" });
    }
  });

  // Direct Razorpay Order Status Check API (Bypasses webhook and client-side callback failures)
  app.post("/api/payment/check-status", async (req, res) => {
    try {
      const { orderId, userId, productId, productType } = req.body;
      if (!orderId || !userId) {
        return res.status(400).json({ success: false, message: "orderId and userId are required" });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return res.status(500).json({ success: false, message: "Razorpay keys not configured on server" });
      }

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      // 1. Fetch order details from Razorpay to check if it's paid
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });

      if (!orderRes.ok) {
        return res.status(orderRes.status).json({ success: false, message: "Failed to fetch order details from Razorpay" });
      }

      const orderDetails = await orderRes.json();
      
      // If the order has been paid in full
      if (orderDetails.status === 'paid' || orderDetails.amount_paid > 0) {
        // Fetch order's payments to get the captured payment ID
        const paymentsRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
          headers: {
            Authorization: `Basic ${auth}`
          }
        });

        if (!paymentsRes.ok) {
          return res.status(paymentsRes.status).json({ success: false, message: "Failed to fetch payments for order" });
        }

        const paymentsData = await paymentsRes.json();
        const successfulPayment = (paymentsData.items || []).find((p: any) => p.status === 'captured' || p.status === 'authorized');

        if (successfulPayment) {
          const paymentId = successfulPayment.id;
          const pricePaid = successfulPayment.amount / 100;
          
          const notes = orderDetails.notes || {};
          const finalProductId = notes.productId || productId;
          const finalProductType = notes.productType || productType || 'unknown';

          if (!finalProductId) {
            return res.status(400).json({ success: false, message: "Product context missing in payment" });
          }

          // 2. Prevent replay attacks: Check for duplicate transaction
          const { data: existingPurchase } = await supabaseAdmin
            .from("user_purchases")
            .select("id")
            .eq("razorpay_payment_id", paymentId);

          if (existingPurchase && existingPurchase.length > 0) {
            return res.json({ success: true, status: 'unlocked', message: "Payment already verified and credited" });
          }

          console.log(`[Check Status] Direct verification success. Recording purchase for User: ${userId}, Product: ${finalProductId}`);

          // 3. Create purchase record in database ledger
          const { error: dbError } = await supabaseAdmin
            .from("user_purchases")
            .upsert(
              {
                user_id: userId,
                product_id: finalProductId,
                product_type: finalProductType,
                price_paid: Number(pricePaid),
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                status: "active",
                purchase_date: new Date().toISOString()
              },
              { onConflict: "user_id,product_id" }
            );

          if (dbError) {
            console.error("[Check Status] Failed to insert purchase record:", dbError);
          }

          // 4. Rebuild user entitlements and sync metadata in Supabase Auth
          const { data: userPurchases } = await supabaseAdmin
            .from("user_purchases")
            .select("product_id")
            .eq("user_id", userId)
            .eq("status", "active");

          const purchasedIds = (userPurchases || []).map(p => p.product_id);
          if (!purchasedIds.includes(finalProductId)) {
            purchasedIds.push(finalProductId);
          }
          const hasFullAccess = purchasedIds.includes("full_access");

          const { data: userData, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (!getUserErr && userData?.user) {
            const currentMetadata = userData.user.user_metadata || {};
            const updatedPurchased = Array.from(new Set([
              ...(currentMetadata.purchasedSeries || []),
              ...purchasedIds
            ]));

            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
              user_metadata: {
                ...currentMetadata,
                purchasedSeries: updatedPurchased,
                hasFullAccess: hasFullAccess || !!currentMetadata.hasFullAccess
              }
            });
            if (authError) {
              console.error("[Check Status] Failed to sync user metadata in Supabase Auth:", authError);
            }
          }

          return res.json({ success: true, status: 'unlocked', message: "Payment verified and unlocked successfully" });
        }
      }

      return res.json({ success: true, status: 'pending', message: "Payment is still pending or not completed" });
    } catch (error: any) {
      console.error("[Check Status Error]", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  });

  // Admin Content Revoke Endpoint (Deactivates user_purchases & removes from user metadata in bulk)
  app.post("/api/admin/content/revoke", requireAdmin, async (req, res) => {
    try {
      const { productId, relatedIds } = req.body;
      if (!productId) {
        return res.status(400).json({ error: "productId is required" });
      }

      const idsToRevoke = [productId, ...(relatedIds || [])];

      // 1. Update user_purchases table for all users
      const { error: dbError } = await supabaseAdmin
        .from("user_purchases")
        .update({ status: 'inactive' })
        .in("product_id", idsToRevoke)
        .eq("status", "active");

      if (dbError) throw dbError;

      // 2. Fetch all users from Supabase Auth and update their metadata
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      let successCount = 0;
      for (const u of users) {
        const currentPurchased = u.user_metadata?.purchasedSeries || [];
        const newPurchased = currentPurchased.filter((p: string) => !idsToRevoke.includes(p));
        if (newPurchased.length !== currentPurchased.length) {
          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
            user_metadata: {
              ...u.user_metadata,
              purchasedSeries: newPurchased
            }
          });
          if (!authError) {
             successCount++;
          }
        }
      }

      res.json({ success: true, count: successCount });
    } catch (err: any) {
      console.error("[Admin Content Revoke Error]", err);
      res.status(500).json({ error: err.message || "Failed to revoke content" });
    }
  });

  let schemaHasDiagram: boolean | null = null;
  const checkSchemaHasDiagram = async (): Promise<boolean> => {
    if (schemaHasDiagram !== null) return schemaHasDiagram;
    try {
      const { error } = await supabaseAdmin
        .from('questions')
        .select('diagram')
        .limit(1);
      schemaHasDiagram = !error;
    } catch (e) {
      schemaHasDiagram = false;
    }
    return schemaHasDiagram;
  };

  // Admin Questions Bulk Upload Endpoint
  app.post("/api/admin/questions/bulk", requireAdmin, async (req, res) => {
    try {
      const { questions } = req.body;
      if (!Array.isArray(questions)) {
        return res.status(400).json({ error: "questions must be an array" });
      }

      const hasDiagramCol = await checkSchemaHasDiagram();
      const payloads = questions.map(q => {
        const payload: any = {
          examId: q.examId,
          topic: q.topic,
          difficulty: q.difficulty || 'medium',
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation || ''
        };
        if (q.diagram && hasDiagramCol) {
          payload.diagram = q.diagram;
        }
        return payload;
      });

      const { data, error } = await supabaseAdmin
        .from('questions')
        .insert(payloads)
        .select();

      if (error) throw error;
      res.json({ success: true, count: data?.length || 0, data });
    } catch (err: any) {
      console.error("[Admin Questions Bulk Error]", err);
      res.status(500).json({ error: err.message || "Failed to bulk upload questions" });
    }
  });

  // Admin Questions Paginated list Endpoint
  app.get("/api/admin/questions", requireAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const search = (req.query.search as string || '').trim().replace(/,/g, '');
      const examId = req.query.examId as string || 'all';
      const questionFilter = req.query.questionFilter as string || 'all';

      const offset = (page - 1) * limit;

      // Count and fetch
      let query = supabaseAdmin.from('questions').select('*', { count: 'exact' });

      // Apply examId filter
      if (examId !== 'all') {
        query = query.eq('examId', examId);
      }

      // Apply questionFilter
      if (questionFilter === 'practice') {
        query = query.not('topic', 'ilike', 'mocktest__%');
      } else if (questionFilter === 'mock') {
        query = query.ilike('topic', 'mocktest__%');
      }

      // Apply search query
      if (search) {
        query = query.or(`questionText.ilike.%${search}%,topic.ilike.%${search}%`);
      }

      // Apply pagination and sorting (newest questions first)
      query = query
        .order('createdAt', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      res.json({
        success: true,
        data,
        count: data?.length || 0,
        totalCount: count || 0
      });
    } catch (err: any) {
      console.error("[Admin Questions Paginated Error]", err);
      res.status(500).json({ error: err.message || "Failed to fetch paginated questions" });
    }
  });

  // Admin DB Proxy endpoint for write operations
  app.post("/api/admin/db/:table", requireAdmin, async (req, res) => {
    try {
      const { table } = req.params;
      const { action, payload, id, filters } = req.body;
      
      const allowedTables = ['exams', 'testSeries', 'mockTests', 'questions', 'questionBanks', 'users'];
      if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: `Table ${table} is not allowed` });
      }

      let result: any;
      if (action === 'insert') {
        const { data, error } = await supabaseAdmin.from(table).insert(Array.isArray(payload) ? payload : [payload]).select();
        if (error) throw error;
        result = data;
      } else {
        // Build base query for UPDATE or DELETE
        let query: any;
        if (action === 'update') {
          query = supabaseAdmin.from(table).update(payload);
        } else if (action === 'delete') {
          query = supabaseAdmin.from(table).delete();
        } else {
          return res.status(400).json({ error: `Action ${action} is not supported` });
        }

        // Apply filters
        if (id) {
          query = query.eq('id', id);
        } else if (filters && typeof filters === 'object') {
          Object.keys(filters).forEach(col => {
            const filter = filters[col];
            if (filter && typeof filter === 'object') {
              const { op, val } = filter;
              if (op === 'eq') query = query.eq(col, val);
              if (op === 'in') query = query.in(col, val);
              if (op === 'like') query = query.like(col, val);
            }
          });
        } else {
          return res.status(400).json({ error: 'ID or filters is required for update/delete' });
        }

        const { data, error } = await query.select();
        if (error) throw error;
        result = data;
      }

      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error(`[Admin DB Proxy Error - ${req.params.table}]`, err);
      res.status(500).json({ error: err.message || "Database proxy operation failed" });
    }
  });

  // Razorpay Webhook Endpoint
  app.post("/api/payment/webhook", async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
      
      if (signature && secret) {
        const shasum = crypto.createHmac("sha256", secret);
        const rawBody = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);
        shasum.update(rawBody);
        const digest = shasum.digest("hex");
        if (digest !== signature) {
          console.warn("[Webhook] Invalid signature, verification failed");
          return res.status(400).json({ status: "invalid_signature" });
        }
      }

      const { event, payload } = req.body;
      console.log(`[Webhook received] Event: ${event}`);

      if (event === "payment.captured" || event === "order.paid") {
        const payment = payload.payment.entity;
        const notes = payment.notes || {};
        const productId = notes.productId;
        const userId = notes.userId;
        const orderId = payment.order_id;
        const paymentId = payment.id;
        const pricePaid = payment.amount / 100;

        if (!userId || userId === "unknown" || !productId) {
          console.warn(`[Webhook] Missing or invalid userId/productId in payment notes:`, notes);
          return res.json({ status: "ignored_missing_notes" });
        }

        console.log(`[Webhook] Processing captured payment: User ${userId}, Product ${productId}`);

        // Re-verify that the product price matches the amount paid to prevent fraud
        let expectedPrice = 0;
        try {
          expectedPrice = await getProductPrice(productId, notes.productType || "unknown");
        } catch (e) {
          expectedPrice = pricePaid;
        }

        const expectedAmountPaise = expectedPrice * 100;
        if (Math.round(payment.amount) !== Math.round(expectedAmountPaise)) {
          console.error(`[Webhook] Price paid mismatch: paid ${payment.amount / 100}, expected ${expectedPrice}`);
          return res.status(400).json({ status: "amount_mismatch" });
        }

        // Prevent duplicate transaction: Check for existing active purchases
        const { data: existingPurchase } = await supabaseAdmin
          .from("user_purchases")
          .select("id")
          .eq("razorpay_payment_id", paymentId);

        if (existingPurchase && existingPurchase.length > 0) {
          console.log(`[Webhook] Payment ${paymentId} already processed.`);
          return res.json({ status: "already_processed" });
        }

        // Create entitlement in ledger
        const { error: dbError } = await supabaseAdmin
          .from("user_purchases")
          .upsert(
            {
              user_id: userId,
              product_id: productId,
              product_type: notes.productType || "unknown",
              price_paid: Number(pricePaid),
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              status: "active",
              purchase_date: new Date().toISOString()
            },
            { onConflict: "user_id,product_id" }
          );

        if (dbError) {
          console.error("[Webhook] Failed to insert purchase record:", dbError);
        }

        // Sync metadata in Supabase Auth
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userData?.user) {
          const currentMetadata = userData.user.user_metadata || {};
          const currentPurchased = currentMetadata.purchasedSeries || [];
          if (!currentPurchased.includes(productId)) {
            const updatedPurchased = Array.from(new Set([...currentPurchased, productId]));
            const hasFullAccess = updatedPurchased.includes("full_access");
            
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
              user_metadata: {
                ...currentMetadata,
                purchasedSeries: updatedPurchased,
                hasFullAccess: hasFullAccess || !!currentMetadata.hasFullAccess
              }
            });
            if (authError) {
              console.error("[Webhook] Failed to sync user metadata:", authError);
            }
          }
        }
      }

      res.json({ status: "success" });
    } catch (err: any) {
      console.error("[Webhook Error]", err);
      res.status(500).json({ error: err.message || "Webhook processing failed" });
    }
  });

  // AI Chat completions proxy route (optimized for Nvidia NIM / DeepSeek)
  app.post("/api/chat/completions", checkAiRateLimit, async (req, res) => {
    try {
      const { model, messages, temperature, max_tokens, stream, response_format } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages must be an array" });
      }

      const totalContentLength = messages.reduce((acc: number, m: any) => acc + (m.content?.length || 0), 0);
      if (totalContentLength > 150000) {
        return res.status(400).json({ error: "Request content too large" });
      }

      let apiKey = process.env.VITE_DEEPSEEK_API_KEY || process.env.VITE_DENTA_RESPONSE_AI;
      let baseUrl = process.env.VITE_DEEPSEEK_BASE_URL || 'https://integrate.api.nvidia.com/v1';

      if (apiKey) apiKey = apiKey.replace(/^"|"$/g, '');
      if (baseUrl) baseUrl = baseUrl.replace(/^"|"$/g, '');

      if (!apiKey) {
        console.error("NVIDIA NIM API key is missing in env");
        return res.status(500).json({ error: "NVIDIA NIM API key is not configured on server." });
      }

      const requestBody: any = {
        model: model || 'meta/llama-3.1-8b-instruct',
        messages,
        temperature: temperature !== undefined ? temperature : 0.2,
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

      const abortHandler = () => {
        controller.abort();
      };

      // Listen to response stream close (client disconnect) instead of request close
      res.on('close', abortHandler);

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

        if (!response.ok) {
          const errorText = await response.text();
          console.error("NIM API error status:", response.status, errorText);
          if (!res.headersSent) {
            return res.status(response.status).json({ error: errorText });
          }
          return;
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
        if (error.name === 'AbortError') {
          console.error("NIM API request was aborted or timed out");
          if (!res.headersSent) {
            return res.status(504).json({ error: "Upstream NIM API request timed out or was cancelled." });
          }
          return;
        }
        throw error;
      } finally {
        res.off('close', abortHandler);
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      console.error("NIM proxy error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to communicate with OdishaExamPrep AI" });
      }
    }
  });

  // Redirect legacy WordPress URLs to the new home page or specific pages (301 Permanent Redirect)
  app.get(['/shop*', '/cart*', '/my-account*', '/checkout*', '/product*', '/courses*', '/course*', '/all-courses*', '/home*', '/category*', '/tag*', '/author*'], (req, res) => {
    const pathLower = req.path.toLowerCase();
    
    // Check if the old URL contains exam keywords to redirect to the new exam pages
    if (pathLower.includes('opsc')) {
      return res.redirect(301, '/exams/opsc-aio');
    }
    if (pathLower.includes('osssc')) {
      return res.redirect(301, '/exams/osssc');
    }
    if (pathLower.includes('ossc')) {
      return res.redirect(301, '/exams/ossc');
    }
    
    // Check for policies
    if (pathLower.includes('terms-conditions') || pathLower.includes('terms-and-conditions')) {
      return res.redirect(301, '/terms-of-service');
    }
    if (pathLower.includes('privacy-policy-2')) {
      return res.redirect(301, '/privacy-policy');
    }
    
    // Default fallback to home page
    res.redirect(301, '/');
  });

  // SEO Middleware (Pre-injects metadata for Google and social crawlers for main, blog, and exam pages)
  app.get(['/', '/blog', '/blog/:id', '/exams/:id', '/privacy-policy', '/terms-of-service', '/refund-policy', '/admin-login'], async (req, res, next) => {
    if (!isProduction) {
      return next();
    }
    try {
      const baseUrl = 'https://odishaexamprep.in';
      const canonicalUrl = `${baseUrl}${req.path}`;
      const pathName = req.path;

      let title = "OdishaExamPrep - Best Platform for Odisha Exam Preparation";
      let description = "Excel in OPSC, OSSC, OSSSC, and other Odisha government competitive exams. Practice with expert-crafted mock tests, real-time rank analytics, and detailed syllabus roadmaps.";
      let keywords = "Odisha Exam Prep, OPSC, OSSC, OSSSC, Odisha Government Exams, Mock Tests, Odisha GK, Competitive Exams Odisha";
      let imageUrl = `${baseUrl}/student.webp`; // High resolution default image
      let schemaJson = "";
      let ogType = "website";

      if (pathName.startsWith('/blog')) {
        const blogId = req.params.id;
        title = "OEP Knowledge Base & Prep Blog | OdishaExamPrep";
        description = "Expert strategy guides, syllabus breakdowns, recruitment updates, current affairs, and comprehensive preparation strategies for OPSC, OSSC, and OSSSC aspirants in Odisha.";
        keywords = "odisha exam preparation, opsc cse blog, ossc cgl tips, osssc ri amin prep, current affairs odisha, exam syllabus, how to crack opsc";
        imageUrl = `${baseUrl}/student.webp`;
        ogType = "article";

        if (blogId) {
          const { data: blog, error } = await supabaseAdmin
            .from('exams')
            .select('*')
            .eq('id', blogId)
            .eq('category', 'blog')
            .single();

          if (blog && !error) {
            title = blog.metaTitle || `${blog.name} | OdishaExamPrep`;
            description = blog.metaDescription || (blog.description.replace(/<[^>]*>/g, '').substring(0, 155).trim() + '...');
            keywords = blog.keywords || `${blog.name.toLowerCase()}, odisha exams, prep`;
            if (blog.icon) {
              imageUrl = blog.icon.startsWith('http') ? blog.icon : `https://nareshsamal99384-cpu.supabase.co/storage/v1/object/public/exams/${blog.icon}`;
            }
            
            const schemaObj = {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": canonicalUrl
              },
              "headline": blog.name,
              "description": description,
              "image": imageUrl,
              "datePublished": blog.examDate || blog.createdAt,
              "dateModified": blog.createdAt,
              "author": {
                "@type": "Organization",
                "name": "OdishaExamPrep Editorial Team",
                "url": baseUrl
              },
              "publisher": {
                "@type": "Organization",
                "name": "OdishaExamPrep"
              }
            };
          }
        }
      } else if (pathName.startsWith('/exams/')) {
        const examId = req.params.id;
        title = "OEP Exam Mock Tests & Prep Series | OdishaExamPrep";
        description = "Excel in your Odisha Government Exams (OPSC, OSSC, OSSSC) with high-quality, timed practice mock tests and syllabus roadmaps.";
        keywords = "odisha exams, opsc mock test, ossc cgl mock test, osssc ri amin practice, test series, pyqs";

        if (examId) {
          try {
            const { data: exam, error } = await supabaseAdmin
              .from('exams')
              .select('*')
              .eq('id', examId)
              .single();

            if (exam && !error) {
              title = exam.metaTitle || `${exam.name} Mock Test Series | OdishaExamPrep`;
              description = exam.metaDescription || `Practice high-quality online mock tests, test series, and previous year questions for ${exam.name} in Odisha. Enhance your preparation with detailed analytics.`;
              keywords = exam.keywords || `${exam.name.toLowerCase()} mock test, ${exam.name.toLowerCase()} preparation, odisha exams`;
              if (exam.icon) {
                imageUrl = exam.icon.startsWith('http') ? exam.icon : `https://nareshsamal99384-cpu.supabase.co/storage/v1/object/public/exams/${exam.icon}`;
              }

              const schemaObj = {
                "@context": "https://schema.org",
                "@type": "WebPage",
                "name": title,
                "description": description,
                "url": canonicalUrl,
                "publisher": {
                  "@type": "EducationalOrganization",
                  "name": "OdishaExamPrep",
                  "logo": `${baseUrl}/android-chrome-512x512.png`
                }
              };
              schemaJson = `<script type="application/ld+json" id="json-ld-schema">${JSON.stringify(schemaObj)}</script>`;
            }
          } catch (dbErr) {
            console.error("[SEO Exam DB Error]", dbErr);
          }
        }
      } else if (pathName === '/privacy-policy') {
        title = "Privacy Policy | OdishaExamPrep";
        description = "Read the Privacy Policy of OdishaExamPrep. Learn how we collect, protect, and use your personal information securely.";
        keywords = "privacy policy, odishaexamprep privacy, user data safety";
        imageUrl = `${baseUrl}/apple-touch-icon.png`;
      } else if (pathName === '/terms-of-service') {
        title = "Terms of Service | OdishaExamPrep";
        description = "Read the Terms of Service for OdishaExamPrep. Understand the rules, guidelines, and terms governing your use of our preparation platform.";
        keywords = "terms of service, odishaexamprep terms, platform rules";
        imageUrl = `${baseUrl}/apple-touch-icon.png`;
      } else if (pathName === '/refund-policy') {
        title = "Refund & Cancellation Policy | OdishaExamPrep";
        description = "Read the Refund & Cancellation Policy of OdishaExamPrep. Learn about our refund guidelines for mock test purchases.";
        keywords = "refund policy, cancellation policy, odishaexamprep refund";
        imageUrl = `${baseUrl}/apple-touch-icon.png`;
      } else if (pathName === '/admin-login') {
        title = "Admin Login | OdishaExamPrep";
        description = "Secure portal for OdishaExamPrep administrators to manage courses, exams, subscribers, and analytics.";
        keywords = "admin login, odishaexamprep portal";
        imageUrl = `${baseUrl}/apple-touch-icon.png`;
      } else if (pathName === '/') {
        // Add custom Structured Data (JSON-LD) for home page SEO (WebSite and Organization)
        const schemaObj = [
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "OdishaExamPrep",
            "url": baseUrl,
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${baseUrl}/?search={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "OdishaExamPrep",
            "url": baseUrl,
            "logo": `${baseUrl}/android-chrome-512x512.png`,
            "description": "Odisha's leading EdTech platform providing high-quality mock tests, timed test series, previous year questions, and AI mentor support for OPSC, OSSC, and OSSSC government competitive examinations.",
            "address": {
              "@type": "PostalAddress",
              "addressRegion": "Odisha",
              "addressCountry": "IN"
            },
            "knowsAbout": [
              "OPSC Civil Services Examination",
              "OSSC Combined Graduate Level",
              "OSSSC RI/ARI & Amin Recruitment",
              "Odisha Government Competitive Exams"
            ]
          }
        ];
        schemaJson = `<script type="application/ld+json" id="json-ld-schema">${JSON.stringify(schemaObj)}</script>`;
      }

      // Read index.html from dev or prod path
      const htmlPath = path.join(distPath, 'index.html');
      
      if (!fs.existsSync(htmlPath)) {
        return next(); // Fallback to standard express static serving
      }

      let html = fs.readFileSync(htmlPath, 'utf8');

      // Clean up any pre-existing description/og/twitter tags from index.html to prevent duplication
      html = html.replace(/<title>.*?<\/title>/gi, '');
      html = html.replace(/<meta[^>]*name="description"[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*name="title"[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*name="keywords"[^>]*>/gi, '');
      html = html.replace(/<link[^>]*rel="canonical"[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*property="og:[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*name="twitter:[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*property="twitter:[^>]*>/gi, '');
      html = html.replace(/<script[^>]*id="json-ld-schema"[^>]*>.*?<\/script>/gis, '');

      // Inject SEO tags inside <head>
      const ogMetaTags = `
    <title>${title}</title>
    <meta name="title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="keywords" content="${keywords.replace(/"/g, '&quot;')}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="OdishaExamPrep" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${imageUrl}" />
    ${schemaJson}
  `;

      // Inject inside <head>
      html = html.replace('<head>', `<head>${ogMetaTags}`);

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (err) {
      console.error("[SEO Middleware Error]", err);
      next();
    }
  });

  // Sitemap Cache Variables
  let cachedSitemap: string | null = null;
  let sitemapCacheTime = 0;
  const SITEMAP_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours cache

  // Dynamic sitemap.xml generator for SEO search engine indexing
  app.get(['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml'], async (req, res) => {
    try {
      const now = Date.now();
      if (cachedSitemap && (now - sitemapCacheTime < SITEMAP_CACHE_DURATION)) {
        res.setHeader('Content-Type', 'application/xml');
        return res.status(200).send(cachedSitemap);
      }

      const host = 'odishaexamprep.in';
      const baseUrl = `https://${host}`;

      // Static routes (Ensure homepage has trailing slash for consistency)
      const staticRoutes = [
        '/',
        '/blog',
        '/privacy-policy',
        '/terms-of-service',
        '/refund-policy'
      ];

      // Fetch dynamic blog routes and exam routes from Supabase database
      const { data: rawExams } = await supabaseAdmin
        .from('exams')
        .select('id, category, createdAt, is_archived');

      const blogs = rawExams ? rawExams.filter(e => e.category === 'blog').sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()) : [];
      const exams = rawExams ? rawExams.filter(e => e.category !== 'system' && e.category !== 'blog' && e.is_archived !== true) : [];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // Add static URLs
      staticRoutes.forEach(route => {
        xml += `  <url>\n`;
        const locUrl = route === '/' ? `${baseUrl}/` : `${baseUrl}${route}`;
        xml += `    <loc>${locUrl}</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>${route === '/' ? '1.0' : '0.8'}</priority>\n`;
        xml += `  </url>\n`;
      });

      // Add dynamic exam URLs
      if (exams) {
        exams.forEach(exam => {
          const lastMod = exam.createdAt ? new Date(exam.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/exams/${exam.id}</loc>\n`;
          xml += `    <lastmod>${lastMod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.9</priority>\n`;
          xml += `  </url>\n`;
        });
      }

      // Add dynamic blog URLs
      if (blogs) {
        blogs.forEach(blog => {
          const lastMod = blog.createdAt ? new Date(blog.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/blog/${blog.id}</loc>\n`;
          xml += `    <lastmod>${lastMod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.7</priority>\n`;
          xml += `  </url>\n`;
        });
      }

      xml += `</urlset>`;

      cachedSitemap = xml;
      sitemapCacheTime = now;

      res.setHeader('Content-Type', 'application/xml');
      res.status(200).send(xml);
    } catch (err) {
      console.error("[Sitemap Error]", err);
      if (cachedSitemap) {
        res.setHeader('Content-Type', 'application/xml');
        return res.status(200).send(cachedSitemap);
      }
      res.status(500).end();
    }
  });

  // Dynamic robots.txt handler
  app.get('/robots.txt', (req, res) => {
    const sitemapUrl = `https://odishaexamprep.in/sitemap.xml`;
    const txt = `User-agent: *\nAllow: /\nAllow: /blog\nAllow: /blog/*\nDisallow: /admin\nDisallow: /admin-login\nSitemap: ${sitemapUrl}\n`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(txt);
  });

  // Vite middleware for development
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const matches = ROUTE_LIST.some(route => {
        const regex = routeToRegex(route);
        return regex.test(req.path);
      });

      const htmlPath = path.join(distPath, 'index.html');
      if (fs.existsSync(htmlPath)) {
        if (!matches) {
          res.status(404);
          let html = fs.readFileSync(htmlPath, 'utf8');
          html = html.replace('<head>', '<head><meta name="robots" content="noindex, nofollow" />');
          return res.send(html);
        }
        return res.sendFile(htmlPath);
      }
      res.status(404).send('Not Found');
    });
  }

  if (isNaN(Number(PORT))) {
    app.listen(PORT, () => {
      console.log(`Server running on socket ${PORT}`);
    });
  } else {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
