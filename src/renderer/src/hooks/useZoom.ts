import { useEffect, useState, useCallback } from 'react'

/**
 * 缩放功能 Hook
 * 使用 Ctrl+滚轮 来缩放画面
 * @param minZoom 最小缩放比例，默认 0.5 (50%)
 * @param maxZoom 最大缩放比例，默认 2.0 (200%)
 * @param step 每次滚动的缩放步长，默认 0.1
 */
export function useZoom(minZoom = 0.5, maxZoom = 2.0, step = 0.1) {
  const [zoom, setZoom] = useState(1.0)

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // 只在按住 Ctrl 键时触发缩放
      if (e.ctrlKey) {
        e.preventDefault()
        
        // deltaY > 0 表示向下滚动（缩小），< 0 表示向上滚动（放大）
        const delta = e.deltaY > 0 ? -step : step
        
        setZoom((prevZoom) => {
          const newZoom = prevZoom + delta
          // 限制在最小和最大缩放范围内
          return Math.max(minZoom, Math.min(maxZoom, newZoom))
        })
      }
    },
    [minZoom, maxZoom, step]
  )

  useEffect(() => {
    // 添加滚轮事件监听，使用 passive: false 以便可以 preventDefault
    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // 重置缩放
  const resetZoom = useCallback(() => {
    setZoom(1.0)
  }, [])

  return { zoom, resetZoom }
}
