// github-manager.js - 处理GitHub Issue更新配置
import { addLogEntry } from './logs-manager.js';
import { showAlert } from './ui-controller.js';
import { serverRunning } from './server-controller.js';

// 设置GitHub配置管理功能
function setupGithubManager() {
  const githubEnabled = document.getElementById('githubEnabled');
  const githubStatus = document.getElementById('githubStatus');
  const githubInterval = document.getElementById('githubInterval');
  const updateOnPlayerChange = document.getElementById('updateOnPlayerChange');
  const updateOnModsLoaded = document.getElementById('updateOnModsLoaded');
  const updateOnVersionLoaded = document.getElementById('updateOnVersionLoaded');
  const updateOnWorldChange = document.getElementById('updateOnWorldChange');
  const githubOwner = document.getElementById('githubOwner');
  const githubRepo = document.getElementById('githubRepo');
  const githubIssue = document.getElementById('githubIssue');
  const githubToken = document.getElementById('githubToken');
  const toggleToken = document.getElementById('toggleToken');
  const lastGithubUpdate = document.getElementById('lastGithubUpdate');
  const githubUpdateStatus = document.getElementById('githubUpdateStatus');
  const testGithubConfig = document.getElementById('testGithubConfig');
  const saveGithubConfig = document.getElementById('saveGithubConfig');
  const updateGithubNow = document.getElementById('updateGithubNow');

  // 加载GitHub配置
  loadGithubConfig();

  // GitHub开关变更事件
  if (githubEnabled) {
    githubEnabled.addEventListener('change', () => {
      const enabled = githubEnabled.checked;
      updateGithubStatusUI(enabled);
    });
  }

  // Token显示/隐藏切换
  if (toggleToken) {
    toggleToken.addEventListener('click', () => {
      if (githubToken.type === 'password') {
        githubToken.type = 'text';
        toggleToken.textContent = '隐藏';
      } else {
        githubToken.type = 'password';
        toggleToken.textContent = '显示';
      }
    });
  }

  // 测试GitHub配置
  if (testGithubConfig) {
    testGithubConfig.addEventListener('click', () => {
      testConnection();
    });
  }

  // 保存GitHub配置
  if (saveGithubConfig) {
    saveGithubConfig.addEventListener('click', () => {
      saveConfiguration();
    });
  }

  // 立即更新GitHub Issue
  if (updateGithubNow) {
    updateGithubNow.addEventListener('click', () => {
      updateGithubIssue();
    });
  }

  console.log('GitHub管理功能已设置');
}

// 更新GitHub状态UI
function updateGithubStatusUI(enabled) {
  const githubStatus = document.getElementById('githubStatus');
  
  if (githubStatus) {
    githubStatus.textContent = enabled ? '已启用' : '已禁用';
    githubStatus.className = enabled ? 'status-enabled' : 'status-disabled';
  }
}

// 加载GitHub配置
function loadGithubConfig() {
  fetch('/api/github/config')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const config = data.config;
        
        // 更新UI元素
        document.getElementById('githubEnabled').checked = config.enableUpdates;
        document.getElementById('updateOnPlayerChange').checked = config.updateOnPlayerChange;
        document.getElementById('updateOnModsLoaded').checked = config.updateOnModsLoaded;
        document.getElementById('updateOnVersionLoaded').checked = config.updateOnVersionLoaded;
        document.getElementById('updateOnWorldChange').checked = config.updateOnWorldChange;
        document.getElementById('githubOwner').value = config.owner;
        document.getElementById('githubRepo').value = config.repo;
        document.getElementById('githubIssue').value = config.issueNumber;
        
        // 设置更新间隔（转换为分钟）
        const intervalMinutes = Math.floor(config.regularUpdateInterval / (60 * 1000));
        const intervalSelect = document.getElementById('githubInterval');
        for (let i = 0; i < intervalSelect.options.length; i++) {
          if (parseInt(intervalSelect.options[i].value) === intervalMinutes) {
            intervalSelect.selectedIndex = i;
            break;
          }
        }
        
        // 更新UI状态
        updateGithubStatusUI(config.enableUpdates);
        
        console.log('GitHub配置已加载');
      } else {
        addLogEntry('加载GitHub配置失败: ' + data.message, true);
      }
    })
    .catch(error => {
      console.error('加载GitHub配置失败:', error);
      addLogEntry('加载GitHub配置失败: ' + error.message, true);
    });
}

// 保存GitHub配置
function saveConfiguration() {
  const newConfig = {
    enableUpdates: document.getElementById('githubEnabled').checked,
    updateOnPlayerChange: document.getElementById('updateOnPlayerChange').checked,
    updateOnModsLoaded: document.getElementById('updateOnModsLoaded').checked,
    updateOnVersionLoaded: document.getElementById('updateOnVersionLoaded').checked,
    updateOnWorldChange: document.getElementById('updateOnWorldChange').checked,
    owner: document.getElementById('githubOwner').value,
    repo: document.getElementById('githubRepo').value,
    issueNumber: parseInt(document.getElementById('githubIssue').value) || 1,
    regularUpdateInterval: parseInt(document.getElementById('githubInterval').value) * 60 * 1000 // 转换为毫秒
  };
  
  // 如果提供了token，也保存token
  const token = document.getElementById('githubToken').value;
  if (token) {
    newConfig.token = token;
  }
  
  fetch('/api/github/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newConfig)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showAlert('GitHub配置已保存');
      addLogEntry('GitHub配置保存成功');
      
      // 清除token输入框
      document.getElementById('githubToken').value = '';
      document.getElementById('githubToken').type = 'password';
      document.getElementById('toggleToken').textContent = '显示';
      
      // 更新上次保存时间
      document.getElementById('lastGithubUpdate').textContent = new Date().toLocaleString();
    } else {
      showAlert('保存GitHub配置失败: ' + data.message);
      addLogEntry('保存GitHub配置失败: ' + data.message, true);
    }
  })
  .catch(error => {
    console.error('保存GitHub配置失败:', error);
    showAlert('保存GitHub配置失败: ' + error.message);
    addLogEntry('保存GitHub配置失败: ' + error.message, true);
  });
}

// 测试GitHub连接
function testConnection() {
  fetch('/api/github/test')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showAlert('GitHub配置有效，连接测试成功');
        document.getElementById('githubUpdateStatus').textContent = '连接正常';
        document.getElementById('githubUpdateStatus').style.color = '#28a745';
        addLogEntry('GitHub连接测试成功');
      } else {
        showAlert('GitHub配置无效: ' + data.message);
        document.getElementById('githubUpdateStatus').textContent = '连接失败';
        document.getElementById('githubUpdateStatus').style.color = '#dc3545';
        addLogEntry('GitHub连接测试失败: ' + data.message, true);
      }
    })
    .catch(error => {
      console.error('测试GitHub连接失败:', error);
      showAlert('测试GitHub连接失败: ' + error.message);
      document.getElementById('githubUpdateStatus').textContent = '连接错误';
      document.getElementById('githubUpdateStatus').style.color = '#dc3545';
      addLogEntry('测试GitHub连接失败: ' + error.message, true);
    });
}

// 立即更新GitHub Issue - 完整版本
function updateGithubIssue() {
  // 从当前界面收集状态信息
  const currentWorld = document.getElementById('currentWorld');
  const playerCount = document.getElementById('playerCount'); 
  const serverVersion = document.getElementById('serverVersion');
  
  // 解析模组数量 - 找到模组列表中的所有模组项
  let modCount = 0;
  const modItems = document.querySelectorAll('.mod-item');
  if (modItems && modItems.length) {
    modCount = modItems.length;
  } else {
    // 备选：尝试从文本中解析
    const modsList = document.getElementById('modsList');
    if (modsList) {
      const modCountText = modsList.querySelector('.mod-count')?.textContent;
      if (modCountText) {
        const match = modCountText.match(/(\d+)/);
        if (match) {
          modCount = parseInt(match[1], 10);
        }
      }
    }
  }
  
  // 构建当前状态对象
  const currentState = {
    worldName: currentWorld ? currentWorld.textContent : '未知',
    playerCount: playerCount ? parseInt(playerCount.textContent, 10) || 0 : 0,
    modCount: modCount,
    serverVersion: serverVersion ? serverVersion.textContent : '未知'
  };
  
  // 确保不传递"未指定"作为世界名称
  if (currentState.worldName === '未指定') {
    currentState.worldName = '未知';
  }
  
  console.log('发送状态更新到GitHub：', currentState);
  
  // 发送请求更新GitHub Issue
  fetch('/api/github/update', {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(currentState)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showAlert('GitHub Issue已更新');
      document.getElementById('lastGithubUpdate').textContent = new Date().toLocaleString();
      addLogEntry('GitHub Issue已手动更新');
    } else {
      showAlert('更新GitHub Issue失败: ' + data.message);
      addLogEntry('更新GitHub Issue失败: ' + data.message, true);
    }
  })
  .catch(error => {
    console.error('更新GitHub Issue失败:', error);
    showAlert('更新GitHub Issue失败: ' + error.message);
    addLogEntry('更新GitHub Issue失败: ' + error.message, true);
  });
}

// 导出函数
export {
  setupGithubManager
};