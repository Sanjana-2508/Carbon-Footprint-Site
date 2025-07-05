// Firebase config
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
document.querySelector('.theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
}

// 🔐 Auth Check
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    location.href = 'login.html';
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
      // Use the username or fallback to email prefix
      const displayName = snapshot.child('username').val() || user.email.split('@')[0];
      document.getElementById('username').textContent = displayName;

    loadXP();
    loadWeeklyXP();
    loadStreak(() => {
      loadBadges();
      loadNextBadge();
    });
    loadLeaderboard();
    });
  }
});

// 🚪 Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  firebase.auth().signOut().then(() => location.href = 'login.html');
});

// 🎮 XP and Level
function loadXP() {
  const ref = firebase.database().ref(`users/${currentUser.uid}/xp`);
  let xpTotal = 0;

  ref.once('value', snapshot => {
    snapshot.forEach(child => {
      xpTotal += child.val().points || 0;
    });

    const level = Math.floor(xpTotal / 500);
    const xpIntoLevel = xpTotal % 500;
    const percent = (xpIntoLevel / 500) * 100;

    document.getElementById('xp').textContent = xpTotal;
    document.getElementById('levelDisplay').textContent = `Level ${level}`;
    document.getElementById('xpFill').style.width = `${percent}%`;
  });
}

// Weekly XP
function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return d.getFullYear() + "-W" + String(1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7));
}

function loadWeeklyXP() {
  const week = getWeekKey();
  firebase.database().ref(`users/${currentUser.uid}/xp`).once('value', snap => {
    let weeklyXP = 0;
    snap.forEach(child => {
      const xpEntry = child.val();
      if (xpEntry.timestamp && getWeekKey(new Date(xpEntry.timestamp)) === week){
        weeklyXP += xpEntry.points || 0;
      }
    });

    // ✅ Save and also display it
    firebase.database().ref(`users/${currentUser.uid}/weeklyXP/${week}`).set(weeklyXP);
    document.getElementById('weeklyXP').textContent = weeklyXP; // ✅ FIXED DISPLAY
  });
}

// 🔥 Streak
function loadStreak(callback) {
  const ref = firebase.database().ref(`users/${currentUser.uid}/logs`);
  ref.once('value', snapshot => {
    const dateSet = new Set();
    snapshot.forEach(child => {
      const date = new Date(child.val().timestamp).toDateString();
      dateSet.add(date);
    });

    const dates = Array.from(dateSet).map(d => new Date(d)).sort((a, b) => a - b);
    let streak = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const diff = (dates[i] - dates[i - 1]) / 86400000;
      if (diff === 1) {
        streak++;
      } else break;
    }

    window.currentStreak = streak;
    document.getElementById('streak').textContent = streak;
    if (callback) callback();
  });
}

// 🏅 Badges
function loadBadges() {
  const ref = firebase.database().ref(`users/${currentUser.uid}/logs`);
  const badgeRef = firebase.database().ref(`users/${currentUser.uid}/badges`);
  const container = document.getElementById('badgeList');

  ref.once('value', snapshot => {
    let meatFree = 0, dairyFree = 0, lowEnergy = 0, lowEmission = 0, noFlight = true;
    const dateSet = new Set();
    snapshot.forEach(child => {
      const val = child.val();
      const date = new Date(val.timestamp).toDateString();
      dateSet.add(date);
      if (val.meat < 0.1) meatFree++;
      if (val.dairy < 0.1) dairyFree++;
      if (val.electricity < 5) lowEnergy++;
      if (val.total < 2) lowEmission++;
      if (val.flights > 0) noFlight = false;
    });

    const streak = window.currentStreak || 0;
    const earned = [];

    // 🔁 Streak & Time badges
    if (streak >= 7) earned.push('📆 7-Day Logger');
    if (streak >= 30) earned.push('🌿 30-Day Streak');
    if (streak >= 50) earned.push('🏅 50-Day Consistency');
    if (streak >= 100) earned.push('💯 100-Day Logger');
    if (streak >= 200) earned.push('🔥 200-Day Streak');
    if (streak >= 365) earned.push('🌍 1-Year Eco Legend');
    if (streak >= 15) earned.push('🌀 Streak Addict');

    // ♻️ Habit badges
    if (meatFree >= 5) earned.push('🥦 Meat-Free Master');
    if (dairyFree >= 5) earned.push('🥛 Dairy-Free Champ');
    if (lowEnergy >= 5) earned.push('🔋 Low Energy Hero');
    if (lowEmission >= 3) earned.push('🪶 Carbon Cutter');
    if (noFlight) earned.push('🛫 No-Flight Week');

    // 🎯 Fun badges
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) earned.push('🌙 Night Owl');
    if (hour >= 5 && hour < 7) earned.push('🌅 Early Bird');

    // 🎮 XP + Challenges
  firebase.database().ref(`users/${currentUser.uid}/xp`).once('value').then(xpSnap => {
     let xp = 0;
     xpSnap.forEach(x => {
    const points = parseFloat(x.val().points);
    if (!isNaN(points)) xp += points;
  });

  console.log("Total XP:", xp);

  if (xp >= 1000) earned.push('🎮 XP Hunter');
  if (xp >= 3000) earned.push('🧠 Eco Guru');


      return firebase.database().ref(`users/${currentUser.uid}/challenges`).once('value');
    }).then(chSnap => {
      if (Object.keys(chSnap.val() || {}).length >= 3) {
        earned.push('🏆 Challenge Streaker');
      }

      return firebase.database().ref('users').once('value');
    }).then(usersSnap => {
      const leaderboard = [];
      usersSnap.forEach(user => {
        let xp = 0;
        user.child('xp').forEach(x => xp += parseInt(x.val().points || 0));
        leaderboard.push({ uid: user.key, xp });
      });
      leaderboard.sort((a, b) => b.xp - a.xp);
      const top3 = leaderboard.slice(0, 3).map(u => u.uid);
      if (top3.includes(currentUser.uid)) {
        earned.push('🥇 Top 3 Leader');
      }

      return badgeRef.once('value');
    }).then(bSnap => {
      const already = bSnap.val() || {};
      const newBadges = earned.filter(b => !already[b]);

      // Save only new ones
      newBadges.forEach(b => badgeRef.child(b).set(true));

      const all = [...new Set([...Object.keys(already), ...newBadges])];
      container.innerHTML = '';
      all.forEach(b => {
        container.innerHTML += `<span class="badge">${b}</span>`;
      });

      console.log("Final badges shown:", all);
    });
  });
}

// 🎯 Next Badge Tracker
function loadNextBadge() {
  const badgeRef = firebase.database().ref(`users/${currentUser.uid}/badges`);
  const nextName = document.getElementById('nextBadgeName');
  const nextProgress = document.getElementById('nextBadgeProgress');
  const nextFill = document.getElementById('nextBadgeFill');

  badgeRef.once('value', snap => {
    const earned = snap.val() || {};
    const streak = window.currentStreak || 0;
    const streakBadges = [
      { name: '📆 7-Day Logger', threshold: 7 },
      { name: '🌿 30-Day Streak', threshold: 30 },
      { name: '🏅 50-Day Consistency', threshold: 50 },
      { name: '💯 100-Day Logger', threshold: 100 },
      { name: '🔥 200-Day Streak', threshold: 200 },
      { name: '🌍 1-Year Eco Legend', threshold: 365 }
    ];
    const next = streakBadges.find(b => !earned[b.name]);
    if (!next) {
      nextName.textContent = "🏆 All Streak Badges Unlocked!";
      nextProgress.textContent = "100%";
      nextFill.style.width = "100%";
      return;
    }
    const percent = Math.min(100, (streak / next.threshold) * 100).toFixed(1);
    nextName.textContent = next.name;
    nextProgress.textContent = `${percent}%`;
    nextFill.style.width = `${percent}%`;
  });
}

// 🏆 Leaderboard
function loadLeaderboard() {
  const weekKey = getCurrentWeek();
  const list = document.getElementById('leaderboardList');
  firebase.database().ref('users').once('value', snap => {
    const data = [];
    snap.forEach(user => {
      const name = user.child('username').val() || user.key.slice(0, 6);
      const weekly = user.child(`weeklyXP/${weekKey}`).val() || 0;
      data.push({ name, xp: weekly });
    });
    data.sort((a, b) => b.xp - a.xp);
    list.innerHTML = '';
    data.slice(0, 10).forEach((e, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      list.innerHTML += `<li>${medal} #${i + 1} - ${e.name}: ${e.xp} XP</li>`;
    });

    // Save top 1
    if (data.length > 0) {
      firebase.database().ref('leaderboardHistory').child(weekKey).set(data[0]);
    }
  });
}

// Last week’s top winner
function loadPreviousWinner() {
  const prevWeek = getLastWeek();
  const ref = firebase.database().ref(`leaderboardHistory/${prevWeek}`);
  ref.once('value', snap => {
    if (snap.exists()) {
      const w = snap.val();
      const div = document.getElementById('winner');
      div.innerHTML = `<p>🏅 Last Week's Winner: <strong>${w.name}</strong> with ${w.xp} XP!</p>`;
    }
  });
}

// Utils
function getCurrentWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return d.getFullYear() + "-W" + String(1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7));
}

function getLastWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getCurrentWeek(d);
}
