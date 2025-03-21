import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-white border-b shadow-sm z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="font-bold text-xl">
          <Link to="/">Senfin-A</Link>
        </div>
        <div className="space-x-4">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          {/* Changed from "/verify" to "/synthesize" */}
          <Link to="/synthesize" className="hover:underline">
            Synthesize
          </Link>
          <Link to="/wallet" className="hover:underline">
            Wallet
          </Link>
          <Link to="/recall" className="hover:underline">Recall</Link> {/* new */}

        </div>
      </div>
    </nav>
  );
}

export default Navbar;
