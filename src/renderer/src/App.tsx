import { useState } from 'react'
import HomePage from './pages/HomePage'
import LevelsPage from './pages/LevelsPage'
import ShopPage from './pages/ShopPage'
import ProfilePage from './pages/ProfilePage'

type Page = 'home' | 'levels' | 'shop' | 'profile'

function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<Page>('home')

  const navigateTo = (page: Page) => {
    setCurrentPage(page)
  }

  const goHome = () => {
    setCurrentPage('home')
  }

  return (
    <div className="app-container">
      {currentPage === 'home' && <HomePage onNavigate={navigateTo} />}
      {currentPage === 'levels' && <LevelsPage onBack={goHome} />}
      {currentPage === 'shop' && <ShopPage onBack={goHome} />}
      {currentPage === 'profile' && <ProfilePage onBack={goHome} />}
    </div>
  )
}

export default App
