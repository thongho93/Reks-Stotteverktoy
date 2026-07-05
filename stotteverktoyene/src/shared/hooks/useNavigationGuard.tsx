import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import { useNavigate, type NavigateFunction, type NavigateOptions, type To } from "react-router-dom";

/**
 * Returns true to BLOCK the navigation. The guard owner is then responsible for
 * showing its own UI (e.g. a confirmation dialog) and, if the user confirms,
 * performing the navigation itself (it has its own `useNavigate()`).
 */
type GuardFn = (path: string) => boolean;

interface NavigationGuardContextValue {
  /** Register (or clear with null) the active guard. Only one guard is active at a time. */
  setGuard: (fn: GuardFn | null) => void;
  /** Read the currently registered guard, if any. */
  getGuard: () => GuardFn | null;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<GuardFn | null>(null);

  const setGuard = useCallback((fn: GuardFn | null) => {
    guardRef.current = fn;
  }, []);

  const getGuard = useCallback(() => guardRef.current, []);

  const value = useMemo(() => ({ setGuard, getGuard }), [setGuard, getGuard]);

  return <NavigationGuardContext.Provider value={value}>{children}</NavigationGuardContext.Provider>;
}

/** Fails open (no guard) if used outside a provider. */
function useNavigationGuardContext(): NavigationGuardContextValue {
  const ctx = useContext(NavigationGuardContext);
  if (!ctx) {
    return { setGuard: () => {}, getGuard: () => null };
  }
  return ctx;
}

/**
 * Lets a page register a function that can block app-wide navigation (sidebar,
 * command palette, etc.) — e.g. while there's an unsaved draft. Call `setGuard`
 * with a function returning true to block (and show your own confirmation UI),
 * or `setGuard(null)` when there's nothing to guard. Always clear the guard on
 * unmount.
 */
export function useNavigationGuard() {
  const { setGuard } = useNavigationGuardContext();
  return { setGuard };
}

/**
 * Drop-in replacement for react-router's `useNavigate()` that checks the active
 * guard (if any) before navigating. Use this anywhere a nav click could leave a
 * page that might have unsaved state (sidebar, command palette, ...).
 */
export function useGuardedNavigate(): NavigateFunction {
  const navigate = useNavigate();
  const { getGuard } = useNavigationGuardContext();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        navigate(to);
        return;
      }
      const path = typeof to === "string" ? to : (to.pathname ?? "");
      const guard = getGuard();
      if (guard?.(path)) return;
      navigate(to as To, options);
    },
    [navigate, getGuard],
  ) as NavigateFunction;
}
