import * as React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  IconButton,
  InputBase,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Popover,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { createTheme, useTheme, ThemeProvider } from "@mui/material/styles";
import { AccentSelection } from "../../../styles/AccentSelection";
import type { FirebaseError } from "firebase/app";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useAuthUser } from "../../../app/auth/useAuthUser";
import { ROUTINE_TAB_QUERY_KEY, ROUTINE_DOC_QUERY_KEY } from "../../produktograd/queryKeys";
import {
  ROUTINE_ALLOWED_STYLE_PROPS,
  buildPasteHtml,
  escapeHtml,
  sanitizeRichHtml,
} from "../../../shared/lib/richText";

const SHARED_ROUTINES_COLLECTION = "sharedRoutines";
const SHARED_ROUTINES_DOC_ID = "global";
const ROUTINE_TEXT_STYLE_OPTIONS = [
  { value: "p", label: "Normal tekst" },
  { value: "h1", label: "Tittel" },
  { value: "h2", label: "Overskrift 1" },
] as const;
const ROUTINE_FONT_OPTIONS = ["Arial", "Calibri", "Times New Roman", "Roboto", "Verdana"] as const;
const ROUTINE_TEXT_COLOR_SWATCHES = [
  ["#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff"],
  ["#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff"],
  ["#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc"],
  ["#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
  ["#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0"],
  ["#a61c00", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79"],
  ["#85200c", "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47"],
  ["#5b0f00", "#660000", "#783f04", "#7f6000", "#274e13", "#0c343d", "#1c4587", "#073763", "#20124d", "#4c1130"],
] as const;
const ROUTINE_EMOJI_CATEGORIES = [
  { id: "smileys", label: "Smilefjes og uttrykk", icon: "😀" },
  { id: "people", label: "Personer", icon: "🙋" },
  { id: "nature", label: "Dyr og natur", icon: "🌿" },
  { id: "food", label: "Mat og drikke", icon: "🍔" },
  { id: "objects", label: "Objekter", icon: "💡" },
  { id: "symbols", label: "Symboler", icon: "🏁" },
] as const;

type RoutineDocument = {
  id: string;
  title: string;
  content: string;
  updatedAtMs: number;
  updatedByUid?: string | null;
  updatedByName?: string | null;
  parentId?: string | null;
  emoji?: string | null;
};

type RoutineTextStyle = (typeof ROUTINE_TEXT_STYLE_OPTIONS)[number]["value"];
type RoutineEmojiCategory = (typeof ROUTINE_EMOJI_CATEGORIES)[number]["id"];
type RoutineEmojiOption = {
  emoji: string;
  label: string;
  keywords: string[];
  category: RoutineEmojiCategory;
};
type RoutineSearchOption = {
  id: string;
  docId: string;
  title: string;
  matchType: "title" | "content";
  snippet: string;
};

const ROUTINE_EMOJI_OPTIONS: RoutineEmojiOption[] = [
  { emoji: "😀", label: "Grinende ansikt", keywords: ["smil", "glad", "happy", "grin"], category: "smileys" },
  { emoji: "😃", label: "Smilende ansikt", keywords: ["smil", "glede", "joy"], category: "smileys" },
  { emoji: "😄", label: "Smil med øyne", keywords: ["smil", "glad", "teeth"], category: "smileys" },
  { emoji: "😁", label: "Stort grin", keywords: ["grin", "glis", "tenner"], category: "smileys" },
  { emoji: "😆", label: "Ler", keywords: ["ler", "latter", "haha"], category: "smileys" },
  { emoji: "😂", label: "Ler med tårer", keywords: ["ler", "tårer", "lol"], category: "smileys" },
  { emoji: "🤣", label: "Ruller av latter", keywords: ["ler", "rofl", "haha"], category: "smileys" },
  { emoji: "😊", label: "Varmt smil", keywords: ["smil", "blid", "fornøyd"], category: "smileys" },
  { emoji: "🙂", label: "Lett smil", keywords: ["ok", "fint", "smil"], category: "smileys" },
  { emoji: "😉", label: "Blunk", keywords: ["blunk", "wink", "hint"], category: "smileys" },
  { emoji: "😍", label: "Forelsket", keywords: ["hjerteøyne", "elsker", "love"], category: "smileys" },
  { emoji: "😘", label: "Kyss", keywords: ["kyss", "klem", "love"], category: "smileys" },
  { emoji: "😎", label: "Kul", keywords: ["cool", "solbriller", "kul"], category: "smileys" },
  { emoji: "🤩", label: "Stjerneøyne", keywords: ["stjerne", "imponert", "wow"], category: "smileys" },
  { emoji: "🤔", label: "Tenker", keywords: ["tenker", "hmm", "vurderer"], category: "smileys" },
  { emoji: "🫡", label: "Salutt", keywords: ["respekt", "ok", "forstått"], category: "smileys" },
  { emoji: "😴", label: "Søvnig", keywords: ["søvn", "trøtt", "sove"], category: "smileys" },
  { emoji: "😭", label: "Gråter", keywords: ["gråter", "trist", "sad"], category: "smileys" },
  { emoji: "😡", label: "Sint", keywords: ["sint", "irritert", "angry"], category: "smileys" },
  { emoji: "👍", label: "Tommel opp", keywords: ["ja", "ok", "godkjent"], category: "people" },
  { emoji: "👎", label: "Tommel ned", keywords: ["nei", "ikke ok", "dårlig"], category: "people" },
  { emoji: "👏", label: "Applaus", keywords: ["bra", "klapp", "feire"], category: "people" },
  { emoji: "🙌", label: "Hender opp", keywords: ["yay", "feire", "suksess"], category: "people" },
  { emoji: "🙏", label: "Takk", keywords: ["takk", "please", "bønn"], category: "people" },
  { emoji: "🤝", label: "Håndtrykk", keywords: ["avtale", "samarbeid", "deal"], category: "people" },
  { emoji: "💪", label: "Sterk", keywords: ["styrke", "power", "klar"], category: "people" },
  { emoji: "🧠", label: "Hjerne", keywords: ["tenk", "smart", "ide"], category: "people" },
  { emoji: "👀", label: "Øyne", keywords: ["se", "obs", "følger med"], category: "people" },
  { emoji: "🙋", label: "Rekker opp hånd", keywords: ["spørsmål", "hjelp", "jeg"], category: "people" },
  { emoji: "🤷", label: "Vet ikke", keywords: ["usikker", "aner ikke", "hmm"], category: "people" },
  { emoji: "🙆", label: "OK-tegn", keywords: ["ok", "greit", "godkjent"], category: "people" },
  { emoji: "👨‍⚕️", label: "Mannlig helsearbeider", keywords: ["lege", "helse", "medisin"], category: "people" },
  { emoji: "👩‍⚕️", label: "Kvinnelig helsearbeider", keywords: ["lege", "helse", "medisin"], category: "people" },
  { emoji: "🧑‍⚕️", label: "Helsearbeider", keywords: ["farmasøyt", "helse", "klinikk"], category: "people" },
  { emoji: "✅", label: "Fullført", keywords: ["ferdig", "done", "sjekk"], category: "symbols" },
  { emoji: "☑️", label: "Avkrysset", keywords: ["checkbox", "sjekk", "liste"], category: "symbols" },
  { emoji: "❌", label: "Feil", keywords: ["ikke", "x", "stopp"], category: "symbols" },
  { emoji: "⚠️", label: "Advarsel", keywords: ["obs", "fare", "viktig"], category: "symbols" },
  { emoji: "🚫", label: "Forbudt", keywords: ["nei", "forbud", "stopp"], category: "symbols" },
  { emoji: "🔁", label: "Gjenta", keywords: ["repeat", "rutine", "igjen"], category: "symbols" },
  { emoji: "📌", label: "Fest", keywords: ["pin", "viktig", "husk"], category: "symbols" },
  { emoji: "📍", label: "Posisjon", keywords: ["sted", "lokasjon", "punkt"], category: "symbols" },
  { emoji: "➡️", label: "Pil høyre", keywords: ["neste", "gå videre", "pil"], category: "symbols" },
  { emoji: "⬅️", label: "Pil venstre", keywords: ["tilbake", "forrige", "pil"], category: "symbols" },
  { emoji: "⬆️", label: "Pil opp", keywords: ["opp", "pil"], category: "symbols" },
  { emoji: "⬇️", label: "Pil ned", keywords: ["ned", "pil"], category: "symbols" },
  { emoji: "🏁", label: "Mål", keywords: ["mål", "ferdig", "finish"], category: "symbols" },
  { emoji: "📄", label: "Dokument", keywords: ["fane", "doc", "tekst"], category: "objects" },
  { emoji: "🗂️", label: "Mappe", keywords: ["sorter", "arkiv", "struktur"], category: "objects" },
  { emoji: "📝", label: "Notat", keywords: ["skrive", "notat", "tekst"], category: "objects" },
  { emoji: "📋", label: "Utklippstavle", keywords: ["liste", "sjekkliste", "clipboard"], category: "objects" },
  { emoji: "📎", label: "Vedlegg", keywords: ["attach", "vedlegg", "fil"], category: "objects" },
  { emoji: "🔗", label: "Lenke", keywords: ["link", "url", "nett"], category: "objects" },
  { emoji: "🧾", label: "Kvittering", keywords: ["ordre", "kvittering", "regning"], category: "objects" },
  { emoji: "📦", label: "Pakke", keywords: ["produkt", "levering", "pakke"], category: "objects" },
  { emoji: "💊", label: "Pille", keywords: ["medisin", "tablet", "dose"], category: "objects" },
  { emoji: "🩺", label: "Stetoskop", keywords: ["helse", "klinikk", "undersøkelse"], category: "objects" },
  { emoji: "🧪", label: "Prøve", keywords: ["test", "lab", "analyse"], category: "objects" },
  { emoji: "💡", label: "Idé", keywords: ["forslag", "ide", "tips"], category: "objects" },
  { emoji: "🔔", label: "Varsel", keywords: ["påminnelse", "alarm", "obs"], category: "objects" },
  { emoji: "⏰", label: "Klokke", keywords: ["tid", "deadline", "husk"], category: "objects" },
  { emoji: "🐞", label: "Bug", keywords: ["feil", "bug", "issue"], category: "nature" },
  { emoji: "🪲", label: "Bille", keywords: ["insekt", "bugg", "feil"], category: "nature" },
  { emoji: "🌱", label: "Spire", keywords: ["ny", "vekst", "start"], category: "nature" },
  { emoji: "🌿", label: "Urter", keywords: ["natur", "grønn", "frisk"], category: "nature" },
  { emoji: "🍀", label: "Kløver", keywords: ["lykke", "heldig"], category: "nature" },
  { emoji: "🌟", label: "Stjerne", keywords: ["viktig", "favoritt", "best"], category: "nature" },
  { emoji: "🔥", label: "Ild", keywords: ["haste", "hot", "kritisk"], category: "nature" },
  { emoji: "💧", label: "Dråpe", keywords: ["væske", "vann"], category: "nature" },
  { emoji: "🍎", label: "Eple", keywords: ["mat", "sunn", "frukt"], category: "food" },
  { emoji: "🥗", label: "Salat", keywords: ["mat", "lunsj", "sunt"], category: "food" },
  { emoji: "☕", label: "Kaffe", keywords: ["pause", "kaffe", "drikke"], category: "food" },
  { emoji: "🧋", label: "Drikke", keywords: ["drikke", "te", "juice"], category: "food" },
  { emoji: "🍽️", label: "Måltid", keywords: ["middag", "måltid", "mat"], category: "food" },
  { emoji: "🍔", label: "Burger", keywords: ["fastfood", "mat"], category: "food" },
  { emoji: "😇", label: "Engleansikt", keywords: ["snill", "ren", "god"], category: "smileys" },
  { emoji: "🥳", label: "Feiring", keywords: ["party", "feire", "gratulerer"], category: "smileys" },
  { emoji: "🤗", label: "Klem", keywords: ["klem", "varm", "støtte"], category: "smileys" },
  { emoji: "🤭", label: "Holder for munnen", keywords: ["ops", "hemmelig", "fnis"], category: "smileys" },
  { emoji: "🤫", label: "Hysj", keywords: ["stille", "hemmelig", "hysj"], category: "smileys" },
  { emoji: "🫠", label: "Smelter", keywords: ["stress", "varm", "sliten"], category: "smileys" },
  { emoji: "😮", label: "Overrasket", keywords: ["wow", "oj", "overrasket"], category: "smileys" },
  { emoji: "😯", label: "Forbauset", keywords: ["forbauset", "wow"], category: "smileys" },
  { emoji: "😲", label: "Sjokk", keywords: ["sjokk", "oi"], category: "smileys" },
  { emoji: "😳", label: "Flau", keywords: ["flau", "rødmer"], category: "smileys" },
  { emoji: "🙃", label: "Opp-ned", keywords: ["tull", "ironi"], category: "smileys" },
  { emoji: "🫣", label: "Titter", keywords: ["redd", "spenning"], category: "smileys" },
  { emoji: "🤨", label: "Skeptisk", keywords: ["tvil", "skeptisk"], category: "smileys" },
  { emoji: "🧐", label: "Undersøker", keywords: ["analyse", "ser nøye"], category: "smileys" },
  { emoji: "🤯", label: "Mind blown", keywords: ["sjokk", "helt vilt"], category: "smileys" },
  { emoji: "🤖", label: "Robot", keywords: ["bot", "ai", "teknisk"], category: "smileys" },
  { emoji: "🧑‍💻", label: "Utvikler", keywords: ["kode", "dev", "pc"], category: "people" },
  { emoji: "👨‍💻", label: "Mannlig utvikler", keywords: ["kode", "utvikler"], category: "people" },
  { emoji: "👩‍💻", label: "Kvinnelig utvikler", keywords: ["kode", "utvikler"], category: "people" },
  { emoji: "🧑‍🔬", label: "Forsker", keywords: ["lab", "forskning"], category: "people" },
  { emoji: "👨‍🔬", label: "Mannlig forsker", keywords: ["lab", "forskning"], category: "people" },
  { emoji: "👩‍🔬", label: "Kvinnelig forsker", keywords: ["lab", "forskning"], category: "people" },
  { emoji: "🧑‍🏫", label: "Lærer", keywords: ["opplæring", "forklare"], category: "people" },
  { emoji: "👨‍🏫", label: "Mannlig lærer", keywords: ["lærer"], category: "people" },
  { emoji: "👩‍🏫", label: "Kvinnelig lærer", keywords: ["lærer"], category: "people" },
  { emoji: "🧑‍🔧", label: "Tekniker", keywords: ["fiks", "verktøy"], category: "people" },
  { emoji: "👨‍🔧", label: "Mannlig tekniker", keywords: ["tekniker"], category: "people" },
  { emoji: "👩‍🔧", label: "Kvinnelig tekniker", keywords: ["tekniker"], category: "people" },
  { emoji: "👷", label: "Byggarbeider", keywords: ["bygge", "jobb"], category: "people" },
  { emoji: "🕵️", label: "Detektiv", keywords: ["sjekk", "undersøke"], category: "people" },
  { emoji: "💁", label: "Hjelper", keywords: ["hjelp", "info"], category: "people" },
  { emoji: "🙅", label: "Ikke lov", keywords: ["nei", "stopp"], category: "people" },
  { emoji: "🧍", label: "Står", keywords: ["vente", "klar"], category: "people" },
  { emoji: "🏃", label: "Løper", keywords: ["haste", "rask"], category: "people" },
  { emoji: "🌸", label: "Blomst", keywords: ["blomst", "vår"], category: "nature" },
  { emoji: "🌼", label: "Gul blomst", keywords: ["blomst", "sommer"], category: "nature" },
  { emoji: "🌻", label: "Solsikke", keywords: ["blomst", "sol"], category: "nature" },
  { emoji: "🌷", label: "Tulipan", keywords: ["blomst"], category: "nature" },
  { emoji: "🌳", label: "Tre", keywords: ["skog", "natur"], category: "nature" },
  { emoji: "🌲", label: "Gran", keywords: ["skog", "tre"], category: "nature" },
  { emoji: "🌵", label: "Kaktus", keywords: ["tørr", "ørken"], category: "nature" },
  { emoji: "☀️", label: "Sol", keywords: ["vær", "sol"], category: "nature" },
  { emoji: "🌙", label: "Måne", keywords: ["natt", "kveld"], category: "nature" },
  { emoji: "⭐", label: "Stjerne", keywords: ["favoritt", "viktig"], category: "nature" },
  { emoji: "🌈", label: "Regnbue", keywords: ["farger", "regnbue"], category: "nature" },
  { emoji: "⛈️", label: "Tordenvær", keywords: ["vær", "storm"], category: "nature" },
  { emoji: "🐶", label: "Hund", keywords: ["dyr", "hund"], category: "nature" },
  { emoji: "🐱", label: "Katt", keywords: ["dyr", "katt"], category: "nature" },
  { emoji: "🐭", label: "Mus", keywords: ["dyr", "mus"], category: "nature" },
  { emoji: "🐰", label: "Kanin", keywords: ["dyr", "kanin"], category: "nature" },
  { emoji: "🦊", label: "Rev", keywords: ["dyr", "rev"], category: "nature" },
  { emoji: "🐻", label: "Bjørn", keywords: ["dyr", "bjørn"], category: "nature" },
  { emoji: "🐼", label: "Panda", keywords: ["dyr", "panda"], category: "nature" },
  { emoji: "🍕", label: "Pizza", keywords: ["mat", "pizza"], category: "food" },
  { emoji: "🌮", label: "Taco", keywords: ["mat", "taco"], category: "food" },
  { emoji: "🍣", label: "Sushi", keywords: ["mat", "sushi"], category: "food" },
  { emoji: "🍜", label: "Nudler", keywords: ["mat", "suppe"], category: "food" },
  { emoji: "🍚", label: "Ris", keywords: ["mat", "ris"], category: "food" },
  { emoji: "🍞", label: "Brød", keywords: ["mat", "frokost"], category: "food" },
  { emoji: "🧀", label: "Ost", keywords: ["mat", "ost"], category: "food" },
  { emoji: "🍗", label: "Kylling", keywords: ["mat", "middag"], category: "food" },
  { emoji: "🍪", label: "Kjeks", keywords: ["snacks", "søtt"], category: "food" },
  { emoji: "🍫", label: "Sjokolade", keywords: ["søtt", "snacks"], category: "food" },
  { emoji: "🍇", label: "Druer", keywords: ["frukt", "mat"], category: "food" },
  { emoji: "🍌", label: "Banan", keywords: ["frukt", "mat"], category: "food" },
  { emoji: "🍓", label: "Jordbær", keywords: ["frukt", "bær"], category: "food" },
  { emoji: "🍒", label: "Kirsebær", keywords: ["frukt", "bær"], category: "food" },
  { emoji: "🥑", label: "Avokado", keywords: ["mat", "sunt"], category: "food" },
  { emoji: "🥕", label: "Gulrot", keywords: ["grønnsak", "mat"], category: "food" },
  { emoji: "🥔", label: "Potet", keywords: ["grønnsak", "mat"], category: "food" },
  { emoji: "🥦", label: "Brokkoli", keywords: ["grønnsak", "mat"], category: "food" },
  { emoji: "🖊️", label: "Penn", keywords: ["skriv", "notat"], category: "objects" },
  { emoji: "✏️", label: "Blyant", keywords: ["skriv", "rediger"], category: "objects" },
  { emoji: "🖍️", label: "Fargestift", keywords: ["tegn", "farge"], category: "objects" },
  { emoji: "📚", label: "Bøker", keywords: ["les", "opplæring"], category: "objects" },
  { emoji: "📖", label: "Åpen bok", keywords: ["les", "dokumentasjon"], category: "objects" },
  { emoji: "🗃️", label: "Arkiv", keywords: ["arkiv", "lagring"], category: "objects" },
  { emoji: "🧰", label: "Verktøykasse", keywords: ["verktøy", "fiks"], category: "objects" },
  { emoji: "🧷", label: "Nål", keywords: ["fest", "pin"], category: "objects" },
  { emoji: "🔒", label: "Lås", keywords: ["sikkerhet", "lås"], category: "objects" },
  { emoji: "🔓", label: "Lås opp", keywords: ["åpen", "tilgang"], category: "objects" },
  { emoji: "💻", label: "Laptop", keywords: ["pc", "jobb"], category: "objects" },
  { emoji: "🖥️", label: "Skjerm", keywords: ["monitor", "pc"], category: "objects" },
  { emoji: "⌨️", label: "Tastatur", keywords: ["skriv", "pc"], category: "objects" },
  { emoji: "🖨️", label: "Printer", keywords: ["skriv ut", "print"], category: "objects" },
  { emoji: "📱", label: "Mobil", keywords: ["telefon", "app"], category: "objects" },
  { emoji: "🚚", label: "Lastebil", keywords: ["transport", "levering"], category: "objects" },
  { emoji: "🚑", label: "Ambulanse", keywords: ["akutt", "helse"], category: "objects" },
  { emoji: "⭐", label: "Favoritt", keywords: ["stjerne", "favoritt"], category: "symbols" },
  { emoji: "❗", label: "Utropstegn", keywords: ["viktig", "obs"], category: "symbols" },
  { emoji: "❓", label: "Spørsmålstegn", keywords: ["spørsmål", "uklart"], category: "symbols" },
  { emoji: "⭕", label: "Sirkel", keywords: ["markering", "sirkel"], category: "symbols" },
  { emoji: "🔵", label: "Blå sirkel", keywords: ["blå", "status"], category: "symbols" },
  { emoji: "🟢", label: "Grønn sirkel", keywords: ["grønn", "ok"], category: "symbols" },
  { emoji: "🟡", label: "Gul sirkel", keywords: ["gul", "vent"], category: "symbols" },
  { emoji: "🔴", label: "Rød sirkel", keywords: ["rød", "stopp"], category: "symbols" },
  { emoji: "🟣", label: "Lilla sirkel", keywords: ["lilla", "status"], category: "symbols" },
  { emoji: "⚪", label: "Hvit sirkel", keywords: ["hvit"], category: "symbols" },
  { emoji: "⚫", label: "Svart sirkel", keywords: ["svart"], category: "symbols" },
  { emoji: "✳️", label: "Asterisk", keywords: ["stjerne", "markering"], category: "symbols" },
  { emoji: "♻️", label: "Resirkulering", keywords: ["gjenbruk", "loop"], category: "symbols" },
  { emoji: "🆕", label: "Ny", keywords: ["ny", "new"], category: "symbols" },
  { emoji: "🆗", label: "OK", keywords: ["ok", "godkjent"], category: "symbols" },
  { emoji: "🛑", label: "Stopp", keywords: ["stopp", "ikke"], category: "symbols" },
  { emoji: "🔺", label: "Trekant opp", keywords: ["opp", "pil"], category: "symbols" },
  { emoji: "🔻", label: "Trekant ned", keywords: ["ned", "pil"], category: "symbols" },
];

function toMillis(value: any): number {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

function formatDateTime(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function extractTextFromHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || temp.innerText || "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRoutineMatchSnippet(text: string, query: string): string {
  const source = text.replace(/\s+/g, " ").trim();
  if (!source) return "";
  const normalizedQuery = query.trim().toLocaleLowerCase("nb-NO");
  if (!normalizedQuery) return source.slice(0, 120);

  const lower = source.toLocaleLowerCase("nb-NO");
  const index = lower.indexOf(normalizedQuery);
  if (index < 0) return source.slice(0, 120);

  let sentenceStart = index;
  while (sentenceStart > 0 && !/[.!?]/.test(source[sentenceStart - 1])) {
    sentenceStart -= 1;
  }

  let sentenceEnd = index + normalizedQuery.length;
  while (sentenceEnd < source.length && !/[.!?]/.test(source[sentenceEnd])) {
    sentenceEnd += 1;
  }
  if (sentenceEnd < source.length) sentenceEnd += 1;

  let snippet = source.slice(sentenceStart, sentenceEnd).trim();
  if (!snippet) snippet = source.slice(Math.max(0, index - 48), Math.min(source.length, index + normalizedQuery.length + 68)).trim();

  const tooLong = snippet.length > 180;
  if (tooLong) {
    const localMatch = snippet.toLocaleLowerCase("nb-NO").indexOf(normalizedQuery);
    const fallbackStart = Math.max(0, localMatch - 42);
    const fallbackEnd = Math.min(snippet.length, localMatch + normalizedQuery.length + 72);
    const prefix = fallbackStart > 0 ? "..." : "";
    const suffix = fallbackEnd < snippet.length ? "..." : "";
    return `${prefix}${snippet.slice(fallbackStart, fallbackEnd)}${suffix}`;
  }

  const prefix = sentenceStart > 0 ? "..." : "";
  const suffix = sentenceEnd < source.length ? "..." : "";
  return `${prefix}${snippet}${suffix}`;
}

function renderHighlightedText(text: string, query: string): React.ReactNode {
  const value = String(text ?? "");
  const search = query.trim();
  if (!search) return value;

  const pattern = new RegExp(`(${escapeRegExp(search)})`, "gi");
  const parts = value.split(pattern);
  if (parts.length === 1) return value;
  const normalized = search.toLocaleLowerCase("nb-NO");

  return parts.map((part, index) => {
    const isMatch = part.toLocaleLowerCase("nb-NO") === normalized;
    if (!isMatch) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    return (
      <Box
        key={`${part}-${index}`}
        component="mark"
        sx={{
          px: 0.35,
          borderRadius: 0.6,
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(251,191,36,0.24)" : "rgba(250,204,21,0.35)"),
          color: "inherit",
        }}
      >
        {part}
      </Box>
    );
  });
}



function createRoutineDocId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `routine-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeRoutineContent(raw: string): string {
  const value = String(raw ?? "");
  if (!value.trim()) return "<p><br></p>";
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  const escaped = escapeHtml(value).replace(/\n/g, "<br>");
  return `<p>${escaped}</p>`;
}

function getRoutineDepth(doc: RoutineDocument, byId: Map<string, RoutineDocument>): number {
  let depth = 0;
  let current = doc.parentId ?? null;
  let guard = 0;
  while (current && guard < 12) {
    const parent = byId.get(current);
    if (!parent) break;
    depth += 1;
    current = parent.parentId ?? null;
    guard += 1;
  }
  return depth;
}

function isRoutineDescendant(doc: RoutineDocument, ancestorId: string, byId: Map<string, RoutineDocument>): boolean {
  let current = doc.parentId ?? null;
  let guard = 0;
  while (current && guard < 24) {
    if (current === ancestorId) return true;
    const parent = byId.get(current);
    if (!parent) break;
    current = parent.parentId ?? null;
    guard += 1;
  }
  return false;
}

function mapFirebaseError(error: unknown, fallback: string): string {
  const firebaseError = error as FirebaseError | undefined;
  const code = firebaseError?.code ?? "";

  if (code === "permission-denied") {
    return "Mangler tilgang i Firestore-regler (permission-denied).";
  }
  if (code === "unauthenticated") {
    return "Du er ikke autentisert (unauthenticated).";
  }
  if (code === "failed-precondition") {
    return "Feil precondition fra Firebase (failed-precondition).";
  }

  return code ? `${fallback} (${code})` : fallback;
}

export default function TilbakemeldingPage() {
  const baseTheme = useTheme();
  const isDark = baseTheme.palette.mode === "dark";
  const PURPLE = "#B648E8";
  const purpleTheme = React.useMemo(() => createTheme(baseTheme, { palette: { primary: baseTheme.palette.augmentColor({ color: { main: PURPLE } }) } }), [baseTheme]);
  const initialRouteState = React.useMemo(() => {
    if (typeof window === "undefined") return { routineDocId: null as string | null };
    const params = new URLSearchParams(window.location.search);
    const routineDocId = (params.get(ROUTINE_DOC_QUERY_KEY) ?? "").trim() || null;
    return { routineDocId };
  }, []);

  const { user, firstName } = useAuthUser();

  const [routineDocuments, setRoutineDocuments] = React.useState<RoutineDocument[]>([]);
  const [selectedRoutineDocumentId, setSelectedRoutineDocumentId] = React.useState<string | null>(null);
  const [routineSidebarWidth, setRoutineSidebarWidth] = React.useState(250);
  const [isRoutineResizing, setIsRoutineResizing] = React.useState(false);
  const [routineLoaded, setRoutineLoaded] = React.useState(false);
  const [routineTextStyle, setRoutineTextStyle] = React.useState<RoutineTextStyle>("p");
  const [routineFontFamily, setRoutineFontFamily] = React.useState<(typeof ROUTINE_FONT_OPTIONS)[number]>("Arial");
  const [routineTextColor, setRoutineTextColor] = React.useState("#111827");
  const [routineColorAnchorEl, setRoutineColorAnchorEl] = React.useState<HTMLElement | null>(null);
  const [routineLinkAnchorEl, setRoutineLinkAnchorEl] = React.useState<HTMLElement | null>(null);
  const [routineLinkLabel, setRoutineLinkLabel] = React.useState("");
  const [routineLinkUrl, setRoutineLinkUrl] = React.useState("");
  const [routineLinkError, setRoutineLinkError] = React.useState<string | null>(null);
  const [routineDocMenuAnchorEl, setRoutineDocMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [routineDocMenuTargetId, setRoutineDocMenuTargetId] = React.useState<string | null>(null);
  const [routineEmojiPickerAnchorEl, setRoutineEmojiPickerAnchorEl] = React.useState<HTMLElement | null>(null);
  const [routineEmojiPickerTargetId, setRoutineEmojiPickerTargetId] = React.useState<string | null>(null);
  const [routineEmojiQuery, setRoutineEmojiQuery] = React.useState("");
  const [routineEmojiCategory, setRoutineEmojiCategory] = React.useState<RoutineEmojiCategory>("smileys");
  const [routineSearchQuery, setRoutineSearchQuery] = React.useState("");
  const [routineUserNameByUid, setRoutineUserNameByUid] = React.useState<Record<string, string>>({});
  const [editingRoutineDocId, setEditingRoutineDocId] = React.useState<string | null>(null);
  const [editingRoutineDocTitle, setEditingRoutineDocTitle] = React.useState("");
  const [routineFormatState, setRoutineFormatState] = React.useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const routineLayoutRef = React.useRef<HTMLDivElement | null>(null);
  const routineEditorRef = React.useRef<HTMLDivElement | null>(null);
  const routineSearchInputRef = React.useRef<HTMLInputElement | null>(null);
  const routineRenameInputRef = React.useRef<HTMLInputElement | null>(null);
  const routineRenameTimerRef = React.useRef<number | null>(null);
  const pendingDeepLinkedRoutineIdRef = React.useRef<string | null>(initialRouteState.routineDocId);
  const activeRoutineDocRef = React.useRef<string | null>(null);
  const routineSelectionRef = React.useRef<Range | null>(null);
  const routineSyncSignatureRef = React.useRef("");

  const [copyToast, setCopyToast] = React.useState<{
    message: string;
    severity: "success" | "error" | "info";
  } | null>(null);
  const routineActorName = React.useMemo(
    () => firstName?.trim() || user?.displayName?.trim() || user?.email?.trim() || "Ukjent bruker",
    [firstName, user?.displayName, user?.email]
  );
  const sharedRoutineDocRef = React.useMemo(
    () => doc(db, SHARED_ROUTINES_COLLECTION, SHARED_ROUTINES_DOC_ID),
    []
  );
  const selectedRoutineDocument = React.useMemo(
    () => routineDocuments.find((docItem) => docItem.id === selectedRoutineDocumentId) ?? null,
    [routineDocuments, selectedRoutineDocumentId]
  );
  const selectedRoutineUpdatedByLabel = React.useMemo(() => {
    if (!selectedRoutineDocument) return "Ukjent bruker";
    if (selectedRoutineDocument.updatedByName?.trim()) return selectedRoutineDocument.updatedByName.trim();
    const updatedUid = selectedRoutineDocument.updatedByUid?.trim();
    if (updatedUid && routineUserNameByUid[updatedUid]) return routineUserNameByUid[updatedUid];
    if (updatedUid && user?.uid && updatedUid === user.uid) return routineActorName;
    return "Ukjent bruker";
  }, [routineActorName, routineUserNameByUid, selectedRoutineDocument, user?.uid]);
  const routineDocumentsById = React.useMemo(
    () => new Map(routineDocuments.map((docItem) => [docItem.id, docItem])),
    [routineDocuments]
  );
  const showRoutineLabels = routineSidebarWidth >= 170;
  const routineColorMenuOpen = Boolean(routineColorAnchorEl);
  const routineLinkMenuOpen = Boolean(routineLinkAnchorEl);
  const routineDocMenuOpen = Boolean(routineDocMenuAnchorEl);
  const routineEmojiPickerOpen = Boolean(routineEmojiPickerAnchorEl);
  const routineDocMenuTarget =
    routineDocMenuTargetId ? routineDocuments.find((docItem) => docItem.id === routineDocMenuTargetId) ?? null : null;
  const routineEmojiTarget =
    routineEmojiPickerTargetId
      ? routineDocuments.find((docItem) => docItem.id === routineEmojiPickerTargetId) ?? null
      : null;
  const routineActiveEmojiCategory = React.useMemo(
    () => ROUTINE_EMOJI_CATEGORIES.find((category) => category.id === routineEmojiCategory) ?? ROUTINE_EMOJI_CATEGORIES[0],
    [routineEmojiCategory]
  );
  const routineSearchOptions = React.useMemo(() => {
    const rawQuery = routineSearchQuery.trim();
    const query = rawQuery.toLocaleLowerCase("nb-NO");
    if (query.length < 2) return [];

    const titleMatches: RoutineSearchOption[] = [];
    const contentMatches: RoutineSearchOption[] = [];

    routineDocuments.forEach((docItem) => {
      const title = (docItem.title || "Uten tittel").trim();
      const titleLower = title.toLocaleLowerCase("nb-NO");
      if (titleLower.includes(query)) {
        titleMatches.push({
          id: `${docItem.id}-title`,
          docId: docItem.id,
          title,
          matchType: "title",
          snippet: "",
        });
        return;
      }

      const plainText = extractTextFromHtml(docItem.content);
      const plainLower = plainText.toLocaleLowerCase("nb-NO");
      if (!plainLower.includes(query)) return;
      contentMatches.push({
        id: `${docItem.id}-content`,
        docId: docItem.id,
        title,
        matchType: "content",
        snippet: buildRoutineMatchSnippet(plainText, rawQuery),
      });
    });

    return [...titleMatches, ...contentMatches];
  }, [routineDocuments, routineSearchQuery]);
  const routineFilteredEmojis = React.useMemo(() => {
    const query = routineEmojiQuery.trim().toLocaleLowerCase("nb-NO");
    return ROUTINE_EMOJI_OPTIONS.filter((option) => {
      if (!query) return option.category === routineEmojiCategory;
      const haystack = `${option.label} ${option.keywords.join(" ")}`.toLocaleLowerCase("nb-NO");
      return haystack.includes(query);
    });
  }, [routineEmojiCategory, routineEmojiQuery]);

  React.useEffect(() => {
    if (!editingRoutineDocId) return;
    if (routineDocuments.some((docItem) => docItem.id === editingRoutineDocId)) return;
    setEditingRoutineDocId(null);
    setEditingRoutineDocTitle("");
  }, [editingRoutineDocId, routineDocuments]);

  React.useEffect(() => {
    if (!routineEmojiPickerTargetId) return;
    if (routineDocuments.some((docItem) => docItem.id === routineEmojiPickerTargetId)) return;
    setRoutineEmojiPickerAnchorEl(null);
    setRoutineEmojiPickerTargetId(null);
    setRoutineEmojiQuery("");
  }, [routineDocuments, routineEmojiPickerTargetId]);

  React.useEffect(
    () => () => {
      if (routineRenameTimerRef.current) {
        window.clearTimeout(routineRenameTimerRef.current);
      }
    },
    []
  );

  React.useEffect(() => {
    if (!editingRoutineDocId) return;
    const raf = window.requestAnimationFrame(() => {
      routineRenameInputRef.current?.focus();
      routineRenameInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [editingRoutineDocId]);

  React.useEffect(() => {
    if (!user?.uid || routineDocuments.length === 0) return;

    const missingUids = Array.from(
      new Set(
        routineDocuments
          .map((docItem) => docItem.updatedByUid?.trim())
          .filter((uid): uid is string => Boolean(uid) && !routineUserNameByUid[uid!])
      )
    );
    if (missingUids.length === 0) return;

    let cancelled = false;

    void Promise.all(
      missingUids.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          const data = snap.exists() ? (snap.data() as any) : null;
          const firstName = typeof data?.firstName === "string" ? data.firstName.trim() : "";
          if (firstName) return [uid, firstName] as const;
          return [uid, "Ukjent bruker"] as const;
        } catch {
          return [uid, "Ukjent bruker"] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setRoutineUserNameByUid((prev) => {
        const next = { ...prev };
        entries.forEach(([uid, name]) => {
          next[uid] = name;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [routineDocuments, routineUserNameByUid, user?.uid]);

  const createDefaultRoutineDocument = React.useCallback(
    (): RoutineDocument => ({
      id: createRoutineDocId(),
      title: "Fane 1",
      content: "",
      updatedAtMs: Date.now(),
      updatedByUid: user?.uid ?? null,
      updatedByName: routineActorName,
      parentId: null,
      emoji: null,
    }),
    [routineActorName, user?.uid]
  );

  React.useEffect(() => {
    if (!user?.uid) {
      const first = createDefaultRoutineDocument();
      setRoutineDocuments([first]);
      setSelectedRoutineDocumentId(first.id);
      setRoutineLoaded(false);
      routineSyncSignatureRef.current = "";
      return;
    }

    setRoutineLoaded(false);
    const unsubscribe = onSnapshot(
      sharedRoutineDocRef,
      (snapshot) => {
        const data = snapshot.exists() ? (snapshot.data() as any) : null;
        const sharedUpdatedAtMs = toMillis(data?.updatedAt);
        const docs = Array.isArray(data?.documents)
          ? data.documents
              .map((docItem: unknown): RoutineDocument | null => {
                if (
                  !docItem ||
                  typeof (docItem as any).id !== "string" ||
                  typeof (docItem as any).title !== "string" ||
                  typeof (docItem as any).content !== "string"
                ) {
                  return null;
                }
                return {
                  id: (docItem as any).id,
                  title: (docItem as any).title,
                  content: (docItem as any).content,
                  updatedAtMs:
                    typeof (docItem as any).updatedAtMs === "number"
                      ? (docItem as any).updatedAtMs
                      : toMillis((docItem as any).updatedAt) || sharedUpdatedAtMs || Date.now(),
                  updatedByUid:
                    typeof (docItem as any).updatedByUid === "string"
                      ? (docItem as any).updatedByUid
                      : typeof data?.updatedBy === "string"
                        ? data.updatedBy
                        : null,
                  updatedByName:
                    typeof (docItem as any).updatedByName === "string"
                      ? (docItem as any).updatedByName
                      : typeof data?.updatedByName === "string"
                        ? data.updatedByName
                        : null,
                  parentId: typeof (docItem as any).parentId === "string" ? (docItem as any).parentId : null,
                  emoji: typeof (docItem as any).emoji === "string" ? (docItem as any).emoji : null,
                };
              })
              .filter((docItem: RoutineDocument | null): docItem is RoutineDocument => docItem !== null)
          : [];

        const normalizedDocs: RoutineDocument[] = docs.length > 0 ? docs : [createDefaultRoutineDocument()];
        const shouldSeedSharedDoc = !snapshot.exists() || docs.length === 0;
        const nextSelectedId =
          typeof data?.selectedId === "string" &&
          normalizedDocs.some((docItem: RoutineDocument) => docItem.id === data.selectedId)
            ? data.selectedId
            : normalizedDocs[0].id;

        routineSyncSignatureRef.current = shouldSeedSharedDoc
          ? ""
          : JSON.stringify({
              documents: normalizedDocs,
              selectedId: nextSelectedId,
            });
        setRoutineDocuments(normalizedDocs);
        setSelectedRoutineDocumentId(nextSelectedId);
        setRoutineLoaded(true);
      },
      (err) => {
        setCopyToast({ message: mapFirebaseError(err, "Kunne ikke laste rutiner."), severity: "error" });
        setRoutineLoaded(true);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [createDefaultRoutineDocument, sharedRoutineDocRef, user?.uid]);

  React.useEffect(() => {
    if (!user?.uid || !routineLoaded || routineDocuments.length === 0) return;
    const payload = {
      // Rens innholdet før lagring: behold farge/font, fjern font-size/span-søppel
      // fra innliming. Deterministisk, så signaturen under er fortsatt stabil.
      documents: routineDocuments.map((docItem) => ({
        ...docItem,
        content: sanitizeRichHtml(docItem.content, ROUTINE_ALLOWED_STYLE_PROPS),
      })),
      selectedId: selectedRoutineDocumentId ?? routineDocuments[0].id,
    };
    const signature = JSON.stringify(payload);
    if (signature === routineSyncSignatureRef.current) return;

    routineSyncSignatureRef.current = signature;
    void setDoc(
      sharedRoutineDocRef,
      {
        ...payload,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedByName: routineActorName,
      },
      { merge: true }
    ).catch((err) => {
      routineSyncSignatureRef.current = "";
      setCopyToast({ message: mapFirebaseError(err, "Kunne ikke lagre rutiner."), severity: "error" });
    });
  }, [routineActorName, routineDocuments, routineLoaded, selectedRoutineDocumentId, sharedRoutineDocRef, user?.uid]);

  React.useEffect(() => {
    const deepLinkedRoutineId = pendingDeepLinkedRoutineIdRef.current;
    if (!deepLinkedRoutineId) return;
    const match = routineDocuments.find((docItem) => docItem.id === deepLinkedRoutineId);
    if (match) {
      setSelectedRoutineDocumentId(match.id);
      pendingDeepLinkedRoutineIdRef.current = null;
      return;
    }
    if (routineLoaded) {
      pendingDeepLinkedRoutineIdRef.current = null;
    }
  }, [routineDocuments, routineLoaded]);

  React.useEffect(() => {
    if (!isRoutineResizing) return;

    const onMove = (event: MouseEvent) => {
      const container = routineLayoutRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const maxWidth = Math.max(220, rect.width - 280);
      const next = Math.min(maxWidth, Math.max(72, event.clientX - rect.left));
      setRoutineSidebarWidth(next);
    };

    const onUp = () => setIsRoutineResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isRoutineResizing]);

  const handleAddRoutineDocument = React.useCallback(() => {
    setRoutineDocuments((prev) => {
      const nextCount = prev.length + 1;
      const created: RoutineDocument = {
        id: createRoutineDocId(),
        title: `Fane ${nextCount}`,
        content: "",
        updatedAtMs: Date.now(),
        updatedByUid: user?.uid ?? null,
        updatedByName: routineActorName,
        parentId: null,
        emoji: null,
      };
      setSelectedRoutineDocumentId(created.id);
      return [...prev, created];
    });
  }, [routineActorName, user?.uid]);

  const closeRoutineDocMenu = React.useCallback(() => {
    setRoutineDocMenuAnchorEl(null);
    setRoutineDocMenuTargetId(null);
  }, []);

  const closeRoutineEmojiPicker = React.useCallback(() => {
    setRoutineEmojiPickerAnchorEl(null);
    setRoutineEmojiPickerTargetId(null);
    setRoutineEmojiQuery("");
  }, []);

  const openRoutineDocMenu = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, docId: string) => {
      event.stopPropagation();
      setRoutineDocMenuAnchorEl(event.currentTarget);
      setRoutineDocMenuTargetId(docId);
    },
    []
  );

  const handleAddRoutineSubtab = React.useCallback(() => {
    if (!routineDocMenuTarget) return;
    const parent = routineDocMenuTarget;
    setRoutineDocuments((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      const sourceIndex = prev.findIndex((item) => item.id === parent.id);
      const created: RoutineDocument = {
        id: createRoutineDocId(),
        title: `${parent.title} - underfane`,
        content: "",
        updatedAtMs: Date.now(),
        updatedByUid: user?.uid ?? null,
        updatedByName: routineActorName,
        parentId: parent.id,
        emoji: null,
      };

      let insertIndex = sourceIndex + 1;
      for (let i = sourceIndex + 1; i < prev.length; i += 1) {
        if (isRoutineDescendant(prev[i], parent.id, byId)) {
          insertIndex = i + 1;
        } else {
          break;
        }
      }

      const next = [...prev];
      next.splice(insertIndex, 0, created);
      setSelectedRoutineDocumentId(created.id);
      return next;
    });
    closeRoutineDocMenu();
  }, [closeRoutineDocMenu, routineActorName, routineDocMenuTarget, user?.uid]);

  const commitRoutineDocRename = React.useCallback(() => {
    if (!editingRoutineDocId) return;
    const nextName = editingRoutineDocTitle.trim();
    const now = Date.now();
    if (nextName) {
      setRoutineDocuments((prev) =>
        prev.map((docItem) =>
          docItem.id === editingRoutineDocId
            ? {
                ...docItem,
                title: nextName,
                updatedAtMs: docItem.title === nextName ? docItem.updatedAtMs : now,
                updatedByUid: docItem.title === nextName ? docItem.updatedByUid ?? null : user?.uid ?? null,
                updatedByName: docItem.title === nextName ? docItem.updatedByName ?? null : routineActorName,
              }
            : docItem
        )
      );
    }
    setEditingRoutineDocId(null);
    setEditingRoutineDocTitle("");
  }, [editingRoutineDocId, editingRoutineDocTitle, routineActorName, user?.uid]);

  const cancelRoutineDocRename = React.useCallback(() => {
    setEditingRoutineDocId(null);
    setEditingRoutineDocTitle("");
  }, []);

  const handleStartRenameRoutineDoc = React.useCallback(() => {
    if (!routineDocMenuTarget) return;
    const targetId = routineDocMenuTarget.id;
    const targetTitle = routineDocMenuTarget.title;
    closeRoutineDocMenu();
    if (routineRenameTimerRef.current) {
      window.clearTimeout(routineRenameTimerRef.current);
    }
    routineRenameTimerRef.current = window.setTimeout(() => {
      setEditingRoutineDocId(targetId);
      setEditingRoutineDocTitle(targetTitle);
      setSelectedRoutineDocumentId(targetId);
    }, 0);
  }, [closeRoutineDocMenu, routineDocMenuTarget]);

  const applyRoutineDocEmoji = React.useCallback(
    (nextEmoji: string | null) => {
      if (!routineEmojiPickerTargetId) return;
      const now = Date.now();
      setRoutineDocuments((prev) =>
        prev.map((docItem) =>
          docItem.id === routineEmojiPickerTargetId
            ? {
                ...docItem,
                emoji: nextEmoji?.trim() ? nextEmoji.trim() : null,
                updatedAtMs: docItem.emoji === (nextEmoji?.trim() || null) ? docItem.updatedAtMs : now,
                updatedByUid: docItem.emoji === (nextEmoji?.trim() || null) ? docItem.updatedByUid ?? null : user?.uid ?? null,
                updatedByName: docItem.emoji === (nextEmoji?.trim() || null) ? docItem.updatedByName ?? null : routineActorName,
              }
            : docItem
        )
      );
      closeRoutineEmojiPicker();
    },
    [closeRoutineEmojiPicker, routineActorName, routineEmojiPickerTargetId, user?.uid]
  );

  const handleSetRoutineDocEmoji = React.useCallback(() => {
    if (!routineDocMenuTargetId || !routineDocMenuAnchorEl) return;
    setRoutineEmojiPickerTargetId(routineDocMenuTargetId);
    setRoutineEmojiPickerAnchorEl(routineDocMenuAnchorEl);
    setRoutineEmojiQuery("");
    setRoutineEmojiCategory("smileys");
    closeRoutineDocMenu();
  }, [closeRoutineDocMenu, routineDocMenuAnchorEl, routineDocMenuTargetId]);

  const handleClearRoutineDocEmoji = React.useCallback(() => {
    applyRoutineDocEmoji(null);
  }, [applyRoutineDocEmoji]);

  const handlePickRoutineEmoji = React.useCallback(
    (emoji: string) => {
      applyRoutineDocEmoji(emoji);
    },
    [applyRoutineDocEmoji]
  );

  const handleEmojiQueryChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRoutineEmojiQuery(event.target.value);
  }, []);

  const handleSelectRoutineSearchOption = React.useCallback((option: RoutineSearchOption | null) => {
    if (!option) return;
    setSelectedRoutineDocumentId(option.docId);
    setRoutineSearchQuery("");
  }, []);

  const handleDeleteRoutineDoc = React.useCallback(() => {
    if (!routineDocMenuTarget) return;

    setRoutineDocuments((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      const removeIds = new Set<string>([routineDocMenuTarget.id]);
      prev.forEach((docItem) => {
        if (isRoutineDescendant(docItem, routineDocMenuTarget.id, byId)) {
          removeIds.add(docItem.id);
        }
      });

      let next = prev.filter((docItem) => !removeIds.has(docItem.id));
      if (next.length === 0) {
        const fallback: RoutineDocument = {
          id: createRoutineDocId(),
          title: "Fane 1",
          content: "",
          updatedAtMs: Date.now(),
          updatedByUid: user?.uid ?? null,
          updatedByName: routineActorName,
          parentId: null,
          emoji: null,
        };
        next = [fallback];
        setSelectedRoutineDocumentId(fallback.id);
        return next;
      }

      if (selectedRoutineDocumentId && removeIds.has(selectedRoutineDocumentId)) {
        setSelectedRoutineDocumentId(next[0].id);
      }
      return next;
    });
    closeRoutineDocMenu();
  }, [closeRoutineDocMenu, routineActorName, routineDocMenuTarget, selectedRoutineDocumentId, user?.uid]);

  const handleCopyRoutineDocLink = React.useCallback(async () => {
    if (!routineDocMenuTarget) return;
    closeRoutineDocMenu();

    try {
      if (!navigator?.clipboard?.writeText) {
        setCopyToast({
          message: "Utklippstavle er ikke tilgjengelig i denne nettleseren.",
          severity: "error",
        });
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.set(ROUTINE_TAB_QUERY_KEY, "rutiner");
      url.searchParams.set(ROUTINE_DOC_QUERY_KEY, routineDocMenuTarget.id);
      await navigator.clipboard.writeText(url.toString());
      setCopyToast({
        message: `Lenke kopiert for "${routineDocMenuTarget.title || "fane"}".`,
        severity: "success",
      });
    } catch {
      setCopyToast({
        message: "Kunne ikke kopiere lenke.",
        severity: "error",
      });
    }
  }, [closeRoutineDocMenu, routineDocMenuTarget]);

  const handleRoutineContentChange = React.useCallback((value: string) => {
    if (!selectedRoutineDocumentId) return;
    const now = Date.now();
    setRoutineDocuments((prev) =>
      prev.map((docItem) =>
        docItem.id === selectedRoutineDocumentId
          ? docItem.content === value
            ? docItem
            : {
                ...docItem,
                content: value,
                updatedAtMs: now,
                updatedByUid: user?.uid ?? null,
                updatedByName: routineActorName,
              }
          : docItem
      )
    );
  }, [routineActorName, selectedRoutineDocumentId, user?.uid]);

  const isNodeInsideRoutineEditor = React.useCallback((node: Node | null) => {
    const editor = routineEditorRef.current;
    if (!editor || !node) return false;
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    return Boolean(element && editor.contains(element));
  }, []);

  const captureRoutineSelection = React.useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!isNodeInsideRoutineEditor(range.commonAncestorContainer)) return;
    routineSelectionRef.current = range.cloneRange();
  }, [isNodeInsideRoutineEditor]);

  const restoreRoutineSelection = React.useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !routineSelectionRef.current) return false;
    try {
      selection.removeAllRanges();
      selection.addRange(routineSelectionRef.current.cloneRange());
      return true;
    } catch {
      return false;
    }
  }, []);

  const detectRoutineStyleFromSelection = React.useCallback((): RoutineTextStyle | null => {
    const editor = routineEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!isNodeInsideRoutineEditor(range.commonAncestorContainer)) return null;

    const mapBlockTagToStyle = (rawValue: string | null | undefined): RoutineTextStyle | null => {
      if (!rawValue) return null;
      const normalized = rawValue.toLowerCase().replace(/[<>]/g, "").trim();
      if (normalized === "h1") return "h1";
      if (normalized === "h2" || normalized === "h3" || normalized === "h4" || normalized === "h5" || normalized === "h6") {
        return "h2";
      }
      if (normalized === "p" || normalized === "div" || normalized === "li") return "p";
      return null;
    };

    const formatBlockValue = mapBlockTagToStyle(document.queryCommandValue("formatBlock"));
    if (formatBlockValue) {
      return formatBlockValue;
    }

    const anchorNode = selection.anchorNode ?? range.startContainer;
    let element =
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as Element)
        : anchorNode.parentElement;

    while (element && element !== editor) {
      const mapped = mapBlockTagToStyle(element.tagName);
      if (mapped) return mapped;
      element = element.parentElement;
    }

    return "p";
  }, [isNodeInsideRoutineEditor]);

  const updateRoutineFormatState = React.useCallback(() => {
    setRoutineFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
    const nextStyle = detectRoutineStyleFromSelection();
    if (nextStyle) {
      setRoutineTextStyle(nextStyle);
    }
  }, [detectRoutineStyleFromSelection]);

  const syncRoutineEditorContent = React.useCallback(() => {
    const editor = routineEditorRef.current;
    if (!editor) return;
    handleRoutineContentChange(editor.innerHTML);
  }, [handleRoutineContentChange]);

  const runRoutineCommand = React.useCallback(
    (command: string, value?: string) => {
      const editor = routineEditorRef.current;
      if (!editor) return;
      editor.focus();
      restoreRoutineSelection();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command, false, value);
      captureRoutineSelection();
      syncRoutineEditorContent();
      window.setTimeout(updateRoutineFormatState, 0);
    },
    [captureRoutineSelection, restoreRoutineSelection, syncRoutineEditorContent, updateRoutineFormatState]
  );

  const getRoutineFormatBlockValue = React.useCallback((style: RoutineTextStyle) => {
    if (style === "h1") return "<h1>";
    if (style === "h2") return "<h2>";
    return "<p>";
  }, []);

  const handleRoutineStyleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextStyle = event.target.value as RoutineTextStyle;
      setRoutineTextStyle(nextStyle);
      const formatValue = getRoutineFormatBlockValue(nextStyle);
      runRoutineCommand("formatBlock", formatValue);
    },
    [getRoutineFormatBlockValue, runRoutineCommand]
  );

  const handleRoutineFontChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextFont = event.target.value as (typeof ROUTINE_FONT_OPTIONS)[number];
      setRoutineFontFamily(nextFont);
      runRoutineCommand("fontName", nextFont);
    },
    [runRoutineCommand]
  );

  const handleOpenRoutineColorMenu = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      captureRoutineSelection();
      setRoutineColorAnchorEl(event.currentTarget);
    },
    [captureRoutineSelection]
  );

  const handleCloseRoutineColorMenu = React.useCallback(() => {
    setRoutineColorAnchorEl(null);
  }, []);

  const handleSelectRoutineTextColor = React.useCallback(
    (color: string) => {
      setRoutineTextColor(color);
      runRoutineCommand("foreColor", color);
      setRoutineColorAnchorEl(null);
    },
    [runRoutineCommand]
  );

  const normalizeRoutineLinkUrl = React.useCallback((rawUrl: string): string | null => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withProtocol);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }, []);

  const handleOpenRoutineLinkMenu = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      captureRoutineSelection();
      const selection = window.getSelection();
      const selectedText =
        selection &&
        selection.rangeCount > 0 &&
        isNodeInsideRoutineEditor(selection.getRangeAt(0).commonAncestorContainer)
          ? selection.toString().trim()
          : "";
      setRoutineLinkLabel(selectedText);
      setRoutineLinkUrl("");
      setRoutineLinkError(null);
      setRoutineLinkAnchorEl(event.currentTarget);
    },
    [captureRoutineSelection, isNodeInsideRoutineEditor]
  );

  const handleCloseRoutineLinkMenu = React.useCallback(() => {
    setRoutineLinkAnchorEl(null);
    setRoutineLinkError(null);
  }, []);

  const handleInsertRoutineLink = React.useCallback(() => {
    const normalizedUrl = normalizeRoutineLinkUrl(routineLinkUrl);
    if (!normalizedUrl) {
      setRoutineLinkError("Skriv en gyldig lenke (http/https).");
      return;
    }

    const linkLabel = routineLinkLabel.trim() || normalizedUrl;
    const editor = routineEditorRef.current;
    if (!editor) return;

    editor.focus();
    restoreRoutineSelection();

    const selection = window.getSelection();
    const canInsertAtSelection =
      selection !== null &&
      selection.rangeCount > 0 &&
      isNodeInsideRoutineEditor(selection.getRangeAt(0).commonAncestorContainer);

    const anchor = document.createElement("a");
    anchor.href = normalizedUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = linkLabel;

    if (canInsertAtSelection && selection) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(anchor);
      range.setStartAfter(anchor);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editor.appendChild(anchor);
      editor.appendChild(document.createTextNode(" "));
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    captureRoutineSelection();
    syncRoutineEditorContent();
    window.setTimeout(updateRoutineFormatState, 0);
    setRoutineLinkAnchorEl(null);
    setRoutineLinkError(null);
    setCopyToast({ message: "Lenke lagt til.", severity: "success" });
  }, [
    captureRoutineSelection,
    isNodeInsideRoutineEditor,
    normalizeRoutineLinkUrl,
    restoreRoutineSelection,
    routineLinkLabel,
    routineLinkUrl,
    syncRoutineEditorContent,
    updateRoutineFormatState,
  ]);

  const handleRoutineEditorClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest("a[href]") as HTMLAnchorElement | null;
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    window.open(link.href, "_blank", "noopener,noreferrer");
  }, []);

  const handleRoutineEditorKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter") return;
      if (routineTextStyle === "p") return;

      window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        if (!isNodeInsideRoutineEditor(selection.getRangeAt(0).commonAncestorContainer)) return;
        document.execCommand("styleWithCSS", false, "true");
        document.execCommand("formatBlock", false, getRoutineFormatBlockValue(routineTextStyle));
        captureRoutineSelection();
        syncRoutineEditorContent();
        window.setTimeout(updateRoutineFormatState, 0);
      }, 0);
    },
    [
      captureRoutineSelection,
      getRoutineFormatBlockValue,
      isNodeInsideRoutineEditor,
      routineTextStyle,
      syncRoutineEditorContent,
      updateRoutineFormatState,
    ]
  );

  const handleRoutineEditorInput = React.useCallback(() => {
    syncRoutineEditorContent();
    updateRoutineFormatState();
  }, [syncRoutineEditorContent, updateRoutineFormatState]);

  React.useEffect(() => {
    const editor = routineEditorRef.current;
    if (!editor || !selectedRoutineDocument) return;
    const normalized = normalizeRoutineContent(selectedRoutineDocument.content);
    const changedDoc = activeRoutineDocRef.current !== selectedRoutineDocument.id;

    if (changedDoc || document.activeElement !== editor) {
      if (editor.innerHTML !== normalized) {
        editor.innerHTML = normalized;
      }
    }

    if (changedDoc) {
      activeRoutineDocRef.current = selectedRoutineDocument.id;
    }

    if (changedDoc || document.activeElement !== editor) {
      editor.focus();
    }
  }, [selectedRoutineDocument]);

  React.useEffect(() => {
    const onSelectionChange = () => {
      const editor = routineEditorRef.current;
      if (!editor) return;
      const selection = window.getSelection();
      const anchorNode = selection?.anchorNode;
      if (!anchorNode) return;
      const container =
        anchorNode.nodeType === Node.ELEMENT_NODE
          ? (anchorNode as Element)
          : anchorNode.parentElement;
      if (!container || !editor.contains(container)) return;
      captureRoutineSelection();
      updateRoutineFormatState();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [captureRoutineSelection, updateRoutineFormatState]);

  React.useEffect(() => {
    const handleRoutineSearchShortcut = (event: KeyboardEvent) => {
      const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
      if (!isSaveShortcut) return;
      event.preventDefault();
      const input = routineSearchInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    };

    window.addEventListener("keydown", handleRoutineSearchShortcut);
    return () => {
      window.removeEventListener("keydown", handleRoutineSearchShortcut);
    };
  }, []);

  return (
    <ThemeProvider theme={purpleTheme}>
      <AccentSelection />
      <Box
        sx={{
          position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
          bgcolor: isDark ? "#0D0B12" : "#FAF6FE",
          backgroundImage: isDark
            ? "radial-gradient(circle at 8% -12%, rgba(140,40,200,0.12) 0%, rgba(140,40,200,0) 40%), radial-gradient(circle at 94% -4%, rgba(100,20,160,0.10) 0%, rgba(100,20,160,0) 34%)"
            : "radial-gradient(circle at 8% -12%, rgba(182,72,232,0.14) 0%, rgba(182,72,232,0) 40%), radial-gradient(circle at 94% -4%, rgba(140,40,200,0.10) 0%, rgba(140,40,200,0) 34%)",
        }}
      />
    <Box sx={{ width: "100%" }}>

      {(
        <Paper
          sx={{
            minHeight: 520,
            height: { xs: "calc(100dvh - 230px)", md: "calc(100dvh - 130px)" },
            overflow: "hidden",
          }}
        >
          <Box
            ref={routineLayoutRef}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                width: { xs: "100%", md: routineSidebarWidth },
                minWidth: { xs: "100%", md: 72 },
                maxWidth: { md: 560 },
                borderRight: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                flexShrink: 0,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(21, 28, 39, 0.92)"
                    : "rgba(248,249,251,0.9)",
              }}
            >
              {showRoutineLabels && (
                <Box
                  sx={{
                    p: 0.7,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Autocomplete<RoutineSearchOption, false, false, false>
                    size="small"
                    fullWidth
                    options={routineSearchOptions}
                    value={null}
                    inputValue={routineSearchQuery}
                    onInputChange={(_, nextValue, reason) => {
                      if (reason === "reset") return;
                      setRoutineSearchQuery(nextValue);
                    }}
                    onChange={(_, option) => handleSelectRoutineSearchOption(option)}
                    open={routineSearchQuery.trim().length >= 2}
                    filterOptions={(options) => options}
                    getOptionLabel={(option) => option.title}
                    noOptionsText="Ingen rutiner funnet"
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 0.6,
                          borderRadius: 1.2,
                          border: "1px solid",
                          borderColor: "divider",
                          overflow: "hidden",
                        },
                      },
                    }}
                    renderOption={(props, option) => (
                      <Box
                        component="li"
                        {...props}
                        sx={{
                          py: 0.85,
                          px: 1,
                          borderLeft: "3px solid",
                          borderLeftColor:
                            option.matchType === "title"
                              ? "rgba(236,72,153,0.45)"
                              : "rgba(59,130,246,0.35)",
                        }}
                      >
                        <Box sx={{ minWidth: 0, width: "100%" }}>
                          <Typography sx={{ fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.2, mb: option.snippet ? 0.35 : 0 }}>
                            {renderHighlightedText(option.title, routineSearchQuery)}
                          </Typography>
                          {option.snippet && (
                            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.35 }}>
                              {renderHighlightedText(option.snippet, routineSearchQuery)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        inputRef={routineSearchInputRef}
                        placeholder="Søk i rutiner"
                        sx={{
                          "& .MuiInputBase-root": {
                            height: 34,
                            fontSize: "0.82rem",
                          },
                        }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <SearchIcon sx={{ fontSize: 16, color: "text.secondary", mr: 0.6 }} />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Box>
              )}
              <Box
                sx={{
                  p: 0.7,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: showRoutineLabels ? "space-between" : "center",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  gap: 0.5,
                }}
              >
                {showRoutineLabels && (
                  <Typography variant="body1" sx={{ fontWeight: 700, fontSize: "0.82rem" }}>
                    Dokumentfaner
                  </Typography>
                )}
                <IconButton
                  size="small"
                  onClick={handleAddRoutineDocument}
                  aria-label="Ny fane"
                  sx={{
                    width: 28,
                    height: 28,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>

              <Box sx={{ p: 0.5, overflow: "auto", minHeight: 0 }}>
                {routineDocuments.map((docItem) => {
                  const isActive = docItem.id === selectedRoutineDocumentId;
                  const isRenaming = editingRoutineDocId === docItem.id;
                  const depth = getRoutineDepth(docItem, routineDocumentsById);
                  return (
                    <Box
                      key={docItem.id}
                      component="div"
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedRoutineDocumentId(docItem.id)}
                      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedRoutineDocumentId(docItem.id);
                        }
                      }}
                      sx={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.55,
                        pl: showRoutineLabels ? 0.85 + Math.min(2, depth) * 0.95 : 0.55,
                        pr: showRoutineLabels ? 0.3 : 0.55,
                        py: 0.55,
                        mb: 0.4,
                        borderRadius: 1.6,
                        border: "1px solid",
                        borderColor: isRenaming
                          ? "rgba(219,39,119,0.55)"
                          : isActive
                            ? "rgba(236,72,153,0.35)"
                            : "transparent",
                        bgcolor: isRenaming
                          ? "rgba(252,241,247,1)"
                          : isActive
                            ? "rgba(252,241,247,0.95)"
                            : "transparent",
                        boxShadow: isRenaming ? "0 0 0 1px rgba(236,72,153,0.22) inset" : "none",
                        color: isActive || isRenaming ? "#9D174D" : "text.primary",
                        cursor: "pointer",
                        textAlign: "left",
                        "&:hover": {
                          bgcolor: isRenaming
                            ? "rgba(252,236,245,1)"
                            : isActive
                              ? "rgba(252,236,245,1)"
                              : "action.hover",
                        },
                      }}
                    >
                      {docItem.emoji ? (
                        <Typography sx={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{docItem.emoji}</Typography>
                      ) : (
                        <DescriptionOutlinedIcon sx={{ fontSize: 15, flexShrink: 0 }} />
                      )}
                      {showRoutineLabels && (
                        <>
                          {editingRoutineDocId === docItem.id ? (
                            <InputBase
                              inputRef={routineRenameInputRef}
                              value={editingRoutineDocTitle}
                              onChange={(event) => setEditingRoutineDocTitle(event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                              onBlur={commitRoutineDocRename}
                              onFocus={(event) => event.target.select()}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  commitRoutineDocRename();
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  cancelRoutineDocRename();
                                }
                              }}
                              inputProps={{ "aria-label": "Gi nytt navn" }}
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                px: 0.55,
                                py: 0.15,
                                borderRadius: 0.8,
                                bgcolor: "background.paper",
                                border: "1.5px solid",
                                borderColor: "rgba(219,39,119,0.7)",
                                fontSize: "0.86rem",
                                fontWeight: 600,
                                boxShadow: "0 0 0 1px rgba(236,72,153,0.14)",
                              }}
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isActive ? 700 : 500,
                                fontSize: "0.84rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              {docItem.title || "Uten tittel"}
                            </Typography>
                          )}
                          <IconButton
                            size="small"
                            onClick={(event) => openRoutineDocMenu(event, docItem.id)}
                            aria-label={`Meny for ${docItem.title || "dokumentfane"}`}
                            sx={{
                              width: 24,
                              height: 24,
                              color: isActive || isRenaming ? "#9D174D" : "text.secondary",
                              "&:hover": {
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "rgba(165,177,198,0.16)"
                                    : "rgba(15,23,42,0.08)",
                              },
                            }}
                          >
                            <MoreVertIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  );
                })}
              </Box>
              <Menu
                anchorEl={routineDocMenuAnchorEl}
                open={routineDocMenuOpen}
                onClose={closeRoutineDocMenu}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                  paper: {
                    sx: {
                      minWidth: 180,
                      borderRadius: 1.4,
                      border: "1px solid",
                      borderColor: "divider",
                    },
                  },
                }}
              >
                <MenuItem onClick={handleAddRoutineSubtab} sx={{ minHeight: 34, py: 0.35, px: 1.1 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <AddIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Legg til en underfane" primaryTypographyProps={{ fontSize: "0.82rem" }} />
                </MenuItem>
                <MenuItem onClick={handleDeleteRoutineDoc} sx={{ minHeight: 34, py: 0.35, px: 1.1 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Slett" primaryTypographyProps={{ fontSize: "0.82rem" }} />
                </MenuItem>
                <MenuItem onClick={handleStartRenameRoutineDoc} sx={{ minHeight: 34, py: 0.35, px: 1.1 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <DriveFileRenameOutlineIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Gi nytt navn" primaryTypographyProps={{ fontSize: "0.82rem" }} />
                </MenuItem>
                <MenuItem onClick={handleCopyRoutineDocLink} sx={{ minHeight: 34, py: 0.35, px: 1.1 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <LinkOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Kopier lenke" primaryTypographyProps={{ fontSize: "0.82rem" }} />
                </MenuItem>
                <MenuItem onClick={handleSetRoutineDocEmoji} sx={{ minHeight: 34, py: 0.35, px: 1.1 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <EmojiEmotionsOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Velg emoji" primaryTypographyProps={{ fontSize: "0.82rem" }} />
                </MenuItem>
              </Menu>
              <Popover
                open={routineEmojiPickerOpen}
                anchorEl={routineEmojiPickerAnchorEl}
                onClose={closeRoutineEmojiPicker}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                slotProps={{
                  paper: {
                    sx: {
                      width: 360,
                      maxWidth: "calc(100vw - 24px)",
                      borderRadius: 1.6,
                      border: "1px solid",
                      borderColor: "divider",
                      overflow: "hidden",
                    },
                  },
                }}
              >
                <Box sx={{ p: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.7,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 999,
                      px: 1,
                      py: 0.45,
                    }}
                  >
                    <SearchIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                    <InputBase
                      placeholder="Søk emoji"
                      value={routineEmojiQuery}
                      onChange={handleEmojiQueryChange}
                      sx={{ flex: 1, fontSize: "0.86rem" }}
                    />
                  </Box>

                  <Box sx={{ display: "flex", gap: 0.4, pt: 0.9, pb: 0.7, overflowX: "auto" }}>
                    {ROUTINE_EMOJI_CATEGORIES.map((category) => {
                      const isActive = routineEmojiCategory === category.id;
                      return (
                        <IconButton
                          key={category.id}
                          size="small"
                          onClick={() => setRoutineEmojiCategory(category.id)}
                          aria-label={category.label}
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: 1.2,
                            border: "1px solid",
                            borderColor: isActive ? "rgba(219,39,119,0.5)" : "transparent",
                            bgcolor: isActive ? "rgba(252,236,245,1)" : "transparent",
                            fontSize: 18,
                          }}
                        >
                          {category.icon}
                        </IconButton>
                      );
                    })}
                  </Box>

                  <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", pb: 0.45 }}>
                    Aktiv emoji: {routineEmojiTarget?.emoji ?? "Ingen"}
                  </Typography>

                  <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, color: "text.secondary", pb: 0.6 }}>
                    {routineEmojiQuery.trim()
                      ? `Søkeresultater (${routineFilteredEmojis.length})`
                      : routineActiveEmojiCategory.label.toUpperCase()}
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
                      gap: 0.35,
                      maxHeight: 330,
                      overflowY: "auto",
                      pr: 0.35,
                    }}
                  >
                    <Button
                      onClick={handleClearRoutineDocEmoji}
                      sx={{
                        gridColumn: "span 2",
                        minHeight: 30,
                        borderRadius: 1,
                        border: "1px dashed",
                        borderColor: "divider",
                        color: "text.secondary",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        px: 0.3,
                      }}
                    >
                      Fjern
                    </Button>
                    {routineFilteredEmojis.map((option) => (
                      <IconButton
                        key={`${option.category}-${option.emoji}-${option.label}`}
                        size="small"
                        onClick={() => handlePickRoutineEmoji(option.emoji)}
                        title={option.label}
                        aria-label={option.label}
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 1.1,
                          fontSize: 21,
                          "&:hover": {
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(165,177,198,0.16)"
                                : "rgba(15,23,42,0.08)",
                          },
                        }}
                      >
                        {option.emoji}
                      </IconButton>
                    ))}
                  </Box>

                  {routineFilteredEmojis.length === 0 && (
                    <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", py: 1.2, textAlign: "center" }}>
                      Ingen treff. Prøv et annet søkeord.
                    </Typography>
                  )}
                </Box>
              </Popover>
            </Box>

            <Box
              onMouseDown={() => setIsRoutineResizing(true)}
              sx={{
                display: { xs: "none", md: "flex" },
                width: 8,
                cursor: "col-resize",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: isRoutineResizing ? "rgba(59,130,246,0.08)" : "transparent",
                "&:hover": {
                  bgcolor: "rgba(59,130,246,0.08)",
                },
              }}
            >
              <Box sx={{ width: 2, height: 48, borderRadius: 999, bgcolor: "divider" }} />
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.paper",
              }}
            >
              {selectedRoutineDocument ? (
                <>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.65,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.7,
                      flexWrap: "wrap",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(24, 33, 46, 0.9)"
                          : "rgba(248,250,252,0.95)",
                    }}
                  >
                    <TextField
                      select
                      value={routineTextStyle}
                      onChange={handleRoutineStyleChange}
                      size="small"
                      sx={{
                        minWidth: 138,
                        "& .MuiInputBase-root": { height: 36, fontSize: "0.95rem" },
                      }}
                    >
                      {ROUTINE_TEXT_STYLE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      value={routineFontFamily}
                      onChange={handleRoutineFontChange}
                      size="small"
                      sx={{
                        minWidth: 124,
                        "& .MuiInputBase-root": { height: 36, fontSize: "0.95rem" },
                      }}
                    >
                      {ROUTINE_FONT_OPTIONS.map((font) => (
                        <MenuItem key={font} value={font} sx={{ fontFamily: `"${font}", sans-serif`, fontSize: "0.93rem" }}>
                          {font}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.35 }}>
                      <IconButton
                        size="small"
                        onClick={() => runRoutineCommand("bold")}
                        aria-label="Fet skrift"
                        sx={{
                          width: 36,
                          height: 36,
                          border: "1px solid",
                          borderColor: routineFormatState.bold ? "primary.main" : "divider",
                          bgcolor: (theme) =>
                            routineFormatState.bold
                              ? theme.palette.mode === "dark"
                                ? "rgba(96,165,250,0.24)"
                                : "rgba(25,118,210,0.12)"
                              : "transparent",
                        }}
                      >
                        <FormatBoldIcon sx={{ fontSize: 19 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => runRoutineCommand("italic")}
                        aria-label="Kursiv"
                        sx={{
                          width: 36,
                          height: 36,
                          border: "1px solid",
                          borderColor: routineFormatState.italic ? "primary.main" : "divider",
                          bgcolor: (theme) =>
                            routineFormatState.italic
                              ? theme.palette.mode === "dark"
                                ? "rgba(96,165,250,0.24)"
                                : "rgba(25,118,210,0.12)"
                              : "transparent",
                        }}
                      >
                        <FormatItalicIcon sx={{ fontSize: 19 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => runRoutineCommand("underline")}
                        aria-label="Understreket"
                        sx={{
                          width: 36,
                          height: 36,
                          border: "1px solid",
                          borderColor: routineFormatState.underline ? "primary.main" : "divider",
                          bgcolor: (theme) =>
                            routineFormatState.underline
                              ? theme.palette.mode === "dark"
                                ? "rgba(96,165,250,0.24)"
                                : "rgba(25,118,210,0.12)"
                              : "transparent",
                        }}
                      >
                        <FormatUnderlinedIcon sx={{ fontSize: 19 }} />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleOpenRoutineColorMenu}
                        sx={{
                          minWidth: 0,
                          height: 36,
                          minHeight: 36,
                          px: 0.95,
                          py: 0,
                          borderRadius: 1.25,
                          borderColor: "divider",
                          color: "text.secondary",
                          textTransform: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.35,
                          "&:hover": {
                            borderColor: "text.secondary",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(165,177,198,0.12)"
                                : "rgba(15,23,42,0.04)",
                          },
                        }}
                      >
                        <FormatColorTextIcon sx={{ fontSize: 18 }} />
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: 0.6,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: routineTextColor,
                          }}
                        />
                        <ArrowDropDownIcon sx={{ fontSize: 18 }} />
                      </Button>
                      <Popover
                        open={routineColorMenuOpen}
                        anchorEl={routineColorAnchorEl}
                        onClose={handleCloseRoutineColorMenu}
                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                        transformOrigin={{ vertical: "top", horizontal: "left" }}
                        slotProps={{
                          paper: {
                            sx: {
                              mt: 0.8,
                              p: 0.8,
                              borderRadius: 1.5,
                              border: "1px solid",
                              borderColor: "divider",
                              boxShadow: "0 14px 26px rgba(15,23,42,0.2)",
                              bgcolor: "background.paper",
                            },
                          },
                        }}
                      >
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(10, 22px)", gap: 0.5 }}>
                          {ROUTINE_TEXT_COLOR_SWATCHES.flat().map((color) => (
                            <Box
                              key={color}
                              component="button"
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectRoutineTextColor(color)}
                              aria-label={`Velg farge ${color}`}
                              sx={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                border: "1px solid",
                                borderColor: color.toLowerCase() === "#ffffff" ? "divider" : "rgba(15,23,42,0.12)",
                                bgcolor: color,
                                cursor: "pointer",
                                outline: "none",
                                boxShadow: (theme) =>
                                  color === routineTextColor
                                    ? theme.palette.mode === "dark"
                                      ? "0 0 0 2px #0f172a, 0 0 0 4px rgba(96,165,250,0.78)"
                                      : "0 0 0 2px #fff, 0 0 0 4px rgba(59,130,246,0.75)"
                                    : "none",
                                transition: "transform 120ms ease",
                                "&:hover": {
                                  transform: "scale(1.09)",
                                },
                              }}
                            />
                          ))}
                        </Box>
                      </Popover>
                    </Box>

                    <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleOpenRoutineLinkMenu}
                        startIcon={<LinkOutlinedIcon sx={{ fontSize: 18 }} />}
                        sx={{
                          minWidth: 0,
                          height: 36,
                          minHeight: 36,
                          px: 1.25,
                          py: 0,
                          borderRadius: 1.25,
                          borderColor: "divider",
                          color: "text.secondary",
                          textTransform: "none",
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          "&:hover": {
                            borderColor: "text.secondary",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(165,177,198,0.12)"
                                : "rgba(15,23,42,0.04)",
                          },
                        }}
                      >
                        Lenke
                      </Button>
                      <Popover
                        open={routineLinkMenuOpen}
                        anchorEl={routineLinkAnchorEl}
                        onClose={handleCloseRoutineLinkMenu}
                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                        transformOrigin={{ vertical: "top", horizontal: "left" }}
                        slotProps={{
                          paper: {
                            sx: {
                              mt: 0.8,
                              p: 1,
                              width: 300,
                              borderRadius: 1.4,
                              border: "1px solid",
                              borderColor: "divider",
                            },
                          },
                        }}
                      >
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
                          <TextField
                            size="small"
                            label="Kallenavn"
                            value={routineLinkLabel}
                            onChange={(event) => setRoutineLinkLabel(event.target.value)}
                            placeholder="f.eks. Prisjakt"
                          />
                          <TextField
                            size="small"
                            label="Lenke"
                            value={routineLinkUrl}
                            onChange={(event) => {
                              setRoutineLinkUrl(event.target.value);
                              if (routineLinkError) setRoutineLinkError(null);
                            }}
                            placeholder="https://example.no"
                            error={Boolean(routineLinkError)}
                            helperText={routineLinkError ?? "Åpnes i ny fane ved klikk."}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleInsertRoutineLink();
                              }
                            }}
                          />
                          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.7 }}>
                            <Button size="small" onClick={handleCloseRoutineLinkMenu}>
                              Avbryt
                            </Button>
                            <Button size="small" variant="contained" onClick={handleInsertRoutineLink}>
                              Sett inn
                            </Button>
                          </Box>
                        </Box>
                      </Popover>
                    </Box>

                  </Box>
                  <Box sx={{ p: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                      <Box
                        key={selectedRoutineDocument.id}
                        ref={routineEditorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleRoutineEditorInput}
                        onPaste={(e) => {
                          e.preventDefault();
                          const html = buildPasteHtml(e.clipboardData, ROUTINE_ALLOWED_STYLE_PROPS);
                          if (html) {
                            routineEditorRef.current?.focus();
                            document.execCommand("insertHTML", false, html);
                          }
                          syncRoutineEditorContent();
                          window.setTimeout(updateRoutineFormatState, 0);
                        }}
                        onClick={handleRoutineEditorClick}
                        onKeyDown={handleRoutineEditorKeyDown}
                        onMouseUp={() => {
                          captureRoutineSelection();
                          updateRoutineFormatState();
                        }}
                        onKeyUp={() => {
                          captureRoutineSelection();
                          updateRoutineFormatState();
                        }}
                        sx={{
                          width: "100%",
                          height: "100%",
                          overflow: "auto",
                          p: "30px 34px",
                          color: "text.primary",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          outline: "none",
                          "& p": { m: 0, mb: 1.35 },
                          "& h1": {
                            m: 0,
                            mb: 1.35,
                            lineHeight: 1.22,
                            fontWeight: 700,
                          },
                          "& h2": {
                            m: 0,
                            mb: 1.25,
                            lineHeight: 1.28,
                            fontWeight: 700,
                          },
                          "& a": {
                            color: "primary.main",
                            textDecoration: "underline",
                            cursor: "pointer",
                          },
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        px: 1.6,
                        py: 0.5,
                        borderTop: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        justifyContent: "flex-end",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(24, 33, 46, 0.9)" : "rgba(248,250,252,0.95)",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Sist oppdatert:{" "}
                        {selectedRoutineDocument.updatedAtMs ? formatDateTime(selectedRoutineDocument.updatedAtMs) : "Ikke oppdatert"}
                        {" "}
                        | Bruker: {selectedRoutineUpdatedByLabel}
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Velg eller opprett en dokumentfane.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      )}
      <Snackbar
        open={Boolean(copyToast)}
        autoHideDuration={1500}
        onClose={() => setCopyToast(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopyToast(null)}
          severity={copyToast?.severity ?? "success"}
          variant="filled"
          icon={copyToast?.severity === "success" ? <CheckCircleIcon fontSize="inherit" /> : undefined}
          sx={{
            borderRadius: 999,
            px: 2,
            py: 0.75,
            alignItems: "center",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 14px 32px rgba(2,6,18,0.58)"
                : "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          {copyToast?.message ?? ""}
        </Alert>
      </Snackbar>
    </Box>
    </ThemeProvider>
  );
}
