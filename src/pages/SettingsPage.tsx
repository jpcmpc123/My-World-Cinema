import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Film, Upload, Download, ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { tmdb } from '../services/tmdb';

type TabKey = 'profile' | 'avatar' | 'data';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'avatar', label: 'Avatar' },
  { key: 'data', label: 'Data' },
];

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const inputClass =
  'w-full bg-lb-bg border border-lb-elevated focus:border-lb-green rounded px-3 py-2 text-sm text-white placeholder-lb-muted focus:outline-none transition-colors';

const FieldLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <label className="block mb-1.5">
    <span className="text-[10px] font-bold uppercase tracking-widest text-lb-muted">{children}</span>
    {hint && <span className="ml-2 text-[10px] text-lb-muted/70 normal-case font-normal">{hint}</span>}
  </label>
);

const Notice: React.FC<{ kind: 'success' | 'error' | 'info'; message: string }> = ({ kind, message }) => (
  <div
    className={`flex items-start gap-2 rounded border px-3 py-2 text-xs mb-4 ${
      kind === 'success'
        ? 'border-lb-green/40 bg-lb-green/10 text-lb-green'
        : kind === 'error'
          ? 'border-red-500/40 bg-red-500/10 text-red-400'
          : 'border-lb-blue/40 bg-lb-blue/10 text-lb-blue'
    }`}
  >
    {kind === 'success' ? (
      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
    ) : (
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
    )}
    <span>{message}</span>
  </div>
);

export const SettingsPage: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'profile';
  const setTab = (tab: TabKey) => setSearchParams({ tab });

  if (!loading && !isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-lb-muted text-sm">Loading settings…</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl md:text-4xl font-light text-white tracking-tight mb-6">Account Settings</h1>

      {/* Horizontal green tab bar */}
      <div className="border-b border-lb-elevated mb-8">
        <nav className="flex gap-6 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`pb-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-lb-green text-lb-green'
                  : 'border-transparent text-lb-muted hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'avatar' && <AvatarTab />}
      {activeTab === 'data' && <DataTab />}
    </div>
  );
};

/* ─────────────────────────────── Profile ─────────────────────────────── */

interface ProfileForm {
  username: string;
  location: string;
  website: string;
  bio: string;
}

const ProfileTab: React.FC = () => {
  const { user: authUser, session, profile } = useAuth();
  const { updateUser, top4MovieIds, openTop4Picker } = useApp();

  const [form, setForm] = useState<ProfileForm>({
    username: profile?.username ?? '',
    location: '',
    website: '',
    bio: profile?.bio ?? '',
  });
  const [extraFieldsAvailable, setExtraFieldsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [top4Meta, setTop4Meta] = useState<Record<number, { title: string; poster: string | null }>>({});

  // Load extended fields (location/website) — tolerant if migration not applied yet
  useEffect(() => {
    const loadExtended = async () => {
      if (!supabase || !authUser) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, location, website')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        setExtraFieldsAvailable(false);
        return;
      }
      if (data) {
        const row = data as Record<string, string | null>;
        setForm({
          username: row.username ?? '',
          location: row.location ?? '',
          website: row.website ?? '',
          bio: row.bio ?? '',
        });
      }
    };
    void loadExtended();
  }, [authUser]);

  // Load Top 4 posters for the right-hand "FAVORITE FILMS" panel
  useEffect(() => {
    const load = async () => {
      const results = await Promise.all(
        top4MovieIds
          .filter((id) => id > 0)
          .map(async (id) => {
            try {
              const d = await tmdb.getMovieDetails(id);
              return [id, { title: d.title, poster: d.poster_path }] as const;
            } catch {
              return null;
            }
          })
      );
      setTop4Meta(Object.fromEntries(results.filter(Boolean) as NonNullable<(typeof results)[number]>[]));
    };
    void load();
  }, [top4MovieIds]);

  const set = (key: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!USERNAME_RE.test(form.username)) {
      setNotice({
        kind: 'error',
        message: 'Username must be 3–20 characters using only lowercase letters, numbers and underscores (a-z, 0-9, _).',
      });
      return;
    }
    if (!supabase || !authUser) {
      setNotice({ kind: 'error', message: 'Supabase is not configured.' });
      return;
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      username: form.username,
      bio: form.bio,
      location: form.location,
      website: form.website,
    };

    let { error } = await supabase.from('profiles').update(payload).eq('id', authUser.id);

    // If location/website columns don't exist yet, retry without them
    if (error && /location|website/i.test(error.message)) {
      setExtraFieldsAvailable(false);
      delete payload.location;
      delete payload.website;
      ({ error } = await supabase.from('profiles').update(payload).eq('id', authUser.id));
    }

    setSaving(false);

    if (error) {
      const isUnique = error.code === '23505' || /duplicate key|unique/i.test(error.message);
      setNotice({
        kind: 'error',
        message: isUnique ? `Username "${form.username}" is already taken.` : error.message,
      });
      return;
    }

    updateUser({
      username: form.username,
      bio: form.bio,
      location: form.location,
      website: form.website,
    });
    setNotice({ kind: 'success', message: 'Profile updated successfully.' });
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col lg:flex-row gap-10">
      {/* Left column: form fields */}
      <div className="flex-1 min-w-0 space-y-5">
        {!extraFieldsAvailable && (
          <Notice
            kind="info"
            message="The location and website fields require a database migration (supabase/migration_settings.sql). Run it in the Supabase SQL Editor to enable them."
          />
        )}
        {notice && <Notice kind={notice.kind} message={notice.message} />}

        <div>
          <FieldLabel hint="3–20 chars, lowercase, numbers and _ only">Username</FieldLabel>
          <input type="text" value={form.username} onChange={set('username')} className={inputClass} />
        </div>

        <div>
          <FieldLabel hint="cannot be changed">Email address</FieldLabel>
          <input
            type="email"
            value={session?.user?.email ?? ''}
            readOnly
            disabled
            className={`${inputClass} opacity-60 cursor-not-allowed`}
          />
        </div>

        <div>
          <FieldLabel>Location</FieldLabel>
          <input
            type="text"
            value={form.location}
            onChange={set('location')}
            placeholder="e.g. São Paulo, Brazil"
            className={inputClass}
            disabled={!extraFieldsAvailable}
          />
        </div>

        <div>
          <FieldLabel>Website</FieldLabel>
          <input
            type="text"
            value={form.website}
            onChange={set('website')}
            placeholder="e.g. mysite.com"
            className={inputClass}
            disabled={!extraFieldsAvailable}
          />
        </div>

        <div>
          <FieldLabel>Bio</FieldLabel>
          <textarea
            value={form.bio}
            onChange={set('bio')}
            rows={5}
            placeholder="Tell the world about your taste in film…"
            className={`${inputClass} resize-y`}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-log-green text-lb-bg font-black text-sm px-8 py-3 rounded uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Right column: FAVORITE FILMS panel */}
      <aside className="lg:w-64 shrink-0">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-lb-muted border-b border-lb-elevated pb-2 mb-3">
          Favorite films
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((slot) => {
            const id = top4MovieIds[slot];
            const movie = id ? top4Meta[id] : undefined;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => openTop4Picker(slot)}
                title={movie ? `${movie.title} — click to change` : 'Pick a film'}
                className="aspect-[2/3] rounded overflow-hidden bg-lb-bg border border-lb-elevated hover:border-lb-green transition-colors cursor-pointer relative group"
              >
                {id && movie?.poster ? (
                  <img
                    src={tmdb.getImageUrl(movie.poster, 'w185')}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:opacity-60 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lb-muted group-hover:text-lb-green">
                    <Film className="w-6 h-6" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-lb-muted mt-3">Drag posters to reorder.</p>
      </aside>
    </form>
  );
};

/* ─────────────────────────────── Avatar ─────────────────────────────── */

const AvatarTab: React.FC = () => {
  const { user: authUser, profile } = useAuth();
  const { user: appUser, updateUser } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentAvatar = profile?.avatar_url || appUser.avatarUrl;

  const [avatarUrlInput, setAvatarUrlInput] = useState(profile?.avatar_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null);

  const avatarSrc = avatarUrlInput || currentAvatar;

  const applyAvatarToProfile = async (url: string) => {
    if (!supabase || !authUser) {
      setNotice({ kind: 'error', message: 'Supabase is not configured.' });
      return false;
    }
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', authUser.id);
    if (error) {
      setNotice({ kind: 'error', message: error.message });
      return false;
    }
    updateUser({ avatarUrl: url });
    setAvatarUrlInput(url);
    return true;
  };

  const handleUploadFile = async (file: File) => {
    setNotice(null);
    if (!file.type.startsWith('image/')) {
      setNotice({ kind: 'error', message: 'Please choose an image file (PNG, JPG, WebP…).' });
      return;
    }
    if (!supabase || !authUser) {
      setNotice({ kind: 'error', message: 'Supabase is not configured.' });
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${authUser.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploading(false);
      setNotice({
        kind: 'error',
        message: `Upload failed: ${uploadError.message}. Configure o bucket 'avatars' público no Supabase Storage, ou cole a URL de uma imagem abaixo.`,
      });
      return;
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    // Bust cache: append timestamp so the new avatar shows immediately
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;

    const ok = await applyAvatarToProfile(publicUrl);
    setUploading(false);
    if (ok) setNotice({ kind: 'success', message: 'Avatar updated.' });
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!avatarUrlInput.trim()) {
      setNotice({ kind: 'error', message: 'Paste an image URL first.' });
      return;
    }
    setSavingUrl(true);
    const ok = await applyAvatarToProfile(avatarUrlInput.trim());
    setSavingUrl(false);
    if (ok) setNotice({ kind: 'success', message: 'Avatar updated.' });
  };

  return (
    <div className="flex flex-col md:flex-row gap-10 items-start">
      {/* Current avatar preview */}
      <div className="flex flex-col items-center gap-3">
        <img
          src={avatarSrc}
          alt="Current avatar"
          className="w-40 h-40 rounded-full object-cover border-2 border-lb-elevated bg-lb-bg shadow-xl"
        />
        <span className="text-[10px] uppercase font-bold tracking-widest text-lb-muted">Current avatar</span>
      </div>

      <div className="flex-1 min-w-0 space-y-6 w-full">
        {notice && <Notice kind={notice.kind} message={notice.message} />}

        {/* Upload */}
        <section className="bg-lb-surface border border-lb-elevated rounded p-5">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-lb-muted mb-3">Upload a new avatar</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUploadFile(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-log-green text-lb-bg font-black text-xs px-5 py-2.5 rounded uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            {uploading ? 'Uploading…' : 'Choose image'}
          </button>
          <p className="text-[11px] text-lb-muted mt-3">
            JPG, PNG or WebP. Uploads to the public <code className="text-lb-blue">avatars</code> bucket in Supabase
            Storage.
          </p>
        </section>

        {/* URL fallback */}
        <section className="bg-lb-surface border border-lb-elevated rounded p-5">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-lb-muted mb-3">
            Or paste an image URL
          </h2>
          <form onSubmit={handleSaveUrl} className="flex gap-2">
            <input
              type="url"
              value={avatarUrlInput}
              onChange={(e) => setAvatarUrlInput(e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={savingUrl}
              className="shrink-0 btn-log-green text-lb-bg font-black text-xs px-5 py-2 rounded uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {savingUrl ? 'Saving…' : 'Save'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

/* ─────────────────────────────── Data ─────────────────────────────── */

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
}

interface PendingImport {
  name: string;
  year: string;
}

const DataTab: React.FC = () => {
  const { user: authUser, isAuthenticated } = useAuth();
  const { logs, watchlist, saveLog } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [pendingImports, setPendingImports] = useState<PendingImport[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lb_pending_imports') ?? '[]');
    } catch {
      return [];
    }
  });

  const handleImportFile = async (file: File) => {
    setNotice(null);
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());

      if (lines.length < 2) {
        setNotice({ kind: 'error', message: 'The CSV file appears to be empty (no data rows).' });
        return;
      }

      // Parse (simple CSV; handles quoted cells)
      const splitCsvLine = (line: string): string[] => {
        const out: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else cur += ch;
          } else if (ch === '"') {
            inQuotes = true;
          } else if (ch === ',') {
            out.push(cur);
            cur = '';
          } else {
            cur += ch;
          }
        }
        out.push(cur);
        return out.map((s) => s.trim());
      };

      const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
      const idx = (name: string) => header.indexOf(name);

      const hasFilmId = idx('film_id') !== -1;
      const hasName = idx('name') !== -1;

      if (!hasFilmId && !hasName) {
        setNotice({
          kind: 'error',
          message: 'Unrecognized CSV format. Expected columns "film_id,rating,liked,watched_on" or a Letterboxd export with "Name,Year,Letterboxd URI".',
        });
        return;
      }

      let count = 0;
      const newPending: PendingImport[] = [];

      for (const line of lines.slice(1)) {
        const cols = splitCsvLine(line);
        if (hasFilmId) {
          const filmId = parseInt(cols[idx('film_id')], 10);
          if (!Number.isFinite(filmId)) continue;
          const rating = idx('rating') !== -1 ? parseFloat(cols[idx('rating')]) || 0 : 0;
          const liked = idx('liked') !== -1 ? ['true', '1', 'yes'].includes((cols[idx('liked')] ?? '').toLowerCase()) : false;
          const watchedOn = idx('watched_on') !== -1 ? cols[idx('watched_on')] : '';
          saveLog({
            movieId: filmId,
            movieTitle: hasName ? cols[idx('name')] : `Film #${filmId}`,
            moviePoster: null,
            movieYear: idx('year') !== -1 ? cols[idx('year')] : '',
            watchedDate: watchedOn,
            rating,
            isRewatch: false,
            liked,
            reviewText: '',
            containsSpoilers: false,
            tags: ['imported'],
          });
          count++;
        } else {
          // Letterboxd-style export (Name, Year, Letterboxd URI): we can't resolve TMDB ids simply — stash pending
          const name = cols[idx('name')];
          const year = idx('year') !== -1 ? cols[idx('year')] : '';
          if (name) newPending.push({ name, year });
        }
      }

      if (hasFilmId) {
        setNotice({ kind: 'success', message: `${count} films imported to your diary.` });
      } else if (newPending.length > 0) {
        const merged = [...pendingImports, ...newPending];
        setPendingImports(merged);
        localStorage.setItem('lb_pending_imports', JSON.stringify(merged));
        setNotice({
          kind: 'info',
          message: `${newPending.length} imported (saved locally as pending — names/years only, no film IDs).`,
        });
      } else {
        setNotice({ kind: 'error', message: 'No valid rows found in the CSV.' });
      }
    } catch (err) {
      setNotice({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to import CSV.' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setNotice(null);
    setExporting(true);
    try {
      let logsCsv = '';
      let watchlistCsv = '';

      if (supabase && isAuthenticated && authUser) {
        const [logsRes, watchlistRes] = await Promise.all([
          supabase.from('film_logs').select('*').eq('user_id', authUser.id),
          supabase.from('watchlist').select('*').eq('user_id', authUser.id),
        ]);
        if (logsRes.error) throw new Error(logsRes.error.message);
        if (watchlistRes.error) throw new Error(watchlistRes.error.message);

        const logRows = (logsRes.data ?? []) as Record<string, unknown>[];
        logsCsv = toCsv(
          ['film_id', 'name', 'year', 'watched_on', 'rating', 'liked', 'review_text', 'contains_spoilers', 'created_at'],
          logRows.map((r) => [
            r.film_id, r.film_title, r.film_year, r.watched_on, r.rating, r.liked, r.review_text, r.contains_spoilers, r.created_at,
          ])
        );
        watchlistCsv = toCsv(
          ['film_id', 'name', 'year'],
          ((watchlistRes.data ?? []) as Record<string, unknown>[]).map((r) => [r.film_id, r.film_title, r.film_year])
        );
      } else {
        // Offline fallback: local state
        logsCsv = toCsv(
          ['film_id', 'name', 'year', 'watched_on', 'rating', 'liked', 'review_text', 'contains_spoilers', 'created_at'],
          logs.map((l) => [l.movieId, l.movieTitle, l.movieYear, l.watchedDate, l.rating, l.liked, l.reviewText, l.containsSpoilers, l.createdAt])
        );
        watchlistCsv = toCsv(
          ['film_id', 'name', 'year'],
          watchlist.map((m) => [m.id, m.title, m.release_date.slice(0, 4)])
        );
      }

      const content = `# Diary\n${logsCsv}\n\n# Watchlist\n${watchlistCsv}\n`;
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'letterboxd-export.csv';
      a.click();
      URL.revokeObjectURL(url);
      setNotice({ kind: 'success', message: 'Export downloaded as letterboxd-export.csv.' });
    } catch (err) {
      setNotice({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to export data.' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {notice && <Notice kind={notice.kind} message={notice.message} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Import */}
        <section className="bg-lb-surface border border-lb-elevated rounded p-5 flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white mb-2">Import your data</h2>
          <p className="text-xs text-lb-muted mb-4 flex-1">
            Upload a CSV with columns <code className="text-lb-blue">film_id,rating,liked,watched_on</code> — or a
            Letterboxd export with <code className="text-lb-blue">Name,Year,Letterboxd URI</code>.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-log-green text-lb-bg font-black text-xs px-4 py-2.5 rounded uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            {importing ? 'Importing…' : 'Import your data'}
          </button>
        </section>

        {/* Export */}
        <section className="bg-lb-surface border border-lb-elevated rounded p-5 flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white mb-2">Export your data</h2>
          <p className="text-xs text-lb-muted mb-4 flex-1">
            Download a CSV with your diary entries and watchlist
            {isAuthenticated ? ' (from Supabase)' : ' (local data — sign in to export from the cloud)'}.
          </p>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="btn-log-green text-lb-bg font-black text-xs px-4 py-2.5 rounded uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            {exporting ? 'Exporting…' : 'Export your data'}
          </button>
        </section>
      </div>

      {pendingImports.length > 0 && (
        <section className="bg-lb-surface border border-lb-elevated rounded p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">
              Pending imports <span className="text-lb-muted font-normal">({pendingImports.length} saved locally)</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setPendingImports([]);
                localStorage.removeItem('lb_pending_imports');
              }}
              className="text-[10px] uppercase font-bold text-lb-muted hover:text-red-400 cursor-pointer"
            >
              Clear
            </button>
          </div>
          <p className="text-[11px] text-lb-muted mb-2">
            These films came from a Name/Year CSV and have no TMDB id yet:
          </p>
          <ul className="text-xs text-lb-text max-h-40 overflow-y-auto divide-y divide-lb-elevated/60">
            {pendingImports.slice(0, 50).map((p, i) => (
              <li key={i} className="py-1.5 flex justify-between gap-3">
                <span className="truncate text-white">{p.name}</span>
                <span className="text-lb-muted shrink-0">{p.year}</span>
              </li>
            ))}
            {pendingImports.length > 50 && (
              <li className="py-1.5 text-lb-muted">…and {pendingImports.length - 50} more</li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
};
