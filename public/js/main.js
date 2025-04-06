document.addEventListener('DOMContentLoaded', () => {
  // 标签页切换功能
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // 获取要激活的标签页ID
      const tabId = link.getAttribute('data-tab');
      
      // 移除所有标签页的active类
      tabLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // 给点击的标签页添加active类
      link.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // 获取DOM元素 - 服务器控制部分
  const startServerBtn = document.getElementById('startServer');
  const stopServerBtn = document.getElementById('stopServer');
  const serverStatusSpan = document.getElementById('serverStatus');
  const clearLogsBtn = document.getElementById('clearLogs');
  const exportLogsBtn = document.getElementById('exportLogs');
  const logContainer = document.getElementById('logContainer');
  const logFilter = document.getElementById('logFilter');
  const steamOption = document.getElementById('steamOption');
  const lobbyOptions = document.getElementById('lobbyOptions');
  const lobbyType = document.getElementById('lobbyType');
  const currentSelectionSpan = document.getElementById('currentSelection');

  // 获取DOM元素 - 配置文件部分
  const basicConfigTab = document.getElementById('basicConfigTab');
  const advancedConfigTab = document.getElementById('advancedConfigTab');
  const basicConfigPanel = document.getElementById('basicConfigPanel');
  const advancedConfigPanel = document.getElementById('advancedConfigPanel');
  const configFileContent = document.getElementById('configFileContent');
  const loadConfigBtn = document.getElementById('loadConfig');
  const saveConfigBtn = document.getElementById('saveConfig');
  const browseWorldBtn = document.getElementById('browseWorldBtn');
  
  // 表单元素
  const worldFile = document.getElementById('worldFile');
  const maxPlayers = document.getElementById('maxPlayers');
  const serverPort = document.getElementById('serverPort');
  const serverPassword = document.getElementById('serverPassword');
  const modpack = document.getElementById('modpack');
  const motd = document.getElementById('motd');
  const language = document.getElementById('language');
  
  // 获取DOM元素 - 用户管理部分
  const usersList = document.getElementById('usersList');
  const noUsersMessage = document.getElementById('noUsersMessage');
  const refreshUsersBtn = document.getElementById('refreshUsers');
  const userFilter = document.getElementById('userFilter');
  const customCommand = document.getElementById('customCommand');
  const kickUserBtn = document.getElementById('kickUser');
  const banUserBtn = document.getElementById('banUser');
  
  // 服务器信息元素
  const currentWorld = document.getElementById('currentWorld');
  const playerCount = document.getElementById('playerCount');
  const modsList = document.getElementById('modsList');
  const modsInfo = document.getElementById('modsInfo');
  const serverVersion = document.getElementById('serverVersion');
  const versionInfo = document.getElementById('versionInfo');
  
  // 服务器状态变量
  let serverRunning = false;
  
  // 活跃玩家集合
  let activePlayers = new Set();
  
  // 用户权限映射 (用户名 -> 是否有聊天命令权限)
  let userPermissions = new Map();
  
  // 命令输出缓存
  let commandOutputCache = {
    command: '',
    waitingForOutput: false,
    output: '',
    timestamp: 0
  };
  
  // 支持的聊天命令 - 中文环境
  const CHAT_COMMANDS = {
    '时间': { command: '时间', hasResponse: true },
    '黎明': { command: '黎明', hasResponse: false },
    '正午': { command: '正午', hasResponse: false },
    '黄昏': { command: '黄昏', hasResponse: false },
    '午夜': { command: '午夜', hasResponse: false },
    '帮助': { command: '帮助', hasResponse: true }
  };
  
  // 模组列表
  let activeModsList = [];
  
  // 验证玩家列表的定时器
  let playerVerificationTimer = null;
  
  // 连接Socket.IO
  const socket = io();

  // 初始化 - 获取服务器状态
  fetch('/api/server/status')
    .then(response => response.json())
    .then(data => {
      updateServerStatus(data.running);
    })
    .catch(error => {
      console.error('获取服务器状态失败:', error);
      addLogEntry('获取服务器状态失败: ' + error.message, true);
    });

  // 初始化 - 获取现有日志
  fetch('/api/server/logs')
    .then(response => response.json())
    .then(logs => {
      logContainer.innerHTML = '';
      logs.forEach(log => {
        addLogEntry(log.content, log.type === 'error', log.time);
      });
    })
    .catch(error => {
      console.error('获取日志失败:', error);
    });
  
  // 从localStorage加载用户权限
  function loadUserPermissions() {
    try {
      const savedPermissions = localStorage.getItem('userCommandPermissions');
      if (savedPermissions) {
        const permissionsObj = JSON.parse(savedPermissions);
        
        Object.keys(permissionsObj).forEach(username => {
          userPermissions.set(username, permissionsObj[username]);
        });
        
        console.log('已加载用户权限设置:', userPermissions);
      }
    } catch (error) {
      console.error('加载用户权限设置失败:', error);
    }
  }
  
  // 页面加载时加载权限设置
  loadUserPermissions();
    
  // 添加刷新模组点击事件
  modsInfo.addEventListener('click', () => {
    console.log('点击刷新模组列表');
    activeModsList = []; // 清空现有列表
    fetchModsList();
  });
  
  // 添加版本信息点击事件
  versionInfo.addEventListener('click', () => {
    console.log('点击获取版本信息');
    fetchVersionInfo();
  });
  
  // 调试函数 - 显示当前选择
  function updateDebugInfo() {
    if (currentSelectionSpan) {
      const steamVal = steamOption.value;
      const lobbyVal = lobbyType.value;
      currentSelectionSpan.textContent = `Steam: ${steamVal}, Lobby: ${lobbyVal}`;
    }
  }
  
  // Steam选项变更事件
  steamOption.addEventListener('change', () => {
    console.log('Steam选项变更为:', steamOption.value);
    if (steamOption.value === 'steam') {
      lobbyOptions.style.display = 'block';
    } else {
      lobbyOptions.style.display = 'none';
    }
    updateDebugInfo();
  });
  
  // 大厅类型变更事件
  lobbyType.addEventListener('change', () => {
    console.log('大厅类型变更为:', lobbyType.value);
    updateDebugInfo();
  });
  
  // 初始化Steam选项显示状态
  function updateSteamOptions() {
    console.log('初始化Steam选项, 当前值:', steamOption.value);
    if (steamOption.value === 'steam') {
      lobbyOptions.style.display = 'block';
    } else {
      lobbyOptions.style.display = 'none';
    }
    updateDebugInfo();
  }
  
  // 页面加载时检查并设置大厅选项的显示状态
  updateSteamOptions();

  // 日志过滤功能
  logFilter.addEventListener('input', () => {
    const filterText = logFilter.value.toLowerCase();
    const logEntries = logContainer.querySelectorAll('.log-entry');
    
    logEntries.forEach(entry => {
      const logContent = entry.textContent.toLowerCase();
      if (filterText === '' || logContent.includes(filterText)) {
        entry.style.display = 'block';
      } else {
        entry.style.display = 'none';
      }
    });
  });
  
  // 导出日志功能
  exportLogsBtn.addEventListener('click', () => {
    const logEntries = logContainer.querySelectorAll('.log-entry');
    let logText = '';
    
    logEntries.forEach(entry => {
      if (entry.style.display !== 'none') {
        logText += entry.textContent + '\n';
      }
    });
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terraria-server-log-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLogEntry('已导出日志');
  });
  
  // 选择地图文件
  browseWorldBtn.addEventListener('click', () => {
    // 目前浏览器不允许直接浏览文件系统，这需要后端支持
    // 这里可以模拟一个选择对话框
    alert('由于浏览器安全限制，请直接输入世界文件的完整路径。例如：/home/wangxinyi/.steam/steam/steamapps/common/tModLoader/Worlds/myworld.wld');
  });

  // Socket.IO事件监听
  socket.on('server-status', data => {
    updateServerStatus(data.running);
    
    if (data.running) {
      // 更新当前地图名称
      updateWorldName();
      
      // 服务器启动后，延迟获取版本信息
      setTimeout(() => {
        fetchVersionInfo();
      }, 10000); // 等待10秒
      
      // 服务器启动后，延迟更长时间获取模组列表
      setTimeout(() => {
        // 清空已有模组列表
        activeModsList = [];
        console.log('准备获取模组列表...');
        fetchModsList();
      }, 30000); // 等待30秒让服务器完全启动并加载地图
      
      // 启动定时器定期验证玩家列表
      startPlayerListVerification();
    } else if (data.exitCode !== undefined) {
      addLogEntry(`服务器已停止，退出代码: ${data.exitCode}`, data.exitCode !== 0);
      // 服务器停止时清空玩家列表
      activePlayers.clear();
      updatePlayerCount();
      // 清空版本和模组信息
      serverVersion.textContent = '未知';
      activeModsList = [];
      updateModsDisplay();
      // 停止定时器
      stopPlayerListVerification();
    }
  });

  // 替换socket.on('server-log')事件处理函数
  socket.on('server-log', log => {
    addLogEntry(log.content, log.type === 'error', log.time);
    
    const content = log.content;
    
    // 处理命令输出缓存
    if (commandOutputCache.waitingForOutput) {
      // 忽略命令本身的输出
      if (content === commandOutputCache.command) {
        return;
      }
      
      // 针对"时间"命令的处理
      if (commandOutputCache.command === '时间' && content.includes('时间：')) {
        // 发送时间信息给玩家
        sendServerCommand(`说 @${commandOutputCache.playerName}: ${content.trim()}`)
          .then(() => console.log('已发送时间信息'))
          .catch(e => console.error('发送时间信息失败:', e));
        
        // 重置缓存状态
        commandOutputCache.waitingForOutput = false;
        return;
      }
      
      // 针对"帮助"命令的处理
      if (commandOutputCache.command === '帮助') {
        // 帮助命令输出通常以冒号开头
        if (content.startsWith(':')) {
          // 提取有用的命令信息
          const helpText = content.substring(1).trim();
          
          // 忽略空行
          if (helpText.length === 0) {
            return;
          }
          
          // 收集帮助信息
          if (commandOutputCache.output === '') {
            commandOutputCache.output = helpText;
          } else {
            commandOutputCache.output += ' | ' + helpText;
          }
          
          // 延迟发送收集到的帮助信息
          clearTimeout(commandOutputCache.timeout);
          commandOutputCache.timeout = setTimeout(() => {
            if (commandOutputCache.output) {
              // 发送帮助信息给玩家
              sendServerCommand(`说 @${commandOutputCache.playerName}: 可用命令: ${commandOutputCache.output}`)
                .then(() => console.log('已发送帮助信息'))
                .catch(e => console.error('发送帮助信息失败:', e));
            }
            
            // 重置缓存状态
            commandOutputCache.waitingForOutput = false;
          }, 1000); // 1秒后发送，收集多行帮助信息
        }
        return;
      }
    }
    
    // 处理模组列表输出
    if (content === 'modlist' || content.startsWith(': ')) {
      processModListOutput(content);
    }
    
    // 处理"游戏中"命令输出
    if (content === '游戏中' || (content.includes('个玩家已连接') && content.includes('STEAM_'))) {
      processPlayerListOutput(content);
    }
    
    // 处理版本信息输出
    if (content === '版本' || (content.startsWith(': ') && content.includes('泰拉瑞亚服务器') && content.includes('tModLoader'))) {
      processVersionOutput(content);
    }
    
    // 检查是否是聊天消息，处理聊天命令
    if (content.includes('<') && content.includes('>')) {
      // 尝试提取玩家名称和聊天内容
      const chatMatch = content.match(/<(.+)> (.+)/);
      if (chatMatch) {
        const playerName = chatMatch[1].trim();
        const chatContent = chatMatch[2].trim();
        
        // 尝试处理聊天命令
        processChatMessage(playerName, content);
      }
    }
    
    // 检查玩家加入消息
    const joinMatch = content.match(/(.+)已加入。/);
    if (joinMatch && joinMatch[1]) {
      const playerName = joinMatch[1].trim();
      if (!activePlayers.has(playerName)) {
        activePlayers.add(playerName);
        
        // 如果是新玩家，设置默认权限（false）
        if (!userPermissions.has(playerName)) {
          userPermissions.set(playerName, false);
          saveUserPermissions();
        }
        
        updatePlayerCount();
      }
    }
    
    // 检查玩家离开消息
    const leaveMatch = content.match(/(.+)已离开。/);
    if (leaveMatch && leaveMatch[1]) {
      const playerName = leaveMatch[1].trim();
      if (activePlayers.has(playerName)) {
        activePlayers.delete(playerName);
        updatePlayerCount();
      }
    }
  });

  // 启动服务器按钮点击事件
  startServerBtn.addEventListener('click', () => {
    startServerBtn.disabled = true;
    
    // 获取Steam和大厅选项
    const steamSetting = steamOption.value;
    const lobbySetting = steamSetting === 'steam' ? lobbyType.value : null;
    
    // 在控制台和日志中显示启动参数
    console.log('启动参数:', { steam: steamSetting, lobby: lobbySetting });
    addLogEntry(`启动参数: Steam=${steamSetting}, Lobby=${lobbySetting || 'N/A'}`);
    
    fetch('/api/server/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        steam: steamSetting,
        lobby: lobbySetting
      })
    })
    .then(response => response.json())
    .then(data => {
      addLogEntry(data.message);
    })
    .catch(error => {
      console.error('启动服务器失败:', error);
      addLogEntry('启动服务器失败: ' + error.message, true);
      startServerBtn.disabled = false;
    });
  });

  // 停止服务器按钮点击事件
  stopServerBtn.addEventListener('click', () => {
    stopServerBtn.disabled = true;
    
    fetch('/api/server/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        command: '退出'  // 使用中文的退出命令
      })
    })
    .then(response => response.json())
    .then(data => {
      addLogEntry(data.message);
    })
    .catch(error => {
      console.error('停止服务器失败:', error);
      addLogEntry('停止服务器失败: ' + error.message, true);
      stopServerBtn.disabled = false;
    });
  });

  // 清除日志按钮点击事件
  clearLogsBtn.addEventListener('click', () => {
    logContainer.innerHTML = '';
    addLogEntry('日志已清除');
  });

  // 用户管理相关事件监听
  refreshUsersBtn.addEventListener('click', updateUsersList);
  
  userFilter.addEventListener('input', updateUsersList);
  
  // 踢出用户按钮点击事件
  kickUserBtn.addEventListener('click', () => {
    console.log('踢出按钮被点击');
    const username = customCommand.value.trim();
    if (username) {
      console.log(`准备踢出用户: ${username}`);
      kickPlayer(username);
      customCommand.value = '';
    } else {
      alert('请输入要踢出的用户名');
    }
  });
  
  // 封禁用户按钮点击事件
  banUserBtn.addEventListener('click', () => {
    console.log('封禁按钮被点击');
    const username = customCommand.value.trim();
    if (username) {
      console.log(`准备封禁用户: ${username}`);
      banPlayer(username);
      customCommand.value = '';
    } else {
      alert('请输入要封禁的用户名');
    }
  });

  // 配置文件相关功能
  
  // 切换配置面板
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
  
  // 加载配置文件
  loadConfigBtn.addEventListener('click', () => {
    loadConfigFile();
  });
  
  // 保存配置文件
  saveConfigBtn.addEventListener('click', () => {
    if (advancedConfigPanel.style.display === 'block') {
      // 高级模式 - 直接保存文本内容
      saveConfigFile(configFileContent.value);
    } else {
      // 基本模式 - 从表单生成配置内容
      const configContent = updateConfigFileFromForm();
      saveConfigFile(configContent);
    }
  });
  
  // 表单字段变更时更新配置
  const formFields = [worldFile, maxPlayers, serverPort, serverPassword, modpack, motd, language];
  formFields.forEach(field => {
    field.addEventListener('change', () => {
      if (basicConfigPanel.style.display === 'block') {
        updateConfigFileFromForm();
      }
    });
  });
  
  // 初始加载配置文件
  loadConfigFile().then(() => {
    // 加载配置后更新世界名称
    updateWorldName();
  });
  
  // 获取模组列表
  function fetchModsList() {
    if (!serverRunning) {
      console.log('服务器未运行，无法获取模组列表');
      return;
    }
    
    sendServerCommand('modlist')
      .then(() => {
        addLogEntry('已请求模组列表');
      })
      .catch(error => {
        console.error('获取模组列表失败:', error);
      });
  }
  
  // 获取版本信息
  function fetchVersionInfo() {
    if (!serverRunning) {
      console.log('服务器未运行，无法获取版本信息');
      return;
    }
    
    sendServerCommand('版本')
      .then(() => {
        console.log('已请求版本信息');
        // 版本信息会通过日志回传，由socket.on('server-log')解析
      })
      .catch(error => {
        console.error('获取版本信息失败:', error);
      });
  }
  
  // 检测并处理聊天命令
  function processChatMessage(playerName, message) {
    // 检查是否是聊天消息
    const chatMatch = message.match(/<(.+)> (.+)/);
    if (!chatMatch) return false;
    
    const chatPlayerName = chatMatch[1].trim();
    const chatContent = chatMatch[2].trim();
    
    // 玩家名称不匹配，不处理
    if (chatPlayerName !== playerName) return false;
    
    // 检查玩家是否有权限执行聊天命令
    if (!userPermissions.get(playerName)) {
      console.log(`玩家 ${playerName} 没有聊天命令权限，忽略命令: ${chatContent}`);
      return false;
    }
    
    // 检查是否是支持的命令
    const command = CHAT_COMMANDS[chatContent];
    if (!command) return false;
    
    console.log(`玩家 ${playerName} 通过聊天执行命令: ${chatContent} -> ${command.command}`);
    
    // 如果命令有响应，设置缓存为等待状态
    if (command.hasResponse) {
      commandOutputCache = {
        command: chatContent,
        waitingForOutput: true,
        output: '',
        timestamp: Date.now(),
        playerName: playerName  // 保存发送命令的玩家名称
      };
    }
    
    // 执行命令
    sendServerCommand(command.command)
      .then(response => {
        console.log(`命令执行成功: ${command.command}`);
        
        // 无响应的命令直接结束
        if (!command.hasResponse) {
          return;
        }
        
        // 响应命令在socket.on('server-log')中处理
        // 设置超时，如果5秒内没有收到输出，发送默认消息
        setTimeout(() => {
          if (commandOutputCache.waitingForOutput && 
              commandOutputCache.command === chatContent) {
            console.log(`命令 ${chatContent} 输出超时，发送默认消息`);
            sendServerCommand(`说 @${playerName}: 已执行命令 ${chatContent}，但未获取到输出`)
              .catch(e => console.error('发送默认消息失败:', e));
            
            // 重置缓存
            commandOutputCache.waitingForOutput = false;
          }
        }, 5000);
      })
      .catch(error => {
        console.error(`执行命令失败: ${command.command}`, error);
        
        // 发送错误消息
        sendServerCommand(`说 @${playerName}: 执行命令 ${chatContent} 失败: ${error.message}`)
          .catch(e => console.error('发送错误消息失败:', e));
        
        // 重置缓存
        if (command.hasResponse) {
          commandOutputCache.waitingForOutput = false;
        }
      });
    
    return true;
  }
  
  // 切换用户聊天命令权限
  function toggleUserCommandPermission(username) {
    const currentPermission = userPermissions.get(username) || false;
    userPermissions.set(username, !currentPermission);
    
    console.log(`已${!currentPermission ? '授予' : '撤销'} ${username} 的聊天命令权限`);
    
    // 更新用户列表显示
    updateUsersList();
    
    // 保存权限到localStorage
    saveUserPermissions();
    
    return !currentPermission;
  }
  
  // 保存用户权限到localStorage
  function saveUserPermissions() {
    const permissionsObj = {};
    userPermissions.forEach((value, key) => {
      permissionsObj[key] = value;
    });
    
    localStorage.setItem('userCommandPermissions', JSON.stringify(permissionsObj));
  }
  
  // 更新模组显示
  function updateModsDisplay() {
    if (activeModsList.length === 0) {
      modsList.textContent = '未加载';
      return;
    }
    
    // 清空当前内容
    modsList.innerHTML = '';
    
    // 添加模组数量
    const modCount = document.createElement('span');
    modCount.className = 'mod-count';
    modCount.textContent = `${activeModsList.length} 个模组`;
    modsList.appendChild(modCount);
    
    // 创建模组列表元素
    const modListElement = document.createElement('div');
    modListElement.className = 'mod-list';
    
    // 添加每个模组
    activeModsList.forEach(mod => {
      const modItem = document.createElement('span');
      modItem.className = 'mod-item';
      modItem.textContent = mod;
      modListElement.appendChild(modItem);
    });
    
    modsList.appendChild(modListElement);
  }
  
  // 踢出玩家
  function kickPlayer(username) {
    if (!serverRunning) {
      alert('服务器未运行，无法执行此操作');
      return;
    }
    
    if (confirm(`确定要踢出玩家 "${username}" 吗？`)) {
      console.log(`尝试踢出玩家: ${username}`);
      sendServerCommand(`kick ${username}`)
        .then(response => {
          console.log('踢出命令响应:', response);
          addLogEntry(`已发送踢出命令: ${username}`);
        })
        .catch(error => {
          console.error('踢出玩家失败:', error);
          addLogEntry(`踢出玩家失败: ${error.message}`, true);
        });
    }
  }
  
  // 封禁玩家
  function banPlayer(username) {
    if (!serverRunning) {
      alert('服务器未运行，无法执行此操作');
      return;
    }
    
    if (confirm(`确定要封禁玩家 "${username}" 吗？封禁后需要手动编辑banlist.txt文件解除封禁。`)) {
      console.log(`尝试封禁玩家: ${username}`);
      sendServerCommand(`ban ${username}`)
        .then(response => {
          console.log('封禁命令响应:', response);
          addLogEntry(`已发送封禁命令: ${username}`);
        })
        .catch(error => {
          console.error('封禁玩家失败:', error);
          addLogEntry(`封禁玩家失败: ${error.message}`, true);
        });
    }
  }
  
  // 开始定期验证玩家列表
  function startPlayerListVerification() {
    // 先清除可能存在的定时器
    if (playerVerificationTimer) {
      clearInterval(playerVerificationTimer);
    }
    
    // 创建新的定时器，每60秒验证一次
    playerVerificationTimer = setInterval(() => {
      if (serverRunning) {
        verifyPlayerList();
      } else {
        stopPlayerListVerification();
      }
    }, 60000); // 每60秒验证一次
  }
  
  // 停止验证玩家列表
  function stopPlayerListVerification() {
    if (playerVerificationTimer) {
      clearInterval(playerVerificationTimer);
      playerVerificationTimer = null;
    }
  }
  
  // 验证玩家列表
  function verifyPlayerList() {
    sendServerCommand('游戏中')
      .then(() => {
        console.log('已发送玩家列表验证命令');
      })
      .catch(error => {
        console.error('验证玩家列表失败:', error);
      });
  }
  
  // 处理模组列表输出
  function processModListOutput(content) {
    console.log('处理模组输出:', content);
    
    // 忽略"modlist"命令本身
    if (content === 'modlist') {
      // 收到modlist命令，清空现有模组列表，准备接收新的列表
      activeModsList = [];
      return;
    }
    
    // 处理以": "开头的行，这通常是模组名
    if (content.startsWith(': ')) {
      // 去掉开头的": "并分割多个模组名
      const line = content.substring(2).trim();
      const modNames = line.split(/\s+(?=[A-Z])/);
      
      console.log('分割后的模组名:', modNames);
      
      modNames.forEach(modName => {
        const trimmedName = modName.trim();
        if (trimmedName && !activeModsList.includes(trimmedName)) {
          activeModsList.push(trimmedName);
        }
      });
      
      updateModsDisplay();
    }
  }
  
  // 处理版本信息输出
  function processVersionOutput(content) {
    console.log('处理版本信息输出:', content);
    
    // 忽略"版本"命令本身
    if (content === '版本') {
      return;
    }
    
    // 处理以": "开头的版本信息行
    if (content.startsWith(': ') && content.includes('泰拉瑞亚服务器') && content.includes('tModLoader')) {
      const versionInfo = content.substring(2).trim();
      serverVersion.textContent = versionInfo;
      console.log('已更新版本信息:', versionInfo);
    }
  }
  
  // 处理"游戏中"命令的输出
  function processPlayerListOutput(content) {
    // 忽略命令本身
    if (content === '游戏中') return;
    
    // 检查是否是玩家列表信息
    if (content.includes('STEAM_')) {
      // 提取玩家名
      const playerMatch = content.match(/: (.+) \(STEAM_/);
      if (playerMatch && playerMatch[1]) {
        const playerName = playerMatch[1].trim();
        if (!activePlayers.has(playerName)) {
          activePlayers.add(playerName);
          updatePlayerCount();
        }
      }
    }
    
    // 检查是否是总结信息（"X个玩家已连接"）
    const totalPlayersMatch = content.match(/(\d+)个玩家已连接/);
    if (totalPlayersMatch && totalPlayersMatch[1]) {
      const totalPlayers = parseInt(totalPlayersMatch[1], 10);
      // 如果有差异，可能需要重新获取完整列表
      if (totalPlayers !== activePlayers.size) {
        console.log(`玩家数量不匹配：界面显示${activePlayers.size}，服务器报告${totalPlayers}`);
      }
    }
  }
  
  // 更新玩家数量显示
  function updatePlayerCount() {
    playerCount.textContent = activePlayers.size;
    updateUsersList();
  }
  
  // 更新用户列表显示
  function updateUsersList() {
    // 清空现有列表
    usersList.innerHTML = '';
    
    // 获取过滤文本
    const filterText = userFilter ? userFilter.value.toLowerCase() : '';
    
    // 筛选玩家
    const filteredPlayers = Array.from(activePlayers).filter(player => 
      player.toLowerCase().includes(filterText)
    );
    
    // 显示或隐藏"无用户"消息
    if (noUsersMessage) {
      if (filteredPlayers.length === 0) {
        noUsersMessage.style.display = 'block';
      } else {
        noUsersMessage.style.display = 'none';
        
        // 添加玩家到列表
        filteredPlayers.forEach(player => {
          const row = document.createElement('tr');
          
          // 用户名列
          const nameCell = document.createElement('td');
          nameCell.textContent = player;
          row.appendChild(nameCell);
          
          // 聊天命令权限列
          const permissionCell = document.createElement('td');
          const permissionSwitch = document.createElement('div');
          permissionSwitch.className = 'permission-switch';
          
          const hasPermission = userPermissions.get(player) || false;
          
          // 创建开关
          const switchLabel = document.createElement('label');
          switchLabel.className = 'switch';
          
          const switchInput = document.createElement('input');
          switchInput.type = 'checkbox';
          switchInput.checked = hasPermission;
          switchInput.addEventListener('change', () => {
            toggleUserCommandPermission(player);
          });
          
          const switchSlider = document.createElement('span');
          switchSlider.className = 'slider';
          
          switchLabel.appendChild(switchInput);
          switchLabel.appendChild(switchSlider);
          
          // 创建状态文本
          const statusText = document.createElement('span');
          statusText.className = hasPermission ? 'status-enabled' : 'status-disabled';
          statusText.textContent = hasPermission ? '已启用' : '已禁用';
          
          permissionSwitch.appendChild(switchLabel);
          permissionSwitch.appendChild(statusText);
          permissionCell.appendChild(permissionSwitch);
          row.appendChild(permissionCell);
          
          // 操作列
          const actionCell = document.createElement('td');
          const actionDiv = document.createElement('div');
          actionDiv.className = 'user-actions';
          
          // 踢出按钮
          const kickBtn = document.createElement('button');
          kickBtn.className = 'btn btn-warning btn-icon';
          kickBtn.textContent = '踢出';
          kickBtn.addEventListener('click', () => kickPlayer(player));
          actionDiv.appendChild(kickBtn);
          
          // 封禁按钮
          const banBtn = document.createElement('button');
          banBtn.className = 'btn btn-danger btn-icon';
          banBtn.textContent = '封禁';
          banBtn.addEventListener('click', () => banPlayer(player));
          actionDiv.appendChild(banBtn);
          
          actionCell.appendChild(actionDiv);
          row.appendChild(actionCell);
          
          usersList.appendChild(row);
        });
      }
    }
  }
  
  // 从世界文件路径提取并更新地图名称
  function updateWorldName() {
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
  
  // 更新服务器状态UI
  function updateServerStatus(running) {
    serverRunning = running; // 保存服务器状态
    
    if (running) {
      serverStatusSpan.textContent = '运行中';
      serverStatusSpan.style.color = '#28a745';
      startServerBtn.disabled = true;
      stopServerBtn.disabled = false;
    } else {
      serverStatusSpan.textContent = '未运行';
      serverStatusSpan.style.color = '#dc3545';
      startServerBtn.disabled = false;
      stopServerBtn.disabled = true;
    }
  }

  // 添加日志条目
  function addLogEntry(content, isError = false, time = null) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    if (isError) {
      logEntry.classList.add('log-error');
    }

    const timestamp = time || new Date().toISOString();
    const formattedTime = new Date(timestamp).toLocaleTimeString();
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${formattedTime}]`;
    
    logEntry.appendChild(timeSpan);
    logEntry.appendChild(document.createTextNode(' ' + content));
    
    logContainer.appendChild(logEntry);
    // 自动滚动到底部
    logContainer.scrollTop = logContainer.scrollHeight;
  }
  
  // 发送服务器命令
  function sendServerCommand(command) {
    console.log(`准备发送命令到服务器: ${command}`);
    
    return fetch('/api/server/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command })
    })
    .then(response => {
      console.log('收到服务器响应:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('命令执行结果:', data);
      if (!data.success) {
        throw new Error(data.message);
      }
      return data;
    })
    .catch(error => {
      console.error('命令执行出错:', error);
      throw error;
    });
  }
  
  // 加载配置文件
  function loadConfigFile() {
    return new Promise((resolve, reject) => {
      fetch('/api/server/config')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // 设置配置文件内容
            configFileContent.value = data.content;
            
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
    if (config.world) worldFile.value = config.world;
    if (config.maxplayers) maxPlayers.value = config.maxplayers;
    if (config.port) serverPort.value = config.port;
    if (config.password) serverPassword.value = config.password;
    if (config.modpack) modpack.value = config.modpack;
    if (config.motd) motd.value = config.motd;
    if (config.language) language.value = config.language;
  }
  
  // 从表单更新配置文件
  function updateConfigFileFromForm() {
    // 获取原始内容
    const content = configFileContent.value;
    const lines = content.split('\n');
    const updatedLines = [];
    
    // 需要更新的配置项及其值
    const updates = {
      'world': worldFile.value || '',
      'maxplayers': maxPlayers.value || '',
      'port': serverPort.value || '',
      'password': serverPassword.value || '',
      'modpack': modpack.value || '',
      'motd': motd.value || '',
      'language': language.value || ''
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
});