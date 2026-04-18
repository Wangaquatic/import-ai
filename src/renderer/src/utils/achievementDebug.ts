// 成就调试工具 - 仅用于开发测试

export const achievementDebug = {
  // 解锁参数调优大师成就
  unlockParamMaster: () => {
    localStorage.setItem('achievement_param_master', '1')
    console.log('✅ 已解锁：参数调优大师')
  },

  // 解锁专家系统调优师成就
  unlockExpertTuner: () => {
    localStorage.setItem('achievement_expert_tuner', '1')
    console.log('✅ 已解锁：专家系统调优师')
  },

  // 解锁隐藏探索者成就
  unlockHiddenExplorer: () => {
    localStorage.setItem('achievement_hidden_explorer', '1')
    localStorage.setItem('hidden_levels_completed', '3')
    console.log('✅ 已解锁：隐藏探索者')
  },

  // 重置所有成就
  resetAllAchievements: () => {
    localStorage.removeItem('achievement_param_master')
    localStorage.removeItem('achievement_expert_tuner')
    localStorage.removeItem('achievement_hidden_explorer')
    localStorage.removeItem('hidden_levels_completed')
    localStorage.removeItem('tutorial_hidden_done')
    localStorage.removeItem('level2_hidden_done')
    console.log('🔄 已重置所有成就')
  },

  // 查看当前成就状态
  checkStatus: () => {
    const paramMaster = !!localStorage.getItem('achievement_param_master')
    const expertTuner = !!localStorage.getItem('achievement_expert_tuner')
    const hiddenExplorer = !!localStorage.getItem('achievement_hidden_explorer')
    const hiddenCompleted = parseInt(localStorage.getItem('hidden_levels_completed') || '0')
    
    console.log('📊 成就状态：')
    console.log(`  参数调优大师: ${paramMaster ? '✅ 已解锁' : '🔒 未解锁'}`)
    console.log(`  专家系统调优师: ${expertTuner ? '✅ 已解锁' : '🔒 未解锁'}`)
    console.log(`  隐藏探索者: ${hiddenExplorer ? '✅ 已解锁' : '🔒 未解锁'}`)
    console.log(`  已完成隐藏关卡: ${hiddenCompleted}/3`)
  },

  // 模拟完成隐藏关卡
  completeHiddenLevel: (levelNumber: number) => {
    const key = levelNumber === 0 ? 'tutorial_hidden_done' : `level${levelNumber}_hidden_done`
    localStorage.setItem(key, '1')
    const current = parseInt(localStorage.getItem('hidden_levels_completed') || '0')
    localStorage.setItem('hidden_levels_completed', String(current + 1))
    console.log(`✅ 已完成隐藏关卡 ${levelNumber === 0 ? '教学关' : `第${levelNumber}关`}，总进度: ${current + 1}/3`)
  }
}

// 在浏览器控制台中可用
if (typeof window !== 'undefined') {
  (window as any).achievementDebug = achievementDebug
}
