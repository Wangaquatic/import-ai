import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import LevelsPage from './pages/LevelsPage'
import ShopPage from './pages/ShopPage'
import ProfilePage from './pages/ProfilePage'
import TutorialPage from './pages/TutorialPage'
import Level2Page from './pages/levels/Level2Page'
import Level2CopyPage from './pages/levels/Level2CopyPage'
import Level1Page from './pages/levels/Level1Page'
import Level3Page from './pages/levels/Level3Page'
import Level4Page from './pages/levels/Level4Page'
import './utils/achievementDebug'

type Page = 'home' | 'levels' | 'shop' | 'profile' | 'tutorial' | 'level1' | 'level2' | 'level2copy' | 'level3' | 'level4'

function AppContent(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const { isAuthenticated, isLoading, user } = useAuth()

  console.log('App status:', { isAuthenticated, isLoading, user })

  const navigateTo = (page: Page) => {
    setCurrentPage(page)
  }

  const goHome = () => {
    setCurrentPage('home')
  }

  if (isLoading) {
    console.log('Loading...')
    return (
      <div className="app-container" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)'
      }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Loading...</div>
      </div>
    )
  }

  console.log(isAuthenticated ? 'Logged in' : 'Not logged in')
  return (
    <div className="app-container" style={{ position: 'relative', width: '100%', height: '100vh' }}>
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
        {currentPage === 'level1' && <Level1Page onBack={() => navigateTo('levels')} onNextLevel={() => navigateTo('level2')} />}
        {currentPage === 'level2' && <Level2Page onBack={() => navigateTo('levels')} />}
        {currentPage === 'level2copy' && <Level2CopyPage onBack={() => navigateTo('levels')} onNextLevel={() => navigateTo('level2')} />}
        {currentPage === 'level3' && <Level3Page onBack={() => navigateTo('levels')} onNextLevel={() => navigateTo('level4')} />}
        {currentPage === 'level4' && <Level4Page onBack={() => navigateTo('levels')} onNextLevel={() => navigateTo('levels')} />}
        {currentPage === 'shop' && <ShopPage onBack={goHome} />}
        {currentPage === 'profile' && <ProfilePage onBack={goHome} />}
      </div>
      
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