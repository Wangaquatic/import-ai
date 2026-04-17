import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import LevelsPage from './pages/LevelsPage'
import ShopPage from './pages/ShopPage'
import ProfilePage from './pages/ProfilePage'
import TutorialPage from './pages/TutorialPage'
import Level2Page from './pages/Level2Page'
import Level3Page from './pages/levels/Level3Page'
import Level4Page from './pages/levels/Level4Page'
import './utils/achievementDebug' // 引入成就调试工具

type Page = 'home' | 'levels' | 'shop' | 'profile' | 'tutorial' | 'level2' | 'level3' | 'level4'

function AppContent(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const { isAuthenticated, isLoading, user } = useAuth()

  // 调试：监控认证状态变化
  console.log('🔍 App 状态:', { isAuthenticated, isLoading, user })

  const navigateTo = (page: Page) => {
    setCurrentPage(page)
  }

  const goHome = () => {
    setCurrentPage('home')
  }

  // 加载中
  if (isLoading) {
    console.log('⏳ 显示加载中...')
    return (
      <div className="app-container" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)'
      }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>加载中...</div>
      </div>
    )
  }

  // 已登录显示主应用
  console.log(isAuthenticated ? '✅ 已登录，显示主应用' : '🔒 未登录，显示登录弹窗')
  return (
    <div className="app-container" style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* 主页面作为背景，未登录时禁用交互 */}
      <div style={{ 
        position: isAuthenticated ? 'relative' : 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: isAuthenticated ? 'auto' : 'none',
        filter: isAuthenticated ? 'none' : 'blur(2px)',
        opacity: isAuthenticated ? 1 : 0.7,
        transition: 'all 0.3s ease',
        zIndex: 1
      }}>
        {currentPage === 'home' && <HomePage onNavigate={navigateTo} />}
        {currentPage === 'levels' && <LevelsPage onBack={goHome} onNavigate={navigateTo} />}
        {currentPage === 'tutorial' && <TutorialPage onBack={() => navigateTo('levels')} onNextLevel={() => navigateTo('level2')} />}
        {currentPage === 'level2' && <Level2Page onBack={() => navigateTo('levels')} />}
        {currentPage === 'level3' && <Level3Page onBack={() => navigateTo('levels')} />}
        {currentPage === 'level4' && <Level4Page onBack={() => navigateTo('levels')} />}
        {currentPage === 'shop' && <ShopPage onBack={goHome} />}
        {currentPage === 'profile' && <ProfilePage onBack={goHome} />}
      </div>
      
      {/* 未登录时显示登录弹窗 */}
      {!isAuthenticated && <LoginPage />}
    </div>
  )
}

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
