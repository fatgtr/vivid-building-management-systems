import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const BuildingContext = createContext();

export const useBuildingContext = () => {
  const context = useContext(BuildingContext);
  if (!context) {
    throw new Error('useBuildingContext must be used within BuildingProvider');
  }
  return context;
};

export const BuildingProvider = ({ children }) => {
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [user, setUser] = useState(null);
  const [managedBuildings, setManagedBuildings] = useState([]);

  const { data: allBuildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  useEffect(() => {
    base44.auth.me()
      .then(userData => {
        setUser(userData);
        
        // If user is admin, they can see all buildings
        if (userData.role === 'admin') {
          setManagedBuildings(allBuildings);
          if (allBuildings.length > 0 && !selectedBuildingId) {
            setSelectedBuildingId(allBuildings[0].id);
          }
        } else {
          // Filter buildings by managed_building_strata_plans
          const managedStrataPlanNumbers = userData.managed_building_strata_plans || [];
          const filtered = allBuildings.filter(b => 
            managedStrataPlanNumbers.includes(b.strata_plan_number)
          );
          setManagedBuildings(filtered);
          
          // Auto-select if only one building
          if (filtered.length === 1) {
            setSelectedBuildingId(filtered[0].id);
          } else if (filtered.length > 1 && !selectedBuildingId) {
            setSelectedBuildingId(filtered[0].id);
          }
        }
      })
      .catch(() => {});
  }, [allBuildings, selectedBuildingId]);

  const value = {
    selectedBuildingId,
    setSelectedBuildingId,
    managedBuildings,
    user,
    isAdmin: user?.role === 'admin',
  };

  return (
    <BuildingContext.Provider value={value}>
      {children}
    </BuildingContext.Provider>
  );
};