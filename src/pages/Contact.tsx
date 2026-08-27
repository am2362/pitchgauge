import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePageMeta } from "@/hooks/usePageMeta";
import logo from "@/assets/logo.png";

const Contact = () => {
  usePageMeta("Contact — PitchGauge", "Get in touch with the PitchGauge team.");
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-end gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="PitchGauge" className="h-6 w-6" />
            <span className="text-lg font-bold tracking-tight">PitchGauge</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Home</Button>
            <Button size="sm" onClick={() => navigate("/auth")}>Get Started</Button>
          </div>
        </div>
      </nav>

      <main className="container max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Contact us</CardTitle>
              <CardDescription>
                Have a question or feedback? Send us a message and we will get back to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <p className="text-lg font-medium">Thank you, we will be in touch.</p>
                  <Button variant="outline" onClick={() => navigate("/")}>Back to home</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="How can we help?"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      rows={5}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Send message</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Contact;
