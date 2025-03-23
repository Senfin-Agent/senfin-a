import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-10 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md py-2' : 'bg-white/80 backdrop-blur-sm py-3'
    }`}>
      <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <img 
            src="/favicon.png" 
            alt="Senfin-A Logo" 
            className="w-8 h-8 mr-2"
          />
          <Link to="/" className="font-bold text-xl text-indigo-800 hover:text-indigo-600 transition-colors">
            Senfin-A
          </Link>
        </div>
        
        <div className="flex space-x-1 md:space-x-2">
          {[
            { path: "/", label: "Home" },
            { path: "/synthesize", label: "Synthesize" },
            // { path: "/recall", label: "Recall" },
            { path: "/agentindex", label: "Synthesized Data" }
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-lg transition-all ${
                location.pathname === item.path
                ? "bg-indigo-100 text-indigo-800 font-medium"
                : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;