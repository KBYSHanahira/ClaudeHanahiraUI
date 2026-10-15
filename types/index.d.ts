export type Info = { name: string; branch: string | null }
export type Stats = {
  tools: number
  byTool: Record<string, number>
  files: string[]
  last: string | null
}
export type Usage = {
  usd: number | null
  percent: number | null
  tokens: number | null
  window: number | null
  limits: { kind: string; percentUsed: number; resetsAt?: string }[]
}

export type Tokens = { input: number; output: number; cacheRead: number; cacheWrite: number }

export type Agent = {
  id: string
  name: string
  type: string
  model: string
  effort: string | null
  background: boolean
  status: 'running' | 'done' | 'error' | 'stopped'
  startedAt: number
  endedAt: number | null
  tools: number
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

declare module 'claude-code' {
  interface PluginState {
    'hanahira-claude-ui': {
      stats: Stats
      usage: Usage
      tokens: Tokens
      runMs: number
      tick: number
      agents: Agent[]
      code: { net: number; candles: { o: number; h: number; l: number; c: number; v: number }[]; cur: { o: number; h: number; l: number; c: number; v: number } | null }
      seconds: number | null
      info: Info | null
    }
  }
}
