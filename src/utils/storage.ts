import { writeFile, readFile, remove, exists, mkdir } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'

async function getVoicesDir(): Promise<string> {
  const dir = await join(await appDataDir(), 'voices')
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true })
  }
  return dir
}

export async function saveVoiceFile(id: string, data: Uint8Array): Promise<string> {
  const dir = await getVoicesDir()
  const filePath = await join(dir, `${id}.bin`)
  await writeFile(filePath, data)
  return filePath
}

export async function readVoiceFile(filePath: string): Promise<ArrayBuffer> {
  const data = await readFile(filePath)
  return data.buffer
}

export async function savePetSprite(id: string, spritesheetPath: string, data: Uint8Array): Promise<string> {
  const dir = await join(await appDataDir(), 'pets', id)
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true })
  }
  const filePath = await join(dir, spritesheetPath)
  await writeFile(filePath, data)
  return filePath
}

export async function deleteVoiceFile(filePath: string): Promise<void> {
  try {
    await remove(filePath)
  } catch {
    // file may already be removed
  }
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
