import { WrenchIcon } from "lucide-react";

type SnakeLoadingProps = {
  title: string;
  subtitle: string;
  overlay?: boolean;
};

const SNAKE_STYLE_ID = "snake-loading-style";

const snakeStyles = `
  @keyframes rotate-snake {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes dash-snake {
    0% { stroke-dashoffset: 280; }
    50% { stroke-dashoffset: 75; }
    100% { stroke-dashoffset: 280; }
  }

  .snake-container {
    animation: rotate-snake 2s linear infinite;
  }

  .snake-path {
    fill: none;
    stroke: currentColor;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 150;
    animation: dash-snake 1.5s ease-in-out infinite;
  }
`;

export default function SnakeLoading({ title, subtitle, overlay = false }: SnakeLoadingProps) {
  return (
    <div
      className={`${overlay ? "fixed inset-0 z-50" : "relative min-h-screen"} flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.14),transparent_34%),linear-gradient(180deg,#fff7ed_0%,#ffffff_38%,#f8fafc_100%)] px-4 text-center text-slate-900`}
    >
      <style id={SNAKE_STYLE_ID}>{snakeStyles}</style>
      <div className="w-full max-w-lg space-y-6">
        <div className="mx-auto flex flex-col items-center gap-4">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full snake-container">
              <circle cx="50" cy="50" r="40" className="snake-path text-primary" />
            </svg>
            <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 shadow-sm">
              <WrenchIcon className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}