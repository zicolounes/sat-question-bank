import React from 'react';
import { getLastSessionCard, GET_STARTED_SESSION } from '../lib/lastSession';

export function useLastSessionCard(studentId, { questionsAnswered = 0, responseRows = null, statsLoading }) {
  const [card, setCard] = React.useState(GET_STARTED_SESSION);

  React.useEffect(() => {
    if (!studentId) {
      setCard(GET_STARTED_SESSION);
      return undefined;
    }
    if (statsLoading) return undefined;

    const refresh = () => {
      setCard(
        getLastSessionCard(studentId, {
          responses: responseRows ?? [],
          questionsAnswered,
        })
      );
    };
    refresh();

    const onStorage = (e) => {
      if (e.key?.includes('sat-last-session')) refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [studentId, questionsAnswered, responseRows, statsLoading]);

  return card;
}
