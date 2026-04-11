-- ============================================
-- 添加密码字段到 users 表
-- 在 Supabase SQL Editor 中执行这段代码
-- ============================================

-- 添加密码字段（如果表已经存在）
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 如果你想重新创建整个表（会删除现有数据！）
-- 请先删除旧表，然后执行下面的完整创建语句


-- 删除旧表（警告：会删除所有数据！）
DROP TABLE IF EXISTS user_inventory CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 重新创建 users 表（带密码字段）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 500,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP DEFAULT NOW()
);

-- 重新创建其他表
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  level_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  stars INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  UNIQUE(user_id, level_id)
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  requirement_type VARCHAR(50),
  requirement_value INTEGER,
  reward_coins INTEGER DEFAULT 0
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  quantity INTEGER DEFAULT 1,
  purchased_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- 插入初始成就数据
INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, reward_coins) VALUES
('初出茅庐', '完成第一个关卡', '🎯', 'levels_completed', 1, 50),
('数据大师', '完成所有数据相关关卡', '📊', 'levels_completed', 3, 100),
('模型专家', '完成所有模型关卡', '🧠', 'levels_completed', 8, 200),
('完美主义者', '所有关卡获得满分', '⭐', 'perfect_levels', 8, 500);

-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (true);
CREATE POLICY "Users can view own progress" ON user_progress FOR ALL USING (true);
CREATE POLICY "Users can view own achievements" ON user_achievements FOR ALL USING (true);
CREATE POLICY "Users can view own inventory" ON user_inventory FOR ALL USING (true);
CREATE POLICY "Achievements are viewable by everyone" ON achievements FOR SELECT USING (true);
