import React, { useState, useMemo } from 'react';
import { AlertTriangle, Check, X, Database, Activity, Users, Package, TrendingUp, BarChart, ChevronRight } from 'lucide-react';

// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

interface CountryData {
  hospitalAdmissions: boolean;
  excessMortality: boolean;
  deathCounts: boolean;
  comorbidityData: boolean;
  contactSurvey: boolean;
  regionalMatrices: boolean;
  demographicProxies: boolean;
  coldChainInventory: boolean;
  facilityTypes: boolean;
  electricityAccess: boolean;
  trustIndices: boolean;
  behavioralSurveys: boolean;
}

interface CountryProxies {
  region: string;
  urbanizationRate: number;
  householdSize: number;
}

interface Country {
  name: string;
  data: CountryData;
  proxies: CountryProxies;
}

interface Tier {
  level: number;
  name: string;
  dataKey: string | null;
  quality: number;
  output: string;
}

interface Module {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  tiers: Tier[];
}

interface ModuleAssessment extends Module {
  selectedTier: Tier;
}

// =========================================================================
// DATA DEFINITIONS
// =========================================================================

const countries: Record<string, Country> = {
  nigeria: {
    name: 'Nigeria (LMIC)',
    data: {
      hospitalAdmissions: false,
      excessMortality: false,
      deathCounts: true,
      comorbidityData: true,
      contactSurvey: false,
      regionalMatrices: true,
      demographicProxies: true,
      coldChainInventory: false,
      facilityTypes: true,
      electricityAccess: true,
      trustIndices: true,
      behavioralSurveys: false,
    },
    proxies: { region: 'West Africa', urbanizationRate: 0.52, householdSize: 4.5 }
  },
  vietnam: {
    name: 'Vietnam (LMIC Success)',
    data: {
      hospitalAdmissions: false,
      excessMortality: false,
      deathCounts: true,
      comorbidityData: true,
      contactSurvey: false,
      regionalMatrices: true,
      demographicProxies: true,
      coldChainInventory: false,
      facilityTypes: true,
      electricityAccess: true,
      trustIndices: true,
      behavioralSurveys: false,
    },
    proxies: { region: 'South-East Asia', urbanizationRate: 0.38, householdSize: 3.5 }
  },
  italy: {
    name: 'Italy (HIC Ideal)',
    data: {
      hospitalAdmissions: true,
      excessMortality: true,
      deathCounts: true,
      comorbidityData: true,
      contactSurvey: true,
      regionalMatrices: true,
      demographicProxies: true,
      coldChainInventory: true,
      facilityTypes: true,
      electricityAccess: true,
      trustIndices: true,
      behavioralSurveys: true,
    },
    proxies: { region: 'Europe', urbanizationRate: 0.69, householdSize: 2.4 }
  }
};

const MODULES: Module[] = [
  {
    id: 'severity', name: 'Disease Severity', icon: Activity,
    tiers: [
      { level: 1, name: 'Hospital Admissions', dataKey: 'hospitalAdmissions', quality: 5, output: 'Optimal - Direct calibration to hospital burden' },
      { level: 2, name: 'Excess Mortality', dataKey: 'excessMortality', quality: 3, output: 'Good - Indirect severity estimation' },
      { level: 3, name: 'Comorbidity-Adjusted IFR', dataKey: 'comorbidityData', quality: 2, output: 'Acceptable - Literature-based with adjustments (e.g., *Lancet Global Health* method)' },
      { level: 4, name: 'Death Counts Only', dataKey: 'deathCounts', quality: 1, output: 'Minimal - High uncertainty, all parameters from literature' }
    ]
  },
  {
    id: 'contacts', name: 'Contact Patterns', icon: Users,
    tiers: [
      { level: 1, name: 'Empirical Survey', dataKey: 'contactSurvey', quality: 5, output: 'Optimal - Country-specific mixing patterns (e.g., POLYMOD survey)' },
      { level: 2, name: 'Regional Matrices', dataKey: 'regionalMatrices', quality: 4, output: 'Good - Uses regional matrices (Prem et al.) scaled by age structure' },
      { level: 3, name: 'Demographic Proxies', dataKey: 'demographicProxies', quality: 2, output: 'Acceptable - Built from Urban/Rural split, school enrolment, household size' },
      { level: 4, name: 'Global Defaults', dataKey: null, quality: 1, output: 'Minimal - Generic Covasim defaults' }
    ]
  },
  {
    id: 'operations', name: 'Operational Constraints', icon: Package,
    tiers: [
      { level: 1, name: 'Cold Chain Inventory', dataKey: 'coldChainInventory', quality: 5, output: 'Optimal - Explicit capacity constraints by facility and storage type' },
      { level: 2, name: 'Proxy Framework (Novel)', dataKey: 'facilityTypes', quality: 3, output: 'Novel - Uses Facility types, Electricity/GDP proxies to estimate reliability and **propose buffer strategies**' },
      { level: 3, name: 'Facility Counts', dataKey: null, quality: 1, output: 'Minimal - Assumes equal capacity per facility; allocation is coarse' }
    ]
  },
  {
    id: 'behavior', name: 'Behavioural Compliance', icon: TrendingUp,
    tiers: [
      { level: 1, name: 'Time-Series Surveys', dataKey: 'behavioralSurveys', quality: 5, output: 'Optimal - Real-time compliance measures (masking, distancing, vaccine uptake)' },
      { level: 2, name: 'Trust + Education Proxies', dataKey: 'trustIndices', quality: 3, output: 'Good - Uses government trust, education, and NPI history to parameterise compliance decay' },
      { level: 3, name: 'Literature Defaults', dataKey: null, quality: 1, output: 'Minimal - Uses static assumption of 50% average compliance' }
    ]
  }
];

// =========================================================================
// HELPER LOGIC (Framework Decision Tree)
// =========================================================================

const selectModuleTier = (module: Module, data: CountryData): Tier => {
  for (let tier of module.tiers) {
    if (tier.dataKey && data[tier.dataKey as keyof CountryData]) {
      return tier;
    }
  }
  return module.tiers[module.tiers.length - 1];
};

// =========================================================================
// REACT COMPONENT
// =========================================================================

const MCMFramework: React.FC = () => {
  const [selectedCountryKey, setSelectedCountryKey] = useState<string>('nigeria');
  const selectedCountry = countries[selectedCountryKey];
  const data = selectedCountry.data;

  const assessment = useMemo(() => {
    const modulesAssessment: ModuleAssessment[] = MODULES.map((module) => ({
      ...module,
      selectedTier: selectModuleTier(module, data),
    }));

    const totalScore = modulesAssessment.reduce((sum, mod) => sum + mod.selectedTier.quality, 0);
    const maxScore = MODULES.reduce((sum, mod) => sum + Math.max(...mod.tiers.map(t => t.quality)), 0);
    const qualityPercentage = Math.round((totalScore / maxScore) * 100);

    let qualityStatus = 'LOW QUALITY';
    let statusColor = 'text-red-600 bg-red-50';
    let StatusIconComponent = AlertTriangle;

    if (qualityPercentage >= 75) {
      qualityStatus = 'HIGH QUALITY';
      statusColor = 'text-green-600 bg-green-50';
      StatusIconComponent = Check;
    } else if (qualityPercentage >= 50) {
      qualityStatus = 'MEDIUM QUALITY';
      statusColor = 'text-yellow-600 bg-yellow-50';
      StatusIconComponent = AlertTriangle;
    } else if (qualityPercentage >= 30) {
      qualityStatus = 'LOW QUALITY';
      statusColor = 'text-orange-600 bg-orange-50';
      StatusIconComponent = AlertTriangle;
    } else {
      qualityStatus = 'INSUFFICIENT DATA';
      statusColor = 'text-red-600 bg-red-50';
      StatusIconComponent = X;
    }

    return { 
      modulesAssessment, 
      totalScore, 
      maxScore, 
      qualityPercentage, 
      qualityStatus, 
      statusColor, 
      StatusIconComponent 
    };
  }, [selectedCountryKey, data]);

  const StatusIcon = assessment.StatusIconComponent;

  return (
    <div className="p-4 sm:p-8 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Generalisable MCM Allocation Framework
          </h1>
          <p className="text-xl text-gray-600">
            The <strong>Plug-and-Play Toolkit</strong> for Policy-Relevant Modelling in LMICs.
          </p>
        </div>

        {/* Country Selection & Summary */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <label htmlFor="country-select" className="block text-sm font-medium text-gray-700">
                Select Country Profile:
              </label>
              <select
                id="country-select"
                value={selectedCountryKey}
                onChange={(e) => setSelectedCountryKey(e.target.value)}
                className="mt-1 block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm border"
              >
                {Object.keys(countries).map(key => (
                  <option key={key} value={key}>{countries[key].name}</option>
                ))}
              </select>
            </div>

            <div className={`flex items-center p-4 rounded-lg w-full sm:w-80 ${assessment.statusColor}`}>
              <StatusIcon className="h-6 w-6 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Assessment Summary</p>
                <p className="text-2xl font-bold">
                  {assessment.qualityPercentage}% Data Quality
                </p>
                <p className="text-sm font-semibold">
                  {assessment.qualityStatus} ({assessment.totalScore}/{assessment.maxScore})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Assessment */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
          <Database className="w-6 h-6 mr-2 text-indigo-600" /> Modular Assessment (Graceful Degradation)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {assessment.modulesAssessment.map(module => {
            const ModuleIcon = module.icon;
            return (
              <div key={module.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300 border-t-4 border-indigo-500">
                <div className="flex items-center mb-4">
                  <ModuleIcon className="w-6 h-6 mr-3 text-indigo-600" />
                  <h3 className="text-xl font-semibold text-gray-900">{module.name}</h3>
                </div>

                <div className="flex items-center space-x-3 mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <BarChart className="w-5 h-5 text-indigo-600" />
                  <div className="text-sm">
                    <p className="font-bold text-indigo-800">Selected Module: {module.selectedTier.name}</p>
                    <p className="text-indigo-700">
                      <span className="font-medium">Output Quality:</span> {module.selectedTier.output}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Data Requirements Checked:</p>
                  {module.tiers
                    .sort((a, b) => a.level - b.level)
                    .map(tier => {
                      const isAvailable = tier.dataKey && data[tier.dataKey as keyof CountryData];
                      const Icon = isAvailable ? Check : X;
                      const color = isAvailable ? 'text-green-500' : 'text-red-500';

                      return (
                        <div key={tier.level} className="flex items-center text-sm">
                          <Icon className={`w-4 h-4 mr-2 ${color}`} />
                          <span className="font-medium">Tier {tier.level}:</span>
                          <span className="ml-2 text-gray-600">
                            {tier.name}
                            {tier.dataKey ? ` (Requires ${tier.dataKey})` : ''}
                          </span>
                          {tier.level === module.selectedTier.level && (
                            <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-600 text-white">
                              USED
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Policy Insights */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <ChevronRight className="w-6 h-6 mr-2 text-indigo-600" /> Generalisability & Policy Insights
          </h2>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
            <p className="text-gray-700 mb-4">
              For <strong>{selectedCountry.name}</strong>, the framework identifies:
            </p>
            <ul className="list-disc list-inside space-y-3 pl-4">
              <li className="text-gray-800">
                <span className="font-semibold">Severity (Tier {assessment.modulesAssessment[0].selectedTier.level}):</span> Relies on <strong>Comorbidity-Adjusted IFR</strong> → requires rigorous <strong>Uncertainty Quantification</strong>.
              </li>
              <li className="text-gray-800">
                <span className="font-semibold">Contacts (Tier {assessment.modulesAssessment[1].selectedTier.level}):</span> Uses <strong>Regional Matrices</strong> → NPI effects inferred, not directly observed.
              </li>
              <li className="text-gray-800">
                <span className="font-semibold">Operations (Tier {assessment.modulesAssessment[2].selectedTier.level}):</span> Employs <strong>Novel Proxy Method</strong> → enables <strong>buffer allocation</strong> and <strong>geographic clustering</strong>.
              </li>
              <li className="text-gray-800">
                <span className="font-semibold">Behavior (Tier {assessment.modulesAssessment[3].selectedTier.level}):</span> Uses <strong>Trust + Education Proxies</strong> → initial uptake strategies prioritised.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCMFramework;