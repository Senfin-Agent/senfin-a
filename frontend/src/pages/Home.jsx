import React from 'react';

function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-2xl rounded-2xl p-10 max-w-xl w-full text-center animate-fade-in">
        <img
          src="/favicon.png"
          alt="Senfin-A Logo"
          className="mx-auto w-16 h-16 mb-6"
        />
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4">Welcome to Senfin-A</h1>
        <p className="text-gray-600 text-lg mb-8">
          {/* Your smart and secure financial assistant. Click "Verify" to get started. */}
        </p>
        {/* <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition duration-300">
          Verify
        </button> */}
      </div>
    </div>
  );
}

export default Home;
