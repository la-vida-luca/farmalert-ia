import React from 'react';

interface DashboardPageProps {}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      <div className="dashboard-content">
        <p>Welcome to FarmAlert Dashboard</p>
      </div>
    </div>
  );
};

export default DashboardPage;
