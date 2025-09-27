export interface RulerOptions {
  width?: number; // ruler width in CSS px
  position?: 'left' | 'right';
  tickSpacing?: number; // minor tick spacing in px
  majorEvery?: number; // how many minor ticks per major tick
  tickColor?: string;
  numberColor?: string;
  showNumbers?: boolean;
  hideNative?: boolean; // add CSS to hide native scrollbar on target
  zIndex?: number;
  background?: string; // optional background fill color (e.g., 'rgba(0,0,0,0)')
  scaleMode?: 'pixel' | 'normalized';
  scaleMax?: number;           // 归一化时的最大刻度，默认 100
  unitsPerMinor?: number;      // 每个小格代表的单位数，默认 1（影响格子间距）
  majorEveryUnits?: number;    // 多少单位绘制一条主刻度，默认 10
}

const DEFAULTS: Required<RulerOptions> = {
  width: 32,
  position: 'right',
  tickSpacing: 10,
  majorEvery: 10,
  tickColor: '#999',
  numberColor: '#666',
  showNumbers: true,
  hideNative: true,
  zIndex: 10000,
  background: 'transparent',
  scaleMode: 'normalized',
  scaleMax: 100,
  unitsPerMinor: 1,
  majorEveryUnits: 10,
};

function ensureHideNativeStyleOnce(): void {
  const id = 'ruler-scrollbar-hide-style';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
  .ruler-scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
  .ruler-scrollbar-hide::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
  `;
  document.head.appendChild(style);
}

export class RulerScrollbar {
  private target: Element;
  private hostIsWindow: boolean;
  private opts: Required<RulerOptions>;
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private onScroll: () => void;
  private onWindowResize: () => void;

  constructor(target: Element, options?: RulerOptions) {
    this.target = target;
    this.hostIsWindow = target === document.body || target === document.documentElement;
    this.opts = { ...DEFAULTS, ...(options || {}) };

    if (this.opts.hideNative) {
      ensureHideNativeStyleOnce();
      (this.target as HTMLElement).classList.add('ruler-scrollbar-hide');
    }

    // Prepare container overlay
    this.container = document.createElement('div');
    this.container.style.position = this.hostIsWindow ? 'fixed' : 'absolute';
    this.container.style.top = '0';
    if (this.opts.position === 'right') {
      this.container.style.right = '0';
      this.container.style.left = '';
    } else {
      this.container.style.left = '0';
      this.container.style.right = '';
    }
    this.container.style.width = `${this.opts.width}px`;
    this.container.style.height = this.hostIsWindow ? '100vh' : '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = String(this.opts.zIndex);

    if (!this.hostIsWindow) {
      const host = this.target as HTMLElement;
      const cs = getComputedStyle(host);
      if (cs.position === 'static') host.style.position = 'relative';
      host.appendChild(this.container);
    } else {
      document.body.appendChild(this.container);
    }

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = `${this.opts.width}px`;
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.pointerEvents = 'none';
    this.container.appendChild(this.canvas);

    const maybeCtx = this.canvas.getContext('2d');
    if (!maybeCtx) throw new Error('2D context not available');
    this.ctx = maybeCtx;

    // Bind callbacks
    this.onScroll = () => this.draw();
    this.onWindowResize = () => { this.resizeCanvasToHost(); this.draw(); };

    // Attach observers/listeners
    this._attach();

    // Initial layout
    this.resizeCanvasToHost();
    this.draw();
  }

  public destroy(): void {
    this._detach();
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
    if (this.opts.hideNative) (this.target as HTMLElement).classList.remove('ruler-scrollbar-hide');
  }

  private _attach(): void {
    if (this.hostIsWindow) {
      window.addEventListener('scroll', this.onScroll, { passive: true });
    } else {
      (this.target as HTMLElement).addEventListener('scroll', this.onScroll, { passive: true });
    }

    this.ro = new ResizeObserver(() => {
      this.resizeCanvasToHost();
      this.draw();
    });
    const observeEl = this.hostIsWindow ? document.documentElement : (this.target as HTMLElement);
    this.ro.observe(observeEl);

    window.addEventListener('resize', this.onWindowResize, { passive: true });
  }

  private _detach(): void {
    if (this.hostIsWindow) {
      window.removeEventListener('scroll', this.onScroll);
    } else {
      (this.target as HTMLElement).removeEventListener('scroll', this.onScroll);
    }
    if (this.ro) this.ro.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
  }

  private resizeCanvasToHost(): void {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const cssW = this.opts.width;
    const cssH = this.hostIsWindow ? window.innerHeight : (this.target as HTMLElement).clientHeight;

    const needW = Math.floor(cssW * dpr);
    const needH = Math.floor(cssH * dpr);
    if (this.canvas.width !== needW || this.canvas.height !== needH) {
      this.canvas.width = needW;
      this.canvas.height = needH;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  private getScrollTop(): number {
    if (this.hostIsWindow) {
      return window.scrollY || document.documentElement.scrollTop || 0;
    }
    return (this.target as HTMLElement).scrollTop;
  }

  private getClientHeight(): number {
    if (this.hostIsWindow) return window.innerHeight;
    return (this.target as HTMLElement).clientHeight;
  }

  private draw(): void {
    const ctx = this.ctx;
    const width = this.opts.width;
    const scrollTop = this.getScrollTop();
    const clientHeight = this.getClientHeight();

    // 清空并绘制可选背景
    ctx.clearRect(0, 0, width, clientHeight);
    if (this.opts.background && this.opts.background !== 'transparent') {
      ctx.fillStyle = this.opts.background;
      ctx.fillRect(0, 0, width, clientHeight);
    }

    // 分支：归一化刻度（0..scaleMax）或像素刻度
    if (this.opts.scaleMode === 'normalized') {
      const totalHeight = this.hostIsWindow
        ? Math.max(document.documentElement.scrollHeight, clientHeight)
        : Math.max((this.target as HTMLElement).scrollHeight, clientHeight);

      const scaleMax = Math.max(1, this.opts.scaleMax);
      const pxPerUnit = totalHeight > 0 ? totalHeight / scaleMax : 1; // 每“单位”对应的像素
      const unitsPerMinor = Math.max(0.001, this.opts.unitsPerMinor); // 避免 0
      const minorPx = unitsPerMinor * pxPerUnit;                      // 小格像素间距（可调）
      const majorEveryUnits = Math.max(1, this.opts.majorEveryUnits);

      const visibleStart = Math.floor(scrollTop);
      const visibleEnd = Math.min(Math.ceil(scrollTop + clientHeight), totalHeight);
      const firstTick = Math.floor(visibleStart / minorPx) * minorPx;

      ctx.strokeStyle = this.opts.tickColor;
      ctx.lineWidth = 1;

      for (let s = firstTick; s <= visibleEnd; s += minorPx) {
        const y = s - scrollTop;                      // 视口内 y
        const valueUnits = s / pxPerUnit;             // 像素 -> 单位值
        const roundedUnits = Math.round(valueUnits);  // 用于主刻度与标签
        const isMajor = roundedUnits % majorEveryUnits === 0;
        const length = isMajor ? Math.floor(width * 0.35) : Math.floor(width * 0.18);

        ctx.beginPath();
        const xStart = this.opts.position === 'left' ? width - length - 4 : 4;
        const xEnd = this.opts.position === 'left' ? width - 4 : length + 4;
        ctx.moveTo(xStart, y + 0.5);
        ctx.lineTo(xEnd, y + 0.5);
        ctx.stroke();

        if (isMajor && this.opts.showNumbers) {
          const clamped = Math.max(0, Math.min(scaleMax, roundedUnits)); // 最大 100
          ctx.font = '11px system-ui, Arial, Helvetica, sans-serif';
          ctx.fillStyle = this.opts.numberColor;
          const label = String(clamped);
          const tx = this.opts.position === 'left' ? 8 : width - 8;
          ctx.textBaseline = 'middle';
          ctx.textAlign = this.opts.position === 'left' ? 'left' : 'right';
          ctx.fillText(label, tx, y);
        }
      }
    } else {
      // 像素模式：保持原有行为（按像素绘制）
      const minorPx = this.opts.tickSpacing;
      const majorEvery = this.opts.majorEvery;

      const visibleStart = Math.floor(scrollTop);
      const visibleEnd = Math.ceil(scrollTop + clientHeight);
      const firstTick = Math.floor(visibleStart / minorPx) * minorPx;

      ctx.strokeStyle = this.opts.tickColor;
      ctx.lineWidth = 1;

      for (let s = firstTick; s <= visibleEnd; s += minorPx) {
        const y = s - scrollTop;
        const isMajor = Math.round(s / minorPx) % majorEvery === 0;
        const length = isMajor ? Math.floor(width * 0.35) : Math.floor(width * 0.18);

        ctx.beginPath();
        const xStart = this.opts.position === 'left' ? width - length - 4 : 4;
        const xEnd = this.opts.position === 'left' ? width - 4 : length + 4;
        ctx.moveTo(xStart, y + 0.5);
        ctx.lineTo(xEnd, y + 0.5);
        ctx.stroke();

        if (isMajor && this.opts.showNumbers) {
          ctx.font = '11px system-ui, Arial, Helvetica, sans-serif';
          ctx.fillStyle = this.opts.numberColor;
          const label = String(s);
          const tx = this.opts.position === 'left' ? 8 : width - 8;
          ctx.textBaseline = 'middle';
          ctx.textAlign = this.opts.position === 'left' ? 'left' : 'right';
          ctx.fillText(label, tx, y);
        }
      }
    }
  }

  // 运行时：切换归一化总刻度（整页 0..100 等）
  public useFullPageAs100(config?: { unitsPerMinor?: number; majorEveryUnits?: number }): void {
    let changed = false;
    if (this.opts.scaleMode !== 'normalized') { this.opts.scaleMode = 'normalized'; changed = true; }
    if (this.opts.scaleMax !== 100) { this.opts.scaleMax = 100; changed = true; }

    if (config && typeof config.unitsPerMinor === 'number') {
      const v = Math.max(0.001, config.unitsPerMinor);
      if (this.opts.unitsPerMinor !== v) { this.opts.unitsPerMinor = v; changed = true; }
    }
    if (config && typeof config.majorEveryUnits === 'number') {
      const v = Math.max(1, Math.round(config.majorEveryUnits));
      if (this.opts.majorEveryUnits !== v) { this.opts.majorEveryUnits = v; changed = true; }
    }

    this.draw();
  }

  // 运行时：调整每个小格代表的单位数（归一化模式下影响“每一格”的像素间距）
  public setUnitsPerMinor(units: number): void {
    const safe = Math.max(0.001, units);
    if (this.opts.unitsPerMinor !== safe) {
      this.opts.unitsPerMinor = safe;
      this.draw();
    }
  }

  // 运行时：设置多少单位出现一次主刻度
  public setMajorEveryUnits(units: number): void {
    const safe = Math.max(1, Math.round(units));
    if (this.opts.majorEveryUnits !== safe) {
      this.opts.majorEveryUnits = safe;
      this.draw();
    }
  }

  // 运行时：切换刻度模式（像素/归一化）
  public setScaleMode(mode: 'pixel' | 'normalized'): void {
    if (this.opts.scaleMode !== mode) {
      this.opts.scaleMode = mode;
      this.draw();
    }
  }

  // 运行时：像素模式下调整每个小格像素间距
  public setTickSpacing(px: number): void {
    const safe = Math.max(1, Math.round(px));
    if (this.opts.tickSpacing !== safe) {
      this.opts.tickSpacing = safe;
      this.draw();
    }
  }
}

export function installRulerScrollbar(target?: Element | null, options?: RulerOptions): RulerScrollbar {
  return new RulerScrollbar(target || document.body, options);
}