/**
 * VessieOS Responsive Renderer System
 * Renders UI components that adapt to screen size
 * Mobile-first approach with fluid layouts
 */

class ResponsiveRenderer {
  constructor() {
    this.breakpoints = {
      xs: 0,
      sm: 576,
      md: 768,
      lg: 992,
      xl: 1200,
      xxl: 1400
    };
    
    this.currentBreakpoint = this.getBreakpoint();
    this.resizeObserver = null;
    this.elementCache = new Map();
    this.init();
  }

  init() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => this.onOrientationChange());
    this.applyResponsiveStyles();
    this.initResizeObserver();
  }

  getBreakpoint() {
    const width = window.innerWidth;
    const sorted = Object.entries(this.breakpoints).sort((a, b) => b[1] - a[1]);
    
    for (const [name, size] of sorted) {
      if (width >= size) return name;
    }
    return 'xs';
  }

  onResize() {
    const newBreakpoint = this.getBreakpoint();
    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this.applyResponsiveStyles();
      document.dispatchEvent(new CustomEvent('breakpoint-change', {
        detail: { breakpoint: newBreakpoint }
      }));
    }
  }

  onOrientationChange() {
    setTimeout(() => this.onResize(), 100);
  }

  applyResponsiveStyles() {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      breakpoint: this.currentBreakpoint,
      isMobile: this.currentBreakpoint === 'xs' || this.currentBreakpoint === 'sm',
      isTablet: this.currentBreakpoint === 'md' || this.currentBreakpoint === 'lg',
      isDesktop: this.currentBreakpoint === 'xl' || this.currentBreakpoint === 'xxl'
    };

    // Apply viewport properties to document
    document.documentElement.setAttribute('data-breakpoint', viewport.breakpoint);
    document.documentElement.style.setProperty('--viewport-width', `${viewport.width}px`);
    document.documentElement.style.setProperty('--viewport-height', `${viewport.height}px`);
    document.documentElement.style.setProperty('--is-mobile', viewport.isMobile ? '1' : '0');
    
    // Adjust UI scaling
    this.adjustUIScale(viewport);
  }

  adjustUIScale(viewport) {
    const root = document.documentElement;
    
    if (viewport.isMobile) {
      root.style.fontSize = '14px';
      root.style.setProperty('--spacing-unit', '4px');
    } else if (viewport.isTablet) {
      root.style.fontSize = '15px';
      root.style.setProperty('--spacing-unit', '8px');
    } else {
      root.style.fontSize = '16px';
      root.style.setProperty('--spacing-unit', '8px');
    }

    // Update component sizes
    this.updateComponentSizes(viewport);
  }

  updateComponentSizes(viewport) {
    const elements = document.querySelectorAll('[data-responsive]');
    
    elements.forEach(el => {
      const config = JSON.parse(el.getAttribute('data-responsive') || '{}');
      
      if (viewport.isMobile && config.mobile) {
        this.applyConfig(el, config.mobile);
      } else if (viewport.isTablet && config.tablet) {
        this.applyConfig(el, config.tablet);
      } else if (viewport.isDesktop && config.desktop) {
        this.applyConfig(el, config.desktop);
      }
    });
  }

  applyConfig(el, config) {
    if (config.width) el.style.width = config.width;
    if (config.height) el.style.height = config.height;
    if (config.fontSize) el.style.fontSize = config.fontSize;
    if (config.padding) el.style.padding = config.padding;
    if (config.margin) el.style.margin = config.margin;
    if (config.display) el.style.display = config.display;
    if (config.flexDirection) el.style.flexDirection = config.flexDirection;
  }

  initResizeObserver() {
    if (!window.ResizeObserver) return;
    
    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        this.onElementResize(entry.target);
      });
    });
  }

  onElementResize(element) {
    const event = new CustomEvent('element-resized', {
      detail: { element, rect: element.getBoundingClientRect() }
    });
    document.dispatchEvent(event);
  }

  observeElement(element) {
    if (this.resizeObserver) {
      this.resizeObserver.observe(element);
    }
  }

  unobserveElement(element) {
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(element);
    }
  }

  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      breakpoint: this.currentBreakpoint,
      isMobile: this.currentBreakpoint === 'xs' || this.currentBreakpoint === 'sm',
      isTablet: this.currentBreakpoint === 'md' || this.currentBreakpoint === 'lg',
      isDesktop: this.currentBreakpoint === 'xl' || this.currentBreakpoint === 'xxl'
    };
  }

  registerComponent(name, component) {
    this.elementCache.set(name, component);
    if (component.element && component.responsive) {
      this.observeElement(component.element);
    }
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.elementCache.clear();
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponsiveRenderer;
}
