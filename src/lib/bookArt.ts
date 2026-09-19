import artGenesis from "@/assets/books/book-genesis.jpg";
import artExodus from "@/assets/books/book-exodus.jpg";
import artLeviticus from "@/assets/books/book-leviticus.jpg";
import artNumbers from "@/assets/books/book-numbers.jpg";
import artDeuteronomy from "@/assets/books/book-deuteronomy.jpg";
import artJoshua from "@/assets/books/book-joshua.jpg";
import artJudges from "@/assets/books/book-judges.jpg";
import artRuth from "@/assets/books/book-ruth.jpg";
import art1Samuel from "@/assets/books/book-1-samuel.jpg";
import art2Samuel from "@/assets/books/book-2-samuel.jpg";
import art1Kings from "@/assets/books/book-1-kings.jpg";
import art2Kings from "@/assets/books/book-2-kings.jpg";
import art1Chronicles from "@/assets/books/book-1-chronicles.jpg";
import art2Chronicles from "@/assets/books/book-2-chronicles.jpg";
import artEzra from "@/assets/books/book-ezra.jpg";
import artNehemiah from "@/assets/books/book-nehemiah.jpg";
import artEsther from "@/assets/books/book-esther.jpg";
import artJob from "@/assets/books/book-job.jpg";
import artPsalms from "@/assets/books/book-psalms.jpg";
import artProverbs from "@/assets/books/book-proverbs.jpg";
import artEcclesiastes from "@/assets/books/book-ecclesiastes.jpg";
import artSongOfSolomon from "@/assets/books/book-song-of-solomon.jpg";
import artIsaiah from "@/assets/books/book-isaiah.jpg";
import artJeremiah from "@/assets/books/book-jeremiah.jpg";
import artLamentations from "@/assets/books/book-lamentations.jpg";
import artEzekiel from "@/assets/books/book-ezekiel.jpg";
import artDaniel from "@/assets/books/book-daniel.jpg";
import artHosea from "@/assets/books/book-hosea.jpg";
import artJoel from "@/assets/books/book-joel.jpg";
import artAmos from "@/assets/books/book-amos.jpg";
import artObadiah from "@/assets/books/book-obadiah.jpg";
import artJonah from "@/assets/books/book-jonah.jpg";
import artMicah from "@/assets/books/book-micah.jpg";
import artNahum from "@/assets/books/book-nahum.jpg";
import artHabakkuk from "@/assets/books/book-habakkuk.jpg";
import artZephaniah from "@/assets/books/book-zephaniah.jpg";
import artHaggai from "@/assets/books/book-haggai.jpg";
import artZechariah from "@/assets/books/book-zechariah.jpg";
import artMalachi from "@/assets/books/book-malachi.jpg";
import artMatthew from "@/assets/books/book-matthew.jpg";
import artMark from "@/assets/books/book-mark.jpg";
import artLuke from "@/assets/books/book-luke.jpg";
import artJohn from "@/assets/books/book-john.jpg";
import artActs from "@/assets/books/book-acts.jpg";
import artRomans from "@/assets/books/book-romans.jpg";
import art1Corinthians from "@/assets/books/book-1-corinthians.jpg";
import art2Corinthians from "@/assets/books/book-2-corinthians.jpg";
import artGalatians from "@/assets/books/book-galatians.jpg";
import artEphesians from "@/assets/books/book-ephesians.jpg";
import artPhilippians from "@/assets/books/book-philippians.jpg";

/**
 * Per-book cover art, badge colour and tagline, taken from the Bible page
 * design. Artwork was supplied for the first fifty books; the remaining
 * sixteen fall back to a neutral cover and show no tagline until art exists
 * for them, rather than being given invented copy.
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
