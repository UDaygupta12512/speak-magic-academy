import { useEffect, useState, FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import mascotImage from "@/assets/genie-mascot.png";

type Mode = "signin" | "signup" | "forgot";

const emailSchema = z.string().trim().email("Please enter a valid email").max(255);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(72);
const nameSchema = z.string().trim().min(1, "Please enter your name").max(60);

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const from = location.state?.from || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Reset field-level state when switching modes
    setPassword("");
  }, [mode]);

  if (!authLoading && user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) throw new Error(emailResult.error.issues[0].message);

      if (mode === "signup") {
        const nameResult = nameSchema.safeParse(displayName);
        if (!nameResult.success) throw new Error(nameResult.error.issues[0].message);
        const passResult = passwordSchema.safeParse(password);
        if (!passResult.success) throw new Error(passResult.error.issues[0].message);

        const { error } = await supabase.auth.signUp({
          email: emailResult.data,
          password: passResult.data,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: nameResult.data,
              preferred_language: localStorage.getItem("speakgenie_language") || "en",
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm, then sign in.");
        setMode("signin");
      } else if (mode === "signin") {
        const passResult = passwordSchema.safeParse(password);
        if (!passResult.success) throw new Error(passResult.error.issues[0].message);
        const { error } = await supabase.auth.signInWithPassword({
          email: emailResult.data,
          password: passResult.data,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate(from, { replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(emailResult.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset email sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err: any) {
      const msg = err?.message || "Something went wrong. Try again.";
      toast.error(msg.includes("Invalid login") ? "Wrong email or password" : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-border bg-card shadow-xl p-6 md:p-8"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <img src={mascotImage} alt="" className="w-20 h-20 mb-2" />
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" aria-hidden />
            SpeakGenie
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signup" && "Create your account to save your progress"}
            {mode === "signin" && "Welcome back — sign in to keep learning"}
            {mode === "forgot" && "Enter your email and we'll send a reset link"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={60}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={72}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden />}
            {mode === "signup" && "Create account"}
            {mode === "signin" && "Sign in"}
            {mode === "forgot" && "Send reset link"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <>
              New here?{" "}
              <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                Create an account
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">
                Sign in
              </button>
            </>
          )}
          {mode === "forgot" && (
            <button onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">
              Back to sign in
            </button>
          )}
        </div>
      </motion.div>
    </main>
  );
};

export default Auth;
