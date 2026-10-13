import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, User, BookOpen, Clock, List, X, ChevronDown, Zap, Menu, LogOut, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { tmdb, type TMDBMovie } from '../services/tmdb';

export const Header: React.FC = () => {
  const { user, openLogModal } = useApp();
  const { isAuthenticated, profile, signOut } = useAuth();

  // Authenticated profile takes precedence over the local/fake user
  const displayUsername = isAuthenticated && profile ? profile.username : user.username;
  const displayDisplayName = isAuthenticated && profile?.display_name ? profile.display_name : user.displayName;
  const displayAvatar = (isAuthenticated && profile?.avatar_url) ? profile.avatar_url : user.avatarUrl;
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
        if (!searchQuery) setIsSearchExpanded(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  useEffect(() => {
    setIsSearchOpen(false);
    setIsUserMenuOpen(false);
    setIsSearchExpanded(false);
    setIsMenuOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  // Live Typeahead search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await tmdb.searchMovies(searchQuery.trim(), 1);
        setSearchResults(res.results.slice(0, 6));
        setIsSearchOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMovieSelect = (id: number) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(`/film/${id}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-lb-bg border-b border-lb-elevated shadow-md select-none">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <svg
            viewBox="0 0 32 32"
            className="w-7 h-7 shrink-0 drop-shadow-[0_2px_6px_rgba(0,224,84,0.35)] transition-transform duration-300 group-hover:rotate-6"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="mw-globe" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00e054" />
                <stop offset="55%" stopColor="#40bcf4" />
                <stop offset="100%" stopColor="#2c7fb8" />
              </linearGradient>
            </defs>
            {/* Globe */}
            <circle cx="16" cy="16" r="13" fill="url(#mw-globe)" />
            <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="#14181c" strokeOpacity="0.35" strokeWidth="1.2" />
            <line x1="3.2" y1="16" x2="28.8" y2="16" stroke="#14181c" strokeOpacity="0.35" strokeWidth="1.2" />
            <path d="M5.2 9h21.6M5.2 23h21.6" stroke="#14181c" strokeOpacity="0.25" strokeWidth="1.1" fill="none" />
            {/* Shine */}
            <ellipse cx="10.5" cy="9.5" rx="4" ry="2.6" fill="#ffffff" opacity="0.25" transform="rotate(-20 10.5 9.5)" />
          </svg>
          <span className="font-extrabold text-xl tracking-tight text-white">
            My<span className="text-lb-green">World</span>
          </span>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center gap-3 md:gap-5 text-xs font-bold uppercase tracking-wider">
          {/* User Profile Link & Avatar (or Sign in when logged out) */}
          {!isAuthenticated ? (
            <Link
              to="/signin"
              className={`transition-colors ${
                location.pathname === '/signin' || location.pathname === '/signup'
                  ? 'text-white font-bold'
                  : 'text-lb-text hover:text-white'
              }`}
            >
              Sign in
            </Link>
          ) : (
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 text-lb-text hover:text-white transition-colors cursor-pointer"
            >
              <img
                src={displayAvatar}
                alt={displayDisplayName}
                className="w-6 h-6 rounded-full object-cover border border-lb-border-light"
              />
              <span className="hidden md:inline text-[11px] font-bold text-white tracking-wider uppercase">
                {displayUsername}
              </span>
              <ChevronDown className="hidden md:block w-3 h-3 text-lb-muted" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute left-0 top-9 w-48 bg-lb-surface border border-lb-elevated rounded shadow-2xl py-1 z-50 text-xs normal-case">
                <Link
                  to={`/${displayUsername}`}
                  className="flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  <User className="w-3.5 h-3.5 text-lb-green" />
                  <span>Profile</span>
                </Link>
                <Link
                  to={`/${displayUsername}/diary`}
                  className="flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  <BookOpen className="w-3.5 h-3.5 text-lb-blue" />
                  <span>Diary</span>
                </Link>
                <Link
                  to={`/${displayUsername}/watchlist`}
                  className="flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  <Clock className="w-3.5 h-3.5 text-lb-blue" />
                  <span>Watchlist</span>
                </Link>
                <Link
                  to={`/${displayUsername}/lists`}
                  className="flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  <List className="w-3.5 h-3.5 text-lb-orange" />
                  <span>Lists</span>
                </Link>
                <div className="border-t border-lb-elevated my-1" />
                <Link
                  to="/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  <Settings className="w-3.5 h-3.5 text-lb-muted" />
                  <span>Settings</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    void signOut();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-lb-text hover:text-white hover:bg-lb-elevated cursor-pointer text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
          )}

          {/* Activity Zap Icon */}
          <Link
            to={`/${displayUsername}?tab=activity`}
            className="hidden sm:block text-lb-text hover:text-white transition-colors p-1"
            title="Activity"
          >
            <Zap className="w-3.5 h-3.5 fill-lb-text text-transparent hover:fill-white" />
          </Link>

          {/* Main Links */}
          <Link
            to="/films"
            className={`hidden sm:block transition-colors ${
              location.pathname.startsWith('/films') ? 'text-white font-bold' : 'text-lb-text hover:text-white'
            }`}
          >
            Films
          </Link>          <Link
            to="/series"
            className={`hidden sm:block transition-colors ${
              location.pathname.startsWith('/series') || location.pathname.startsWith('/tv') ? 'text-white font-bold' : 'text-lb-text hover:text-white'
            }`}
          >
            Series
          </Link>

          <Link
            to="/lists"
            className={`hidden md:block transition-colors ${
              location.pathname === '/lists' ? 'text-white' : 'text-lb-text hover:text-white'
            }`}
          >
            Lists
          </Link>

          {/* Search Icon & Typeahead */}
          <div ref={searchRef} className="relative">
            {isSearchExpanded ? (
              <div className="flex items-center h-7 bg-white rounded-full px-2.5 w-36 sm:w-44">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="no-focus-ring flex-1 min-w-0 h-full bg-transparent text-xs text-gray-900 placeholder-gray-500 border-0 outline-none p-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="ml-1 shrink-0 text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <Search className="w-3.5 h-3.5 text-gray-400 ml-2 shrink-0" />
              </div>
            ) : (
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="text-lb-text hover:text-white p-1 transition-colors"
                title="Search"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Typeahead Dropdown */}
            {isSearchOpen && (
              <div className="absolute right-0 top-9 w-72 sm:w-80 bg-lb-surface border border-lb-elevated rounded shadow-2xl overflow-hidden z-50">
                <div className="px-3 py-1.5 bg-lb-bg border-b border-lb-elevated text-[10px] uppercase font-bold text-lb-muted flex justify-between">
                  <span>Results for "{searchQuery}"</span>
                  {isSearching && <span className="text-lb-green animate-pulse">Searching</span>}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-lb-elevated/60 normal-case">
                  {searchResults.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => handleMovieSelect(m.id)}
                      className="p-2 flex items-center gap-2.5 hover:bg-lb-elevated cursor-pointer w-full text-left"
                    >
                      <img
                        src={tmdb.getImageUrl(m.poster_path, 'w92')}
                        alt={m.title}
                        className="w-8 h-12 object-cover rounded bg-lb-bg shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{m.title}</p>
                        <p className="text-[11px] text-lb-muted">{m.release_date?.slice(0, 4)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu */}
          <div ref={menuRef} className="relative md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-1 text-lb-text hover:text-white"
              aria-label="Open menu"
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-14 w-52 bg-lb-surface border border-lb-elevated rounded shadow-2xl py-1 z-50 flex flex-col md:hidden">
                <Link
                  to="/films"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  Films
                </Link>
                <Link
                  to="/lists"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  Lists
                </Link>
                <div className="border-t border-lb-elevated my-1" />
                <Link
                  to={`/${displayUsername}/diary`}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  Diário
                </Link>
                <Link
                  to={`/${displayUsername}/watchlist`}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  Watchlist
                </Link>
                <Link
                  to={`/${displayUsername}/lists`}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-lb-text hover:text-white hover:bg-lb-elevated"
                >
                  My Lists
                </Link>
              </div>
            )}
          </div>

          {/* MyWorld "+ LOG ▼" Button */}
          <div className="flex items-center">
            <button
              onClick={() => openLogModal()}
              className="btn-log-green flex items-center gap-1 text-lb-bg font-black text-xs px-2.5 py-1.5 rounded-l-xs cursor-pointer tracking-wider"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Log</span>
            </button>
            <button
              onClick={() => openLogModal()}
              className="btn-log-green px-1.5 py-1.5 rounded-r-xs border-l border-black/15 text-lb-bg cursor-pointer"
            >
              <ChevronDown className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
