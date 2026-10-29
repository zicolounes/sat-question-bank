import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthGate } from './components/AuthGate';
import { PageTransition } from './components/ui/PageTransition';
import { QuestionsProvider } from './context/QuestionsContext';
import { UserProfileProvider } from './context/UserProfileContext';
import {
  buildStudentSession,
  canViewQuestionReports,
  isAdminEmail,
  logOut,
  observeAuthState,
} from './lib/firebase';
import { AddQuestionPage } from './pages/AddQuestionPage';
import { BrowsePage } from './pages/BrowsePage';
import { DashboardPage } from './pages/DashboardPage';
import { EditQuestionPage } from './pages/EditQuestionPage';
import { PracticePage } from './pages/PracticePage';
import { ReviewMistakesPage } from './pages/ReviewMistakesPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { AdminStudentsPage } from './pages/AdminStudentsPage';
import { FullTestPage } from './pages/FullTestPage';
import { PastTestsPage } from './pages/PastTestsPage';
import { FontLabPage } from './pages/FontLabPage';
import { QuestionReportsDevPage } from './pages/QuestionReportsDevPage';
import { fontLabNavVisible } from './fontLab/fontLabPrefs';
import { FullTestLockProvider } from './context/FullTestLockContext';

function App() {
  const [studentSession, setStudentSession] = React.useState(null);
  const [authBooting, setAuthBooting] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      setStudentSession(buildStudentSession(user));
      setAuthBooting(false);
    });
    return () => unsubscribe();
  }, []);

  function handleAuthenticated(user) {
    setStudentSession(buildStudentSession(user));
  }

  async function handleLogout() {
    await logOut();
  }

  if (authBooting) return null;

  return (
    <BrowserRouter>
      {studentSession ? (
        <QuestionsProvider>
          <UserProfileProvider uid={studentSession.student_id}>
            <FullTestLockProvider>
            <AppShell
              studentFirstName={studentSession.first_name}
              isAdmin={isAdminEmail(studentSession.email)}
              questionReportsNavVisible={canViewQuestionReports(studentSession.email)}
              onLogout={handleLogout}
            >
              <Routes>
              <Route
                path="/verify"
                element={
                  <PageTransition>
                    <VerifyEmailPage
                      email={studentSession.email}
                      isAdmin={isAdminEmail(studentSession.email)}
                      isVerified={Boolean(studentSession.is_verified)}
                      onVerified={(user) => setStudentSession(buildStudentSession(user))}
                    />
                  </PageTransition>
                }
              />
              <Route
                path="/"
                element={
                  <PageTransition bleed>
                    {!isAdminEmail(studentSession.email) && !studentSession.is_verified ? (
                      <Navigate to="/verify" replace />
                    ) : (
                      <DashboardPage studentId={studentSession.student_id} />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/add"
                element={
                  <PageTransition>
                    {isAdminEmail(studentSession.email) ? (
                      <AddQuestionPage />
                    ) : (
                      <Navigate to="/" replace />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/browse"
                element={
                  <PageTransition>
                    {isAdminEmail(studentSession.email) ? (
                      <BrowsePage canEdit />
                    ) : (
                      <Navigate to="/" replace />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/edit/:id"
                element={
                  <PageTransition>
                    {isAdminEmail(studentSession.email) ? (
                      <EditQuestionPage />
                    ) : (
                      <Navigate to="/" replace />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/practice"
                element={
                  <PageTransition>
                    {!isAdminEmail(studentSession.email) && !studentSession.is_verified ? (
                      <Navigate to="/verify" replace />
                    ) : (
                      <PracticePage
                        studentId={studentSession.student_id}
                        studentEmail={studentSession.email}
                        studentName={studentSession.first_name}
                      />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/full-test"
                element={
                  <PageTransition>
                    {!isAdminEmail(studentSession.email) && !studentSession.is_verified ? (
                      <Navigate to="/verify" replace />
                    ) : (
                      <FullTestPage
                        studentId={studentSession.student_id}
                        studentEmail={studentSession.email}
                      />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/tests"
                element={
                  <PageTransition bleed>
                    {!isAdminEmail(studentSession.email) && !studentSession.is_verified ? (
                      <Navigate to="/verify" replace />
                    ) : (
                      <PastTestsPage studentId={studentSession.student_id} />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/tests/:attemptId"
                element={
                  <PageTransition bleed>
                    {!isAdminEmail(studentSession.email) && !studentSession.is_verified ? (
                      <Navigate to="/verify" replace />
                    ) : (
                      <PastTestsPage studentId={studentSession.student_id} />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/review"
                element={
                  <PageTransition>
                    {!isAdminEmail(studentSession.email) && !studentSession.is_verified ? (
                      <Navigate to="/verify" replace />
                    ) : (
                      <ReviewMistakesPage studentId={studentSession.student_id} />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/progress"
                element={
                  <PageTransition bleed>
                    {!isAdminEmail(studentSession.email) && !studentSession.is_verified ? (
                      <Navigate to="/verify" replace />
                    ) : (
                      <ProgressPage studentId={studentSession.student_id} />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/profile"
                element={
                  <PageTransition bleed>
                    {!isAdminEmail(studentSession.email) && !studentSession.is_verified ? (
                      <Navigate to="/verify" replace />
                    ) : (
                      <ProfilePage studentId={studentSession.student_id} />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <PageTransition bleed>
                    {!isAdminEmail(studentSession.email) && !studentSession.is_verified ? (
                      <Navigate to="/verify" replace />
                    ) : (
                      <LeaderboardPage studentId={studentSession.student_id} />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/students"
                element={
                  <PageTransition>
                    {isAdminEmail(studentSession.email) ? (
                      <AdminStudentsPage />
                    ) : (
                      <Navigate to="/" replace />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/font-lab"
                element={
                  <PageTransition>
                    {isAdminEmail(studentSession.email) && fontLabNavVisible() ? (
                      <FontLabPage />
                    ) : (
                      <Navigate to="/" replace />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/question-reports"
                element={
                  <PageTransition>
                    {canViewQuestionReports(studentSession.email) ? (
                      <QuestionReportsDevPage viewerEmail={studentSession.email} />
                    ) : (
                      <Navigate to="/" replace />
                    )}
                  </PageTransition>
                }
              />
              <Route
                path="/dev/question-reports"
                element={<Navigate to="/question-reports" replace />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
            </FullTestLockProvider>
          </UserProfileProvider>
        </QuestionsProvider>
      ) : (
        <AuthGate onAuthenticated={handleAuthenticated} />
      )}
    </BrowserRouter>
  );
}

export default App;
