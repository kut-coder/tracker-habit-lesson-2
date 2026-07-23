"use strict";

const STORAGE_KEY = "habitTracker21Days_v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const landingSection = document.getElementById("landingSection");
const setupPanel = document.getElementById("setupPanel");
const habitInput = document.getElementById("habitInput");
const habitPreset = document.getElementById("habitPreset");
const startButton = document.getElementById("startButton");
const setupError = document.getElementById("setupError");
const heroStartButton = document.getElementById("heroStartButton");
const navStartButton = document.getElementById("navStartButton");

const trackerSection = document.getElementById("trackerSection");
const habitTitle = document.getElementById("habitTitle");
const habitMeta = document.getElementById("habitMeta");
const progressRing = document.getElementById("progressRing");
const progressPercent = document.getElementById("progressPercent");
const progressDays = document.getElementById("progressDays");
const completedCount = document.getElementById("completedCount");
const availableCount = document.getElementById("availableCount");
const totalDaysCount = document.getElementById("totalDaysCount");
const weekTitle = document.getElementById("weekTitle");
const prevWeekButton = document.getElementById("prevWeekButton");
const nextWeekButton = document.getElementById("nextWeekButton");
const daysGrid = document.getElementById("daysGrid");
const trackerMessage = document.getElementById("trackerMessage");
const completionBox = document.getElementById("completionBox");
const completionText = document.getElementById("completionText");
const completionButtons = document.getElementById("completionButtons");
const resetButton = document.getElementById("resetButton");

let state = loadState();
let visibleWeek = 0;

habitPreset.addEventListener("change", function () {
  if (habitPreset.value) habitInput.value = habitPreset.value;
});

startButton.addEventListener("click", startTracker);
resetButton.addEventListener("click", resetTracker);

heroStartButton.addEventListener("click", scrollToSetup);
navStartButton.addEventListener("click", scrollToSetup);

initAnchorNavigation();

prevWeekButton.addEventListener("click", function () {
  if (visibleWeek > 0) {
    visibleWeek -= 1;
    render();
  }
});

nextWeekButton.addEventListener("click", function () {
  const maxWeek = getMaximumVisibleWeek();
  if (visibleWeek < maxWeek) {
    visibleWeek += 1;
    render();
  }
});

function scrollToSetup() {
  habitInput.focus({ preventScroll: true });
  setupPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initAnchorNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      const hash = link.getAttribute("href");

      if (!hash || hash === "#") {
        if (landingSection.classList.contains("hidden")) {
          event.preventDefault();
          landingSection.classList.remove("hidden");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      const target = document.getElementById(hash.slice(1));
      if (!target) return;

      event.preventDefault();

      if (landingSection.contains(target) && landingSection.classList.contains("hidden")) {
        landingSection.classList.remove("hidden");
      }

      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function startTracker() {
  const habit = habitInput.value.trim();

  if (habit.length < 3) {
    showSetupError("Введите привычку длиной не менее трёх символов.");
    habitInput.focus();
    return;
  }

  const today = startOfDay(new Date());

  state = {
    habit,
    startDate: formatISODate(today),
    totalDays: 21,
    completedDays: [],
    decisionShown: false
  };

  visibleWeek = 0;
  saveState();
  hideSetupError();
  render();
}

function render() {
  if (!state) {
    landingSection.classList.remove("hidden");
    setupPanel.style.display = "block";
    trackerSection.classList.remove("visible");
    return;
  }

  landingSection.classList.add("hidden");
  setupPanel.style.display = "none";
  trackerSection.classList.add("visible");

  const todayIndex = getTodayIndex();
  const availableDays = Math.min(Math.max(todayIndex + 1, 1), state.totalDays);
  const completed = state.completedDays.filter(day => day <= state.totalDays).length;
  const percentage = Math.round((completed / state.totalDays) * 100);

  habitTitle.textContent = state.habit;
  habitMeta.textContent = `Начало: ${formatHumanDate(parseISODate(state.startDate))}. Можно отмечать сегодняшний и прошедшие дни, но не будущие.`;

  progressPercent.textContent = `${percentage}%`;
  progressRing.style.setProperty("--progress", percentage);
  progressRing.setAttribute("aria-valuenow", String(percentage));
  progressDays.textContent = `${completed} / ${state.totalDays}`;
  progressRing.classList.toggle("progress-ring--complete", percentage === 100);
  progressRing.classList.toggle("progress-ring--empty", percentage === 0);
  completedCount.textContent = completed;
  availableCount.textContent = availableDays;
  totalDaysCount.textContent = state.totalDays;

  const maxWeek = getMaximumVisibleWeek();
  if (visibleWeek > maxWeek) visibleWeek = maxWeek;

  renderWeek(todayIndex);
  renderMessage(todayIndex, completed);
  renderCompletion(todayIndex, completed);
}

function renderWeek(todayIndex) {
  const weekStart = visibleWeek * 7;
  const weekEnd = Math.min(weekStart + 7, state.totalDays);
  const weekNumber = visibleWeek + 1;

  weekTitle.textContent = `Неделя ${weekNumber}: дни ${weekStart + 1}–${weekEnd}`;
  daysGrid.innerHTML = "";

  for (let i = weekStart; i < weekEnd; i += 1) {
    const dayNumber = i + 1;
    const date = addDays(parseISODate(state.startDate), i);
    const isFuture = i > todayIndex;
    const isToday = i === todayIndex;
    const isCompleted = state.completedDays.includes(dayNumber);

    const card = document.createElement("article");
    card.className = "day-card";
    if (isFuture) card.classList.add("future");
    if (isToday) card.classList.add("today");
    if (isCompleted) card.classList.add("completed");

    const statusText = isFuture
      ? "Этот день пока недоступен"
      : isCompleted
        ? "Отмечено как выполненное"
        : isToday
          ? "Сегодняшний день"
          : "Можно отметить позже";

    card.innerHTML = `
      <div class="day-number">День ${dayNumber}</div>
      <div class="day-date">${formatShortDate(date)}</div>
      <div class="day-weekday">${formatWeekday(date)}</div>
      <label class="check-wrap">
        <input
          type="checkbox"
          data-day="${dayNumber}"
          ${isCompleted ? "checked" : ""}
          ${isFuture ? "disabled" : ""}
        >
        <span>Выполнено</span>
      </label>
      <div class="day-status">${statusText}</div>
    `;

    const checkbox = card.querySelector("input[type='checkbox']");
    checkbox.addEventListener("change", handleDayToggle);

    daysGrid.appendChild(card);
  }

  prevWeekButton.disabled = visibleWeek === 0;
  nextWeekButton.disabled = visibleWeek >= getMaximumVisibleWeek();
}

function handleDayToggle(event) {
  const dayNumber = Number(event.target.dataset.day);

  if (event.target.checked) {
    if (!state.completedDays.includes(dayNumber)) {
      state.completedDays.push(dayNumber);
    }
  } else {
    state.completedDays = state.completedDays.filter(day => day !== dayNumber);
  }

  state.completedDays.sort((a, b) => a - b);
  saveState();
  render();
}

function renderMessage(todayIndex, completed) {
  const currentDay = Math.min(Math.max(todayIndex + 1, 1), state.totalDays);
  const available = Math.min(Math.max(todayIndex + 1, 1), state.totalDays);
  const availableCompleted = state.completedDays.filter(day => day <= available).length;
  const currentPercentage = Math.round((availableCompleted / available) * 100);

  if (todayIndex < 0) {
    trackerMessage.textContent = "Период ещё не начался.";
    return;
  }

  if (todayIndex >= state.totalDays - 1) {
    trackerMessage.textContent = `Доступен весь период. Выполнено ${completed} из ${state.totalDays} дней.`;
    return;
  }

  if (currentPercentage === 100) {
    trackerMessage.textContent = `Отлично: все доступные дни отмечены. Сейчас идёт день ${currentDay} из ${state.totalDays}.`;
  } else if (currentPercentage >= 70) {
    trackerMessage.textContent = `Хороший темп: выполнено ${availableCompleted} из ${available} доступных дней. Пропуск не отменяет уже пройденный путь.`;
  } else {
    trackerMessage.textContent = `Выполнено ${availableCompleted} из ${available} доступных дней. Пропущенные дни можно отметить позже, если действие было выполнено.`;
  }
}

function renderCompletion(todayIndex, completed) {
  completionBox.classList.remove("visible");
  completionButtons.innerHTML = "";

  if (todayIndex < state.totalDays - 1) return;

  const percentage = Math.round((completed / state.totalDays) * 100);
  completionBox.classList.add("visible");

  if (state.totalDays === 21) {
    completionText.textContent = `Вы выполнили привычку ${completed} дней из 21. Результат — ${percentage}%. Это действие стало для вас привычным?`;

    const yesButton = createButton("Да, стало привычкой", "button-primary", function () {
      state = null;
      localStorage.removeItem(STORAGE_KEY);
      habitInput.value = "";
      habitPreset.value = "";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const noButton = createButton("Нет, продолжить ещё 7 дней", "button-secondary", function () {
      state.totalDays = 28;
      state.decisionShown = true;
      visibleWeek = 3;
      saveState();
      render();
    });

    completionButtons.append(yesButton, noButton);
  } else {
    completionText.textContent = `Дополнительные 7 дней завершены. Вы выполнили привычку ${completed} дней из 28. Результат — ${percentage}%. Теперь можно начать новую привычку или пройти этот путь заново.`;

    const newHabitButton = createButton("Выбрать новую привычку", "button-primary", function () {
      state = null;
      localStorage.removeItem(STORAGE_KEY);
      habitInput.value = "";
      habitPreset.value = "";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    completionButtons.append(newHabitButton);
  }
}

function createButton(text, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `button ${className}`;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function getMaximumVisibleWeek() {
  const todayIndex = getTodayIndex();
  const availableIndex = Math.min(Math.max(todayIndex, 0), state.totalDays - 1);
  return Math.floor(availableIndex / 7);
}

function getTodayIndex() {
  const start = parseISODate(state.startDate);
  const today = startOfDay(new Date());
  return Math.floor((today - start) / MS_PER_DAY);
}

let resetConfirmationTimer = null;

function resetTracker() {
  if (resetButton.dataset.confirmReset !== "true") {
    resetButton.dataset.confirmReset = "true";
    resetButton.textContent = "Нажмите ещё раз для подтверждения";
    trackerMessage.textContent =
      "Повторно нажмите кнопку в течение 5 секунд, чтобы удалить прогресс.";

    clearTimeout(resetConfirmationTimer);

    resetConfirmationTimer = setTimeout(function () {
      resetButton.dataset.confirmReset = "false";
      resetButton.textContent = "Начать заново";
      render();
    }, 5000);

    return;
  }

  clearTimeout(resetConfirmationTimer);

  state = null;
  visibleWeek = 0;
  localStorage.removeItem(STORAGE_KEY);
  habitInput.value = "";
  habitPreset.value = "";

  resetButton.dataset.confirmReset = "false";
  resetButton.textContent = "Начать заново";

  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSetupError(message) {
  setupError.textContent = message;
  setupError.classList.add("visible");
}

function hideSetupError() {
  setupError.textContent = "";
  setupError.classList.remove("visible");
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (!parsed.habit || !parsed.startDate || !Array.isArray(parsed.completedDays)) {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, numberOfDays) {
  const result = new Date(date);
  result.setDate(result.getDate() + numberOfDays);
  return result;
}

function formatISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatHumanDate(date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function formatWeekday(date) {
  const text = new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

render();
