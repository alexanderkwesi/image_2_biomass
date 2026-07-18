// components/FarmsList.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getFarms, setFarmFilters, clearSelectedFarm } from '../actions/farmActions';
import { farmsSelectors } from '../reducers/farmsReducer';
import FarmCard from './FarmCard';
import FarmFilters from './FarmFilters';
import FarmMap from './FarmMap';
import { showError } from '../utils/notifications';

const FarmsList: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const {
    farms,
    loading,
    error,
    filters,
    pagination,
    mapView,
  } = useSelector((state: any) => ({
    farms: farmsSelectors.getPaginatedFarms(state),
    loading: farmsSelectors.getLoading(state),
    error: farmsSelectors.getError(state),
    filters: farmsSelectors.getFilters(state),
    pagination: farmsSelectors.getPagination(state),
    mapView: farmsSelectors.getMapView(state),
  }));

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Load farms on mount
  useEffect(() => {
    dispatch(getFarms({ filters, pagination }));
  }, [dispatch, filters, pagination.page]);

  // Handle errors
  useEffect(() => {
    if (error) {
      showError(`Failed to load farms: ${error}`);
    }
  }, [error]);

  // Handle farm selection
  const handleSelectFarm = useCallback((farmId: string | number) => {
    navigate(`/farms/${farmId}`);
  }, [navigate]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<FarmFilters>) => {
    dispatch(setFarmFilters(newFilters));
  }, [dispatch]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    dispatch(setFarmFilters({})); // Triggers pagination reset
  }, [dispatch]);

  // Clear selection when leaving
  useEffect(() => {
    return () => {
      dispatch(clearSelectedFarm());
    };
  }, [dispatch]);

  if (loading && farms.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading farms...</p>
      </div>
    );
  }

  return (
    <div className="farms-container">
      <div className="farms-header">
        <h1>My Farms</h1>
        <div className="view-toggle">
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            <i className="icon-list"></i> List View
          </button>
          <button
            className={viewMode === 'map' ? 'active' : ''}
            onClick={() => setViewMode('map')}
          >
            <i className="icon-map"></i> Map View
          </button>
        </div>
        <button
          className="add-farm-button"
          onClick={() => navigate('/farms/new')}
        >
          + Add New Farm
        </button>
      </div>

      <FarmFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {viewMode === 'list' ? (
        <>
          <div className="farms-grid">
            {farms.length === 0 ? (
              <div className="empty-state">
                <i className="icon-farm"></i>
                <h3>No farms found</h3>
                <p>Try adjusting your filters or add a new farm.</p>
              </div>
            ) : (
              farms.map(farm => (
                <FarmCard
                  key={farm.id}
                  farm={farm}
                  onSelect={handleSelectFarm}
                />
              ))
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page === pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <FarmMap
          center={mapView.center}
          zoom={mapView.zoom}
          farms={farms}
          onFarmSelect={handleSelectFarm}
          onMapMove={(center, zoom) => dispatch(setMapView({ center, zoom }))}
        />
      )}

      {loading && farms.length > 0 && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default FarmsList;