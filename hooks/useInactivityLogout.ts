import { useEffect, useRef, useState, useCallback } from 'react';

// 15 minutes of inactivity triggers logout; warn 60s before
const TIMEOUT_MS   = 15 * 60 * 1000;
const WARN_BEFORE  = 60 * 1000;
const WARN_SECONDS = 60;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

export function useInactivityLogout(logout: () => void) {
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft]       = useState(WARN_SECONDS);

  const warnRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningRef   = useRef(false); // track warning state in event handlers

  const clearAll = useCallback(() => {
    if (warnRef.current)      clearTimeout(warnRef.current);
    if (logoutRef.current)    clearTimeout(logoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearAll();
    setWarningVisible(false);
    warningRef.current = false;

    warnRef.current = setTimeout(() => {
      setWarningVisible(true);
      warningRef.current = true;
      setSecondsLeft(WARN_SECONDS);
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => (s <= 1 ? (clearInterval(countdownRef.current!), 0) : s - 1));
      }, 1000);
    }, TIMEOUT_MS - WARN_BEFORE);

    logoutRef.current = setTimeout(() => {
      logout();
    }, TIMEOUT_MS);
  }, [clearAll, logout]);

  // Dismiss warning and reset — exposed for "Stay logged in" button
  const stayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    const onActivity = () => {
      // Don't reset after warning appears — let countdown continue
      if (!warningRef.current) resetTimers();
    };
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    resetTimers();
    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity));
      clearAll();
    };
  }, [resetTimers, clearAll]);

  return { warningVisible, secondsLeft, stayLoggedIn };
}
