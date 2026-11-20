// "Print / save as PDF" on the Members page: prints the members table as it is on screen (any column filters
// apply), through printTable() in print-table.js. Loaded after members.js, so $ and the page exist.

$("print-btn").addEventListener("click", () => {
  const trs = [...document.querySelectorAll("#members-body tr")];
  // A blank line above the first row of every family table after the first (the gap the page shows).
  const body = trs.flatMap((tr) => (tr.classList.contains("group-start") ? [Array(9).fill(""), printRow(tr)] : [printRow(tr)]));
  printTable({
    heading: `${GROUP_PRINT_HEADINGS[activeGroup]} \u00b7 ${trs.length}`,   // the list that is showing, and how many members
    fileTitle: `Sri Veeramathi Amman Thunai - members${activeGroup === "others" ? " - others" : ""}`,
    head: printRows("#members-thead-wrap thead tr:first-child")[0],
    body,
  });
});
