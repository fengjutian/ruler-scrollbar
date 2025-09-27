import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { installRulerScrollbar } from '../src/index';

// Mock ResizeObserver（jsdom 默认没有实现）
class MockResizeObserver {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
}

// Canvas 上下文 mock
const contexts: any[] = [];
let lastCtx: any;
function createCtx() {
  const ctx = {
    clearRect: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    // attributes used by code
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textBaseline: 'middle' as CanvasTextBaseline,
    textAlign: 'left' as CanvasTextAlign,
  };
  contexts.push(ctx);
  lastCtx = ctx;
  return ctx;
}

beforeAll(() => {
  // mock getContext
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn((_type: string) => createCtx()),
  });
  // mock ResizeObserver
  (globalThis as any).ResizeObserver = MockResizeObserver as any;
});

beforeEach(() => {
  document.body.innerHTML = '';
  contexts.length = 0;
  lastCtx = undefined;
});

describe('install on body', () => {
  it('adds hide style & class and draws on init', () => {
    const r = installRulerScrollbar(document.body, { width: 40, position: 'left', hideNative: true });

    // 样式注入
    const style = document.querySelector('#ruler-scrollbar-hide-style');
    expect(style).not.toBeNull();

    // 类名添加
    expect(document.body.classList.contains('ruler-scrollbar-hide')).toBe(true);

    // 初次绘制发生
    expect(lastCtx).toBeDefined();
    expect(lastCtx.clearRect).toHaveBeenCalled();

    // 清理
    r.destroy();
    expect(document.body.classList.contains('ruler-scrollbar-hide')).toBe(false);
  });
});

describe('install on a container', () => {
  it('re-draws on scroll event', () => {
    const container = document.createElement('div');
    container.style.height = '200px';
    container.style.overflow = 'auto';
    document.body.appendChild(container);

    // jsdom 下手动设定 clientHeight/scrollTop
    Object.defineProperty(container, 'clientHeight', { get: () => 200 });
    (container as any).scrollTop = 100;

    const r = installRulerScrollbar(container, { width: 36, tickSpacing: 8, majorEvery: 5 });

    const before = lastCtx.clearRect.mock.calls.length;
    container.dispatchEvent(new Event('scroll'));
    const after = lastCtx.clearRect.mock.calls.length;

    expect(after).toBeGreaterThan(before);

    // 清理
    const canvasCountBeforeDestroy = document.querySelectorAll('canvas').length;
    r.destroy();
    const canvasCountAfterDestroy = document.querySelectorAll('canvas').length;
    expect(canvasCountAfterDestroy).toBeLessThan(canvasCountBeforeDestroy);
  });
});