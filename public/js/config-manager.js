// config-manager.js - 处理配置文件管理功能
import { addLogEntry } from './logs-manager.js';
import { updateWorldName, showAlert } from './ui-controller.js';
import { serverRunning } from './server-controller.js';

// 设置配置管理功能
function setupConfigManager() {
  const basicConfigTab = document.getElementById('basicConfigTab');
  const advancedConfigTab = document.getElementById('advancedConfigTab');
  const basicConfigPanel = document.getElementById('basicConfigPanel');
  const advancedConfigPanel = document.getElementById('advancedConfigPanel');
  const loadConfigBtn = document.getElementById('loadConfig');
  const saveConfigBtn = document.getElementById('saveConfig');
  const browseWorldBtn = document.getElementById('browseWorldBtn');
  const worldFile = document.getElementById('worldFile');
  
  // 切换配置面板
  if (basicConfigTab && advancedConfigTab) {
    basicConfigTab.addEventListener('click', () => {
      basicConfigTab.classList.add('active');
      advancedConfigTab.classList.remove('active');
      basicConfigPanel.style.display = 'block';
      advancedConfigPanel.style.display = 'none';
      
      // 基本设置到高级设置的同步
      updateConfigFileFromForm();
    });
    
    advancedConfigTab.addEventListener('click', () => {
      advancedConfigTab.classList.add('active');
      basicConfigTab.classList.remove('active');
      advancedConfigPanel.style.display = 'block';
      basicConfigPanel.style.display = 'none';
    });
  }
  
  // 加载配置文件
  if (loadConfigBtn) {
    loadConfigBtn.addEventListener('click', () => {
      loadConfigFile().then(() => {
        // 加载配置后更新世界名称
        updateCurrentWorldName();
      });
    });
  }
  
  // 保存配置文件
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', () => {
      if (advancedConfigPanel.style.display === 'block') {
        // 高级模式 - 直接保存文本内容
        const configFileContent = document.getElementById('configFileContent');
        saveConfigFile(configFileContent.value);
      } else {
        // 基本模式 - 从表单生成配置内容
        const configContent = updateConfigFileFromForm();
        saveConfigFile(configContent);
      }
    });
  }
  
  // 表单字段变更时更新配置
  const formFields = document.querySelectorAll('#basicConfigPanel .form-control');
  formFields.forEach(field => {
    field.addEventListener('change', () => {
      if (basicConfigPanel.style.display === 'block') {
        updateConfigFileFromForm();
      }
    });
  });
  
  // 选择地图文件
  if (browseWorldBtn) {
    browseWorldBtn.addEventListener('click', () => {
      // 目前浏览器不允许直接浏览文件系统，这需要后端支持
      showAlert('由于浏览器安全限制，请直接输入世界文件的完整路径。例如：/home/wangxinyi/.steam/steam/steamapps/common/tModLoader/Worlds/myworld.wld');
    });
  }
  
  // 世界文件变更时更新名称
  if (worldFile) {
    worldFile.addEventListener('change', () => {
      updateCurrentWorldName();
    });
  }
  
  // 初始加载配置文件
  loadConfigFile().then(() => {
    // 加载配置后更新世界名称
    updateCurrentWorldName();
  });
  
  console.log('配置管理功能已设置');
}

// 从世界文件路径提取并更新地图名称
function updateCurrentWorldName() {
  const worldFile = document.getElementById('worldFile');
  const currentWorld = document.getElementById('currentWorld');
  
  if (worldFile && currentWorld) {
    const path = worldFile.value.trim();
    if (path) {
      // 提取文件名（不含扩展名）
      const fileName = path.split('/').pop().replace(/\.wld$/, '');
      currentWorld.textContent = fileName || '未指定';
      console.log('已更新地图名称:', fileName);
    } else {
      currentWorld.textContent = '未指定';
    }
  }
}

// 加载配置文件
function loadConfigFile() {
  return new Promise((resolve, reject) => {
    fetch('/api/server/config')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // 设置配置文件内容
          const configFileContent = document.getElementById('configFileContent');
          if (configFileContent) {
            configFileContent.value = data.content;
          }
          
          // 解析配置文件到表单
          parseConfigToForm(data.content);
          
          addLogEntry('配置文件加载成功');
          resolve(data);
        } else {
          addLogEntry('加载配置文件失败: ' + data.message, true);
          reject(new Error(data.message));
        }
      })
      .catch(error => {
        console.error('加载配置文件失败:', error);
        addLogEntry('加载配置文件失败: ' + error.message, true);
        reject(error);
      });
  });
}

// 保存配置文件
function saveConfigFile(content) {
  if (serverRunning) {
    showAlert('服务器正在运行，无法修改配置文件');
    return;
  }
  
  fetch('/api/server/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      addLogEntry('配置文件保存成功');
    } else {
      addLogEntry('保存配置文件失败: ' + data.message, true);
    }
  })
  .catch(error => {
    console.error('保存配置文件失败:', error);
    addLogEntry('保存配置文件失败: ' + error.message, true);
  });
}

// 解析配置文件到表单
function parseConfigToForm(content) {
  // 解析每一行
  const lines = content.split('\n');
  const config = {};
  
  lines.forEach(line => {
    // 跳过注释和空行
    if (line.trim().startsWith('#') || line.trim() === '') {
      return;
    }
    
    // 查找键值对
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      config[key] = value;
    }
  });
  
  // 设置表单值
  const worldFile = document.getElementById('worldFile');
  const maxPlayers = document.getElementById('maxPlayers');
  const serverPort = document.getElementById('serverPort');
  const serverPassword = document.getElementById('serverPassword');
  const modpack = document.getElementById('modpack');
  const motd = document.getElementById('motd');
  const language = document.getElementById('language');
  
  if (worldFile && config.world) worldFile.value = config.world;
  if (maxPlayers && config.maxplayers) maxPlayers.value = config.maxplayers;
  if (serverPort && config.port) serverPort.value = config.port;
  if (serverPassword && config.password) serverPassword.value = config.password;
  if (modpack && config.modpack) modpack.value = config.modpack;
  if (motd && config.motd) motd.value = config.motd;
  if (language && config.language) language.value = config.language;
}

// 从表单更新配置文件
function updateConfigFileFromForm() {
  const configFileContent = document.getElementById('configFileContent');
  if (!configFileContent) return '';
  
  // 获取原始内容
  const content = configFileContent.value;
  const lines = content.split('\n');
  const updatedLines = [];
  
  // 获取表单数据
  const worldFile = document.getElementById('worldFile');
  const maxPlayers = document.getElementById('maxPlayers');
  const serverPort = document.getElementById('serverPort');
  const serverPassword = document.getElementById('serverPassword');
  const modpack = document.getElementById('modpack');
  const motd = document.getElementById('motd');
  const language = document.getElementById('language');
  
  // 需要更新的配置项及其值
  const updates = {
    'world': worldFile ? worldFile.value || '' : '',
    'maxplayers': maxPlayers ? maxPlayers.value || '' : '',
    'port': serverPort ? serverPort.value || '' : '',
    'password': serverPassword ? serverPassword.value || '' : '',
    'modpack': modpack ? modpack.value || '' : '',
    'motd': motd ? motd.value || '' : '',
    'language': language ? language.value || '' : ''
  };
  
  // 标记已更新的键
  const updatedKeys = new Set();
  
  // 处理每一行
  lines.forEach(line => {
    let updatedLine = line;
    
    // 检查是否是我们要更新的配置行
    Object.keys(updates).forEach(key => {
      // 检查是否是配置行 (无论是否已注释)
      const configRegex = new RegExp(`^#?\\s*${key}=.*$`);
      
      if (configRegex.test(line)) {
        if (updates[key]) {
          // 如果有值，取消注释并设置新值
          updatedLine = `${key}=${updates[key]}`;
        } else {
          // 如果没有值，添加注释
          if (!line.startsWith('#')) {
            updatedLine = `#${line}`;
          }
        }
        updatedKeys.add(key);
      }
    });
    
    updatedLines.push(updatedLine);
  });
  
  // 检查是否有未在文件中找到的配置项，需要添加
  Object.keys(updates).forEach(key => {
    if (!updatedKeys.has(key) && updates[key]) {
      updatedLines.push(`${key}=${updates[key]}`);
    }
  });
  
  const updatedContent = updatedLines.join('\n');
  configFileContent.value = updatedContent;
  
  return updatedContent;
}

// 导出函数
export {
  setupConfigManager,
  loadConfigFile,
  saveConfigFile,
  updateCurrentWorldName
};