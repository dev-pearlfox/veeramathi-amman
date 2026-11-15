// Business rules shared by the Accounts page (function-expenses/) and the dashboard (functions-dashboard/), kept in
// ONE file so the two can never disagree about who belongs to a function.

// The society's usual functions. The dashboard's "Add New Function" box suggests these when clicked (a new name can
// still be typed). Add more Tamil names here as the society needs them.
const FUNCTION_NAMES = ["தை திருவிழா"];

// Who is expected to take part in `fn`: everyone, except people flagged `avoid`, UNLESS they already have an entry
// for this function (so recorded money never disappears from view).
// `entriesForFunction` must be the ledger rows of that one function.
function eligiblePeople(allPeople, fn, entriesForFunction) {
  const hasEntry = new Set(entriesForFunction.map((e) => e.person_id));
  return allPeople.filter((p) => !p.avoid || hasEntry.has(p.id));
}
