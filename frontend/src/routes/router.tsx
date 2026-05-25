import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { LandingPage } from '../pages/LandingPage';
import { LeaderboardPage } from '../pages/LeaderboardPage';
import { LiveGamePage } from '../pages/LiveGamePage';
import { LoginPage } from '../pages/LoginPage';
import { MatchmakingPage } from '../pages/MatchmakingPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RegisterPage } from '../pages/RegisterPage';
import { TournamentsPage } from '../pages/TournamentsPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/matchmaking', element: <MatchmakingPage /> },
          { path: '/game/:roomId', element: <LiveGamePage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/leaderboard', element: <LeaderboardPage /> },
          { path: '/tournaments', element: <TournamentsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
