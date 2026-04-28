import { useEffect, useCallback, useRef } from 'react'

/**
 * 监听窗口大小变化的Hook
 * 用于在窗口resize时触发回调，更新连接线等依赖位置的元素
 */
export function useResizeObserver(callback: () => void, deps: React.DependencyList = []) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleResize = useCallback(() => {
    // 使用防抖避免频繁触发
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      callback()
    }, 100)
  }, [callback])

  useEffect(() => {
    // 监听窗口resize事件
    window.addEventListener('resize', handleResize)
    
    // 初始化时也触发一次
    handleResize()
    
    return () => {
      window.removeEventListener('resize', handleResize)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [handleResize, ...deps])
}
