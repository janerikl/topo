import type { DiagramFile } from '../types'

let rootHandle: FileSystemDirectoryHandle | null = null

export function hasFolder() {
  return rootHandle !== null
}

export async function pickFolder(): Promise<string> {
  // @ts-expect-error - showDirectoryPicker is not in default TS lib dom yet
  const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker()
  rootHandle = handle
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
