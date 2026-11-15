// "Print / save as PDF" on the Members page: prints the members table as it is on screen (any column filters
// apply), through printTable() in print-table.js. Loaded after members.js, so $ and the page exist.

$("print-btn").addEventListener("click", () => {
  const body = printRows("#members-body tr");
  printTable({
    heading: `மொத்த குடும்பத் தலைவர்கள் \u00b7 ${body.length}`,
    fileTitle: `Sri Veeramathi Amman Thunai - members`,
    head: printRows("#members-thead-wrap thead tr:first-child")[0],
    body,
  });
});
