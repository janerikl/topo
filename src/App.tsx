import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { toPng } from 'html-to-image'
import Palette from './components/Palette'
import Inspector from './components/Inspector'
import Toolbar from './components/Toolbar'
import TopoNode from './components/TopoNode'
import { CATALOG } from './icons/cloudIcons'
import {
  hasFolder,
  listDiagrams,
  listHistory,
  loadDiagram,
  loadHistorySnapshot,
  pickFolder,
  saveDiagram,
} from './lib/fileStorage'
import type { TopoNodeData } from './types'

const nodeTypes = { topo: TopoNode }
let idCounter = 1
const nextId = () => `node-${idCounter++}`

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<TopoNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [diagramName, setDiagramName] = useState('untitled')
  const [diagramList, setDiagramList] = useState<string[]>([])
  const [historyList, setHistoryList] = useState<string[]>([])
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, label: '' }, eds))
    },
    [setEdges],
  )

  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const label = window.prompt('Edge label', (edge.label as string) || '')
      if (label === null) return
      setEdges((eds) => eds.map((e) => (e.id === edge.id ? { ...e, label } : e)))
    },
    [setEdges],
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const catalogId = event.dataTransfer.getData('application/topo-node')
      if (!catalogId || !rfInstance || !wrapperRef.current) return
      const entry = CATALOG.find((c) => c.id === catalogId)
      if (!entry) return
      const bounds = wrapperRef.current.getBoundingClientRect()
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })
      const newNode: Node<TopoNodeData> = {
        id: nextId(),
        type: 'topo',
        position,
        data: {
          label: entry.label,
          notes: '',
          provider: entry.provider,
          kind: entry.kind,
        },
      }
      setNodes((nds) => nds.concat(newNode))
    },
    [rfInstance, setNodes],
  )

  const onNodeDataChange = useCallback(
    (id: string, data: Partial<TopoNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
      )
    },
    [setNodes],
  )

  const selectedNode = nodes.find((n) => n.id === selectedId) || null

  const refreshDiagramList = useCallback(async () => {
    setDiagramList(await listDiagrams())
  }, [])

  const refreshHistory = useCallback(async (name: string) => {
    setHistoryList(await listHistory(name))
  }, [])

  const handlePickFolder = async () => {
    const name = await pickFolder()
    setFolderName(name)
    await refreshDiagramList()
    await refreshHistory(diagramName)
  }

  const handleNew = () => {
    setNodes([])
    setEdges([])
    setDiagramName('untitled')
    setSelectedId(null)
    setHistoryList([])
  }

  const handleSave = async () => {
    if (!hasFolder() || !diagramName) return
    const now = new Date().toISOString()
    await saveDiagram({
      name: diagramName,
      createdAt: now,
      updatedAt: now,
      nodes,
      edges,
    })
    await refreshDiagramList()
    await refreshHistory(diagramName)
  }

  const handleOpen = async (name: string) => {
    const diagram = await loadDiagram(name)
    setDiagramName(diagram.name)
    setNodes(diagram.nodes as Node<TopoNodeData>[])
    setEdges(diagram.edges as Edge[])
    setSelectedId(null)
    await refreshHistory(name)
  }

  const handleRestoreHistory = async (stamp: string) => {
    const diagram = await loadHistorySnapshot(diagramName, stamp)
    setNodes(diagram.nodes as Node<TopoNodeData>[])
    setEdges(diagram.edges as Edge[])
    setSelectedId(null)
  }

  const handleExportPng = async () => {
    const el = wrapperRef.current?.querySelector(
      '.react-flow__viewport',
    ) as HTMLElement | null
    if (!el) return
    const dataUrl = await toPng(el, { backgroundColor: '#ffffff' })
    const link = document.createElement('a')
    link.download = `${diagramName || 'topology'}.png`
    link.href = dataUrl
    link.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar
        folderName={folderName}
        diagramName={diagramName}
        onDiagramNameChange={setDiagramName}
        onPickFolder={handlePickFolder}
        onNew={handleNew}
        onSave={handleSave}
        diagramList={diagramList}
        onOpen={handleOpen}
        historyList={historyList}
        onRestoreHistory={handleRestoreHistory}
        onExportPng={handleExportPng}
      />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Palette />
        <div
          ref={wrapperRef}
          style={{ flex: 1 }}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            defaultEdgeOptions={{ style: { stroke: '#ff0072', strokeWidth: 1.5 } }}
            style={{ background: '#0d0c10' }}
            fitView
          >
            <Background color="#2a2831" gap={20} />
            <Controls />
            <MiniMap
              nodeColor="#ff0072"
              nodeStrokeColor="#ff0072"
              maskColor="rgba(13,12,16,0.75)"
              pannable
              zoomable
              style={{ background: '#141317', border: '1px solid #201f26' }}
            />
          </ReactFlow>
        </div>
        <Inspector node={selectedNode} onChange={onNodeDataChange} />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  )
}
