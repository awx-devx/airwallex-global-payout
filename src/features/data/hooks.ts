'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import type { RunDetail } from '@/contracts'
import { listRunsForHome } from './home-list'
import { qk } from './query-keys'
import { getDataSource } from './source'

function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function useRuns() {
  const mounted = useMounted()
  return useQuery({
    queryKey: qk.runs,
    queryFn: () => listRunsForHome(getDataSource()),
    enabled: mounted,
  })
}

export function useRun(id: string) {
  const mounted = useMounted()
  return useQuery({
    queryKey: qk.run(id),
    queryFn: () => getDataSource().getRun(id),
    enabled: mounted,
    refetchOnMount: false,
    refetchInterval: (query) => (query.state.data?.poll ? 2000 : false),
  })
}

export function useBalance() {
  const mounted = useMounted()
  return useQuery({
    queryKey: qk.balance,
    queryFn: () => getDataSource().getBalance(),
    enabled: mounted,
  })
}

export function useCreateRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => getDataSource().createRun(file),
    onSuccess: (run) => {
      queryClient.setQueryData(qk.run(run.id), run)
      void queryClient.invalidateQueries({ queryKey: qk.runs, exact: true })
    },
  })
}

function remember(queryClient: ReturnType<typeof useQueryClient>, run: RunDetail) {
  queryClient.setQueryData(qk.run(run.id), run)
  void queryClient.invalidateQueries({ queryKey: qk.runs, exact: true })
}

export function usePay(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => getDataSource().pay(id),
    onSuccess: (run) => {
      remember(queryClient, run)
      if (run.id !== id) queryClient.removeQueries({ queryKey: qk.run(id) })
    },
  })
}

export function useRequote(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => getDataSource().requote(id),
    onSuccess: (run) => remember(queryClient, run),
  })
}

export function useDiscard(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => getDataSource().discard(id),
    onSuccess: (run) => remember(queryClient, run),
  })
}

export function useExcludeRow(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rowId: string) => getDataSource().excludeRow(id, rowId),
    onSuccess: (run) => remember(queryClient, run),
  })
}

export function useAdvance(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => getDataSource().advance(id),
    onSuccess: (run) => remember(queryClient, run),
  })
}
