// Choices for the address popup's dropdowns (member-address.js). Values are stored in English as shown.
// Districts are only listed for Tamil Nadu (this society's home state); every other state falls back to a text box.

const ADDR_INDIA = "India";
const ADDR_DEFAULT_STATE = "Tamil Nadu";

const ADDR_COUNTRIES = [
  "India", "Sri Lanka", "Singapore", "Malaysia", "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Oman",
  "Bahrain", "United States", "United Kingdom", "Canada", "Australia", "New Zealand", "Germany", "France",
];

const ADDR_INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union territories
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const ADDR_TN_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi",
  "Kancheepuram", "Kanniyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal",
  "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivagangai", "Tenkasi", "Thanjavur",
  "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai",
  "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar",
];

// Names that may be written in the ஊர் cell in place of a country (matched case-insensitively, also against the English
// names in ADDR_COUNTRIES above). The popup uses them to put e.g. "துபாய்" under Country, not Area. Add more as they turn up.
const ADDR_COUNTRY_ALIASES = {
  "இந்தியா": "India",
  "துபாய்": "United Arab Emirates", "uae": "United Arab Emirates", "யுஏஇ": "United Arab Emirates",
  "usa": "United States", "அமெரிக்கா": "United States",
  "uk": "United Kingdom",
  "சிங்கப்பூர்": "Singapore",
  "மலேசியா": "Malaysia",
  "இலங்கை": "Sri Lanka",
  "குவைத்": "Kuwait",
  "கத்தார்": "Qatar",
  "ஓமன்": "Oman",
  "சவுதி அரேபியா": "Saudi Arabia", "சவுதி": "Saudi Arabia",
};

// Cities and towns are different (the form has a City box and a Town box). A lone name in the ஊர் cell goes to City when it is
// listed in ADDR_CITIES, to Town when it is listed in ADDR_TOWNS, and is taken as an Area (a neighbourhood) when it is in
// neither. The value is the state the popup preselects: Tamil Nadu ones use the default, the others have their own state.
const ADDR_CITIES = {
  "சேலம்": ADDR_DEFAULT_STATE, "கரூர்": ADDR_DEFAULT_STATE, "சென்னை": ADDR_DEFAULT_STATE, "கோவை": ADDR_DEFAULT_STATE,
  "தஞ்சாவூர்": ADDR_DEFAULT_STATE, "திண்டுக்கல்": ADDR_DEFAULT_STATE, "ஓசூர்": ADDR_DEFAULT_STATE,
  "காஞ்சிபுரம்": ADDR_DEFAULT_STATE, "திருப்பூர்": ADDR_DEFAULT_STATE, "ஈரோடு": ADDR_DEFAULT_STATE,
  "திருச்சி": ADDR_DEFAULT_STATE, "கோயம்புத்தூர்": ADDR_DEFAULT_STATE,
  "பெங்களூர்": "Karnataka", "சண்டிகர்": "Punjab", "ராய்ப்பூர்": "Chhattisgarh", "போபால்": "Madhya Pradesh",
};
const ADDR_TOWNS = {
  "சங்ககிரி": ADDR_DEFAULT_STATE, "உடுமலைப்பேட்டை": ADDR_DEFAULT_STATE, "கொண்டப்பநாயக்கன்பட்டி": ADDR_DEFAULT_STATE,
  "நாமக்கல்": ADDR_DEFAULT_STATE, "பொள்ளாச்சி": ADDR_DEFAULT_STATE, "ஓமலூர்": ADDR_DEFAULT_STATE,
};
// The place text shown beside the Postal Address icon: Town, City (whichever of the two are filled in).
const addrPlaceText = (address) => [address?.town, address?.city].filter(Boolean).join(", ");
