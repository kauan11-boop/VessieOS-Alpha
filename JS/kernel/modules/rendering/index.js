/**
 * Rendering Modules – Exporta RenderManager, AnimationManager e MotionBlurEngine
 */
import { MotionBlurEngine } from './lib/motion-blur.js';

export class RenderManager {
    // Otimiza renderizações usando batching e RAF
    constructor(performanceManager, animationManager) {
        this.performanceManager = performanceManager;
        this.animationManager = animationManager;
        this._pendingUpdates = [];
        this._rafId = null;
        this._started = false;
        this._batchSize = 10;
    }

    start() {
        if (this._started) return;
        this._started = true;
        this._loop();
    }

    _loop() {
        if (!this._started) return;
        this._rafId = requestAnimationFrame(() => {
            this._processBatch();
            this._loop();
        });
    }

    _processBatch() {
        if (this._pendingUpdates.length === 0) return;
        const batch = this._pendingUpdates.splice(0, this._batchSize);
        for (const update of batch) {
            try {
                update();
            } catch (e) {
                console.error('[RenderManager] Erro no update:', e);
            }
        }
    }

    scheduleUpdate(updateFn) {
        this._pendingUpdates.push(updateFn);
    }

    stop() {
        this._started = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._pendingUpdates = [];
    }
}

export class AnimationManager {
    // Controla animações com base na performance e acessibilidade
    constructor(performanceManager, accessibilityManager) {
        this.performanceManager = performanceManager;
        this.accessibilityManager = accessibilityManager;
        this._animations = new Map();
        this._nextId = 0;
        this._started = false;
        this._rafId = null;
    }

    start() {
        if (this._started) return;
        this._started = true;
        this._loop();
    }

    _loop() {
        if (!this._started) return;
        this._rafId = requestAnimationFrame((timestamp) => {
            const quality = (typeof this.performanceManager?.getQuality === 'function')
                ? this.performanceManager.getQuality()
                : { animationDuration: 1 };
            const speed = quality.animationDuration || 1;
            const reduced = this.accessibilityManager?.prefersReducedMotion || false;

            for (const [id, anim] of this._animations) {
                if (anim.paused) continue;
                if (reduced && anim.respectReducedMotion) continue;
                // Avança a animação
                anim.progress += anim.speed * speed * (1 / 60);
                if (anim.progress >= anim.duration) {
                    anim.progress = anim.duration;
                    anim.completed = true;
                    if (anim.onComplete) {
                        anim.onComplete();
                    }
                    this._animations.delete(id);
                } else {
                    anim.update(anim.progress / anim.duration);
                }
            }
            this._loop();
        });
    }

    /**
     * Cria uma animação
     * @param {Object} params - { duration, update, speed, onComplete, respectReducedMotion }
     * @returns {Object} API para controlar a animação
     */
    animate(params) {
        const id = this._nextId++;
        const anim = {
            id,
            duration: params.duration || 1,
            speed: params.speed || 1,
            progress: 0,
            update: params.update || (() => { }),
            onComplete: params.onComplete || null,
            paused: false,
            completed: false,
            respectReducedMotion: params.respectReducedMotion !== false
        };
        this._animations.set(id, anim);
        return {
            pause: () => { anim.paused = true; },
            resume: () => { anim.paused = false; },
            cancel: () => { this._animations.delete(id); },
            complete: () => {
                anim.progress = anim.duration;
                anim.update(1);
                if (anim.onComplete) anim.onComplete();
                this._animations.delete(id);
            }
        };
    }

    stop() {
        this._started = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._animations.clear();
    }
}

export { MotionBlurEngine };