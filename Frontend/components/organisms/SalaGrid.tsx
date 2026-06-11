'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Sala, SedeSlug } from '../types/sala'
import { SEDES } from '../types/sala'
import { MOCK_SALAS } from '../../data/mockSalas'
import { fetchSalas } from '../../services/salasService'
import { SedeSelector } from '../atoms/SedeSelector'
import { SalaCardGrid } from '../molecules/SalaCardGrid'
import { ErrorState } from '../molecules/ErrorState'
import { EmptyState } from '../molecules/EmptyState'
import styles from './SalaGrid.module.css'

const POLLING_INTERVAL = 30_000

type LoadState = 'idle' | 'loading' | 'success' | 'error'

export function SalaGrid() {
  const [sede, setSede] = useState<SedeSlug>('lans')
  const [salas, setSalas] = useState<Sala[]>(() => structuredClone(MOCK_SALAS['lans']))
  const [loadState, setLoadState] = useState<LoadState>('success')
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (targetSede: SedeSlug) => {
    setLoadState('loading')
    try {
      const data = await fetchSalas(targetSede)
      setSalas(data)
      setLastUpdated(new Date())
      setLoadState('success')
    } catch {
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    setSalas(structuredClone(MOCK_SALAS[sede]))
    setLoadState('success')
    setLastUpdated(new Date())
    load(sede)

    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => load(sede), POLLING_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sede, load])

  const sedeLabel = SEDES.find((s) => s.slug === sede)?.label ?? sede

  const formattedTime = lastUpdated.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <section className={styles.section} aria-labelledby="sala-grid-title">
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 id="sala-grid-title" className={styles.title}>
            Disponibilidad de salas
          </h1>
          <span
            className={`${styles.dot} ${loadState === 'loading' ? styles.dotPulsing : ''}`}
            aria-hidden="true"
          />
        </div>
        <div className={styles.controls}>
          <SedeSelector value={sede} onChange={setSede} />
          <p className={styles.timestamp} aria-live="polite">
            Actualizado a las {formattedTime}
          </p>
        </div>
      </div>

      {loadState === 'error' ? (
        <ErrorState onRetry={() => load(sede)} />
      ) : salas.length === 0 ? (
        <EmptyState sede={sedeLabel} />
      ) : (
        <SalaCardGrid salas={salas} sede={sede} />
      )}
    </section>
  )
}
