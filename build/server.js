var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// src/lib/routes-config.ts
var ROUTE_PATHS = {
  HOME: "/",
  ADMIN_LOGIN: "/admin-login",
  PRIVACY_POLICY: "/privacy-policy",
  TERMS_OF_SERVICE: "/terms-of-service",
  REFUND_POLICY: "/refund-policy",
  BLOG: "/blog",
  BLOG_DETAIL: "/blog/:id",
  ADMIN: "/admin",
  NOT_FOUND: "/404",
  EXAM_DETAIL: "/exams/:examId"
};
var ROUTE_LIST = Object.values(ROUTE_PATHS);

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "..", ".env")
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
var supabaseUrl = process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "dummy_key_to_prevent_startup_crash";
var supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
if (supabaseUrl === "https://placeholder.supabase.co" || supabaseServiceKey === "dummy_key_to_prevent_startup_crash") {
  console.warn("\u26A0\uFE0F WARNING: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Supabase admin features will fail.");
}
function routeToRegex(route) {
  const escaped = route.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const paramPattern = escaped.replace(/:[A-Za-z0-9_]+/g, "([^/]+)");
  return new RegExp(`^${paramPattern}$`, "i");
}
async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  app.use((req, res, next) => {
    if (req.url.startsWith("/app-api/")) {
      req.url = req.url.replace("/app-api/", "/api/");
    }
    next();
  });
  const PORT = process.env.PORT || "3000";
  const distPath = __dirname.endsWith("build") || __dirname.endsWith("build/") || __dirname.endsWith("build\\") ? path.resolve(__dirname, ".") : path.resolve(__dirname, "build");
  try {
    const startupLogPath = path.join(distPath, "startup-log.json");
    const logInfo = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      filename: typeof __filename !== "undefined" ? __filename : "undefined",
      dirname: typeof __dirname !== "undefined" ? __dirname : "undefined",
      cwd: process.cwd(),
      distPath,
      nodeVersion: process.version,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT
      },
      message: "Server started and initialized successfully."
    };
    fs.writeFileSync(startupLogPath, JSON.stringify(logInfo, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write startup log:", err.message);
  }
  const isProduction = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "prod" || !process.env.npm_lifecycle_event?.includes("dev") && fs.existsSync(path.join(distPath, "index.html"));
  app.use(express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));
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
  const tokenCache = /* @__PURE__ */ new Map();
  const CACHE_TTL_MS = 2 * 60 * 1e3;
  const aiRateLimitCache = /* @__PURE__ */ new Map();
  const ANON_LIMIT = 5;
  const USER_LIMIT = 500;
  const WINDOW_MS = 60 * 60 * 1e3;
  const checkAiRateLimit = (req, res, next) => {
    next();
  };
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
  }, 10 * 60 * 1e3).unref();
  const requireAuth = async (req, res, next) => {
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
  const requireAdmin = async (req, res, next) => {
    const reqUrl = req.originalUrl || req.url;
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        fs.appendFileSync("c:\\Users\\Naresh Samal\\Downloads\\OdishaExamPrep Website\\scratch\\auth_requests.log", `[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${reqUrl} - 401 Missing token
`, "utf8");
        return res.status(401).json({ error: "Missing authorization token" });
      }
      const token = authHeader.split(" ")[1];
      const now = Date.now();
      const cached = tokenCache.get(token);
      let user = cached && cached.expiry > now ? cached.user : null;
      if (!user) {
        const { data: { user: freshUser }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !freshUser) {
          fs.appendFileSync("c:\\Users\\Naresh Samal\\Downloads\\OdishaExamPrep Website\\scratch\\auth_requests.log", `[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${reqUrl} - 401 Invalid token: ${error?.message || "user not found"}
`, "utf8");
          return res.status(401).json({ error: "Invalid authorization token" });
        }
        user = freshUser;
        tokenCache.set(token, {
          user,
          expiry: now + CACHE_TTL_MS
        });
      }
      const adminEmails = ["odishaexamprep365@gmail.com", "nareshsamal99384@gmail.com"];
      const isAuthorized = adminEmails.includes(user.email || "");
      let isAdmin = isAuthorized;
      if (!isAdmin) {
        const { data: profile } = await supabaseAdmin.from("users").select("role").eq("uid", user.id).single();
        isAdmin = profile?.role === "admin";
      }
      if (!isAdmin) {
        fs.appendFileSync("c:\\Users\\Naresh Samal\\Downloads\\OdishaExamPrep Website\\scratch\\auth_requests.log", `[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${reqUrl} - 403 Forbidden: user=${user.email || user.id}
`, "utf8");
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      fs.appendFileSync("c:\\Users\\Naresh Samal\\Downloads\\OdishaExamPrep Website\\scratch\\auth_requests.log", `[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${reqUrl} - SUCCESS user=${user.email || user.id}
`, "utf8");
      req.user = user;
      next();
    } catch (err) {
      fs.appendFileSync("c:\\Users\\Naresh Samal\\Downloads\\OdishaExamPrep Website\\scratch\\auth_requests.log", `[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${reqUrl} - 500 ERROR: ${err.message}
`, "utf8");
      return res.status(500).json({ error: "Authentication check failed" });
    }
  };
  app.get("/api/version", (req, res) => {
    res.json({
      version: "1.1.4",
      buildDate: (/* @__PURE__ */ new Date()).toISOString(),
      commit: "55ff5b3c-resolve-cache-issue",
      description: "OdishaExamPrep diagnostics endpoint"
    });
  });
  app.get("/api/diag", (req, res) => {
    try {
      const getDirFiles = (dirPath) => {
        try {
          return fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : null;
        } catch (e) {
          return { error: e.message };
        }
      };
      res.json({
        success: true,
        version: "1.1.4",
        time: (/* @__PURE__ */ new Date()).toISOString(),
        __dirname,
        cwd: process.cwd(),
        files: {
          root: getDirFiles(path.resolve(".")),
          build: getDirFiles(path.resolve("build")),
          buildAssets: getDirFiles(path.resolve("build/assets")),
          dist: getDirFiles(path.resolve("dist")),
          distAssets: getDirFiles(path.resolve("dist/assets"))
        },
        env: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error)
        throw error;
      const mapped = users.map((au) => ({
        uid: au.id,
        email: au.email,
        displayName: au.user_metadata?.displayName || au.user_metadata?.full_name || au.user_metadata?.name || au.email?.split("@")[0],
        photoURL: au.user_metadata?.photoURL || au.user_metadata?.avatar_url || au.user_metadata?.picture,
        role: au.user_metadata?.role || "user",
        hasFullAccess: !!au.user_metadata?.hasFullAccess,
        purchasedSeries: au.user_metadata?.purchasedSeries || []
      }));
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to list users" });
    }
  });
  app.post("/api/admin/users/update", requireAdmin, async (req, res) => {
    try {
      const { userId, updates, password } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      if (updates && (updates.purchasedSeries !== void 0 || updates.hasFullAccess !== void 0)) {
        const { data: dbPurchases, error: dbErr } = await supabaseAdmin.from("user_purchases").select("product_id, status").eq("user_id", userId);
        if (!dbErr) {
          const dbPurchasesList = dbPurchases || [];
          const dbActiveProductIds = new Set(dbPurchasesList.filter((p) => p.status === "active").map((p) => p.product_id));
          let targetActiveProductIds = [];
          if (updates.purchasedSeries !== void 0) {
            targetActiveProductIds = [...updates.purchasedSeries];
          } else {
            targetActiveProductIds = dbPurchasesList.filter((p) => p.status === "active").map((p) => p.product_id);
          }
          const wantsFullAccess = updates.hasFullAccess !== void 0 ? updates.hasFullAccess : targetActiveProductIds.includes("full_access");
          if (wantsFullAccess) {
            if (!targetActiveProductIds.includes("full_access")) {
              targetActiveProductIds.push("full_access");
            }
          } else {
            targetActiveProductIds = targetActiveProductIds.filter((id) => id !== "full_access");
          }
          const targetActiveSet = new Set(targetActiveProductIds);
          for (const prodId of targetActiveProductIds) {
            if (!dbActiveProductIds.has(prodId)) {
              let productType = "unknown";
              if (prodId === "full_access")
                productType = "system";
              else if (prodId.startsWith("exam_bundle_"))
                productType = "exam_bundle";
              else if (prodId.startsWith("series_") || prodId.startsWith("test_series_"))
                productType = "test_series";
              else if (prodId.startsWith("mock_test_"))
                productType = "mock_test";
              else if (prodId.startsWith("question_bank_"))
                productType = "question_bank";
              const resolvedPrice = prodId === "full_access" ? 999 : 499;
              const { error: upsertErr } = await supabaseAdmin.from("user_purchases").upsert({
                user_id: userId,
                product_id: prodId,
                product_type: productType,
                price_paid: resolvedPrice,
                status: "active",
                purchase_date: (/* @__PURE__ */ new Date()).toISOString()
              }, { onConflict: "user_id,product_id" });
              if (upsertErr) {
                console.error(`[Admin User Update Sync] Failed to upsert purchase for ${prodId}:`, upsertErr);
              }
            }
          }
          const itemsToDeactivate = dbPurchasesList.filter((p) => p.status === "active" && !targetActiveSet.has(p.product_id)).map((p) => p.product_id);
          for (const prodId of itemsToDeactivate) {
            const { error: updateErr } = await supabaseAdmin.from("user_purchases").update({ status: "inactive" }).eq("user_id", userId).eq("product_id", prodId);
            if (updateErr) {
              console.error(`[Admin User Update Sync] Failed to deactivate purchase for ${prodId}:`, updateErr);
            }
          }
        }
      }
      const params = {};
      if (updates) {
        params.user_metadata = updates;
      }
      if (password) {
        params.password = password;
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, params);
      if (error)
        throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("[Admin User Update Error]", err);
      res.status(500).json({ error: err.message || "Failed to update user" });
    }
  });
  app.post("/api/log-error", (req, res) => {
    try {
      console.log("[Client Error Logged]", req.body);
      __require("fs").writeFileSync("client_error.json", JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to write error" });
    }
  });
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
      try {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError)
          throw listError;
        const existingAdmin = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (!existingAdmin) {
          const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: "admin" }
          });
          if (createError)
            throw createError;
          console.log(`[Admin Login Sync] Created new admin user in Supabase Auth: ${email}`);
        } else {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingAdmin.id, {
            password,
            user_metadata: { ...existingAdmin.user_metadata, role: "admin" }
          });
          if (updateError)
            throw updateError;
          console.log(`[Admin Login Sync] Synchronized admin password for user: ${email}`);
        }
      } catch (authSyncErr) {
        console.error("[Admin Login Sync Error] Non-fatal auth synchronization failure:", authSyncErr);
      }
      res.json({
        success: true,
        user: {
          email: adminEmail,
          role: "admin"
        }
      });
    } catch (err) {
      console.error("[Admin Login API Error]", err);
      res.status(500).json({ success: false, message: err.message || "Internal server error" });
    }
  });
  const getProductPrice = async (productId, productType) => {
    if (productId === "full_access") {
      return 999;
    }
    if (productType === "exam_bundle" || productType === "exam" || productId.startsWith("exam_bundle_")) {
      const examId = productId.replace("exam_bundle_", "");
      const { data: exam, error } = await supabaseAdmin.from("exams").select("description").eq("id", examId).single();
      if (error || !exam) {
        throw new Error(`Exam bundle not found: ${examId}`);
      }
      if ((exam.description || "").startsWith("JSON_METADATA_")) {
        try {
          const meta = JSON.parse(exam.description.replace("JSON_METADATA_", ""));
          return Number(meta.price) || 499;
        } catch (e) {
          throw new Error("Failed to parse exam metadata");
        }
      }
      throw new Error("Exam is not premium");
    }
    if (productType === "test_series" || productType === "series") {
      const { data: series, error } = await supabaseAdmin.from("testSeries").select("price").eq("id", productId).single();
      if (error || !series) {
        throw new Error(`Test Series not found: ${productId}`);
      }
      return Number(series.price) || 499;
    }
    if (productType === "mock_test" || productType === "mockTest") {
      const { data: test, error } = await supabaseAdmin.from("mockTests").select("seriesId").eq("id", productId).single();
      if (error || !test) {
        throw new Error(`Mock Test not found: ${productId}`);
      }
      try {
        if (test.seriesId && test.seriesId.startsWith("{")) {
          const parsed = JSON.parse(test.seriesId);
          if (parsed.isPremium) {
            return Number(parsed.price) || 499;
          }
        }
      } catch (e) {
      }
      throw new Error("Mock Test is not premium");
    }
    if (productType === "question_bank" || productType === "questionBank") {
      const { data: bank, error } = await supabaseAdmin.from("questionBanks").select("tagline, isPremium").eq("id", productId).single();
      if (error || !bank) {
        throw new Error(`Question Bank not found: ${productId}`);
      }
      if (!bank.isPremium) {
        throw new Error("Question Bank is not premium");
      }
      try {
        if (bank.tagline && bank.tagline.includes('{"text"')) {
          const parsed = JSON.parse(bank.tagline);
          return Number(parsed.price) || 499;
        }
      } catch (e) {
      }
      return 499;
    }
    throw new Error(`Unsupported product type: ${productType}`);
  };
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
  const vapidEmail = process.env.ADMIN_EMAIL || "admin@odishaexamprep.in";
  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey);
  }
  app.get("/api/push/vapid-key", (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { userId, endpoint, p256dh, auth, deviceInfo = {} } = req.body;
      if (!userId || !endpoint || !p256dh || !auth) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
        { user_id: userId, endpoint, p256dh, auth, device_info: deviceInfo, is_active: true },
        { onConflict: "user_id,endpoint" }
      );
      if (error)
        throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      res.status(500).json({ error: err.message || "Failed to save subscription" });
    }
  });
  app.delete("/api/push/unsubscribe", async (req, res) => {
    try {
      const { userId, endpoint } = req.body;
      if (!userId || !endpoint) {
        return res.status(400).json({ error: "Missing userId or endpoint" });
      }
      const { error } = await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
      if (error)
        throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("[Push] Unsubscribe error:", err);
      res.status(500).json({ error: err.message || "Failed to remove subscription" });
    }
  });
  app.post("/api/push/send", requireAdmin, async (req, res) => {
    try {
      const {
        title,
        body,
        icon = "/android-chrome-192x192.png",
        imageUrl,
        clickUrl = "/",
        data = {},
        targetType = "all",
        // 'all' | 'users' | 'exam'
        targetIds = [],
        scheduledAt
      } = req.body;
      if (!title || !body) {
        return res.status(400).json({ error: "title and body are required" });
      }
      if (scheduledAt && new Date(scheduledAt) > /* @__PURE__ */ new Date()) {
        const { data: notif2, error } = await supabaseAdmin.from("push_notifications").insert({
          title,
          body,
          icon,
          image_url: imageUrl,
          click_url: clickUrl,
          data,
          target_type: targetType,
          target_ids: targetIds,
          status: "scheduled",
          scheduled_at: scheduledAt,
          created_by: req.user?.id || null
        }).select().single();
        if (error)
          throw error;
        return res.json({ success: true, scheduled: true, id: notif2.id });
      }
      const { data: notif, error: notifError } = await supabaseAdmin.from("push_notifications").insert({
        title,
        body,
        icon,
        image_url: imageUrl,
        click_url: clickUrl,
        data,
        target_type: targetType,
        target_ids: targetIds,
        status: "sending",
        created_by: req.user?.id || null
      }).select().single();
      if (notifError)
        throw notifError;
      let query = supabaseAdmin.from("push_subscriptions").select("*").eq("is_active", true);
      if (targetType === "users" && targetIds.length > 0) {
        query = query.in("user_id", targetIds);
      }
      const { data: subscriptions, error: subError } = await query;
      if (subError)
        throw subError;
      const payload = JSON.stringify({ title, body, icon, image: imageUrl, clickUrl, data });
      let successCount = 0;
      let failCount = 0;
      const invalidEndpoints = [];
      const BATCH_SIZE = 50;
      for (let i = 0; i < (subscriptions || []).length; i += BATCH_SIZE) {
        const batch = subscriptions.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (sub) => {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload
              );
              successCount++;
            } catch (err) {
              failCount++;
              if (err.statusCode === 404 || err.statusCode === 410) {
                invalidEndpoints.push(sub.endpoint);
              }
              console.error(`[Push] Failed to send to ${sub.endpoint.slice(0, 40)}:`, err.statusCode);
            }
          })
        );
      }
      if (invalidEndpoints.length > 0) {
        await supabaseAdmin.from("push_subscriptions").update({ is_active: false }).in("endpoint", invalidEndpoints);
      }
      await supabaseAdmin.from("push_notifications").update({
        status: "sent",
        sent_at: (/* @__PURE__ */ new Date()).toISOString(),
        delivery_stats: { total: (subscriptions || []).length, success: successCount, failed: failCount }
      }).eq("id", notif.id);
      res.json({ success: true, total: (subscriptions || []).length, successCount, failCount });
    } catch (err) {
      console.error("[Push] Send error:", err);
      res.status(500).json({ error: err.message || "Failed to send notifications" });
    }
  });
  app.get("/api/push/history", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(String(req.query.page || "1"));
      const limit = 20;
      const from = (page - 1) * limit;
      const { data, count, error } = await supabaseAdmin.from("push_notifications").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + limit - 1);
      if (error)
        throw error;
      res.json({ notifications: data, total: count, page, limit });
    } catch (err) {
      console.error("[Push] History error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch history" });
    }
  });
  app.post("/api/payment/order", async (req, res) => {
    try {
      const { productId, productType, userId, currency = "INR" } = req.body;
      if (!productId || !productType) {
        return res.status(400).json({ success: false, message: "productId and productType are required" });
      }
      let price;
      try {
        price = await getProductPrice(productId, productType);
      } catch (priceErr) {
        return res.status(400).json({ success: false, message: priceErr.message || "Failed to resolve product price" });
      }
      const amountPaise = price * 100;
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
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify({
          amount: Math.round(amountPaise),
          // in paise (e.g. 49900)
          currency,
          receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
          notes: {
            productId,
            productType,
            userId: userId || "unknown"
          }
        })
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
        currency: data.currency
      });
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to create Razorpay order" });
    }
  });
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
      const expectedSignature = crypto.createHmac("sha256", keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
      const isValid = expectedSignature === razorpay_signature;
      if (!isValid) {
        return res.status(400).json({ success: false, message: "Invalid signature, verification failed" });
      }
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
      if (paymentDetails.status !== "captured") {
        return res.status(400).json({ success: false, message: "Transaction status is not captured" });
      }
      if (paymentDetails.order_id !== razorpay_order_id) {
        return res.status(400).json({ success: false, message: "Order ID mismatch" });
      }
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
      const hasUserIdMismatch = userId && noteUserId && noteUserId !== "unknown" && noteUserId !== userId;
      if (noteProductId !== productId || hasUserIdMismatch) {
        return res.status(400).json({ success: false, message: "Payment parameters mismatch. Secure verification failed." });
      }
      let resolvedPrice = 0;
      if (userId && productId) {
        try {
          resolvedPrice = await getProductPrice(productId, productType);
        } catch (e) {
          resolvedPrice = Number(pricePaid) || paymentDetails.amount / 100;
        }
      }
      const expectedAmountPaise = resolvedPrice * 100;
      if (Math.round(paymentDetails.amount) !== Math.round(expectedAmountPaise)) {
        return res.status(400).json({ success: false, message: "Paid amount does not match product price" });
      }
      const { data: existingPurchase, error: checkError } = await supabaseAdmin.from("user_purchases").select("user_id, product_id").eq("razorpay_payment_id", razorpay_payment_id);
      if (existingPurchase && existingPurchase.length > 0) {
        const isSameUserAndProduct = existingPurchase.some((p) => p.user_id === userId && p.product_id === productId);
        if (isSameUserAndProduct) {
          return res.json({ success: true, message: "Payment already verified and credited" });
        } else {
          return res.status(400).json({ success: false, message: "Duplicate transaction. Signature already processed." });
        }
      }
      if (userId && productId) {
        console.log(`Payment verified. Creating entitlement in ledger for User: ${userId}, Product: ${productId}`);
        const { error: dbError } = await supabaseAdmin.from("user_purchases").upsert(
          {
            user_id: userId,
            product_id: productId,
            product_type: productType || "unknown",
            price_paid: Number(resolvedPrice),
            razorpay_order_id,
            razorpay_payment_id,
            snapshot: snapshot || {},
            status: "active",
            purchase_date: (/* @__PURE__ */ new Date()).toISOString()
          },
          { onConflict: "user_id,product_id" }
        );
        if (dbError) {
          console.error("Failed to insert purchase record into database ledger:", dbError);
        }
        const { data: userPurchases, error: fetchError } = await supabaseAdmin.from("user_purchases").select("product_id").eq("user_id", userId).eq("status", "active");
        if (fetchError) {
          console.error("Failed to fetch user purchases to sync metadata:", fetchError);
        } else {
          const purchasedIds = (userPurchases || []).map((p) => p.product_id);
          const hasFullAccess = purchasedIds.includes("full_access");
          const { data: userData, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (!getUserErr && userData?.user) {
            const currentMetadata = userData.user.user_metadata || {};
            const updatedPurchased = Array.from(/* @__PURE__ */ new Set([
              ...currentMetadata.purchasedSeries || [],
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
    } catch (error) {
      console.error("Signature verification error:", error);
      res.status(500).json({ success: false, message: error.message || "Verification failed" });
    }
  });
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
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });
      if (!orderRes.ok) {
        return res.status(orderRes.status).json({ success: false, message: "Failed to fetch order details from Razorpay" });
      }
      const orderDetails = await orderRes.json();
      if (orderDetails.status === "paid" || orderDetails.amount_paid > 0) {
        const paymentsRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
          headers: {
            Authorization: `Basic ${auth}`
          }
        });
        if (!paymentsRes.ok) {
          return res.status(paymentsRes.status).json({ success: false, message: "Failed to fetch payments for order" });
        }
        const paymentsData = await paymentsRes.json();
        const successfulPayment = (paymentsData.items || []).find((p) => p.status === "captured" || p.status === "authorized");
        if (successfulPayment) {
          const paymentId = successfulPayment.id;
          const pricePaid = successfulPayment.amount / 100;
          const notes = orderDetails.notes || {};
          const finalProductId = notes.productId || productId;
          const finalProductType = notes.productType || productType || "unknown";
          if (!finalProductId) {
            return res.status(400).json({ success: false, message: "Product context missing in payment" });
          }
          const { data: existingPurchase } = await supabaseAdmin.from("user_purchases").select("id").eq("razorpay_payment_id", paymentId);
          if (existingPurchase && existingPurchase.length > 0) {
            return res.json({ success: true, status: "unlocked", message: "Payment already verified and credited" });
          }
          console.log(`[Check Status] Direct verification success. Recording purchase for User: ${userId}, Product: ${finalProductId}`);
          const { error: dbError } = await supabaseAdmin.from("user_purchases").upsert(
            {
              user_id: userId,
              product_id: finalProductId,
              product_type: finalProductType,
              price_paid: Number(pricePaid),
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              status: "active",
              purchase_date: (/* @__PURE__ */ new Date()).toISOString()
            },
            { onConflict: "user_id,product_id" }
          );
          if (dbError) {
            console.error("[Check Status] Failed to insert purchase record:", dbError);
          }
          const { data: userPurchases } = await supabaseAdmin.from("user_purchases").select("product_id").eq("user_id", userId).eq("status", "active");
          const purchasedIds = (userPurchases || []).map((p) => p.product_id);
          if (!purchasedIds.includes(finalProductId)) {
            purchasedIds.push(finalProductId);
          }
          const hasFullAccess = purchasedIds.includes("full_access");
          const { data: userData, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (!getUserErr && userData?.user) {
            const currentMetadata = userData.user.user_metadata || {};
            const updatedPurchased = Array.from(/* @__PURE__ */ new Set([
              ...currentMetadata.purchasedSeries || [],
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
          return res.json({ success: true, status: "unlocked", message: "Payment verified and unlocked successfully" });
        }
      }
      return res.json({ success: true, status: "pending", message: "Payment is still pending or not completed" });
    } catch (error) {
      console.error("[Check Status Error]", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  });
  app.post("/api/admin/content/revoke", requireAdmin, async (req, res) => {
    try {
      const { productId, relatedIds } = req.body;
      if (!productId) {
        return res.status(400).json({ error: "productId is required" });
      }
      const idsToRevoke = [productId, ...relatedIds || []];
      const { error: dbError } = await supabaseAdmin.from("user_purchases").update({ status: "inactive" }).in("product_id", idsToRevoke).eq("status", "active");
      if (dbError)
        throw dbError;
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError)
        throw listError;
      let successCount = 0;
      for (const u of users) {
        const currentPurchased = u.user_metadata?.purchasedSeries || [];
        const newPurchased = currentPurchased.filter((p) => !idsToRevoke.includes(p));
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
    } catch (err) {
      console.error("[Admin Content Revoke Error]", err);
      res.status(500).json({ error: err.message || "Failed to revoke content" });
    }
  });
  let schemaHasDiagram = null;
  const checkSchemaHasDiagram = async () => {
    if (schemaHasDiagram !== null)
      return schemaHasDiagram;
    try {
      const { error } = await supabaseAdmin.from("questions").select("diagram").limit(1);
      schemaHasDiagram = !error;
    } catch (e) {
      schemaHasDiagram = false;
    }
    return schemaHasDiagram;
  };
  app.post("/api/admin/questions/bulk", requireAdmin, async (req, res) => {
    try {
      const { questions } = req.body;
      if (!Array.isArray(questions)) {
        return res.status(400).json({ error: "questions must be an array" });
      }
      const hasDiagramCol = await checkSchemaHasDiagram();
      const payloads = questions.map((q) => {
        const payload = {
          examId: q.examId,
          topic: q.topic,
          difficulty: q.difficulty || "medium",
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation || ""
        };
        if (q.diagram && hasDiagramCol) {
          payload.diagram = q.diagram;
        }
        return payload;
      });
      const { data, error } = await supabaseAdmin.from("questions").insert(payloads).select();
      if (error)
        throw error;
      res.json({ success: true, count: data?.length || 0, data });
    } catch (err) {
      console.error("[Admin Questions Bulk Error]", err);
      res.status(500).json({ error: err.message || "Failed to bulk upload questions" });
    }
  });
  app.get("/api/admin/questions", requireAdmin, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const search = (req.query.search || "").trim().replace(/,/g, "");
      const examId = req.query.examId || "all";
      const questionFilter = req.query.questionFilter || "all";
      const topic = req.query.topic || "all";
      const logLine = `[${(/* @__PURE__ */ new Date()).toISOString()}] page=${page} limit=${limit} search="${search}" examId="${examId}" questionFilter="${questionFilter}" topic="${topic}"
`;
      fs.appendFileSync("c:\\Users\\Naresh Samal\\Downloads\\OdishaExamPrep Website\\scratch\\api_requests.log", logLine, "utf8");
      const offset = (page - 1) * limit;
      let query = supabaseAdmin.from("questions").select("*", { count: "exact" });
      if (examId !== "all") {
        query = query.eq("examId", examId);
      }
      if (questionFilter === "practice") {
        query = query.not("topic", "ilike", "mocktest__%");
      } else if (questionFilter === "mock") {
        query = query.ilike("topic", "mocktest__%");
      }
      if (topic !== "all") {
        query = query.eq("topic", topic);
      }
      if (search) {
        query = query.or(`questionText.ilike.%${search}%,topic.ilike.%${search}%`);
      }
      query = query.order("createdAt", { ascending: false }).range(offset, offset + limit - 1);
      const { data, error, count } = await query;
      if (error)
        throw error;
      fs.appendFileSync("c:\\Users\\Naresh Samal\\Downloads\\OdishaExamPrep Website\\scratch\\api_requests.log", `[SUCCESS] returned ${data?.length} rows, totalCount=${count}
`, "utf8");
      res.json({
        success: true,
        data,
        count: data?.length || 0,
        totalCount: count || 0
      });
    } catch (err) {
      fs.appendFileSync("c:\\Users\\Naresh Samal\\Downloads\\OdishaExamPrep Website\\scratch\\api_requests.log", `[ERROR] ${err.message}
`, "utf8");
      console.error("[Admin Questions Paginated Error]", err);
      res.status(500).json({ error: err.message || "Failed to fetch paginated questions" });
    }
  });
  app.post("/api/admin/db/:table", requireAdmin, async (req, res) => {
    try {
      const { table } = req.params;
      const { action, payload, id, filters } = req.body;
      const allowedTables = ["exams", "testSeries", "mockTests", "questions", "questionBanks", "users"];
      if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: `Table ${table} is not allowed` });
      }
      let result;
      if (action === "insert") {
        const { data, error } = await supabaseAdmin.from(table).insert(Array.isArray(payload) ? payload : [payload]).select();
        if (error)
          throw error;
        result = data;
      } else {
        let query;
        if (action === "update") {
          query = supabaseAdmin.from(table).update(payload);
        } else if (action === "delete") {
          query = supabaseAdmin.from(table).delete();
        } else {
          return res.status(400).json({ error: `Action ${action} is not supported` });
        }
        if (id) {
          query = query.eq("id", id);
        } else if (filters && typeof filters === "object") {
          Object.keys(filters).forEach((col) => {
            const filter = filters[col];
            if (filter && typeof filter === "object") {
              const { op, val } = filter;
              if (op === "eq")
                query = query.eq(col, val);
              if (op === "in")
                query = query.in(col, val);
              if (op === "like")
                query = query.like(col, val);
            }
          });
        } else {
          return res.status(400).json({ error: "ID or filters is required for update/delete" });
        }
        const { data, error } = await query.select();
        if (error)
          throw error;
        result = data;
      }
      res.json({ success: true, data: result });
    } catch (err) {
      console.error(`[Admin DB Proxy Error - ${req.params.table}]`, err);
      res.status(500).json({ error: err.message || "Database proxy operation failed" });
    }
  });
  app.post("/api/payment/webhook", async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
      if (signature && secret) {
        const shasum = crypto.createHmac("sha256", secret);
        const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
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
        const { data: existingPurchase } = await supabaseAdmin.from("user_purchases").select("id").eq("razorpay_payment_id", paymentId);
        if (existingPurchase && existingPurchase.length > 0) {
          console.log(`[Webhook] Payment ${paymentId} already processed.`);
          return res.json({ status: "already_processed" });
        }
        const { error: dbError } = await supabaseAdmin.from("user_purchases").upsert(
          {
            user_id: userId,
            product_id: productId,
            product_type: notes.productType || "unknown",
            price_paid: Number(pricePaid),
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            status: "active",
            purchase_date: (/* @__PURE__ */ new Date()).toISOString()
          },
          { onConflict: "user_id,product_id" }
        );
        if (dbError) {
          console.error("[Webhook] Failed to insert purchase record:", dbError);
        }
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userData?.user) {
          const currentMetadata = userData.user.user_metadata || {};
          const currentPurchased = currentMetadata.purchasedSeries || [];
          if (!currentPurchased.includes(productId)) {
            const updatedPurchased = Array.from(/* @__PURE__ */ new Set([...currentPurchased, productId]));
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
    } catch (err) {
      console.error("[Webhook Error]", err);
      res.status(500).json({ error: err.message || "Webhook processing failed" });
    }
  });
  app.post("/api/chat/completions", checkAiRateLimit, async (req, res) => {
    try {
      const { model, messages, temperature, max_tokens, stream, response_format } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages must be an array" });
      }
      const totalContentLength = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
      if (totalContentLength > 15e4) {
        return res.status(400).json({ error: "Request content too large" });
      }
      let apiKey = process.env.VITE_DEEPSEEK_API_KEY || process.env.VITE_DENTA_RESPONSE_AI;
      let baseUrl = process.env.VITE_DEEPSEEK_BASE_URL || "https://integrate.api.nvidia.com/v1";
      if (apiKey)
        apiKey = apiKey.replace(/^"|"$/g, "");
      if (baseUrl)
        baseUrl = baseUrl.replace(/^"|"$/g, "");
      if (!apiKey) {
        console.error("NVIDIA NIM API key is missing in env");
        return res.status(500).json({ error: "NVIDIA NIM API key is not configured on server." });
      }
      const requestBody = {
        model: model || "meta/llama-3.1-8b-instruct",
        messages,
        temperature: temperature !== void 0 ? temperature : 0.2,
        stream
      };
      if (max_tokens !== void 0 && max_tokens !== null) {
        requestBody.max_tokens = max_tokens;
      }
      if (response_format) {
        requestBody.response_format = response_format;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25e3);
      const abortHandler = () => {
        controller.abort();
      };
      res.on("close", abortHandler);
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
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
              if (done)
                break;
              res.write(value);
            }
          }
          res.end();
        } else {
          const data = await response.json();
          res.json(data);
        }
      } catch (error) {
        if (error.name === "AbortError") {
          console.error("NIM API request was aborted or timed out");
          if (!res.headersSent) {
            return res.status(504).json({ error: "Upstream NIM API request timed out or was cancelled." });
          }
          return;
        }
        throw error;
      } finally {
        res.off("close", abortHandler);
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error("NIM proxy error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to communicate with OdishaExamPrep AI" });
      }
    }
  });
  app.get(["/shop*", "/cart*", "/my-account*", "/checkout*", "/product*", "/courses*", "/course*", "/all-courses*", "/home*", "/category*", "/tag*", "/author*"], (req, res) => {
    const pathLower = req.path.toLowerCase();
    if (pathLower.includes("opsc")) {
      return res.redirect(301, "/exams/opsc-aio");
    }
    if (pathLower.includes("osssc")) {
      return res.redirect(301, "/exams/osssc");
    }
    if (pathLower.includes("ossc")) {
      return res.redirect(301, "/exams/ossc");
    }
    if (pathLower.includes("terms-conditions") || pathLower.includes("terms-and-conditions")) {
      return res.redirect(301, "/terms-of-service");
    }
    if (pathLower.includes("privacy-policy-2")) {
      return res.redirect(301, "/privacy-policy");
    }
    res.redirect(301, "/");
  });
  app.get(["/", "/blog", "/blog/:id", "/privacy-policy", "/terms-of-service", "/refund-policy", "/admin-login"], async (req, res, next) => {
    if (!isProduction) {
      return next();
    }
    try {
      const host = req.get("host") || "odishaexamprep.in";
      const protocol = req.protocol || "https";
      const baseUrl = `${protocol}://${host}`;
      const canonicalUrl = `${baseUrl}${req.path}`;
      const pathName = req.path;
      let title = "OdishaExamPrep - Best Platform for Odisha Exam Preparation";
      let description = "Excel in OPSC, OSSC, OSSSC, and other Odisha government competitive exams. Practice with expert-crafted mock tests, real-time rank analytics, and detailed syllabus roadmaps.";
      let keywords = "Odisha Exam Prep, OPSC, OSSC, OSSSC, Odisha Government Exams, Mock Tests, Odisha GK, Competitive Exams Odisha";
      let imageUrl = `${baseUrl}/student.webp`;
      let schemaJson = "";
      let ogType = "website";
      if (pathName.startsWith("/blog")) {
        const blogId = req.params.id;
        title = "OEP Knowledge Base & Prep Blog | OdishaExamPrep";
        description = "Expert strategy guides, syllabus breakdowns, recruitment updates, current affairs, and comprehensive preparation strategies for OPSC, OSSC, and OSSSC aspirants in Odisha.";
        keywords = "odisha exam preparation, opsc cse blog, ossc cgl tips, osssc ri amin prep, current affairs odisha, exam syllabus, how to crack opsc";
        imageUrl = `${baseUrl}/student.webp`;
        ogType = "article";
        if (blogId) {
          const { data: blog, error } = await supabaseAdmin.from("exams").select("*").eq("id", blogId).eq("category", "blog").single();
          if (blog && !error) {
            title = blog.metaTitle || `${blog.name} | OdishaExamPrep`;
            description = blog.metaDescription || blog.description.replace(/<[^>]*>/g, "").substring(0, 155).trim() + "...";
            keywords = blog.keywords || `${blog.name.toLowerCase()}, odisha exams, prep`;
            if (blog.icon) {
              imageUrl = blog.icon.startsWith("http") ? blog.icon : `https://nareshsamal99384-cpu.supabase.co/storage/v1/object/public/exams/${blog.icon}`;
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
            schemaJson = `<script type="application/ld+json" id="json-ld-schema">${JSON.stringify(schemaObj)}</script>`;
          }
        }
      } else if (pathName === "/privacy-policy") {
        title = "Privacy Policy | OdishaExamPrep";
        description = "Read the Privacy Policy of OdishaExamPrep. Learn how we collect, protect, and use your personal information securely.";
        keywords = "privacy policy, odishaexamprep privacy, user data safety";
        imageUrl = `${baseUrl}/apple-touch-icon.png`;
      } else if (pathName === "/terms-of-service") {
        title = "Terms of Service | OdishaExamPrep";
        description = "Read the Terms of Service for OdishaExamPrep. Understand the rules, guidelines, and terms governing your use of our preparation platform.";
        keywords = "terms of service, odishaexamprep terms, platform rules";
        imageUrl = `${baseUrl}/apple-touch-icon.png`;
      } else if (pathName === "/refund-policy") {
        title = "Refund & Cancellation Policy | OdishaExamPrep";
        description = "Read the Refund & Cancellation Policy of OdishaExamPrep. Learn about our refund guidelines for mock test purchases.";
        keywords = "refund policy, cancellation policy, odishaexamprep refund";
        imageUrl = `${baseUrl}/apple-touch-icon.png`;
      } else if (pathName === "/admin-login") {
        title = "Admin Login | OdishaExamPrep";
        description = "Secure portal for OdishaExamPrep administrators to manage courses, exams, subscribers, and analytics.";
        keywords = "admin login, odishaexamprep portal";
        imageUrl = `${baseUrl}/apple-touch-icon.png`;
      } else if (pathName === "/") {
        const schemaObj = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "OdishaExamPrep",
          "url": baseUrl,
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${baseUrl}/?search={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        };
        schemaJson = `<script type="application/ld+json" id="json-ld-schema">${JSON.stringify(schemaObj)}</script>`;
      }
      const htmlPath = path.join(distPath, "index.html");
      if (!fs.existsSync(htmlPath)) {
        return next();
      }
      let html = fs.readFileSync(htmlPath, "utf8");
      html = html.replace(/<title>.*?<\/title>/gi, "");
      html = html.replace(/<meta[^>]*name="description"[^>]*>/gi, "");
      html = html.replace(/<meta[^>]*name="title"[^>]*>/gi, "");
      html = html.replace(/<meta[^>]*name="keywords"[^>]*>/gi, "");
      html = html.replace(/<link[^>]*rel="canonical"[^>]*>/gi, "");
      html = html.replace(/<meta[^>]*property="og:[^>]*>/gi, "");
      html = html.replace(/<meta[^>]*name="twitter:[^>]*>/gi, "");
      html = html.replace(/<meta[^>]*property="twitter:[^>]*>/gi, "");
      html = html.replace(/<script[^>]*id="json-ld-schema"[^>]*>.*?<\/script>/gi, "");
      const ogMetaTags = `
    <title>${title}</title>
    <meta name="title" content="${title.replace(/"/g, "&quot;")}" />
    <meta name="description" content="${description.replace(/"/g, "&quot;")}" />
    <meta name="keywords" content="${keywords.replace(/"/g, "&quot;")}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${title.replace(/"/g, "&quot;")}" />
    <meta property="og:description" content="${description.replace(/"/g, "&quot;")}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="OdishaExamPrep" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, "&quot;")}" />
    <meta name="twitter:description" content="${description.replace(/"/g, "&quot;")}" />
    <meta name="twitter:image" content="${imageUrl}" />
    ${schemaJson}
  `;
      html = html.replace("<head>", `<head>${ogMetaTags}`);
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.send(html);
    } catch (err) {
      console.error("[SEO Middleware Error]", err);
      next();
    }
  });
  app.get(["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"], async (req, res) => {
    try {
      const host = req.get("host") || "odishaexamprep.in";
      const protocol = req.protocol || "https";
      const baseUrl = `${protocol}://${host}`;
      const staticRoutes = [
        "",
        "/blog",
        "/privacy-policy",
        "/terms-of-service",
        "/refund-policy"
      ];
      const { data: rawExams } = await supabaseAdmin.from("exams").select("id, category, createdAt, is_archived");
      const blogs = rawExams ? rawExams.filter((e) => e.category === "blog").sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()) : [];
      const exams = rawExams ? rawExams.filter((e) => e.category !== "system" && e.category !== "blog" && e.is_archived !== true) : [];
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
      staticRoutes.forEach((route) => {
        xml += `  <url>
`;
        xml += `    <loc>${baseUrl}${route}</loc>
`;
        xml += `    <changefreq>daily</changefreq>
`;
        xml += `    <priority>${route === "" ? "1.0" : "0.8"}</priority>
`;
        xml += `  </url>
`;
      });
      if (exams) {
        exams.forEach((exam) => {
          const lastMod = exam.createdAt ? new Date(exam.createdAt).toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          xml += `  <url>
`;
          xml += `    <loc>${baseUrl}/exams/${exam.id}</loc>
`;
          xml += `    <lastmod>${lastMod}</lastmod>
`;
          xml += `    <changefreq>weekly</changefreq>
`;
          xml += `    <priority>0.9</priority>
`;
          xml += `  </url>
`;
        });
      }
      if (blogs) {
        blogs.forEach((blog) => {
          const lastMod = blog.createdAt ? new Date(blog.createdAt).toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          xml += `  <url>
`;
          xml += `    <loc>${baseUrl}/blog/${blog.id}</loc>
`;
          xml += `    <lastmod>${lastMod}</lastmod>
`;
          xml += `    <changefreq>weekly</changefreq>
`;
          xml += `    <priority>0.7</priority>
`;
          xml += `  </url>
`;
        });
      }
      xml += `</urlset>`;
      res.setHeader("Content-Type", "application/xml");
      res.send(xml);
    } catch (err) {
      console.error("[Sitemap Error]", err);
      res.status(500).end();
    }
  });
  app.get("/robots.txt", (req, res) => {
    const host = req.get("host") || "odishaexamprep.in";
    const protocol = req.protocol || "https";
    const sitemapUrl = `${protocol}://${host}/sitemap.xml`;
    const txt = `User-agent: *
Allow: /
Allow: /blog
Allow: /blog/*
Disallow: /admin
Disallow: /admin-login
Sitemap: ${sitemapUrl}
`;
    res.setHeader("Content-Type", "text/plain");
    res.send(txt);
  });
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, {
      setHeaders: (res, path2) => {
        if (path2.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));
    app.get("*", (req, res) => {
      const matches = ROUTE_LIST.some((route) => {
        const regex = routeToRegex(route);
        return regex.test(req.path);
      });
      const htmlPath = path.join(distPath, "index.html");
      if (fs.existsSync(htmlPath)) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        if (!matches) {
          res.status(404);
          let html2 = fs.readFileSync(htmlPath, "utf8");
          html2 = html2.replace("<head>", '<head><meta name="robots" content="noindex, nofollow" />');
          res.setHeader("Content-Type", "text/html");
          return res.send(html2);
        }
        let html = fs.readFileSync(htmlPath, "utf8");
        res.setHeader("Content-Type", "text/html");
        return res.send(html);
      }
      res.status(404).send("Not Found");
    });
  }
  const startListen = (retries = 5, delayMs = 1e3) => {
    if (isNaN(Number(PORT))) {
      app.listen(PORT, () => {
        console.log(`Server running on socket ${PORT}`);
      });
    } else {
      const server = app.listen(Number(PORT), "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
      server.on("error", (err) => {
        if (err.code === "EADDRINUSE" && retries > 0) {
          console.warn(`Port ${PORT} still in use, retrying in ${delayMs}ms... (${retries} retries left)`);
          setTimeout(() => startListen(retries - 1, delayMs), delayMs);
        } else {
          console.error("Server failed to start:", err);
          process.exit(1);
        }
      });
    }
  };
  startListen();
}
startServer();
