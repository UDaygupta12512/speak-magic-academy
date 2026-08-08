import { FormEvent, useState } from "react";
import { HelpCircle, Mail, MessageCircle, Send } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/useUserId";

const helpItems = [
  { icon: MessageCircle, title: "Practice help", detail: "Try speaking clearly, then use keyboard input if your microphone is unavailable." },
  { icon: HelpCircle, title: "Learning help", detail: "Use Learn, Stories, and Call to build listening and speaking confidence." },
  { icon: Mail, title: "Parent support", detail: "Parents can review progress and audio story listening from the parent dashboard." },
];

const HelpSupport = () => {
  const { toast } = useToast();
  const userId = useUserId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      toast({ title: "Missing details", description: "Please fill in every field before sending." });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("support_messages" as never).insert(payload as never);
    setIsSubmitting(false);

    if (error) {
      toast({ title: "Message not sent", description: "Please check your details and try again.", variant: "destructive" });
      return;
    }

    setForm({ name: "", email: "", subject: "", message: "" });
    toast({ title: "Message sent", description: "Support received your message." });
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Help & Support" showBack />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {helpItems.map((item) => (
          <section key={item.title} className="bg-card rounded-2xl shadow-card p-4 flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">{item.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
            </div>
          </section>
        ))}

        <form onSubmit={submitMessage} className="bg-card rounded-2xl shadow-card p-4 space-y-3">
          <div>
            <h2 className="font-bold text-foreground">Contact Support</h2>
            <p className="text-sm text-muted-foreground mt-1">Send a note and we’ll help you out.</p>
          </div>
          <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Parent or student name" maxLength={100} />
          <Input value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="Email address" type="email" maxLength={255} />
          <Input value={form.subject} onChange={(event) => updateField("subject", event.target.value)} placeholder="Subject" maxLength={120} />
          <Textarea value={form.message} onChange={(event) => updateField("message", event.target.value)} placeholder="How can we help?" maxLength={1000} className="min-h-28" />
          <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
            <Send className="w-4 h-4" />
            {isSubmitting ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default HelpSupport;