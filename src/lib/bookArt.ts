import { pexelsImage } from "@/lib/media";

const artGenesis = pexelsImage(11696719, 800);
const artExodus = pexelsImage(34612053, 800);
const artLeviticus = pexelsImage(5206052, 800);
const artNumbers = pexelsImage(2258251, 800);
const artDeuteronomy = pexelsImage(8955288, 800);
const artJoshua = pexelsImage(6860381, 800);
const artJudges = pexelsImage(34356171, 800);
const artRuth = pexelsImage(9407893, 800);
const art1Samuel = pexelsImage(1105392, 800);
const art2Samuel = pexelsImage(34533557, 800);
const art1Kings = pexelsImage(33494797, 800);
const art2Kings = pexelsImage(34611897, 800);
const art1Chronicles = pexelsImage(11696719, 800);
const art2Chronicles = pexelsImage(34612053, 800);
const artEzra = pexelsImage(5206052, 800);
const artNehemiah = pexelsImage(2258251, 800);
const artEsther = pexelsImage(8955288, 800);
const artJob = pexelsImage(6860381, 800);
const artPsalms = pexelsImage(34356171, 800);
const artProverbs = pexelsImage(9407893, 800);
const artEcclesiastes = pexelsImage(1105392, 800);
const artSongOfSolomon = pexelsImage(34533557, 800);
const artIsaiah = pexelsImage(33494797, 800);
const artJeremiah = pexelsImage(34611897, 800);
const artLamentations = pexelsImage(11696719, 800);
const artEzekiel = pexelsImage(34612053, 800);
const artDaniel = pexelsImage(5206052, 800);
const artHosea = pexelsImage(2258251, 800);
const artJoel = pexelsImage(8955288, 800);
const artAmos = pexelsImage(6860381, 800);
const artObadiah = pexelsImage(34356171, 800);
const artJonah = pexelsImage(9407893, 800);
const artMicah = pexelsImage(1105392, 800);
const artNahum = pexelsImage(34533557, 800);
const artHabakkuk = pexelsImage(33494797, 800);
const artZephaniah = pexelsImage(34611897, 800);
const artHaggai = pexelsImage(11696719, 800);
const artZechariah = pexelsImage(34612053, 800);
const artMalachi = pexelsImage(5206052, 800);
const artMatthew = pexelsImage(2258251, 800);
const artMark = pexelsImage(8955288, 800);
const artLuke = pexelsImage(6860381, 800);
const artJohn = pexelsImage(34356171, 800);
const artActs = pexelsImage(9407893, 800);
const artRomans = pexelsImage(1105392, 800);
const art1Corinthians = pexelsImage(34533557, 800);
const art2Corinthians = pexelsImage(33494797, 800);
const artGalatians = pexelsImage(34611897, 800);
const artEphesians = pexelsImage(11696719, 800);
const artPhilippians = pexelsImage(34612053, 800);

/**
 * Per-book cover art, badge colour and tagline, taken from the Bible page
 * design. The first fifty books use curated Pexels photographs; the remaining
 * sixteen use a neutral cover and retain their existing copy.
 */
export type BookArt = { abbr: string; badge: string; tagline: string; art: string };

export const BOOK_ART: Record<string, BookArt> = {
  Genesis: { abbr: "Ge", badge: "#0e7cfc", tagline: "In the Beginning", art: artGenesis },
  Exodus: { abbr: "Ex", badge: "#c75da2", tagline: "Freedom in God", art: artExodus },
  Leviticus: { abbr: "Le", badge: "#f88f43", tagline: "A Holy People", art: artLeviticus },
  Numbers: { abbr: "Nu", badge: "#21bfa4", tagline: "The Journey Continues", art: artNumbers },
  Deuteronomy: { abbr: "De", badge: "#914be6", tagline: "Choose Life", art: artDeuteronomy },
  Joshua: { abbr: "Jo", badge: "#df4f72", tagline: "Step Into Promise", art: artJoshua },
  Judges: { abbr: "Ju", badge: "#fbc34f", tagline: "Faith in Action", art: artJudges },
  Ruth: { abbr: "Ru", badge: "#0ac8e6", tagline: "Loyalty Never Fails", art: artRuth },
  "1 Samuel": { abbr: "1", badge: "#2799fd", tagline: "A Heart After God", art: art1Samuel },
  "2 Samuel": { abbr: "2", badge: "#8d63d8", tagline: "A Kingdom Established", art: art2Samuel },
  "1 Kings": { abbr: "1K", badge: "#ee4160", tagline: "Wisdom and Power", art: art1Kings },
  "2 Kings": { abbr: "2K", badge: "#0bcb91", tagline: "Lessons Through History", art: art2Kings },
  "1 Chronicles": { abbr: "1C", badge: "#0ac1fd", tagline: "Our Heritage", art: art1Chronicles },
  "2 Chronicles": {
    abbr: "2C",
    badge: "#04cff2",
    tagline: "Faithful Generations",
    art: art2Chronicles,
  },
  Ezra: { abbr: "Ez", badge: "#3c95fa", tagline: "Restoration Begins", art: artEzra },
  Nehemiah: { abbr: "Ne", badge: "#3c93fc", tagline: "Rebuild and Rise", art: artNehemiah },
  Esther: { abbr: "Es", badge: "#8849f8", tagline: "Courage for a Purpose", art: artEsther },
  Job: { abbr: "Job", badge: "#7d2d58", tagline: "Faith in the Storm", art: artJob },
  Psalms: { abbr: "Ps", badge: "#2fd59a", tagline: "Prayers for Every Season", art: artPsalms },
  Proverbs: { abbr: "Pr", badge: "#763e1f", tagline: "Wisdom for Daily Life", art: artProverbs },
  Ecclesiastes: {
    abbr: "Ec",
    badge: "#3183fd",
    tagline: "Meaning in Everything",
    art: artEcclesiastes,
  },
  "Song of Solomon": {
    abbr: "So",
    badge: "#ec405a",
    tagline: "Love the Right Way",
    art: artSongOfSolomon,
  },
  Isaiah: { abbr: "Is", badge: "#14d093", tagline: "Hope for Tomorrow", art: artIsaiah },
  Jeremiah: { abbr: "Je", badge: "#dc64ad", tagline: "A Call to Repentance", art: artJeremiah },
  Lamentations: {
    abbr: "La",
    badge: "#108df9",
    tagline: "Finding Hope in Pain",
    art: artLamentations,
  },
  Ezekiel: { abbr: "Eze", badge: "#08cb8f", tagline: "A New Heart", art: artEzekiel },
  Daniel: { abbr: "Da", badge: "#fabd43", tagline: "Faith in Every Situation", art: artDaniel },
  Hosea: { abbr: "Ho", badge: "#07c4e0", tagline: "Unfailing Love", art: artHosea },
  Joel: { abbr: "Jl", badge: "#02c98d", tagline: "A New Beginning", art: artJoel },
  Amos: { abbr: "Am", badge: "#fab13d", tagline: "Justice and Truth", art: artAmos },
  Obadiah: { abbr: "Ob", badge: "#27d9af", tagline: "Pride Comes Down", art: artObadiah },
  Jonah: { abbr: "Jon", badge: "#595dfa", tagline: "A Second Chance", art: artJonah },
  Micah: { abbr: "Mi", badge: "#0bd292", tagline: "What God Requires", art: artMicah },
  Nahum: { abbr: "Na", badge: "#01ccf5", tagline: "God Brings Justice", art: artNahum },
  Habakkuk: { abbr: "Hab", badge: "#2da3fb", tagline: "Faith While Waiting", art: artHabakkuk },
  Zephaniah: { abbr: "Zep", badge: "#0fc98c", tagline: "A Day of Renewal", art: artZephaniah },
  Haggai: { abbr: "Hag", badge: "#3b99fb", tagline: "Put God First", art: artHaggai },
  Zechariah: { abbr: "Zec", badge: "#13cc8c", tagline: "The Hope of the King", art: artZechariah },
  Malachi: { abbr: "Mal", badge: "#f88e44", tagline: "Turn Back to God", art: artMalachi },
  Matthew: { abbr: "Mt", badge: "#27d2da", tagline: "The King Has Come", art: artMatthew },
  Mark: { abbr: "Mk", badge: "#fda538", tagline: "Faith in Action", art: artMark },
  Luke: { abbr: "Lk", badge: "#f9bf40", tagline: "Good News for All", art: artLuke },
  John: { abbr: "Jn", badge: "#1cbcf9", tagline: "Believe and Live", art: artJohn },
  Acts: { abbr: "Ac", badge: "#2d8dfd", tagline: "The Gospel Spreads", art: artActs },
  Romans: { abbr: "Ro", badge: "#fb6149", tagline: "A New Life", art: artRomans },
  "1 Corinthians": {
    abbr: "1Co",
    badge: "#794df9",
    tagline: "Unity in Christ",
    art: art1Corinthians,
  },
  "2 Corinthians": {
    abbr: "2Co",
    badge: "#08c891",
    tagline: "Grace in Weakness",
    art: art2Corinthians,
  },
  Galatians: { abbr: "Ga", badge: "#3798fc", tagline: "Freedom in Christ", art: artGalatians },
  Ephesians: { abbr: "Ep", badge: "#19cdd9", tagline: "Walk in Love", art: artEphesians },
  Philippians: {
    abbr: "Php",
    badge: "#2ba6fb",
    tagline: "Joy in Every Season",
    art: artPhilippians,
  },
};

/** Two-letter stand-in for a book with no supplied badge. */
export function bookAbbr(name: string): string {
  const art = BOOK_ART[name];
  if (art) return art.abbr;
  const trimmed = name.replace(/^([123])\s*/, "$1");
  return trimmed.slice(0, 2);
}
