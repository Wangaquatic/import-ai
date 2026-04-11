-- ============================================
-- 修复数据库脚本
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 第一步：添加密码字段（如果不存在）
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 第二步：查看当前表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 第三步：查看现有用户（如果有的话）
SELECT id, username, level, experience, coins, created_at
FROM users;

-- 第四步：删除旧的 RLS 策略
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- 第五步：创建新的 RLS 策略（允许所有操作）
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (true);

-- 第六步：测试插入一个用户
INSERT INTO users (username, password_hash, level, experience, coins)
VALUES ('test_user_' || floor(random() * 10000), 'test123456', 1, 0, 500)
RETURNING *;

-- 第七步：查看所有用户
SELECT * FROM users;

-- ============================================
-- 执行完成后，你应该看到：
-- 1. 表结构中有 password_hash 字段
-- 2. 成功插入了一个测试用户
-- 3. 可以查询到所有用户
-- ============================================
