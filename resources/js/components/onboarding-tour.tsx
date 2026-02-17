import {
    type CSSProperties,
    type RefObject,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export type TourStep = {
    stepId: string;
    title?: string;
    text: string;
    targetRef: RefObject<HTMLElement | null>;
    placement?: TourPlacement;
    nextCondition?: boolean;
    captureClick?: boolean;
    advanceDelayMs?: number;
    hideNext?: boolean;
    autoAdvance?: boolean;
};

type OnboardingTourProps = {
    open: boolean;
    steps: TourStep[];
    onClose: () => void;
    refreshKey?: number | string;
};

type Rect = {
    top: number;
    left: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
};

type Size = {
    width: number;
    height: number;
};

type Viewport = {
    width: number;
    height: number;
};

const PADDING = 10;
const OVERLAY_Z = 80;
const TOOLTIP_Z = 90;

const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

const getRect = (element: HTMLElement): Rect => {
    const r = element.getBoundingClientRect();
    return {
        top: Math.max(0, r.top - PADDING),
        left: Math.max(0, r.left - PADDING),
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
        right: r.right + PADDING,
        bottom: r.bottom + PADDING,
    };
};

const readViewport = (): Viewport => {
    const vv = window.visualViewport;
    if (!vv) {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }

    return {
        width: vv.width,
        height: vv.height,
    };
};

const getTooltipPosition = (
    rect: Rect,
    placement: TourPlacement,
    tooltipSize: Size,
    viewport: Viewport,
): { top: number; left: number } => {
    const tooltipWidth = tooltipSize.width;
    const tooltipHeight = tooltipSize.height;
    const margin = 16;
    const vw = viewport.width;
    const vh = viewport.height;
    const isMobile = vw < 768;

    if (isMobile) {
        return {
            top: clamp(vh - tooltipHeight - margin, margin, vh - margin),
            left: margin,
        };
    }

    const fallback =
        placement === 'top'
            ? 'bottom'
            : placement === 'bottom'
              ? 'top'
              : placement === 'left'
                ? 'right'
                : 'left';

    const place = (p: TourPlacement) => {
        if (p === 'top') {
            return {
                top: rect.top - tooltipHeight - margin,
                left: rect.left + rect.width / 2 - tooltipWidth / 2,
            };
        }
        if (p === 'bottom') {
            return {
                top: rect.bottom + margin,
                left: rect.left + rect.width / 2 - tooltipWidth / 2,
            };
        }
        if (p === 'left') {
            return {
                top: rect.top + rect.height / 2 - tooltipHeight / 2,
                left: rect.left - tooltipWidth - margin,
            };
        }
        return {
            top: rect.top + rect.height / 2 - tooltipHeight / 2,
            left: rect.right + margin,
        };
    };

    let pos = place(placement);
    const outOfBounds =
        pos.top < margin ||
        pos.left < margin ||
        pos.top + tooltipHeight > vh - margin ||
        pos.left + tooltipWidth > vw - margin;

    if (outOfBounds) {
        pos = place(fallback);
    }

    return {
        top: clamp(pos.top, margin, Math.max(margin, vh - tooltipHeight - margin)),
        left: clamp(
            pos.left,
            margin,
            Math.max(margin, vw - tooltipWidth - margin),
        ),
    };
};

export function OnboardingTour({
    open,
    steps,
    onClose,
    refreshKey,
}: OnboardingTourProps) {
    const [index, setIndex] = useState(0);
    const [, setViewportTick] = useState(0);
    const [viewport, setViewport] = useState<Viewport>(() =>
        typeof window === 'undefined'
            ? { width: 1280, height: 720 }
            : readViewport(),
    );
    const [tooltipSize, setTooltipSize] = useState<Size>({
        width: 360,
        height: 180,
    });
    const [isStepVisualReady, setIsStepVisualReady] = useState(false);
    const [measuredTargetRect, setMeasuredTargetRect] = useState<Rect | null>(
        null,
    );
    const tooltipRef = useRef<HTMLDivElement>(null);
    const maskId = useId().replace(/[:]/g, '_');

    const currentStep = steps[index] ?? null;
    const targetElement = currentStep?.targetRef.current;
    const targetRect = open && isStepVisualReady ? measuredTargetRect : null;

    useEffect(() => {
        if (!open || !isStepVisualReady || !targetElement) {
            const timer = window.setTimeout(() => {
                setMeasuredTargetRect(null);
            }, 0);
            return () => window.clearTimeout(timer);
        }

        const measure = () => {
            setMeasuredTargetRect(getRect(targetElement));
        };

        const t0 = window.setTimeout(measure, 0);
        const rafId = window.requestAnimationFrame(measure);
        return () => {
            window.clearTimeout(t0);
            window.cancelAnimationFrame(rafId);
        };
    }, [open, isStepVisualReady, targetElement, refreshKey]);

    useEffect(() => {
        if (!open) {
            const timer = window.setTimeout(() => {
                setIsStepVisualReady(false);
            }, 0);
            return () => window.clearTimeout(timer);
        }

        if (typeof window === 'undefined') {
            return;
        }

        if (!currentStep?.targetRef.current) {
            const timer = window.setTimeout(() => {
                setIsStepVisualReady(false);
            }, 0);
            return () => window.clearTimeout(timer);
        }

        if (viewport.width >= 768) {
            const timer = window.setTimeout(() => {
                setIsStepVisualReady(true);
            }, 0);
            return () => window.clearTimeout(timer);
        }

        const hideTimer = window.setTimeout(() => {
            setIsStepVisualReady(false);
        }, 0);

        const target = currentStep.targetRef.current;
        const scrollToTarget = () => {
            // 1) Ensure nested scroll containers bring the control into view.
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
            });

            // 2) Align in viewport with top space for fixed onboarding banner.
            const bannerOffset = 110;
            const rect = target.getBoundingClientRect();
            const top = window.scrollY + rect.top;
            const desiredTop = Math.max(
                0,
                top - bannerOffset - window.innerHeight * 0.18,
            );
            window.scrollTo({ top: desiredTop, behavior: 'smooth' });
        };

        const rafId = window.requestAnimationFrame(scrollToTarget);
        const lateTimer = window.setTimeout(scrollToTarget, 220);
        const readyTimer = window.setTimeout(() => {
            setIsStepVisualReady(true);
        }, 380);

        return () => {
            window.clearTimeout(hideTimer);
            window.cancelAnimationFrame(rafId);
            window.clearTimeout(lateTimer);
            window.clearTimeout(readyTimer);
        };
    }, [open, index, currentStep, viewport.width]);

    useEffect(() => {
        if (!open) {
            return;
        }

        let rafId = 0;
        let prevRect: Rect | null = null;

        const loop = () => {
            const el = steps[index]?.targetRef.current;
            if (el) {
                const nextRect = getRect(el);
                const changed =
                    !prevRect ||
                    Math.abs(nextRect.top - prevRect.top) > 0.5 ||
                    Math.abs(nextRect.left - prevRect.left) > 0.5 ||
                    Math.abs(nextRect.width - prevRect.width) > 0.5 ||
                    Math.abs(nextRect.height - prevRect.height) > 0.5;

                if (changed) {
                    prevRect = nextRect;
                    setViewportTick((prev) => prev + 1);
                }
            }

            rafId = window.requestAnimationFrame(loop);
        };

        rafId = window.requestAnimationFrame(loop);

        return () => window.cancelAnimationFrame(rafId);
    }, [open, index, steps]);

    useEffect(() => {
        if (!open || !currentStep?.targetRef.current) {
            return;
        }

        const target = currentStep.targetRef.current;
        const ro = new ResizeObserver(() => {
            setViewportTick((prev) => prev + 1);
        });

        ro.observe(target);
        return () => ro.disconnect();
    }, [open, currentStep]);

    useEffect(() => {
        if (!open || !currentStep?.targetRef.current) {
            return;
        }

        const target = currentStep.targetRef.current;
        const mo = new MutationObserver(() => {
            setViewportTick((prev) => prev + 1);
            window.requestAnimationFrame(() =>
                setViewportTick((prev) => prev + 1),
            );
        });

        mo.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });

        return () => mo.disconnect();
    }, [open, currentStep]);

    useEffect(() => {
        if (!open || !currentStep?.targetRef.current) {
            return;
        }

        const target = currentStep.targetRef.current;
        const refresh = () => {
            window.setTimeout(() => setViewportTick((prev) => prev + 1), 0);
            window.setTimeout(() => setViewportTick((prev) => prev + 1), 120);
        };

        target.addEventListener('click', refresh);
        return () => target.removeEventListener('click', refresh);
    }, [open, currentStep]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const t0 = window.setTimeout(() => {
            setViewportTick((prev) => prev + 1);
        }, 0);
        const rafId = window.requestAnimationFrame(() =>
            setViewportTick((prev) => prev + 1),
        );
        return () => {
            window.clearTimeout(t0);
            window.cancelAnimationFrame(rafId);
        };
    }, [open, refreshKey]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onWindowChange = () => {
            setViewport(readViewport());
            setViewportTick((prev) => prev + 1);
        };

        const vv = window.visualViewport;
        window.addEventListener('resize', onWindowChange);
        window.addEventListener('scroll', onWindowChange, true);
        vv?.addEventListener('resize', onWindowChange);
        vv?.addEventListener('scroll', onWindowChange);

        return () => {
            window.removeEventListener('resize', onWindowChange);
            window.removeEventListener('scroll', onWindowChange, true);
            vv?.removeEventListener('resize', onWindowChange);
            vv?.removeEventListener('scroll', onWindowChange);
        };
    }, [open]);

    useEffect(() => {
        if (!open || !tooltipRef.current) {
            return;
        }

        const node = tooltipRef.current;
        const measure = () => {
            const r = node.getBoundingClientRect();
            setTooltipSize({
                width: r.width,
                height: r.height,
            });
        };

        const ro = new ResizeObserver(measure);
        ro.observe(node);
        measure();

        return () => ro.disconnect();
    }, [open, index, currentStep]);

    useEffect(() => {
        if (!open || !currentStep?.captureClick || !currentStep.targetRef.current) {
            return;
        }

        const target = currentStep.targetRef.current;
        const delayMs = Math.max(0, currentStep.advanceDelayMs ?? 0);
        const handleClick = () => {
            window.setTimeout(() => {
                if (index === steps.length - 1) {
                    onClose();
                    return;
                }
                setIndex((prev) => Math.min(prev + 1, steps.length - 1));
            }, delayMs);
        };

        target.addEventListener('click', handleClick);
        return () => target.removeEventListener('click', handleClick);
    }, [open, currentStep, index, steps.length, onClose]);

    const canGoNext = currentStep?.nextCondition ?? true;
    const prevCanGoNextRef = useRef(false);

    useEffect(() => {
        if (!open || !currentStep) {
            prevCanGoNextRef.current = false;
            return;
        }

        const shouldAutoAdvance = Boolean(currentStep.autoAdvance);
        const becameReady = !prevCanGoNextRef.current && canGoNext;
        prevCanGoNextRef.current = canGoNext;

        if (!shouldAutoAdvance || !becameReady) {
            return;
        }

        const delayMs = Math.max(0, currentStep.advanceDelayMs ?? 0);
        const timeoutId = window.setTimeout(() => {
            if (index === steps.length - 1) {
                onClose();
                return;
            }

            setIndex((prev) => Math.min(prev + 1, steps.length - 1));
        }, delayMs > 0 ? delayMs : 0);

        return () => window.clearTimeout(timeoutId);
    }, [open, currentStep, canGoNext, index, steps.length, onClose]);
    const tooltipPosition = useMemo(() => {
        if (!targetRect || !currentStep) {
            return null;
        }
        return getTooltipPosition(
            targetRect,
            currentStep.placement ?? 'bottom',
            tooltipSize,
            viewport,
        );
    }, [targetRect, currentStep, tooltipSize, viewport]);

    if (!open || !currentStep) {
        return null;
    }
    const isMobile = viewport.width < 768;
    const hasSpotlight = Boolean(targetRect && tooltipPosition);
    const tooltipStyle: CSSProperties =
        hasSpotlight && tooltipPosition
            ? isMobile
                ? {
                      zIndex: TOOLTIP_Z,
                      left: 16,
                      right: 16,
                      bottom: 16,
                  }
                : {
                      zIndex: TOOLTIP_Z,
                      top: tooltipPosition.top,
                      left: tooltipPosition.left,
                  }
            : {};

    return createPortal(
        <>
            {hasSpotlight ? (
                <>
                    <svg
                        className="pointer-events-none fixed inset-0 h-full w-full"
                        style={{ zIndex: OVERLAY_Z }}
                        width={viewport.width}
                        height={viewport.height}
                    >
                        <defs>
                            <mask id={maskId}>
                                <rect
                                    x="0"
                                    y="0"
                                    width={viewport.width}
                                    height={viewport.height}
                                    fill="white"
                                />
                                <rect
                                    x={targetRect.left}
                                    y={targetRect.top}
                                    width={targetRect.width}
                                    height={targetRect.height}
                                    rx="12"
                                    ry="12"
                                    fill="black"
                                />
                            </mask>
                        </defs>
                        <rect
                            x="0"
                            y="0"
                            width={viewport.width}
                            height={viewport.height}
                            fill="rgba(0, 0, 0, 0.42)"
                            mask={`url(#${maskId})`}
                        />
                    </svg>

                    <div
                        className="pointer-events-none fixed rounded-xl border-2 border-[#b9a6ff] shadow-[0_0_0_2px_rgba(185,166,255,0.45)]"
                        style={{
                            zIndex: TOOLTIP_Z,
                            top: targetRect.top,
                            left: targetRect.left,
                            width: targetRect.width,
                            height: targetRect.height,
                        }}
                    />
                </>
            ) : (
                <div
                    className="pointer-events-none fixed inset-0"
                    style={{ zIndex: OVERLAY_Z, background: 'rgba(0, 0, 0, 0.42)' }}
                />
            )}

            {hasSpotlight && tooltipPosition && (
                <div
                    ref={tooltipRef}
                    className="fixed w-[min(360px,calc(100vw-32px))] max-md:w-[calc(100vw-32px)] rounded-2xl border border-white/45 bg-[#1b1227]/90 p-4 text-white shadow-[0_18px_36px_-18px_rgba(0,0,0,0.85)] backdrop-blur-sm"
                    style={tooltipStyle}
                >
                    <div className="mb-2 text-lg leading-none text-[#baa7ff]">↘</div>
                    {currentStep.title && (
                        <h3 className="text-lg font-semibold">{currentStep.title}</h3>
                    )}
                    <p className="mt-1 text-sm leading-relaxed">{currentStep.text}</p>

                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-white/70">
                            {index + 1} / {steps.length}
                        </span>
                        <div className="flex items-center gap-2">
                            {index > 0 && (
                                <button
                                    type="button"
                                    className="rounded-lg border border-white/25 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                                    onClick={() =>
                                        setIndex((prev) => Math.max(prev - 1, 0))
                                    }
                                >
                                    Назад
                                </button>
                            )}
                            {!currentStep.hideNext && (
                                <button
                                    type="button"
                                    className="rounded-lg bg-[#7b67c5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8e79d8] disabled:opacity-50"
                                    disabled={!canGoNext}
                                    onClick={() => {
                                        if (index === steps.length - 1) {
                                            onClose();
                                            return;
                                        }
                                        setIndex((prev) =>
                                            Math.min(prev + 1, steps.length - 1),
                                        );
                                    }}
                                >
                                    Далее
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body,
    );
}
