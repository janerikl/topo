import { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  MarkerType,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from 'reactflow'
import { toPng } from 'html-to-image'
import Palette from './components/Palette'
import Inspector from './components/Inspector'
import Toolbar from './components/Toolbar'
import TopoNode from './components/TopoNode'
import GroupNode from './components/GroupNode'
import { CATALOG } from './icons/cloudIcons'
import {
  getPersistedHandle,
  hasFolder,
  hasReadWritePermission,
  listDiagrams,
  listHistory,
  loadDiagram,
  loadHistorySnapshot,
  pickFolder,
  requestReadWritePermission,
  saveDiagram,
  useHandle,
} from './lib/fileStorage'
import type { TopoNodeData } from './types'

const nodeTypes = { topo: TopoNode, group: GroupNode }
const withAnimated = (edges: Edge[]) => edges.map((e) => ({ ...e, animated: true }))
let idCounter = 1
const nextId = () => `node-${idCounter++}`
const syncIdCounter = (allNodes: Array<{ id: string }>) => {
  const maxId = allNodes.reduce((max, n) => {
    const match = /^node-(\d+)$/.exec(n.id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  idCounter = Math.max(idCounter, maxId + 1)
}
const LAST_DIAGRAM_KEY = 'topo:lastDiagramName'

const PROTOCOLS = [
  { id: 'http', label: 'HTTP', color: '#8c8996' },
  { id: 'https', label: 'HTTPS', color: '#22c55e' },
  { id: 'mtls', label: 'TLS / mTLS', color: '#3b82f6' },
  { id: 'jdbc-tls', label: 'JDBC-TLS', color: '#f59e0b' },
] as const
type ProtocolId = (typeof PROTOCOLS)[number]['id']
const protocolById = (id: string | undefined) => PROTOCOLS.find((p) => p.id === id)

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<TopoNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [diagramName, setDiagramName] = useState('untitled')
  const [diagramList, setDiagramList] = useState<string[]>([])
  const [historyList, setHistoryList] = useState<string[]>([])
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [reconnectHandle, setReconnectHandle] =
    useState<FileSystemDirectoryHandle | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const skipNextAutosave = useRef(true)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedBadgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [edgeMenu, setEdgeMenu] = useState<{ id: string; x: number; y: number } | null>(null)

  useEffect(() => {
    if (!edgeMenu) return
    const close = () => setEdgeMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [edgeMenu])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            label: '',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ff0072' },
          },
          eds,
        ),
      )
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

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    setEdgeMenu({ id: edge.id, x: event.clientX, y: event.clientY })
  }, [])

  const reverseEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId
            ? {
                ...e,
                source: e.target,
                target: e.source,
                sourceHandle: e.targetHandle ?? null,
                targetHandle: e.sourceHandle ?? null,
              }
            : e,
        ),
      )
      setEdgeMenu(null)
    },
    [setEdges],
  )

  const setEdgeProtocol = useCallback(
    (edgeId: string, protocolId: ProtocolId | null) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id !== edgeId) return e
          const protocol = protocolId ? protocolById(protocolId) : undefined
          return {
            ...e,
            label: protocol ? protocol.label : undefined,
            style: { ...e.style, stroke: protocol ? protocol.color : '#ff0072' },
            markerEnd: { type: MarkerType.ArrowClosed, color: protocol ? protocol.color : '#ff0072' },
            labelBgStyle: protocol ? { fill: protocol.color, fillOpacity: 0.9 } : undefined,
            labelStyle: protocol ? { fill: '#0d0c10', fontWeight: 700, fontSize: 10 } : undefined,
            labelBgPadding: protocol ? ([6, 3] as [number, number]) : undefined,
            labelBgBorderRadius: protocol ? 4 : undefined,
          } as Edge
        }),
      )
      setEdgeMenu(null)
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

  const handleAddGroup = useCallback(() => {
    if (!rfInstance || !wrapperRef.current) return
    const bounds = wrapperRef.current.getBoundingClientRect()
    const position = rfInstance.screenToFlowPosition({
      x: bounds.width / 2 - 160,
      y: bounds.height / 2 - 100,
    })
    const groupNode: Node<TopoNodeData> = {
      id: nextId(),
      type: 'group',
      position,
      zIndex: -1,
      style: { width: 320, height: 200 },
      data: { label: 'Group', notes: '', provider: 'generic', kind: 'compute' },
    }
    setNodes((nds) => [groupNode, ...nds])
  }, [rfInstance, setNodes])

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node<TopoNodeData>) => {
      if (!rfInstance || node.type === 'group') return
      const intersections = rfInstance
        .getIntersectingNodes(node)
        .filter((n) => n.type === 'group')
      const groupNode = intersections[0]

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== node.id) return n
          if (groupNode) {
            if (n.parentNode === groupNode.id) return n
            return {
              ...n,
              position: {
                x: n.position.x - groupNode.position.x,
                y: n.position.y - groupNode.position.y,
              },
              parentNode: groupNode.id,
            }
          }
          if (n.parentNode) {
            const parent = nds.find((p) => p.id === n.parentNode)
            const offsetX = parent ? parent.position.x : 0
            const offsetY = parent ? parent.position.y : 0
            const { parentNode: _drop, extent: _dropExtent, ...rest } = n
            return {
              ...rest,
              position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
            }
          }
          return n
        }),
      )
    },
    [rfInstance, setNodes],
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedId) return
    const node = nodes.find((n) => n.id === selectedId)
    if (!node) return
    const offset = 30

    if (node.type === 'group') {
      const newGroupId = nextId()
      const newGroup: Node<TopoNodeData> = {
        ...node,
        id: newGroupId,
        position: { x: node.position.x + offset, y: node.position.y + offset },
        selected: false,
      }
      const children = nodes.filter((n) => n.parentNode === node.id)
      const idMap = new Map<string, string>([[node.id, newGroupId]])
      const newChildren = children.map((child) => {
        const newChildId = nextId()
        idMap.set(child.id, newChildId)
        return { ...child, id: newChildId, parentNode: newGroupId, selected: false }
      })
      const newEdges = edges
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((e) => ({
          ...e,
          id: `edge-${nextId()}`,
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
        }))

      setNodes((nds) => [newGroup, ...nds, ...newChildren])
      setEdges((eds) => eds.concat(newEdges))
      setSelectedId(newGroupId)
    } else {
      const newId = nextId()
      const newNode: Node<TopoNodeData> = {
        ...node,
        id: newId,
        position: { x: node.position.x + offset, y: node.position.y + offset },
        selected: false,
      }
      setNodes((nds) => nds.concat(newNode))
      setSelectedId(newId)
    }
  }, [selectedId, nodes, edges, setNodes, setEdges])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        handleDuplicate()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleDuplicate])

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

  const openDiagramByName = useCallback(async (name: string) => {
    const diagram = await loadDiagram(name)
    skipNextAutosave.current = true
    setDiagramName(diagram.name)
    setNodes(diagram.nodes as Node<TopoNodeData>[])
    setEdges(withAnimated(diagram.edges as Edge[]))
    syncIdCounter(diagram.nodes as Array<{ id: string }>)
    setSelectedId(null)
    setHistoryList(await listHistory(diagram.name))
    localStorage.setItem(LAST_DIAGRAM_KEY, diagram.name)
  }, [setNodes, setEdges])

  const connectToFolder = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      useHandle(handle)
      setFolderName(handle.name)
      setReconnectHandle(null)
      const names = await listDiagrams()
      setDiagramList(names)
      const lastName = localStorage.getItem(LAST_DIAGRAM_KEY)
      if (lastName && names.includes(lastName)) {
        await openDiagramByName(lastName)
      }
    },
    [openDiagramByName],
  )

  useEffect(() => {
    ;(async () => {
      const handle = await getPersistedHandle()
      if (!handle) return
      if (await hasReadWritePermission(handle)) {
        await connectToFolder(handle)
      } else {
        setReconnectHandle(handle)
        setFolderName(handle.name)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleReconnect = async () => {
    if (!reconnectHandle) return
    if (await requestReadWritePermission(reconnectHandle)) {
      await connectToFolder(reconnectHandle)
    }
  }

  const handlePickFolder = async () => {
    const name = await pickFolder()
    setFolderName(name)
    setReconnectHandle(null)
    await refreshDiagramList()
    await refreshHistory(diagramName)
  }

  const handleNew = () => {
    skipNextAutosave.current = true
    setNodes([])
    setEdges([])
    setDiagramName('untitled')
    setSelectedId(null)
    setHistoryList([])
  }

  const saveNow = useCallback(
    async (nds: Node<TopoNodeData>[], eds: Edge[], name: string) => {
      if (!hasFolder() || !name) return
      setSaveStatus('saving')
      const now = new Date().toISOString()
      await saveDiagram({
        name,
        createdAt: now,
        updatedAt: now,
        nodes: nds,
        edges: eds,
      })
      await refreshDiagramList()
      await refreshHistory(name)
      localStorage.setItem(LAST_DIAGRAM_KEY, name)
      setSaveStatus('saved')
      if (savedBadgeTimer.current) clearTimeout(savedBadgeTimer.current)
      savedBadgeTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
    },
    [refreshDiagramList, refreshHistory],
  )

  const handleSave = () => saveNow(nodes, edges, diagramName)

  const handleOpen = (name: string) => openDiagramByName(name)

  const handleRestoreHistory = async (stamp: string) => {
    const diagram = await loadHistorySnapshot(diagramName, stamp)
    skipNextAutosave.current = true
    setNodes(diagram.nodes as Node<TopoNodeData>[])
    setEdges(withAnimated(diagram.edges as Edge[]))
    syncIdCounter(diagram.nodes as Array<{ id: string }>)
    setSelectedId(null)
  }

  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false
      return
    }
    if (!hasFolder() || !diagramName || nodes.length === 0) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      saveNow(nodes, edges, diagramName)
    }, 1500)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, diagramName, saveNow])

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
        needsReconnect={reconnectHandle !== null}
        onReconnect={handleReconnect}
        onNew={handleNew}
        onAddGroup={handleAddGroup}
        onSave={handleSave}
        diagramList={diagramList}
        onOpen={handleOpen}
        historyList={historyList}
        onRestoreHistory={handleRestoreHistory}
        onExportPng={handleExportPng}
        saveStatus={saveStatus}
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
            onEdgeContextMenu={onEdgeContextMenu}
            onNodeDragStop={onNodeDragStop}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => {
              setSelectedId(null)
              setEdgeMenu(null)
            }}
            onMoveStart={() => setEdgeMenu(null)}
            defaultEdgeOptions={{
              style: { stroke: '#ff0072', strokeWidth: 1.5 },
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, color: '#ff0072' },
            }}
            style={{ background: '#0d0c10' }}
            elevateNodesOnSelect={false}
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
          {edgeMenu && (
            <div
              style={{
                position: 'fixed',
                top: edgeMenu.y,
                left: edgeMenu.x,
                background: '#1a1820',
                border: '1px solid #2a2831',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 1000,
                fontSize: 13,
              }}
            >
              <button
                onClick={() => reverseEdge(edgeMenu.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 14px',
                  background: 'none',
                  border: 'none',
                  color: '#eee',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2831')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Reverse direction
              </button>
              <div style={{ borderTop: '1px solid #2a2831', margin: '2px 0' }} />
              <div style={{ padding: '4px 14px', color: '#8c8996', fontSize: 11 }}>Protocol</div>
              {PROTOCOLS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setEdgeProtocol(edgeMenu.id, p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '6px 14px',
                    background: 'none',
                    border: 'none',
                    color: '#eee',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2831')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: p.color,
                      display: 'inline-block',
                    }}
                  />
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setEdgeProtocol(edgeMenu.id, null)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 14px',
                  background: 'none',
                  border: 'none',
                  color: '#8c8996',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2831')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Clear protocol
              </button>
            </div>
          )}
        </div>
        <Inspector
          node={selectedNode}
          onChange={onNodeDataChange}
          onDuplicate={handleDuplicate}
        />
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
