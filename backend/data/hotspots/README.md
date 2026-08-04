# 本地热点搭配数据源

此目录承载“考公热点词搭配”功能的可运行数据源。`hotspot-collocations.sqlite` 是独立于成语库的只读 SQLite 数据库，避免把时事热点硬塞进 `idioms` 或 `words` 表。

数据快照来自用户先前生成并核验的规范库：

- 167 个热点词；
- 667 条热点词搭配（每行一条搭配）；
- 89 个来源；
- 1,194 条搭配—来源关联。

其中 `manual_image_seeds.json` 固化了图片对应的 22 个核心热点词和 66 条搭配，应用的默认模板优先展示这 22 组；完整库仍可通过不带 `preset=image` 的接口查询。

`merged_hot_terms.json`、`merged_collocations.json`、`merged_sources.json` 是同一批次的可审计 JSON 快照。前端默认只展示图片式搭配短句；来源、年份和审核字段留在数据层，用于检索、追溯和后续更新，不在默认模板中显示。

`qa_report.json` 是该批次的质量快照；其中图片种子产生的 57 条记录仍标记为“待复核”，不会被误称为已完成人工核验。

更新数据时，应同时替换 SQLite 与三份 JSON 快照，然后运行：

```powershell
node backend/scripts/hotspots/verify-local-corpus.mjs
```
