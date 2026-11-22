// Admin > Fund Collections. The admin makes a named fund drive (e.g. "Land Purchase") inside one function; it becomes a new tab on
// that function's Accounts page (function-expenses/income.js) and a table like நன்கொடை. Its money is kept OUT of the function's
// வரவு and balance (data.js summarize) and shows here, on the Overview tiles and as its own page of the invitation booklet.
// Rows are in the fund_collections table (supabase/schema.sql); the donations are in income_entries with kind "fund:<id>".

const fundDeleteBlockedTitle = "Has donations in it: remove them on the Accounts page first";

function renderFundAdmin() {
  const select = $("fund-function");
  const keep = select.value;
  const functions = functionsList.slice().sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
  select.innerHTML = functions.map((f) => `<option value="${f.id}">${escapeHtml(functionLabel(f))}</option>`).join("");
  if (functions.some((f) => f.id === keep)) select.value = keep;

  const rows = fundSummaries(allFunctionIds()).reverse();   // newest function first, like the list above
  $("fund-list").innerHTML = rows.length
    ? rows.map(({ fund, f, total, count }) => `<tr data-fund="${fund.id}">
        <td>${escapeHtml(functionLabel(f))}</td>
        <td class="fund-title-cell"><input type="text" class="fund-title-input" maxlength="80" value="${escapeHtml(fund.title)}" aria-label="Fund name for ${escapeHtml(functionLabel(f))}" />
          <button type="button" class="secondary fund-rename">Rename</button></td>
        <td>${money(total)} <small>(${count} ${count === 1 ? "donation" : "donations"})</small></td>
        <td><button type="button" class="secondary fund-delete" ${count ? `disabled title="${fundDeleteBlockedTitle}"` : ""}>Delete</button></td>
      </tr>`).join("")
    : `<tr><td colspan="4" class="empty">No fund collections yet.</td></tr>`;
}

$("fund-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = e.submitter || $("fund-form").querySelector('button[type="submit"]');
  const functionId = $("fund-function").value;
  const title = $("fund-title").value.trim();
  if (!functionId || !title) return;
  // The same fund name can only exist once per function (the database enforces it too: schema.sql).
  if (fundCollections.some((x) => x.function_id === functionId && x.title.toLowerCase() === title.toLowerCase())) {
    setStatus("fund-status", `"${title}" already exists in that function.`, true);
    return;
  }
  submitBtn.disabled = true;
  setStatus("fund-status", "Adding...", false);
  try {
    const { error } = await client.from("fund_collections").insert({ function_id: functionId, title });
    if (error) {
      setStatus("fund-status", error.code === "23505" ? `"${title}" already exists in that function.` : "Error: " + error.message, true);
      return;
    }
    $("fund-title").value = "";
    setStatus("fund-status", `Added. It is now a tab on that function's Accounts page.`, false);
    await refreshAll();   // app.js
  } finally {
    submitBtn.disabled = false;
  }
});

$("fund-list").addEventListener("click", async (e) => {
  const tr = e.target.closest("tr[data-fund]");
  const fund = tr && fundCollections.find((x) => x.id === tr.dataset.fund);
  if (!fund) return;

  if (e.target.closest(".fund-rename")) {
    const title = tr.querySelector(".fund-title-input").value.trim();
    if (!title || title === fund.title) return;
    const { error } = await client.from("fund_collections").update({ title }).eq("id", fund.id);
    if (error) {
      setStatus("fund-status", error.code === "23505" ? `"${title}" already exists in that function.` : "Error renaming: " + error.message, true);
      return;
    }
    setStatus("fund-status", `Renamed to "${title}".`, false);
    await refreshAll();
    return;
  }

  if (e.target.closest(".fund-delete")) {
    if (!confirm(`Delete the fund collection "${fund.title}"? (Remove this fund?)`)) return;
    // Ask the database, not the list on screen: someone may have added a donation on the Accounts page a moment ago.
    const { count, error: countError } = await client.from("income_entries").select("id", { count: "exact", head: true }).eq("kind", fundKindKey(fund.id));
    if (countError) { setStatus("fund-status", "Error: " + countError.message, true); return; }
    if (count > 0) {
      setStatus("fund-status", `"${fund.title}" has ${count} donations in it, so it was not deleted.`, true);
      await refreshAll();
      return;
    }
    const { error } = await client.from("fund_collections").delete().eq("id", fund.id);
    if (error) { setStatus("fund-status", "Error deleting: " + error.message, true); return; }
    setStatus("fund-status", `Deleted "${fund.title}".`, false);
    await refreshAll();
  }
});
