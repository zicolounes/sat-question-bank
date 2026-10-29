import React from 'react';

const AdminContext = React.createContext(false);

export function AdminProvider({ isAdmin, children }) {
  return (
    <AdminContext.Provider value={Boolean(isAdmin)}>
      {children}
    </AdminContext.Provider>
  );
}

export function useIsAdmin() {
  return React.useContext(AdminContext);
}
