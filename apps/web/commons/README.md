# commons — 通用模块

> 归属：`apps/web/commons/` 与 `apps/web/modules/` **同级**，存放**通用模块**。

## 是什么
- `commons/<mod>/` 是**通用模块**：由 `modules/<cat>/<mod>/` 下的业务模块**提升（promote）上来**的可复用单元。
- 定位为**叶子层**：纯技术、**无自有菜单、不受合同闸门、不反调业务模块**（业务模块可依赖 commons，commons 不反向依赖业务模块）。
- 与 `packages/*` 的区别：`packages/*` 是项目级共享基础设施（跨 app），`commons/` 是 `apps/web` 内由业务沉淀出的通用模块。新增共享能力先判断该沉淀到哪一层（见 `.claude/docs/capability-ownership.md`）。

## 提升（promote）何时发生
- 某段逻辑/能力被**多处业务模块复用**，或属于可下沉的纯技术能力时，从 `modules/` 提升到 `commons/`。
- 提升属于结构调整，需操作员授权后进行；`/logic-analyze` 只标「上提候选」，不擅自搬。

## overview.md
- 每个 `commons/<mod>/` 维护一份 `overview.md`（commons 模板见 `.claude/docs/module-overview.md`），供 `/logic-analyze` 做全局认识。**只读消费**，写入由专门的维护 skill 负责（建设中）。

> 目录当前为空（占位）。第一个通用模块提升上来后，删除本说明的"占位"措辞即可。
