import React from 'react';
import {
  appendQuestion,
  deleteQuestion as deleteQuestionDoc,
  getNextId,
  listQuestions,
  updateQuestion as updateQuestionDoc,
} from '../lib/firebase';

const QuestionsContext = React.createContext(null);

export function QuestionsProvider({ children }) {
  const [questions, setQuestions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [headersInfo, setHeadersInfo] = React.useState({
    headers: [],
    expectedHeaders: [],
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { questions: qs, headers, expectedHeaders } = await listQuestions();
      setQuestions(qs);
      setHeadersInfo({ headers, expectedHeaders });
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const addQuestion = React.useCallback(
    async (draft) => {
      const nextId = getNextId(questions);
      const created_at = new Date().toISOString();
      const image_url = draft?.image_url || '';
      const toCreate = {
        ...draft,
        id: nextId,
        created_at,
        image_url,
      };

      await appendQuestion(toCreate);
      await refresh();
      return toCreate;
    },
    [questions, refresh]
  );

  const updateQuestion = React.useCallback(
    async (existing, updates) => {
      const image_url = updates?.image_url ?? existing.image_url ?? '';

      const updated = {
        ...existing,
        ...updates,
        image_url,
        id: existing.id,
      };
      await updateQuestionDoc(updated);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const deleteQuestion = React.useCallback(
    async (existing) => {
      await deleteQuestionDoc(existing.id);
      await refresh();
    },
    [refresh]
  );

  const value = React.useMemo(
    () => ({
      questions,
      loading,
      error,
      refresh,
      addQuestion,
      updateQuestion,
      deleteQuestion,
      headersInfo,
    }),
    [
      questions,
      loading,
      error,
      refresh,
      addQuestion,
      updateQuestion,
      deleteQuestion,
      headersInfo,
    ]
  );

  return (
    <QuestionsContext.Provider value={value}>
      {children}
    </QuestionsContext.Provider>
  );
}

export function useQuestions() {
  const ctx = React.useContext(QuestionsContext);
  if (!ctx) {
    throw new Error('useQuestions must be used inside QuestionsProvider');
  }
  return ctx;
}

