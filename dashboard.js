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
    const totalDays = dateSet.size;
    const earned = [];

    // 🗓️ Time/Logging/Streak badges
    if (streak >= 7) earned.push('📆 7-Day Logger');
    if (streak >= 30) earned.push('🌿 30-Day Streak');
    if (streak >= 50) earned.push('🏅 50-Day Consistency');
    if (streak >= 100) earned.push('💯 100-Day Logger');
    if (streak >= 200) earned.push('🔥 200-Day Streak');
    if (streak >= 365) earned.push('🌍 1-Year Eco Legend');
    if (streak >= 15) earned.push('🌀 Streak Addict');

    // ♻️ Eco Habits
    if (meatFree >= 5) earned.push('🥦 Meat-Free Master');
    if (dairyFree >= 5) earned.push('🥛 Dairy-Free Champ');
    if (lowEnergy >= 5) earned.push('🔋 Low Energy Hero');
    if (lowEmission >= 3) earned.push('🪶 Carbon Cutter');
    if (noFlight) earned.push('🛫 No-Flight Week');

    // 🎯 Fun Badges
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) earned.push('🌙 Night Owl');
    if (hour >= 5 && hour < 7) earned.push('🌅 Early Bird');

    // 🎮 XP + Challenge
    firebase.database().ref(`users/${currentUser.uid}/xp`).once('value', xpSnap => {
      let xp = 0;
      xpSnap.forEach(c => xp += c.val().points || 0);
      if (xp >= 1000) earned.push('🎮 XP Hunter');
      if (xp >= 3000) earned.push('🧠 Eco Guru');

      firebase.database().ref(`users/${currentUser.uid}/challenges`).once('value', chSnap => {
        if (Object.keys(chSnap.val() || {}).length >= 3) {
          earned.push('🏆 Challenge Streaker');
        }

        // Leaderboard Topper
        firebase.database().ref('users').once('value', snap => {
          const list = [];
          snap.forEach(u => {
            let total = 0;
            u.child('xp').forEach(x => total += x.val().points || 0);
            list.push({ uid: u.key, xp: total });
          });
          list.sort((a, b) => b.xp - a.xp);
          if (list.slice(0, 3).some(u => u.uid === currentUser.uid)) {
            earned.push('🥇 Top 3 Leader');
          }

          badgeRef.once('value', bSnap => {
            const existing = bSnap.val() || {};
            const newOnes = earned.filter(b => !existing[b]);
            for (const b of newOnes) badgeRef.child(b).set(true);

            const all = [...new Set([...Object.keys(existing), ...newOnes])];
            container.innerHTML = '';
            all.forEach(b => container.innerHTML += `<span class="badge">${b}</span>`);
          });
        });
      });
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
firebase.database().ref('users').once('value', snapshot => {
  const leaderboard = [];

  snapshot.forEach(userSnap => {
    let xp = 0;
    userSnap.child('xp').forEach(x => xp += x.val().points || 0);

    const name = userSnap.child('username').val() || userSnap.key.slice(0, 6);
    leaderboard.push({ name, xp });
  });

  leaderboard.sort((a, b) => b.xp - a.xp);

  const list = document.getElementById('leaderboardList');
  list.innerHTML = '';
  leaderboard.slice(0, 10).forEach((entry, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    list.innerHTML += `<li>${medal} #${index + 1} - ${entry.name}: ${entry.xp} XP</li>`;
  });
});

