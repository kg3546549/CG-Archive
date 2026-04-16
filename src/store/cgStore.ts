import { create } from 'zustand'
import type { Point } from '../algorithms/line'

export type LineAlgorithm = 'dda' | 'bresenham'

type CgState = {
  selectedTopic: string
  algorithm: LineAlgorithm
  start: Point
  end: Point
  progress: number
  isPlaying: boolean
  setSelectedTopic: (topic: string) => void
  setAlgorithm: (algorithm: LineAlgorithm) => void
  setStart: (point: Point) => void
  setEnd: (point: Point) => void
  setProgress: (progress: number) => void
  setIsPlaying: (isPlaying: boolean) => void
}

export const useCgStore = create<CgState>((set) => ({
  selectedTopic: 'line',
  algorithm: 'dda',
  start: { x: 2, y: 3 },
  end: { x: 14, y: 11 },
  progress: 0,
  isPlaying: false,
  setSelectedTopic: (selectedTopic) => set({ selectedTopic }),
  setAlgorithm: (algorithm) => set({ algorithm, progress: 0, isPlaying: false }),
  setStart: (start) => set({ start, progress: 0 }),
  setEnd: (end) => set({ end, progress: 0 }),
  setProgress: (progress) => set({ progress }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
}))
