import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <BrowserRouter>
      {/* Top navigation */}
      <Navbar />

      {/* Main content area */}
      <div className="min-h-screen pt-16 pb-16">
        <AppRoutes />
      </div>

      {/* Footer */}
      <Footer />
    </BrowserRouter>
  );
}

export default App;
