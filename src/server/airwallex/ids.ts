const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function batchRequestId(runId: string): string {
  assertRunId(runId)
  return `b:${runId}`
}

export function itemRequestId(runId: string, rowIndex: number, candidate: 'L' | 'S'): string {
  assertRunId(runId)
  if (!Number.isInteger(rowIndex) || rowIndex < 1 || rowIndex > 25) {
    throw new Error('rowIndex must be from 1 to 25')
  }
  return `i:${runId}:${rowIndex}:${candidate}`
}

function assertRunId(runId: string): void {
  if (!RUN_ID.test(runId)) throw new Error('runId must be a UUID')
}
