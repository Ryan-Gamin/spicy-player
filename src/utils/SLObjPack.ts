// Ported from Spikerko/spicy-lyrics — SLObjPack custom compression format
type JSONPrimitive = string | number | boolean | null
type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue }

const DEFAULT_FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype'])

export class SLObjPack {
  private forbiddenKeys: Set<string>

  constructor() {
    this.forbiddenKeys = new Set(DEFAULT_FORBIDDEN_KEYS)
  }

  unpack(packed: unknown): JSONValue {
    if (!Array.isArray(packed) || packed.length !== 2) throw new Error('Invalid payload')
    const [valuesListRaw, streamRaw] = packed as [unknown, unknown]
    if (!Array.isArray(valuesListRaw) || !Array.isArray(streamRaw)) throw new Error('Invalid payload')

    const valuesList = valuesListRaw as JSONPrimitive[]
    const stream = streamRaw as unknown[]
    const streamLen = stream.length
    const valuesLen = valuesList.length
    let cursor = 0
    const forbiddenKeys = this.forbiddenKeys

    const readStream = () => {
      if (cursor >= streamLen) throw new Error('Unexpected end of stream')
      return stream[cursor++]
    }

    const resolvePointer = (ptr: unknown): JSONPrimitive => {
      if (typeof ptr !== 'number' || !Number.isInteger(ptr) || ptr < 0 || ptr >= valuesLen)
        throw new Error('Invalid pointer ' + ptr)
      return valuesList[ptr]
    }

    const readKey = (): string => {
      const key = resolvePointer(readStream())
      if (typeof key !== 'string') throw new Error('Key must be string')
      if (forbiddenKeys.has(key)) throw new Error('Forbidden key: ' + key)
      return key
    }

    const safeSet = (obj: Record<string, JSONValue>, key: string, value: JSONValue) => {
      Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true })
    }

    const decode = (depth: number): JSONValue => {
      if (depth > 512) throw new Error('Max depth exceeded')
      const op = readStream()
      if (typeof op !== 'number' || !Number.isInteger(op)) throw new Error('Invalid opcode')
      if (op >= 0) return resolvePointer(op)

      switch (op) {
        case -1: {
          const numKeys = readStream() as number
          const keys: string[] = []
          for (let i = 0; i < numKeys; i++) keys.push(readKey())
          const obj: Record<string, JSONValue> = {}
          for (let i = 0; i < numKeys; i++) safeSet(obj, keys[i], decode(depth + 1))
          return obj
        }
        case -2: {
          const numItems = readStream() as number
          const arr: JSONValue[] = []
          for (let i = 0; i < numItems; i++) arr.push(decode(depth + 1))
          return arr
        }
        case -3: {
          const numItems = readStream() as number
          const numKeys = readStream() as number
          const keys: string[] = []
          for (let i = 0; i < numKeys; i++) keys.push(readKey())
          const arr: JSONValue[] = []
          for (let i = 0; i < numItems; i++) {
            const obj: Record<string, JSONValue> = {}
            for (let k = 0; k < numKeys; k++) safeSet(obj, keys[k], decode(depth + 1))
            arr.push(obj)
          }
          return arr
        }
        case -4: return []
        case -5: return [decode(depth + 1)]
        case -6: return {}
        default: throw new Error('Unknown opcode ' + op)
      }
    }

    return decode(0)
  }
}
