const config = require("../config/index");

function apiUrl(path) {
  const base = String(config.apiBaseUrl || "").replace(/\/$/, "");
  if (!base) throw new Error("小程序 API 地址尚未配置");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync("pusy_member_token_v1");
    wx.request({
      url: apiUrl(path),
      method: options.method || "GET",
      data: options.data,
      timeout: options.timeout || config.requestTimeout,
      header: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }
        const message = response.data && response.data.error
          ? response.data.error
          : `请求失败（${response.statusCode}）`;
        const error = new Error(message);
        error.statusCode = response.statusCode;
        reject(error);
      },
      fail(error) {
        reject(new Error(error.errMsg || "暂时无法连接商城服务"));
      },
    });
  });
}

module.exports = { apiUrl, request };
