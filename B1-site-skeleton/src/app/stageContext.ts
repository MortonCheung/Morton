import { createContext, useContext } from 'react'
import type { ChapterId } from '../data/chapters'

export interface StageRegistry {
  register: (id: ChapterId, el: HTMLElement | null) => void
}

export const StageContext = createContext<StageRegistry>({ register: () => {} })

export const useStageRegistry = () => useContext(StageContext)
