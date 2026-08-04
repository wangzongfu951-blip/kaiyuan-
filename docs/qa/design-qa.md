# 昭途移动端认证界面设计 QA

## 结论

最终结果：passed

- P0：0
- P1：0
- P2：0
- 账号密码登录、手机号登录、微信登录入口均可操作。
- 新账号注册强制选择手机号或邮箱，并在验证码通过后建立账号会话。
- 登录成功后页面回到顶部，未发现内容裁切、横向滚动或安全区遮挡。

## 设计依据

- 视觉方向源文件：`.superpowers/brainstorm/ui-20260724-112752/content/visual-style.html`
- 用户选定方向：方案 B，蓝紫智能学习风格
- 最终背景资产：`public/assets/auth-liquid-glass-bg.png`
- 背景迭代：深色科技 → 浅色 → 液态玻璃 → 按用户反馈收敛为极简浅灰白、仅边缘轻微玻璃折射

## 桌面浏览器检查

- 浏览器：Microsoft Edge（Chromium）
- 登录页视口：390 × 844，设备像素比 1
- 方向稿尺寸：242 × 443
- 对照画板：1200 × 1030
- 登录页截图：`docs/qa/implementation-login-390x844.png`
- 注册页截图：`docs/qa/implementation-register-390x844.png`
- 登录卡片截图：`docs/qa/implementation-login-card.png`
- 并排对照：`docs/qa/login-design-comparison.png`
- 控制台：无未预期错误；访客态 `/me` 401 为认证探测的预期响应

## 实体安卓手机检查

- 设备：vivo V2405A
- 物理分辨率：1260 × 2800
- 屏幕密度：560 dpi
- 连接方式：USB Type-C + ADB
- 访问方式：ADB reverse 到本地 Vite 与认证后端
- 登录前截图：`docs/qa/physical-account-login.png`
- 登录后截图：`docs/qa/physical-account-authenticated.png`
- 真实测试结果：账号登录 HTTP 200，用户 `test_study`，登录后路由为 `/`
- 会话验证：`/api/v1/auth/me` 返回当前测试用户；会话由 HttpOnly Cookie 保持
- 交互检查：一键填入、密码遮罩、登录按钮、页面跳转、底部导航和顶部滚动位置通过

## 已修复问题

1. 小屏键盘弹出后登录按钮可能被页面固定高度裁切：登录页改为纵向可滚动，并为低高度设备增加顶部对齐。
2. Vite 同时存在旧 `vite.config.js` 时未加载 TypeScript 代理配置：开发、构建、预览脚本均显式指定 `vite.config.ts`。
3. 手机登录后路由已切换但截图仍可能处在原滚动位置：登录完成后显式滚动到页面顶部，并在实体手机脚本中等待首页完成渲染后验证。
4. 实体手机自动化脚本未主动结束 CDP 连接导致超时：完成验证后显式退出，复测通过。

## 自动化结果

- 后端：46 项通过
- 前端结构：6 项通过
- Playwright 移动端流程：3 项通过
  - 手机号验证码登录
  - 开发测试账号登录
  - 绑定邮箱的新账号注册
- TypeScript：`vue-tsc --noEmit` 通过
- 生产构建：Vite build 通过
