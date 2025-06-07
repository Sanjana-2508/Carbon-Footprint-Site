document.getElementById('carbonForm').addEventListener('submit', function(event) {
  event.preventDefault();

  // Get inputs
  const carKm = parseFloat(document.getElementById('travel').value) || 0;
  const electricityKwh = parseFloat(document.getElementById('electricity').value) || 0;
  const flightHours = parseFloat(document.getElementById('flights').value) || 0;
  const meatGrams = parseFloat(document.getElementById('meat').value) || 0;
  const dairyGrams = parseFloat(document.getElementById('dairy').value) || 0;
  const plantGrams = parseFloat(document.getElementById('plant').value) || 0;

  // Emission factors (kg CO2 per unit)
  const carFactor = 0.21;       
  const electricityFactor = 0.5; 
  const flightFactor = 90;      

  // Food emission factors per gram (kg CO2 per gram)
  const meatFactor = 0.027;     
  const dairyFactor = 0.013;    
  const plantFactor = 0.002;    

  // Calculate emissions
  const carEmission = carKm * carFactor;
  const electricityEmission = electricityKwh * electricityFactor;
  const flightEmission = flightHours * flightFactor;
  const meatEmission = meatGrams * meatFactor;
  const dairyEmission = dairyGrams * dairyFactor;
  const plantEmission = plantGrams * plantFactor;

  // Total emissions
  const totalEmission = carEmission + electricityEmission + flightEmission + meatEmission + dairyEmission + plantEmission;

  // Show total emission
  document.getElementById('result').innerHTML = `
    <p>Your estimated daily carbon footprint is <strong>${totalEmission.toFixed(2)} kg CO₂</strong>.</p>
  `;

  // Suggestion logic based on highest emission source
  let suggestionText = "";

  const emissions = {
    Car: carEmission,
    Electricity: electricityEmission,
    Flights: flightEmission,
    Meat: meatEmission,
    Dairy: dairyEmission,
    Plant: plantEmission,
  };

  const maxCategory = Object.keys(emissions).reduce((a, b) => emissions[a] > emissions[b] ? a : b);

  switch(maxCategory) {
    case 'Car':
      suggestionText = "🚗 Consider using public transport, biking, or carpooling to reduce car travel emissions.";
      break;
    case 'Electricity':
      suggestionText = "💡 Reduce electricity use by switching to LED lights, turning off unused devices, and using energy-efficient appliances.";
      break;
    case 'Flights':
      suggestionText = "✈️ Try to limit flights, choose direct routes, or offset emissions by supporting climate projects.";
      break;
    case 'Meat':
      suggestionText = "🥩 Reduce meat consumption or choose sustainably sourced meat.";
      break;
    case 'Dairy':
      suggestionText = "🥛 Reduce dairy intake or switch to plant-based alternatives.";
      break;
    case 'Plant':
      suggestionText = "🌿 Great job! Keep eating more plant-based foods to lower your carbon footprint.";
      break;
    default:
      suggestionText = "🌍 Keep up sustainable choices!";
  }

  document.getElementById('suggestions').innerHTML = `
    <p><strong>Suggestion to Reduce Your Carbon Footprint:</strong><br>${suggestionText}</p>
  `;

  // Draw bar chart with Chart.js for current day breakdown
  if (window.emissionChartInstance) {
    window.emissionChartInstance.destroy();
  }

  const ctx = document.getElementById('emissionChart').getContext('2d');

  window.emissionChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(emissions),
      datasets: [{
        label: 'Kg CO₂ emissions',
        data: Object.values(emissions),
        backgroundColor: [
          '#3498db', '#f39c12', '#e74c3c', '#9b59b6', '#2ecc71', '#95a5a6'
        ],
        borderRadius: 5,
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Kg CO₂',
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y.toFixed(2)} kg CO₂`
          }
        }
      }
    }
  });

  // --- New: Save today's total emission to localStorage for user ---

  const username = localStorage.getItem('ecoUser');
  if (username) {
    const storageKey = `${username}_footprints`;
    const today = new Date().toISOString().slice(0, 10);

    let data = JSON.parse(localStorage.getItem(storageKey)) || {};

    // Save today's emission
    data[today] = totalEmission;

    // Remove entries older than 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    for (const date in data) {
      if (new Date(date) < cutoff) {
        delete data[date];
      }
    }

    localStorage.setItem(storageKey, JSON.stringify(data));
    
    // Update historical chart
    renderHistoricalChart(data);
  }

  // Reset the form after submit
  this.reset();
});

// --- Historical chart for last 30 days ---

let historicalChartInstance;

function renderHistoricalChart(data) {
  const ctx2 = document.getElementById('historicalChart').getContext('2d');
  const dates = Object.keys(data).sort((a,b) => new Date(a) - new Date(b));
  const values = dates.map(date => data[date]);

  if (historicalChartInstance) {
    historicalChartInstance.destroy();
  }

  historicalChartInstance = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Daily Carbon Footprint (kg CO₂)',
        data: values,
        borderColor: '#2c3e50',
        fill: false,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { title: { display: true, text: 'kg CO₂' }, beginAtZero: true }
      },
      responsive: true,
      maintainAspectRatio: false,
    }
  });
}

// --- On page load, load saved data and render historical chart ---

window.addEventListener('load', () => {
  const username = localStorage.getItem('ecoUser');
  if (!username) return;

  const storageKey = `${username}_footprints`;
  const savedData = JSON.parse(localStorage.getItem(storageKey)) || {};

  if (Object.keys(savedData).length > 0) {
    renderHistoricalChart(savedData);
  }
});

