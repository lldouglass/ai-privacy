document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    system_name: document.getElementById("name").value,
    intended_purpose: document.getElementById("purpose").value,
    use_case: document.getElementById("usecase").value
  };
  document.getElementById("output").textContent = "⏳ Generating…";
  const res = await fetch("/generate-compliance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    document.getElementById("output").textContent =
      "Error: " + res.status + " " + (await res.text());
    return;
  }
  const data = await res.json();
  document.getElementById("output").textContent = data.compliance_report;
});
