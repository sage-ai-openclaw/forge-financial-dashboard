import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { TransactionsPage } from './pages/TransactionsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <span className="nav-icon">💰</span>
            <span>Financial Dashboard</span>
          </div>
          <ul className="nav-links">
            <li><Link to="/">Transactions</Link></li>
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<TransactionsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
