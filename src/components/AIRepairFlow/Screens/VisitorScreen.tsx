import Link from "next/link";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container py-20 md:py-28 text-center bg-gradient-hero">
        <img
          src="/autobot-mascot.png"
          alt="AUTOBOT mascot"
          width={160}
          height={160}
          className="w-32 md:w-40 h-auto mx-auto mb-8 animate-float"
        />
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          AUTO<span className="text-brand">BOT</span>
        </h1>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Your AI repair helper. Diagnose problems and fix them in record time.
        </p>
        <Button asChild size="lg" className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
           <Link href="/login">Login to Try AI Repair
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </main>
    </div>
  );
};

export default Index;
