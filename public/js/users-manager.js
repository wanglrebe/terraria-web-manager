// users-manager.js - 处理用户管理功能
import { sendServerCommand } from './server-controller.js';
import { addLogEntry } from './logs-manager.js';
import { showConfirmDialog, updatePlayerCount } from './ui-controller.js';
import { kickPlayer as kickPlayerCommand, banPlayer as banPlayerCommand, listPlayers } from './server-commands.js';

// 活跃玩家集合
let activePlayers = new Set();

// 用户权限映射 (用户名 -> 是否有聊天命令权限)
let userPermissions = new Map();

// 验证玩家列表的定时器
let playerVerificationTimer = null;

// 设置用户管理功能
function setupUsersManager() {
  const refreshUsersBtn = document.getElementById('refreshUsers');
  const userFilter = document.getElementById('userFilter');
  const kickUserBtn = document.getElementById('kickUser');
  const banUserBtn = document.getElementById('banUser');
  const customCommand = document.getElementById('customCommand');
  
  // 从localStorage加载用户权限
  loadUserPermissions();
  
  // 设置用户列表刷新按钮
  if (refreshUsersBtn) {
    refreshUsersBtn.addEventListener('click', () => {
      console.log('手动刷新用户列表');
      verifyPlayerList();
    });
  }
  
  // 用户过滤功能
  if (userFilter) {
    userFilter.addEventListener('input', () => {
      updateUsersList();
    });
  }
  
  // 踢出用户按钮点击事件
  if (kickUserBtn && customCommand) {
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
  }
  
  // 封禁用户按钮点击事件
  if (banUserBtn && customCommand) {
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
  }
  
  // 监听玩家加入事件
  document.addEventListener('playerJoin', (event) => {
    const playerName = event.detail.playerName;
    if (!activePlayers.has(playerName)) {
      activePlayers.add(playerName);
      
      // 如果是新玩家，设置默认权限（false）
      if (!userPermissions.has(playerName)) {
        userPermissions.set(playerName, false);
        saveUserPermissions();
      }
      
      updateUsersList();
      updatePlayerCount(activePlayers.size);
    }
  });
  
  // 监听玩家离开事件
  document.addEventListener('playerLeave', (event) => {
    const playerName = event.detail.playerName;
    if (activePlayers.has(playerName)) {
      activePlayers.delete(playerName);
      updateUsersList();
      updatePlayerCount(activePlayers.size);
    }
  });
  
  console.log('用户管理功能已设置');
}

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

// 保存用户权限到localStorage
function saveUserPermissions() {
  const permissionsObj = {};
  userPermissions.forEach((value, key) => {
    permissionsObj[key] = value;
  });
  
  localStorage.setItem('userCommandPermissions', JSON.stringify(permissionsObj));
}

// 踢出玩家
function kickPlayer(username) {
  if (showConfirmDialog(`确定要踢出玩家 "${username}" 吗？`)) {
    console.log(`尝试踢出玩家: ${username}`);
    kickPlayerCommand(username)
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
  if (showConfirmDialog(`确定要封禁玩家 "${username}" 吗？封禁后需要手动编辑banlist.txt文件解除封禁。`)) {
    console.log(`尝试封禁玩家: ${username}`);
    banPlayerCommand(username)
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

// 更新用户列表显示
function updateUsersList() {
  const usersList = document.getElementById('usersList');
  const noUsersMessage = document.getElementById('noUsersMessage');
  const userFilter = document.getElementById('userFilter');
  
  if (!usersList) return;
  
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

// 开始定期验证玩家列表
function startPlayerListVerification() {
  // 先清除可能存在的定时器
  if (playerVerificationTimer) {
    clearInterval(playerVerificationTimer);
  }
  
  // 创建新的定时器，每60秒验证一次
  playerVerificationTimer = setInterval(() => {
    verifyPlayerList();
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
  listPlayers()
    .then(() => {
      console.log('已发送玩家列表验证命令');
    })
    .catch(error => {
      console.error('验证玩家列表失败:', error);
    });
}

// 获取当前在线玩家数量
function getPlayerCount() {
  return activePlayers.size;
}

// 检查玩家是否有命令权限
function hasCommandPermission(playerName) {
  return userPermissions.get(playerName) || false;
}

// 导出函数
export {
  setupUsersManager,
  updateUsersList,
  kickPlayer,
  banPlayer,
  startPlayerListVerification,
  stopPlayerListVerification,
  verifyPlayerList,
  toggleUserCommandPermission,
  hasCommandPermission,
  getPlayerCount,
  activePlayers
};