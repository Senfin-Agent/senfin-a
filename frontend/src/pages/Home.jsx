import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="bg-white shadow-2xl rounded-3xl p-8 md:p-10 max-w-2xl w-full text-center transform transition-all duration-500 hover:shadow-3xl">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-100 rounded-full opacity-20 blur-xl"></div>
          <img
            src="/favicon.png"
            alt="Senfin-A Logo"
            className="relative mx-auto w-20 h-20 object-contain animate-pulse"
          />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent mb-6">
          Welcome to Senfin-A
        </h1>
        
        <div className="space-y-6 text-left">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h2 className="text-xl font-bold text-blue-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
              </svg>
              Privacy-Preserving Synthesis
            </h2>
            <p className="text-gray-700">
              Transform your real data into privacy-preserving synthetic data using Nillion's secure AI environment. All outputs and AI logs are stored in Recall, a blockchain-based storage system that keeps everything verifiable and tamper-proof.
            </p>
          </div>
          
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <h2 className="text-xl font-bold text-indigo-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
              Getting Started
            </h2>
            <p className="text-gray-700">
              To get started, go to the "Synthesize" page and upload a small JSON sample of your data. Our system will produce a new synthetic dataset in a single "agent index" bucket on Recall, along with any chain-of-thought logs.
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <h2 className="text-xl font-bold text-purple-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              Explore & Share
            </h2>
            <p className="text-gray-700">
              If you'd like to explore or purchase someone else's synthetic dataset, head over to the "Synthesized Data" section. Browse all generated files, select ones that interest you, and retrieve the data. Everyone benefits from shared insights without risking private information.
            </p>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link to="/synthesize" className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-1">
            Start Synthesizing Now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;