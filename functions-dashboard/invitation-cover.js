// Booklet pages 1 (cover) and 2 (invitation letter). Their wording is in invitation-text.js; what changes with the year
// (the festival date, the Tamil year name) is worked out here. Needs invPage() from invitation-pages.js (called only
// when a booklet is built, so the script order does not matter).

// The 60-year Tamil cycle (Prabhava ... Akshaya). Year 1 of the cycle began in April 1987; 2026-27 is Parabhava (no. 40).
const INV_TAMIL_YEARS = ["பிரபவ", "விபவ", "சுக்கில", "பிரமோதூத", "பிரசோற்பத்தி", "ஆங்கீரச", "ஸ்ரீமுக", "பவ", "யுவ", "தாது", "ஈஸ்வர", "வெகுதான்ய",
  "பிரமாதி", "விக்கிரம", "விஷு", "சித்திரபானு", "சுபானு", "தாரண", "பார்த்திப", "விய", "சர்வசித்", "சர்வதாரி", "விரோதி", "விக்ருதி",
  "கர", "நந்தன", "விஜய", "ஜய", "மன்மத", "துன்முகி", "ஹேவிளம்பி", "விளம்பி", "விகாரி", "சார்வரி", "பிலவ", "சுபகிருது",
  "சோபகிருது", "குரோதி", "விசுவாவசு", "பராபவ", "பிலவங்க", "கீலக", "சௌமிய", "சாதாரண", "விரோதிகிருது", "பரிதாபி", "பிரமாதீச", "ஆனந்த",
  "ராட்சச", "நள", "பிங்கள", "காளயுக்தி", "சித்தார்த்தி", "ரௌத்திரி", "துன்மதி", "துந்துபி", "ருத்ரோத்காரி", "ரக்தாட்சி", "குரோதன", "அட்சய"];

// Spelled out here (not Intl) so the full "...கிழமை" form is always printed, whatever the browser gives.
const INV_TAMIL_WEEKDAYS = ["ஞாயிற்றுக்கிழமை", "திங்கட்கிழமை", "செவ்வாய்க்கிழமை", "புதன்கிழமை", "வியாழக்கிழமை", "வெள்ளிக்கிழமை", "சனிக்கிழமை"];

// The festival the booklet invites to: Thai 2, in January of the year AFTER the accounts year (accounts 2026 -> 16.01.2027).
// Thai 1 is 15 January in the year after a leap year and in leap years (2027, 2028), otherwise 14 January, so Thai 2 is
// 16 or 15 January. It is only the starting text: the page is editable in the preview.
function invFestival(f) {
  const year = f.year + 1;
  const day = year % 4 === 3 || year % 4 === 0 ? 16 : 15;
  const date = new Date(year, 0, day);
  const weekday = INV_TAMIL_WEEKDAYS[date.getDay()];
  const tamilYear = INV_TAMIL_YEARS[(year - 1 - 2026 + 39 + 600) % 60];   // the Tamil year that began the previous April
  return { year, date: `${String(day).padStart(2, "0")}.01.${year} ${weekday}`, tamilYear };
}

const invFill = (line, fest) => line.replace("{tamilYear}", fest.tamilYear).replace("{date}", fest.date);

function invCoverPage(no, f) {   // page 1
  const fest = invFestival(f);
  return invPage(no, `
    <img class="inv-toran" src="invitation/toran.png" alt="" />
    <div class="inv-cover-head">
      <img class="inv-dancer" src="invitation/dancer.png" alt="" />
      <div><h1 class="inv-cover-title">${INV_TEXT.coverTitle}</h1><p class="inv-cover-motto">${INV_TEXT.coverMotto}</p></div>
      <img class="inv-dancer inv-flip" src="invitation/dancer.png" alt="" />
    </div>
    <div class="inv-cover-invite">
      <p class="inv-cover-year">${fest.year} – ஆம் ஆண்டு தைமாதம் 2–ம் நாள்</p>
      <p class="inv-cover-name">${INV_TEXT.coverInvite}</p>
      <p class="inv-cover-date"><span>${fest.date}</span></p>
    </div>
    <div class="inv-cover-art">
      <img class="inv-peacock" src="invitation/peacock.png" alt="" />
      <img class="inv-deity" src="invitation/ganesha.png" alt="" />
      <img class="inv-art-bw" src="invitation/amma.png" alt="" />
      <img class="inv-art-color" src="invitation/amma-color.jpg" alt="" />
      <img class="inv-deity" src="invitation/murugan.png" alt="" />
      <img class="inv-peacock inv-flip" src="invitation/peacock.png" alt="" />
    </div>
    <div class="inv-verse">${INV_TEXT.coverVerse.map((l) => `<p>${l}</p>`).join("")}</div>`, { ornate: true });
}

function invLetterPage(no, f) {   // page 2
  const fest = invFestival(f);
  const lines = (arr) => arr.map((l) => `<p>${l}</p>`).join("");
  const contacts = INV_TEXT.letterContacts.map((c) => `<div><span>${c[0]}</span><b>${c[1]}</b></div>`).join("");
  const program = INV_TEXT.program.map((r) => `<tr><td class="when">${r[0]}</td><td>${r[1]}</td></tr>`).join("");
  return invPage(no, `
    <p class="inv-greet">${INV_TEXT.letterGreeting}</p>
    <div class="inv-letter">${lines(INV_TEXT.letterLines.map((l) => invFill(l, fest)))}</div>
    <div class="inv-letter inv-signoff-block">${lines(INV_TEXT.letterSignoff)}</div>
    <div class="inv-contact-row"><span class="inv-contact-label">${INV_TEXT.letterContactLabel}</span>${contacts}</div>
    <div class="inv-people">${lines(INV_TEXT.letterPeople)}</div>
    <h3 class="inv-headtax">${INV_TEXT.headTaxTitle}</h3>
    <div class="inv-letter inv-headtax-text">${lines(INV_TEXT.headTaxLines)}</div>
    <div class="inv-program-title"><span>${INV_TEXT.programTitle}</span></div>
    <p class="inv-program-date">${fest.date}</p>
    <table class="inv-program"><tbody>${program}</tbody></table>
    <p class="inv-program-note">${INV_TEXT.programNote}</p>`, { ornate: "top" });   // like the printed letter: corners at the top only
}
