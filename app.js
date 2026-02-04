const GROUPS_URL = "groups.txt";
const BASE_WEEK_START = new Date("2024-01-07T00:00:00");
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DUTY_ASSIGNMENTS_KEY = "dorm-duty-assignments";
const DUTY_GROUPS_KEY = "dorm-duty-groups";
const CHORE_ASSIGNMENTS_KEY = "dorm-chore-assignments";
const CHORE_GROUPS_KEY = "dorm-chore-groups";
const DEFAULT_CHORE_GROUPS = `Group 1: Upper and Lower Hall Bathroom, Front Trash, Lower Hall Trash
Group 2: Upper Hall Trash, Lower Hall Sweep, Lobby Wipe Down
Group 3: Laundry Room Check, Kitchen Counters, Back Stairwell`;

const calendarGrid = document.getElementById("calendar-grid");
const choresGrid = document.getElementById("chores-grid");
const weekTitle = document.getElementById("week-title");
const groupNumber = document.getElementById("group-number");
const groupMembers = document.getElementById("group-members");
const choreGroupNumber = document.getElementById("chore-group-number");
const choreMembers = document.getElementById("chore-members");
const editGroupsButton = document.getElementById("edit-groups");
const groupEditor = document.getElementById("group-editor");
const groupEditorInput = document.getElementById("group-editor-input");
const saveGroupsButton = document.getElementById("save-groups");
const cancelGroupsButton = document.getElementById("cancel-groups");
const resetGroupsButton = document.getElementById("reset-groups");
const editChoresButton = document.getElementById("edit-chores");
const choreEditor = document.getElementById("chore-editor");
const choreEditorInput = document.getElementById("chore-editor-input");
const saveChoresButton = document.getElementById("save-chores");
const cancelChoresButton = document.getElementById("cancel-chores");

let currentWeekStart = getWeekStart(new Date());
let groups = [];
let choreGroups = [];
let latestDutyGroupText = "";
let latestChoreGroupText = DEFAULT_CHORE_GROUPS;

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
  return JSON.parse(localStorage.getItem(DUTY_ASSIGNMENTS_KEY) || "{}");
}

function saveAssignments(assignments) {
  localStorage.setItem(DUTY_ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

function loadChoreAssignments() {
  return JSON.parse(localStorage.getItem(CHORE_ASSIGNMENTS_KEY) || "{}");
}

function saveChoreAssignments(assignments) {
  localStorage.setItem(CHORE_ASSIGNMENTS_KEY, JSON.stringify(assignments));
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

function buildChoreCard(name) {
  const card = document.createElement("div");
  card.className = "member";
  card.textContent = name;
  card.draggable = true;
  card.addEventListener("dragstart", (event) => {
    card.classList.add("dragging");
    event.dataTransfer.setData("text/plain", name);
    event.dataTransfer.setData("source", "chore-list");
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
  card.innerHTML = `<span class="assignment-remove">Click to remove</span>
    <span class="assignment-name">${name}</span>`;
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

function buildChoreAssignmentCard(name, dayKey) {
  const card = document.createElement("div");
  card.className = "assignment";
  card.draggable = true;
  card.innerHTML = `<span class="assignment-remove">Click to remove</span>
    <span class="assignment-name">${name}</span>`;
  card.addEventListener("click", () => {
    const assignments = loadChoreAssignments();
    const weekAssignments = assignments[dayKey.week] || {};
    delete weekAssignments[dayKey.day];
    assignments[dayKey.week] = weekAssignments;
    saveChoreAssignments(assignments);
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

function renderChoreGroup() {
  choreMembers.innerHTML = "";
  if (choreGroups.length === 0) {
    choreMembers.textContent = "No chore groups found. Add chores to get started.";
    return;
  }

  const weekOffset = getWeekOffset(currentWeekStart);
  const groupIndex = ((weekOffset % choreGroups.length) + choreGroups.length) % choreGroups.length;
  const group = choreGroups[groupIndex];

  choreGroupNumber.textContent = group.number;
  group.members.forEach((member) => {
    choreMembers.appendChild(buildChoreCard(member));
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

function buildChoreDayCard(date, assignments) {
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
    dayCard.appendChild(buildChoreAssignmentCard(dayAssignment, { week: weekKey, day: dayKey }));
  } else {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Drop a chore here.";
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

    const currentAssignments = loadChoreAssignments();
    const weekAssignments = currentAssignments[weekKey] || {};

    if (weekAssignments[dayKey] && source !== dayKey) {
      window.alert("This day already has a chore assigned.");
      return;
    }

    if (source && source !== "chore-list" && source !== dayKey) {
      delete weekAssignments[source];
    }

    weekAssignments[dayKey] = nameText;
    currentAssignments[weekKey] = weekAssignments;
    saveChoreAssignments(currentAssignments);
    renderCalendar();
  });

  return dayCard;
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  choresGrid.innerHTML = "";
  const weekStart = new Date(currentWeekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  weekTitle.textContent = `Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

  const assignments = loadAssignments();
  const choreAssignments = loadChoreAssignments();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    calendarGrid.appendChild(buildDayCard(date, assignments));
    choresGrid.appendChild(buildChoreDayCard(date, choreAssignments));
  }

  renderGroup();
  renderChoreGroup();
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

function parseList(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function loadGroups() {
  const storedGroups = localStorage.getItem(DUTY_GROUPS_KEY);
  if (storedGroups) {
    latestDutyGroupText = storedGroups;
    groups = parseGroups(storedGroups);
    renderGroup();
    return;
  }

  try {
    const response = await fetch(GROUPS_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load groups.");
    }
    const text = await response.text();
    latestDutyGroupText = text;
    groups = parseGroups(text);
  } catch (error) {
    groups = [];
  }
  renderGroup();
}

function loadChoreGroups() {
  const storedGroups = localStorage.getItem(CHORE_GROUPS_KEY);
  latestChoreGroupText = storedGroups || DEFAULT_CHORE_GROUPS;
  choreGroups = parseGroups(latestChoreGroupText);
  renderChoreGroup();
}

function openEditor(editor, input, value) {
  editor.classList.add("is-open");
  editor.setAttribute("aria-hidden", "false");
  input.value = value;
  input.focus();
}

function closeEditor(editor) {
  editor.classList.remove("is-open");
  editor.setAttribute("aria-hidden", "true");
}

editGroupsButton.addEventListener("click", () => {
  openEditor(groupEditor, groupEditorInput, latestDutyGroupText);
});

saveGroupsButton.addEventListener("click", () => {
  const value = groupEditorInput.value.trim();
  if (!value) {
    window.alert("Please enter at least one group line.");
    return;
  }
  localStorage.setItem(DUTY_GROUPS_KEY, value);
  latestDutyGroupText = value;
  groups = parseGroups(value);
  renderGroup();
  closeEditor(groupEditor);
});

cancelGroupsButton.addEventListener("click", () => {
  closeEditor(groupEditor);
});

resetGroupsButton.addEventListener("click", () => {
  localStorage.removeItem(DUTY_GROUPS_KEY);
  loadGroups();
  closeEditor(groupEditor);
});

editChoresButton.addEventListener("click", () => {
  openEditor(choreEditor, choreEditorInput, latestChoreGroupText);
});

saveChoresButton.addEventListener("click", () => {
  const value = choreEditorInput.value.trim();
  if (!value) {
    window.alert("Please enter at least one chore group line.");
    return;
  }
  localStorage.setItem(CHORE_GROUPS_KEY, value);
  latestChoreGroupText = value;
  choreGroups = parseGroups(value);
  renderChoreGroup();
  closeEditor(choreEditor);
});

cancelChoresButton.addEventListener("click", () => {
  closeEditor(choreEditor);
});

document.getElementById("prev-week").addEventListener("click", () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  renderCalendar();
});

document.getElementById("next-week").addEventListener("click", () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  renderCalendar();
});

loadGroups();
loadChoreGroups();
