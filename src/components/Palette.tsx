import { CATALOG } from '../icons/cloudIcons'
import { CloudIcon } from '../icons/cloudIcons'

export default function Palette() {
  const onDragStart = (event: React.DragEvent, catalogId: string) => {
    event.dataTransfer.setData('application/topo-node', catalogId)
    event.dataTransfer.effectAllowed = 'move'
  }

  const groups: Record<string, typeof CATALOG> = {}
  for (const entry of CATALOG) {
    groups[entry.provider] = groups[entry.provider] || []
    groups[entry.provider].push(entry)
  }

  return (
    <div
      style={{
        width: 240,
        borderRight: '1px solid #201f26',
        overflowY: 'auto',
        padding: 12,
        background: '#141317',
      }}
    >
      <h3
        style={{
          fontSize: 12,
          margin: '4px 0 12px',
          color: '#8c8996',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Drag onto canvas
      </h3>
      {Object.entries(groups).map(([provider, entries]) => (
        <div key={provider} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              color: '#ff0072',
              marginBottom: 6,
              letterSpacing: 0.5,
              fontWeight: 600,
            }}
          >
            {provider}
          </div>
          {entries.map((entry) => (
            <div
              key={entry.id}
              draggable
              onDragStart={(e) => onDragStart(e, entry.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                marginBottom: 4,
                borderRadius: 6,
                background: '#1b1a20',
                border: '1px solid #2a2831',
                cursor: 'grab',
                fontSize: 12,
                color: '#e7e5ea',
              }}
            >
              <CloudIcon kind={entry.kind} provider={entry.provider} size={18} />
              {entry.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
