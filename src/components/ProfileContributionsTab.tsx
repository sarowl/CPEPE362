"use client";

import Link from 'next/link';

export default function ProfileContributionsTab() {
  return (
    <div className="border border-border bg-background p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-black uppercase tracking-tighter text-xl mb-2">Contributions</h2>
          <p className="text-sm text-muted-foreground">All profile contribution features have been disabled.</p>
        </div>
      </div>

      <div className="mt-6 border border-dashed border-border bg-secondary p-6 text-center">
        <p className="text-sm font-bold">No contributions available</p>
        <p className="text-xs text-muted-foreground mt-2">Guide creation, edits, and deletes are currently turned off.</p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/profile" className="px-4 py-2 border border-border text-xs font-bold uppercase tracking-widest hover:bg-background">Return to Profile</Link>
        <Link href="/car-makers" className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:brightness-110">Browse Vehicles</Link>
      </div>
    </div>
  );
}
