"use client";

import { useState } from "react";
import { MessageCircle, Copy, Check } from "lucide-react";
import { BASE_URL } from "@/config/site";

interface ShareButtonsProps {
  title: string;
  slug: string;
}

export function ShareButtons({ title, slug }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const url = `${BASE_URL}/blog/${slug}`;

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`${title}\n\n${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={shareWhatsApp}
        className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-400 transition-colors hover:bg-purple-500/20"
        aria-label="Compartilhar no WhatsApp"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </button>
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-400 transition-colors hover:bg-purple-500/20"
        aria-label="Copiar link"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copiado!
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copiar link
          </>
        )}
      </button>
    </div>
  );
}
