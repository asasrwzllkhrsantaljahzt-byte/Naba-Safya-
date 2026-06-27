import { Router } from "express";
import { db } from "@workspace/db";
import { repsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const SECRET = process.env.SESSION_SECRET || "water-factory-secret";

const hashPassword = (pw: string) =>
  crypto.createHmac("sha256", SECRET).update(pw).digest("hex");

const makeToken = (repId: number) => {
  const payload = JSON.stringify({ repId, ts: Date.now() });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  return `${b64}.${sig}`;
};

export const verifyToken = (token: string): { repId: number } | null => {
  try {
    const [b64, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(b64, "base64url").toString());
  } catch {
    return null;
  }
};

// Set/reset rep password (admin only — no auth required for initial setup)
router.post("/auth/rep/:id/set-password", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    if (!password || password.length < 4) return res.status(400).json({ error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
    const hashed = hashPassword(password);
    const [rep] = await db.update(repsTable).set({ password: hashed }).where(eq(repsTable.id, id)).returning();
    if (!rep) return res.status(404).json({ error: "المندوب غير موجود" });
    
    return res.json({ success: true, message: "تم تعيين كلمة المرور" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في تعيين كلمة المرور" });
  }
});

// Rep login
router.post("/auth/rep/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: "أدخل رقم الجوال وكلمة المرور" });

    const reps = await db.select().from(repsTable);
    const rep = reps.find((r) => r.phone === phone);
    if (!rep) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    if (!rep.password) return res.status(401).json({ error: "لم يتم تعيين كلمة مرور لهذا الحساب، تواصل مع الإدارة" });
    if (!rep.isActive) return res.status(401).json({ error: "الحساب موقوف" });

    const hashed = hashPassword(password);
    if (hashed !== rep.password) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

    const token = makeToken(rep.id);
    return res.json({
      token,
      rep: {
        id: rep.id,
        name: rep.name,
        phone: rep.phone,
        area: rep.area,
      },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في تسجيل الدخول" });
  }
});

// Verify token (used by rep portal to check session)
router.get("/auth/rep/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "غير مصرح" });
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: "جلسة منتهية الصلاحية" });

    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, payload.repId));
    if (!rep || !rep.isActive) return res.status(401).json({ error: "الحساب غير نشط" });

    return res.json({ id: rep.id, name: rep.name, phone: rep.phone, area: rep.area });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في التحقق" });
  }
});

export default router;