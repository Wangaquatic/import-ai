-- ============================================
-- Import AI 数据库初始化脚本
-- 复制整个文件内容，粘贴到 Supabase SQL Editor 中执行
-- ============================================

-- ============================================
-- 第一部分：创建用户表
-- 用途：存储用户基本信息（用户名、等级、经验、金币等）
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 500,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 第二部分：创建关卡进度表
-- 用途：记录每个用户在每个关卡的完成情况、星级、最高分等
-- ============================================
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

-- ============================================
-- 第三部分：创建成就定义表
-- 用途：定义游戏中所有可获得的成就（名称、描述、图标、奖励等）
-- ============================================
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  requirement_type VARCHAR(50),
  requirement_value INTEGER,
  reward_coins INTEGER DEFAULT 0
);

-- ============================================
-- 第四部分：创建用户成就表
-- 用途：记录每个用户解锁了哪些成就，以及成就进度
-- ============================================
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- 第五部分：创建用户物品表
-- 用途：记录用户在商店购买的道具、皮肤等物品
-- ============================================
CREATE TABLE user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  quantity INTEGER DEFAULT 1,
  purchased_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- ============================================
-- 第六部分：插入初始成就数据
-- 用途：添加 4 个预设成就到数据库
-- ============================================
INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, reward_coins) VALUES
('初出茅庐', '完成第一个关卡', '🎯', 'levels_completed', 1, 50),
('数据大师', '完成所有数据相关关卡', '📊', 'levels_completed', 3, 100),
('模型专家', '完成所有模型关卡', '🧠', 'levels_completed', 8, 200),
('完美主义者', '所有关卡获得满分', '⭐', 'perfect_levels', 8, 500);

-- ============================================
-- 第七部分：启用行级安全 (RLS)
-- 用途：保护数据安全，确保用户只能访问自己的数据
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 第八部分：创建安全策略
-- 用途：定义谁可以读写哪些数据
-- ============================================

-- 用户表策略：所有人可以查看、插入、更新
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (true);

-- 关卡进度策略：所有人可以操作（后续可以改为只能操作自己的）
CREATE POLICY "Users can view own progress" ON user_progress
  FOR ALL USING (true);

-- 用户成就策略：所有人可以操作
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR ALL USING (true);

-- 用户物品策略：所有人可以操作
CREATE POLICY "Users can view own inventory" ON user_inventory
  FOR ALL USING (true);

-- 成就定义策略：所有人可以查看（但不能修改）
CREATE POLICY "Achievements are viewable by everyone" ON achievements
  FOR SELECT USING (true);

-- ============================================
-- 完成！
-- 执行成功后，你应该看到 "Success. No rows returned"
-- 然后去 Table Editor 查看创建的表
-- ============================================
