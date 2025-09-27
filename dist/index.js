var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/index.ts
var src_exports = {};
__export(src_exports, {
  RulerScrollbar: () => RulerScrollbar,
  installRulerScrollbar: () => installRulerScrollbar
});
module.exports = __toCommonJS(src_exports);
var DEFAULTS = {
  width: 32,
  position: "right",
  tickSpacing: 10,
  majorEvery: 10,
  tickColor: "#999",
  numberColor: "#666",
  showNumbers: true,
  hideNative: true,
  zIndex: 1e4,
  background: "transparent",
  scaleMode: "normalized",
  scaleMax: 100,
  unitsPerMinor: 1,
  majorEveryUnits: 10,
  fullPageAs100AfterLoad: false
};
function ensureHideNativeStyleOnce() {
  const id = "ruler-scrollbar-hide-style";
  if (document.getElementById(id))
    return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
  .ruler-scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
  .ruler-scrollbar-hide::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
  `;
  document.head.appendChild(style);
}
var RulerScrollbar = class {
  constructor(target, options) {
    __publicField(this, "target");
    __publicField(this, "hostIsWindow");
    __publicField(this, "opts");
    __publicField(this, "container");
    __publicField(this, "canvas");
    __publicField(this, "ctx");
    __publicField(this, "ro");
    __publicField(this, "onScroll");
    __publicField(this, "onWindowResize");
    this.target = target;
    this.hostIsWindow = target === document.body || target === document.documentElement;
    this.opts = { ...DEFAULTS, ...options || {} };
    if (this.opts.hideNative) {
      ensureHideNativeStyleOnce();
      this.target.classList.add("ruler-scrollbar-hide");
    }
    this.container = document.createElement("div");
    this.container.style.position = this.hostIsWindow ? "fixed" : "absolute";
    this.container.style.top = "0";
    if (this.opts.position === "right") {
      this.container.style.right = "0";
      this.container.style.left = "";
    } else {
      this.container.style.left = "0";
      this.container.style.right = "";
    }
    this.container.style.width = `${this.opts.width}px`;
    this.container.style.height = this.hostIsWindow ? "100vh" : "100%";
    this.container.style.pointerEvents = "none";
    this.container.style.zIndex = String(this.opts.zIndex);
    if (!this.hostIsWindow) {
      const host = this.target;
      const cs = getComputedStyle(host);
      if (cs.position === "static")
        host.style.position = "relative";
      host.appendChild(this.container);
    } else {
      document.body.appendChild(this.container);
    }
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = `${this.opts.width}px`;
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.canvas.style.pointerEvents = "none";
    this.container.appendChild(this.canvas);
    const maybeCtx = this.canvas.getContext("2d");
    if (!maybeCtx)
      throw new Error("2D context not available");
    this.ctx = maybeCtx;
    this.onScroll = () => this.draw();
    this.onWindowResize = () => {
      this.resizeCanvasToHost();
      this.draw();
    };
    this._attach();
    this.resizeCanvasToHost();
    this.draw();
    if (this.hostIsWindow && this.opts.fullPageAs100AfterLoad) {
      const apply = () => this.useFullPageAs100();
      if (document.readyState === "complete") {
        apply();
      } else {
        window.addEventListener("load", apply, { once: true });
      }
    }
  }
  destroy() {
    this._detach();
    if (this.container.parentNode)
      this.container.parentNode.removeChild(this.container);
    if (this.opts.hideNative)
      this.target.classList.remove("ruler-scrollbar-hide");
  }
  _attach() {
    if (this.hostIsWindow) {
      window.addEventListener("scroll", this.onScroll, { passive: true });
    } else {
      this.target.addEventListener("scroll", this.onScroll, { passive: true });
    }
    this.ro = new ResizeObserver(() => {
      this.resizeCanvasToHost();
      this.draw();
    });
    const observeEl = this.hostIsWindow ? document.documentElement : this.target;
    this.ro.observe(observeEl);
    window.addEventListener("resize", this.onWindowResize, { passive: true });
  }
  _detach() {
    if (this.hostIsWindow) {
      window.removeEventListener("scroll", this.onScroll);
    } else {
      this.target.removeEventListener("scroll", this.onScroll);
    }
    if (this.ro)
      this.ro.disconnect();
    window.removeEventListener("resize", this.onWindowResize);
  }
  resizeCanvasToHost() {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const cssW = this.opts.width;
    const cssH = this.hostIsWindow ? window.innerHeight : this.target.clientHeight;
    const needW = Math.floor(cssW * dpr);
    const needH = Math.floor(cssH * dpr);
    if (this.canvas.width !== needW || this.canvas.height !== needH) {
      this.canvas.width = needW;
      this.canvas.height = needH;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }
  getScrollTop() {
    if (this.hostIsWindow) {
      return window.scrollY || document.documentElement.scrollTop || 0;
    }
    return this.target.scrollTop;
  }
  getClientHeight() {
    if (this.hostIsWindow)
      return window.innerHeight;
    return this.target.clientHeight;
  }
  draw() {
    const ctx = this.ctx;
    const width = this.opts.width;
    const scrollTop = this.getScrollTop();
    const clientHeight = this.getClientHeight();
    ctx.clearRect(0, 0, width, clientHeight);
    if (this.opts.background && this.opts.background !== "transparent") {
      ctx.fillStyle = this.opts.background;
      ctx.fillRect(0, 0, width, clientHeight);
    }
    if (this.opts.scaleMode === "normalized") {
      const totalHeight = this.hostIsWindow ? Math.max(document.documentElement.scrollHeight, clientHeight) : Math.max(this.target.scrollHeight, clientHeight);
      const scaleMax = Math.max(1, this.opts.scaleMax);
      const pxPerUnit = totalHeight > 0 ? totalHeight / scaleMax : 1;
      const unitsPerMinor = Math.max(1e-3, this.opts.unitsPerMinor);
      const minorPx = unitsPerMinor * pxPerUnit;
      const majorEveryUnits = Math.max(1, this.opts.majorEveryUnits);
      const visibleStart = Math.floor(scrollTop);
      const visibleEnd = Math.min(Math.ceil(scrollTop + clientHeight), totalHeight);
      const firstTick = Math.floor(visibleStart / minorPx) * minorPx;
      ctx.strokeStyle = this.opts.tickColor;
      ctx.lineWidth = 1;
      for (let s = firstTick; s <= visibleEnd; s += minorPx) {
        const y = s - scrollTop;
        const valueUnits = s / pxPerUnit;
        const roundedUnits = Math.round(valueUnits);
        const isMajor = roundedUnits % majorEveryUnits === 0;
        const length = isMajor ? Math.floor(width * 0.35) : Math.floor(width * 0.18);
        ctx.beginPath();
        const xStart = this.opts.position === "left" ? width - length - 4 : 4;
        const xEnd = this.opts.position === "left" ? width - 4 : length + 4;
        ctx.moveTo(xStart, y + 0.5);
        ctx.lineTo(xEnd, y + 0.5);
        ctx.stroke();
        if (isMajor && this.opts.showNumbers) {
          const clamped = Math.max(0, Math.min(scaleMax, roundedUnits));
          ctx.font = "11px system-ui, Arial, Helvetica, sans-serif";
          ctx.fillStyle = this.opts.numberColor;
          const label = String(clamped);
          const tx = this.opts.position === "left" ? 8 : width - 8;
          ctx.textBaseline = "middle";
          ctx.textAlign = this.opts.position === "left" ? "left" : "right";
          ctx.fillText(label, tx, y);
        }
      }
    } else {
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
        const xStart = this.opts.position === "left" ? width - length - 4 : 4;
        const xEnd = this.opts.position === "left" ? width - 4 : length + 4;
        ctx.moveTo(xStart, y + 0.5);
        ctx.lineTo(xEnd, y + 0.5);
        ctx.stroke();
        if (isMajor && this.opts.showNumbers) {
          ctx.font = "11px system-ui, Arial, Helvetica, sans-serif";
          ctx.fillStyle = this.opts.numberColor;
          const label = String(s);
          const tx = this.opts.position === "left" ? 8 : width - 8;
          ctx.textBaseline = "middle";
          ctx.textAlign = this.opts.position === "left" ? "left" : "right";
          ctx.fillText(label, tx, y);
        }
      }
    }
  }
  // 运行时：切换归一化总刻度（整页 0..100 等）
  useFullPageAs100(config) {
    let changed = false;
    if (this.opts.scaleMode !== "normalized") {
      this.opts.scaleMode = "normalized";
      changed = true;
    }
    if (this.opts.scaleMax !== 100) {
      this.opts.scaleMax = 100;
      changed = true;
    }
    if (config && typeof config.unitsPerMinor === "number") {
      const v = Math.max(1e-3, config.unitsPerMinor);
      if (this.opts.unitsPerMinor !== v) {
        this.opts.unitsPerMinor = v;
        changed = true;
      }
    }
    if (config && typeof config.majorEveryUnits === "number") {
      const v = Math.max(1, Math.round(config.majorEveryUnits));
      if (this.opts.majorEveryUnits !== v) {
        this.opts.majorEveryUnits = v;
        changed = true;
      }
    }
    this.draw();
  }
  // 运行时：调整每个小格代表的单位数（归一化模式下影响“每一格”的像素间距）
  setUnitsPerMinor(units) {
    const safe = Math.max(1e-3, units);
    if (this.opts.unitsPerMinor !== safe) {
      this.opts.unitsPerMinor = safe;
      this.draw();
    }
  }
  // 运行时：设置多少单位出现一次主刻度
  setMajorEveryUnits(units) {
    const safe = Math.max(1, Math.round(units));
    if (this.opts.majorEveryUnits !== safe) {
      this.opts.majorEveryUnits = safe;
      this.draw();
    }
  }
  // 运行时：切换刻度模式（像素/归一化）
  setScaleMode(mode) {
    if (this.opts.scaleMode !== mode) {
      this.opts.scaleMode = mode;
      this.draw();
    }
  }
  // 运行时：像素模式下调整每个小格像素间距
  setTickSpacing(px) {
    const safe = Math.max(1, Math.round(px));
    if (this.opts.tickSpacing !== safe) {
      this.opts.tickSpacing = safe;
      this.draw();
    }
  }
};
function installRulerScrollbar(target, options) {
  return new RulerScrollbar(target || document.body, options);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RulerScrollbar,
  installRulerScrollbar
});
//# sourceMappingURL=index.js.map