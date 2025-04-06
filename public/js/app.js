// app.js - 主应用入口文件
import { initTabs } from './ui-controller.js';
import { setupServerControls, setupPaths, checkServerStatus } from './server-controller.js';
import { setupConfigManager } from './config-manager.js';
import { setupLogsManager } from './logs-manager.js';
import { setupUsersManager } from './users-manager.js';
import { setupScheduler } from './scheduler.js';
import { setupGithubManager } from './github-manager.js'; // 新添加的导入
import { socket } from './socket-client.js';
import { fetchModsList, fetchVersionInfo } from './server-info.js';

// 主应用初始化函数
function initApp() {
  console.log('初始化泰拉瑞亚服务器管理面板...');
  
  // 初始化各个模块
  initTabs();
  setupServerControls();
  setupPaths();
  setupConfigManager();
  setupLogsManager();
  setupUsersManager();
  setupScheduler();
  setupGithubManager(); // 新添加的初始化

  
  // 设置信息点击事件
  setupInfoClickEvents();
  
  // 获取初始服务器状态
  checkServerStatus();
  
  console.log('应用初始化完成');
}

// 当页面DOM加载完成后执行初始化
document.addEventListener('DOMContentLoaded', initApp);

// 设置模组和版本信息点击事件
function setupInfoClickEvents() {
  const modsInfo = document.getElementById('modsInfo');
  const versionInfo = document.getElementById('versionInfo');
  
  // 添加刷新模组点击事件
  if (modsInfo) {
    modsInfo.addEventListener('click', () => {
      console.log('点击刷新模组列表');
      fetchModsList();
    });
  }
  
  // 添加版本信息点击事件
  if (versionInfo) {
    versionInfo.addEventListener('click', () => {
      console.log('点击获取版本信息');
      fetchVersionInfo();
    });
  }
}

// 导出公共变量和函数供其他模块使用
export { socket };