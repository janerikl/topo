export type Provider = 'aws' | 'gcp' | 'azure' | 'generic'

export type IconKind =
  | 'compute'
  | 'database'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'network'
  | 'loadbalancer'
  | 'cdn'
  | 'user'

export interface TopoNodeData {
  label: string
  notes: string
  provider: Provider
  kind: IconKind
  [key: string]: unknown
}

export interface DiagramFile {
  name: string
  createdAt: string
  updatedAt: string
  nodes: unknown[]
  edges: unknown[]
}
