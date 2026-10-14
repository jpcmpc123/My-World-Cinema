import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { useApp } from './context/AppContext';

// Modais globais carregados sob demanda: fora do bundle inicial.
const LogModal = lazy(() => import('./components/LogModal').then((m) => ({ default: m.LogModal })));
const Top4PickerModal = lazy(() => import('./components/Top4PickerModal').then((m) => ({ default: m.Top4PickerModal })));

// Só monta (e baixa o chunk de) cada modal quando ele está aberto.
function GlobalModals() {
  const { isLogModalOpen, isTop4PickerOpen } = useApp();
  return (
    <Suspense fallback={null}>
      {isLogModalOpen && <LogModal />}
      {isTop4PickerOpen && <Top4PickerModal />}
    </Suspense>
  );
}

// Code splitting: cada página vira um chunk carregado sob demanda,
// reduzindo o bundle inicial (antes um único chunk > 500 KB).
const HomePage = lazy(() => import(/* webpackChunkName */ './pages/HomePage').then((m) => ({ default: m.HomePage })));
const FilmPage = lazy(() => import('./pages/FilmPage').then((m) => ({ default: m.FilmPage })));
const ActorPage = lazy(() => import('./pages/ActorPage').then((m) => ({ default: m.ActorPage })));
const FilmsHubPage = lazy(() => import('./pages/FilmsHubPage').then((m) => ({ default: m.FilmsHubPage })));
const FilmsPage = lazy(() => import('./pages/FilmsPage').then((m) => ({ default: m.FilmsPage })));
const SeriesHubPage = lazy(() => import('./pages/SeriesHubPage').then((m) => ({ default: m.SeriesHubPage })));
const SeriesPage = lazy(() => import('./pages/SeriesPage').then((m) => ({ default: m.SeriesPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const DiaryPage = lazy(() => import('./pages/DiaryPage').then((m) => ({ default: m.DiaryPage })));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage').then((m) => ({ default: m.WatchlistPage })));
const ListsPage = lazy(() => import('./pages/ListsPage').then((m) => ({ default: m.ListsPage })));
const ListDetailPage = lazy(() => import('./pages/ListDetailPage').then((m) => ({ default: m.ListDetailPage })));
const CreateListPage = lazy(() => import('./pages/CreateListPage').then((m) => ({ default: m.CreateListPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const BrowseDrilldownPage = lazy(() => import('./pages/BrowseDrilldownPage').then((m) => ({ default: m.BrowseDrilldownPage })));
const BrowseResultsPage = lazy(() => import('./pages/BrowseResultsPage').then((m) => ({ default: m.BrowseResultsPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-40">
      <Loader2 className="w-8 h-8 animate-spin text-lb-green" />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
    <AppProvider>
      {/* No build do APK (base './') o basename relativo quebraria o router */}
      <BrowserRouter basename={import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL}>
        <div className="min-h-screen text-lb-text flex flex-col selection:bg-lb-green selection:text-lb-bg">
          {/* Main Top Header */}
          <Header />

          {/* Main Content Viewport (pb-20: espaço para a BottomNav no mobile) */}
          <main className="flex-1 pb-20 md:pb-0">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/film/:id" element={<FilmPage />} />
                <Route path="/actor/:id" element={<ActorPage />} />
                <Route path="/films" element={<FilmsHubPage />} />
                <Route path="/series" element={<SeriesHubPage />} />
                <Route path="/series/genre/:genre" element={<SeriesPage />} />
                <Route path="/series/decade/:decade" element={<SeriesPage />} />
                <Route path="/series/year/:year" element={<SeriesPage />} />
                <Route path="/series/popular" element={<SeriesPage />} />
                <Route path="/tv/:id" element={<FilmPage />} />
                <Route path="/films/decade/:decade" element={<FilmsPage />} />
                <Route path="/films/year/:year" element={<FilmsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/diary" element={<DiaryPage />} />
                <Route path="/watchlist" element={<WatchlistPage />} />
                <Route path="/lists" element={<ListsPage />} />
                <Route path="/list/:id" element={<ListDetailPage />} />
                <Route path="/list/new" element={<CreateListPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/signin" element={<AuthPage />} />
                <Route path="/signup" element={<AuthPage />} />
                <Route path="/search" element={<SearchPage />} />
                {/* BROWSE BY em cascata (drill-down) + grade de resultados filtrada */}
                <Route path="/browse/release-date" element={<BrowseDrilldownPage kind="decades" />} />
                <Route path="/browse/release-date/:decade" element={<BrowseDrilldownPage kind="years" />} />
                <Route path="/browse/genre" element={<BrowseDrilldownPage kind="genre" />} />
                <Route path="/browse/country" element={<BrowseDrilldownPage kind="country" />} />
                <Route path="/browse/language" element={<BrowseDrilldownPage kind="language" />} />
                <Route path="/browse/service" element={<BrowseDrilldownPage kind="service" />} />
                <Route path="/browse/results" element={<BrowseResultsPage />} />
                {/* Stand-ins usados pela BottomNav/abas mobile do app */}
                <Route path="/reviews" element={<DiaryPage />} />
                <Route path="/activity" element={<DiaryPage />} />
                {/* MyWorld profile sub-routes */}
                <Route path="/:username" element={<ProfilePage />} />
                <Route path="/:username/diary" element={<DiaryPage />} />
                <Route path="/:username/watchlist" element={<WatchlistPage />} />
                <Route path="/:username/lists" element={<ListsPage />} />
              </Routes>
            </Suspense>
          </main>

          {/* MyWorld Global Modals (lazy) */}
          <GlobalModals />

          {/* Bottom Navigation (somente mobile) */}
          <BottomNav />

          {/* Main Footer */}
          <Footer />
        </div>
      </BrowserRouter>
    </AppProvider>
    </AuthProvider>
  );
}

export default App;
