import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, LogIn } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function RepLogin() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/rep/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل تسجيل الدخول");
        return;
      }
      localStorage.setItem("rep_token", data.token);
      localStorage.setItem("rep_info", JSON.stringify(data.rep));
      navigate("/rep-portal");
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-4 rounded-full">
              <Droplets className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-blue-800">مصنع نبع صافيا</CardTitle>
          <p className="text-muted-foreground mt-1">بوابة المندوبين</p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">رقم الجوال</label>
              <Input
                type="tel"
                placeholder="05xxxxxxxx"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                required
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                className="text-right"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm text-center">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              <LogIn className="ml-2 w-4 h-4" />
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            للدخول على لوحة الإدارة{" "}
            <a href="/" className="text-blue-600 hover:underline">اضغط هنا</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
