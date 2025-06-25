// Your Firebase config here...
const firebaseConfig = {
  apiKey: "AIzaSyDKDLRuBviRlcU8dOfCgmEk1KjKp4gT9Wc",
  authDomain: "ecotrack-e50f8.firebaseapp.com",
  databaseURL: "https://ecotrack-e50f8-default-rtdb.firebaseio.com",
  projectId: "ecotrack-e50f8",
  storageBucket: "ecotrack-e50f8.appspot.com",
  messagingSenderId: "806396695933",
  appId: "1:806396695933:web:6abdba4efa8527ddc52814"
};
firebase.initializeApp(firebaseConfig);

let currentUser = null;

// 🌗 Theme Toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.createElement('button');
  toggle.textContent = '🌓 Toggle Theme';
  toggle.className = 'theme-toggle';
  document.body.appendChild(toggle);

  toggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  });

  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
});

// 🔐 Auth State
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    currentUser = user;

    const userRef = firebase.database().ref(`users/${user.uid}`);
    userRef.once('value').then(snapshot => {
      if (!snapshot.child('username').exists()) {
        const username = prompt("Enter your preferred username:");
        if (username) {
          userRef.update({ username });
        }
      }
      // Display username
      const displayName = snapshot.child('username').val() || user.email.split('@')[0];
      document.getElementById('usernameDisplay').textContent = displayName;

    loadPreviousLogs();
    loadAverageStats();
    loadLineChart();
    loadBadges();
    loadStreak();
    loadWeeklyChallenge();
   });
  }
});

// 🚪 Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  firebase.auth().signOut().then(() => window.location.href = 'login.html');
});

// 🌱 Form Submission
document.getElementById('carbonForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const travel = parseFloat(document.getElementById('travel').value) || 0;
  const electricity = parseFloat(document.getElementById('electricity').value) || 0;
  const flights = parseFloat(document.getElementById('flights').value) || 0;
  const meat = parseFloat(document.getElementById('meat').value) || 0;
  const dairy = parseFloat(document.getElementById('dairy').value) || 0;
  const plant = parseFloat(document.getElementById('plant').value) || 0;

  const carEmission = travel * 0.12;
  const elecEmission = electricity * 0.5;
  const flightEmission = flights * 90;
  const meatEmission = meat * 0.027;
  const dairyEmission = dairy * 0.013;
  const plantEmission = plant * 0.005;
  const total = carEmission + elecEmission + flightEmission + meatEmission + dairyEmission + plantEmission;

  const emissions = { Car: carEmission, Electricity: elecEmission, Flights: flightEmission, Meat: meatEmission, Dairy: dairyEmission, Plant: plantEmission };

  // XP system
  const xp = Math.max(0, Math.round(100 - total));
  firebase.database().ref(`users/${currentUser.uid}/xp`).push({
    timestamp: new Date().toISOString(),
    points: xp
  });
  document.getElementById('xpFill').style.width = `${Math.min(100, xp)}%`;

  // Suggestions
  const suggestions = [];
  if (carEmission > 5) suggestions.push("🚗 Your car travel emissions are high. Try walking, biking, carpooling, or using public transport for short and routine trips to significantly reduce emissions.");
  if (elecEmission > 5) suggestions.push("💡 Electricity use is on the higher side. Consider turning off appliances when not in use, using LED lights, and minimizing air conditioning usage.");
  if (flightEmission > 1) suggestions.push("✈️ Flights have a high environmental impact. Combine trips, avoid short-haul flights, and opt for trains or virtual meetings where possible.");
  if (meatEmission > 2) suggestions.push("🥩 Meat consumption has a large carbon footprint. Try integrating more plant-based meals into your week, even 1-2 days can make a difference.");
  if (dairyEmission > 2) suggestions.push("🐄 Dairy also contributes to emissions. Try opting for non-dairy alternatives sometimes (Eg- Oat milk, Almond milk, Coconut milk instead of Cow Milk).");
  if (plantEmission > 5) suggestions.push("🌿 Even plant based food have footprint. Try going for something local or seasonal plants when available instead of importing herbs and plants.");

  document.getElementById('suggestions').innerHTML = suggestions.length
    ? `<h4>Suggestions:</h4><ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>`
    : '<h4>🎉 Great job! Your emissions are minimal today!</h4>';

  document.getElementById('result').innerHTML = `<h3>Total: ${total.toFixed(2)} kg CO₂</h3>`;

  // Emission Chart
  const ctx = document.getElementById('emissionChart').getContext('2d');
  if (window.emissionChartInstance) window.emissionChartInstance.destroy();
  window.emissionChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(emissions),
      datasets: [{
        label: 'Kg CO₂',
        data: Object.values(emissions),
        backgroundColor: ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#1abc9c']
      }]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Carbon Emissions Breakdown' } }
    }
  });

  const log = {
    timestamp: new Date().toISOString(),
    car: carEmission,
    electricity: elecEmission,
    flights: flightEmission,
    meat: meatEmission,
    dairy: dairyEmission,
    plant: plantEmission,
    total
  };

  firebase.database().ref(`users/${currentUser.uid}/logs`).push(log);

  if (total < 20) {
  launchConfetti();
  }
  checkWeeklyChallenge(log);
  this.reset();
});

// Weekly Challenges Definitions
const weeklyChallenges = [
  {
    id: 'meat_under_100',
    description: '🚫 Keep your meat intake under 100g/day for 5 days this week!',
    condition: log => log.meat < 100
  },
  {
    id: 'no_flights',
    description: '✈️ Avoid flights this week!',
    condition: log => log.flights === 0
  },
  {
    id: 'low_electricity',
    description: '💡 Keep electricity use under 5kWh/day for 5 days!',
    condition: log => log.electricity < 5
  },
  {
    id: 'low_car_travel',
    description: '🚶‍♂️ Drive less than 2 km per day for 5 days!',
    condition: log => log.car < 0.25
  }
];

// ✅ Load Weekly Challenge
function loadWeeklyChallenge() {
  const weekKey = getISOWeek(new Date());
  const challengeRef = firebase.database().ref(`users/${currentUser.uid}/challenges/${weekKey}`);

  challengeRef.once('value', snapshot => {
    let challengeData;

    if (snapshot.exists()) {
      const data = snapshot.val();
      challengeData = weeklyChallenges.find(c => c.id === data.id) || weeklyChallenges[0];
    } else {
      challengeData = weeklyChallenges[Math.floor(Math.random() * weeklyChallenges.length)];
      challengeRef.set({ id: challengeData.id, description: challengeData.description });
    }

    window.currentChallenge = challengeData;
    const challengePara = document.querySelector('#challenges p');
    if (challengePara) {
    challengePara.textContent = challengeData.description;
    }
  });
}

// ✅ Check Weekly Challenge Progress
function checkWeeklyChallenge(log) {
  const weekKey = getISOWeek(new Date(log.timestamp));
  const challenge = window.currentChallenge;
  if (!challenge || !challenge.condition) return;

  const ref = firebase.database().ref(`users/${currentUser.uid}/challengeProgress/${weekKey}`);
  ref.once('value', snapshot => {
    let daysMet = snapshot.val() || 0;
    if (challenge.condition(log)) {
      daysMet++;
      firebase.database().ref(`users/${currentUser.uid}/challengeProgress/${weekKey}`).set(daysMet);
    }

    if (daysMet >= 5 && log.total < 20) {
      document.getElementById('challenges').innerHTML = `
        <h3>🎉 Weekly Challenge Completed!</h3>
        <p>${challenge.description}</p>
      `;
      launchConfetti();
    }
  });
}

// 🎉 Confetti Celebration
function launchConfetti() {
  const end = Date.now() + 3 * 1000;
  const interval = setInterval(() => {
    if (Date.now() > end) return clearInterval(interval);
    confetti({
      particleCount: 50,
      spread: 360,
      origin: { x: Math.random(), y: Math.random() - 0.2 }
    });
  }, 300);
}

// 📋 Previous Logs
function loadPreviousLogs() {
  const ref = firebase.database().ref(`users/${currentUser.uid}/logs`);
  const logList = document.getElementById('logHistory');
  ref.limitToLast(10).on('value', snapshot => {
    logList.innerHTML = '';
    snapshot.forEach(child => {
      const log = child.val();
      const date = new Date(log.timestamp).toLocaleDateString();
      const li = document.createElement('li');
      li.textContent = `${date} – ${log.total.toFixed(2)} kg CO₂`;
      logList.appendChild(li);
    });
  });
}

// 📊 Average Stats
function loadAverageStats() {
  const ref = firebase.database().ref(`users/${currentUser.uid}/logs`);
  ref.once('value', snapshot => {
    let total = 0, count = 0;
    snapshot.forEach(child => {
      if (typeof child.val().total === 'number') {
        total += child.val().total;
        count++;
      }
    });
    const avg = count > 0 ? (total / count).toFixed(2) : '0.00';
    document.getElementById('averageStats').innerHTML = `<p>📊 Average Emission: ${avg} kg CO₂</p>`;
  });
}

// 📈 Trend Chart
function loadLineChart() {
  const ref = firebase.database().ref(`users/${currentUser.uid}/logs`);
  ref.on('value', snapshot => {
    const labels = [], data = [];
    snapshot.forEach(child => {
      const log = child.val();
      labels.push(new Date(log.timestamp).toLocaleDateString());
      data.push(log.total);
    });

    const ctx = document.getElementById('trendChart').getContext('2d');
    if (window.trendChartInstance) window.trendChartInstance.destroy();
    window.trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Total Emissions',
          data,
          borderColor: '#27ae60',
          fill: false
        }]
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Emission Trend' } }
      }
    });
  });
}

// 🔥 Streak
function loadStreak() {
  const ref = firebase.database().ref(`users/${currentUser.uid}/logs`);
  ref.once('value', snapshot => {
    const dates = new Set();
    snapshot.forEach(child => {
      const d = new Date(child.val().timestamp).toDateString();
      dates.add(d);
    });
    const sorted = Array.from(dates).sort((a, b) => new Date(b) - new Date(a));
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      if ((prev - curr) / 86400000 === 1) streak++;
      else break;
    }
    document.getElementById('streakCount').textContent = `🔥 ${streak}-day streak!`;
  });
}

// 🏅 Badges
function loadBadges() {
  const ref = firebase.database().ref(`users/${currentUser.uid}/logs`);
  const badgeContainer = document.getElementById('badges');

  ref.once('value', snapshot => {
    let meatFreeDays = 0;
    let dairyFreeDays = 0;
    let lowEmissionDays = 0;
    let lowEnergyDays = 0;
    let noFlightWeek = true;

    const uniqueDates = new Set();
    const dateList = [];

    snapshot.forEach(child => {
      const log = child.val();
      const dateStr = new Date(log.timestamp).toDateString();
      uniqueDates.add(dateStr);
      dateList.push(new Date(log.timestamp));

      if (log.meat < 0.1) meatFreeDays++;
      if (log.dairy < 0.1) dairyFreeDays++;
      if (log.total < 2) lowEmissionDays++;
      if (log.electricity < 5) lowEnergyDays++;
      if (log.flights > 0) noFlightWeek = false;
    });

    // 📅 Total unique logging days
    const totalDays = uniqueDates.size;

    // 🔁 Streak calculation
    const sortedDates = [...uniqueDates].map(d => new Date(d)).sort((a, b) => a - b);
    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (sortedDates[i] - sortedDates[i - 1]) / 86400000;
      if (diff === 1) streak++;
      else streak = 1;
    }

    const earned = [];

    // 🌱 Streak & consistency
    if (totalDays >= 7) earned.push('📆 7-Day Logger');
    if (totalDays >= 30) earned.push('🌿 30-Day Streak');
    if (totalDays >= 50) earned.push('🏅 50-Day Consistency');

    // 💯 Every 100-day milestone
    const milestoneIcons = ['💯', '🔥', '⚡', '⭐', '🌟', '🏅', '🌀'];
    const hundredMilestones = Math.floor(totalDays / 100);
    for (let i = 1; i <= hundredMilestones; i++) {
      const icon = milestoneIcons[i % milestoneIcons.length];
      earned.push(`${icon} ${i * 100}-Day Streak`);
    }

    if (totalDays >= 365) earned.push('🌍 1-Year Eco Legend');

    // ♻️ Eco habits
    if (meatFreeDays >= 5) earned.push('🥦 Meat-Free Master');
    if (dairyFreeDays >= 5) earned.push('🥛 Dairy-Free Champ');
    if (lowEmissionDays >= 3) earned.push('🪶 Carbon Cutter');
    if (lowEnergyDays >= 5) earned.push('🔋 Low Energy Hero');
    if (noFlightWeek) earned.push('🛫 No-Flight Week');

    // 🕹 XP + Challenges
    firebase.database().ref(`users/${currentUser.uid}/xp`).once('value', xpSnap => {
      let totalXP = 0;
      xpSnap.forEach(x => totalXP += x.val().points || 0);
      if (totalXP >= 1000) earned.push('🎮 XP Hunter');

      firebase.database().ref(`users/${currentUser.uid}/challenges`).once('value', chSnap => {
        if (Object.keys(chSnap.val() || {}).length >= 3) {
          earned.push('🏆 Challenge Streaker');
        }

        // 🌙 Fun ones (based on current hour)
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 4) earned.push('🌙 Night Owl');
        if (hour >= 5 && hour < 7) earned.push('🌅 Early Bird');

        // 🔄 Save and show
        firebase.database().ref(`users/${currentUser.uid}/badges`).once('value', bSnap => {
          const already = bSnap.val() || {};
          const newBadges = earned.filter(b => !already[b]);

          for (const badge of newBadges) {
            firebase.database().ref(`users/${currentUser.uid}/badges/${badge}`).set(true);
          }

          const allBadges = [...new Set([...Object.keys(already), ...newBadges])];
          badgeContainer.innerHTML = '';
          allBadges.forEach(b => {
            badgeContainer.innerHTML += `<span class="badge">${b}</span>`;
          });
        });
      });
    });
  });
}

// 🗓️ Week Compare
document.getElementById('compareBtn').addEventListener('click', compareWeeks);
function compareWeeks() {
  const ref = firebase.database().ref(`users/${currentUser.uid}/logs`);
  ref.once('value', snapshot => {
    const logs = {};
    snapshot.forEach(child => {
      const log = child.val();
      const date = new Date(log.timestamp);
      const week = getISOWeek(date);
      const year = date.getFullYear();
      const key = `${year}-W${week}`;
      if (!logs[key]) logs[key] = { car: 0, electricity: 0, meat: 0, dairy: 0, plant: 0, flights: 0, total: 0, count: 0 };
      for (let k in log) {
        if (logs[key][k] !== undefined) logs[key][k] += log[k];
      }
      logs[key].count++;
    });

    const sorted = Object.keys(logs).sort().reverse();
    if (sorted.length < 2) {
      document.getElementById('weeklyMessage').innerText = "📊 Not enough data to compare two weeks.";
      return;
    }

    const [thisWeek, lastWeek] = [logs[sorted[0]], logs[sorted[1]]];
    const change = thisWeek.total - lastWeek.total;
    const percent = ((change / lastWeek.total) * 100).toFixed(1);
    const summary = change < 0
      ? `⬇️ Great job! Emissions decreased by ${Math.abs(percent)}%.`
      : `⬆️ Emissions increased by ${percent}%. Try adjusting habits.`;

    const diff = {
      car: thisWeek.car - lastWeek.car,
      electricity: thisWeek.electricity - lastWeek.electricity,
      meat: thisWeek.meat - lastWeek.meat,
      dairy: thisWeek.dairy - lastWeek.dairy,
      plant: thisWeek.plant - lastWeek.plant,
      flights: thisWeek.flights - lastWeek.flights
    };

    const top = Object.entries(diff).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    const suggestion = generateCategoryTip(top[0], top[1]);

    document.getElementById('weeklyMessage').innerHTML = `
      <p><strong>${summary}</strong></p>
      <p>🔍 Largest change: <strong>${top[0]}</strong> (${top[1].toFixed(2)} kg)</p>
      <p>💡 ${suggestion}</p>
    `;

    const ctx = document.getElementById('weeklyChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Car', 'Electricity', 'Meat', 'Dairy', 'Plant', 'Flights'],
        datasets: [
          {
            label: 'This Week',
            data: [thisWeek.car, thisWeek.electricity, thisWeek.meat, thisWeek.dairy, thisWeek.plant, thisWeek.flights],
            backgroundColor: '#2ecc71'
          },
          {
            label: 'Last Week',
            data: [lastWeek.car, lastWeek.electricity, lastWeek.meat, lastWeek.dairy, lastWeek.plant, lastWeek.flights],
            backgroundColor: '#e74c3c'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Weekly Emission Comparison' } }
      }
    });
  });
}

// 📅 Week Calculation
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return d.getFullYear() + "-W" + String(1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7));
}

// 💡 Suggestions based on Week
function generateCategoryTip(category, change) {
  const up = change > 0;
  const tips = {
    car: up ? "🚗 Drive less or carpool." : "✅ Great reduction in car use!",
    electricity: up ? "💡 Use energy-saving appliances." : "✅ Efficient energy use!",
    meat: up ? "🥩 Reduce meat consumption." : "✅ Good on cutting meat!",
    dairy: up ? "🐄 Consider dairy-free options." : "✅ Lower dairy footprint!",
    plant: up ? "🌿 Choose local produce." : "✅ Awesome plant-based balance!",
    flights: up ? "✈️ Avoid short flights if possible." : "✅ Fewer flights—great!"
  };
  return tips[category] || "👍 Keep going green!";
}
