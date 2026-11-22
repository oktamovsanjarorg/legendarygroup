import type { RoleCode } from '@lg/contracts';
import { LoadingState, useWebApp } from '@lg/ui-tg';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { IntroView, introKindOf } from '../screens/common/intro.js';
import { cloudIntroStore, type IntroStore } from '../session/intro-store.js';
import { useSession } from '../session/session.js';

type Phase = 'checking' | 'show' | 'done';

/**
 * C-06 (T-125): rol bo'yicha birinchi ochilishda 3 kartochka, keyin ilova.
 * Deep link bilan kirilsa (bildirishnomadan) — o'tkazib yuboriladi, lekin «ko'rildi» qo'yilmaydi.
 */
export function IntroGate({
  role,
  children,
  store,
}: {
  role: RoleCode;
  children: ReactNode;
  store?: IntroStore;
}) {
  const wa = useWebApp();
  const { link } = useSession();
  const s = useMemo(() => store ?? cloudIntroStore(wa), [store, wa]);
  const kind = link ? null : introKindOf(role);
  const [phase, setPhase] = useState<Phase>(kind ? 'checking' : 'done');
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!kind) return setPhase('done');
    let alive = true;
    void s.seen(kind).then((seen) => alive && setPhase(seen ? 'done' : 'show'));
    return () => {
      alive = false;
    };
  }, [kind, s]);
  if (phase === 'checking') return <LoadingState />;
  if (phase === 'done' || !kind) return <>{children}</>;
  return (
    <IntroView
      kind={kind}
      index={index}
      onIndex={setIndex}
      onDone={() => {
        setPhase('done');
        void s.markSeen(kind);
      }}
    />
  );
}
