"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur-sm md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        className="text-zinc-400 hover:text-white min-w-[44px] min-h-[44px]"
      >
        <Menu className="size-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <span className="text-sm font-semibold text-white">ReList</span>
    </header>
  );
}
