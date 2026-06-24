## 变更说明

<!-- 这个 PR 做了什么、为什么 -->

## API Gap 检查

> 见 [`docs/api-gaps.md`](../docs/api-gaps.md)。

- [ ] 新增 UI 是否依赖后端接口？如有，是否在 fallback 边界标了 `API_GAP[BE#xx]` / `API_GAP[untracked]`？
- [ ] 是否有对应 BE issue（或标 `untracked`）？
- [ ] 是否有明确的 fallback 行为？
- [ ] 若接入了真实接口，是否删除了旧 fallback、`API_GAP` 标注，并更新 `docs/api-gaps.md`？

## 自检

- [ ] `tsc` 通过
- [ ] 关键交互手测过（含窄屏 360dp）
