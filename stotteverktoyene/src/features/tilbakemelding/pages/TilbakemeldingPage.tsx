import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Popover,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import type { FirebaseError } from "firebase/app";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
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
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useAuthUser } from "../../../app/auth/useAuthUser";

const MELDESKJEMA_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScKadKrBcIT-8a9CgD4QFfCjXsERjolCZbhojJU8jFhy8V6ZA/viewform?embedded=true";
const MELDESKJEMA_RESPONSES_URL =
  "https://docs.google.com/forms/d/1dQq_pvU1lXf295odpYPWXs0_zX693iLbKxSFfNS3sAQ/edit#responses";
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
const KEEP_CARD_COLORS = [
  "#FFF8E1",
  "#E8F5E9",
  "#E3F2FD",
  "#F3E5F5",
  "#FCE4EC",
  "#E0F2F1",
  "#FFF3E0",
  "#E8EAF6",
  "#F1F3F4",
  "#FFEDE1",
];
const ROUTINE_EMOJI_CATEGORIES = [
  { id: "smileys", label: "Smilefjes og uttrykk", icon: "😀" },
  { id: "people", label: "Personer", icon: "🙋" },
  { id: "nature", label: "Dyr og natur", icon: "🌿" },
  { id: "food", label: "Mat og drikke", icon: "🍔" },
  { id: "objects", label: "Objekter", icon: "💡" },
  { id: "symbols", label: "Symboler", icon: "🏁" },
] as const;

type PrivateNote = {
  id: string;
  mode: "text" | "checklist";
  title: string;
  content: string;
  checklistItems: NoteChecklistItem[];
  color: string | null;
  updatedAtMs: number;
};

type NoteChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

type RoutineDocument = {
  id: string;
  title: string;
  content: string;
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

function buildNoteTitle(title: string, content: string): string {
  const trimmedTitle = title.trim();
  if (trimmedTitle) return trimmedTitle;

  const firstNonEmptyLine =
    content
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? "";

  if (!firstNonEmptyLine) return "Uten tittel";
  return firstNonEmptyLine.slice(0, 60);
}

function formatDateTime(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function isValidNoteColor(value: unknown): value is string {
  return typeof value === "string" && KEEP_CARD_COLORS.includes(value);
}

function getNoteColor(note: Pick<PrivateNote, "id" | "color">): string {
  if (note.color && isValidNoteColor(note.color)) return note.color;
  let hash = 0;
  for (let i = 0; i < note.id.length; i += 1) {
    hash = (hash << 5) - hash + note.id.charCodeAt(i);
    hash |= 0;
  }
  return KEEP_CARD_COLORS[Math.abs(hash) % KEEP_CARD_COLORS.length];
}

function reorderByIds(items: PrivateNote[], fromId: string, toId: string): PrivateNote[] {
  const fromIndex = items.findIndex((item) => item.id === fromId);
  const toIndex = items.findIndex((item) => item.id === toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function createChecklistItemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createRoutineDocId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `routine-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function sortChecklistItems(items: NoteChecklistItem[]): NoteChecklistItem[] {
  const active = items.filter((item) => !item.done);
  const completed = items.filter((item) => item.done);
  return [...active, ...completed];
}

function normalizeChecklistItems(items: NoteChecklistItem[]): NoteChecklistItem[] {
  return sortChecklistItems(
    items
      .map((item) => ({
        id: item.id || createChecklistItemId(),
        text: item.text.trim(),
        done: Boolean(item.done),
      }))
      .filter((item) => item.text.length > 0)
  );
}

function buildChecklistContent(items: NoteChecklistItem[]): string {
  const normalized = normalizeChecklistItems(items);
  if (normalized.length === 0) return "";
  return normalized
    .map((item) => `${item.done ? "- [x]" : "- [ ]"} ${item.text}`)
    .join("\n");
}

function parseChecklistItems(raw: unknown): NoteChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  const parsed = raw
    .map((item) => ({
      id:
        item && typeof item === "object" && typeof (item as any).id === "string"
          ? (item as any).id
          : createChecklistItemId(),
      text:
        item && typeof item === "object" && typeof (item as any).text === "string"
          ? (item as any).text
          : "",
      done:
        item && typeof item === "object" && typeof (item as any).done === "boolean"
          ? (item as any).done
          : false,
    }))
    .filter((item) => item.text.trim().length > 0)
    .map((item) => ({ ...item, text: item.text.trim() }));

  return sortChecklistItems(parsed);
}

function matchesSearchQuery(note: PrivateNote, query: string): boolean {
  const normalizedQuery = query.toLocaleLowerCase("nb-NO").trim();
  if (normalizedQuery.length < 2) return true;

  const checklistText = note.checklistItems.map((item) => item.text).join(" ");
  const haystack = `${note.title} ${note.content} ${checklistText}`.toLocaleLowerCase("nb-NO");
  return haystack.includes(normalizedQuery);
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
  const { user, isOwner } = useAuthUser();
  const [tab, setTab] = React.useState<"meldeskjema" | "rutiner" | "notater">("notater");

  const [savedNotesList, setSavedNotesList] = React.useState<PrivateNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);
  const [draftMode, setDraftMode] = React.useState<"text" | "checklist">("text");
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftContent, setDraftContent] = React.useState("");
  const [draftChecklistItems, setDraftChecklistItems] = React.useState<NoteChecklistItem[]>([]);
  const [draftColor, setDraftColor] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [routineDocuments, setRoutineDocuments] = React.useState<RoutineDocument[]>([]);
  const [selectedRoutineDocumentId, setSelectedRoutineDocumentId] = React.useState<string | null>(null);
  const [routineSidebarWidth, setRoutineSidebarWidth] = React.useState(250);
  const [isRoutineResizing, setIsRoutineResizing] = React.useState(false);
  const [routineLoaded, setRoutineLoaded] = React.useState(false);
  const [routineTextStyle, setRoutineTextStyle] = React.useState<RoutineTextStyle>("p");
  const [routineFontFamily, setRoutineFontFamily] = React.useState<(typeof ROUTINE_FONT_OPTIONS)[number]>("Arial");
  const [routineTextColor, setRoutineTextColor] = React.useState("#111827");
  const [routineColorAnchorEl, setRoutineColorAnchorEl] = React.useState<HTMLElement | null>(null);
  const [routineDocMenuAnchorEl, setRoutineDocMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [routineDocMenuTargetId, setRoutineDocMenuTargetId] = React.useState<string | null>(null);
  const [routineEmojiPickerAnchorEl, setRoutineEmojiPickerAnchorEl] = React.useState<HTMLElement | null>(null);
  const [routineEmojiPickerTargetId, setRoutineEmojiPickerTargetId] = React.useState<string | null>(null);
  const [routineEmojiQuery, setRoutineEmojiQuery] = React.useState("");
  const [routineEmojiCategory, setRoutineEmojiCategory] = React.useState<RoutineEmojiCategory>("smileys");
  const [editingRoutineDocId, setEditingRoutineDocId] = React.useState<string | null>(null);
  const [editingRoutineDocTitle, setEditingRoutineDocTitle] = React.useState("");
  const [routineFormatState, setRoutineFormatState] = React.useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const routineLayoutRef = React.useRef<HTMLDivElement | null>(null);
  const routineEditorRef = React.useRef<HTMLDivElement | null>(null);
  const routineRenameInputRef = React.useRef<HTMLInputElement | null>(null);
  const routineRenameTimerRef = React.useRef<number | null>(null);
  const activeRoutineDocRef = React.useRef<string | null>(null);
  const routineSelectionRef = React.useRef<Range | null>(null);
  const routineSyncSignatureRef = React.useRef("");

  const [loadingNotes, setLoadingNotes] = React.useState(true);
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [deletingNote, setDeletingNote] = React.useState(false);
  const [draggingNoteId, setDraggingNoteId] = React.useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = React.useState<string | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorSaving, setEditorSaving] = React.useState(false);
  const [composerExpanded, setComposerExpanded] = React.useState(false);
  const [copyToast, setCopyToast] = React.useState<{
    message: string;
    severity: "success" | "error" | "info";
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const persistNotesOrder = React.useCallback(
    async (notes: PrivateNote[]) => {
      if (!user?.uid) return;
      await setDoc(
        doc(db, "users", user.uid),
        {
          privateNotesOrder: notes.map((note) => note.id),
          privateNotesOrderUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [user?.uid]
  );

  React.useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      if (!user?.uid) {
        if (!cancelled) {
          setSavedNotesList([]);
          setSelectedNoteId(null);
          setDraftMode("text");
          setDraftTitle("");
          setDraftContent("");
          setDraftChecklistItems([]);
          setDraftColor(null);
          setLoadingNotes(false);
        }
        return;
      }

      setLoadingNotes(true);
      setError(null);

      try {
        const userRef = doc(db, "users", user.uid);
        const notesRef = collection(db, "users", user.uid, "privateNotes");
        const [notesSnap, userSnap] = await Promise.all([getDocs(notesRef), getDoc(userRef)]);
        const userData = userSnap.exists() ? (userSnap.data() as any) : null;
        const orderedIds = Array.isArray(userData?.privateNotesOrder)
          ? userData.privateNotesOrder.filter((id: unknown): id is string => typeof id === "string")
          : [];
        const orderMap = new Map<string, number>(
          orderedIds.map((id: string, index: number) => [id, index])
        );

        let loadedNotes: PrivateNote[] = notesSnap.docs.map((noteDoc) => {
          const data = noteDoc.data() as any;
          const checklistItems = parseChecklistItems(data.checklistItems);
          const mode = data.noteMode === "checklist" || checklistItems.length > 0 ? "checklist" : "text";
          const content = mode === "checklist" ? buildChecklistContent(checklistItems) : String(data.content ?? "");
          return {
            id: noteDoc.id,
            mode,
            title: String(data.title ?? ""),
            content,
            checklistItems,
            color: isValidNoteColor(data.color) ? data.color : null,
            updatedAtMs: toMillis(data.updatedAt),
          };
        });

        // One-time migration from old single-note field to first note document.
        if (loadedNotes.length === 0) {
          const legacyText = userData
            ? String(userData.privateNotes ?? "").trim()
            : "";

          if (legacyText) {
            const legacyTitle = buildNoteTitle("", legacyText);
            const createdRef = await addDoc(notesRef, {
              title: legacyTitle,
              content: legacyText,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            loadedNotes = [
              {
                id: createdRef.id,
                mode: "text",
                title: legacyTitle,
                content: legacyText,
                checklistItems: [],
                color: null,
                updatedAtMs: Date.now(),
              },
            ];
          }
        }

        loadedNotes.sort((a, b) => {
          const aOrder = orderMap.get(a.id);
          const bOrder = orderMap.get(b.id);

          if (typeof aOrder === "number" && typeof bOrder === "number") return aOrder - bOrder;
          if (typeof aOrder === "number") return -1;
          if (typeof bOrder === "number") return 1;
          return b.updatedAtMs - a.updatedAtMs;
        });

        if (!cancelled) {
          setSavedNotesList(loadedNotes);

          if (loadedNotes.length > 0) {
            setSelectedNoteId(loadedNotes[0].id);
            setDraftMode(loadedNotes[0].mode);
            setDraftTitle(loadedNotes[0].title);
            setDraftContent(loadedNotes[0].content);
            setDraftChecklistItems(loadedNotes[0].checklistItems);
            setDraftColor(loadedNotes[0].color);
          } else {
            setSelectedNoteId(null);
            setDraftMode("text");
            setDraftTitle("");
            setDraftContent("");
            setDraftChecklistItems([]);
            setDraftColor(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(mapFirebaseError(err, "Kunne ikke laste notatene dine akkurat nå."));
        }
      } finally {
      if (!cancelled) {
        setLoadingNotes(false);
      }
    }
    }

    loadNotes();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const copyNoteToClipboard = React.useCallback(
    async (content: string, mode: "auto" | "manual") => {
      const text = content.trim();
      if (!text) {
        setCopyToast({ message: "Notatet er tomt, ingenting å kopiere.", severity: "info" });
        return;
      }

      try {
        if (!navigator?.clipboard?.writeText) {
          setCopyToast({
            message: "Utklippstavle er ikke tilgjengelig i denne nettleseren.",
            severity: "error",
          });
          return;
        }
        await navigator.clipboard.writeText(text);
        setCopyToast({
          message: mode === "auto" ? "Notat kopiert automatisk." : "Notat kopiert.",
          severity: "success",
        });
      } catch {
        setCopyToast({ message: "Kunne ikke kopiere til utklippstavlen.", severity: "error" });
      }
    },
    []
  );

  const handleNewNote = React.useCallback(() => {
    setSelectedNoteId(null);
    setDraftMode("text");
    setDraftTitle("");
    setDraftContent("");
    setDraftChecklistItems([]);
    setDraftColor(null);
    setError(null);
    setSuccess(null);
  }, []);

  const handleOpenComposer = React.useCallback(() => {
    handleNewNote();
    setComposerExpanded(true);
  }, [handleNewNote]);

  const handleOpenChecklistComposer = React.useCallback(() => {
    handleNewNote();
    setComposerExpanded(true);
    setDraftMode("checklist");
    setDraftChecklistItems([{ id: createChecklistItemId(), text: "", done: false }]);
  }, [handleNewNote]);

  const addChecklistItem = React.useCallback(() => {
    setDraftChecklistItems((prev) => [...prev, { id: createChecklistItemId(), text: "", done: false }]);
  }, []);

  const updateChecklistItemText = React.useCallback((id: string, text: string) => {
    setDraftChecklistItems((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  }, []);

  const toggleChecklistItemDone = React.useCallback((id: string, checked: boolean) => {
    setDraftChecklistItems((prev) =>
      sortChecklistItems(prev.map((item) => (item.id === id ? { ...item, done: checked } : item)))
    );
  }, []);

  const removeChecklistItem = React.useCallback((id: string) => {
    setDraftChecklistItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleDraftChecklistMode = React.useCallback(() => {
    if (draftMode === "checklist") {
      setDraftMode("text");
      if (!draftContent.trim()) {
        const checklistAsText = sortChecklistItems(draftChecklistItems)
          .map((item) => (item.done ? `[x] ${item.text}` : item.text))
          .join("\n");
        setDraftContent(checklistAsText);
      }
      return;
    }

    setDraftMode("checklist");
    if (draftChecklistItems.length > 0) return;

    const fromText = draftContent
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        id: createChecklistItemId(),
        text: line.replace(/^\[(x|X| )\]\s*/, ""),
        done: /^\[(x|X)\]\s*/.test(line),
      }));

    setDraftChecklistItems(
      fromText.length > 0 ? sortChecklistItems(fromText) : [{ id: createChecklistItemId(), text: "", done: false }]
    );
  }, [draftChecklistItems, draftContent, draftMode]);

  const createNoteFromComposer = React.useCallback(async () => {
    if (!user?.uid || savingNotes) return false;

    const title = draftTitle.trim();
    const normalizedChecklist = normalizeChecklistItems(draftChecklistItems);
    const content = draftMode === "checklist" ? buildChecklistContent(normalizedChecklist) : draftContent.trim();

    // New notes should only be created when title and body has content.
    if (selectedNoteId || !title) return false;
    if (draftMode === "checklist" && normalizedChecklist.length === 0) return false;
    if (draftMode === "text" && !content) return false;

    setSavingNotes(true);
    setError(null);
    setSuccess(null);

    try {
      const createdRef = await addDoc(collection(db, "users", user.uid, "privateNotes"), {
        title,
        content,
        noteMode: draftMode,
        checklistItems: draftMode === "checklist" ? normalizedChecklist : [],
        color: draftColor ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const created: PrivateNote = {
        id: createdRef.id,
        mode: draftMode,
        title,
        content,
        checklistItems: draftMode === "checklist" ? normalizedChecklist : [],
        color: draftColor ?? null,
        updatedAtMs: Date.now(),
      };

      const reordered = [created, ...savedNotesList];
      setSavedNotesList(reordered);
      await persistNotesOrder(reordered);
      setSuccess("Nytt notat er lagret.");

      // Reset composer for quick next note.
      setSelectedNoteId(null);
      setDraftMode("text");
      setDraftTitle("");
      setDraftContent("");
      setDraftChecklistItems([]);
      setDraftColor(null);
      return true;
    } catch (err) {
      setError(mapFirebaseError(err, "Lagring feilet. Prøv igjen."));
      return false;
    } finally {
      setSavingNotes(false);
    }
  }, [
    draftChecklistItems,
    draftColor,
    draftContent,
    draftMode,
    draftTitle,
    persistNotesOrder,
    savedNotesList,
    savingNotes,
    selectedNoteId,
    user?.uid,
  ]);

  const handleOpenEditor = React.useCallback((note: PrivateNote) => {
    setSelectedNoteId(note.id);
    setDraftMode(note.mode);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftChecklistItems(note.checklistItems);
    setDraftColor(note.color);
    setEditorOpen(true);
    setError(null);
    setSuccess(null);
  }, []);

  const saveExistingNote = React.useCallback(
    async (
      nextMode: "text" | "checklist",
      nextTitle: string,
      nextContent: string,
      nextChecklistItems: NoteChecklistItem[],
      nextColor: string | null
    ) => {
      if (!user?.uid || !selectedNoteId) return false;

      const current = savedNotesList.find((note) => note.id === selectedNoteId);
      const normalizedChecklist = normalizeChecklistItems(nextChecklistItems);
      const computedContent = nextMode === "checklist" ? buildChecklistContent(normalizedChecklist) : nextContent;
      const computedTitle = buildNoteTitle(nextTitle, computedContent);
      if (
        current &&
        current.title === computedTitle &&
        current.content === computedContent &&
        current.mode === nextMode &&
        JSON.stringify(current.checklistItems) === JSON.stringify(normalizedChecklist) &&
        current.color === nextColor
      ) {
        return true;
      }

      try {
        setEditorSaving(true);
        await setDoc(
          doc(db, "users", user.uid, "privateNotes", selectedNoteId),
          {
            title: computedTitle,
            content: computedContent,
            noteMode: nextMode,
            checklistItems: nextMode === "checklist" ? normalizedChecklist : [],
            color: nextColor ?? null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setSavedNotesList((prev) =>
          prev.map((note) =>
            note.id === selectedNoteId
              ? {
                  ...note,
                  mode: nextMode,
                  title: computedTitle,
                  content: computedContent,
                  checklistItems: nextMode === "checklist" ? normalizedChecklist : [],
                  color: nextColor ?? null,
                  updatedAtMs: Date.now(),
                }
              : note
          )
        );
        return true;
      } catch (err) {
        setError(mapFirebaseError(err, "Lagring feilet. Prøv igjen."));
        return false;
      } finally {
        setEditorSaving(false);
      }
    },
    [savedNotesList, selectedNoteId, user?.uid]
  );

  const hasEditorPendingChanges = React.useMemo(() => {
    if (!selectedNoteId || !editorOpen) return false;
    const current = savedNotesList.find((note) => note.id === selectedNoteId);
    if (!current) return false;
    const normalizedChecklist = normalizeChecklistItems(draftChecklistItems);
    const computedContent = draftMode === "checklist" ? buildChecklistContent(normalizedChecklist) : draftContent;
    return (
      current.mode !== draftMode ||
      current.title !== buildNoteTitle(draftTitle, computedContent) ||
      current.content !== computedContent ||
      JSON.stringify(current.checklistItems) !== JSON.stringify(normalizedChecklist) ||
      current.color !== draftColor
    );
  }, [draftChecklistItems, draftColor, draftContent, draftMode, draftTitle, editorOpen, savedNotesList, selectedNoteId]);

  const handleCloseEditor = React.useCallback(() => {
    if (hasEditorPendingChanges) {
      void saveExistingNote(draftMode, draftTitle, draftContent, draftChecklistItems, draftColor);
    }
    setEditorOpen(false);
  }, [draftChecklistItems, draftColor, draftContent, draftMode, draftTitle, hasEditorPendingChanges, saveExistingNote]);

  const handleDeleteNote = React.useCallback(async () => {
    if (!user?.uid || !selectedNoteId) return false;

    const confirmed = window.confirm("Er du sikker på at du vil slette dette notatet?");
    if (!confirmed) return false;

    setDeletingNote(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteDoc(doc(db, "users", user.uid, "privateNotes", selectedNoteId));

      const remaining = savedNotesList.filter((note) => note.id !== selectedNoteId);
      setSavedNotesList(remaining);
      await persistNotesOrder(remaining);

      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0].id);
        setDraftMode(remaining[0].mode);
        setDraftTitle(remaining[0].title);
        setDraftContent(remaining[0].content);
        setDraftChecklistItems(remaining[0].checklistItems);
        setDraftColor(remaining[0].color);
      } else {
        setSelectedNoteId(null);
        setDraftMode("text");
        setDraftTitle("");
        setDraftContent("");
        setDraftChecklistItems([]);
        setDraftColor(null);
      }

      setSuccess("Notatet er slettet.");
      return true;
    } catch (err) {
      setError(mapFirebaseError(err, "Sletting feilet. Prøv igjen."));
      return false;
    } finally {
      setDeletingNote(false);
    }
  }, [persistNotesOrder, savedNotesList, selectedNoteId, user?.uid]);

  const handleDropOnNote = React.useCallback(
    async (targetNoteId: string) => {
      if (!draggingNoteId) return;

      const reordered = reorderByIds(savedNotesList, draggingNoteId, targetNoteId);
      setDraggingNoteId(null);
      setDragOverNoteId(null);

      if (reordered === savedNotesList) return;

      setSavedNotesList(reordered);
      try {
        await persistNotesOrder(reordered);
      } catch (err) {
        setError(mapFirebaseError(err, "Kunne ikke lagre ny rekkefølge."));
      }
    },
    [draggingNoteId, persistNotesOrder, savedNotesList]
  );

  React.useEffect(() => {
    if (!editorOpen || !selectedNoteId) return;
    if (!hasEditorPendingChanges) return;

    const timeout = window.setTimeout(() => {
      void saveExistingNote(draftMode, draftTitle, draftContent, draftChecklistItems, draftColor);
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    draftChecklistItems,
    draftColor,
    draftContent,
    draftMode,
    draftTitle,
    editorOpen,
    hasEditorPendingChanges,
    saveExistingNote,
    selectedNoteId,
  ]);

  const filteredNotes = React.useMemo(
    () => savedNotesList.filter((note) => matchesSearchQuery(note, searchQuery)),
    [savedNotesList, searchQuery]
  );
  const selectedNote = React.useMemo(
    () => savedNotesList.find((note) => note.id === selectedNoteId) ?? null,
    [savedNotesList, selectedNoteId]
  );
  const activeEditorColor = selectedNote ? draftColor ?? getNoteColor(selectedNote) : draftColor;
  const hasActiveSearch = searchQuery.trim().length >= 2;
  const sharedRoutineDocRef = React.useMemo(
    () => doc(db, SHARED_ROUTINES_COLLECTION, SHARED_ROUTINES_DOC_ID),
    []
  );
  const selectedRoutineDocument = React.useMemo(
    () => routineDocuments.find((docItem) => docItem.id === selectedRoutineDocumentId) ?? null,
    [routineDocuments, selectedRoutineDocumentId]
  );
  const routineDocumentsById = React.useMemo(
    () => new Map(routineDocuments.map((docItem) => [docItem.id, docItem])),
    [routineDocuments]
  );
  const showRoutineLabels = tab !== "rutiner" || routineSidebarWidth >= 170;
  const routineColorMenuOpen = Boolean(routineColorAnchorEl);
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

  const createDefaultRoutineDocument = React.useCallback(
    (): RoutineDocument => ({
      id: createRoutineDocId(),
      title: "Fane 1",
      content: "",
      parentId: null,
      emoji: null,
    }),
    []
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
        setError(mapFirebaseError(err, "Kunne ikke laste rutiner."));
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
      documents: routineDocuments,
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
      },
      { merge: true }
    ).catch((err) => {
      routineSyncSignatureRef.current = "";
      setError(mapFirebaseError(err, "Kunne ikke lagre rutiner."));
    });
  }, [routineDocuments, routineLoaded, selectedRoutineDocumentId, sharedRoutineDocRef, user?.uid]);

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
        parentId: null,
        emoji: null,
      };
      setSelectedRoutineDocumentId(created.id);
      return [...prev, created];
    });
  }, []);

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
  }, [closeRoutineDocMenu, routineDocMenuTarget]);

  const commitRoutineDocRename = React.useCallback(() => {
    if (!editingRoutineDocId) return;
    const nextName = editingRoutineDocTitle.trim();
    if (nextName) {
      setRoutineDocuments((prev) =>
        prev.map((docItem) =>
          docItem.id === editingRoutineDocId
            ? {
                ...docItem,
                title: nextName,
              }
            : docItem
        )
      );
    }
    setEditingRoutineDocId(null);
    setEditingRoutineDocTitle("");
  }, [editingRoutineDocId, editingRoutineDocTitle]);

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
      setRoutineDocuments((prev) =>
        prev.map((docItem) =>
          docItem.id === routineEmojiPickerTargetId
            ? {
                ...docItem,
                emoji: nextEmoji?.trim() ? nextEmoji.trim() : null,
              }
            : docItem
        )
      );
      closeRoutineEmojiPicker();
    },
    [closeRoutineEmojiPicker, routineEmojiPickerTargetId]
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
  }, [closeRoutineDocMenu, routineDocMenuTarget, selectedRoutineDocumentId]);

  const handleRoutineContentChange = React.useCallback((value: string) => {
    if (!selectedRoutineDocumentId) return;
    setRoutineDocuments((prev) =>
      prev.map((docItem) =>
        docItem.id === selectedRoutineDocumentId ? { ...docItem, content: value } : docItem
      )
    );
  }, [selectedRoutineDocumentId]);

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

  const updateRoutineFormatState = React.useCallback(() => {
    setRoutineFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }, []);

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

  const handleRoutineStyleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextStyle = event.target.value as RoutineTextStyle;
      setRoutineTextStyle(nextStyle);
      const formatValue = nextStyle === "p" ? "<p>" : nextStyle === "h1" ? "<h1>" : "<h2>";
      runRoutineCommand("formatBlock", formatValue);
    },
    [runRoutineCommand]
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

    if (tab === "rutiner" && (changedDoc || document.activeElement !== editor)) {
      editor.focus();
    }
  }, [selectedRoutineDocument, tab]);

  React.useEffect(() => {
    if (tab !== "rutiner") return;
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
  }, [captureRoutineSelection, tab, updateRoutineFormatState]);

  return (
    <Box sx={{ width: "100%" }}>
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, nextTab: "meldeskjema" | "rutiner" | "notater") => setTab(nextTab)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="notater" label="Mine notater" />
          <Tab value="rutiner" label="Rutiner" />
          <Tab value="meldeskjema" label="Innspill" />
        </Tabs>
      </Paper>

      {tab === "meldeskjema" ? (
        <>
          {isOwner && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 1.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Kun eier kan åpne innsendinger og se svaroversikt.
              </Typography>
              <Button
                variant="outlined"
                href={MELDESKJEMA_RESPONSES_URL}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<OpenInNewIcon />}
              >
                Åpne svar
              </Button>
            </Paper>
          )}
          <Paper
            sx={{
              height: { xs: isOwner ? "calc(100vh - 390px)" : "calc(100vh - 310px)", md: isOwner ? "calc(100vh - 360px)" : "calc(100vh - 280px)" },
              minHeight: 520,
              overflow: "hidden",
            }}
          >
            <Box
              component="iframe"
              src={MELDESKJEMA_EMBED_URL}
              title="Meldeskjema for REKS+"
              sx={{ width: "100%", height: "100%", border: 0 }}
            />
          </Paper>
        </>
      ) : tab === "rutiner" ? (
        <Paper
          sx={{
            minHeight: 520,
            height: { xs: "calc(100vh - 230px)", md: "calc(100vh - 190px)" },
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
                          width: 34,
                          height: 34,
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
                        <FormatBoldIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => runRoutineCommand("italic")}
                        aria-label="Kursiv"
                        sx={{
                          width: 34,
                          height: 34,
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
                        <FormatItalicIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => runRoutineCommand("underline")}
                        aria-label="Understreket"
                        sx={{
                          width: 34,
                          height: 34,
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
                        <FormatUnderlinedIcon sx={{ fontSize: 20 }} />
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
                          px: 0.75,
                          py: 0.32,
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
                  </Box>
                  <Box sx={{ p: 0, flex: 1, minHeight: 0 }}>
                    <Box
                      key={selectedRoutineDocument.id}
                      ref={routineEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handleRoutineEditorInput}
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
                      }}
                    />
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
      ) : (
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          {loadingNotes ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: { xs: 1.5, md: 2.5 },
                  alignItems: "stretch",
                  justifyContent: { xs: "stretch", md: "flex-start" },
                  mb: 3,
                }}
              >
                <Box sx={{ width: { xs: "100%", md: 442 }, maxWidth: { xs: "100%", md: 442 }, flexShrink: 0 }}>
                  {!composerExpanded ? (
                    <Paper
                      variant="outlined"
                      onClick={handleOpenComposer}
                      sx={{
                        px: 2,
                        py: 1.4,
                        borderRadius: 2,
                        borderColor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(230,165,190,0.45)"
                            : "rgba(186,104,200,0.5)",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(21,29,40,0.96)"
                            : "rgba(255,255,255,0.95)",
                        backgroundImage: (theme) =>
                          theme.palette.mode === "dark"
                            ? "linear-gradient(135deg, rgba(27,36,50,0.99) 0%, rgba(24,32,45,0.96) 100%)"
                            : "linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(252,248,252,0.96) 100%)",
                        boxShadow: (theme) =>
                          theme.palette.mode === "dark"
                            ? "0 14px 30px rgba(2,6,18,0.38)"
                            : "0 14px 30px rgba(186,104,200,0.18)",
                        cursor: "text",
                        transition: "box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: (theme) =>
                            theme.palette.mode === "dark"
                              ? "0 20px 38px rgba(2,6,18,0.46)"
                              : "0 18px 34px rgba(186,104,200,0.22)",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(230,165,190,0.62)"
                              : "rgba(186,104,200,0.7)",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.1 }}>
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: 2,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(165,177,198,0.16)"
                                  : "rgba(15,23,42,0.06)",
                              color: "text.primary",
                            }}
                          >
                            <EditNoteRoundedIcon sx={{ fontSize: 21 }} />
                          </Box>
                          <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 500 }}>
                            Skriv et notat
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenChecklistComposer();
                          }}
                          aria-label="Nytt sjekkliste-notat"
                          sx={{
                            color: "text.secondary",
                            border: "1px solid",
                            borderColor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(165,177,198,0.32)"
                                : "rgba(15,23,42,0.15)",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(24,33,46,0.88)"
                                : "rgba(255,255,255,0.85)",
                            "&:hover": {
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(165,177,198,0.16)"
                                  : "rgba(15,23,42,0.06)",
                            },
                          }}
                        >
                          <CheckBoxOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  ) : (
                    <ClickAwayListener
                      onClickAway={() => {
                        void createNoteFromComposer();
                        setComposerExpanded(false);
                      }}
                    >
                      <Paper
                        variant="outlined"
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderRadius: 2,
                        borderColor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(230,165,190,0.5)"
                            : "rgba(186,104,200,0.55)",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(22,31,43,0.98)"
                            : "rgba(255,255,255,0.98)",
                        backgroundImage: (theme) =>
                          theme.palette.mode === "dark"
                            ? "linear-gradient(160deg, rgba(28,38,53,0.99) 0%, rgba(22,31,43,0.96) 100%)"
                            : "linear-gradient(160deg, rgba(255,255,255,0.99) 0%, rgba(252,248,252,0.96) 100%)",
                        boxShadow: (theme) =>
                          theme.palette.mode === "dark"
                            ? "0 20px 36px rgba(2,6,18,0.44)"
                            : "0 20px 36px rgba(186,104,200,0.2)",
                      }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                          <InputBase
                            value={draftTitle}
                            onChange={(event) => {
                              setDraftTitle(event.target.value);
                              if (success) setSuccess(null);
                            }}
                            placeholder="Tittel"
                            fullWidth
                            autoFocus
                            sx={{
                              px: 0.25,
                              fontSize: "1.35rem",
                              fontWeight: 600,
                              color: "text.primary",
                              "& input::placeholder": {
                                color: "text.secondary",
                                opacity: 1,
                              },
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={toggleDraftChecklistMode}
                            aria-label={draftMode === "checklist" ? "Bytt til vanlig notattekst" : "Bytt til sjekkliste"}
                            sx={{
                              color: draftMode === "checklist" ? "primary.main" : "text.secondary",
                              border: "1px solid",
                              borderColor: draftMode === "checklist" ? "primary.main" : "divider",
                              bgcolor: "background.paper",
                              "&:hover": {
                                bgcolor: "action.hover",
                              },
                            }}
                          >
                            <CheckBoxOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        {draftMode === "checklist" ? (
                          <Box>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                              {sortChecklistItems(draftChecklistItems)
                                .filter((item) => !item.done)
                                .map((item, index, activeItems) => (
                                  <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <Checkbox
                                      checked={item.done}
                                      onChange={(event) => {
                                        toggleChecklistItemDone(item.id, event.target.checked);
                                        if (success) setSuccess(null);
                                      }}
                                      size="small"
                                    />
                                    <InputBase
                                      value={item.text}
                                      onChange={(event) => {
                                        updateChecklistItemText(item.id, event.target.value);
                                        if (success) setSuccess(null);
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" && index === activeItems.length - 1) {
                                          event.preventDefault();
                                          addChecklistItem();
                                        }
                                      }}
                                      placeholder="Listeelement"
                                      fullWidth
                                      sx={{
                                        fontSize: "1.05rem",
                                        color: "text.primary",
                                        "& input::placeholder": {
                                          color: "text.secondary",
                                          opacity: 1,
                                        },
                                      }}
                                    />
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        removeChecklistItem(item.id);
                                        if (success) setSuccess(null);
                                      }}
                                      aria-label="Fjern punkt"
                                    >
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ))}
                            </Box>

                            <Button variant="text" size="small" onClick={addChecklistItem} sx={{ mt: 0.5 }}>
                              + Listeelement
                            </Button>

                            {sortChecklistItems(draftChecklistItems).some((item) => item.done) && (
                              <Box sx={{ mt: 1.25 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                  Fullført
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                  {sortChecklistItems(draftChecklistItems)
                                    .filter((item) => item.done)
                                    .map((item) => (
                                      <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        <Checkbox
                                          checked={item.done}
                                          onChange={(event) => {
                                            toggleChecklistItemDone(item.id, event.target.checked);
                                            if (success) setSuccess(null);
                                          }}
                                          size="small"
                                        />
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            flex: 1,
                                            textDecoration: "line-through",
                                            color: "text.secondary",
                                            wordBreak: "break-word",
                                          }}
                                        >
                                          {item.text}
                                        </Typography>
                                      </Box>
                                    ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <InputBase
                            value={draftContent}
                            onChange={(event) => {
                              setDraftContent(event.target.value);
                              if (success) setSuccess(null);
                            }}
                            placeholder="Skriv et notat"
                            fullWidth
                            multiline
                            minRows={3}
                            maxRows={6}
                            sx={{
                              px: 0.25,
                              fontSize: "1.1rem",
                              lineHeight: 1.5,
                              color: "text.primary",
                              "& textarea::placeholder": {
                                color: "text.secondary",
                                opacity: 1,
                              },
                            }}
                          />
                        )}
                      </Paper>
                    </ClickAwayListener>
                  )}
                </Box>

                <Box
                sx={{
                  display: { xs: "none", md: "block" },
                  width: "1px",
                  ml: { md: "auto" },
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(165,177,198,0.22)"
                      : "rgba(15,23,42,0.12)",
                  borderRadius: 999,
                  my: 2.25,
                }}
              />

                <Box sx={{ width: { xs: "100%", md: 340 }, maxWidth: { xs: "100%", md: 340 }, flexShrink: 0 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      px: 1.7,
                      py: 1.15,
                      borderRadius: 2,
                      borderColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(165,177,198,0.26)"
                          : "rgba(15,23,42,0.16)",
                      borderStyle: "dashed",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(20,28,39,0.94)"
                          : "rgba(255,255,255,0.94)",
                      backgroundImage: (theme) =>
                        theme.palette.mode === "dark"
                          ? "linear-gradient(135deg, rgba(26,36,51,0.99) 0%, rgba(21,30,43,0.94) 100%)"
                          : "linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(246,248,252,0.94) 100%)",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 8px 18px rgba(2,6,18,0.35)"
                          : "0 8px 18px rgba(15,23,42,0.07)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                      <InputBase
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="søk"
                        fullWidth
                        sx={{
                          fontSize: "1rem",
                          color: "text.primary",
                          "& input::placeholder": {
                            color: "text.secondary",
                            opacity: 1,
                          },
                        }}
                      />
                      {searchQuery.trim().length > 0 && (
                        <IconButton
                          size="small"
                          onClick={() => setSearchQuery("")}
                          aria-label="Tøm søk"
                          sx={{ color: "text.secondary" }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Paper>
                </Box>
              </Box>

              <Typography variant="h3" sx={{ mb: 1.25 }}>
                {`Lagrede notater (${filteredNotes.length}${searchQuery.trim() ? ` av ${savedNotesList.length}` : ""})`}
              </Typography>

              <Box
                sx={{
                  ...(hasActiveSearch
                    ? {
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                          lg: "repeat(3, minmax(0, 1fr))",
                          xl: "repeat(4, minmax(0, 1fr))",
                        },
                        gap: 2,
                      }
                    : {
                        columnCount: { xs: 1, sm: 2, md: 3, xl: 4 },
                        columnGap: 2,
                      }),
                }}
              >
                {savedNotesList.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Ingen lagrede notater ennå.
                  </Typography>
                ) : filteredNotes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Ingen notater matcher søket ditt.
                  </Typography>
                ) : (
                  filteredNotes.map((note) => {
                    const isSelected = note.id === selectedNoteId;
                    const noteBackground = getNoteColor(note);

                    return (
                      <Paper
                        key={note.id}
                        variant="outlined"
                        onClick={() => {
                          void copyNoteToClipboard(
                            note.mode === "checklist" ? buildChecklistContent(note.checklistItems) : note.content,
                            "manual"
                          );
                        }}
                        draggable
                        onDragStart={(event) => {
                          setDraggingNoteId(note.id);
                          setDragOverNoteId(note.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", note.id);

                          const dragPreview = document.createElement("div");
                          dragPreview.textContent = "⤢ Flytt notat";
                          dragPreview.style.position = "fixed";
                          dragPreview.style.top = "-1000px";
                          dragPreview.style.left = "-1000px";
                          dragPreview.style.padding = "6px 10px";
                          dragPreview.style.borderRadius = "999px";
                          dragPreview.style.background = "rgba(33, 33, 33, 0.92)";
                          dragPreview.style.color = "#fff";
                          dragPreview.style.fontSize = "12px";
                          dragPreview.style.fontWeight = "600";
                          dragPreview.style.pointerEvents = "none";
                          dragPreview.style.zIndex = "9999";
                          document.body.appendChild(dragPreview);
                          event.dataTransfer.setDragImage(dragPreview, 14, 14);
                          window.setTimeout(() => {
                            dragPreview.remove();
                          }, 0);
                        }}
                        onDragEnter={() => {
                          if (!draggingNoteId || draggingNoteId === note.id) return;
                          setDragOverNoteId(note.id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          void handleDropOnNote(note.id);
                        }}
                        onDragEnd={() => {
                          setDraggingNoteId(null);
                          setDragOverNoteId(null);
                        }}
                        sx={{
                          p: 1.5,
                          mb: hasActiveSearch ? 0 : 2,
                          display: hasActiveSearch ? "block" : "inline-block",
                          width: "100%",
                          breakInside: hasActiveSearch ? "auto" : "avoid",
                          cursor: draggingNoteId === note.id ? "grabbing" : "pointer",
                          borderColor:
                            dragOverNoteId === note.id && draggingNoteId !== note.id
                              ? "primary.main"
                              : isSelected
                              ? "primary.main"
                              : "divider",
                          bgcolor: noteBackground,
                          color: (theme) =>
                            theme.palette.mode === "dark" ? "#1A2B40" : theme.palette.text.primary,
                          boxShadow: isSelected ? "0 0 0 1px rgba(25,118,210,0.35)" : "none",
                          transition: "transform 120ms ease, box-shadow 120ms ease",
                          opacity: draggingNoteId === note.id ? 0.55 : 1,
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: (theme) =>
                              theme.palette.mode === "dark"
                                ? "0 10px 26px rgba(2,6,18,0.42)"
                                : "0 8px 24px rgba(0,0,0,0.12)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 1,
                          }}
                        >
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {note.title || "Uten tittel"}
                          </Typography>
                          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                            <DragIndicatorIcon
                              sx={{
                                fontSize: 18,
                                color: (theme) =>
                                  theme.palette.mode === "dark" ? "#516987" : theme.palette.text.secondary,
                              }}
                            />
                            <Box
                              component="button"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenEditor(note);
                              }}
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 0.75,
                                color: (theme) =>
                                  theme.palette.mode === "dark" ? "#253A55" : theme.palette.text.secondary,
                                border: "1px solid",
                                borderColor: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "rgba(31,42,58,0.24)"
                                    : theme.palette.divider,
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.48)"
                                    : "transparent",
                                px: 1.2,
                                py: 0.4,
                                minHeight: 40,
                                minWidth: 98,
                                borderRadius: 1.25,
                                cursor: "pointer",
                                transition: "background-color 120ms ease, border-color 120ms ease",
                                "&:hover": {
                                  bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                      ? "rgba(255,255,255,0.62)"
                                      : theme.palette.action.hover,
                                  borderColor: (theme) =>
                                    theme.palette.mode === "dark"
                                      ? "rgba(31,42,58,0.35)"
                                      : theme.palette.text.secondary,
                                },
                                "&:focus-visible": {
                                  outline: "2px solid",
                                  outlineColor: "primary.main",
                                  outlineOffset: 1,
                                },
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Endre
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        {note.mode === "checklist" ? (
                          <Box sx={{ mt: 0.75 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                              {note.checklistItems
                                .filter((item) => !item.done)
                                .slice(0, 4)
                                .map((item) => (
                                  <Typography
                                    key={item.id}
                                    variant="body2"
                                    sx={{
                                      color: (theme) =>
                                        theme.palette.mode === "dark" ? "#334D6A" : theme.palette.text.secondary,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    • {item.text}
                                  </Typography>
                                ))}
                            </Box>

                            {note.checklistItems.some((item) => item.done) && (
                              <Box sx={{ mt: 0.75 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: (theme) =>
                                      theme.palette.mode === "dark" ? "#425E7C" : theme.palette.text.secondary,
                                    display: "block",
                                    mb: 0.25,
                                  }}
                                >
                                  Fullført ({note.checklistItems.filter((item) => item.done).length})
                                </Typography>
                                {note.checklistItems
                                  .filter((item) => item.done)
                                  .slice(0, 2)
                                  .map((item) => (
                                    <Typography
                                      key={item.id}
                                      variant="body2"
                                      sx={{
                                        color: (theme) =>
                                          theme.palette.mode === "dark" ? "#4A6584" : theme.palette.text.secondary,
                                        textDecoration: "line-through",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {item.text}
                                    </Typography>
                                  ))}
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{
                              color: (theme) =>
                                theme.palette.mode === "dark" ? "#334D6A" : theme.palette.text.secondary,
                              mt: 0.75,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {note.content}
                          </Typography>
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            color: (theme) =>
                              theme.palette.mode === "dark" ? "#425E7C" : theme.palette.text.secondary,
                            mt: 1.25,
                            display: "block",
                          }}
                        >
                          Oppdatert: {formatDateTime(note.updatedAtMs)}
                        </Typography>
                      </Paper>
                    );
                  })
                )}
              </Box>
            </>
          )}
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
      <Dialog
        open={editorOpen}
        onClose={handleCloseEditor}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            maxWidth: 544,
          },
        }}
      >
        <DialogTitle>Rediger notat</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 1.5, mb: 1.25 }}>
            <InputBase
              value={draftTitle}
              onChange={(event) => {
                setDraftTitle(event.target.value);
                if (success) setSuccess(null);
              }}
              placeholder="Tittel"
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              sx={{
                px: 0.25,
                fontSize: "1.35rem",
                fontWeight: 600,
                lineHeight: 1.3,
                color: "text.primary",
                "& textarea": {
                  resize: "none",
                },
              }}
            />
            <IconButton
              size="small"
              onClick={toggleDraftChecklistMode}
              aria-label={draftMode === "checklist" ? "Bytt til vanlig notattekst" : "Bytt til sjekkliste"}
              sx={{
                color: draftMode === "checklist" ? "primary.main" : "text.secondary",
                border: "1px solid",
                borderColor: draftMode === "checklist" ? "primary.main" : "divider",
                bgcolor: "background.paper",
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <CheckBoxOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>

          {draftMode === "checklist" ? (
            <Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {sortChecklistItems(draftChecklistItems)
                  .filter((item) => !item.done)
                  .map((item, index, activeItems) => (
                    <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Checkbox
                        checked={item.done}
                        onChange={(event) => {
                          toggleChecklistItemDone(item.id, event.target.checked);
                          if (success) setSuccess(null);
                        }}
                        size="small"
                      />
                      <InputBase
                        value={item.text}
                        onChange={(event) => {
                          updateChecklistItemText(item.id, event.target.value);
                          if (success) setSuccess(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && index === activeItems.length - 1) {
                            event.preventDefault();
                            addChecklistItem();
                          }
                        }}
                        placeholder="Listeelement"
                        fullWidth
                        sx={{
                          fontSize: "1.05rem",
                          color: "text.primary",
                          "& input::placeholder": {
                            color: "text.secondary",
                            opacity: 1,
                          },
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          removeChecklistItem(item.id);
                          if (success) setSuccess(null);
                        }}
                        aria-label="Fjern punkt"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
              </Box>

              <Button variant="text" size="small" onClick={addChecklistItem} sx={{ mt: 0.75 }}>
                + Listeelement
              </Button>

              {sortChecklistItems(draftChecklistItems).some((item) => item.done) && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Fullført ({sortChecklistItems(draftChecklistItems).filter((item) => item.done).length})
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {sortChecklistItems(draftChecklistItems)
                      .filter((item) => item.done)
                      .map((item) => (
                        <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Checkbox
                            checked={item.done}
                            onChange={(event) => {
                              toggleChecklistItemDone(item.id, event.target.checked);
                              if (success) setSuccess(null);
                            }}
                            size="small"
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              flex: 1,
                              textDecoration: "line-through",
                              color: "text.secondary",
                              wordBreak: "break-word",
                            }}
                          >
                            {item.text}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <TextField
              label="Notat"
              value={draftContent}
              onChange={(event) => {
                setDraftContent(event.target.value);
                if (success) setSuccess(null);
              }}
              fullWidth
              multiline
              minRows={10}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {editorSaving ? "Lagrer automatisk..." : "Endringer lagres automatisk"}
          </Typography>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.6,
              flexWrap: "wrap",
              maxWidth: { xs: 220, sm: 320, md: 360 },
              justifyContent: "flex-end",
            }}
          >
            {KEEP_CARD_COLORS.map((color) => {
              const isActive = activeEditorColor === color;
              return (
                <IconButton
                  key={color}
                  onClick={() => {
                    setDraftColor(color);
                    if (success) setSuccess(null);
                  }}
                  aria-label="Velg notatfarge"
                  sx={{
                    width: 26,
                    height: 26,
                    p: 0,
                    border: "1px solid",
                    borderColor: (theme) =>
                      isActive
                        ? theme.palette.text.primary
                        : theme.palette.mode === "dark"
                          ? "rgba(165,177,198,0.38)"
                          : "rgba(15,23,42,0.22)",
                    bgcolor: color,
                    boxShadow: (theme) =>
                      isActive
                        ? theme.palette.mode === "dark"
                          ? "0 0 0 2px rgba(165,177,198,0.34)"
                          : "0 0 0 2px rgba(15,23,42,0.18)"
                        : "none",
                    "&:hover": {
                      transform: "scale(1.08)",
                      borderColor: "text.primary",
                    },
                  }}
                >
                  {isActive && (
                    <CheckIcon
                      sx={{
                        fontSize: 16,
                        color: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(248,250,252,0.94)" : "rgba(15,23,42,0.86)",
                      }}
                    />
                  )}
                </IconButton>
              );
            })}
          </Box>
          {selectedNoteId && (
            <Button
              color="error"
              onClick={async () => {
                const deleted = await handleDeleteNote();
                if (deleted) setEditorOpen(false);
              }}
              disabled={savingNotes || deletingNote}
            >
              {deletingNote ? "Sletter..." : "Slett"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
