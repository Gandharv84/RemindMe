import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { ToastContainer } from './components/common/Toast';
import { SmsEmailPreviewModal } from './components/common/SmsEmailPreviewModal';
import { LoginView } from './components/auth/LoginView';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { CustomerManagementView } from './components/customers/CustomerManagementView';
import { VehicleManagementView } from './components/vehicles/VehicleManagementView';
import { ServiceManagementView } from './components/services/ServiceManagementView';
import { InsuranceManagementView } from './components/insurance/InsuranceManagementView';
import { DocumentManagementView } from './components/documents/DocumentManagementView';
import { ReminderManagementView } from './components/reminders/ReminderManagementView';
import { NotificationHistoryView } from './components/notifications/NotificationHistoryView';
import { ServiceRequestsView } from './components/serviceRequests/ServiceRequestsView';
import { CustomerPortalView } from './components/customerPortal/CustomerPortalView';

const MainLayout: React.FC = () => {
  const { activeTab } = useApp();
  const { user, isCustomer } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If user is not logged in, show employee/user login screen
  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* Main Navbar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* App Workspace Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto max-h-[calc(100vh-64px)]">
          {isCustomer || activeTab === 'customerPortal' ? (
            <CustomerPortalView />
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'customers' && <CustomerManagementView />}
              {activeTab === 'vehicles' && <VehicleManagementView />}
              {activeTab === 'services' && <ServiceManagementView />}
              {activeTab === 'insurance' && <InsuranceManagementView />}
              {activeTab === 'documents' && <DocumentManagementView />}
              {activeTab === 'reminders' && <ReminderManagementView />}
              {activeTab === 'notifications' && <NotificationHistoryView />}
              {activeTab === 'serviceRequests' && <ServiceRequestsView />}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation for quick touch on phones */}
      <MobileNav />

      {/* Global Overlays & Modals */}
      <ToastContainer />
      <SmsEmailPreviewModal />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
