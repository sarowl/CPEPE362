"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, Users, BookOpen, Car, Gauge, Shield, ChevronRight, Search } from "lucide-react";

const carBrands = [
  "Toyota", "Honda", "Ford", "BMW", "Mercedes",
  "Audi", "Chevrolet", "Nissan", "Hyundai", "Kia",
  "Volkswagen", "Subaru",
];

const Index = () => {
  const [issue, setIssue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
      textareaRef.current.style.height = `${Math.max(40, textareaRef.current.scrollHeight)}px`;
    }
  }, [issue]);

  const router = require('next/navigation').useRouter();
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-16">
      {/* Hero — Diagnosis Input */}
      <section className="mx-auto mb-20 max-w-[640px] text-center">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Diagnose your car problem<br />
          <span className="text-muted-foreground">in seconds, not hours.</span>
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Describe your issue and get instant repair guidance from our database of 2,400+ guides.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <textarea
            ref={textareaRef}
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="Engine stalls when idling after driving for 20 minutes..."
            className="w-full resize-none overflow-hidden rounded-md border border-input bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ minHeight: "40px" }}
            rows={1}
          />
        </div>
        <Button className="mt-3 w-full" size="lg">
          <Wrench className="mr-2 h-4 w-4" />
          Find My Fix
        </Button>
      </section>

      {/* Feature Cards */}
      <section className="mb-20 grid gap-4 md:grid-cols-2">
        <Card className="group relative overflow-hidden border shadow-none transition-colors hover:bg-secondary/50">
          <CardContent className="p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
              <BookOpen className="h-5 w-5 text-foreground" />
            </div>
            <h2 className="mb-1 text-base font-semibold text-foreground">
              Find Repair Guides
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              Browse step-by-step repair guides for hundreds of car models. From oil changes to engine rebuilds.
            </p>
            <Link
              href="/guides"
              className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Browse Guides
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden border shadow-none transition-colors hover:bg-secondary/50">
          <CardContent className="p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
              <Users className="h-5 w-5 text-foreground" />
            </div>
            <h2 className="mb-1 text-base font-semibold text-foreground">
              Community Forum
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              Connect with mechanics and car enthusiasts. Ask questions, share knowledge, and solve problems together.
            </p>
            <Link
              href="/community"
              className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Visit Community
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Metrics Board */}
      <section className="mb-20 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { value: "2,400+", label: "Repair Guides", icon: BookOpen },
          { value: "45", label: "Car Brands", icon: Shield },
          { value: "1,200+", label: "Models Covered", icon: Gauge },
        ].map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col items-center gap-2 rounded-md border p-8 text-center"
          >
            <metric.icon className="h-5 w-5 text-muted-foreground" />
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {metric.value}
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              {metric.label}
            </div>
          </div>
        ))}
      </section>

      {/* Car Brand Logos */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Supported Brands
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {carBrands.map((brand) => (
            <div
              key={brand}
              className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-md border text-center transition-colors hover:bg-secondary/50"
            >
              <Car className="h-5 w-5 text-muted-foreground/60" />
              <span className="text-xs font-medium text-muted-foreground">
                {brand}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Index;
