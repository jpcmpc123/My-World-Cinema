import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, Search, Plus, Zap, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

/**
 * Bottom Navigation — visível apenas no mobile (< 768px, md:hidden).
 * Réplica do app Android do Letterboxd: 5 ícones sem rótulo, pill atrás do
 * ícone ativo e botão central de Log elevado em verde.
 */
export const BottomNav: React.FC = () => {
  const { user, openLogModal } = useApp();
  const { isAuthenticated, profile } = useAuth();
  const { pathname } = useLocation();
  // Se a foto falhar (rede/URL inválida) ou não existir, cai no ícone de usuário
  const [avatarError, setAvatarError] = useState(false);

  // Mesma lógica de exibição do Header
  const displayUsername = isAuthenticated && profile ? profile.username : user.username;
  const displayAvatar = (isAuthenticated && profile?.avatar_url) ? profile.avatar_url : user.avatarUrl;

  const iconCls = 'w-5 h-5';

  const profileActive =
    pathname === `/${displayUsername}` ||
    pathname === '/profile' ||
    pathname === '/settings';

  const isHomeActive = pathname === '/' || pathname.startsWith('/films') || pathname.startsWith('/series');
  const isSearchActive = pathname.startsWith('/search');
  const isActivityActive = pathname.startsWith('/activity');

  // Ícone ativo ganha uma "pill" oval escura atrás
  const pill = (active: boolean) =>
    `flex items-center justify-center transition-colors ${
      active
        ? 'w-14 h-8 rounded-full bg-[#14181c]/80 text-[#40bcf4]'
        : 'w-14 h-8 text-lb-muted'
    }`;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden h-14 bg-[#1c242c] border-t border-white/10 pb-[env(safe-area-inset-bottom)] flex items-center justify-around"
    >
      {/* 1. Home / Catálogo */}
      <Link to="/" aria-label="Home" className={pill(isHomeActive)}>
        <Layers className={iconCls} />
      </Link>

      {/* 2. Search / Browse */}
      <Link to="/search" aria-label="Search" className={pill(isSearchActive)}>
        <Search className={iconCls} />
      </Link>

      {/* 3. Botão central de Log: círculo vazado com borda verde, alinhado na barra */}
      <button
        onClick={() => openLogModal()}
        aria-label="Log"
        className="flex items-center justify-center w-14 h-8 cursor-pointer"
      >
        <span className="w-6 h-6 rounded-full border-2 border-[#00e054] text-[#00e054] flex items-center justify-center">
          <Plus className="w-4 h-4 stroke-[3]" />
        </span>
      </button>

      {/* 4. Activity */}
      <Link to="/activity" aria-label="Activity" className={pill(isActivityActive)}>
        <Zap className={iconCls} />
      </Link>

      {/* 5. Profile (avatar com fallback para silhueta) */}
      <Link to={`/${displayUsername}`} aria-label="Profile" className={pill(profileActive)}>
        {displayAvatar && !avatarError ? (
          <img
            src={displayAvatar}
            alt={displayUsername}
            onError={() => setAvatarError(true)}
            className="w-6 h-6 rounded-full object-cover border border-white/20"
          />
        ) : (
          <User className={iconCls} />
        )}
      </Link>
    </nav>
  );
};