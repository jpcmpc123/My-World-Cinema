import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LogModal } from './components/LogModal';
import { Top4PickerModal } from './components/Top4PickerModal';

// Pages
import { HomePage } from './pages/HomePage';
import { FilmPage } from './pages/FilmPage';
import { ActorPage } from './pages/ActorPage';
import { FilmsHubPage } from './pages/FilmsHubPage';
import { FilmsPage } from './pages/FilmsPage';
import { ProfilePage } from './pages/ProfilePage';
import { DiaryPage } from './pages/DiaryPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { ListsPage } from './pages/ListsPage';
import { ListDetailPage } from './pages/ListDetailPage';
import { CreateListPage } from './pages/CreateListPage';
import { AuthPage } from './pages/AuthPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <AuthProvider>
    <AppProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="min-h-screen bg-lb-bg text-lb-text flex flex-col selection:bg-lb-green selection:text-lb-bg">
          {/* Main Top Header */}
          <Header />

          {/* Main Content Viewport */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/film/:id" element={<FilmPage />} />
              <Route path="/actor/:id" element={<ActorPage />} />
              <Route path="/films" element={<FilmsHubPage />} />
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
              {/* MyWorld profile sub-routes */}
              <Route path="/:username" element={<ProfilePage />} />
              <Route path="/:username/diary" element={<DiaryPage />} />
              <Route path="/:username/watchlist" element={<WatchlistPage />} />
              <Route path="/:username/lists" element={<ListsPage />} />
            </Routes>
          </main>

          {/* MyWorld Global Modals */}
          <LogModal />
          <Top4PickerModal />

          {/* Main Footer */}
          <Footer />
        </div>
      </BrowserRouter>
    </AppProvider>
    </AuthProvider>
  );
}

export default App;
