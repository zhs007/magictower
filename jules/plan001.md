# 计划 001: 项目初始化与环境搭建

## 目标

建立项目的基础结构，安装必要的依赖，并配置好开发、构建和测试环境。这是所有后续开发工作的前提。

## 主要任务

1.  **初始化项目**:
    - 创建项目根目录。
    - 使用 `npm init -y` (或 `yarn init -y`) 生成 `package.json` 文件。

2.  **安装核心依赖**:
    - `pixi.js`: 游戏的核心渲染引擎。
    - `typescript`: 项目开发语言。
    - `@types/node`: Node.js 的类型定义。

3.  **安装开发依赖**:
    - `vite`: 用于开发的轻量级、快速的构建工具。
    - `vitest`: 用于单元测试的测试框架（与 Vite 集成良好）。
    - `@pixi/testing`: 用于测试 Pixi.js 相关代码。
    - `eslint` 和 `prettier`: 用于代码规范和格式化。
    - 相关的 ESLint 插件（如 `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`）。

4.  **配置 TypeScript**:
    - 创建 `tsconfig.json` 文件。
    - 配置编译选项，例如：
        - `target`: "ESNext"
        - `module`: "ESNext"
        - `strict`: true
        - `moduleResolution`: "node"
        - `esModuleInterop`: true
        - `skipLibCheck`: true

5.  **配置 Vite**:
    - 创建 `vite.config.ts` 文件。
    - 配置基本的开发服务器和构建选项。
    - 设置资源目录别名，如 `@/` 指向 `src/`。

6.  **创建目录结构**:
    - 根据 `jules.md` 中定义的结构，创建所有必要的初始目录：
        - `assets/` (及子目录 `item`, `map`, `monster`)
        - `gamedata/`
        - `mapdata/`
        - `public/`
        - `src/` (及子目录 `core`, `data`, `renderer`, `scenes`)

7.  **创建入口文件**:
    - 创建 `index.html`，作为应用的 HTML 根页面，并包含一个 `<canvas>` 元素。
    - 创建 `src/main.ts`，作为 TypeScript 应用的入口点，在这里初始化 Pixi.js 应用。

## 验收标准

- 项目可以通过 `npm run dev` (或 `yarn dev`) 成功启动一个空白的开发服务器。
- 在浏览器中访问开发服务器地址，可以看到一个由 Pixi.js 渲染的空白画布，没有错误。
- 项目可以通过 `npm run test` (或 `yarn test`) 运行测试命令，即使还没有任何测试用例。
- 目录结构完整且正确。
