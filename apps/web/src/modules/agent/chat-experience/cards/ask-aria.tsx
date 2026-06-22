import { Button, cn, Popover, PopoverContent, PopoverTrigger } from '@seta/shared-ui';
import { Check, Copy, MessageSquarePlus, Send, Sparkles } from 'lucide-react';
import { createContext, useContext, useState } from 'react';

/**
 * Ask-ARIA: clicking any live indicator on a card surfaces the exact follow-up
 * prompt that indicator would send, then dispatches it to the agent.
 *
 * In the real chat a host provides {@link AskAriaProvider} with a `send` bound to
 * the thread composer, so "Send to ARIA" appends the prompt as a new turn in the
 * current thread. With no provider (the devzone showcase) it falls back to an
 * inline "Sent" confirmation so the interaction is still demonstrable.
 */

export type AskAriaSend = (prompt: string) => void;

const AskAriaContext = createContext<AskAriaSend | null>(null);

export function AskAriaProvider({
  send,
  children,
}: {
  send: AskAriaSend;
  children: React.ReactNode;
}) {
  return <AskAriaContext.Provider value={send}>{children}</AskAriaContext.Provider>;
}

// A live indicator: a real button styled as inline UI, with a hover/focus ask glyph.
export const interactive =
  'group/ask relative w-full text-left rounded-md transition-colors cursor-pointer ' +
  'hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-primary-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface-1';

export function AskGlyph({ className }: { className?: string }) {
  return (
    <MessageSquarePlus
      aria-hidden
      className={cn(
        'size-3.5 text-primary opacity-0 transition-opacity',
        'group-hover/ask:opacity-100 group-focus-visible/ask:opacity-100',
        className,
      )}
    />
  );
}

export function AskAria({
  topic,
  prompt,
  children,
}: {
  topic: string;
  prompt: string;
  children: React.ReactNode;
}) {
  const send = useContext(AskAriaContext);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  function reset() {
    setSent(false);
    setCopied(false);
  }

  function handleSend() {
    if (send) {
      // Real chat: dispatch into the current thread; the reply streams below.
      send(prompt);
      setOpen(false);
      reset();
      return;
    }
    // Showcase fallback: no composer to drive, so confirm inline.
    setSent(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-80 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-hairline bg-surface-2 px-3 py-2">
          <div className="flex size-5 items-center justify-center rounded-md bg-primary-tint">
            <Sparkles className="size-3 text-primary" />
          </div>
          <span className="text-caption font-medium text-ink">Ask ARIA</span>
          <span className="ml-auto max-w-[10rem] truncate text-caption text-ink-subtle">
            {topic}
          </span>
        </div>

        {sent ? (
          <div className="flex items-start gap-2.5 px-3 py-4">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-tint">
              <Check className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-body-sm font-medium text-ink">Sent to ARIA</p>
              <p className="mt-0.5 text-caption text-ink-subtle">
                ARIA gathers the data and replies with a card.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 px-3 py-3">
            <p className="text-caption text-ink-subtle">ARIA will receive:</p>
            <blockquote className="rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-body-sm leading-relaxed text-ink">
              {prompt}
            </blockquote>
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={handleSend} className="gap-1.5">
                <Send className="size-3.5" />
                Send to ARIA
              </Button>
              <Button size="sm" variant="secondary" onClick={copy} className="gap-1.5">
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
