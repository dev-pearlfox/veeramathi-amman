// The ONE definition of how members are grouped and ordered, loaded by the Accounts, Members and Dashboard pages (it
// has no page code in it). The Members page has two lists, "thalaikattu" (தலைக்கட்டு, the heads of families) and
// "others" (people.member_group). A thalaikattu member also sits in a family table (people.family_group: 1, 2, 3 ...),
// exactly as in the printed invitation booklet, and S.No. (member_no) counts from 1 again inside each family table.
// Because of that, S.No. alone no longer identifies anyone: Roll No. does.

// A row from a database that has not run backups/add-member-groups.sql yet has no member_group: it is thalaikattu.
const memberGroupOf = (p) => p.member_group ?? "thalaikattu";
// Both lists are on the Members page, the Accounts ledger sheets and the Dashboard. A தலைக்கட்டு member is expected to pay the head
// tax; an Others member pays only if they wish, so they never count as unpaid (owesSantha in function-rules.js uses this check).
// The invitation lists whoever paid, so an Others member shows there only after paying.
const isThalaikattu = (p) => memberGroupOf(p) === "thalaikattu";

// தலைக்கட்டு first, then Others; inside தலைக்கட்டு table 1, 2, 3 ...; inside a table by S.No.; the name breaks any tie.
function compareMembers(a, b) {
  const list = (p) => (isThalaikattu(p) ? 0 : 1);
  return list(a) - list(b)
    || (a.family_group ?? 9999) - (b.family_group ?? 9999)
    || (a.member_no ?? 9999) - (b.member_no ?? 9999)
    || (a.name || "").localeCompare(b.name || "");
}
