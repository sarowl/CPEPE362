import Link from 'next/link';

export default function CreateGuidePage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="flex min-h-screen items-center justify-center px-4 py-24">
        <div className="w-full max-w-2xl text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Guide Creation Disabled</p>
          <h1 className="text-3xl font-black mb-4">Guide creation is currently unavailable</h1>
          <p className="text-sm text-muted-foreground mb-8">The guide submission flow has been removed. You can still browse existing guides and use other app features.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="px-5 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:brightness-110">Go Home</Link>
            <Link href="/car-makers" className="px-5 py-3 border border-border text-xs font-bold uppercase tracking-widest hover:bg-secondary">Browse Models</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
