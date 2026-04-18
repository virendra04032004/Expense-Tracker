const API = ""; // same origin; change to http://localhost:3000 if needed

    let pieChart = null;
    let barChart = null;

    // ── Utilities ──────────────────────────────────────────────
    function fmt(n) {
      return "₹" + Number(n).toFixed(2);
    }

    function showToast(msg, duration = 2500) {
      const t = document.getElementById("toast");
      t.textContent = msg;
      t.style.display = "block";
      setTimeout(() => (t.style.display = "none"), duration);
    }

    function showError(msg) {
      const el = document.getElementById("form-error");
      el.textContent = msg;
      el.style.display = msg ? "block" : "none";
    }

    function badgeClass(cat) {
      return { food: "badge-food", travel: "badge-travel", shopping: "badge-shopping", other: "badge-other" }[cat] || "";
    }

    function getLocalDateStr(date = new Date()) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function todayStr() {
      return getLocalDateStr();
    }

    // ── Fetch helpers ──────────────────────────────────────────
    async function getExpenses(filters = {}) {
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (filters.date)     params.set("date", filters.date);
      const res = await fetch(`${API}/api/expenses?${params}`);
      if (!res.ok) throw new Error("Failed to load expenses");
      return res.json();
    }

    async function getSummary() {
      const res = await fetch(`${API}/api/expenses/summary`);
      if (!res.ok) throw new Error("Failed to load summary");
      return res.json();
    }

    async function postExpense(data) {
      const res = await fetch(`${API}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json.errors || [json.error]).join(", "));
      return json;
    }

    async function deleteExpense(id) {
      const res = await fetch(`${API}/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    }

    // ── Render list ────────────────────────────────────────────
    function renderList(expenses) {
      const ul = document.getElementById("expense-list");
      ul.innerHTML = "";
      if (!expenses.length) {
        ul.innerHTML = '<li class="empty-state">No expenses found.</li>';
        return;
      }
      expenses.forEach((e) => {
        const li = document.createElement("li");
        const displayDate = e.expense_date.split("T")[0];
        li.innerHTML = `
          <span>${e.description}</span>
          <span class="amount">${fmt(e.amount)}</span>
          <span><span class="badge ${badgeClass(e.category)}">${e.category}</span><br/><small>${displayDate}</small></span>
          <button onclick="handleDelete(${e.id})">Delete</button>
        `;
        ul.appendChild(li);
      });
    }

    // ── Render summary cards ───────────────────────────────────
    function renderSummary(summary) {
      ["food", "travel", "shopping", "other"].forEach((cat) => {
        document.getElementById(`total-${cat}`).textContent = fmt(summary[cat] || 0);
      });
      const grand = Object.values(summary).reduce((a, b) => a + b, 0);
      document.getElementById("grand-total").textContent = fmt(grand);
    }

    // ── Charts ─────────────────────────────────────────────────
    const COLORS = {
      food:     "#ffd580",
      travel:   "#80d4ff",
      shopping: "#ff9fb2",
      other:    "#c5b4e3",
    };

    function renderPieChart(summary) {
      const labels = ["Food", "Travel", "Shopping", "Other"];
      const data   = [summary.food, summary.travel, summary.shopping, summary.other];
      const colors = [COLORS.food, COLORS.travel, COLORS.shopping, COLORS.other];

      if (pieChart) pieChart.destroy();
      pieChart = new Chart(document.getElementById("pieChart"), {
        type: "doughnut",
        data: {
          labels,
          datasets: [{ data, backgroundColor: colors, borderColor: "#000", borderWidth: 2 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { labels: { font: { family: "'Kirang Haerang', system-ui", size: 14 } } },
          },
          cutout: "55%",
        },
      });
    }

        async function renderBarChart() {
      // Build last 7 days labels
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const pad = n => String(n).padStart(2,"0"); days.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
      }
 
      // Fetch all expenses and group by date
      const all = await getExpenses();
      const byDate = {};
      days.forEach((d) => (byDate[d] = 0));
      all.forEach((e) => {
        // Normalize: Postgres DATE may come back as "2024-01-15T00:00:00.000Z"
        const dateKey = (e.expense_date || "").toString().split("T")[0];
        if (byDate[dateKey] !== undefined)
          byDate[dateKey] += Number(e.amount);
      });
 
      const labels = days.map((d) => {
        const [, m, day] = d.split("-");
        return `${day}/${m}`;
      });
      const data = days.map((d) => byDate[d]);
 
      if (barChart) barChart.destroy();
      barChart = new Chart(document.getElementById("barChart"), {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Spending (₹)",
            data,
            backgroundColor: "#8bc28b",
            borderColor: "#000",
            borderWidth: 2,
            borderRadius: 6,
          }],
        },
        options: {
          plugins: {
            legend: { labels: { font: { family: "'Kirang Haerang', system-ui", size: 13 } } },
          },
          scales: {
            x: { ticks: { font: { family: "'Kirang Haerang', system-ui" } } },
            y: { beginAtZero: true, ticks: { font: { family: "'Kirang Haerang', system-ui" } } },
          },
        },
      });
    }
 
    // ── Full refresh ───────────────────────────────────────────
    async function refresh(filters = {}) {
      try {
        const [expenses, summary] = await Promise.all([getExpenses(filters), getSummary()]);
        renderList(expenses);
        renderSummary(summary);
        renderPieChart(summary);
        await renderBarChart();
      } catch (err) {
        showToast("⚠️ " + err.message);
      }
    }

    // ── Form submit ────────────────────────────────────────────
    async function handleSubmit(e) {
      e.preventDefault();
      showError("");
      const body = {
        description:  document.getElementById("inp-desc").value,
        amount:       document.getElementById("inp-amount").value,
        category:     document.getElementById("inp-category").value,
        expense_date: document.getElementById("inp-date").value || todayStr(),
      };
      try {
        await postExpense(body);
        e.target.reset();
        document.getElementById("inp-date").value = "";
        showToast("✅ Expense added!");
        refresh();
      } catch (err) {
        showError(err.message);
      }
    }

    // ── Delete ─────────────────────────────────────────────────
    async function handleDelete(id) {
      if (!confirm("Delete this expense?")) return;
      try {
        await deleteExpense(id);
        showToast("🗑️ Expense deleted.");
        refresh(currentFilters());
      } catch (err) {
        showToast("⚠️ " + err.message);
      }
    }

    // ── Filters ────────────────────────────────────────────────
    function currentFilters() {
      return {
        category: document.getElementById("filter-category").value,
        date:     document.getElementById("filter-date").value,
      };
    }

    function applyFilters() { refresh(currentFilters()); }

    function clearFilters() {
      document.getElementById("filter-category").value = "";
      document.getElementById("filter-date").value = "";
      refresh();
    }

    // ── Init ───────────────────────────────────────────────────
    document.getElementById("inp-date").value = todayStr();
    refresh();
