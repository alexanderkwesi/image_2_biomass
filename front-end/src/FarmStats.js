// FarmStats.jsx
import React from 'react';
import { 
  calculateBiomassStatus, 
  formatBiomass, 
  calculateGrazingDays 
} from '../utils/calculations';

const FarmStats = ({ biomass, herdSize, area }) => {
  const status = calculateBiomassStatus(biomass);
  const grazingDays = calculateGrazingDays(biomass, herdSize);
  
  return (
    <div className="farm-stats">
      <div className="stat-card" style={{ borderLeft: `4px solid ${status.color}` }}>
        <h3>Biomass Status</h3>
        <div className="stat-value" style={{ color: status.color }}>
          {status.status}
        </div>
        <p>{formatBiomass(biomass)}</p>
        <p className="recommendation">{status.recommendation}</p>
      </div>
      
      <div className="stat-card">
        <h3>Grazing Capacity</h3>
        <div className="stat-value">{grazingDays} days</div>
        <p>For {herdSize} animals</p>
      </div>
    </div>
  );
};

export default FarmStats;