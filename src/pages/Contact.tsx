import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Contact() {
  usePageMeta("Contact — PitchGauge", "Get in touch with PitchGauge.");
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

 const handleSubmit = async (e: React.MouseEvent) => {
  e.preventDefault();
  if (!name.trim() || !email.trim() || !message.trim()) return;
  await fetch("https://formspree.io/f/mwlkezow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, message }),
  });
  setSubmitted(true);
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Contact</h1>
          <p className="text-muted-foreground">Questions about PitchGauge? Get in touch.</p>
        </div>

        <Card className="p-6">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Message received</h2>
                <p className="text-sm text-muted-foreground">Thank you — we'll be in touch shortly.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Your message..."
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!name.trim() || !email.trim() || !message.trim()}
              >
                Send message
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
