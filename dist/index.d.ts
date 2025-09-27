interface RulerOptions {
    width?: number;
    position?: 'left' | 'right';
    tickSpacing?: number;
    majorEvery?: number;
    tickColor?: string;
    numberColor?: string;
    showNumbers?: boolean;
    hideNative?: boolean;
    zIndex?: number;
    background?: string;
}
declare class RulerScrollbar {
    private target;
    private hostIsWindow;
    private opts;
    private container;
    private canvas;
    private ctx;
    private ro?;
    private onScroll;
    private onWindowResize;
    constructor(target: Element, options?: RulerOptions);
    destroy(): void;
    private _attach;
    private _detach;
    private resizeCanvasToHost;
    private getScrollTop;
    private getClientHeight;
    private draw;
}
declare function installRulerScrollbar(target?: Element | null, options?: RulerOptions): RulerScrollbar;

export { RulerOptions, RulerScrollbar, installRulerScrollbar };
