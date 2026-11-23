export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`text-[11px] tracking-[0.08em] text-muted-foreground ${className}`}>
      <span>ATELIER</span>
      <span className="mx-2 text-border">/</span>
      <span>Created by Daniel Tulung</span>
    </footer>
  );
}
