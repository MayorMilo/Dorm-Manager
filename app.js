const GROUPS_URL = "groups.txt";
const BASE_WEEK_START = new Date("2024-01-07T00:00:00");
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const calendarGrid = document.getElementById("calendar-grid");
const weekTitle = document.getElementById("week-title");
const groupNumber = document.getElementById("group-number");
const groupMembers = document.getElementById("group-members");

let currentWeekStart = getWeekStart(new Date());
let groups = [];

function getWeekStart(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return start;
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatISO(date) {
  return date.toISOString().split("T")[0];
}

function getWeekOffset(weekStart) {
  const diffMs = weekStart.getTime() - BASE_WEEK_START.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

function loadAssignments() {
  return JSON.parse(localStorage.getItem("dorm-duty-assignments") || "{}");
}

function saveAssignments(assignments) {
  localStorage.setItem("dorm-duty-assignments", JSON.stringify(assignments));
}

function buildMemberCard(name) {
  const card = document.createElement("div");
  card.className = "member";
  card.textContent = name;
  card.draggable = true;
  card.addEventListener("dragstart", (event) => {
    card.classList.add("dragging");
    event.dataTransfer.setData("text/plain", name);
    event.dataTransfer.setData("source", "member-list");
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });
  return card;
}

function buildAssignmentCard(name, dayKey) {
  const card = document.createElement("div");
  card.className = "assignment";
  card.draggable = true;
  card.innerHTML = `${name} <span>Click to remove</span>`;
  card.addEventListener("click", () => {
    const assignments = loadAssignments();
    const weekAssignments = assignments[dayKey.week] || {};
    delete weekAssignments[dayKey.day];
    assignments[dayKey.week] = weekAssignments;
    saveAssignments(assignments);
    renderCalendar();
  });
  card.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", name);
    event.dataTransfer.setData("source", dayKey.day);
  });
  return card;
}

function renderGroup() {
  groupMembers.innerHTML = "";
  if (groups.length === 0) {
    groupMembers.textContent = "No groups found. Update groups.txt to add seniors.";
    return;
  }

  const weekOffset = getWeekOffset(currentWeekStart);
  const groupIndex = ((weekOffset % groups.length) + groups.length) % groups.length;
  const group = groups[groupIndex];

  groupNumber.textContent = group.number;
  group.members.forEach((member) => {
    groupMembers.appendChild(buildMemberCard(member));
  });
}

function buildDayCard(date, assignments) {
  const dayCard = document.createElement("div");
  dayCard.className = "day-card";
  const header = document.createElement("div");
  header.className = "day-header";

  const name = document.createElement("div");
  name.className = "day-name";
  name.textContent = DAYS[date.getDay()];

  const dateText = document.createElement("div");
  dateText.className = "day-date";
  dateText.textContent = formatDate(date);

  header.appendChild(name);
  header.appendChild(dateText);
  dayCard.appendChild(header);

  const dayKey = formatISO(date);
  const weekKey = formatISO(currentWeekStart);
  const dayAssignment = assignments[weekKey]?.[dayKey];

  if (dayAssignment) {
    dayCard.appendChild(buildAssignmentCard(dayAssignment, { week: weekKey, day: dayKey }));
  } else {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Drop a senior here.";
    dayCard.appendChild(empty);
  }

  dayCard.addEventListener("dragover", (event) => {
    event.preventDefault();
    dayCard.classList.add("drag-over");
  });

  dayCard.addEventListener("dragleave", () => {
    dayCard.classList.remove("drag-over");
  });

  dayCard.addEventListener("drop", (event) => {
    event.preventDefault();
    dayCard.classList.remove("drag-over");
    const nameText = event.dataTransfer.getData("text/plain");
    const source = event.dataTransfer.getData("source");
    if (!nameText) {
      return;
    }

    const currentAssignments = loadAssignments();
    const weekAssignments = currentAssignments[weekKey] || {};

    if (weekAssignments[dayKey] && source !== dayKey) {
      window.alert("This night already has a senior assigned.");
      return;
    }

    if (source && source !== "member-list" && source !== dayKey) {
      delete weekAssignments[source];
    }

    weekAssignments[dayKey] = nameText;
    currentAssignments[weekKey] = weekAssignments;
    saveAssignments(currentAssignments);
    renderCalendar();
  });

  return dayCard;
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  const weekStart = new Date(currentWeekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  weekTitle.textContent = `Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

  const assignments = loadAssignments();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    calendarGrid.appendChild(buildDayCard(date, assignments));
  }

  renderGroup();
}

function parseGroups(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [labelPart, membersPart] = line.split(":");
      const numberMatch = labelPart?.match(/Group\s*(\d+)/i);
      const number = numberMatch ? numberMatch[1] : `${index + 1}`;
      const members = membersPart
        ? membersPart.split(",").map((member) => member.trim()).filter(Boolean)
        : [];
      return { number, members };
    })
    .filter((group) => group.members.length > 0)
    .slice(0, 5);
}

async function loadGroups() {
  try {
    const response = await fetch(GROUPS_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load groups.");
    }
    const text = await response.text();
    groups = parseGroups(text);
  } catch (error) {
    groups = [];
  }
  renderGroup();
}

document.getElementById("prev-week").addEventListener("click", () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  renderCalendar();
});

document.getElementById("next-week").addEventListener("click", () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  renderCalendar();
});

renderCalendar();
loadGroups();
