import { vec2 } from 'gl-matrix'

export type VisibilityCacheItem = {
  id: number
  pos: vec2
  angle?: number
  angularWidth?: number
}


export type VisibilityCache = {
  isInCache:(item: VisibilityCacheItem) => boolean
  addOrUpdate:(item: VisibilityCacheItem) => void
}

export const getVisibilityStripCache = () => {
  const map = new Map<number, VisibilityCacheItem>();
  return {
    isInCache: (item: VisibilityCacheItem) => {
      const existing = map.get(item.id);
      if (existing !== undefined) {
        return existing.pos[0] === item.pos[0] && existing.pos[1] === item.pos[1] && existing.angle === item.angle && existing.angularWidth === item.angularWidth;
      }
      return false;
    },
    addOrUpdate: (item: VisibilityCacheItem) => {
      map.set(item.id, item);
    }
  }
}