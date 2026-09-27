const btnStyle: React.CSSProperties = {
  background: '#1e1c23',
  color: '#e7e5ea',
  border: '1px solid #2a2831',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid #2a2831',
  borderRadius: 6,
  background: '#0d0c10',
  color: '#e7e5ea',
  fontSize: 13,
}

export default function Toolbar({
  folderName,
  diagramName,
  onDiagramNameChange,
  onPickFolder,
  onNew,
  onSave,
  diagramList,
  onOpen,
  historyList,
  onRestoreHistory,
  onExportPng,
}: {
  folderName: string | null
  diagramName: string
  onDiagramNameChange: (name: string) => void
  onPickFolder: () => void
  onNew: () => void
  onSave: () => void
  diagramList: string[]
  onOpen: (name: string) => void
  historyList: string[]
  onRestoreHistory: (stamp: string) => void
  onExportPng: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid #201f26',
        background: '#141317',
        fontSize: 13,
      }}
    >
      <strong
        style={{
          marginRight: 8,
          background: 'linear-gradient(90deg, #ff0072, #ff5c9a)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: 16,
          letterSpacing: 0.3,
        }}
      >
        Topo
      </strong>
      <button style={btnStyle} onClick={onPickFolder}>
        {folderName ? `Folder: ${folderName}` : 'Pick folder...'}
      </button>
      <input
        value={diagramName}
        onChange={(e) => onDiagramNameChange(e.target.value)}
        placeholder="diagram name"
        style={inputStyle}
      />
      <button style={btnStyle} onClick={onNew}>
        New
      </button>
      <button
        style={{
          ...btnStyle,
          background: folderName && diagramName ? '#ff0072' : '#1e1c23',
          borderColor: folderName && diagramName ? '#ff0072' : '#2a2831',
          color: folderName && diagramName ? '#fff' : '#8c8996',
        }}
        onClick={onSave}
        disabled={!folderName || !diagramName}
      >
        Save
      </button>

      <select
        value=""
        disabled={!folderName}
        onChange={(e) => e.target.value && onOpen(e.target.value)}
        style={inputStyle}
      >
        <option value="">Open diagram...</option>
        {diagramList.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select
        value=""
        disabled={historyList.length === 0}
        onChange={(e) => e.target.value && onRestoreHistory(e.target.value)}
        style={inputStyle}
      >
        <option value="">History ({historyList.length})</option>
        {historyList.map((stamp) => (
          <option key={stamp} value={stamp}>
            {stamp}
          </option>
        ))}
      </select>

      <button style={{ ...btnStyle, marginLeft: 'auto' }} onClick={onExportPng}>
        Export PNG
      </button>
    </div>
  )
}
