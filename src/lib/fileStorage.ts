import type { DiagramFile } from '../types'

let rootHandle: FileSystemDirectoryHandle | null = null

export function hasFolder() {
  return rootHandle !== null
}

const HANDLE_DB = 'topo-handles'
const HANDLE_STORE = 'handles'
const HANDLE_KEY = 'rootFolder'

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HANDLE_DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(HANDLE_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function persistHandle(handle: FileSystemDirectoryHandle) {
  const db = await openHandleDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite')
    tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPersistedHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readonly')
      const req = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function hasReadWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  // @ts-expect-error - queryPermission not in default TS lib dom yet
  const status = await handle.queryPermission({ mode: 'readwrite' })
  return status === 'granted'
}

export async function requestReadWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  // @ts-expect-error - requestPermission not in default TS lib dom yet
  const status = await handle.requestPermission({ mode: 'readwrite' })
  return status === 'granted'
}

export function useHandle(handle: FileSystemDirectoryHandle) {
  rootHandle = handle
}

export async function pickFolder(): Promise<string> {
  // @ts-expect-error - showDirectoryPicker is not in default TS lib dom yet
  const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker()
  rootHandle = handle
  await persistHandle(handle)
  return handle.name
}

async function getDir(name: string, create: boolean) {
  if (!rootHandle) throw new Error('No folder selected')
  return rootHandle.getDirectoryHandle(name, { create })
}

export async function listDiagrams(): Promise<string[]> {
  if (!rootHandle) return []
  const names: string[] = []
  for await (const [name, handle] of rootHandle.entries()) {
    if (handle.kind === 'file' && name.endsWith('.json')) {
      names.push(name.replace(/\.json$/, ''))
    }
  }
  return names.sort()
}

export async function saveDiagram(diagram: DiagramFile): Promise<void> {
  if (!rootHandle) throw new Error('No folder selected')
  const fileHandle = await rootHandle.getFileHandle(`${diagram.name}.json`, {
    create: true,
  })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(diagram, null, 2))
  await writable.close()

  // history snapshot
  const historyRoot = await getDir('.history', true)
  const diagramHistoryDir = await historyRoot.getDirectoryHandle(diagram.name, {
    create: true,
  })
  const stamp = diagram.updatedAt.replace(/[:.]/g, '-')
  const snapHandle = await diagramHistoryDir.getFileHandle(`${stamp}.json`, {
    create: true,
  })
  const snapWritable = await snapHandle.createWritable()
  await snapWritable.write(JSON.stringify(diagram, null, 2))
  await snapWritable.close()
}

export async function loadDiagram(name: string): Promise<DiagramFile> {
  if (!rootHandle) throw new Error('No folder selected')
  const fileHandle = await rootHandle.getFileHandle(`${name}.json`)
  const file = await fileHandle.getFile()
  const text = await file.text()
  return JSON.parse(text) as DiagramFile
}

export async function listHistory(diagramName: string): Promise<string[]> {
  if (!rootHandle) return []
  try {
    const historyRoot = await getDir('.history', false)
    const diagramHistoryDir = await historyRoot.getDirectoryHandle(diagramName)
    const stamps: string[] = []
    for await (const [name, handle] of diagramHistoryDir.entries()) {
      if (handle.kind === 'file' && name.endsWith('.json')) {
        stamps.push(name.replace(/\.json$/, ''))
      }
    }
    return stamps.sort().reverse()
  } catch {
    return []
  }
}

export async function loadHistorySnapshot(
  diagramName: string,
  stamp: string,
): Promise<DiagramFile> {
  if (!rootHandle) throw new Error('No folder selected')
  const historyRoot = await getDir('.history', false)
  const diagramHistoryDir = await historyRoot.getDirectoryHandle(diagramName)
  const fileHandle = await diagramHistoryDir.getFileHandle(`${stamp}.json`)
  const file = await fileHandle.getFile()
  const text = await file.text()
  return JSON.parse(text) as DiagramFile
}
