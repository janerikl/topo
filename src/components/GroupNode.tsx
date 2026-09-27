import { NodeResizer, type NodeProps } from 'reactflow'
import type { TopoNodeData } from '../types'

export default function GroupNode({ data, selected, id }: NodeProps<TopoNodeData>) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: `1.5px dashed ${selected ? '#ff0072' : '#4a4854'}`,
        borderRadius: 10,
        background: 'rgba(255, 0, 114, 0.04)',
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={120}
        lineStyle={{ borderColor: '#ff0072' }}
        handleStyle={{ background: '#ff0072', border: 'none', width: 8, height: 8 }}
      />
      <div
        data-grouplabel={id}
        style={{
          position: 'absolute',
          top: -11,
          left: 12,
          padding: '0 6px',
          background: '#0d0c10',
          fontSize: 11,
          fontWeight: 600,
          color: selected ? '#ff0072' : '#8c8996',
          letterSpacing: 0.3,
        }}
      >
        {data.label || 'Group'}
      </div>
    </div>
  )
}
