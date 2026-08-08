import { Bell, CalendarCheck, Flame } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const notifications = [
  { icon: Flame, title: "Keep your streak", detail: "Practice today to keep your learning streak alive." },
  { icon: CalendarCheck, title: "Daily goal", detail: "Your daily English goal is waiting for you." },
  { icon: Bell, title: "New stories", detail: "Fresh listening stories will appear here when available." },
];

const Notifications = () => (
  <div className="min-h-screen bg-background pb-6">
    <PageHeader title="Notifications" showBack />
    <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
      {notifications.map((item) => (
        <section key={item.title} className="bg-card rounded-2xl shadow-card p-4 flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
            <item.icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">{item.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
          </div>
        </section>
      ))}
    </main>
  </div>
);

export default Notifications;