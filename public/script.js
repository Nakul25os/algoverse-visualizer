// Keys used to store data in localStorage.
const USERS_KEY = "simpleUsers";
const SESSION_KEY = "loggedInUser";

// Wait until the page has fully loaded before running page-specific logic.
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "login") {
    setupLoginPage();
  } else if (page === "register") {
    setupRegisterPage();
  } else if (page === "home") {
    setupHomePage();
  }
});

function setupLoginPage() {
  const form = document.getElementById("loginForm");
  const messageBox = document.getElementById("loginMessage");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!username || !password) {
      showMessage(messageBox, "Please enter both username and password.", "error");
      return;
    }

    const users = getStoredUsers();
    const matchedUser = users.find(
      (user) => user.username === username && user.password === password
    );

    if (!matchedUser) {
      showMessage(messageBox, "Invalid username or password.", "error");
      return;
    }

    localStorage.setItem(SESSION_KEY, matchedUser.username);
    showMessage(messageBox, "Login successful. Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "home.html";
    }, 700);
  });
}

function setupRegisterPage() {
  const form = document.getElementById("registerForm");
  const messageBox = document.getElementById("registerMessage");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const confirmPassword = document
      .getElementById("confirmPassword")
      .value
      .trim();

    if (!username || !email || !password || !confirmPassword) {
      showMessage(messageBox, "Please fill in all fields.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      showMessage(messageBox, "Please enter a valid email address.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showMessage(messageBox, "Passwords do not match.", "error");
      return;
    }

    const users = getStoredUsers();
    const usernameExists = users.some((user) => user.username === username);

    if (usernameExists) {
      showMessage(messageBox, "That username is already registered.", "error");
      return;
    }

    users.push({ username, email, password });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    showMessage(messageBox, "Registration successful. Redirecting to login...", "success");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 900);
  });
}

function setupHomePage() {
  const currentUser = localStorage.getItem(SESSION_KEY);
  const welcomeText = document.getElementById("welcomeText");
  const logoutButton = document.getElementById("logoutButton");

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  welcomeText.textContent = currentUser;

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  });
}

function getStoredUsers() {
  const savedUsers = localStorage.getItem(USERS_KEY);
  return savedUsers ? JSON.parse(savedUsers) : [];
}

function isValidEmail(email) {
  // Simple email check that is easy for beginners to understand.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `message ${type}`;
}
