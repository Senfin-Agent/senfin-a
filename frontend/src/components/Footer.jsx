import React from 'react';

function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-white border-t py-3">
      <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Senfin Agent.
      </div>
    </footer>
  );
}

export default Footer;
