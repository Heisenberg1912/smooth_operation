const tuning = require('../config/valuation-tuning.json');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function resolveTypologyClass(typology) {
  const lower = typology.toLowerCase().trim();
  const anchors = tuning.typologyAnchorsUsdPerSqm;

  for (const entry of Object.values(anchors)) {
    if (entry.aliases.some((alias) => lower.includes(alias))) {
      return entry.class;
    }
  }

  return 'Residential';
}

function resolveTypologyRates(typology) {
  const lower = typology.toLowerCase().trim();
  const anchors = tuning.typologyAnchorsUsdPerSqm;

  for (const entry of Object.values(anchors)) {
    if (entry.aliases.some((alias) => lower.includes(alias))) {
      return { base: entry.base, max: entry.max };
    }
  }

  const marketClass = resolveTypologyClass(typology);
  const fallback = tuning.typologyClassFallbackUsdPerSqm[marketClass];

  return fallback ?? { base: 800, max: 6000 };
}

function densityBand(density) {
  const lower = density.toLowerCase();
  if (lower.includes('high') || lower.includes('dense') || lower.includes('urban')) return 'high';
  if (lower.includes('low') || lower.includes('rural') || lower.includes('sparse')) return 'low';
  return 'medium';
}

function locationTier(location) {
  const lower = location.toLowerCase();
  if (tuning.locationSignals.ultraPrime.some((signal) => lower.includes(signal))) return 'ultraPrime';
  if (tuning.locationSignals.prime.some((signal) => lower.includes(signal))) return 'prime';
  if (tuning.locationSignals.budget.some((signal) => lower.includes(signal))) return 'budget';
  return 'standard';
}

function locationMultiplier(tier) {
  switch (tier) {
    case 'ultraPrime': return 2.8;
    case 'prime': return 1.6;
    case 'budget': return 0.55;
    default: return 1.0;
  }
}

function spreadForConfidence(confidence) {
  for (const band of tuning.spreadByConfidence) {
    if (confidence >= band.min) return band.spread;
  }
  return 0.42;
}

function computeValuation(input) {
  const warnings = [];
  const typology = input.categoryRow?.Typology ?? input.projectType ?? 'Residential';
  const marketClass = resolveTypologyClass(typology);
  const typologyRates = resolveTypologyRates(typology);
  const scaleKey = input.scale || 'Low-rise';

  const geoFactors = input.geoFactors || {};
  const comparableCount = geoFactors.comparable_properties_count ?? 0;
  const cityGrowthPct = geoFactors.city_growth_5y_percent ?? 0;
  const propertyGrowthPct = geoFactors.property_growth_percent ?? 0;
  const landGrowthPct = geoFactors.land_growth_percent ?? 0;
  const propertyAgeYears = geoFactors.property_age_years ?? 0;
  const resaleValuePct = geoFactors.resale_value_percent ?? 0;
  const roiPct = geoFactors.investment_roi_percent ?? 0;

  const areaDefaults = tuning.builtAreaSqmDefaults;
  const classDefaults = areaDefaults[marketClass] ?? areaDefaults.Residential;
  const builtArea = classDefaults[scaleKey] ?? classDefaults['Low-rise'] ?? 110;

  const band = input.geoFactors ? densityBand(input.geoFactors.population_density) : 'medium';
  const unitRates = tuning.unitRatesUsdPerSqm[marketClass];

  let unitRate = unitRates ? unitRates[band] ?? unitRates.medium ?? 1100 : 1100;
  unitRate *= input.location ? locationMultiplier(locationTier(input.location)) : 1;

  const typologyMid = (typologyRates.base + typologyRates.max) / 2;
  unitRate = unitRate * 0.6 + typologyMid * 0.4;

  const grossPropertyValue = builtArea * unitRate;
  const completionFactors = tuning.completionByStage;
  const completionFactor = completionFactors[input.stageLabel] ?? clamp(input.progressValue / 100, 0.08, 1);
  const isCompleted = input.status === 'completed' || input.stageLabel === 'Completed';

  const landAreaMultiplier = tuning.landAreaMultiplierByScale[scaleKey] ?? 1.5;
  const landRateMultiplier = tuning.landRateMultiplierByType[marketClass] ?? 0.5;
  const landArea = builtArea * landAreaMultiplier;
  const grossLandValue = landArea * (unitRate * landRateMultiplier);

  let confidence = tuning.confidence.base;

  if (!input.location) {
    confidence -= tuning.confidence.missingLocationPenalty;
    warnings.push('No location provided; valuation band widened.');
  }

  if (input.geoStatus === 'none' || input.geoStatus === 'denied') {
    confidence -= tuning.confidence.missingGpsPenalty;
  }

  if (comparableCount === 0) {
    confidence -= tuning.confidence.noComparablesPenalty;
    warnings.push('No comparable properties were available; estimates are more speculative.');
  } else if (comparableCount < tuning.limits.minComparablesForAnchor) {
    confidence -= tuning.confidence.fewComparablesPenalty;
    warnings.push('Comparable coverage is thin; the valuation range remains intentionally wide.');
  } else if (comparableCount >= tuning.limits.strongComparables) {
    confidence += tuning.confidence.strongComparablesBonus;
  }

  if (input.geoFactors) {
    const terrain = input.geoFactors.terrain.toLowerCase();
    const soil = input.geoFactors.soil_condition.toLowerCase();
    const hazardTerms = ['seismic', 'flood', 'landslide', 'erosion', 'unstable', 'marshy', 'soft'];
    const lowHazardTerms = ['flat', 'stable', 'firm', 'alluvial', 'loamy'];
    const isHighHazard = hazardTerms.some((term) => terrain.includes(term) || soil.includes(term));
    const isLowHazard = lowHazardTerms.some((term) => terrain.includes(term) || soil.includes(term));

    if (isHighHazard) {
      confidence -= tuning.confidence.highHazardPenalty;
      warnings.push('Terrain and soil signals introduce added execution risk into the valuation band.');        
    }
    if (isLowHazard) confidence += tuning.confidence.lowHazardBonus;

    const policy = input.geoFactors.policy_posture.toLowerCase();
    if (policy.includes('uncertain') || policy.includes('restrictive')) {
      confidence -= tuning.confidence.policyUncertainPenalty;
    }

    const zone = input.geoFactors.master_plan_zone.toLowerCase();
    const zoneMatch = zone.includes(marketClass.toLowerCase()) || zone.includes('mixed') || zone.includes('general');

    if (!zoneMatch && zone !== 'not inferred') {
      confidence -= tuning.confidence.zoneMismatchPenalty;
      warnings.push('The inferred master-plan zone may not align with the project type.');
    } else if (zoneMatch) {
      confidence += tuning.confidence.clearZoneFitBonus;
    }

    if (cityGrowthPct > 5 && propertyGrowthPct > 3) {
      confidence += tuning.confidence.stableGrowthBonus;
    }
  }

  confidence = clamp(confidence, tuning.limits.minConfidence, tuning.limits.maxConfidence);

  let spread = spreadForConfidence(confidence);
  if (comparableCount === 0) spread += tuning.haircuts.fallbackNoCompsExtraSpread;
  if (warnings.some((warning) => warning.toLowerCase().includes('risk'))) spread += tuning.haircuts.hazardExtraSpread;

  const lowSide = tuning.haircuts.lowSideExtra;
  const highSide = tuning.haircuts.highSideExtra;
  const propertyBase = isCompleted ? grossPropertyValue : grossPropertyValue * completionFactor;
  
  return {
    property: { low: Math.round(propertyBase * (1 - spread - lowSide)), high: Math.round(propertyBase * (1 + spread + highSide)) },
    land: { low: Math.round(grossLandValue * (1 - spread - lowSide)), high: Math.round(grossLandValue * (1 + spread + highSide)) },
    project: { low: Math.round((grossLandValue + propertyBase) * (1 - spread - lowSide)), high: Math.round((grossLandValue + propertyBase) * (1 + spread + highSide)) },
    confidence,
    warnings: warnings.slice(0, tuning.limits.maxWarningsForSpread),
    metrics: {
      comparableCount, cityGrowthPct, propertyGrowthPct, landGrowthPct, propertyAgeYears, resaleValuePct, roiPct
    }
  };
}

module.exports = { computeValuation };
