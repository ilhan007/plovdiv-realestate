// Altitude (meters above sea level) for settlements in Plovdiv region
// Sources: Bulgarian Geographic Encyclopedia, Wikipedia
const ALTITUDES = {
  // Cities
  "пловдив": 164,
  "асеновград": 231,
  "карлово": 390,
  "сопот": 530,
  "калофер": 560,
  "хисаря": 364,
  "кричим": 280,
  "перущица": 260,
  "стамболийски": 155,
  "раковски": 155,
  "куклен": 230,
  "садово": 152,
  "първомай": 130,
  "лъки": 720,
  "баня": 400,

  // Towns / Villages near Plovdiv
  "брестник": 175,
  "марково": 200,
  "първенец": 250,
  "цалапица": 152,
  "труд": 180,
  "войводиново": 165,
  "крумово": 175,
  "браниполе": 165,
  "костиево": 170,
  "калековец": 160,
  "ягодово": 170,
  "кадиево": 175,
  "белащица": 220,
  "брестовица": 240,
  "храбрино": 280,
  "устина": 260,
  "скутаре": 160,
  "рогош": 175,
  "златитрап": 210,
  "бойково": 1050,
  "лилково": 650,
  "ситово": 300,
  "дедево": 350,
  "нареченски бани": 550,
  "наречен": 550,
  "бачково": 500,
  "мостово": 310,
  "тополово": 270,
  "нови извор": 280,
  "орешец": 310,
  "козаново": 290,
  "конуш": 210,
  "патриарх евтимово": 280,
  "червен": 310,
  "горнослав": 280,
  "долнослав": 230,
  "болярци": 240,
  "леново": 340,
  "новаково": 380,
  "житница": 155,
  "катуница": 190,
  "чешнегирово": 155,
  "момино село": 155,
  "бяла река": 550,
  "здравец": 165,
  "дълбок извор": 250,
  "войнягово": 420,
  "слатина": 450,
  "розино": 480,
  "климент": 200,
  "кърнаре": 400,
  "богдан": 430,
  "христо даново": 350,
  "баня": 400,
  "старосел": 460,
  "михилци": 490,
  "красново": 360,
  "строево": 165,
  "манолско конаре": 155,
  "извор": 175,
  "клисура": 540,
  "каравелово": 310,
  "васил левски": 350,
  "ведраре": 380,
  "домлян": 315,
  "горни домлян": 350,
  "пролом": 420,
  "дъбене": 310,
  "иганово": 310,
  "столетово": 520,
  "соколица": 420,
  "розино": 480,
  "богдан": 430,
  "певците": 500,
  "горни домлян": 350,
  "чилтеп": 170,
  "отец паисиево": 250,
  "старо железаре": 185,
  "ново село": 200,
  "кадиево": 175,
  "оризари": 155,
  "граф игнатиево": 175,
  "парчевич": 175,
  "чалъкови": 165,
  "крислово": 170,
  "радиново": 168,
  "маноле": 155,
  "стряма": 160,
  "мирянци": 380,
  "горна махала": 195,
  "долна махала": 185,
  "нова махала": 175,
};

// Pre-sorted entries: longest names first so "Асеновград" matches before "Пловдив"
const SORTED_ENTRIES = Object.entries(ALTITUDES)
  .sort((a, b) => b[0].length - a[0].length);

/**
 * Find altitude for a location string.
 * Tries to match settlement names from the location text.
 * Matches longest name first to avoid false positives
 * (e.g. "Асеновград, област Пловдив" → Асеновград, not Пловдив)
 */
export function getAltitude(locationText) {
  if (!locationText) return null;
  const lower = locationText.toLowerCase();

  for (const [name, alt] of SORTED_ENTRIES) {
    if (lower.includes(name)) {
      return { settlement: name, altitude: alt };
    }
  }

  return null;
}

/**
 * Returns altitude badge text and color based on elevation
 */
export function getAltitudeBadge(altitude) {
  if (!altitude) return null;
  const m = altitude.altitude;
  let category;
  if (m < 200) category = "low";
  else if (m < 400) category = "mid";
  else if (m < 700) category = "high";
  else category = "mountain";

  return {
    text: `${m} м н.в.`,
    settlement: altitude.settlement,
    category,
    meters: m,
  };
}
