import type { IconKind, Provider } from '../types'

export interface CatalogEntry {
  id: string
  provider: Provider
  kind: IconKind
  label: string
}

export const PROVIDER_COLORS: Record<Provider, string> = {
  aws: '#FF9900',
  gcp: '#4285F4',
  azure: '#0078D4',
  generic: '#6B7280',
}

const KIND_PATHS: Record<IconKind, string> = {
  compute: 'M4 4h16v10H4z M8 18h8 M12 14v4',
  vm: 'M3 4h18v16H3z M7 8.5h10v3H7z M7 13.5h10v3H7z',
  instancegroup: 'M4 10h8v8H4z M8 6h8v8H8z M12 2h8v8h-8z',
  container: 'M3 4h18v16H3z M3 10h18 M9 4v16 M15 4v16',
  database:
    'M4 5c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  cache: 'M4 4h16v6H4z M4 14h16v6H4z M7 7h.01 M7 17h.01',
  queue: 'M3 6h4v12H3z M10 6h4v12h-4z M17 6h4v12h-4z',
  storage: 'M4 7l8-4 8 4-8 4-8-4z M4 7v10l8 4 8-4V7 M4 7l8 4 8-4',
  network: 'M12 2a5 5 0 100 10 5 5 0 000-10z M4 22v-4a4 4 0 014-4h8a4 4 0 014 4v4',
  loadbalancer: 'M12 3v6 M12 3l-6 4 M12 3l6 4 M6 13h.01 M12 13h.01 M18 13h.01 M12 9v4 M6 13v6 M12 13v6 M18 13v6',
  cdn: 'M12 2l9 5v10l-9 5-9-5V7z M12 2v20 M3 7l9 5 9-5',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8',
}

export const KIND_LABELS: Record<IconKind, string> = {
  compute: 'Compute / Service',
  vm: 'Virtual Machine',
  instancegroup: 'VM Instance Group',
  container: 'Container',
  database: 'Database',
  cache: 'Cache',
  queue: 'Queue',
  storage: 'Object Storage',
  network: 'Network / VPC',
  loadbalancer: 'Load Balancer',
  cdn: 'CDN',
  user: 'Client / User',
}

export function CloudIcon({
  kind,
  provider,
  size = 28,
}: {
  kind: IconKind
  provider: Provider
  size?: number
}) {
  const color = PROVIDER_COLORS[provider]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={KIND_PATHS[kind]} />
    </svg>
  )
}

const KINDS: IconKind[] = [
  'compute',
  'vm',
  'instancegroup',
  'container',
  'database',
  'cache',
  'queue',
  'storage',
  'network',
  'loadbalancer',
  'cdn',
  'user',
]

const PROVIDERS: Provider[] = ['generic', 'aws', 'gcp', 'azure']

export const CATALOG: CatalogEntry[] = PROVIDERS.flatMap((provider) =>
  KINDS.map((kind) => ({
    id: `${provider}-${kind}`,
    provider,
    kind,
    label: `${KIND_LABELS[kind]}${provider === 'generic' ? '' : ` (${provider.toUpperCase()})`}`,
  })),
)
