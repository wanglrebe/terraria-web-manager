// github-status-updater.js - 将服务器状态同步到GitHub Issue
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// 默认配置
let config = {
  // GitHub配置
  owner: 'wanglrebe',               // 你的GitHub用户名
  repo: 'your_actual_repository_name', // 替换为你的实际仓库名
  issueNumber: 1,                   // 用于更新状态的Issue编号
  token: '',                        // GitHub API访问令牌（从配置文件读取）
  
  // 更新策略配置
  minUpdateInterval: 5 * 60 * 1000, // 最小更新间隔 (5分钟)
  regularUpdateInterval: 15 * 60 * 1000, // 定期更新间隔 (15分钟)
  maxHistoryItems: 50,             // 历史记录最大保存条数
  
  // 配置文件路径
  configPath: '/home/wangxinyi/Documents/github-status-updater.js' // 相对于项目根目录的配置文件路径
};

// 上次更新时间
let lastUpdateTime = 0;
// 维护一个历史记录数组
let statusHistory = [];
// 服务器启动时间
let serverStartTime = null;
// 定时更新的timer引用
let updateTimer = null;
// 当前服务器状态
let currentStatus = {
  running: false,
  playerCount: 0,
  worldName: '未知',
  modCount: 0,
  serverVersion: '未知',
  lastUpdate: new Date().toISOString(),
};

/**
 * 从外部配置文件加载GitHub配置
 * @returns {Promise<boolean>} 是否成功加载配置
 */
async function loadConfig() {
  try {
    // 使用绝对路径,确保即使工作目录变化也能找到配置文件
    const configFilePath = path.resolve(__dirname, config.configPath);
    
    // 检查文件是否存在
    if (!fs.existsSync(configFilePath)) {
      console.error(`GitHub配置文件不存在: ${configFilePath}`);
      
      // 创建示例配置文件
      const exampleConfig = {
        token: 'your_github_token_here',
        owner: 'wanglrebe',
        repo: 'your_actual_repository_name',
        issueNumber: 1
      };
      
      // 确保目录存在
      const configDir = path.dirname(configFilePath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // 写入示例配置文件
      fs.writeFileSync(
        configFilePath, 
        JSON.stringify(exampleConfig, null, 2),
        'utf8'
      );
      
      console.log(`已创建示例配置文件: ${configFilePath}`);
      console.log('请编辑此文件,添加你的GitHub令牌,然后重启服务器');
      
      return false;
    }
    
    // 读取配置文件
    const fileContent = fs.readFileSync(configFilePath, 'utf8');
    const userConfig = JSON.parse(fileContent);
    
    // 更新配置
    if (userConfig.token) config.token = userConfig.token;
    if (userConfig.owner) config.owner = userConfig.owner;
    if (userConfig.repo) config.repo = userConfig.repo;
    if (userConfig.issueNumber) config.issueNumber = userConfig.issueNumber;
    
    // 可选：更新其他配置项
    if (userConfig.minUpdateInterval) config.minUpdateInterval = userConfig.minUpdateInterval;
    if (userConfig.regularUpdateInterval) config.regularUpdateInterval = userConfig.regularUpdateInterval;
    if (userConfig.maxHistoryItems) config.maxHistoryItems = userConfig.maxHistoryItems;
    
    console.log('GitHub配置已加载');
    
    return true;
  } catch (error) {
    console.error('加载GitHub配置文件失败:', error);
    return false;
  }
}

/**
 * 初始化GitHub状态更新器
 * @param {boolean} initialStatus - 初始服务器状态
 */
async function initStatusUpdater(initialStatus = false) {
  console.log('初始化GitHub状态更新器');
  
  // 加载配置
  const configLoaded = await loadConfig();
  if (!configLoaded) {
    console.warn('GitHub状态更新器初始化失败: 配置未加载');
    return;
  }
  
  if (!config.token) {
    console.warn('GitHub状态更新器初始化失败: 缺少GitHub令牌');
    return;
  }
  
  // 设置初始状态
  currentStatus.running = initialStatus;
  
  // 如果服务器运行中,设置启动时间
  if (initialStatus) {
    serverStartTime = new Date();
  }
  
  // 开始定时更新
  scheduleRegularUpdates();
  
  // 执行初始更新
  updateServerStatus('初始化状态');
  
  console.log('GitHub状态更新器初始化完成');
}

/**
 * 安排定期更新
 */
function scheduleRegularUpdates() {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
  
  updateTimer = setInterval(() => {
    updateServerStatus('定时更新');
  }, config.regularUpdateInterval);
  
  console.log(`定时更新已设置,间隔为 ${config.regularUpdateInterval / 60000} 分钟`);
}

/**
 * 更新服务器状态到GitHub Issue
 * @param {string} reason - 更新原因
 * @param {boolean} force - 是否强制更新,忽略时间间隔限制
 */
async function updateServerStatus(reason = '状态变更', force = false) {
  // 如果没有配置Token，跳过更新
  if (!config.token) {
    console.warn('缺少GitHub令牌,跳过状态更新');
    return;
  }
  
  const now = Date.now();
  
  // 检查是否满足更新间隔,除非强制更新
  if (!force && now - lastUpdateTime < config.minUpdateInterval) {
    console.log(`更新间隔过短,跳过此次更新。原因: ${reason}`);
    return;
  }
  
  // 创建状态对象
  const statusData = getCurrentStatusData();
  
  // 比较与上次状态是否有变化
  const hasChanged = hasStatusChanged(statusData);
  
  // 如果是定时更新且状态没有变化,简化处理
  if (reason === '定时更新' && !hasChanged) {
    console.log('状态未变化,仅更新最后检查时间');
    currentStatus.lastUpdate = new Date().toISOString();
    return;
  }
  
  // 添加到历史记录
  addToStatusHistory(statusData, reason);
  
  try {
    // 更新GitHub Issue
    await updateGitHubIssue(statusData);
    
    // 更新最后更新时间
    lastUpdateTime = now;
    console.log(`GitHub状态更新成功。原因: ${reason}`);
  } catch (error) {
    console.error('更新GitHub Issue失败:', error.message);
  }
}

/**
 * 获取当前服务器状态数据
 * @returns {Object} 当前状态数据
 */
function getCurrentStatusData() {
  const now = new Date();
  let uptime = null;
  
  if (serverStartTime && currentStatus.running) {
    uptime = Math.floor((now - serverStartTime) / 1000); // 运行时间(秒)
  }
  
  // 构建状态数据对象
  return {
    running: currentStatus.running,
    playerCount: currentStatus.playerCount,
    worldName: currentStatus.worldName,
    modCount: currentStatus.modCount,
    serverVersion: currentStatus.serverVersion,
    uptime: uptime,
    lastUpdate: now.toISOString()
  };
}

/**
 * 检查状态是否有变化
 * @param {Object} newStatus - 新状态数据
 * @returns {boolean} 如果状态有变化返回true
 */
function hasStatusChanged(newStatus) {
  return (
    newStatus.running !== currentStatus.running ||
    newStatus.playerCount !== currentStatus.playerCount ||
    newStatus.worldName !== currentStatus.worldName ||
    newStatus.modCount !== currentStatus.modCount ||
    newStatus.serverVersion !== currentStatus.serverVersion
  );
}

/**
 * 添加状态到历史记录
 * @param {Object} status - 状态数据
 * @param {string} reason - 更新原因
 */
function addToStatusHistory(status, reason) {
  // 添加新状态到历史记录
  statusHistory.push({
    timestamp: status.lastUpdate,
    reason: reason,
    status: { ...status }
  });
  
  // 限制历史记录长度
  if (statusHistory.length > config.maxHistoryItems) {
    statusHistory = statusHistory.slice(-config.maxHistoryItems);
  }
}

/**
 * 更新GitHub Issue
 * @param {Object} statusData - 当前状态数据
 */
async function updateGitHubIssue(statusData) {
  // 更新当前状态
  currentStatus = { ...statusData };
  
  // 构建Issue内容
  const issueBody = generateIssueBody(statusData);
  
  // 使用GitHub API更新Issue
  try {
    const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/issues/${config.issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body: issueBody
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API错误 (${response.status}): ${JSON.stringify(errorData)}`);
    }
  } catch (error) {
    console.error('更新GitHub Issue失败:', error);
    throw error; // 重新抛出错误以便上层处理
  }
}

/**
 * 生成Issue内容
 * @param {Object} statusData - 当前状态数据
 * @returns {string} 格式化的Issue内容
 */
function generateIssueBody(statusData) {
  // 格式化当前状态
  let issueContent = `# 泰拉瑞亚服务器状态更新\n\n`;
  issueContent += `_最后更新: ${new Date(statusData.lastUpdate).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}_\n\n`;
  
  issueContent += `## 当前状态\n\n`;
  issueContent += `- **服务器状态**: ${statusData.running ? '🟢 运行中' : '🔴 离线'}\n`;
  issueContent += `- **世界名称**: ${statusData.worldName || '未知'}\n`;
  issueContent += `- **在线玩家**: ${statusData.playerCount}\n`;
  issueContent += `- **模组数量**: ${statusData.modCount}\n`;
  issueContent += `- **服务器版本**: ${statusData.serverVersion || '未知'}\n`;
  
  if (statusData.uptime !== null) {
    const hours = Math.floor(statusData.uptime / 3600);
    const minutes = Math.floor((statusData.uptime % 3600) / 60);
    issueContent += `- **运行时间**: ${hours}小时${minutes}分钟\n`;
  }
  
  // 添加历史记录
  issueContent += `\n## 最近状态变更\n\n`;
  
  if (statusHistory.length === 0) {
    issueContent += `*暂无历史记录*\n`;
  } else {
    // 取最近的10条记录
    const recentHistory = statusHistory.slice(-10).reverse();
    
    issueContent += `| 时间 | 事件 | 状态 | 玩家数 |\n`;
    issueContent += `| --- | --- | --- | --- |\n`;
    
    recentHistory.forEach(item => {
      const time = new Date(item.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const status = item.status.running ? '🟢 运行中' : '🔴 离线';
      issueContent += `| ${time} | ${item.reason} | ${status} | ${item.status.playerCount} |\n`;
    });
  }
  
  // 添加JSON数据供页面读取
  issueContent += `\n<details>\n<summary>详细状态数据 (JSON)</summary>\n\n\`\`\`json\n`;
  issueContent += JSON.stringify({
    currentStatus: statusData,
    history: statusHistory
  }, null, 2);
  issueContent += `\n\`\`\`\n</details>\n`;
  
  return issueContent;
}

/**
 * 处理服务器状态变更
 * @param {boolean} running - 服务器是否运行中
 */
function handleServerStatusChange(running) {
  const previousStatus = currentStatus.running;
  
  // 如果状态变化了
  if (previousStatus !== running) {
    // 更新当前状态
    currentStatus.running = running;
    
    // 如果服务器启动了,记录启动时间
    if (running) {
      serverStartTime = new Date();
      updateServerStatus('服务器启动', true);
    } else {
      // 服务器关闭,更新状态
      updateServerStatus('服务器关闭', true);
      serverStartTime = null;
    }
  }
}

/**
 * 更新当前世界名称
 * @param {string} worldName - 世界名称
 */
function updateWorldInfo(worldName) {
  if (worldName && worldName !== currentStatus.worldName) {
    currentStatus.worldName = worldName;
    updateServerStatus('地图更改');
  }
}

/**
 * 更新玩家数量
 * @param {number} count - 玩家数量
 */
function updatePlayerCount(count) {
  if (count !== currentStatus.playerCount) {
    // 只有显著变化才触发更新（0->非0 或 非0->0）
    const significant = 
      (currentStatus.playerCount === 0 && count > 0) || 
      (currentStatus.playerCount > 0 && count === 0);
    
    currentStatus.playerCount = count;
    
    if (significant) {
      updateServerStatus('玩家数量变化');
    }
  }
}

/**
 * 更新模组数量
 * @param {number} count - 模组数量
 */
function updateModCount(count) {
  if (count !== currentStatus.modCount) {
    currentStatus.modCount = count;
    updateServerStatus('模组数量变化');
  }
}

/**
 * 更新服务器版本信息
 * @param {string} versionInfo - 版本信息
 */
function updateVersionInfo(versionInfo) {
  if (versionInfo && versionInfo !== currentStatus.serverVersion) {
    currentStatus.serverVersion = versionInfo;
    updateServerStatus('版本信息更新');
  }
}

/**
 * 测试GitHub配置是否正确
 * @returns {Promise<boolean>} 配置是否有效
 */
async function testGitHubConfig() {
  if (!config.token) {
    console.error('无法测试GitHub配置: 缺少令牌');
    return false;
  }
  
  try {
    // 尝试获取当前用户信息(轻量级API调用)
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log(`GitHub配置有效, 认证为用户: ${userData.login}`);
      return true;
    } else {
      const errorData = await response.json();
      console.error(`GitHub令牌无效: ${JSON.stringify(errorData)}`);
      return false;
    }
  } catch (error) {
    console.error('测试GitHub配置时出错:', error.message);
    return false;
  }
}

// 导出相关函数
module.exports = {
  initStatusUpdater,
  updateServerStatus,
  handleServerStatusChange,
  updateWorldInfo,
  updatePlayerCount,
  updateModCount,
  updateVersionInfo,
  testGitHubConfig,
  loadConfig
};