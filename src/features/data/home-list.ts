import type { DataSource, RunSummary } from '@/contracts'
import type { RunListRun } from '@/ui/patterns/run-list'

export async function listRunsForHome(source: DataSource): Promise<RunListRun[]> {
  const runs = await source.listRuns()
  return Promise.all(runs.map((run) => withRows(source, run)))
}

async function withRows(source: DataSource, run: RunSummary): Promise<RunListRun> {
  if (run.status === 'PRICING') return { ...run, rows: [] }
  const detail = await source.getRun(run.id)
  return { ...run, rows: detail.rows.map((row) => ({ status: row.status })) }
}
