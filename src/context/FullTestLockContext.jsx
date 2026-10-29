import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const FullTestLockContext = React.createContext(null);

const LOCKED_MODES = new Set(['rw-1', 'rw-2', 'break', 'math-1', 'math-2']);

export function isFullTestLockedMode(mode) {
  return LOCKED_MODES.has(mode);
}

export function useFullTestLock() {
  const ctx = React.useContext(FullTestLockContext);
  if (!ctx) {
    throw new Error('useFullTestLock must be used within FullTestLockProvider');
  }
  return ctx;
}

export function useFullTestLockOptional() {
  return React.useContext(FullTestLockContext);
}

function LeaveTestModal({ open, canSubmitModule, onStay, onSubmitModule, onExitTest }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-test-title"
    >
      <div className="w-full max-w-md rounded border border-rule bg-paper p-6 shadow-lg">
        <div className="kicker text-accent">Test in progress</div>
        <h2 id="leave-test-title" className="font-display mt-2 text-xl font-bold text-ink">
          Leave this test?
        </h2>
        <p className="mt-3 text-sm text-mist">
          Navigation is locked while you are in a timed section. Submit your current module, or
          exit the test — exiting discards your in-progress attempt.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onStay}>
            Keep testing
          </Button>
          {canSubmitModule ? (
            <Button variant="secondary" className="w-full sm:w-auto" onClick={onSubmitModule}>
              Submit module
            </Button>
          ) : null}
          <Button className="w-full sm:w-auto" onClick={onExitTest}>
            Exit test
          </Button>
        </div>
      </div>
    </div>
  );
}

function isModifiedClick(event) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function pathFromHref(href) {
  if (!href || href.startsWith('#')) return null;
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return null;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function FullTestLockProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [locked, setLocked] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const actionsRef = React.useRef({
    canSubmitModule: false,
    submitModule: null,
    exitTest: null,
  });
  const pendingNavRef = React.useRef(null);
  const [canSubmitModule, setCanSubmitModule] = React.useState(false);

  const registerTestActions = React.useCallback((actions) => {
    setCanSubmitModule(Boolean(actions?.canSubmitModule));
    actionsRef.current = {
      canSubmitModule: Boolean(actions?.canSubmitModule),
      submitModule: actions?.submitModule ?? null,
      exitTest: actions?.exitTest ?? null,
    };
  }, []);

  const currentPath = location.pathname + location.search + location.hash;

  const openLeaveModal = React.useCallback((pendingPath) => {
    pendingNavRef.current = pendingPath ?? null;
    setModalOpen(true);
  }, []);

  const clearPendingNav = React.useCallback(() => {
    pendingNavRef.current = null;
  }, []);

  // Intercept in-app link clicks while the test is locked (BrowserRouter has no useBlocker).
  React.useEffect(() => {
    if (!locked) return undefined;

    const handleClick = (event) => {
      if (event.defaultPrevented || isModifiedClick(event)) return;

      const anchor = event.target.closest('a[href]');
      if (!anchor || anchor.target === '_blank') return;

      const nextPath = pathFromHref(anchor.getAttribute('href'));
      if (!nextPath || nextPath === currentPath) return;

      event.preventDefault();
      event.stopPropagation();
      openLeaveModal(nextPath);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [locked, currentPath, openLeaveModal]);

  // Trap browser back while locked.
  React.useEffect(() => {
    if (!locked) return undefined;

    window.history.pushState({ fullTestLock: true }, '', window.location.href);

    const onPopState = () => {
      window.history.pushState({ fullTestLock: true }, '', window.location.href);
      openLeaveModal('__BACK__');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [locked, openLeaveModal]);

  React.useEffect(() => {
    if (!locked) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [locked]);

  const promptLeaveTest = React.useCallback(() => {
    openLeaveModal(null);
  }, [openLeaveModal]);

  const handleStay = React.useCallback(() => {
    clearPendingNav();
    setModalOpen(false);
  }, [clearPendingNav]);

  const handleSubmitModule = React.useCallback(() => {
    clearPendingNav();
    actionsRef.current.submitModule?.();
    setModalOpen(false);
  }, [clearPendingNav]);

  const handleExitTest = React.useCallback(() => {
    const pending = pendingNavRef.current;
    clearPendingNav();
    actionsRef.current.exitTest?.();
    setModalOpen(false);

    if (pending === '__BACK__') {
      navigate(-1);
    } else if (pending) {
      navigate(pending);
    }
  }, [clearPendingNav, navigate]);

  const value = React.useMemo(
    () => ({
      locked,
      setLocked,
      registerTestActions,
      promptLeaveTest,
    }),
    [locked, registerTestActions, promptLeaveTest]
  );

  return (
    <FullTestLockContext.Provider value={value}>
      {children}
      <LeaveTestModal
        open={modalOpen}
        canSubmitModule={canSubmitModule}
        onStay={handleStay}
        onSubmitModule={handleSubmitModule}
        onExitTest={handleExitTest}
      />
    </FullTestLockContext.Provider>
  );
}
