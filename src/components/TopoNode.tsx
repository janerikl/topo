import { Handle, Position, type NodeProps } from 'reactflow'
import { CloudIcon } from '../icons/cloudIcons'
import type { TopoNodeData } from '../types'

export default function TopoNode({ data, selected }: NodeProps<TopoNodeData>) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 8,
        border: selected ? '2px solid #ff0072' : '1px solid #2a2831',
        background: '#1b1a20',
        minWidth: 140,
        boxShadow: selected
          ? '0 0 0 3px rgba(255,0,114,0.2)'
          : '0 1px 2px rgba(0,0,0,0.4)',
        color: '#e7e5ea',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#ff0072', border: 'none' }} />
      <CloudIcon kind={data.kind} provider={data.provider} size={22} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} style={{ background: '#ff0072', border: 'none' }} />
    </div>
  )
}
