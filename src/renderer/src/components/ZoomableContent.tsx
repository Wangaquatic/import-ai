import React from 'react'
import { useZoom } from '../hooks/useZoom'

interface ZoomableContentProps {
  children: React.ReactNode
  className?: string
  onZoomChange?: (zoom: number) => void
}

/**
 * 可缩放内容组件
 * 使用 Ctrl+滚轮 来缩放内容
 * 只缩放包裹的内容，不影响外部UI
 */
export const ZoomableContent: React.FC<ZoomableContentProps> = ({ 
  children, 
  className = '',
  onZoomChange 
}) => {
  const { zoom, resetZoom } = useZoom(0.5, 2.0, 0.1)

  // 通知父组件缩放变化
  React.useEffect(() => {
    if (onZoomChange) {
      onZoomChange(zoom)
    }
  }, [zoom, onZoomChange])

  return (
    <>
      {/* 缩放指示器 */}
      <div className="zoom-indicator">
        <span>🔍 {Math.round(zoom * 100)}%</span>
        {zoom !== 1.0 && (
          <button className="zoom-reset-btn" onClick={resetZoom}>
            重置
          </button>
        )}
      </div>

      {/* 可缩放的内容 */}
      <div 
        className={className}
        style={{ 
          transform: `scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        {children}
      </div>
    </>
  )
}

/**
 * 用于单个元素的缩放包装器
 * 直接应用 transform scale
 */
export const useZoomScale = () => {
  const { zoom, resetZoom } = useZoom(0.5, 2.0, 0.1)
  
  const getScaleStyle = (additionalTransform?: string) => ({
    transform: additionalTransform 
      ? `${additionalTransform} scale(${zoom})`
      : `scale(${zoom})`,
    transformOrigin: 'center center'
  })

  return { zoom, resetZoom, getScaleStyle }
}
