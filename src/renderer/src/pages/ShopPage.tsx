import React, { useState } from 'react'
import './ShopPage.css'

interface ShopPageProps {
  onBack: () => void
}

const shopItems = [
  { id: 1, name: '决策树节点', price: 100, icon: '🌳', desc: '用于构建决策树模型' },
  { id: 2, name: '神经网络节点', price: 200, icon: '🧠', desc: '构建深度学习模型' },
  { id: 3, name: '数据增强工具', price: 150, icon: '📊', desc: '扩充训练数据集' },
  { id: 4, name: '特征选择器', price: 120, icon: '🔍', desc: '自动选择重要特征' },
  { id: 5, name: '提示道具', price: 50, icon: '💡', desc: '获得关卡提示' },
  { id: 6, name: '皮肤：科技蓝', price: 300, icon: '🎨', desc: '改变界面主题' }
]

const ShopPage: React.FC<ShopPageProps> = ({ onBack }) => {
  const [coins, setCoins] = useState(500)

  const handlePurchase = (item: (typeof shopItems)[0]) => {
    if (coins >= item.price) {
      setCoins(coins - item.price)
      alert(`成功购买 ${item.name}！`)
    } else {
      alert('积分不足！')
    }
  }

  return (
    <div className="shop-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
        <h1 className="page-title">🏪 商店</h1>
        <div className="coins-display">
          <span className="coin-icon">💰</span>
          <span className="coin-amount">{coins}</span>
        </div>
      </div>

      <div className="shop-grid">
        {shopItems.map((item) => (
          <div key={item.id} className="shop-item">
            <div className="item-icon">{item.icon}</div>
            <h3 className="item-name">{item.name}</h3>
            <p className="item-desc">{item.desc}</p>
            <div className="item-footer">
              <span className="item-price">
                💰 {item.price}
              </span>
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
  )
}

export default ShopPage
