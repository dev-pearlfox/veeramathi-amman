// "Print / save as PDF" on the Members page: prints the members table as it is on screen (any column filters
// apply), through printTable() in print-table.js. Loaded after members.js, so $ and the page exist.

$("print-btn").addEventListener("click", () => {
  const trs = [...document.querySelectorAll("#members-body tr")];
  // The strip between two family tables prints as a blank line.
  const body = trs.map((tr) => (tr.classList.contains("family-strip") ? Array(9).fill("") : printRow(tr)));
  const members = trs.filter((tr) => tr.dataset.person).length;
  printTable({
    heading: `${GROUP_PRINT_HEADINGS[activeGroup]} \u00b7 ${members}`,   // the list that is showing, and how many members
    fileTitle: `Sri Veeramathi Amman Thunai - members${activeGroup === "others" ? " - others" : ""}`,
    head: printRows("#members-thead-wrap thead tr:first-child")[0],
    body,
  });
});
