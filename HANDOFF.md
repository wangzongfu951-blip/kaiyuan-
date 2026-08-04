# 昭途考公词语学习系统

## 项目位置

- 前端：`D:\kg\src`
- 后端：`D:\kg\backend`
- 现有词库迁移源：`D:\kg\backend\data\idioms.db`
- 产品与技术规格：`D:\kg\docs\superpowers\specs`
- 实施计划：`D:\kg\docs\superpowers\plans`

## 产品范围

系统只覆盖成语与实词，不包含古诗词。核心能力包括：

- 成语、实词搜索与可信详情；
- 近义、反义和易混词辨析；
- 经过人工审核的官媒原文引用与定位；
- 艾宾浩斯记忆学习与复习；
- 手机号、微信登录和跨设备同步；
- 真题、错题、收藏、费曼学习、学习计划、周报和 AI 助手；
- 手机优先、平板自适应的全中文界面。

## 技术栈

- 前端：Vue 3、TypeScript、Vite、Vue Router、Tailwind CSS；
- 后端：Node.js、Express；
- 正式数据库：PostgreSQL；
- 短期状态和任务队列：Redis；
- 现有 SQLite 仅作为迁移输入和对照；
- AI：智谱 API，仅用于学习助手和待审核内容草稿。

## 本地命令

```powershell
# 前端
npm.cmd run dev

# 后端
npm.cmd run dev --prefix backend

# 类型检查
npx.cmd vue-tsc --noEmit

# 生产构建
npm.cmd run build

# 后端测试
npm.cmd test --prefix backend
```

## 外部服务配置

智谱、短信和微信密钥不得写入文档或仓库。复制
`backend/.env.example` 为 `backend/.env`，再通过本地安全渠道填写。

历史智谱密钥已在旧交接文档中暴露，必须在服务商控制台撤销并重新生成。

手机号验证码真实发送需要短信服务商账号与已审核模板。微信登录需要已认证的微信开放平台或公众号资质、回调域名和密钥。开发环境使用模拟服务，生产环境必须配置真实资质。

