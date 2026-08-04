# 热点词 GitHub Pages 发布说明

## 构建内容

GitHub Actions 每次发布会从 `backend/data/hotspots/hotspot-collocations.sqlite` 导出：

- `public/data/hotspots-image.json`：22 个图片热点词、66 条搭配；
- `public/data/hotspots-full.json`：167 个热点词、667 条完整搭配。

公开页面默认打开图片模板，用户可以切换到完整词库。两种视图都支持搜索、主题筛选、加载更多和点击解释；页面不显示年份或来源编号。公开热点页不依赖 Node 后端，后端接口仅作为本地开发回退。

## 本地验证

```powershell
npm.cmd ci
npm.cmd ci --prefix backend
npm.cmd run hotspots:export --prefix backend -- --output D:\kg\public\data
npm.cmd run hotspots:verify --prefix backend
npm.cmd run build
```

构建完成后，`dist/index.html` 和 `dist/404.html` 都应存在。`404.html` 是 GitHub Pages 的 SPA 刷新回退文件。

## GitHub 设置

1. 将代码推送到 GitHub 仓库的 `main` 分支。
2. 在仓库 Settings → Pages → Build and deployment 中选择 **GitHub Actions**。
3. 工作流 `Deploy hotspot pages` 会自动导出数据、检查计数、构建并发布。
4. 访问 `https://<账号>.github.io/<仓库名>/`，从首页进入“热点搭配”；也可以直接访问 `https://<账号>.github.io/<仓库名>/hotspots`。

如果仓库使用项目 Pages，Vite 会由工作流设置正确的 `VITE_BASE_PATH`。如果仓库名或账号未确认，发布前不能猜测最终 URL。

## 发布边界

本次 Pages 公开的是热点词学习模块。登录、AI、复习同步等需要后端状态的模块仍需本地或服务器端部署，不能在静态 Pages 上伪装成可用服务。
