import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-lb-elevated bg-lb-bg text-lb-muted text-xs py-10">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 font-semibold">
          <Link to="/films" className="hover:text-white transition-colors">Films</Link>
          <Link to="/lists" className="hover:text-white transition-colors">Lists</Link>
          <Link to="/members" className="hover:text-white transition-colors">Members</Link>
          <Link to="/journal" className="hover:text-white transition-colors">Journal</Link>
          <a href="https://letterboxd.com/about/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">About</a>
          <a href="https://letterboxd.com/apps/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Apps</a>
          <a href="https://letterboxd.com/help/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Help</a>
        </div>

        <div className="flex flex-col md:items-end text-center md:text-right gap-1 text-[11px]">
          <p>© Letterboxd Limited. Made by film fans in Aotearoa New Zealand.</p>
          <p className="flex items-center justify-center md:justify-end gap-1.5">
            <span>Film data from</span>
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer"
              className="text-lb-text hover:text-lb-green font-semibold transition-colors"
            >
              TMDb
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
