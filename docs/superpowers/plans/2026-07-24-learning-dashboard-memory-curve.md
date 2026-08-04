# 首页学习计划与动态记忆曲线实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** 修复首页布局，提供可手动输入的学习计划，并以真实学习和复习记录驱动艾宾浩斯记忆曲线及所有相关进度。

**Architecture:** 保留现有 Vue 3 组合式 store，以向后兼容迁移补充逐日学习记录；将记忆保持率计算拆成无 UI 依赖的领域函数，再由复用 Canvas 组件呈现。页面只消费响应式派生数据，导航使用统一安全返回方法。

**Tech Stack:** Vue 3、TypeScript、Vue Router、Pinia 风格组合式 store、Tailwind CSS、Canvas 2D、Node test、Playwright、ADB/Chrome DevTools。

---

### Task 1: 建立失败测试

**Files:**
- Create: `tests/learning-plan.test.mjs`
- Create: `tests/memory-curve.test.mjs`
- Modify: `tests/e2e/learning-flow.spec.ts`

1. 为学习目标 1–200、旧计划迁移、每日去重记录和新学自动排期编写测试。
2. 为记忆曲线空状态、节点数量、随时间衰减和复习等级改善曲线编写测试。
3. 为首页无负边距、手动目标输入、计划同步和真实曲线更新编写端到端断言。
4. 运行测试并确认因功能尚未实现而失败。

### Task 2: 统一学习计划数据

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/stores/app.ts`
- Create: `src/domain/studyPlan.ts`

1. 增加 `dailyLearned`，加载旧数据时安全迁移。
2. 将目标范围改为 1–200，并统一合法化逻辑。
3. `markLearned` 同时更新累计学习、当日学习、日历、连续天数和复习排期。
4. 暴露今日、最近七天和目标进度的响应式数据。
5. 运行领域和 store 测试。

### Task 3: 实现动态记忆曲线

**Files:**
- Create: `src/domain/memoryCurve.ts`
- Create: `src/components/review/MemoryCurveChart.vue`
- Modify: `src/views/review/ReviewView.vue`
- Modify: `src/views/review/ReviewCenterView.vue`

1. 实现纯函数保持率和聚合曲线。
2. 用响应式计算向 Canvas 组件传入曲线点。
3. 将两处静态曲线替换为复用组件，并提供空状态。
4. 将掌握度、待复习和总复习数据改成响应式真实统计。
5. 修复“详情”和“深度复习”等无动作按钮。

### Task 4: 修复首页和计划编辑

**Files:**
- Modify: `src/views/HomeView.vue`
- Modify: `src/views/study/PlanView.vue`

1. 移除首页负边距并建立稳定的区块间距。
2. 首页增加可直接输入并保存的学习目标。
3. 计划页增加数字输入，保留快捷按钮。
4. 周热力图改用真实逐日学习数据。
5. 挑战进度改用当天答题历史。

### Task 5: 统一返回和跳转

**Files:**
- Create: `src/composables/useSafeBack.ts`
- Modify: `src/views/study/PlanView.vue`
- Modify: `src/views/review/ReviewCenterView.vue`
- Modify: `src/views/quiz/QuizPlay.vue`
- Modify: related routes discovered during QA

1. 实现带模块兜底地址的应用内返回。
2. 替换核心深层页面的直接 `router.back()`。
3. 验证空待复习、直接访问和正常来源访问三种情况。

### Task 6: 全路径验证

**Files:**
- Modify: `tests/visual/capture-learning-flow-audit.mjs`
- Create: `tests/visual/capture-learning-flow-after.mjs`
- Create: `docs/audit/2026-07-24-learning-flow-after/*`

1. 运行单元测试、Vue 编译、类型检查和生产构建。
2. 桌面端逐项点击首页、计划、学习、挑战、词典、复习、个人中心及返回。
3. 对前后截图进行同尺寸视觉比对并修复问题。
4. 在已连接 vivo Android 手机上验证首页、手动计划、挑战、复习和返回。
5. 记录控制台错误、失败请求和最终审计结论。
