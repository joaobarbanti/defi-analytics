'use client';

import { useState } from 'react';

interface InvestLinkProps {
  poolId?: string;
  protocolSlug?: string;
  protocolUrl?: string | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="ml-1 px-1.5 py-0.5 rounded text-xs font-mono text-cyan-400 border border-cyan-800 hover:border-cyan-500 hover:text-cyan-300 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

interface LinkRowProps {
  href: string;
  icon: string;
  label: string;
  monoCopy?: string;
}

function LinkRow({ href, icon, label, monoCopy }: LinkRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-700/50 last:border-b-0">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-200 transition-colors min-w-0 flex-1"
      >
        <span className="text-base leading-none flex-shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
        <span className="flex-shrink-0 text-gray-500 text-xs">↗</span>
      </a>
      {monoCopy && <CopyButton text={monoCopy} />}
    </div>
  );
}

export default function InvestLink({ poolId, protocolSlug, protocolUrl }: InvestLinkProps) {
  const hasAnyLink = poolId || protocolSlug || protocolUrl;
  if (!hasAnyLink) return null;

  return (
    <div className="mt-4 rounded-lg border border-cyan-800/50 bg-cyan-950/20 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-500 mb-2">
        Where to Invest
      </p>

      {poolId && (
        <LinkRow
          href={`https://defillama.com/yields/pool/${poolId}`}
          icon="📊"
          label="View Pool on DeFiLlama"
          monoCopy={poolId}
        />
      )}

      {protocolSlug && (
        <LinkRow
          href={`https://defillama.com/protocol/${protocolSlug}`}
          icon="🦙"
          label="Protocol Page on DeFiLlama"
        />
      )}

      {protocolUrl && (
        <LinkRow
          href={protocolUrl}
          icon="🌐"
          label="Official Protocol Website"
        />
      )}
    </div>
  );
}
