import { db } from "./firebase.js";
import { 
  collection, getDocs, getDoc, doc, updateDoc, deleteDoc, addDoc, query, where 
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { auth } from './firebase.js';

// DOM Elements
const taskNameEl = document.getElementById("taskName");
const descEl = document.getElementById("description");
const assignToEl = document.getElementById("assignTo");
const endDateEl = document.getElementById("endDate");
const addBtn = document.getElementById("addTask");
const tableBody = document.querySelector("#taskTable tbody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const addSection = document.getElementById("addTaskSection");
const logoutBtn = document.getElementById("logoutBtn");
const forwardModal = document.getElementById("forwardModal");
const closeButton = document.querySelector(".close-button");
const forwardRoleSelect = document.getElementById("forwardRoleSelect");
const confirmForwardBtn = document.getElementById("confirmForwardBtn");
const historyModal = document.getElementById("historyModal");
const closeHistoryButton = document.querySelector(".close-history-button");
const historyContent = document.getElementById("historyContent");

// Global Variables
let tasks = [];
let currentUserEmail = "";
let currentUserRole = "";
let allRoles = [];
let currentTaskIdToForward = null;
let myTaskChart = null; // Chart instance

// 🔐 Auth state check
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  currentUserEmail = user.email;
  console.log("✅ 1. Logged in user:", currentUserEmail);

  try {
    const rolesSnap = await getDocs(collection(db, "roles"));
    allRoles = rolesSnap.docs.map(doc => doc.data());
    console.log("✅ 2. All roles fetched from Firestore:", allRoles);
  } catch (e) { console.error("❌ ERROR fetching 'roles' collection:", e); return; }

  try {
    const usersQuery = query(collection(db, "users"), where("email", "==", currentUserEmail));
    const userSnap = await getDocs(usersQuery);
    if (!userSnap.empty) {
      currentUserRole = userSnap.docs[0].data().role;
      console.log("✅ 3. Found current user's role:", currentUserRole);
    } else {
      currentUserRole = "Guest";
      console.error("❌ ERROR: User role not found for email:", currentUserEmail);
    }
  } catch(e) { console.error("❌ ERROR fetching 'users' collection:", e); return; }

  if (currentUserRole === 'GM') {
    addSection.style.display = "block";
    document.getElementById("userManagementSection").style.display = "block";
    await resetForm();
    renderUserManagementTable();
  } else if (currentUserRole && currentUserRole !== 'Guest') {
    addSection.style.display = "block";
    document.getElementById("userManagementSection").style.display = "none";
    await resetForm();
  } else {
    addSection.style.display = "none";
    document.getElementById("userManagementSection").style.display = "none";
  }

  await renderTasks();
});

async function resetForm() {
  taskNameEl.value = "";
  descEl.value = "";
  assignToEl.value = "";
  endDateEl.value = "";
  document.getElementById("taskNameCount").textContent = "0/10";
  document.getElementById("descriptionCount").textContent = "0/30";
  taskNameEl.disabled = false;
  descEl.disabled = true;
  assignToEl.disabled = true;
  endDateEl.disabled = true;
  addBtn.disabled = true;
  
  // 👇 YEH NAYA CODE HAI JO PAST DATE KO ROKEGA 👇
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1); // Agle din se shuru karo
  const minDate = tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  endDateEl.setAttribute('min', minDate);
  
  // Baaki ka code waise hi rahega
  const currentUserLevelDoc = allRoles.find(role => role.name.trim().toLowerCase() === currentUserRole.trim().toLowerCase());
  if (!currentUserLevelDoc) { /* ... */ };
  const currentUserLevel = currentUserLevelDoc.level;
  const assignableRoles = allRoles.filter(role => parseInt(role.level) === parseInt(currentUserLevel) + 1);
  assignToEl.innerHTML = '<option value="">Assign To</option>';
  assignableRoles.forEach(role => {
    const opt = document.createElement("option");
    opt.value = role.name;
    opt.textContent = role.name;
    assignToEl.appendChild(opt);
  });
  
  taskNameEl.dispatchEvent(new Event("input"));
  descEl.dispatchEvent(new Event("input"));
}

// 🧾 Render tasks
async function renderTasks() {
  try {
    const snapshot = await getDocs(collection(db, "tasks"));
    tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    tableBody.innerHTML = "";
    const filtered = tasks.filter(t => {
      const taskName = t.name || '';
      const assignedTo = t.assignedTo || '';
      const assignerRole = (t.assignedBy && t.assignedBy.role) ? t.assignedBy.role : '';

      const matchesSearch = taskName.toLowerCase().includes(searchInput.value.toLowerCase());
      const matchesStatus = statusFilter.value ? t.status === statusFilter.value : true;
      
      const isGM = currentUserRole === 'GM';
      const isAssignedToMe = assignedTo.toLowerCase() === currentUserRole.toLowerCase();
      const iAmTheAssigner = assignerRole.toLowerCase() === currentUserRole.toLowerCase();
      const visibleToUser = isGM || isAssignedToMe || iAmTheAssigner;
      
      return matchesSearch && matchesStatus && visibleToUser;
    });

    filtered.forEach(task => {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td data-label="Task">${task.name || 'N/A'}</td>
          <td data-label="Description">${task.desc || 'N/A'}</td>
          <td data-label="Assigned To">${task.assignedTo || 'N/A'}</td>
          <td data-label="Assigned By">${task.assignedBy ? task.assignedBy.role : 'N/A'}</td>
          <td data-label="Status">
              <select onchange="updateStatus('${task.id}', this.value)">
                  <option ${task.status === "Pending" ? "selected" : ""}>Pending</option>
                  <option ${task.status === "Ongoing" ? "selected" : ""}>Ongoing</option>
                  <option ${task.status === "Completed" ? "selected" : ""}>Completed</option>
              </select>
          </td>
          <td data-label="Rating">
              ${task.status === "Completed" && currentUserRole === 'GM' ? getRatingDropdown(task.id, task.rating) : task.rating || "—"}
          </td>
          <td data-label="Assign Date">${task.assignDate || 'N/A'}</td>
          <td data-label="End Date">${task.endDate || 'N/A'}</td>
          <td data-label="Comments">
              <div class="comments-section" id="comments-${task.id}">
                  ${(task.comments || []).map(c => {
                      const user = c.role || c.user || 'Unknown';
                      const text = c.text || '[No text]';
                      return `<p><b>${user}:</b> ${text}</p>`;
                  }).join("")}
              </div>
              <div class="comment-input">
                  <input type="text" id="commentInput-${task.id}" placeholder="Add a comment..."/>
                  <button onclick="addComment('${task.id}')">Add</button>
              </div>
          </td>
          <td data-label="Actions">
    <button onclick="viewHistory('${task.id}')">View History</button>

    ${task.assignedTo === currentUserRole && canCurrentUserForward() ? `
    <button onclick="showForwardModal('${task.id}')">Forward</button>
    ` : ''}

   
    ${currentUserRole === 'GM' || (task.assignedBy && task.assignedBy.email === currentUserEmail) ? `
    <button onclick="editTask('${task.id}')">Edit</button>
    <button onclick="withdrawTask('${task.id}')">Delete</button>
    ` : ''}
</td>
      `;
      tableBody.appendChild(row);
    });
    
    // Chart ko update karo
    renderTaskChart();

  } catch (e) {
    console.error("❌ ERROR rendering tasks:", e);
  }
}

// 📊 Chart banane ka function
function renderTaskChart() {
  const ctx = document.getElementById('taskStatusChart').getContext('2d');
  const pendingCount = tasks.filter(task => task.status === 'Pending').length;
  const ongoingCount = tasks.filter(task => task.status === 'Ongoing').length;
  const completedCount = tasks.filter(task => task.status === 'Completed').length;

  if (myTaskChart) {
    myTaskChart.destroy();
  }

  myTaskChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Pending', 'Ongoing', 'Completed'],
      datasets: [{
        label: 'Task Status',
        data: [pendingCount, ongoingCount, completedCount],
        backgroundColor: [
          'rgba(255, 159, 64, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgba(255, 159, 64, 1)', 'rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Current Task Distribution' }
      }
    }
  });
}

// ➕ Add Task
addBtn.addEventListener("click", async () => {
  if (!currentUserRole || currentUserRole === "Guest") { return alert("You do not have permission."); }
  if (!taskNameEl.value || !descEl.value || !assignToEl.value || !endDateEl.value) { return alert("Please complete all fields."); }
  
  const task = {
    name: taskNameEl.value, desc: descEl.value, assignedTo: assignToEl.value,
    assignDate: new Date().toISOString().split('T')[0], endDate: endDateEl.value, status: "Pending",
    rating: "", comments: [],
    history: [{ action: `Created and assigned to ${assignToEl.value}`, by: currentUserRole, email: currentUserEmail, timestamp: new Date() }],
    assignedBy: { email: currentUserEmail, role: currentUserRole }
  };
  
  await addDoc(collection(db, "tasks"), task);
  await renderTasks();
  await resetForm();
});

// User Management Functions
async function renderUserManagementTable() {
  const userTableBody = document.querySelector("#userManagementTable tbody");
  if (!userTableBody) return;
  userTableBody.innerHTML = "";
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.forEach(userDoc => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const row = document.createElement("tr");
      let rolesDropdownHTML = `<select id="roleSelect-${userId}">`;
      allRoles.forEach(role => {
        const isSelected = role.name === userData.role ? "selected" : "";
        rolesDropdownHTML += `<option value="${role.name}" ${isSelected}>${role.name}</option>`;
      });
      rolesDropdownHTML += `</select>`;
      row.innerHTML = `
        <td>${userData.name || 'N/A'}</td><td>${userData.email}</td><td>${userData.role}</td>
        <td>${rolesDropdownHTML}</td>
        <td><button onclick="updateUserRole('${userId}', 'roleSelect-${userId}')">Save Role</button></td>`;
      userTableBody.appendChild(row);
    });
  } catch (error) { console.error("Error fetching users for management table:", error); }
}
window.updateUserRole = async function(userId, selectElementId) {
  const newRole = document.getElementById(selectElementId).value;
  if (!newRole) { return alert("Please select a role."); }
  if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) { return; }
  try {
    await updateDoc(doc(db, "users", userId), { role: newRole });
    alert(`User role updated to ${newRole} successfully!`);
    renderUserManagementTable();
  } catch (error) { console.error("Error updating user role:", error); alert("Failed to update role."); }
}

// Modal Functions and Listeners
window.showForwardModal = function(taskId) {
  currentTaskIdToForward = taskId;
  const currentUserLevelDoc = allRoles.find(role => role.name === currentUserRole);
  const currentUserLevel = currentUserLevelDoc.level;
  const assignableRoles = allRoles.filter(role => parseInt(role.level) === parseInt(currentUserLevel) + 1);
  forwardRoleSelect.innerHTML = '<option value="">Select Role to Forward</option>';
  if (assignableRoles.length === 0) {
    forwardRoleSelect.innerHTML = '<option value="">(No one to forward to)</option>';
  } else {
    assignableRoles.forEach(role => {
      const opt = document.createElement("option");
      opt.value = role.name;
      opt.textContent = role.name;
      forwardRoleSelect.appendChild(opt);
    });
  }
  forwardModal.style.display = "block";
}
closeButton.onclick = function() { forwardModal.style.display = "none"; }
window.addEventListener = function(event) { if (event.target == forwardModal) { forwardModal.style.display = "none"; } }
confirmForwardBtn.addEventListener('click', async () => {
  const selectedRole = forwardRoleSelect.value;
  if (!selectedRole) { return alert("Please select a role to forward."); }
  try {
    const taskRef = doc(db, "tasks", currentTaskIdToForward);
    const taskSnap = await getDoc(taskRef);
    const taskData = taskSnap.data();
    const newHistoryEntry = { action: `Forwarded from ${taskData.assignedTo} to ${selectedRole}`, by: currentUserRole, email: currentUserEmail, timestamp: new Date() };
    const updatedHistory = [...(taskData.history || []), newHistoryEntry];
    await updateDoc(taskRef, {
      assignedTo: selectedRole,
      assignedBy: { email: currentUserEmail, role: currentUserRole },
      history: updatedHistory
    });
    alert(`Task successfully forwarded to ${selectedRole}`);
    forwardModal.style.display = "none";
    await renderTasks();
  } catch (error) { console.error("Error forwarding task:", error); alert("Failed to forward task."); }
});

// 🚪 Logout, Character counters, and Filter listeners
logoutBtn.addEventListener("click", () => { signOut(auth).then(() => { window.location.href = "login.html"; }); });
taskNameEl.addEventListener("input", () => {
  const len = taskNameEl.value.length;
  document.getElementById("taskNameCount").textContent = `${len}/10`;
  descEl.disabled = len < 10;
});
descEl.addEventListener("input", () => {
  const len = descEl.value.length;
  document.getElementById("descriptionCount").textContent = `${len}/30`;
  assignToEl.disabled = len < 30;
});
assignToEl.addEventListener("change", () => { endDateEl.disabled = !assignToEl.value; });
endDateEl.addEventListener("change", () => { addBtn.disabled = !endDateEl.value; });
searchInput.addEventListener("input", renderTasks);
statusFilter.addEventListener("change", renderTasks);

// Global Helper Functions
function canCurrentUserForward() {
  const currentUserLevelDoc = allRoles.find(role => role.name === currentUserRole);
  if (!currentUserLevelDoc) return false;
  const assignableRoles = allRoles.filter(role => parseInt(role.level) === parseInt(currentUserLevelDoc.level) + 1);
  return assignableRoles.length > 0;
}
window.updateStatus = async function (id, newStatus) {
  const taskRef = doc(db, "tasks", id);
  const taskSnap = await getDoc(taskRef);
  const taskData = taskSnap.data();
  if (taskData.assignedTo !== currentUserRole && currentUserRole !== 'GM') {
    alert("Only the assigned user or GM can update the status.");
    return renderTasks();
  }
  const newHistory = [...(taskData.history || []), { action: `Status changed to ${newStatus}`, by: currentUserRole, email: currentUserEmail, timestamp: new Date() }];
  await updateDoc(taskRef, { status: newStatus, history: newHistory });
  await renderTasks();
};
function getRatingDropdown(id, selectedRating) {
  return `
    <select onchange="rateTask('${id}', this.value)">
      <option value="">Rate</option><option value="⭐" ${selectedRating === '⭐' ? 'selected' : ''}>⭐</option><option value="⭐⭐" ${selectedRating === '⭐⭐' ? 'selected' : ''}>⭐⭐</option><option value="⭐⭐⭐" ${selectedRating === '⭐⭐⭐' ? 'selected' : ''}>⭐⭐⭐</option><option value="⭐⭐⭐⭐" ${selectedRating === '⭐⭐⭐⭐' ? 'selected' : ''}>⭐⭐⭐⭐</option><option value="⭐⭐⭐⭐⭐" ${selectedRating === '⭐⭐⭐⭐⭐' ? 'selected' : ''}>⭐⭐⭐⭐⭐</option>
    </select>
  `;
}
window.getRatingDropdown = getRatingDropdown;
window.rateTask = async function (id, value) {
  if (currentUserRole !== 'GM') { return alert("Only GM can rate tasks."); }
  try {
    await updateDoc(doc(db, "tasks", id), { rating: value });
    await renderTasks();
  } catch(e) { console.error(`❌ ERROR rating task ${id}:`, e); alert("Failed to save rating."); }
};
// 📜 Task History Dekhne ka function (Updated Version)
window.viewHistory = async function(taskId) {
  const taskRef = doc(db, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) {
    return alert("Task not found!");
  }
  
  const history = taskSnap.data().history || [];
  if (history.length === 0) {
    return alert("No history found for this task.");
  }

  // Purani history saaf karo
  historyContent.innerHTML = "";
  
  // History ko date ke hisaab se sort karo
  history.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate()).forEach(entry => {
    const entryDate = entry.timestamp.toDate().toLocaleString('en-IN'); 
    
    // Har entry ke liye ek naya div banao
    const entryDiv = document.createElement('div');
    entryDiv.className = 'history-entry';
    entryDiv.innerHTML = `
      <p class="history-action">${entry.action}</p>
      <p class="history-meta">by ${entry.by} on ${entryDate}</p>
    `;
    historyContent.appendChild(entryDiv);
  });
  
  historyModal.style.display = "block"; // Modal ko dikhao
};
// 📝 Edit task (Updated Version with Date Edit)
window.editTask = async function (id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return alert("Task not found!");

    // 1. Purani details prompt me dikhao
    const newName = prompt("Edit Task Name:", task.name);
    const newDesc = prompt("Edit Description:", task.desc);
    const newEndDate = prompt("Edit End Date (YYYY-MM-DD):", task.endDate);

    // 2. Jo data update karna hai, use ek object me daalo
    const dataToUpdate = {};
    if (newName !== null) dataToUpdate.name = newName;
    if (newDesc !== null) dataToUpdate.desc = newDesc;
    
    // 3. Date ko validate karke add karo
    if (newEndDate !== null) {
    if (newEndDate === "") {
        // User ne date khali chhod di, to kuch mat karo
    } else {
        const selectedDate = new Date(newEndDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Aaj ki tareekh ka shuru (raat 12 baje)

        // 👇 YEH NAYI CONDITION HAI 👇
        if (!isNaN(selectedDate) && selectedDate >= today) {
            dataToUpdate.endDate = newEndDate;
        } else {
            alert("Invalid or past date. The end date was not updated.");
        }
    }
}
    
    // 4. Agar kuch update karne ke liye hai, tabhi Firestore ko call karo
    if (Object.keys(dataToUpdate).length > 0) {
        try {
            await updateDoc(doc(db, "tasks", id), dataToUpdate);
            await renderTasks();
        } catch (error) {
            console.error("Error updating task:", error);
            alert("Failed to update task.");
        }
    }
};
window.withdrawTask = async function (id) {
    if(confirm("Are you sure you want to delete this task?")) {
        await deleteDoc(doc(db, "tasks", id));
        await renderTasks();
    }
};
window.addComment = async function (id) {
  const input = document.getElementById(`commentInput-${id}`);
  const text = input.value.trim();
  if (!text) return;
  if (!currentUserEmail || !currentUserRole) { return alert("Could not identify user."); }
  const taskRef = doc(db, "tasks", id);
  try {
    const taskSnap = await getDoc(taskRef);
    if (!taskSnap.exists()) throw new Error("Task not found");
    const taskData = taskSnap.data();
    const newComment = { user: currentUserEmail, role: currentUserRole, text: text, timestamp: new Date() };
    const newCommentsArray = [...(taskData.comments || []), newComment];
    await updateDoc(taskRef, { comments: newCommentsArray });
    input.value = ""; 
    await renderTasks();
  } catch (error) { console.error("❌ ERROR adding comment:", error); alert("Failed to add comment."); }
};

// History Modal ke close button par click karne par
closeHistoryButton.onclick = function() {
  historyModal.style.display = "none";
}