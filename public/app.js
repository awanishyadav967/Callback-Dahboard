const statusDot = document.getElementById("statusDot");
const serverStatus = document.getElementById("serverStatus");
const callbackUrl = document.getElementById("callbackUrl");
const pocUrl = document.getElementById("pocUrl");
const scriptTag = document.getElementById("scriptTag");
const sendTestRequest = document.getElementById("sendTestRequest");
const clearLogs = document.getElementById("clearLogs");
const logsTable = document.getElementById("logsTable");
const logCount = document.getElementById("logCount");
const lastUpdated = document.getElementById("lastUpdated");
const toast = document.getElementById("toast");

const origin = window.location.origin;
const testId = "authorized-test";

callbackUrl.value = `${origin}/track/${encodeURIComponent(testId)}`;
pocUrl.value = `${origin}/poc.js`;
scriptTag.value = `<script src="${origin}/poc.js"></script>`;

// Escape all log values before placing them in the table.
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 1800);
}

async function copyValue(targetId, button) {
  const target = document.getElementById(targetId);

  try {
    await navigator.clipboard.writeText(target.value);
    showToast("Copied");
  } catch (error) {
    target.select();
    document.execCommand("copy");
    showToast("Copied");
  }

  button.blur();
}

async function updateStatus() {
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) throw new Error("Status request failed");

    const data = await response.json();
    statusDot.classList.toggle("online", Boolean(data.online));
    serverStatus.textContent = data.online ? "Online" : "Offline";
  } catch (error) {
    statusDot.classList.remove("online");
    serverStatus.textContent = "Offline";
  }
}

function renderLogs(logs) {
  logCount.textContent = `${logs.length} logged`;

  if (!logs.length) {
    logsTable.innerHTML = '<tr><td colspan="6" class="empty">No requests logged yet.</td></tr>';
    return;
  }

  logsTable.innerHTML = logs
    .map((entry) => {
      const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "";

      return `<tr>
        <td>${escapeHtml(time)}</td>
        <td><span class="method">${escapeHtml(entry.method)}</span></td>
        <td>${escapeHtml(entry.path)}</td>
        <td>${escapeHtml(entry.ip)}</td>
        <td>${escapeHtml(entry.userAgent)}</td>
        <td>${escapeHtml(entry.referer || "-")}</td>
      </tr>`;
    })
    .join("");
}

async function updateLogs() {
  try {
    const response = await fetch("/api/logs", { cache: "no-store" });
    if (!response.ok) throw new Error("Log request failed");

    const data = await response.json();
    renderLogs(data.logs || []);
    lastUpdated.textContent = `Last updated ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    lastUpdated.textContent = "Could not refresh logs.";
  }
}

async function refreshDashboard() {
  await Promise.all([updateStatus(), updateLogs()]);
}

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", () => copyValue(button.dataset.copyTarget, button));
});

sendTestRequest.addEventListener("click", async () => {
  try {
    const response = await fetch(`/track/${encodeURIComponent(testId)}?source=dashboard`, {
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Test request failed");

    showToast("Test request sent");
    await updateLogs();
  } catch (error) {
    showToast("Test request failed");
  }
});

clearLogs.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/logs", { method: "DELETE" });
    if (!response.ok) throw new Error("Clear request failed");

    showToast("Logs cleared");
    await updateLogs();
  } catch (error) {
    showToast("Could not clear logs");
  }
});

refreshDashboard();
window.setInterval(refreshDashboard, 5000);
