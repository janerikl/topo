import type { Node } from 'reactflow'
import type { TopoNodeData } from '../types'

export default function Inspector({
  node,
  onChange,
  onDuplicate,
}: {
  node: Node<TopoNodeData> | null
  onChange: (id: string, data: Partial<TopoNodeData>) => void
  onDuplicate: () => void
}) {
  if (!node) {
    return (
      <div
        style={{
          width: 260,
          borderLeft: '1px solid #201f26',
          padding: 16,
          background: '#141317',
        }}
      >
        <p style={{ fontSize: 13, color: '#8c8996' }}>
          Select a node to edit its label and notes.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        width: 260,
        borderLeft: '1px solid #201f26',
        padding: 16,
        background: '#141317',
      }}
    >
      <h3
        style={{
          fontSize: 12,
          margin: '0 0 12px',
          color: '#ff0072',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontWeight: 600,
        }}
      >
        Node details
      </h3>
      <label style={{ fontSize: 12, color: '#8c8996' }}>Label</label>
      <input
        value={node.data.label}
        onChange={(e) => onChange(node.id, { label: e.target.value })}
        style={{
          width: '100%',
          padding: 6,
          marginTop: 4,
          marginBottom: 12,
          border: '1px solid #2a2831',
          borderRadius: 6,
          fontSize: 13,
          background: '#0d0c10',
          color: '#e7e5ea',
          boxSizing: 'border-box',
        }}
      />
      <label style={{ fontSize: 12, color: '#8c8996' }}>
        Notes (scaling, capacity, etc.)
      </label>
      <textarea
        value={node.data.notes}
        onChange={(e) => onChange(node.id, { notes: e.target.value })}
        rows={8}
        style={{
          width: '100%',
          padding: 6,
          marginTop: 4,
          border: '1px solid #2a2831',
          borderRadius: 6,
          fontSize: 13,
          resize: 'vertical',
          background: '#0d0c10',
          color: '#e7e5ea',
          boxSizing: 'border-box',
        }}
      />
      <button
        onClick={onDuplicate}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '7px 0',
          border: '1px solid #2a2831',
          borderRadius: 6,
          background: '#1e1c23',
          color: '#e7e5ea',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Duplicate ({navigator.platform.includes('Mac') ? '⌘D' : 'Ctrl+D'})
      </button>
    </div>
  )
}
