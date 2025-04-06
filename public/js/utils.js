// utils.js - 通用工具函数

/**
 * 格式化日期时间为本地字符串
 * @param {Date|string} date - 日期对象或ISO日期字符串
 * @returns {string} 格式化后的日期时间字符串
 */
function formatDateTime(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString();
  }
  
  /**
   * 格式化日期为本地字符串
   * @param {Date|string} date - 日期对象或ISO日期字符串
   * @returns {string} 格式化后的日期字符串
   */
  function formatDate(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }
  
  /**
   * 格式化时间为本地字符串
   * @param {Date|string} date - 日期对象或ISO日期字符串
   * @returns {string} 格式化后的时间字符串
   */
  function formatTime(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString();
  }
  
  /**
   * 延迟执行函数（Promise形式）
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise} 延迟Promise
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 节流函数 - 限制函数调用频率
   * @param {Function} func - 要执行的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 节流后的函数
   */
  function throttle(func, wait) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= wait) {
        lastCall = now;
        return func.apply(this, args);
      }
    };
  }
  
  /**
   * 防抖函数 - 延迟执行函数，直到停止调用一段时间后才执行
   * @param {Function} func - 要执行的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
  
  /**
   * 从数组中移除指定元素
   * @param {Array} array - 目标数组
   * @param {*} element - 要移除的元素
   * @returns {boolean} 是否成功移除
   */
  function removeFromArray(array, element) {
    const index = array.indexOf(element);
    if (index !== -1) {
      array.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * 安全解析JSON
   * @param {string} str - JSON字符串
   * @param {*} defaultValue - 解析失败时返回的默认值
   * @returns {*} 解析结果或默认值
   */
  function safeParseJSON(str, defaultValue = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('JSON解析失败:', e);
      return defaultValue;
    }
  }
  
  /**
   * 生成随机ID
   * @param {number} length - ID长度
   * @returns {string} 随机ID
   */
  function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * 下载字符串内容为文件
   * @param {string} content - 文件内容
   * @param {string} filename - 文件名
   * @param {string} contentType - 内容类型
   */
  function downloadAsFile(content, filename, contentType = 'text/plain') {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // 导出工具函数
  export {
    formatDateTime,
    formatDate,
    formatTime,
    delay,
    throttle,
    debounce,
    removeFromArray,
    safeParseJSON,
    generateId,
    downloadAsFile
  };