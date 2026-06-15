import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AppLayout } from '../layouts/AppLayout';
import { CollectionPage } from '../pages/CollectionPage';
import { FriendsPage } from '../pages/FriendsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LandingPage } from '../pages/LandingPage';
import { LeaderboardPage } from '../pages/LeaderboardPage';
import { LiveGamePage } from '../pages/LiveGamePage';
import { LoginPage } from '../pages/LoginPage';
import { MatchmakingPage } from '../pages/MatchmakingPage';
import { OAuthCallbackPage } from '../pages/OAuthCallbackPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RegisterPage } from '../pages/RegisterPage';
import { RulesPage } from '../pages/RulesPage';
import { SoloGamePage } from '../pages/SoloGamePage';
import { TournamentsPage } from '../pages/TournamentsPage';
import { UserProfilePage } from '../pages/UserProfilePage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { SettingsPage } from '../pages/SettingsPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/oauth/callback', element: <OAuthCallbackPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/matchmaking', element: <MatchmakingPage /> },
          { path: '/solo', element: <SoloGamePage /> },
          { path: '/collection', element: <CollectionPage /> },
          { path: '/game/:roomId', element: <LiveGamePage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/profile/:userId', element: <ProfilePage /> },
          { path: '/leaderboard', element: <LeaderboardPage /> },
          { path: '/rules', element: <RulesPage /> },
          { path: '/tournaments', element: <TournamentsPage /> },
          { path: '/friends', element: <FriendsPage /> },
          { path: '/users/:id', element: <UserProfilePage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
