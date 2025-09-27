# ruler-scrollbar

替换原生滚动条为“垂直标尺”的小型库。支持像素模式与归一化模式（默认将整页映射为 0–100），可用于整页或任意可滚动容器，并提供运行时 API 调整刻度、单位与显示。

- 归一化刻度：将总高度映射为 0..N（默认 `100`），更直观显示“百分比”进度
- 像素刻度：按像素绘制刻度，更贴近设计稿对齐
- 整页/容器：既可安装在 `document.body` 上，也可安装到任意可滚动容器
- 运行时调节：可在不销毁实例的情况下动态调整刻度参数
- 自动隐藏原生滚动条（可关闭）
- TypeScript 编写，零依赖

## 安装

```bash
npm i ruler-scrollbar
```

> 使用打包工具（Vite/Webpack/Rspack 等）时：
>
> ```ts
> import { installRulerScrollbar } from 'ruler-scrollbar'
> ```
>
> 在本仓库本地直接打开示例页时（非 npm 安装），可从 `dist/index.mjs` 导入：
>
> ```html
> <script type="module">
>   import { installRulerScrollbar } from './dist/index.mjs'
>   // ...
> </script>
> ```

## 快速上手（整页 0–100）

```html
<!doctype html>
<html>
  <body>
    <div style="height: 200vh">内容……</div>
    <script type="module">
      import { installRulerScrollbar } from './dist/index.mjs'

      installRulerScrollbar(document.body, {
        position: 'right',
        width: 36,
        // 页面加载完成后，将整页总高度映射为 0..100
        fullPageAs100AfterLoad: true,
        // 归一化模式下：每个小格代表的单位数；多少单位出现一次主刻度
        unitsPerMinor: 2,
        majorEveryUnits: 10,
      })
    </script>
  </body>
</html>
```

## 容器内滚动（像素模式）

```html
<div id="box" style="height: 360px; overflow: auto">
  <div style="height: 1200px">容器内很长的内容……</div>
</div>
<script type="module">
  import { installRulerScrollbar } from './dist/index.mjs'
  const box = document.getElementById('box')!
  installRulerScrollbar(box, {
    position: 'right',
    width: 32,
    scaleMode: 'pixel', // 像素刻度
    tickSpacing: 10,
    majorEvery: 10,
  })
</script>
```

## Vue 3 集成

在 Vue 3（Vite）中，建议在 `onMounted` 生命周期内创建实例，并在 `onBeforeUnmount` 中销毁。

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { installRulerScrollbar } from 'ruler-scrollbar'

let ruler: ReturnType<typeof installRulerScrollbar> | null = null

onMounted(() => {
  ruler = installRulerScrollbar(document.body, {
    position: 'right',
    width: 36,
    fullPageAs100AfterLoad: true,
    unitsPerMinor: 2,
    majorEveryUnits: 10,
  })
})

onBeforeUnmount(() => {
  ruler?.destroy()
  ruler = null
})
</script>
```

你也可以使用自定义指令（示例）：

```ts
import { Directive } from 'vue'
import { installRulerScrollbar } from 'ruler-scrollbar'

export const vRuler: Directive<HTMLElement, { fullPage?: boolean; options?: any }> = {
  mounted(el, binding) {
    const { fullPage, options } = binding.value || {}
    const target = fullPage ? document.body : el
    ;(el as any).__ruler = installRulerScrollbar(target, options)
  },
  unmounted(el) {
    ;(el as any).__ruler?.destroy?.()
    delete (el as any).__ruler
  },
}
```

## API

### 创建实例

```ts
installRulerScrollbar(target?: Element | null, options?: RulerOptions): RulerScrollbar
```

- `target`：安装目标。传 `document.body`（或不传）表示整页；传入任意可滚动容器可实现局部标尺。
- 返回值：实例，包含运行时方法与 `destroy()`。

### RulerOptions（配置项）

```ts
interface RulerOptions {
  // 外观与位置
  width?: number;                 // 标尺宽度（CSS px），默认 32
  position?: 'left' | 'right';    // 位置，默认 'right'
  zIndex?: number;                // 默认 10000
  background?: string;            // 背景填充色，默认 'transparent'

  // 颜色/标签
  tickColor?: string;             // 小/主刻度颜色，默认 '#999'
  numberColor?: string;           // 数字颜色，默认 '#666'
  showNumbers?: boolean;          // 是否显示数字，默认 true

  // 原生滚动条
  hideNative?: boolean;           // 是否隐藏原生滚动条，默认 true

  // 刻度模式一：像素
  scaleMode?: 'pixel' | 'normalized'; // 默认 'normalized'
  tickSpacing?: number;           // 小刻度间距（像素模式），默认 10
  majorEvery?: number;            // 多少个小刻度出现一个主刻度（像素模式），默认 10

  // 刻度模式二：归一化（0..N）
  scaleMax?: number;              // 最大刻度，默认 100
  unitsPerMinor?: number;         // 每个小格代表的单位数，默认 1
  majorEveryUnits?: number;       // 多少单位绘制主刻度，默认 10

  // 便捷项
  fullPageAs100AfterLoad?: boolean; // 页面加载完后自动将整页映射为 0..100，默认 false
}
```

> 默认值：
>
> ```ts
> {
>   width: 32,
>   position: 'right',
>   tickSpacing: 10,
>   majorEvery: 10,
>   tickColor: '#999',
>   numberColor: '#666',
>   showNumbers: true,
>   hideNative: true,
>   zIndex: 10000,
>   background: 'transparent',
>   scaleMode: 'normalized',
>   scaleMax: 100,
>   unitsPerMinor: 1,
>   majorEveryUnits: 10,
>   fullPageAs100AfterLoad: false,
> }
> ```

### 运行时方法（实例）

```ts
// 将整页总高度归一化为 0..100，并可同时调整单位相关参数
instance.useFullPageAs100({ unitsPerMinor?: number, majorEveryUnits?: number }): void

// 归一化模式：设置每小格代表的单位数
instance.setUnitsPerMinor(units: number): void

// 归一化模式：设置多少单位出现主刻度
instance.setMajorEveryUnits(units: number): void

// 切换刻度模式（像素 / 归一化）
instance.setScaleMode(mode: 'pixel' | 'normalized'): void

// 像素模式：设置小刻度像素间距
instance.setTickSpacing(px: number): void

// 销毁实例并移除 DOM
instance.destroy(): void
```

## 样式与兼容性

- 当 `hideNative: true` 时，会自动注入隐藏原生滚动条的样式并给目标元素添加 `ruler-scrollbar-hide` 类名（可关闭）。
- 依赖 `ResizeObserver` 与 `CanvasRenderingContext2D`。现代浏览器均已支持，如需兼容更旧环境，可引入相应 polyfill。
- SSR 场景请仅在客户端调用（例如放在 Vue 的 `onMounted`）。

## 本地开发

- 安装依赖：

```bash
npm i
```

- 构建：

```bash
npm run build
```

- 运行示例页：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080/examples/index.html`。

- 单元测试：

```bash
npm run test
```

## 许可证

MIT