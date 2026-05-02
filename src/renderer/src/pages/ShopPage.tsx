import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './ShopPage.css'

interface ShopPageProps {
  onBack: () => void
}

const ShopPage: React.FC<ShopPageProps> = ({ onBack }) => {
  const { user } = useAuth()
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem('player_coins') || '0'))

  // 监听localStorage变化，实时更新金币数
  React.useEffect(() => {
    const updateCoins = () => {
      const newCoins = parseInt(localStorage.getItem('player_coins') || '0')
      setCoins(newCoins)
    }

    const interval = setInterval(updateCoins, 100)
    window.addEventListener('storage', updateCoins)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', updateCoins)
    }
  }, [])

  const shopItems = [
    { 
      id: 1, 
      name: '提示道具', 
      price: 50, 
      icon: '💡', 
      desc: '在关卡中获得一次提示，帮助你找到正确的连接方式',
      purchased: false
    },
    { 
      id: 2, 
      name: '去噪器', 
      price: 100, 
      icon: '🔧', 
      desc: '自动过滤训练数据中的噪声，提升模型准确率',
      purchased: false
    },
    { 
      id: 3, 
      name: '精华提取器', 
      price: 80, 
      icon: '🧪', 
      desc: '保留核心信息，剔除冗余特征',
      purchased: false
    },
    { 
      id: 4, 
      name: '压缩核心', 
      price: 90, 
      icon: '🗜️', 
      desc: '降维缩小，用更少维度表达关键信息',
      purchased: false
    },
    { 
      id: 5, 
      name: '聚合仪', 
      price: 120, 
      icon: '🛞', 
      desc: '区域整合，将局部特征融合为全局表示',
      purchased: false
    },
    { 
      id: 6, 
      name: '特征熔炉', 
      price: 150, 
      icon: '🔥', 
      desc: '合成感：多源特征进入熔炉，炼成强力新特征',
      purchased: false
    }
  ]

  const handlePurchase = (item: typeof shopItems[0]) => {
    if (coins >= item.price) {
      const newCoins = coins - item.price
      setCoins(newCoins)
      localStorage.setItem('player_coins', String(newCoins))
      alert(`✅ 成功购买 ${item.name}！`)
    } else {
      alert('❌ 积分不足！')
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="shop-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
        <h1 className="page-title">🏪 商店</h1>
      </div>

      {/* 右上角积分显示 */}
      <div className="coins-corner">
        <span className="coins-icon">🪙</span>
        <span className="coins-amount">{coins}</span>
      </div>

      <div className="shop-content">
        <div className="profile-card">
          <div className="avatar">👨‍💻</div>
          <div className="user-info">
            <h2 className="username">{user.username}</h2>
            <div className="user-level">Lv.{user.level}</div>
          </div>
        </div>

        <div className="items-card">
          <h3 className="card-title">🛒 商品列表</h3>
          <div className="items-grid">
            {shopItems.map((item) => (
              <div key={item.id} className="shop-item">
                <div className="item-icon">{item.icon}</div>
                <div className="item-info">
                  <div className="item-name">{item.name}</div>
                  <div className="item-desc">{item.desc}</div>
                </div>
                <div className="item-actions">
                  <span className="item-price">💰 {item.price}</span>
                  <button
                    className="buy-button"
                    onClick={() => handlePurchase(item)}
                    disabled={coins < item.price}
                  >
                    {coins >= item.price ? '购买' : '积分不足'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShopPage
