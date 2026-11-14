import { useEffect, useMemo, useRef, useState } from "react";
import { Box, ButtonBase, Typography, Tabs, Tab, Popover, GlobalStyles as CssVars, useTheme } from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { MK, MK_DARK_VARS, MK_LIGHT_VARS, macroColor } from "./melkeTheme";
import { Hl, MatchBanner, SearchHeader, SearchResults, SearchTrigger, SuggestionsPanel } from "./melkeSearch";
import {
  HIT_BG,
  HIT_NOW_BG,
  HIT_NOW_SHADOW,
  countHits,
  normalizeText,
  parseTokens,
  rankProducts,
  type SearchField,
  type SearchMode,
  type SearchProductInfo,
} from "./melkeSearchCore";

/**
 * Egenskapene i produkthodet deles i grupper så det blir lett å skanne:
 * hovedtype (få, uthevet), «fri for», «tilsatt» og øvrige – i stedet for mange like merkelapper.
 */
function groupBadges(product: { badges: { label: string }[] }) {
  const labels = product.badges.map((b) => b.label);
  const primary = labels.filter((l) => /^(Hydrolysert|Aminosyrebasert)$/.test(l) || /komplett|variert kosthold|^Tilskudd/i.test(l));
  const fri = labels.filter((l) => /^(Glutenfri|Laktosefri|Kostfiberfri)$/.test(l));
  const tilsatt = labels.filter((l) => /^Med /.test(l)).map((l) => l.replace(/^Med /, ""));
  const sertifisert = labels
    .filter((l) => !primary.includes(l) && !fri.includes(l) && !/^Med /.test(l))
    .map((l) => l.replace(/sertifisert$/i, "").trim());
  return { primary, fri, tilsatt, sertifisert };
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = {
  bg:         MK.bg,
  surface:    MK.surface,
  surfaceAlt: MK.alt,
  border:     MK.border,
  borderMed:  MK.borderMed,
  text:       MK.text,
  textSub:    MK.sub,
  textMuted:  MK.muted,
  blue:       MK.accent,
  blueLight:  MK.pill,
  blueMid:    MK.pillBorder,
  purple:     MK.accent,
  purpleBg:   MK.accentBg,
  radius:     14,
  radiusSm:   10,
  shadow:     "none",
};

const ICON_MICROSCOPE = (c: string) => <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(0.4 0 0 0.4 12 12)"><path style={{fill: c, strokeLinecap: "round"}} transform="translate(-25, -25.02)" d="M 19.3125 0.03125 C 19.121094 0.03125 18.933594 0.078125 18.75 0.15625 L 11.59375 3.125 C 10.855469 3.433594 10.484375 4.292969 10.78125 5.03125 C 10.78125 5.042969 10.78125 5.050781 10.78125 5.0625 L 11.5625 6.9375 C 11.867188 7.679688 12.753906 8.03125 13.5 7.71875 L 14.25 7.40625 L 15.125 9.65625 L 14.96875 9.71875 C 14.683594 9.832031 14.457031 9.902344 14.21875 10.03125 C 13.980469 10.160156 13.632813 10.40625 13.46875 10.8125 C 13.304688 11.21875 13.394531 11.585938 13.46875 11.84375 C 13.542969 12.101563 13.636719 12.3125 13.75 12.59375 C 13.75 12.605469 13.75 12.613281 13.75 12.625 L 13.9375 13.125 L 13.5 13.28125 C 8.296875 15.398438 5.769531 21.367188 7.875 26.5625 C 7.875 26.574219 7.875 26.582031 7.875 26.59375 L 10.15625 32 C 9.375 33.140625 8.90625 34.523438 8.90625 36 C 8.90625 39.410156 11.339844 42.273438 14.5625 42.9375 C 14.5625 42.957031 14.5625 42.980469 14.5625 43 C 14.757813 43.34375 14.96875 43.671875 15.1875 44 L 9.875 44 C 8.261719 44 7 45.386719 7 47 L 7 49 C 7 49.550781 7.449219 50 8 50 L 42 50 C 42.550781 50 43 49.550781 43 49 L 43 47 C 43 45.386719 41.738281 44 40.125 44 L 37.3125 44 C 39.160156 43.210938 40.101563 41.105469 39.375 39.21875 C 38.816406 37.769531 37.4375 36.832031 35.96875 36.78125 C 35.480469 36.765625 34.984375 36.84375 34.5 37.03125 L 24.65625 40.84375 C 24.644531 40.84375 24.636719 40.84375 24.625 40.84375 C 24.242188 40.996094 23.753906 40.984375 23.1875 40.75 C 22.753906 40.570313 22.332031 40.242188 21.9375 39.875 C 22.667969 38.761719 23.09375 37.421875 23.09375 36 C 23.09375 35.542969 23.019531 35.089844 22.9375 34.65625 L 35.875 29.375 C 36.410156 29.238281 36.730469 28.691406 36.59375 28.15625 C 36.457031 27.621094 35.910156 27.300781 35.375 27.4375 C 35.289063 27.449219 35.207031 27.46875 35.125 27.5 L 22.28125 32.78125 C 21.234375 30.75 19.257813 29.273438 16.90625 28.96875 L 14.84375 23.75 C 14.292969 22.386719 14.945313 20.839844 16.3125 20.28125 C 16.324219 20.28125 16.332031 20.28125 16.34375 20.28125 L 16.84375 20.0625 L 18.34375 23.71875 C 18.359375 23.78125 18.378906 23.847656 18.40625 23.90625 L 19.40625 26.34375 C 19.507813 26.582031 19.699219 26.773438 19.9375 26.875 L 22.8125 28.09375 C 23.054688 28.191406 23.320313 28.191406 23.5625 28.09375 L 27.65625 26.46875 C 27.894531 26.367188 28.085938 26.175781 28.1875 25.9375 L 29.4375 23.0625 C 29.535156 22.820313 29.535156 22.554688 29.4375 22.3125 L 28.46875 20 C 28.46875 19.980469 28.46875 19.957031 28.46875 19.9375 L 28.46875 19.90625 C 28.457031 19.894531 28.449219 19.886719 28.4375 19.875 C 28.4375 19.855469 28.4375 19.832031 28.4375 19.8125 C 28.417969 19.769531 28.398438 19.726563 28.375 19.6875 L 23.75 8.5 C 23.636719 8.21875 23.5625 8.015625 23.4375 7.78125 C 23.3125 7.546875 23.101563 7.207031 22.6875 7.03125 C 22.273438 6.855469 21.910156 6.925781 21.65625 7 C 21.402344 7.074219 21.1875 7.167969 20.90625 7.28125 L 20.71875 7.34375 L 19.8125 5.09375 L 20.65625 4.75 C 21.382813 4.445313 21.761719 3.582031 21.46875 2.84375 L 21.46875 2.8125 L 20.6875 0.9375 C 20.449219 0.390625 19.886719 0.0351563 19.3125 0.03125 Z M 19.03125 2.1875 L 19.4375 3.09375 L 13.21875 5.6875 L 12.8125 4.78125 Z M 17.96875 5.84375 L 18.875 8.125 L 17 8.90625 L 16.09375 6.625 Z M 21.84375 9.09375 C 21.871094 9.15625 21.875 9.171875 21.90625 9.25 C 21.90625 9.261719 21.90625 9.269531 21.90625 9.28125 L 26.21875 19.6875 L 19.875 22.21875 L 15.59375 11.875 C 15.589844 11.863281 15.597656 11.855469 15.59375 11.84375 C 15.554688 11.75 15.527344 11.730469 15.5 11.65625 C 15.574219 11.625 15.585938 11.601563 15.6875 11.5625 C 15.699219 11.5625 15.707031 11.5625 15.71875 11.5625 L 21.65625 9.15625 C 21.75 9.117188 21.769531 9.121094 21.84375 9.09375 Z M 14.71875 14.9375 L 16.0625 18.21875 L 15.5625 18.40625 C 13.191406 19.375 12.039063 22.125 13 24.5 L 14.78125 29.03125 C 13.617188 29.234375 12.554688 29.707031 11.65625 30.40625 L 9.71875 25.8125 C 8.027344 21.636719 10.046875 16.882813 14.21875 15.15625 C 14.234375 15.152344 14.234375 15.128906 14.25 15.125 Z M 26.96875 21.5625 L 27.4375 22.65625 L 26.5 24.78125 L 23.21875 26.09375 L 21.09375 25.1875 L 20.65625 24.09375 Z M 16 31.09375 C 18.726563 31.09375 20.90625 33.273438 20.90625 36 C 20.90625 38.726563 18.726563 40.90625 16 40.90625 C 13.273438 40.90625 11.09375 38.726563 11.09375 36 C 11.09375 33.273438 13.273438 31.09375 16 31.09375 Z M 35.90625 38.78125 C 36.59375 38.804688 37.234375 39.246094 37.5 39.9375 C 37.855469 40.859375 37.390625 41.863281 36.46875 42.21875 L 31.8125 44 L 17.6875 44 C 17.464844 43.75 17.222656 43.410156 16.96875 43.03125 C 18.335938 42.84375 19.585938 42.265625 20.59375 41.40625 C 21.140625 41.902344 21.757813 42.3125 22.4375 42.59375 C 23.34375 42.96875 24.386719 43.085938 25.375 42.6875 L 35.21875 38.90625 C 35.449219 38.816406 35.675781 38.773438 35.90625 38.78125 Z M 9.875 46 L 40.125 46 C 40.582031 46 41 46.402344 41 47 L 41 48 L 9 48 L 9 47 C 9 46.402344 9.417969 46 9.875 46 Z" /></g></svg>;
const ICON_GUT = (c: string) => <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M24 4C24.5523 4 25 4.44772 25 5V8.45455C25 8.79457 24.942 9.13383 24.8268 9.45399C24.7117 9.77416 24.54 10.0734 24.3158 10.3316C24.0913 10.59 23.8172 10.8038 23.5047 10.9529C23.1915 11.1023 22.8497 11.1818 22.5002 11.1818H20.2589L20.2389 11.1816C19.0077 11.157 17.7858 11.656 16.8135 12.6284C15.8397 13.6023 15.1911 14.9802 15.0243 16.5086C14.9542 17.3448 15.0364 18.1876 15.2642 18.9816C15.493 19.7789 15.8618 20.5037 16.3404 21.1118C16.8187 21.7196 17.394 22.195 18.0235 22.5164C18.2493 22.6316 18.7551 22.7627 19.4071 22.8613C20.0262 22.9549 20.6417 23 21.0004 23C21.5527 23.0001 22.0004 23.4478 22.0003 24.0001C22.0003 24.5524 21.5525 25.0001 21.0002 25C20.5214 25 19.804 24.944 19.1082 24.8388C18.4452 24.7386 17.654 24.5733 17.1141 24.2976C16.2123 23.8372 15.4153 23.1703 14.7687 22.3487C14.1223 21.5274 13.6385 20.5674 13.3417 19.5331C13.045 18.4988 12.9402 17.4074 13.0325 16.3274L13.0346 16.3056C13.2443 14.3561 14.0749 12.5388 15.3992 11.2143C16.7248 9.88855 18.457 9.14858 20.2684 9.18182H22.5002C22.5445 9.18182 22.5928 9.17199 22.6436 9.14777C22.695 9.12325 22.7515 9.0826 22.8056 9.02026C22.86 8.95768 22.9093 8.87605 22.9448 8.7771C22.9804 8.67813 23 8.56818 23 8.45455V5C23 4.44772 23.4477 4 24 4Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M14.1141 23.7024C15.0167 23.2416 16.0003 23.0001 17.0002 23C17.5525 22.9999 18.0003 23.4476 18.0003 23.9999C18.0004 24.5522 17.5527 24.9999 17.0004 25C16.3252 25.0001 15.6523 25.1626 15.0235 25.4836C14.394 25.805 13.8187 26.2804 13.3404 26.8882C12.8618 27.4963 12.493 28.2211 12.2642 29.0184C12.0364 29.8124 11.9542 30.6552 12.0243 31.4914C12.1911 33.0198 12.8397 34.3977 13.8135 35.3716C14.2229 35.7811 14.9525 36.1621 15.8381 36.4358C16.708 36.7047 17.6014 36.8311 18.2389 36.8184L18.2589 36.8182H22.5002C22.8497 36.8182 23.1915 36.8977 23.5047 37.0471C23.8172 37.1962 24.0913 37.41 24.3158 37.6684C24.54 37.9266 24.7117 38.2258 24.8268 38.546C24.942 38.8662 25 39.2054 25 39.5455V43C25 43.5523 24.5523 44 24 44C23.4477 44 23 43.5523 23 43V39.5455C23 39.4318 22.9804 39.3219 22.9448 39.2229C22.9093 39.124 22.86 39.0423 22.8056 38.9797C22.7515 38.9174 22.695 38.8767 22.6436 38.8522C22.5928 38.828 22.5445 38.8182 22.5002 38.8182H18.2684C17.3844 38.8344 16.2814 38.6662 15.2474 38.3466C14.2251 38.0306 13.14 37.5266 12.3992 36.7857C11.0749 35.4612 10.2443 33.6439 10.0346 31.6944L10.0325 31.6726C9.9402 30.5926 10.045 29.5012 10.3417 28.4669C10.6385 27.4326 11.1223 26.4726 11.7687 25.6513C12.4153 24.8297 13.2123 24.1628 14.1141 23.7024Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M31.003 4C31.5553 4 32.003 4.44772 32.003 5V10.1816C32.0032 11.2022 31.8288 12.2156 31.4874 13.1646C31.146 14.1136 30.6426 14.9842 30.0001 15.7236C29.8265 15.9234 29.6267 16.1314 29.4094 16.3366C31.0698 16.4329 32.8619 16.7241 34.3796 17.5088C35.4115 18.0423 36.3328 18.8116 36.9897 19.9065C37.6456 20.9998 38.0001 22.3544 38.0001 24C38.0001 25.6409 37.6565 26.992 37.018 28.0838C36.3779 29.1785 35.4774 29.9506 34.4633 30.4869C32.9265 31.2998 31.1003 31.5847 29.419 31.6719C29.6227 31.8662 29.8159 32.0693 29.9975 32.2784C31.2915 33.7689 31.999 35.7633 31.9986 37.8182V43C31.9986 43.5523 31.5509 44 30.9986 44C30.4463 44 29.9986 43.5523 29.9986 43V37.8182C29.9989 36.2098 29.443 34.6904 28.4873 33.5896C27.4766 32.4255 26.2032 31.7066 24.9995 31.7059C24.4474 31.7056 24 31.2578 24.0001 30.7056C24.0003 30.1534 24.4479 29.7059 25.0001 29.7059H27.9972C29.9752 29.7059 32.0095 29.5222 33.5282 28.719C34.2659 28.3288 34.8675 27.7994 35.2916 27.0742C35.7173 26.3462 36.0001 25.3591 36.0001 24C36.0001 22.6456 35.7106 21.662 35.2747 20.9354C34.8397 20.2105 34.2212 19.6783 33.4611 19.2854C31.8984 18.4774 29.8138 18.2941 27.8153 18.2941H24.8182C24.266 18.294 23.8182 17.8462 23.8182 17.294C23.8183 16.7417 24.266 16.2941 24.8182 16.2941H24.8209C25.4559 16.2939 26.089 16.1502 26.6855 15.8659C27.2539 15.595 27.9926 14.9848 28.4904 14.4119C28.9628 13.8681 29.3437 13.2152 29.6055 12.4876C29.8673 11.7599 30.0032 10.9761 30.003 10.182V5C30.003 4.44772 30.4507 4 31.003 4Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M16 24C16 23.4477 16.4479 23 17.0002 23H30C30.5523 23 31 23.4477 31 24C31 24.5523 30.5523 25 30 25H17.0004C16.4481 25 16 24.5523 16 24Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M22 17.2942C22 16.7419 22.4477 16.2942 23 16.2942H25C25.5523 16.2942 26 16.7419 26 17.2942C26 17.8464 25.5523 18.2942 25 18.2942H23C22.4477 18.2942 22 17.8464 22 17.2942Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M17 30.7058C17 30.1536 17.4477 29.7058 18 29.7058L25.0001 29.7059C25.5524 29.7059 26 30.1536 26 30.7058C26 31.2581 25.5518 31.7059 24.9995 31.7059L18 31.7058C17.4477 31.7058 17 31.2581 17 30.7058Z" fill={c}/></svg>;
const ICON_MILK_BOTTLE = (c: string) => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(0.45 0 0 0.45 12 12)"><path style={{fill: c, strokeLinecap: "round"}} transform="translate(-25, -25)" d="M 16 3 C 15.447738123791542 3.0000552179053495 15.000055217905349 3.4477381237915417 15 4.000000000000001 L 15 7.6289062 L 9.2402344 14.349609 C 9.235611999065108 14.355417743582233 9.231054416584485 14.36127777345569 9.2265625 14.367188 C 9.223277559201216 14.371069118240886 9.220022264540527 14.374975231826733 9.2167969 14.378906 C 9.203897749252851 14.395440083526905 9.19152183070969 14.412375789721528 9.1796875 14.429688 C 9.163695121462382 14.453128137625658 9.148707593404046 14.477238286909984 9.1347656 14.501953 C 9.129414068987154 14.510985090719597 9.124205089977023 14.52010088733099 9.1191406 14.529297 C 9.11305149500169 14.540899382434677 9.107190996801013 14.552620312156492 9.1015625 14.564453 C 9.090952698314844 14.586868215822031 9.081180309627506 14.609670311548122 9.0722656 14.632812 C 9.069605137122602 14.638646485105678 9.067000850013388 14.64450642278157 9.0644531 14.650391 C 9.054973357564174 14.6754312195503 9.046502999858765 14.70084202578484 9.0390625 14.726562 C 9.037015069571225 14.734350790019183 9.03506179375724 14.742164026618191 9.0332031 14.75 C 9.028096648813117 14.768743539543639 9.02353741430429 14.787631887309082 9.0195312 14.806641 C 9.014696685075632 14.83122481020603 9.0107876936991 14.855981611044308 9.0078125 14.880859 C 9.00709758693017 14.88736312068583 9.006446522245097 14.89387410088596 9.0058594 14.900391 C 9.002728318352238 14.928291013573535 9.000773453441377 14.95631049930139 9 14.984375 C 8.999977112932108 14.988281299809705 8.999977112932108 14.992187700190295 9 14.996094 C 8.999997457445831 14.997395998758721 8.999997457445831 14.998698001241278 9 15 L 9 46 C 9.000055217905349 46.55226187620846 9.447738123791542 46.99994478209465 10 47 L 30 47 L 40 47 C 40.55226187620846 46.99994478209465 40.99994478209465 46.55226187620846 41 46 L 41 15 C 41.00036864652495 14.791386143852312 40.93549213358472 14.587878990930875 40.814453 14.417969 L 36 7.6777344 L 36 4 C 35.99994478209465 3.4477381237915408 35.55226187620846 3.0000552179053495 35 3 L 16 3 z M 17 5 L 34 5 L 34 7 L 17 7 L 17 5 z M 16.458984 9 L 33.056641 9 L 29.486328 14 L 12.173828 14 L 16.458984 9 z M 35 9.7226562 L 39 15.320312 L 39 45 L 31 45 L 31 15.322266 L 35 9.7226562 z M 11 16 L 29 16 L 29 45 L 11 45 L 11 16 z M 15 25 C 13.895 25 13 25.895 13 27 C 13 28.105 13.895 29 15 29 C 16.105 29 17 28.105 17 27 C 17 25.895 16.105 25 15 25 z M 25 25 C 23.895 25 23 25.895 23 27 C 23 28.105 23.895 29 25 29 C 26.105 29 27 28.105 27 27 C 27 25.895 26.105 25 25 25 z M 24.023438 31.988281 C 23.693476915987283 31.98302059883501 23.38216098338928 32.14087078856904 23.191406 32.410156 C 23.191406 32.410156 22.015066 34 20 34 C 17.984934 34 16.808594 32.410156 16.808594 32.410156 C 16.482832154020805 31.96358186499532 15.856730135004682 31.865644154020806 15.410156 32.191406 C 14.96358186499532 32.517167845979195 14.865644154020806 33.14326986499532 15.191406 33.589844 C 15.191406 33.589844 16.935066 36 20 36 C 23.064934 36 24.808594 33.589844 24.808594 33.589844 C 25.035156075348077 33.288937593320505 25.07343739593875 32.88625736661905 24.907633487686418 32.5480501763125 C 24.74182957943409 32.20984298600596 24.400065181014337 31.993477738206582 24.023438 31.988281 z" /></g></svg>;
const ICON_DROP = (c: string) => <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.465 31.3984C15.2943 30.8716 14.7301 30.5833 14.2049 30.7545C13.6796 30.9257 13.3922 31.4915 13.5629 32.0183C14.3133 34.3348 15.7757 36.3536 17.7405 37.7853C19.7052 39.217 22.0714 39.9881 24.5 39.9881C25.0523 39.9881 25.5 39.5391 25.5 38.9852C25.5 38.4313 25.0523 37.9822 24.5 37.9822C22.4938 37.9822 20.5391 37.3452 18.916 36.1625C17.293 34.9798 16.0849 33.3121 15.465 31.3984Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M24 4L23.3098 4.66019L23.3061 4.66378L23.2973 4.67225L23.2648 4.70364C23.2367 4.73093 23.1956 4.77088 23.1426 4.82301C23.0366 4.92726 22.8826 5.08027 22.6874 5.27825C22.297 5.67415 21.7417 6.25027 21.0763 6.9763C19.7465 8.42721 17.9719 10.4826 16.1951 12.8995C12.6815 17.6788 9 24.0808 9 30.0801C9 37.845 15.796 44 24 44C32.204 44 39 37.845 39 30.0801C39 24.0808 35.3185 17.6788 31.8049 12.8995C30.0281 10.4826 28.2535 8.42721 26.9237 6.9763C26.2583 6.25027 25.703 5.67415 25.3126 5.27825C25.1174 5.08027 24.9634 4.92726 24.8574 4.82301C24.8044 4.77088 24.7634 4.73093 24.7352 4.70364L24.7027 4.67225L24.6939 4.66378L24 4ZM22.5487 8.3338C23.1353 7.69375 23.6326 7.17503 24 6.8001C24.3674 7.17503 24.8647 7.69375 25.4513 8.3338C26.7465 9.74705 28.4719 11.746 30.1951 14.0899C33.6815 18.8321 37 24.7771 37 30.0801C37 36.5828 31.2599 41.9941 24 41.9941C16.7401 41.9941 11 36.5828 11 30.0801C11 24.7771 14.3185 18.8321 17.8049 14.0899C19.5281 11.746 21.2535 9.74705 22.5487 8.3338Z" fill={c}/></svg>;
const ICON_SHIELD_STAR = (c: string) => <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(0.83 0 0 0.83 12 12)"><path style={{fill: c, strokeLinecap: "round"}} transform="translate(-16, -16)" d="M 16 3.9628906 C 13.75 3.9628906 12.242497 4.8456858 10.884766 5.5839844 C 9.5270341 6.322283 8.2816307 6.9628906 6 6.9628906 L 5 6.9628906 L 5 7.9628906 C 5 15.680746 7.605007 20.701796 10.246094 23.740234 C 12.88718 26.778672 15.626953 27.890625 15.626953 27.890625 L 15.998047 28.039062 L 16.367188 27.892578 C 16.367188 27.892578 19.111702 26.794044 21.753906 23.761719 C 24.39611 20.729394 27 15.707919 27 7.9628906 L 27 6.9628906 L 26 6.9628906 C 23.730806 6.9628906 22.484223 6.3226165 21.123047 5.5839844 C 19.761871 4.8453522 18.25 3.9628906 16 3.9628906 z M 16 5.9628906 C 17.75 5.9628906 18.766848 6.580429 20.169922 7.3417969 C 21.352057 7.9832737 22.911122 8.5887739 24.931641 8.796875 C 24.742901 15.566584 22.504845 19.855009 20.246094 22.447266 C 18.194135 24.802196 16.479735 25.617856 16.001953 25.830078 C 15.522949 25.614625 13.806268 24.788874 11.753906 22.427734 C 9.4944536 19.828347 7.259685 15.539392 7.0703125 8.796875 C 9.0976324 8.5888174 10.659549 7.981657 11.839844 7.3398438 C 13.240613 6.5781424 14.25 5.9628906 16 5.9628906 z M 16 10 L 14.634766 13.117188 L 11.205078 13.482422 L 13.671875 15.677734 L 12.998047 19.074219 L 16 17.341797 L 19.001953 19.074219 L 18.328125 15.677734 L 20.794922 13.482422 L 17.365234 13.117188 L 16 10 z" /></g></svg>;
const ICON_GUT2 = (c: string) => <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M29.5844 22.8731C30.7438 22.8731 31.8763 22.5579 32.8338 21.9687C33.806 22.5568 34.9534 22.8651 36.1242 22.8529L39.8433 21.6331C40.8913 20.8544 41.6107 19.7749 41.8813 18.5754C42.1518 17.3758 41.9569 16.1289 41.3293 15.0433C40.7017 13.9577 39.6794 13.0993 38.4336 12.6118C38.1491 11.4505 37.4326 10.4117 36.4029 9.66789L32.7725 8.5228H32.3638C31.5563 7.46088 30.344 6.70341 28.9574 6.39438L21.1741 6C19.8803 6.09689 18.6603 6.58325 17.7105 7.38081C17.2617 7.28544 16.8023 7.23601 16.3412 7.23346C15.2247 7.23553 14.1327 7.52881 13.1971 8.0779C12.2615 8.62699 11.5222 9.40843 11.0685 10.3279L8.11115 12.216C7.37528 13.1146 6.97913 14.2026 6.98108 15.3194C6.9738 15.7865 7.04266 16.2519 7.18545 16.7009C6.40957 17.6083 5.99236 18.7234 6.00011 19.869C5.99826 21.1976 6.56142 22.4764 7.57375 23.4423C7.65545 24.3935 8.02424 25.3065 8.64022 26.0824C9.2562 26.8583 10.0959 27.4677 11.0685 27.8444C12.1891 28.4776 13.138 29.3292 13.8453 30.3364C14.5527 31.3437 15.0005 32.4811 15.1559 33.6649H22.7915V28.1391C22.7901 27.158 23.0938 26.1962 23.6682 25.3627C24.2425 24.5293 25.0645 23.8576 26.041 23.4238C26.5901 23.2345 26.7252 22.9796 26.8907 22.6673C27.001 22.4592 27.1249 22.2255 27.3937 21.9687C27.6273 22.1124 27.8083 22.2399 27.9652 22.3504C28.4518 22.6929 28.7077 22.8731 29.5844 22.8731ZM34.032 20.3449C34.5652 20.6333 35.18 20.807 35.8225 20.8411L38.8778 19.839C39.4357 19.3535 39.79 18.7515 39.9302 18.1296C40.0877 17.4314 39.9791 16.6979 39.5978 16.0384C39.2129 15.3726 38.5587 14.8026 37.7048 14.4685L36.738 14.0902L36.491 13.0818C36.3463 12.4911 35.9991 11.9204 35.4592 11.4615L32.4646 10.5169H31.3721L30.7718 9.72751C30.296 9.10182 29.5621 8.60824 28.6714 8.3766L21.21 7.99854C20.3583 8.08446 19.584 8.41337 18.9966 8.90662L18.2493 9.5341L17.2948 9.33129C16.9821 9.26484 16.6609 9.22992 16.3376 9.22763C15.5675 9.23033 14.828 9.43391 14.2094 9.79695C13.59 10.1604 13.1326 10.6586 12.862 11.207L12.6151 11.7075L9.48953 13.703C9.14804 14.2036 8.98012 14.7602 8.98108 15.3101L8.98111 15.3274L8.98084 15.3448C8.97696 15.5937 9.01352 15.844 9.09138 16.0889L9.42858 17.1491L8.70555 17.9948C8.22801 18.5533 7.99572 19.2069 8.00006 19.8496L8.00011 19.8577L8.0001 19.8659C7.99906 20.6151 8.31472 21.3791 8.95437 21.9894L9.50169 22.5116L9.56642 23.2653C9.61317 23.8096 9.82528 24.3527 10.2066 24.833C10.5897 25.3156 11.1317 25.7182 11.791 25.9736L11.9261 26.026L12.0524 26.0973C12.1986 26.1799 12.3426 26.2657 12.4843 26.3546L12.4781 26.3592C15.1968 28.0179 16.3504 30.4319 16.742 31.6663H17.354V24.3727L15.1507 22.4142L13.6552 23.9098C13.2647 24.3003 12.6315 24.3003 12.241 23.9098C11.8505 23.5193 11.8505 22.8861 12.241 22.4956L14.0328 20.7037L13.4952 17.7468L11.0593 16.5289C10.5653 16.2819 10.3651 15.6812 10.6121 15.1872C10.8591 14.6933 11.4598 14.493 11.9538 14.74L14.3306 15.9285L17.242 14.0758L16.3365 11.6609C16.1425 11.1438 16.4046 10.5674 16.9217 10.3734C17.4388 10.1795 18.0152 10.4415 18.2091 10.9586L19.1822 13.5535H20.2587L20.7729 12.525L19.9576 10.6225C19.74 10.1149 19.9752 9.527 20.4828 9.30944C20.9904 9.09189 21.5783 9.32704 21.7959 9.83467L22.498 11.4729L25.286 11.9798L25.2975 11.9705L27.0994 10.5289C27.5307 10.1839 28.16 10.2538 28.505 10.6851C28.85 11.1163 28.7801 11.7456 28.3488 12.0906L27.1443 13.0543L28.4794 14.7709L28.9921 13.7457C29.1614 13.4069 29.5077 13.1929 29.8865 13.1929H32.0488C32.6011 13.1929 33.0488 13.6406 33.0488 14.1929C33.0488 14.7452 32.6011 15.1929 32.0488 15.1929H30.5045L30.2364 15.7291L31.9054 16.1C31.9852 16.1178 32.0625 16.1452 32.1357 16.1818L33.5772 16.9026C34.0712 17.1495 34.2714 17.7502 34.0245 18.2442C33.7775 18.7382 33.1768 18.9384 32.6828 18.6914L31.3514 18.0257L28.228 17.3316C28.0009 17.2811 27.7984 17.153 27.6556 16.9694L25.3674 14.0274L22.5941 13.5232C22.5539 13.5563 22.5107 13.5865 22.4648 13.6135L21.8767 14.7895V15.3552H23.0391C23.1943 15.3552 23.3474 15.3914 23.4863 15.4608L26.3694 16.9024C26.8634 17.1494 27.0636 17.75 26.8166 18.244C26.5696 18.738 25.9689 18.9382 25.475 18.6912L22.803 17.3552H21.8767V18.8782C21.8767 19.4304 21.429 19.8782 20.8767 19.8782C20.3244 19.8782 19.8767 19.4304 19.8767 18.8782V16.3629L19.8767 16.3552L19.8767 16.3476V15.5535H18.6452L15.4938 17.5589L16.0326 20.5223L19.0184 23.1762C19.2318 23.366 19.354 23.638 19.354 23.9236V31.6663H20.7916V28.1003C20.7916 25.3985 22.3008 23.7402 23.1251 22.9551C23.7844 22.327 24.7748 21.7975 25.1876 21.6113C25.2696 21.4277 25.5493 20.9512 26.0118 20.5137C26.4743 20.0762 26.9545 19.6205 27.1368 19.4473C28.3747 20.1548 29.336 20.8652 29.336 20.8652C29.336 20.8652 30.6172 20.7949 31.1993 20.5606C31.6649 20.3731 32.4766 19.8522 32.8243 19.6152L34.032 20.3449Z" fill={c}/><path d="M15 38H23V36H15V38Z" fill={c}/><path d="M23 42H15V40H23V42Z" fill={c}/></svg>;


// ─── Product data ─────────────────────────────────────────────────────────────
type NutritionRow = { label: string; unit: string; per100gPulver: string; per100mlUtblandet: string };

type ManufacturerId = "nutricia" | "nestle" | "mead";

type Product = {
  id: string;
  manufacturer: ManufacturerId;
  name: string;
  age: string;
  tagline: string;
  description: string;
  image?: string;
  /** Beskåret miniatyr til produktvelgeren, slik at alle bokser får lik størrelse. */
  thumb?: string;
  imageScale?: number;
  type: "Hydrolysert" | "Aminosyrebasert";
  badges: { label: string; color: string; icon: "drop" | "shield" | "gut" | "star" }[];
  summary: { label: string; value: string }[];
  fordeler: string[];
  fordelerIcons: ((c: string) => React.ReactNode)[];
  bruksomraader: string[];
  fodmap: { laktose: string; gos: boolean; fos: boolean };
  hurtiginfo: { label: string; icon: React.ReactNode }[];
  viktigAVite: string[];
  nutrition: {
    headers: string[];
    rows: NutritionRow[];
    sections: { title: string; rows: NutritionRow[] }[];
  };
  kcalPer100ml: number;
  pulverPer100ml: string;
  macros: { label: string; value: number; color: string; amount: string }[];
  nokkel: { label: string; value: string }[];
  tilberedning: string[];
  dosering: string;
  mixingInfo: { konsentrasjon: string; scoopGram: string; anbefaltSkjeer?: number };
  mixingTable: { skjeer: number; pulver: string; vann: number; ferdig: number; energi: number }[];
  doseringTabell?: { tittel: string; kolonner: string[]; rader: string[][] };
  holdbarhet: string;
  ingredienser: string;
  smaksvarianter: string;
  indikasjon: string;
  kontraindikasjon: string;
  forsiktighetsregler: string;
  bestilling: { produktnavn: string; bestillingsnr: string; varenr: string; salgsenhet: string }[];
};

const PEPTICATE_1: Product = {
  id: "pepticate-1",
  manufacturer: "nutricia",
  name: "Pepticate 1",
  age: "0–6 måneder",
  tagline: "Mysebasert, høygradig hydrolysert morsmelkerstatning for barn 0–1 år med kumelkallergi.",
  description: "Ernæringsmessig komplett og hypoallergen.",
  image: "/nutrition/pepticate-1.png",
  thumb: "/nutrition/thumbs/pepticate-1.png",
  type: "Hydrolysert",
  badges: [
    { label: "Hydrolysert",                    color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett 0–1 år", color: "#4ADE80", icon: "shield" },
    { label: "Glutenfri", color: "#4ADE80", icon: "shield" },
    { label: "Med GOS/FOS",                    color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                  color: "#D97706", icon: "drop"   },
    { label: "Med nukleotider",                color: "#A78BFA", icon: "star"   },
  ],
  summary: [
    { label: "Alder",        value: "0–6 mnd" },
    { label: "Energitetthet", value: "0,66 kcal/ml" },
    { label: "Protein",      value: "100% myse (hydrolysert)" },
    { label: "Kostfiber",    value: "GOS/FOS (0,8g/100ml)" },
    { label: "Halal",        value: "Nei" },
    { label: "Laktose",      value: "Ja" },
  ],
  fordeler: [
    "Inneholder en unik, veldokumentert blanding av prebiotiske kostfibre GOS/FOS som støtter tarmfloraen og immunforsvaret.",
    "Inneholder laktose – en viktig energikilde i morsmelk – som gir mild smak og bidrar til opptak av mineraler som kalsium.",
    "Beriket med de langkjedede fettsyrene DHA og ARA som er viktige for utvikling av hjerne og syn.",
    "Tilsatt nukleotider i mengder som tilsvarer morsmelk og som har påvist positive effekter på immunfunksjon.",
  ],
  fordelerIcons: [ICON_GUT, ICON_MILK_BOTTLE, ICON_DROP, ICON_SHIELD_STAR],
  bruksomraader: [
    "Til kostbehandling av spedbarn 0–1 år med kumelkallergi.",
    "Ernæringsmessig komplett for spedbarn 0–1 år og kan brukes som tilskudd til barn over 1 år.",
    "Kan brukes som erstatning for melk ved matlaging og baking.",
  ],
  fodmap: { laktose: "21,1 g", gos: true, fos: true },
  viktigAVite: [
    "Morsmelk er det beste for spedbarn.",
    "Skal brukes etter anbefaling fra lege eller klinisk ernæringsfysiolog, og først etter vurdering av øvrig kostbehandling inklusiv amming.",
    "Tilbered alltid bare ett måltid om gangen.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",               icon: null },
    { label: "Med DHA & ARA",           icon: null },
    { label: "Med nukleotider",         icon: null },
    { label: "Hypoallergen",            icon: null },
    { label: "0–6 mnd",                 icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  kcalPer100ml: 66,
  pulverPer100ml: "13,6 g pulver",
  macros: [
    { label: "Fett (46 E%)",        value: 46, color: "#7C3AED", amount: "3,4 g" },
    { label: "Karbohydrat (43 E%)", value: 43, color: "#F97316", amount: "7,1 g" },
    { label: "Protein (10 E%)",     value: 10, color: "#3B82F6", amount: "1,6 g" },
    { label: "Kostfiber (1 E%)",    value: 1,  color: "#22C55E", amount: "0,5 g" },
  ],
  nokkel: [
    { label: "Laktose",   value: "2,88 g"  },
    { label: "DHA",       value: "16,5 mg" },
    { label: "ARA",       value: "16,5 mg" },
    { label: "Kalsium",   value: "61 mg"   },
    { label: "Jern",      value: "0,54 mg" },
    { label: "Vitamin D", value: "1,7 µg"  },
    { label: "Natrium",   value: "20,8 mg" },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml utblandet (13,6 g pulver)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                       unit: "kJ",  per100gPulver: "2024",     per100mlUtblandet: "276" },
          { label: "Energi (kcal)",                     unit: "kcal", per100gPulver: "484",      per100mlUtblandet: "66" },
          { label: "Fett (46 E%)",                      unit: "g",   per100gPulver: "24,7",     per100mlUtblandet: "3,4" },
          { label: "– hvorav mettede fettsyrer",        unit: "g",   per100gPulver: "11,4",     per100mlUtblandet: "1,6" },
          { label: "– enumettede fettsyrer",            unit: "g",   per100gPulver: "9,1",      per100mlUtblandet: "1,2" },
          { label: "– flerumet. fettsyrer",             unit: "g",   per100gPulver: "4,2",      per100mlUtblandet: "0,6" },
          { label: "– hvorav linolsyre (LA)",           unit: "g",   per100gPulver: "3,3",      per100mlUtblandet: "0,448" },
          { label: "– α-linolensyre (ALA)",             unit: "g",   per100gPulver: "0,40",     per100mlUtblandet: "0,0543" },
          { label: "– arakidonsyre (ARA)",              unit: "mg",  per100gPulver: "120",      per100mlUtblandet: "16,5" },
          { label: "– Dokosaheksaensyre (DHA)",         unit: "mg",  per100gPulver: "120",      per100mlUtblandet: "16,5" },
          { label: "Ratio n6:n3",                       unit: "",    per100gPulver: "6,18:1",   per100mlUtblandet: "6,18:1" },
          { label: "Karbohydrat (43 E%)",               unit: "g",   per100gPulver: "51,8",     per100mlUtblandet: "7,1" },
          { label: "– hvorav sukkerarter",              unit: "g",   per100gPulver: "25,5",     per100mlUtblandet: "3,5" },
          { label: "– laktose",                         unit: "g",   per100gPulver: "21,1",     per100mlUtblandet: "2,88" },
          { label: "Kostfiber (1 E%)",                  unit: "g",   per100gPulver: "4,0",      per100mlUtblandet: "0,5" },
          { label: "– løselige",                        unit: "g",   per100gPulver: "4,0",      per100mlUtblandet: "0,5" },
          { label: "Proteinekv. (10 E%)",               unit: "g",   per100gPulver: "11,6",     per100mlUtblandet: "1,6" },
          { label: "– hydrolysert myse",                unit: "g",   per100gPulver: "11,6",     per100mlUtblandet: "1,6" },
          { label: "Salt",                              unit: "g",   per100gPulver: "0,38",     per100mlUtblandet: "0,05" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg", per100gPulver: "153",   per100mlUtblandet: "20,8" },
          { label: "Kalium",    unit: "mg", per100gPulver: "635",   per100mlUtblandet: "87" },
          { label: "Klorid",    unit: "mg", per100gPulver: "372",   per100mlUtblandet: "51" },
          { label: "Kalsium",   unit: "mg", per100gPulver: "444",   per100mlUtblandet: "61" },
          { label: "Fosfor",    unit: "mg", per100gPulver: "254",   per100mlUtblandet: "35" },
          { label: "Magnesium", unit: "mg", per100gPulver: "37",    per100mlUtblandet: "5,0" },
          { label: "Jern",      unit: "mg", per100gPulver: "4,0",   per100mlUtblandet: "0,54" },
          { label: "Sink",      unit: "mg", per100gPulver: "4,9",   per100mlUtblandet: "0,66" },
          { label: "Kobber",    unit: "mg", per100gPulver: "0,381", per100mlUtblandet: "0,052" },
          { label: "Mangan",    unit: "mg", per100gPulver: "0,057", per100mlUtblandet: "0,008" },
          { label: "Fluorid",   unit: "mg", per100gPulver: "<44",   per100mlUtblandet: "<5,9" },
          { label: "Molybden",  unit: "mg", per100gPulver: "<44",   per100mlUtblandet: "<5,9" },
          { label: "Krom",      unit: "mg", per100gPulver: "<44",   per100mlUtblandet: "<5,9" },
          { label: "Selen",     unit: "µg", per100gPulver: "22",    per100mlUtblandet: "3,0" },
          { label: "Jod",       unit: "µg", per100gPulver: "92",    per100mlUtblandet: "13" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",       unit: "µg",        per100gPulver: "426",       per100mlUtblandet: "58" },
          { label: "Vitamin D",       unit: "µg",        per100gPulver: "12",        per100mlUtblandet: "1,7" },
          { label: "Vitamin E",       unit: "mg (mg TE)", per100gPulver: "10 (8,9)", per100mlUtblandet: "1,4 (1,2)" },
          { label: "Vitamin C",       unit: "mg",         per100gPulver: "67",        per100mlUtblandet: "9,1" },
          { label: "Vitamin K",       unit: "µg",        per100gPulver: "33",        per100mlUtblandet: "4,4" },
          { label: "Tiamin",          unit: "mg",        per100gPulver: "0,49",      per100mlUtblandet: "0,07" },
          { label: "Riboflavin",      unit: "mg",        per100gPulver: "1,0",       per100mlUtblandet: "0,14" },
          { label: "Niacin",          unit: "mg (mg NE)", per100gPulver: "3,12 (6,4)", per100mlUtblandet: "0,426 (0,87)" },
          { label: "Pantotensyre",    unit: "mg",        per100gPulver: "4,2",       per100mlUtblandet: "0,573" },
          { label: "Vitamin B₆",     unit: "mg",        per100gPulver: "0,333",     per100mlUtblandet: "0,045" },
          { label: "Folinsyre",       unit: "µg",        per100gPulver: "64",        per100mlUtblandet: "8,7" },
          { label: "Folat",           unit: "µg",        per100gPulver: "107",       per100mlUtblandet: "15" },
          { label: "Vitamin B₁₂",    unit: "µg",        per100gPulver: "1,2",       per100mlUtblandet: "0,16" },
          { label: "Biotin",          unit: "µg",        per100gPulver: "14",        per100mlUtblandet: "9,1" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "L-karnitin",   unit: "mg",     per100gPulver: "15",  per100mlUtblandet: "2,1" },
          { label: "Kolin",        unit: "mg",     per100gPulver: "160", per100mlUtblandet: "22" },
          { label: "Taurin",       unit: "mg",     per100gPulver: "39",  per100mlUtblandet: "5,3" },
          { label: "Inositol",     unit: "mg",     per100gPulver: "52",  per100mlUtblandet: "7,1" },
          { label: "Nukleotider",  unit: "mg",     per100gPulver: "17",  per100mlUtblandet: "2,3" },
          { label: "Osmolaritet",  unit: "mOsm/l", per100gPulver: "—",   per100mlUtblandet: "250" },
          { label: "Osmolalitet",  unit: "mOsm/kg H₂O", per100gPulver: "—", per100mlUtblandet: "280" },
        ],
      },
    ],
  },
  tilberedning: [
    "Kok opp vann og avkjøl.",
    "Tilsett måleskje med Pepticate iht. utblandingstabell på pakning.",
    "Rist eller visp til pulveret har løst seg opp.",
    "Kan drikkes eller gis som sondeernæring.",
    "Kan brukes som erstatning for melk ved matlaging og baking.",
  ],
  dosering: "Anbefalt konsentrasjon er 13,6 % vekt/volum: for hver måleskje (4,5 g) tilsettes 30 ml vann. Se informasjon om utblanding og tilberedning på pakningen. Doseringen er individuell og skal alltid gjøres i samråd med lege eller klinisk ernæringsfysiolog.",
  mixingInfo: { konsentrasjon: "13,6", scoopGram: "4,5" },
  mixingTable: [
    { skjeer: 1, pulver: "4,5",  vann: 30,  ferdig: 33,  energi: 22  },
    { skjeer: 2, pulver: "9,0",  vann: 60,  ferdig: 66,  energi: 44  },
    { skjeer: 3, pulver: "13,5", vann: 90,  ferdig: 100, energi: 66  },
    { skjeer: 4, pulver: "18,0", vann: 120, ferdig: 132, energi: 87  },
    { skjeer: 5, pulver: "22,5", vann: 150, ferdig: 165, energi: 109 },
  ],
  holdbarhet: "18 måneder fra produksjonsdato. Holdbarhetsdato på pakningen. Tilbered alltid bare ett måltid om gangen. Tilberedt Pepticate som ikke drikkes innen en time skal kastes. Ved sondeernæring er maks hengetid 4 timer. Uåpnet boks oppbevares i romtemperatur. Åpnet boks oppbevares med lokk, på et svalt og tørt sted. Brukes innen 1 måned. Skal ikke oppbevares i kjøleskap.",
  ingredienser: "Myseproteinhydrolysat (fra kumelk), maltodekstrin, vegetabilske oljer (palmeolje, kokosolje, rapsolje, oljesyrerik solsikkeolje, solsikkeolje), galaktooligosakkarider (fra kumelk), kalsiumfosfat, emulgator (sitronsyreestere av mono- og diglyserider av fettsyrer), fruktooligosakkarider, fiskeolje, kaliumklorid, olje fra Mortierella alpina, kolinklorid, kaliumsitrat, natriumklorid, magnesiumklorid, L-tyrosin, L-askorbinsyre, inositol, magnesiumhydrogenfosfat, taurin, natrium-L-askorbat, sinksulfat, L-karnitin, jernsulfat, DL-α-tokoferylacetat, uridin-5'-monofosfatnatriumsalt, cytidin-5'-monofosfat, kalsium-D-pantotenat, adenosin-5'-monofosfat, inosin-5'-monofosfatnatriumsalt, nikotinamid, guanosin-5'-monofosfatnatriumsalt, kobbersulfat, DL-α-tokoferol, retinylpalmitat, riboflavin, tiaminhydroklorid, pyridoksinhydroklorid, mangansulfat, kaliumjodid, pteroylmonoglutaminsyre, retinylacetat, natriumselenitt, fytomenadion, D-biotin, kolekalsiferol, cyanokobalamin. Glutenfri.",
  smaksvarianter: "Nøytral smak.",
  indikasjon: "Til kostbehandling av barn med kumelkallergi. Ernæringsmessig komplett for spedbarn 0–1 år. Kan brukes som tilskudd til barn over 1 år.",
  kontraindikasjon: "Galaktosemi. Intoleranse mot et eller flere av produktets ingredienser.",
  forsiktighetsregler: "Morsmelk er det beste for spedbarn. Pepticate skal brukes etter anbefaling fra lege eller klinisk ernæringsfysiolog, og først etter vurdering av øvrig kostbehandling inklusiv amming.",
  bestilling: [
    { produktnavn: "Pepticate", bestillingsnr: "146902", varenr: "910034", salgsenhet: "1 x 450 g boks" },
  ],
};

const PEPTICATE_PLUS_2: Product = {
  id: "pepticate-plus-2",
  manufacturer: "nutricia",
  name: "Pepticate Plus 2",
  age: "6+ måneder",
  tagline: "Mysebasert, høygradig hydrolysert ernæringsprodukt til spedbarn fra 6 måneder med kumelkallergi.",
  description: "Hypoallergen tilskuddsblanding i pulverform, som er egnet som en del av en balansert kost fra 6 måneders alder. Energitetthet på 0,68 kcal/ml. Tilsatt ingredienser som er en kilde til de langkjedede fettsyrer (ARA/DHA).",
  image: "/nutrition/pepticate-plus-2.png",
  thumb: "/nutrition/thumbs/pepticate-plus-2.png",
  imageScale: 1.3,
  type: "Hydrolysert",
  badges: [
    { label: "Hydrolysert",          color: "#3B82F6", icon: "drop"   },
    { label: "Tilskudd fra 6 mnd",   color: "#4ADE80", icon: "shield" },
    { label: "Glutenfri", color: "#4ADE80", icon: "shield" },
    { label: "Med GOS/FOS",          color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",        color: "#D97706", icon: "drop"   },
  ],
  summary: [
    { label: "Alder",        value: "6+ mnd" },
    { label: "Energitetthet", value: "0,68 kcal/ml" },
    { label: "Protein",      value: "100% myse (hydrolysert)" },
    { label: "Kostfiber",    value: "GOS/FOS (0,6g/100ml)" },
    { label: "Halal",        value: "Nei" },
    { label: "Laktose",      value: "Ja" },
  ],
  fordeler: [
    "Bygger på 30 års forskning på morsmelk og er dokumentert velfungerende for barn med kumelkallergi.",
    "Lukter og smaker mer som en vanlig morsmelkerstatning som gjør at barnet raskt venner seg til smaken og liker produktet.",
    "Tilsatt en unik, veldokumentert blanding av prebiotiske kostfibre GOS/FOS (0,6 g/100 ml) med lignende effekt som kostfiber i morsmelk. Avføringen blir myk og tarmfloraen ligner den hos spedbarn som ammes.",
    "Inneholder laktose, som er en viktig energikilde i morsmelk og bidrar til en mild smak, samt til opptak av enkelte mineraler som f.eks. kalsium.",
    "Langkjedede fettsyrer dokosaheksaensyre (DHA) og arakidonsyre (ARA) spiller en viktig rolle for hjernen og synets utvikling.",
  ],
  fordelerIcons: [ICON_MICROSCOPE, ICON_GUT, ICON_MILK_BOTTLE, ICON_DROP, ICON_GUT2],
  bruksomraader: [
    "Til kostbehandling av spedbarn og barn fra 6 måneders alder med kumelkallergi.",
    "Benyttes som supplement til en balansert kost.",
    "Kan brukes som erstatning for melk ved matlaging og baking.",
  ],
  fodmap: { laktose: "20,6 g", gos: true, fos: true },
  viktigAVite: [
    "Morsmelk er det beste for spedbarn.",
    "Skal ikke brukes til spedbarn under 6 måneders alder.",
    "Ikke egnet til bruk som eneste næringskilde.",
    "Skal brukes etter anbefaling fra lege eller klinisk ernæringsfysiolog, og først etter vurdering av øvrig kostbehandling inklusiv amming.",
    "Tilbered alltid bare ett måltid om gangen.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",         icon: null },
    { label: "Med DHA & ARA",     icon: null },
    { label: "Hypoallergen",      icon: null },
    { label: "6+ mnd",            icon: null },
    { label: "Tilskuddsblanding", icon: null },
  ],
  kcalPer100ml: 68,
  pulverPer100ml: "14,3 g pulver",
  macros: [
    { label: "Fett (43 E%)",        value: 43, color: "#7C3AED", amount: "3,2 g" },
    { label: "Karbohydrat (46 E%)", value: 46, color: "#F97316", amount: "7,8 g" },
    { label: "Protein (9 E%)",      value: 9,  color: "#3B82F6", amount: "1,6 g" },
    { label: "Kostfiber (2 E%)",    value: 2,  color: "#22C55E", amount: "0,6 g" },
  ],
  nokkel: [
    { label: "Laktose",   value: "2,98 g"  },
    { label: "DHA",       value: "17,0 mg" },
    { label: "ARA",       value: "17,0 mg" },
    { label: "Kalsium",   value: "79 mg"   },
    { label: "Jern",      value: "1,0 mg"  },
    { label: "Vitamin D", value: "1,7 µg"  },
    { label: "Natrium",   value: "22,0 mg" },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml utblandet (14,3 g pulver)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                  unit: "kJ",   per100gPulver: "1974",     per100mlUtblandet: "285" },
          { label: "Energi (kcal)",                unit: "kcal", per100gPulver: "471",      per100mlUtblandet: "68" },
          { label: "Fett (43 E%)",                 unit: "g",    per100gPulver: "22,3",     per100mlUtblandet: "3,2" },
          { label: "– hvorav mettede fettsyrer",   unit: "g",    per100gPulver: "10,3",     per100mlUtblandet: "1,5" },
          { label: "– enumettede fettsyrer",       unit: "g",    per100gPulver: "8,2",      per100mlUtblandet: "1,2" },
          { label: "– flerumet. fettsyrer",        unit: "g",    per100gPulver: "3,8",      per100mlUtblandet: "0,5" },
          { label: "– hvorav linolsyre (LA)",      unit: "g",    per100gPulver: "3,0",      per100mlUtblandet: "0,428" },
          { label: "– α-linolensyre (ALA)",        unit: "g",    per100gPulver: "0,36",     per100mlUtblandet: "0,0519" },
          { label: "– arakidonsyre (ARA)",         unit: "mg",   per100gPulver: "120",      per100mlUtblandet: "17,0" },
          { label: "– Dokosaheksaensyre (DHA)",    unit: "mg",   per100gPulver: "120",      per100mlUtblandet: "17,0" },
          { label: "Ratio n6:n3",                  unit: "",     per100gPulver: "6,50:1",   per100mlUtblandet: "6,50:1" },
          { label: "Karbohydrat (46 E%)",          unit: "g",    per100gPulver: "54,3",     per100mlUtblandet: "7,8" },
          { label: "– hvorav sukkerarter",         unit: "g",    per100gPulver: "25,2",     per100mlUtblandet: "3,6" },
          { label: "– laktose",                    unit: "g",    per100gPulver: "20,6",     per100mlUtblandet: "2,98" },
          { label: "Kostfiber (2 E%)",             unit: "g",    per100gPulver: "3,9",      per100mlUtblandet: "0,6" },
          { label: "– løselige",                   unit: "g",    per100gPulver: "3,9",      per100mlUtblandet: "0,6" },
          { label: "– uløselige",                  unit: "g",    per100gPulver: "0",        per100mlUtblandet: "0" },
          { label: "Protein (9 E%)",               unit: "g",    per100gPulver: "11,4",     per100mlUtblandet: "1,6" },
          { label: "Salt",                         unit: "g",    per100gPulver: "0,38",     per100mlUtblandet: "0,06" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg",  per100gPulver: "153",   per100mlUtblandet: "22,0" },
          { label: "Kalium",    unit: "mg",  per100gPulver: "621",   per100mlUtblandet: "90" },
          { label: "Klorid",    unit: "mg",  per100gPulver: "364",   per100mlUtblandet: "53" },
          { label: "Kalsium",   unit: "mg",  per100gPulver: "546",   per100mlUtblandet: "79" },
          { label: "Fosfor",    unit: "mg",  per100gPulver: "342",   per100mlUtblandet: "49" },
          { label: "Magnesium", unit: "mg",  per100gPulver: "52",    per100mlUtblandet: "7,6" },
          { label: "Jern",      unit: "mg",  per100gPulver: "7,1",   per100mlUtblandet: "1,0" },
          { label: "Sink",      unit: "mg",  per100gPulver: "4,7",   per100mlUtblandet: "0,68" },
          { label: "Kobber",    unit: "mg",  per100gPulver: "0,369", per100mlUtblandet: "0,053" },
          { label: "Mangan",    unit: "mg",  per100gPulver: "0,046", per100mlUtblandet: "0,007" },
          { label: "Fluorid",   unit: "µg",  per100gPulver: "<42",   per100mlUtblandet: "<6,1" },
          { label: "Molybden",  unit: "µg",  per100gPulver: "<42",   per100mlUtblandet: "<6,1" },
          { label: "Krom",      unit: "µg",  per100gPulver: "<42",   per100mlUtblandet: "<6,1" },
          { label: "Selen",     unit: "µg",  per100gPulver: "22",    per100mlUtblandet: "3,1" },
          { label: "Jod",       unit: "µg",  per100gPulver: "90",    per100mlUtblandet: "13" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg",          per100gPulver: "416",        per100mlUtblandet: "60" },
          { label: "Vitamin D",    unit: "µg",          per100gPulver: "12",         per100mlUtblandet: "1,7" },
          { label: "Vitamin E",    unit: "mg (mg α-TE)", per100gPulver: "9,5 (8,2)", per100mlUtblandet: "1,4 (1,2)" },
          { label: "Vitamin C",    unit: "mg",          per100gPulver: "59",         per100mlUtblandet: "8,5" },
          { label: "Vitamin K",    unit: "µg",          per100gPulver: "31",         per100mlUtblandet: "4,5" },
          { label: "Tiamin",       unit: "mg",          per100gPulver: "0,45",       per100mlUtblandet: "0,07" },
          { label: "Riboflavin",   unit: "mg",          per100gPulver: "0,99",       per100mlUtblandet: "0,14" },
          { label: "Niacin",       unit: "mg (mg NE)",  per100gPulver: "3,165 (6,4)", per100mlUtblandet: "0,457 (0,92)" },
          { label: "Pantotensyre", unit: "mg",          per100gPulver: "3,857",      per100mlUtblandet: "0,557" },
          { label: "Vitamin B₆",  unit: "µg",          per100gPulver: "305",        per100mlUtblandet: "44" },
          { label: "Folinsyre",    unit: "µg",          per100gPulver: "59",         per100mlUtblandet: "8,5" },
          { label: "Folat",        unit: "µg",          per100gPulver: "98",         per100mlUtblandet: "14" },
          { label: "Vitamin B₁₂", unit: "µg",          per100gPulver: "1,1",        per100mlUtblandet: "0,16" },
          { label: "Biotin",       unit: "µg",          per100gPulver: "13",         per100mlUtblandet: "1,8" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "L-karnitin",  unit: "mg",           per100gPulver: "14",  per100mlUtblandet: "2,0" },
          { label: "Kolin",       unit: "mg",           per100gPulver: "103", per100mlUtblandet: "15" },
          { label: "Taurin",      unit: "mg",           per100gPulver: "35",  per100mlUtblandet: "5,1" },
          { label: "Inositol",    unit: "mg",           per100gPulver: "48",  per100mlUtblandet: "7,0" },
          { label: "Osmolaritet", unit: "mOsm/l",       per100gPulver: "—",   per100mlUtblandet: "260" },
          { label: "Osmolalitet", unit: "mOsm/kg H₂O", per100gPulver: "—",   per100mlUtblandet: "300" },
        ],
      },
    ],
  },
  tilberedning: [
    "Kok opp vann og avkjøl.",
    "Tilsett måleskje med Pepticate PLUS iht. utblandingstabell på pakning.",
    "Rist eller visp til pulveret har løst seg opp.",
    "Kan drikkes eller gis som sondeernæring.",
    "Kan brukes som erstatning for melk ved matlaging og baking.",
  ],
  dosering: "Anbefalt konsentrasjon er 14,3 % vekt/volum: for hver måleskje (4,8 g) tilsettes 30 ml vann. Se informasjon om utblanding og tilberedning på pakning. Doseringen er individuell og skal alltid gjøres i samråd med lege eller klinisk ernæringsfysiolog.",
  mixingInfo: { konsentrasjon: "14,3", scoopGram: "4,8" },
  mixingTable: [
    { skjeer: 1, pulver: "4,8",  vann: 30,  ferdig: 34,  energi: 23  },
    { skjeer: 2, pulver: "9,6",  vann: 60,  ferdig: 67,  energi: 46  },
    { skjeer: 3, pulver: "14,4", vann: 90,  ferdig: 101, energi: 69  },
    { skjeer: 4, pulver: "19,2", vann: 120, ferdig: 134, energi: 91  },
    { skjeer: 5, pulver: "24,0", vann: 150, ferdig: 168, energi: 114 },
  ],
  holdbarhet: "18 måneder fra produksjonsdato. Holdbarhetsdato på pakningen. Tilbered alltid bare ett måltid om gangen. Rester etter tilberedt Pepticate PLUS som ikke brukes innen en time skal kastes. Ved sondemating er maks hengetid 4 timer. Uåpnet boks oppbevares i romtemperatur. Åpnet boks oppbevares med lokk, på et svalt og tørt sted. Brukes innen 1 måned. Skal ikke oppbevares i kjøleskap.",
  ingredienser: "Maltodekstrin, myseproteinhydrolysat (fra kumelk), vegetabilske oljer (palmeolje, kokosolje, rapsolje, oljesyrerik solsikkeolje, solsikkeolje), galaktooligosakkarider (fra kumelk), kalsiumfosfat, emulgator (E472c), fruktooligosakkarider, fiskeolje, kaliumklorid, magnesiumhydrogenfosfat, olje fra Mortierella alpina, natriumklorid, kolinklorid, L-tyrosin, L-askorbinsyre, inositol, taurin, natrium-L-askorbat, jernsulfat, sinksulfat, L-karnitin, natriumsitrat, DL-α-tokoferylacetat, uridin-5'-monofosfatnatriumsalt, cytidin-5'-monofosfat, kalsium-D-pantotenat, adenosin-5'-monofosfat, inosin-5'-monofosfatnatriumsalt, nikotinamid, guanosin-5'-monofosfatnatriumsalt, kobbersulfat, DL-α-tokoferol, retinylpalmitat, riboflavin, tiaminhydroklorid, pyridoksinhydroklorid, kaliumjodid, pteroylmonoglutaminsyre, mangansulfat, retinylacetat, natriumselenitt, fytomenadion, D-biotin, kolekalsiferol, cyanokobalamin. Glutenfri.",
  smaksvarianter: "Nøytral smak.",
  indikasjon: "Til kostbehandling av barn med kumelkallergi. Tilskuddsblanding i pulverform. Ikke egnet til bruk som eneste næringskilde. Egnet som en del av en balansert kost fra 6 måneders alder.",
  kontraindikasjon: "Galaktosemi. Intoleranse mot en eller flere av produktets ingredienser. Spedbarn < 6 måneders alder.",
  forsiktighetsregler: "Morsmelk er det beste for spedbarn. Pepticate PLUS skal brukes etter anbefaling fra lege eller klinisk ernæringsfysiolog, og først etter vurdering av øvrig kostbehandling inklusiv amming.",
  bestilling: [
    { produktnavn: "Pepticate PLUS 2", bestillingsnr: "146180", varenr: "897401", salgsenhet: "1 x 450 g boks" },
  ],
};

const NEOCATE_LCP: Product = {
  id: "neocate-lcp",
  manufacturer: "nutricia",
  name: "Neocate LCP",
  age: "0–1 år",
  tagline: "Aminosyrebasert melkeerstatning for spedbarn med kumelkallergi og multimatvareallergi.",
  description: "Ernæringsmessig komplett næringsprodukt i pulverform. Hypoallergen, laktosefri og egnet som eneste næringskilde.",
  image: "/nutrition/Neocate-LCP-400-g-752x960.png",
  thumb: "/nutrition/thumbs/neocate-lcp.png",
  imageScale: 0.9,
  type: "Aminosyrebasert",
  badges: [
    { label: "Aminosyrebasert",                 color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett 0–1 år", color: "#4ADE80", icon: "shield" },
    { label: "Glutenfri", color: "#4ADE80", icon: "shield" },
    { label: "Laktosefri",                      color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                   color: "#D97706", icon: "drop"   },
    { label: "Med nukleotider",                 color: "#A78BFA", icon: "star"   },
    { label: "Halalsertifisert",                color: "#D97706", icon: "star"   },
    { label: "Koshersertifisert",               color: "#D97706", icon: "star"   },
  ],
  summary: [
    { label: "Alder",         value: "0–1 år" },
    { label: "Energitetthet", value: "0,67 kcal/ml" },
    { label: "Protein",       value: "Frie aminosyrer" },
    { label: "Kostfiber",     value: "Ikke tilsatt" },
    { label: "Halal",         value: "Ja" },
    { label: "Laktose",       value: "Nei" },
  ],
  fordeler: [
    "Inneholder alle næringsstoffer et spedbarn trenger og kan brukes som eneste ernæringskilde.",
    "Hypoallergen sammensetning basert på frie aminosyrer gir svært lav risiko for allergisk reaksjon.",
    "Beriket med langkjedede fettsyrer DHA og ARA som er viktige for utvikling av hjerne- og synsfunksjon.",
    "Beriket med nukleotider som har påvist positive effekter på spedbarns immunfunksjon og i perioder med rask vekst, som tidlig spedbarnsalder.",
  ],
  fordelerIcons: [ICON_MILK_BOTTLE, ICON_SHIELD_STAR, ICON_DROP, ICON_GUT2],
  bruksomraader: [
    "Til kostbehandling av spedbarn 0–1 år med kumelkallergi, multimatvareallergi og andre indikasjoner hvor elementalkost er anbefalt.",
    "Aminosyrene gjør at produktet er lettfordøyelig og egner seg godt til spedbarn med sykdom i mage- og tarmkanalen.",
  ],
  fodmap: { laktose: "0 g", gos: false, fos: false },
  viktigAVite: [
    "Morsmelk er det beste for spedbarn.",
    "Egnet som eneste næringskilde for spedbarn under ett år etter nøye vurdering av alle former for næringstilførsel, inkludert amming.",
    "Ikke for parenteralt bruk.",
    "Serumnivåer av mikronæringsstoffer, spesielt fosfat, bør monitoreres rutinemessig når Neocate brukes som primær eller eneste næringskilde for pasienter med kompleks systemisk sykdom som involverer flere diagnoser og tarmsykdom.",
    "Tilbered alltid bare ett måltid om gangen.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",                icon: null },
    { label: "Laktosefri",               icon: null },
    { label: "Med DHA & ARA",            icon: null },
    { label: "Med nukleotider",          icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  kcalPer100ml: 67,
  pulverPer100ml: "13,5 g pulver",
  macros: [
    { label: "Fett (47 E%)",        value: 47, color: "#7C3AED", amount: "3,5 g" },
    { label: "Karbohydrat (42 E%)", value: 42, color: "#F97316", amount: "7,1 g" },
    { label: "Protein (11 E%)",     value: 11, color: "#3B82F6", amount: "1,8 g" },
    { label: "Kostfiber (0 E%)",    value: 0,  color: "#22C55E", amount: "0 g" },
  ],
  nokkel: [
    { label: "Laktose",   value: "0 g"      },
    { label: "DHA",       value: "16,6 mg"  },
    { label: "ARA",       value: "17,0 mg"  },
    { label: "Kalsium",   value: "78,3 mg"  },
    { label: "Jern",      value: "1,0 mg"   },
    { label: "Vitamin D", value: "1,59 µg"  },
    { label: "Natrium",   value: "28,6 mg"  },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml utblandet (13,5 g pulver)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                    unit: "kJ",   per100gPulver: "2065",      per100mlUtblandet: "279" },
          { label: "Energi (kcal)",                  unit: "kcal", per100gPulver: "493",       per100mlUtblandet: "67" },
          { label: "Fett (47 E%)",                   unit: "g",    per100gPulver: "25,6",      per100mlUtblandet: "3,5" },
          { label: "– hvorav mettede fettsyrer",     unit: "g",    per100gPulver: "10,1",      per100mlUtblandet: "1,4" },
          { label: "– enumettede fettsyrer",         unit: "g",    per100gPulver: "11,4",      per100mlUtblandet: "1,5" },
          { label: "– flerumettede fettsyrer",       unit: "g",    per100gPulver: "4,1",       per100mlUtblandet: "0,56" },
          { label: "– linolsyre (LA)",               unit: "g",    per100gPulver: "3,33",      per100mlUtblandet: "0,450" },
          { label: "– α-linolensyre (ALA)",          unit: "g",    per100gPulver: "0,33",      per100mlUtblandet: "0,0445" },
          { label: "– arakidonsyre (ARA)",           unit: "mg",   per100gPulver: "130",       per100mlUtblandet: "17,0" },
          { label: "– dokosaheksaensyre (DHA)",      unit: "mg",   per100gPulver: "120",       per100mlUtblandet: "16,6" },
          { label: "– ratio n-6:n-3",                unit: "",     per100gPulver: "7,3:1",     per100mlUtblandet: "7,3:1" },
          { label: "Karbohydrat (42 E%)",            unit: "g",    per100gPulver: "52,7",      per100mlUtblandet: "7,1" },
          { label: "– hvorav sukkerarter",           unit: "g",    per100gPulver: "4,6",       per100mlUtblandet: "0,62" },
          { label: "– laktose",                      unit: "g",    per100gPulver: "-",         per100mlUtblandet: "-" },
          { label: "Kostfiber (0 E%)",               unit: "g",    per100gPulver: "-",         per100mlUtblandet: "-" },
          { label: "Protein (11 E%)",                unit: "g",    per100gPulver: "13,3",      per100mlUtblandet: "1,8" },
          { label: "Salt",                           unit: "g",    per100gPulver: "0,53",      per100mlUtblandet: "0,07" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",    unit: "mg", per100gPulver: "212",       per100mlUtblandet: "28,6" },
          { label: "Kalium",     unit: "mg", per100gPulver: "536",       per100mlUtblandet: "72,4" },
          { label: "Klorid",     unit: "mg", per100gPulver: "386",       per100mlUtblandet: "52,1" },
          { label: "Kalsium",    unit: "mg", per100gPulver: "580",       per100mlUtblandet: "78,3" },
          { label: "Fosfor",     unit: "mg", per100gPulver: "370",       per100mlUtblandet: "49,9" },
          { label: "Magnesium",  unit: "mg", per100gPulver: "52,0",      per100mlUtblandet: "7,02" },
          { label: "Jern",       unit: "mg", per100gPulver: "7,39",      per100mlUtblandet: "1,00" },
          { label: "Sink",       unit: "mg", per100gPulver: "5,42",      per100mlUtblandet: "0,73" },
          { label: "Kobber",     unit: "mg", per100gPulver: "0,42",      per100mlUtblandet: "0,057" },
          { label: "Mangan",     unit: "mg", per100gPulver: "0,049",     per100mlUtblandet: "0,007" },
          { label: "Molybden",   unit: "µg", per100gPulver: "11,3",      per100mlUtblandet: "1,53" },
          { label: "Fluorid",    unit: "µg", per100gPulver: "<44,4",     per100mlUtblandet: "<5,99" },
          { label: "Selen",      unit: "µg", per100gPulver: "18,7",      per100mlUtblandet: "2,53" },
          { label: "Krom",       unit: "µg", per100gPulver: "10,8",      per100mlUtblandet: "1,46" },
          { label: "Jod",        unit: "µg", per100gPulver: "103",       per100mlUtblandet: "14,0" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",      unit: "µg",         per100gPulver: "431",           per100mlUtblandet: "58,2" },
          { label: "Vitamin D",      unit: "µg",         per100gPulver: "11,8",          per100mlUtblandet: "1,59" },
          { label: "Vitamin E",      unit: "mg (mg α-TE)", per100gPulver: "11,0 (9,85)", per100mlUtblandet: "1,49 (1,33)" },
          { label: "Vitamin C",      unit: "mg",         per100gPulver: "52,7",          per100mlUtblandet: "7,11" },
          { label: "Vitamin K",      unit: "µg",         per100gPulver: "44,7",          per100mlUtblandet: "6,03" },
          { label: "Tiamin",         unit: "mg",         per100gPulver: "0,59",          per100mlUtblandet: "0,08" },
          { label: "Riboflavin",     unit: "mg",         per100gPulver: "0,59",          per100mlUtblandet: "0,08" },
          { label: "Niacin",         unit: "mg (mg NE)", per100gPulver: "4,09 (9,41)",   per100mlUtblandet: "0,55 (1,27)" },
          { label: "Pantotensyre",   unit: "mg",         per100gPulver: "3,05",          per100mlUtblandet: "0,41" },
          { label: "Vitamin B6",     unit: "mg",         per100gPulver: "0,48",          per100mlUtblandet: "0,06" },
          { label: "Folsyre",        unit: "µg",         per100gPulver: "68,5",          per100mlUtblandet: "9,24" },
          { label: "Folat",          unit: "µg",         per100gPulver: "116",           per100mlUtblandet: "15,7" },
          { label: "Vitamin B12",    unit: "µg",         per100gPulver: "1,38",          per100mlUtblandet: "0,19" },
          { label: "Biotin",         unit: "µg",         per100gPulver: "19,2",          per100mlUtblandet: "2,59" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "Kolin",        unit: "mg",            per100gPulver: "137",  per100mlUtblandet: "18,5" },
          { label: "Inositol",     unit: "mg",            per100gPulver: "110",  per100mlUtblandet: "14,9" },
          { label: "L-karnitin",   unit: "mg",            per100gPulver: "10,8", per100mlUtblandet: "1,46" },
          { label: "Taurin",       unit: "mg",            per100gPulver: "32,0", per100mlUtblandet: "4,32" },
          { label: "Nukleotider",  unit: "mg",            per100gPulver: "17,2", per100mlUtblandet: "2,33" },
          { label: "Osmolaritet",  unit: "mOsm/l",        per100gPulver: "—",    per100mlUtblandet: "310" },
          { label: "Osmolalitet",  unit: "mOsm/kg H₂O",   per100gPulver: "—",    per100mlUtblandet: "340" },
        ],
      },
    ],
  },
  tilberedning: [
    "Kok opp vann og avkjøl.",
    "Tilsett måleskje med Neocate LCP i henhold til utblandingstabell på pakningen.",
    "Rist eller visp til pulveret har løst seg opp.",
    "Kan drikkes fra tåteflaske, kopp eller glass, eller gis som sondeernæring.",
    "Kan brukes som erstatning for melk ved matlaging og baking.",
  ],
  dosering: "Egnet som eneste næringskilde. Doseringen er individuell og skal bestemmes i samråd med lege eller klinisk ernæringsfysiolog.",
  mixingInfo: { konsentrasjon: "13,5", scoopGram: "4,5" },
  mixingTable: [
    { skjeer: 3, pulver: "13,5", vann: 90,  ferdig: 100, energi: 67  },
    { skjeer: 4, pulver: "18,0", vann: 120, ferdig: 133, energi: 89  },
    { skjeer: 6, pulver: "27,0", vann: 180, ferdig: 200, energi: 134 },
    { skjeer: 7, pulver: "31,5", vann: 210, ferdig: 233, energi: 156 },
    { skjeer: 8, pulver: "36,0", vann: 240, ferdig: 267, energi: 179 },
  ],
  holdbarhet: "18 måneder fra produksjonsdato. Holdbarhetsdato på pakningen. Tilbered alltid bare ett måltid om gangen. Kast blanding som er oppvarmet eller blir til overs. Ved sondemating er maks hengetid 4 timer. Uåpnet boks oppbevares i romtemperatur. Åpnet boks oppbevares med lokk, på et svalt og tørt sted. Brukes innen 1 måned.",
  ingredienser: "Tørket glukosesirup, raffinerte vegetabilske oljer (oljesyrerik solsikkeolje, kokosolje, rapsolje, solsikkeolje), L-arginin-L-aspartat, L-leucin, L-lysinacetat, L-glutamin, L-prolin, emulgator (E472c), L-valin, glysin, L-isoleucin, dikaliumhydrogenfosfat, L-treonin, L-fenylalanin, L-tyrosin, L-serin, L-histidin, L-alanin, kalsiumhydrogenfosfat, trikaliumsitrat, natriumklorid, kalsiumkarbonat, L-cystin, kolinbitartrat, kalsiumglycerofosfat, L-tryptofan, kalsiumsitrat, magnesiumklorid, L-metionin, kalsiumfosfat tribasisk, olje fra Mortierella alpina, olje fra mikroalgen Schizochytrium sp., magnesium-L-aspartat, inositol, L-askorbinsyre, antioksidanter (solsikkelecitin, askorbylpalmitat), taurin, jernsulfat, sinksulfat, L-karnitin, DL-α-tokoferylacetat, uridin 5'-monofosfatnatriumsalt, cytidin 5'-monofosfat, nikotinamid, kalsium-D-pantotenat, inosin-5'-monofosfatnatriumsalt, adenosin 5'-monofosfat, guanosin-5'-monofosfatnatriumsalt, kobbersulfat, tiaminmononitrat, riboflavin, pyridoksinhydroklorid, retinylacetat, kaliumjodid, mangansulfat, pteroylmonoglutaminsyre, fytomenadion, natriumselenitt, kromklorid, natriummolybdat, D-biotin, kolekalsiferol, cyanokobalamin. Glutenfri. Laktosefri. Fri for sukrose og fruktose. Kostfiberfri. Halal- og koshersertifisert.",
  smaksvarianter: "Nøytral smak.",
  indikasjon: "Til kostbehandling av spedbarn 0–1 år med kumelkallergi, multimatvareallergi og andre tilstander hvor elementalkost er anbefalt, f.eks. gastroøsofagal refluks, eosinofil øsofagitt, kort tarm-syndrom, malabsorpsjonstilstander og ved overgang fra parenteral til enteral ernæring.",
  kontraindikasjon: "Intoleranse mot ett eller flere av produktets ingredienser.",
  forsiktighetsregler: "Morsmelk er det beste for spedbarn. Egnet som eneste næringskilde for spedbarn under ett år etter nøye vurdering av alle former for næringstilførsel, inkludert amming. Ikke for parenteralt bruk.",
  bestilling: [
    { produktnavn: "Neocate LCP, nøytral smak", bestillingsnr: "201773", varenr: "840659", salgsenhet: "400 g boks" },
  ],
};

const NEOCATE_SPOON: Product = {
  id: "neocate-spoon",
  manufacturer: "nutricia",
  name: "Neocate Spoon",
  age: "6+ måneder",
  tagline: "Aminosyrebasert næringstilskudd for barn med kumelkallergi og multimatvareallergi. Glutenfri. Laktosefri.",
  description: "Aminosyrebasert næringstilskudd i pulverform. Hypoallergen. Energitetthet 1,75 kcal/ml. Egnet for barn som tilvennes fast føde. Skal ikke brukes som eneste næringskilde.",
  image: "/nutrition/Nutricia-Neocate-Spoon.png",
  thumb: "/nutrition/thumbs/neocate-spoon.png",
  imageScale: 1.08,
  type: "Aminosyrebasert",
  badges: [
    { label: "Aminosyrebasert",         color: "#3B82F6", icon: "drop"   },
    { label: "Laktosefri",              color: "#EA580C", icon: "gut"    },
    { label: "Glutenfri",               color: "#4ADE80", icon: "shield" },
    { label: "Halalsertifisert",     color: "#D97706", icon: "star" },
  ],
  summary: [
    { label: "Alder",         value: "6+ måneder" },
    { label: "Energitetthet", value: "1,75 kcal/ml" },
    { label: "Protein",       value: "Enkle aminosyrer" },
    { label: "Kostfiber",     value: "Ikke tilsatt" },
    { label: "Halal",         value: "Ja" },
    { label: "Laktose",       value: "Nei" },
  ],
  fordeler: [
    "Hypoallergen og basert på frie aminosyrer som gir svært lav risiko for allergisk reaksjon.",
    "Én porsjon Neocate Spoon inneholder 265 mg kalsium, som gjør det enklere å møte det eldre barnets kalsiumbehov.",
    "Får en passende konsistens for skje når det blandes med vann, og er velegnet for kumelkallergiske barn som skal tilvennes fast føde.",
  ],
  fordelerIcons: [ICON_SHIELD_STAR, ICON_DROP, ICON_MILK_BOTTLE],
  bruksomraader: [
    "Til kostbehandling av barn og spedbarn fra 6 måneders alder med kumelkallergi, multimatvareallergi og andre indikasjoner hvor elementalkost er anbefalt.",
    "Aminosyrene gjør at produktet er lettfordøyelig og egner seg godt til barn med sykdom i mage- og tarmkanalen.",
  ],
  fodmap: { laktose: "0 g", gos: false, fos: false },
  viktigAVite: [
    "Ikke egnet til bruk som eneste næringskilde.",
    "Ikke egnet til flaske eller sondeernæring.",
    "Gis til spedbarn i tillegg til morsmelk eller annen ernæringsmessig komplett hypoallergen morsmelkerstatning.",
    "Har et høyt innhold av kalsium og jern og er en kilde til vitamin D.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",                icon: null },
    { label: "Laktosefri",               icon: null },
    { label: "Halalsertifisert",         icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Ikke eneste næringskilde", icon: null },
  ],
  kcalPer100ml: 175,
  pulverPer100ml: "37 g pulver",
  macros: [
    { label: "Fett (36 E%)",              value: 36, color: "#7C3AED", amount: "7,0 g" },
    { label: "Karbohydrat (57 E%)",       value: 57, color: "#F97316", amount: "24,9 g" },
    { label: "Proteinekvivalenter (7 E%)", value: 7, color: "#3B82F6", amount: "3,0 g" },
    { label: "Kostfiber (0 E%)",          value: 0,  color: "#22C55E", amount: "0 g" },
  ],
  nokkel: [
    { label: "Laktose",   value: "0 g"      },
    { label: "Kalsium",   value: "265 mg"   },
    { label: "Jern",      value: "2,4 mg"   },
    { label: "Vitamin D", value: "1,6 µg"   },
    { label: "Natrium",   value: "15,5 mg"  },
    { label: "Sink",      value: "1,7 mg"   },
    { label: "Vitamin A", value: "72,2 µg"  },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml* ferdig løsning (37 g pulver)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                  unit: "kJ",   per100gPulver: "1981",     per100mlUtblandet: "733" },
          { label: "Energi (kcal)",                unit: "kcal", per100gPulver: "472",      per100mlUtblandet: "175" },
          { label: "Fett (36 E%)",                 unit: "g",    per100gPulver: "18,8",     per100mlUtblandet: "7,0" },
          { label: "– hvorav mettede fettsyrer",   unit: "g",    per100gPulver: "6,9",      per100mlUtblandet: "2,6" },
          { label: "– enumettede fettsyrer",       unit: "g",    per100gPulver: "7,5",      per100mlUtblandet: "2,8" },
          { label: "– flerumettede fettsyrer",     unit: "g",    per100gPulver: "3,5",      per100mlUtblandet: "1,3" },
          { label: "– linolsyre (LA)",             unit: "g",    per100gPulver: "3,4",      per100mlUtblandet: "1,3" },
          { label: "– α-linolensyre (ALA)",        unit: "g",    per100gPulver: "0,34",     per100mlUtblandet: "0,13" },
          { label: "– arakidonsyre (ARA)",         unit: "mg",   per100gPulver: "–",        per100mlUtblandet: "–" },
          { label: "– dokosaheksaensyre (DHA)",    unit: "mg",   per100gPulver: "–",        per100mlUtblandet: "–" },
          { label: "– LCT",                        unit: "%",    per100gPulver: "96",       per100mlUtblandet: "96" },
          { label: "– MCT",                        unit: "%",    per100gPulver: "4",        per100mlUtblandet: "4" },
          { label: "– ratio n-6:n-3",              unit: "",     per100gPulver: "10:1",     per100mlUtblandet: "10:1" },
          { label: "Karbohydrat (57 E%)",          unit: "g",    per100gPulver: "67,4",     per100mlUtblandet: "24,9" },
          { label: "– hvorav sukkerarter",         unit: "g",    per100gPulver: "12,3",     per100mlUtblandet: "4,6" },
          { label: "– laktose",                    unit: "g",    per100gPulver: "0",        per100mlUtblandet: "0" },
          { label: "Kostfiber (0 E%)",             unit: "g",    per100gPulver: "0",        per100mlUtblandet: "0" },
          { label: "Proteinekvivalenter (7 E%)",   unit: "g",    per100gPulver: "8,2",      per100mlUtblandet: "3,0" },
          { label: "Salt",                         unit: "g",    per100gPulver: "0,11",     per100mlUtblandet: "0,04" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg (mmol)",     per100gPulver: "42,0 (1,8)",  per100mlUtblandet: "15,5 (0,67)" },
          { label: "Kalium",    unit: "mg (mmol)",     per100gPulver: "<20 (<1,0)",  per100mlUtblandet: "<10 (<0,50)" },
          { label: "Klorid",    unit: "mg (mmol)",     per100gPulver: "48 (1,4)",    per100mlUtblandet: "17,8 (0,52)" },
          { label: "Kalsium",   unit: "mg (mmol)",     per100gPulver: "716 (17,9)",  per100mlUtblandet: "265 (6,6)" },
          { label: "Fosfor",    unit: "mg (mmol PO₄)", per100gPulver: "377 (12,2)",  per100mlUtblandet: "139 (4,5)" },
          { label: "Magnesium", unit: "mg (mmol)",     per100gPulver: "23,1 (0,96)", per100mlUtblandet: "8,5 (0,35)" },
          { label: "Jern",      unit: "mg",            per100gPulver: "6,5",         per100mlUtblandet: "2,4" },
          { label: "Sink",      unit: "mg",            per100gPulver: "4,5",         per100mlUtblandet: "1,7" },
          { label: "Kobber",    unit: "mg",            per100gPulver: "0,34",        per100mlUtblandet: "0,13" },
          { label: "Mangan",    unit: "mg",            per100gPulver: "0,34",        per100mlUtblandet: "0,13" },
          { label: "Molybden",  unit: "µg",            per100gPulver: "9,7",         per100mlUtblandet: "3,6" },
          { label: "Selen",     unit: "µg",            per100gPulver: "12,4",        per100mlUtblandet: "4,6" },
          { label: "Krom",      unit: "µg",            per100gPulver: "11,0",        per100mlUtblandet: "4,1" },
          { label: "Jod",       unit: "µg",            per100gPulver: "41,4",        per100mlUtblandet: "15,3" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg",         per100gPulver: "195",        per100mlUtblandet: "72,2" },
          { label: "Vitamin D",    unit: "µg",         per100gPulver: "4,3",        per100mlUtblandet: "1,6" },
          { label: "Vitamin E",    unit: "mg (α-TE)",  per100gPulver: "2,3",        per100mlUtblandet: "0,84" },
          { label: "Vitamin C",    unit: "mg",         per100gPulver: "23,0",       per100mlUtblandet: "8,5" },
          { label: "Vitamin K",    unit: "µg",         per100gPulver: "18,5",       per100mlUtblandet: "6,8" },
          { label: "Tiamin",       unit: "mg",         per100gPulver: "0,25",       per100mlUtblandet: "0,09" },
          { label: "Riboflavin",   unit: "mg",         per100gPulver: "0,25",       per100mlUtblandet: "0,09" },
          { label: "Niacin",       unit: "mg (mg NE)", per100gPulver: "1,1 (3,9)", per100mlUtblandet: "0,41 (1,5)" },
          { label: "Pantotensyre", unit: "mg",         per100gPulver: "1,4",        per100mlUtblandet: "0,52" },
          { label: "Vitamin B6",   unit: "mg",         per100gPulver: "0,25",       per100mlUtblandet: "0,09" },
          { label: "Folsyre",      unit: "µg",         per100gPulver: "27,5",       per100mlUtblandet: "10,2" },
          { label: "Vitamin B12",  unit: "µg",         per100gPulver: "0,60",       per100mlUtblandet: "0,22" },
          { label: "Biotin",       unit: "µg",         per100gPulver: "9,1",        per100mlUtblandet: "3,4" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "L-karnitin",  unit: "mg",           per100gPulver: "5,9",  per100mlUtblandet: "2,2" },
          { label: "Kolin",       unit: "mg",           per100gPulver: "45,0", per100mlUtblandet: "16,7" },
          { label: "Inositol",    unit: "mg",           per100gPulver: "49,0", per100mlUtblandet: "18,1" },
          { label: "Taurin",      unit: "mg",           per100gPulver: "15,9", per100mlUtblandet: "5,9" },
          { label: "Osmolaritet", unit: "mOsm/l",       per100gPulver: "—",    per100mlUtblandet: "—" },
          { label: "Osmolalitet", unit: "mOsm/kg H₂O",  per100gPulver: "—",    per100mlUtblandet: "—" },
        ],
      },
    ],
  },
  tilberedning: [
    "Kok opp vann og avkjøl.",
    "Bruk en nøyaktig vekt som viser vekten i gram. En strøken måleskje gir 4,6 g pulver.",
    "Tilsett 8 måleskjeer (37 g) pulver til 60 ml vann for å oppnå 100 ml.",
    "For spedbarn som starter med fast føde kan konsistensen til Neocate Spoon endres ved å tilsette mer eller mindre vann etter behov.",
    "Anbefalte blandingsforhold bestemmes av lege eller klinisk ernæringsfysiolog avhengig av pasientens alder, kroppsvekt og medisinske tilstand.",
  ],
  dosering: "Bruk den mengde produkt og blandingsforhold som anbefales av lege eller klinisk ernæringsfysiolog. Dette avhenger av pasientens alder, kroppsvekt og medisinske tilstand.",
  mixingInfo: { konsentrasjon: "37", scoopGram: "4,6" },
  mixingTable: [
    { skjeer: 8,  pulver: "37,0", vann: 60,  ferdig: 100, energi: 175 },
  ],
  holdbarhet: "18 måneder fra produksjonsdato. Holdbarhetsdato på pakningen. Oppbevares tørt og svalt. Sett alltid lokket på boksen etter bruk. Må ikke oppbevares i kjøleskap. Må brukes innen en måned etter åpning.",
  ingredienser: "Tørket glukosesirup, pregelatinisert risstivelse, raffinerte vegetabilske oljer (ikke-hydrogenert kokosolje, oliesyrerik solsikkeolje, rapsolje, solsikkeolje), aminosyrer (L-arginin-L-aspartat, L-leucin, L-lysinacetat, L-glutamin, L-prolin, L-valin, glysin, L-isoleucin, L-treonin, L-fenylalanin, L-tyrosin, L-serin, L-histidin, L-alanin, L-cystin, L-tryptofan, L-metionin), sukker, kalsiumfosfat tribasisk, emulgator (E472c), kolinbitartrat, magnesium-L-aspartat, magnesiumacetat, inositol, L-askorbinsyre, jernsulfat, taurin, sinksulfat, L-karnitin, DL-α-tokoferylacetat, kalsium-D-pantotenat, nikotinamid, mangansulfat, kobbersulfat, tiaminhydroklorid, pyridoksinhydroklorid, riboflavin, retinylacetat, kaliumjodid, kromklorid, pteroylmonoglutaminsyre, natriumselenitt, natriummolybdat, fytomenadion, D-biotin, kolekalsiferol, cyanokobalamin.",
  smaksvarianter: "Nøytral smak.",
  indikasjon: "Til kostbehandling av kumelkallergi, multimatvareallergi og andre indikasjoner hvor en elementalkost er anbefalt. Egnet til spedbarn og barn over 6 måneders alder. Ikke egnet til bruk som eneste næringskilde. Ikke egnet til flaske eller sondeernæring.",
  kontraindikasjon: "Intoleranse mot én eller flere av produktets ingredienser.",
  forsiktighetsregler: "Ikke egnet til bruk som eneste næringskilde. Gis til spedbarn i tillegg til morsmelk eller annen ernæringsmessig komplett hypoallergen morsmelkerstatning. Neocate Spoon har et høyt innhold av kalsium og jern og er en kilde til vitamin D.",
  bestilling: [
    { produktnavn: "Neocate Spoon", bestillingsnr: "194980", varenr: "949843", salgsenhet: "400 g boks" },
  ],
};

const NEOCATE_JUNIOR: Product = {
  id: "neocate-junior",
  manufacturer: "nutricia",
  name: "Neocate Junior",
  age: "Fra 1 år",
  tagline: "Aminosyrebasert melkeerstatning spesielt utviklet for å møte det voksende barnets ernæringsbehov.",
  description: "For barn fra 1 års alderen ved kumelkallergi og multimatvareallergi. Ernæringsmessig komplett ernæringsprodukt i pulverform. Hypoallergen. 35 % MCT-fett. Kan drikkes som kosttillegg, brukes som berikning eller som eneste ernæring/sondeernæring. Uten søtstoff.",
  image: "/nutrition/Neocate-Junior.png",
  thumb: "/nutrition/thumbs/neocate-junior.png",
  imageScale: 1.25,
  type: "Aminosyrebasert",
  badges: [
    { label: "Aminosyrebasert",                    color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett fra 1 år",  color: "#4ADE80", icon: "shield" },
    { label: "Glutenfri",                          color: "#4ADE80", icon: "shield" },
    { label: "Laktosefri",                         color: "#EA580C", icon: "gut"    },
    { label: "Kostfiberfri",                       color: "#EA580C", icon: "gut"    },
    { label: "Halalsertifisert",                   color: "#D97706", icon: "star"   },
    { label: "Koshersertifisert",                  color: "#D97706", icon: "star"   },
  ],
  summary: [
    { label: "Alder",         value: "Fra 1 år" },
    { label: "Energitetthet", value: "1 kcal/ml" },
    { label: "Protein",       value: "Enkle aminosyrer" },
    { label: "Kostfiber",     value: "Ikke tilsatt" },
    { label: "Halal",         value: "Ja" },
    { label: "Laktose",       value: "Nei" },
  ],
  fordeler: [
    "Skreddersydd ernæringsprofil som møter det voksende barnets ernæringsbehov.",
    "God smak for bedre compliance.",
    "Flere smaker (jordbær, vanilje og nøytral) gir variasjonsmuligheter. Uten søtstoff.",
    "Reduserer kompleksitet: kan brukes som kosttillegg og som eneste ernæring/sondeernæring.",
  ],
  fordelerIcons: [ICON_SHIELD_STAR, ICON_MILK_BOTTLE, ICON_DROP, ICON_GUT2],
  bruksomraader: [
    "Til kostbehandling av barn fra 1 års alderen med kumelkallergi, multimatvareallergi og andre indikasjoner hvor elementalkost er anbefalt.",
    "Brukes som erstatning for melk/melkeprodukter eller som tilskudd til annen mat og drikke.",
  ],
  fodmap: { laktose: "0 g", gos: false, fos: false },
  viktigAVite: [
    "Ikke egnet for spedbarn.",
    "Ikke for parenteralt bruk.",
    "Ferdig blanding skal ikke kokes, eller varmes/tilberedes i mikrobølgeovn.",
    "Ved eneste kilde til ernæring må mikronæringsstoffstatus overvåkes. Serumnivåer, spesielt fosfat, bør monitoreres rutinemessig ved kompleks systemisk sykdom og tarmsykdom, spesielt i kombinasjon med sondemating og/eller tidligere prematuritet.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",                icon: null },
    { label: "Laktosefri",               icon: null },
    { label: "Halalsertifisert",         icon: null },
    { label: "Koshersertifisert",        icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  kcalPer100ml: 100,
  pulverPer100ml: "21,1 g pulver",
  macros: [
    { label: "Fett (42 E%)",        value: 42, color: "#7C3AED", amount: "4,6 g" },
    { label: "Karbohydrat (47 E%)", value: 47, color: "#F97316", amount: "11,8 g" },
    { label: "Protein (11 E%)",     value: 11, color: "#3B82F6", amount: "2,8 g" },
    { label: "Kostfiber (0 E%)",    value: 0,  color: "#22C55E", amount: "0 g" },
  ],
  nokkel: [
    { label: "Laktose",   value: "0 g"      },
    { label: "Kalsium",   value: "90,4 mg"  },
    { label: "Jern",      value: "1,20 mg"  },
    { label: "Vitamin D", value: "1,31 µg"  },
    { label: "Natrium",   value: "60,6 mg"  },
    { label: "Sink",      value: "1,10 mg"  },
    { label: "Vitamin A", value: "45,2 µg"  },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml ferdig løsning (21,1 % konsentrasjon)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                  unit: "kJ",   per100gPulver: "1985",   per100mlUtblandet: "419" },
          { label: "Energi (kcal)",                unit: "kcal", per100gPulver: "473",    per100mlUtblandet: "100" },
          { label: "Fett (42 E%)",                 unit: "g",    per100gPulver: "21,9",   per100mlUtblandet: "4,6" },
          { label: "– hvorav mettede fettsyrer",   unit: "g",    per100gPulver: "9,7",    per100mlUtblandet: "2,1" },
          { label: "– MCT",                        unit: "g",    per100gPulver: "7,7",    per100mlUtblandet: "1,63" },
          { label: "– enumettede fettsyrer",       unit: "g",    per100gPulver: "8,2",    per100mlUtblandet: "1,7" },
          { label: "– flerumettede fettsyrer",     unit: "g",    per100gPulver: "4,0",    per100mlUtblandet: "0,84" },
          { label: "– linolsyre (LA)",             unit: "g",    per100gPulver: "3,44",   per100mlUtblandet: "0,73" },
          { label: "– α-linolensyre (ALA)",        unit: "g",    per100gPulver: "0,33",   per100mlUtblandet: "0,07" },
          { label: "– ratio n-6:n-3",              unit: "",     per100gPulver: "10:1",   per100mlUtblandet: "10,4:1" },
          { label: "Karbohydrat (47 E%)",          unit: "g",    per100gPulver: "55,9",   per100mlUtblandet: "11,8" },
          { label: "– hvorav sukkerarter",         unit: "g",    per100gPulver: "4,9",    per100mlUtblandet: "1,0" },
          { label: "– laktose",                    unit: "g",    per100gPulver: "0",      per100mlUtblandet: "0" },
          { label: "Kostfiber (0 E%)",             unit: "g",    per100gPulver: "0",      per100mlUtblandet: "0" },
          { label: "Protein (11 E%)",              unit: "g",    per100gPulver: "13,4",   per100mlUtblandet: "2,8" },
          { label: "Salt",                         unit: "g",    per100gPulver: "0,72",   per100mlUtblandet: "0,15" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg (mmol)",     per100gPulver: "287 (12,5)",  per100mlUtblandet: "60,6 (2,64)" },
          { label: "Kalium",    unit: "mg (mmol)",     per100gPulver: "546 (14,0)",  per100mlUtblandet: "115 (2,95)" },
          { label: "Klorid",    unit: "mg (mmol)",     per100gPulver: "441 (12,4)",  per100mlUtblandet: "92,2 (2,6)" },
          { label: "Kalsium",   unit: "mg (mmol)",     per100gPulver: "428 (10,7)",  per100mlUtblandet: "90,4 (2,26)" },
          { label: "Fosfor",    unit: "mg (mmol PO₄)", per100gPulver: "309 (9,99)",  per100mlUtblandet: "65,3 (2,11)" },
          { label: "Magnesium", unit: "mg (mmol)",     per100gPulver: "66,5 (2,74)", per100mlUtblandet: "14,0 (0,58)" },
          { label: "Jern",      unit: "mg",            per100gPulver: "5,70",        per100mlUtblandet: "1,20" },
          { label: "Sink",      unit: "mg",            per100gPulver: "5,20",        per100mlUtblandet: "1,10" },
          { label: "Kobber",    unit: "mg",            per100gPulver: "0,48",        per100mlUtblandet: "0,10" },
          { label: "Mangan",    unit: "mg",            per100gPulver: "0,30",        per100mlUtblandet: "0,063" },
          { label: "Molybden",  unit: "µg",            per100gPulver: "21,4",        per100mlUtblandet: "4,52" },
          { label: "Selen",     unit: "µg",            per100gPulver: "15,2",        per100mlUtblandet: "3,21" },
          { label: "Krom",      unit: "µg",            per100gPulver: "10,5",        per100mlUtblandet: "2,22" },
          { label: "Jod",       unit: "µg",            per100gPulver: "71,3",        per100mlUtblandet: "15,0" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg",         per100gPulver: "214",          per100mlUtblandet: "45,2" },
          { label: "Vitamin D",    unit: "µg",         per100gPulver: "6,20",         per100mlUtblandet: "1,31" },
          { label: "Vitamin E",    unit: "mg (α-TE)",  per100gPulver: "8,60",         per100mlUtblandet: "1,81" },
          { label: "Vitamin C",    unit: "mg",         per100gPulver: "47,5",         per100mlUtblandet: "10,0" },
          { label: "Vitamin K",    unit: "µg",         per100gPulver: "25,6",         per100mlUtblandet: "5,40" },
          { label: "Tiamin",       unit: "mg",         per100gPulver: "0,48",         per100mlUtblandet: "0,10" },
          { label: "Riboflavin",   unit: "mg",         per100gPulver: "0,95",         per100mlUtblandet: "0,20" },
          { label: "Niacin",       unit: "mg (mg NE)", per100gPulver: "5,30 (8,98)",  per100mlUtblandet: "1,12 (1,89)" },
          { label: "Pantotensyre", unit: "mg",         per100gPulver: "1,90",         per100mlUtblandet: "0,40" },
          { label: "Vitamin B6",   unit: "mg",         per100gPulver: "0,60",         per100mlUtblandet: "0,13" },
          { label: "Folinsyre",    unit: "µg",         per100gPulver: "73,0",         per100mlUtblandet: "15,4" },
          { label: "Vitamin B12",  unit: "µg",         per100gPulver: "1,20",         per100mlUtblandet: "0,25" },
          { label: "Biotin",       unit: "µg",         per100gPulver: "14,3",         per100mlUtblandet: "3,20" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "Kolin",       unit: "mg",           per100gPulver: "95,0", per100mlUtblandet: "20,0" },
          { label: "Inositol",    unit: "mg",           per100gPulver: "26,1", per100mlUtblandet: "5,51" },
          { label: "L-karnitin",  unit: "mg",           per100gPulver: "15,8", per100mlUtblandet: "3,33" },
          { label: "Taurin",      unit: "mg",           per100gPulver: "31,6", per100mlUtblandet: "6,68" },
          { label: "Osmolalitet", unit: "mOsm/kg H₂O",  per100gPulver: "—",    per100mlUtblandet: "590–600" },
        ],
      },
    ],
  },
  tilberedning: [
    "Vask hendene og rengjør alle redskaper.",
    "Mål opp anbefalt mengde vann i en beholder.",
    "Tilsett anbefalt mengde pulver til vannet. Bruk kun vedlagt måleskje – en strøken måleskje gir 7,3 g pulver.",
    "Dekk til og rist beholderen til pulveret er oppløst.",
    "Rist eller rør om blandingen umiddelbart før bruk. Smaker best avkjølt hvis den serveres som drikke.",
    "Tilberedt produkt oppbevares i kjøleskap og brukes innen 24 timer.",
  ],
  dosering: "Egnet som eneste næringskilde. Doseringen er individuell og skal bestemmes i samråd med lege eller klinisk ernæringsfysiolog. Anbefalt konsentrasjon er 21,1 % vekt/volum (1 kcal/ml): tilsett 1 strøken måleskje til hver 30 ml vann.",
  mixingInfo: { konsentrasjon: "21,1", scoopGram: "7,3", anbefaltSkjeer: 3 },
  mixingTable: [
    { skjeer: 2, pulver: "14,6", vann: 90, ferdig: 100, energi: 69  },
    { skjeer: 3, pulver: "21,9", vann: 90, ferdig: 105, energi: 105 },
    { skjeer: 4, pulver: "29,2", vann: 90, ferdig: 110, energi: 138 },
  ],
  holdbarhet: "To år fra produksjonsdato. Holdbarhetsdato står på pakningen. Utblandet produkt kan oppbevares i kjøleskap i 24 timer. Uåpnet boks oppbevares i romtemperatur. Åpnet boks oppbevares med lokk, på et svalt og tørt sted. Brukes innen en måned.",
  ingredienser: "Tørket glukosesirup, raffinerte vegetabilske oljer (mellomkjedede triglyserider (kokosolje og/eller palmeolje), oljesyrerik solsikkeolje, rapsolje, solsikkeolje), L-serin, L-glutamin, glysin, L-alanin, L-leucin, L-lysinacetat, L-treonin, kaliumsitrat, L-tyrosin, emulgator (sitronsyreestere av mono- og diglyserider av fettsyrer), L-valin, L-isoleucin, kalsiumhydrogenfosfat, magnesiumklorid, L-prolin, natriumhydrogenfosfat, kalsiumkarbonat, L-cystin, L-fenylalanin, L-histidin, dikaliumhydrogenfosfat, L-metionin, L-arginin, natriumklorid, kolinbitartrat, L-tryptofan, kalsiumsitrat, kalsiumklorid, L-askorbinsyre, antioksidanter (solsikkelecitin, askorbylpalmitat), taurin, inositol, aroma (jordbær i jordbærsmak, vanilje i vaniljesmak), jernsulfat, L-karnitin, sinksulfat, nikotinamid, DL-α-tokoferylacetat, kalsium-D-pantotenat, kobbersulfat, riboflavin, mangansulfat, pyridoksinhydroklorid, tiaminhydroklorid, retinylacetat, kaliumjodid, pteroylmonoglutaminsyre, natriummolybdat, DL-α-tokoferol, kromklorid, natriumselenitt, fytomenadion, D-biotin, kolekalsiferol, cyanokobalamin. Glutenfri. Laktosefri. Melkeproteinfri. Kostfiberfri. Halal- og koshersertifisert.",
  smaksvarianter: "Jordbærsmak, vaniljesmak og nøytral smak.",
  indikasjon: "Til kostbehandling av barn fra 1 år med kumelkallergi, multimatvareallergi og andre indikasjoner hvor elementalkost er anbefalt. Brukes som erstatning for melk/melkeprodukter eller som tilskudd til annen mat og drikke.",
  kontraindikasjon: "Spedbarn. Intoleranse mot en eller flere av produktets ingredienser.",
  forsiktighetsregler: "Ikke for parenteralt bruk. Ferdig blanding skal ikke kokes, eller varmes/tilberedes i mikrobølgeovn. Ved eneste kilde til ernæring må mikronæringsstoffstatus overvåkes.",
  bestilling: [
    { produktnavn: "Neocate Junior jordbærsmak", bestillingsnr: "212049", varenr: "810980", salgsenhet: "400 g boks" },
    { produktnavn: "Neocate Junior vaniljesmak", bestillingsnr: "212050", varenr: "800070", salgsenhet: "400 g boks" },
    { produktnavn: "Neocate Junior nøytral smak", bestillingsnr: "211721", varenr: "806063", salgsenhet: "400 g boks" },
  ],
};

type Manufacturer = {
  label: string;
  short: string;
  contactTitle: string;
  notice: string;
  footer: string;
  address: string;
  tel: { label: string; href: string; title?: string };
  email?: string;
  extra: { label: string; value: string; href: string }[];
};

/** Rekkefølgen her er rekkefølgen på gruppene i produktvelgeren. */
const MANUFACTURERS: Record<ManufacturerId, Manufacturer> = {
  nutricia: {
    label: "Nutricia",
    short: "Nutricia",
    contactTitle: "Kontakt Nutricia",
    notice: "Nutricias produkter er registrerte næringsmidler til spesielle medisinske formål og skal brukes i samråd med helsepersonell. Ved eneste kilde til ernæring må mikronæringsstoffstatus overvåkes.",
    footer: "Nutricias produkter er registrerte næringsmidler til spesielle medisinske formål og skal brukes i samråd med helsepersonell.",
    address: "Nutricia, ℅ Danone AS",
    tel: { label: "+47 23 00 21 00", href: "tel:+4723002100" },
    email: "nutricia.amnno@danone.com",
    extra: [],
  },
  nestle: {
    label: "Nestlé Health Science",
    short: "Nestlé",
    contactTitle: "Kontakt Nestlé Health Science",
    notice: "Nestlé Health Science sine produkter er næringsmidler til spesielle medisinske formål og skal brukes under medisinsk tilsyn. Kun for helsepersonell.",
    footer: "Næringsmidler til spesielle medisinske formål skal brukes under medisinsk tilsyn.",
    address: "Nestlé Health Science, Postboks 683 Skøyen, 0214 Oslo",
    tel: { label: "800 31 425", href: "tel:80031425" },
    email: "nestlehealthscience@no.nestle.com",
    extra: [
      { label: "Bestilling (grossist)", value: "orders@no.nestle.com", href: "mailto:orders@no.nestle.com" },
      { label: "Web", value: "www.nestlehealthscience.no", href: "https://www.nestlehealthscience.no" },
    ],
  },
  mead: {
    label: "Mead Johnson",
    short: "Mead Johnson",
    contactTitle: "Kontakt Mead Johnson / Scandinavian Biopharma",
    notice: "Nutramigen-produktene er næringsmidler til spesielle medisinske formål og skal brukes under medisinsk tilsyn. Produktene skal ikke gis parenteralt.",
    footer: "Nutramigen-produktene er næringsmidler til spesielle medisinske formål og skal brukes under medisinsk tilsyn.",
    address: "Scandinavian Biopharma, Industrivägen 1, 171 48 Solna, Sverige",
    tel: { label: "23 96 23 00", href: "tel:+4723962300", title: "Kundesenter" },
    extra: [],
  },
};

const ALTHERA: Product = {
  id: "althera",
  manufacturer: "nestle",
  name: "Althéra",
  age: "0–12 måneder",
  tagline: "Hypoallergen spesialnæring med humane melkeoligosakkarider (HMO) for spedbarn med kumelkproteinallergi.",
  description: "Inneholder ekstensivt hydrolysert myseprotein, renprodusert laktose og HMO (2’-fukosyllaktose og lakto-N-neotetraose, ikke fra morsmelk). Høyt hydrolysert, med minst peptider på markedet.",
  image: "/nutrition/althera.jpg",
  thumb: "/nutrition/thumbs/althera.png",
  imageScale: 1,
  type: "Hydrolysert",
  badges: [
    { label: "Hydrolysert",                          color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett 0–12 måneder", color: "#4ADE80", icon: "shield" },
    { label: "Glutenfri",                            color: "#4ADE80", icon: "shield" },
    { label: "Med HMO",                              color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                        color: "#D97706", icon: "drop"   },
    { label: "Halalsertifisert",                     color: "#D97706", icon: "star"   },
  ],
  summary: [
    { label: "Alder",         value: "0–12 måneder" },
    { label: "Energitetthet", value: "0,66 kcal/ml" },
    { label: "Protein",       value: "Ekstensivt hydrolysert myse" },
    { label: "Kostfiber",     value: "HMO (0,15 g/100 ml)" },
    { label: "Halal",         value: "Ja" },
    { label: "Laktose",       value: "Ja" },
  ],
  fordeler: [
    "Oppfyller de internasjonale kriteriene for hypoallergenisitet og er en sikker ernæringsbehandling av spedbarn med konstatert kumelkproteinallergi.",
    "Gir effektiv symptomlindring hos 98,4 %.",
    "Renprodusert laktose gir en god og mild smak, stimulerer kalsiumopptak og fremmer veksten av bifidobakterier i tarmen.",
    "HMO støtter immunforsvaret og reduserer risiko for infeksjoner, og fremmer en tarmflora mer lik den hos ammede barn.",
  ],
  fordelerIcons: [ICON_SHIELD_STAR, ICON_MILK_BOTTLE, ICON_GUT2, ICON_DROP],
  bruksomraader: [
    "Fullverdig næringsmiddel til spesielle medisinske formål for spedbarn 0–12 måneder med kumelkproteinallergi.",
    "Egnet som eneste næringskilde fra fødsel og opp til 6 måneder. Fra 6 måneder suppleres Althéra med melkefri kost.",
    "Over 1 års alder kan Althéra brukes som en betydelig næringskilde sammen med variert melkefri kost.",
  ],
  fodmap: { laktose: "3,7 g", gos: false, fos: false },
  viktigAVite: [
    "Mødre skal oppmuntres til å fortsette amming selv om barnet har kumelkproteinallergi.",
    "Ukokt vann, usteriliserte flasker eller feilaktig blanding kan føre til sykdom.",
    "Skal brukes under medisinsk tilsyn.",
    "Kan foreskrives på blå resept.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",                icon: null },
    { label: "Halalsertifisert",         icon: null },
    { label: "Med HMO",                  icon: null },
    { label: "Med DHA & ARA",            icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  kcalPer100ml: 66,
  pulverPer100ml: "13,2 g pulver",
  macros: [
    { label: "Fett (46 E%)",        value: 46, color: "#7C3AED", amount: "3,4 g" },
    { label: "Karbohydrat (44 E%)", value: 44, color: "#F97316", amount: "7,4 g" },
    { label: "Protein (9 E%)",      value: 9,  color: "#3B82F6", amount: "1,5 g" },
    { label: "Kostfiber (1 E%)",    value: 1,  color: "#22C55E", amount: "0,15 g" },
  ],
  nokkel: [
    { label: "Laktose",   value: "3,7 g"    },
    { label: "HMO",       value: "0,15 g"   },
    { label: "DHA",       value: "18 mg"    },
    { label: "ARA",       value: "18 mg"    },
    { label: "Kalsium",   value: "70 mg"    },
    { label: "Jern",      value: "0,80 mg"  },
    { label: "Vitamin D", value: "1,6 µg"   },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml utblandet (13,2 g pulver)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                  unit: "kJ",   per100gPulver: "2109",   per100mlUtblandet: "278" },
          { label: "Energi (kcal)",                unit: "kcal", per100gPulver: "504",    per100mlUtblandet: "66" },
          { label: "Fett (46 E%)",                 unit: "g",    per100gPulver: "26",     per100mlUtblandet: "3,4" },
          { label: "– hvorav mettet",              unit: "g",    per100gPulver: "6,0",    per100mlUtblandet: "0,79" },
          { label: "– hvorav enumettet",           unit: "g",    per100gPulver: "14",     per100mlUtblandet: "1,8" },
          { label: "– hvorav flerumettet",         unit: "g",    per100gPulver: "4,4",    per100mlUtblandet: "0,58" },
          { label: "– linolsyre",                  unit: "mg",   per100gPulver: "3700",   per100mlUtblandet: "488" },
          { label: "– α-linolensyre",              unit: "mg",   per100gPulver: "380",    per100mlUtblandet: "50" },
          { label: "– DHA",                        unit: "mg",   per100gPulver: "135",    per100mlUtblandet: "18" },
          { label: "– ARA",                        unit: "mg",   per100gPulver: "135",    per100mlUtblandet: "18" },
          { label: "Karbohydrat (44 E%)",          unit: "g",    per100gPulver: "55,8",   per100mlUtblandet: "7,4" },
          { label: "– hvorav sukkerarter",         unit: "g",    per100gPulver: "29",     per100mlUtblandet: "3,8" },
          { label: "– hvorav laktose",             unit: "g",    per100gPulver: "28",     per100mlUtblandet: "3,7" },
          { label: "Kostfiber (1 E%)",             unit: "g",    per100gPulver: "1,1",    per100mlUtblandet: "0,15" },
          { label: "– lakto-N-neotetraose",        unit: "g",    per100gPulver: "0,38",   per100mlUtblandet: "0,050" },
          { label: "– 2’-fukosyllaktose",          unit: "g",    per100gPulver: "0,76",   per100mlUtblandet: "0,10" },
          { label: "Protein (9 E%)",               unit: "g",    per100gPulver: "11",     per100mlUtblandet: "1,5" },
          { label: "Salt",                         unit: "g",    per100gPulver: "0,49",   per100mlUtblandet: "0,064" },
          { label: "Forhold n6:n3",                unit: "",     per100gPulver: "7,5:1",  per100mlUtblandet: "7,5:1" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg", per100gPulver: "195",   per100mlUtblandet: "26" },
          { label: "Kalium",    unit: "mg", per100gPulver: "580",   per100mlUtblandet: "77" },
          { label: "Klorid",    unit: "mg", per100gPulver: "400",   per100mlUtblandet: "53" },
          { label: "Kalsium",   unit: "mg", per100gPulver: "530",   per100mlUtblandet: "70" },
          { label: "Fosfor",    unit: "mg", per100gPulver: "350",   per100mlUtblandet: "46" },
          { label: "Magnesium", unit: "mg", per100gPulver: "45",    per100mlUtblandet: "5,9" },
          { label: "Jern",      unit: "mg", per100gPulver: "6,1",   per100mlUtblandet: "0,80" },
          { label: "Sink",      unit: "mg", per100gPulver: "4,3",   per100mlUtblandet: "0,57" },
          { label: "Kobber",    unit: "mg", per100gPulver: "0,41",  per100mlUtblandet: "0,054" },
          { label: "Mangan",    unit: "mg", per100gPulver: "0,075", per100mlUtblandet: "0,0090" },
          { label: "Selen",     unit: "µg", per100gPulver: "25",    per100mlUtblandet: "3,3" },
          { label: "Jod",       unit: "µg", per100gPulver: "122",   per100mlUtblandet: "16" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg",         per100gPulver: "500",      per100mlUtblandet: "66" },
          { label: "Vitamin D",    unit: "µg",         per100gPulver: "12",       per100mlUtblandet: "1,6" },
          { label: "Vitamin E",    unit: "mg",         per100gPulver: "14",       per100mlUtblandet: "1,8" },
          { label: "Vitamin K",    unit: "µg",         per100gPulver: "45",       per100mlUtblandet: "5,9" },
          { label: "Vitamin C",    unit: "mg",         per100gPulver: "80",       per100mlUtblandet: "11" },
          { label: "Niacin",       unit: "mg (mg NE)", per100gPulver: "7 (11)",   per100mlUtblandet: "0,92 (1,4)" },
          { label: "Vitamin B1",   unit: "mg",         per100gPulver: "0,51",     per100mlUtblandet: "0,067" },
          { label: "Vitamin B2",   unit: "mg",         per100gPulver: "1,0",      per100mlUtblandet: "0,13" },
          { label: "Vitamin B6",   unit: "mg",         per100gPulver: "0,40",     per100mlUtblandet: "0,053" },
          { label: "Folsyre",      unit: "µg",         per100gPulver: "75",       per100mlUtblandet: "9,9" },
          { label: "Folat",        unit: "µg DFE",     per100gPulver: "125",      per100mlUtblandet: "16" },
          { label: "Vitamin B12",  unit: "µg",         per100gPulver: "1,4",      per100mlUtblandet: "0,18" },
          { label: "Biotin",       unit: "µg",         per100gPulver: "12",       per100mlUtblandet: "1,6" },
          { label: "Pantotensyre", unit: "mg",         per100gPulver: "3,3",      per100mlUtblandet: "0,44" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "Taurin",       unit: "mg",           per100gPulver: "40",  per100mlUtblandet: "5,3" },
          { label: "L-karnitin",   unit: "mg",           per100gPulver: "8,5", per100mlUtblandet: "1,1" },
          { label: "Kolin",        unit: "mg",           per100gPulver: "145", per100mlUtblandet: "19" },
          { label: "Inositol",     unit: "mg",           per100gPulver: "35",  per100mlUtblandet: "4,6" },
          { label: "Osmolaritet",  unit: "mOsm/l",       per100gPulver: "—",   per100mlUtblandet: "273" },
          { label: "Osmolalitet",  unit: "mOsm/kg H₂O",  per100gPulver: "—",   per100mlUtblandet: "305" },
        ],
      },
    ],
  },
  tilberedning: [
    "Bruk kokt vann og steriliserte flasker. Ukokt vann, usteriliserte flasker eller feilaktig blanding kan føre til sykdom.",
    "Mål opp vann i flasken etter doseringstabellen.",
    "Tilsett strøkne måleskjeer pulver. Bruk kun måleskjeen som følger med i forpakningen – en strøken måleskje veier 4,4 g.",
    "90 ml vann + 3 strøkne måleskjeer pulver gir 100 ml ferdig blanding.",
    "Tilbered kun én flaske om gangen. Ikke spar på gjenværende blanding i flasken – kast innholdet.",
  ],
  dosering: "Doseringstabellen er ment som en veiledning. Ansvarlig lege eller klinisk ernæringsfysiolog bør beregne egnet dagsdose som er tilpasset individuelt for hvert enkelt barn.",
  mixingInfo: { konsentrasjon: "13,2", scoopGram: "4,4" },
  mixingTable: [
    { skjeer: 3, pulver: "13,2", vann: 90, ferdig: 100, energi: 66 },
  ],
  doseringTabell: {
    tittel: "Dosering etter alder",
    kolonner: ["Alder", "Vann (ml)", "Måleskjeer", "Måltider/døgn", "Bokser/mnd"],
    rader: [
      ["0–2 uker", "90", "3", "6", "6"],
      ["2–4 uker", "120", "4", "5", "7"],
      ["1–2 måneder", "150", "5", "5", "8–9"],
      ["2–4 måneder", "180", "6", "5", "10"],
      ["4–6 måneder", "210", "7", "5", "12"],
      ["Over 6 måneder", "210", "7", "3–4", "7–9"],
    ],
  },
  holdbarhet: "Oppbevares svalt og tørt og brukes innen best før dato. Åpnet forpakning brukes innen 3 uker. Tilbered kun 1 flaske om gangen. Ikke spar på gjenværende blanding i flasken. Kast innholdet.",
  ingredienser: "Laktose, maltodekstrin, vegetabilske oljer (solsikke, raps, kokos), ekstensivt hydrolysert myseprotein (melk), mineraler (kalsiumglyserofosfat, kaliumfosfat, magnesiumklorid, kalsiumklorid, natriumklorid, mangansulfat, jernsulfat, kaliumjodid, natriumfosfat, sinksulfat, kaliumsitrat, kaliumklorid, natriumselenat, kobbersulfat), emulgator (E472c), fiber (2’-fukosyllaktose, lakto-N-neotetraose), olje fra Mortierella alpina (ARA), olje fra mikroalgen Schizochytrium sp. (DHA), surhetsregulerende middel (E330), kolindibartartrat, vitaminer (C, E, niacin, pantotensyre, riboflavin, A, tiamin, B6, folsyre, K, D, biotin, B12), L-arginin, L-histidin, taurin, inositol, L-karnitin. Glutenfri. Pakket i beskyttet atmosfære. Halal-sertifisert.",
  smaksvarianter: "Nøytral smak.",
  indikasjon: "Hypoallergen spesialnæring til ernæringsbehandling av spedbarn 0–12 måneder med kumelkproteinallergi. Egnet som eneste næringskilde fra fødsel og opp til 6 måneder.",
  kontraindikasjon: "Galaktosemi og glukose-galaktose-malabsorpsjon.",
  forsiktighetsregler: "Mødre skal oppmuntres til å fortsette amming selv om barnet har kumelkproteinallergi. Ved bruk av spesialnæring er det viktig å gi korrekte tilberedningsinstruksjoner: ukokt vann, usteriliserte flasker eller feilaktig blanding kan føre til sykdom. Skal brukes under medisinsk tilsyn. Kun for helsepersonell.",
  bestilling: [
    { produktnavn: "Althéra nøytral smak", bestillingsnr: "900691", varenr: "835440", salgsenhet: "1 x 400 g pulver" },
  ],
};

const ALFARE: Product = {
  id: "alfare",
  manufacturer: "nestle",
  name: "Alfaré",
  age: "0–12 måneder",
  tagline: "Hypoallergen spesialnæring med humane melkeoligosakkarider (HMO) for spedbarn med malabsorpsjon og samtidig kumelkproteinallergi.",
  description: "Spesialtilpasset for diettbehandling av spedbarn med gastrointestinale lidelser og matallergi eller intoleranse. Ekstensivt hydrolysert myseprotein, 40 % MCT-fett og laktosefri. Lav osmolaritet (180 mOsm/L).",
  image: "/nutrition/alfare.jpg",
  thumb: "/nutrition/thumbs/alfare.png",
  imageScale: 1,
  type: "Hydrolysert",
  badges: [
    { label: "Hydrolysert",                           color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett 0–12 måneder", color: "#4ADE80", icon: "shield" },
    { label: "Glutenfri",                             color: "#4ADE80", icon: "shield" },
    { label: "Laktosefri",                            color: "#EA580C", icon: "gut"    },
    { label: "Med HMO",                               color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                         color: "#D97706", icon: "drop"   },
    { label: "Med MCT",                               color: "#D97706", icon: "drop"   },
    { label: "Med nukleotider",                       color: "#A78BFA", icon: "star"   },
  ],
  summary: [
    { label: "Alder",         value: "0–12 måneder" },
    { label: "Energitetthet", value: "0,67 kcal/ml" },
    { label: "Protein",       value: "Ekstensivt hydrolysert myse" },
    { label: "Kostfiber",     value: "HMO (0,15 g/100 ml)" },
    { label: "Laktose",       value: "Nei" },
  ],
  fordeler: [
    "Dokumentert sikker og veltolerert for spedbarn med kumelkproteinallergi og malabsorpsjon, for eksempel fettmalabsorpsjon. Kan også brukes ved andre mage-tarm-problemer.",
    "Ekstensivt hydrolysert myseprotein med 98 % av peptidene under 1200 dalton.",
    "40 % av fettet er lettabsorbert MCT-fett for god toleranse ved diaré.",
    "Lav osmolaritet (180 mOsm/L) for best mulig toleranse ved diaré.",
    "HMO støtter immunforsvaret, reduserer risiko for infeksjoner og fremmer en tarmflora mer lik den hos ammede barn.",
  ],
  fordelerIcons: [ICON_SHIELD_STAR, ICON_GUT2, ICON_DROP, ICON_DROP, ICON_MILK_BOTTLE],
  bruksomraader: [
    "Fullverdig næringsmiddel til spesielle medisinske formål for spedbarn 0–12 måneder med gastrointestinale lidelser og matallergi eller intoleranse, for eksempel kumelkproteinallergi.",
    "Velegnet som eneste næringskilde fra fødselen og opp til 6 måneder. Fra 6 måneder suppleres Alfaré med melkefri kost.",
    "Over 1 års alder kan Alfaré brukes som en viktig næringskilde sammen med mer variert melkefri kost.",
  ],
  fodmap: { laktose: "<0,01 g", gos: false, fos: false },
  viktigAVite: [
    "Mødre skal oppmuntres til å fortsette amming selv om barnet har kumelkproteinallergi.",
    "Ukokt vann, usteriliserte flasker eller feilaktig blanding kan føre til sykdom.",
    "Skal brukes under medisinsk tilsyn.",
    "Kan foreskrives på blå resept.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",                icon: null },
    { label: "Laktosefri",               icon: null },
    { label: "Med HMO",                  icon: null },
    { label: "Med DHA & ARA",            icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  kcalPer100ml: 67,
  pulverPer100ml: "13,5 g pulver",
  macros: [
    { label: "Fett (44 E%)",        value: 44, color: "#7C3AED", amount: "3,4 g" },
    { label: "Karbohydrat (44 E%)", value: 44, color: "#F97316", amount: "7,4 g" },
    { label: "Protein (11 E%)",     value: 11, color: "#3B82F6", amount: "1,9 g" },
    { label: "Kostfiber (1 E%)",    value: 1,  color: "#22C55E", amount: "0,15 g" },
  ],
  nokkel: [
    { label: "Laktose",      value: "<0,01 g"    },
    { label: "MCT",          value: "1,3 g"      },
    { label: "HMO",          value: "0,15 g"     },
    { label: "DHA",          value: "18 mg"      },
    { label: "ARA",          value: "18 mg"      },
    { label: "Kalsium",      value: "71 mg"      },
    { label: "Osmolaritet",  value: "180 mOsm/l" },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml utblandet (13,5 g pulver)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                  unit: "kJ",   per100gPulver: "2090",   per100mlUtblandet: "282" },
          { label: "Energi (kcal)",                unit: "kcal", per100gPulver: "499",    per100mlUtblandet: "67" },
          { label: "Fett (44 E%)",                 unit: "g",    per100gPulver: "25",     per100mlUtblandet: "3,4" },
          { label: "– hvorav mettet",              unit: "g",    per100gPulver: "12",     per100mlUtblandet: "1,6" },
          { label: "– MCT",                        unit: "g",    per100gPulver: "9,9",    per100mlUtblandet: "1,3" },
          { label: "– hvorav enumettet",           unit: "g",    per100gPulver: "7,5",    per100mlUtblandet: "1,0" },
          { label: "– hvorav flerumettet",         unit: "g",    per100gPulver: "4,3",    per100mlUtblandet: "0,58" },
          { label: "– linolsyre",                  unit: "mg",   per100gPulver: "3400",   per100mlUtblandet: "459" },
          { label: "– α-linolensyre",              unit: "mg",   per100gPulver: "440",    per100mlUtblandet: "59" },
          { label: "– DHA",                        unit: "mg",   per100gPulver: "135",    per100mlUtblandet: "18" },
          { label: "– ARA",                        unit: "mg",   per100gPulver: "135",    per100mlUtblandet: "18" },
          { label: "Karbohydrat (44 E%)",          unit: "g",    per100gPulver: "55",     per100mlUtblandet: "7,4" },
          { label: "– hvorav sukkerarter",         unit: "g",    per100gPulver: "2,0",    per100mlUtblandet: "0,27" },
          { label: "– hvorav laktose",             unit: "g",    per100gPulver: "<0,05",  per100mlUtblandet: "<0,01" },
          { label: "Kostfiber (1 E%)",             unit: "g",    per100gPulver: "1,1",    per100mlUtblandet: "0,15" },
          { label: "– lakto-N-neotetraose",        unit: "g",    per100gPulver: "0,37",   per100mlUtblandet: "0,05" },
          { label: "– 2’-fukosyllaktose",          unit: "g",    per100gPulver: "0,74",   per100mlUtblandet: "0,10" },
          { label: "Protein (11 E%)",              unit: "g",    per100gPulver: "14,0",   per100mlUtblandet: "1,9" },
          { label: "Salt",                         unit: "g",    per100gPulver: "0,63",   per100mlUtblandet: "0,084" },
          { label: "Forhold n6:n3",                unit: "",     per100gPulver: "8:1",    per100mlUtblandet: "8:1" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg", per100gPulver: "250",   per100mlUtblandet: "34" },
          { label: "Kalium",    unit: "mg", per100gPulver: "620",   per100mlUtblandet: "84" },
          { label: "Klorid",    unit: "mg", per100gPulver: "450",   per100mlUtblandet: "61" },
          { label: "Kalsium",   unit: "mg", per100gPulver: "530",   per100mlUtblandet: "71" },
          { label: "Fosfor",    unit: "mg", per100gPulver: "350",   per100mlUtblandet: "47" },
          { label: "Magnesium", unit: "mg", per100gPulver: "60",    per100mlUtblandet: "8,1" },
          { label: "Jern",      unit: "mg", per100gPulver: "5,2",   per100mlUtblandet: "0,70" },
          { label: "Sink",      unit: "mg", per100gPulver: "5,0",   per100mlUtblandet: "0,67" },
          { label: "Kobber",    unit: "mg", per100gPulver: "0,43",  per100mlUtblandet: "0,058" },
          { label: "Mangan",    unit: "mg", per100gPulver: "0,068", per100mlUtblandet: "0,0092" },
          { label: "Selen",     unit: "µg", per100gPulver: "26",    per100mlUtblandet: "3,5" },
          { label: "Jod",       unit: "µg", per100gPulver: "122",   per100mlUtblandet: "16" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg",         per100gPulver: "500",       per100mlUtblandet: "67" },
          { label: "Vitamin D",    unit: "µg",         per100gPulver: "12",        per100mlUtblandet: "1,7" },
          { label: "Vitamin E",    unit: "mg",         per100gPulver: "11",        per100mlUtblandet: "1,5" },
          { label: "Vitamin K",    unit: "µg",         per100gPulver: "45",        per100mlUtblandet: "6,1" },
          { label: "Vitamin C",    unit: "mg",         per100gPulver: "80",        per100mlUtblandet: "11" },
          { label: "Niacin",       unit: "mg (mg NE)", per100gPulver: "7,0 (13)",  per100mlUtblandet: "0,94 (1,8)" },
          { label: "Tiamin",       unit: "mg",         per100gPulver: "0,51",      per100mlUtblandet: "0,069" },
          { label: "Riboflavin",   unit: "mg",         per100gPulver: "1,0",       per100mlUtblandet: "0,13" },
          { label: "Vitamin B6",   unit: "mg",         per100gPulver: "0,40",      per100mlUtblandet: "0,054" },
          { label: "Folsyre",      unit: "µg",         per100gPulver: "75",        per100mlUtblandet: "10" },
          { label: "Folat",        unit: "µg DFE",     per100gPulver: "125",       per100mlUtblandet: "17" },
          { label: "Vitamin B12",  unit: "µg",         per100gPulver: "1,4",       per100mlUtblandet: "0,19" },
          { label: "Biotin",       unit: "µg",         per100gPulver: "12",        per100mlUtblandet: "1,6" },
          { label: "Pantotensyre", unit: "mg",         per100gPulver: "3,3",       per100mlUtblandet: "0,45" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "Taurin",       unit: "mg",           per100gPulver: "40",  per100mlUtblandet: "5,4" },
          { label: "L-karnitin",   unit: "mg",           per100gPulver: "8,5", per100mlUtblandet: "1,15" },
          { label: "Kolin",        unit: "mg",           per100gPulver: "145", per100mlUtblandet: "20" },
          { label: "Inositol",     unit: "mg",           per100gPulver: "35",  per100mlUtblandet: "4,7" },
          { label: "Nukleotider",  unit: "mg",           per100gPulver: "15",  per100mlUtblandet: "2,0" },
          { label: "Osmolaritet",  unit: "mOsm/l",       per100gPulver: "—",   per100mlUtblandet: "180" },
          { label: "Osmolalitet",  unit: "mOsm/kg H₂O",  per100gPulver: "—",   per100mlUtblandet: "200" },
        ],
      },
    ],
  },
  tilberedning: [
    "Bruk kokt vann og steriliserte flasker. Ukokt vann, usteriliserte flasker eller feilaktig blanding kan føre til sykdom.",
    "Mål opp vann i flasken etter doseringstabellen.",
    "Tilsett strøkne måleskjeer pulver. Bruk kun måleskjeen som følger med i forpakningen – en strøken måleskje gir 4,5 g.",
    "90 ml vann + 3 strøkne måleskjeer pulver gir 100 ml ferdig blanding.",
    "Tilbered kun én flaske om gangen. Ikke spar på gjenværende blanding i flasken – kast innholdet.",
  ],
  dosering: "Doseringstabellen er ment som en veiledning. Ansvarlig lege eller klinisk ernæringsfysiolog bør beregne passe døgninntak individuelt for hvert enkelt barn. En boks gir ca. 3,0 l ferdig blanding.",
  mixingInfo: { konsentrasjon: "13,5", scoopGram: "4,5" },
  mixingTable: [
    { skjeer: 3, pulver: "13,5", vann: 90, ferdig: 100, energi: 67 },
  ],
  doseringTabell: {
    tittel: "Dosering etter alder",
    kolonner: ["Alder", "Vann (ml)", "Måleskjeer", "Måltider/døgn", "Bokser/mnd"],
    rader: [
      ["0–2 uker", "90", "3", "6", "6"],
      ["2–4 uker", "120", "4", "5", "7"],
      ["1–2 måneder", "150", "5", "5", "9"],
      ["2–4 måneder", "180", "6", "5", "10"],
      ["4–6 måneder", "210", "7", "5", "12"],
      ["Over 6 måneder", "210", "7", "3–4", "7–10"],
    ],
  },
  holdbarhet: "Oppbevares svalt og tørt til best før dato. Åpnet forpakning brukes innen 3 uker. Tilbered kun 1 flaske om gangen. Ikke spar på gjenværende blanding i flasken. Kast innholdet.",
  ingredienser: "Maltodekstrin, ekstensivt hydrolysert myseprotein (melk), vegetabilske oljer (solsikke, raps, kokos), MCT-olje, stivelse, mineraler (kalsiumglyserofosfat, magnesiumklorid, kaliumfosfat, natriumfosfat, natriumklorid, kalsiumklorid, mangansulfat, kaliumjodid, jernsulfat, sinksulfat, natriumselenat, kaliumklorid, kobbersulfat), emulgator (E472c), fiber (2’-fukosyllaktose, lakto-N-neotetraose), olje fra Mortierella alpina (ARA), olje fra mikroalgen Schizochytrium sp. (DHA), surhetsregulerende middel (E330), vitaminer (C, E, niacin, pantotensyre, riboflavin, A, tiamin, B6, folsyre, K, D, biotin, B12), kolinbitartrat, aminosyrer (L-arginin, L-histidin), taurin, inositol, antioksidant (E307b, E304), nukleotider (cytidin 5’-monofosfat, uridin 5’-monofosfat, adenosin 5’-monofosfat, guanosin 5’-monofosfat), L-karnitin. Laktosefri. Glutenfri. Pakket i beskyttet atmosfære.",
  smaksvarianter: "Nøytral smak.",
  indikasjon: "Diettbehandling av spedbarn 0–12 måneder med gastrointestinale lidelser og matallergi eller intoleranse, for eksempel kumelkproteinallergi og malabsorpsjon (blant annet fettmalabsorpsjon). Egnet som eneste næringskilde fra fødselen og opp til 6 måneder.",
  kontraindikasjon: "Galaktosemi og glukose-galaktose-malabsorpsjon.",
  forsiktighetsregler: "Mødre skal oppmuntres til å fortsette amming selv om barnet har kumelkproteinallergi. Ved bruk av spesialnæring er det viktig å gi korrekte tilberedningsinstruksjoner: ukokt vann, usteriliserte flasker eller feilaktig blanding kan føre til sykdom. Skal brukes under medisinsk tilsyn. For helsepersonell.",
  bestilling: [
    { produktnavn: "Alfaré nøytral smak", bestillingsnr: "900694", varenr: "817598", salgsenhet: "1 x 400 g pulver" },
  ],
};

const ALFAMINO: Product = {
  id: "alfamino",
  manufacturer: "nestle",
  name: "Alfamino",
  age: "0–12 måneder",
  tagline: "Hypoallergen aminosyrebasert spesialnæring med humane melkeoligosakkarider (HMO) for spedbarn med alvorlig matallergi.",
  description: "Inneholder MCT-fett, strukturerte lipider samt 2’FL og LNnT (ikke fra morsmelk). Spesielt tilpasset diettbehandling av spedbarn med alvorlig matallergi.",
  image: "/nutrition/alfamino.jpg",
  thumb: "/nutrition/thumbs/alfamino.png",
  imageScale: 1,
  type: "Aminosyrebasert",
  badges: [
    { label: "Aminosyrebasert",                       color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett 0–12 måneder", color: "#4ADE80", icon: "shield" },
    { label: "Glutenfri",                             color: "#4ADE80", icon: "shield" },
    { label: "Laktosefri",                            color: "#EA580C", icon: "gut"    },
    { label: "Med HMO",                               color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                         color: "#D97706", icon: "drop"   },
    { label: "Med MCT",                               color: "#D97706", icon: "drop"   },
    { label: "Med strukturerte lipider",              color: "#A78BFA", icon: "star"   },
    { label: "Halalsertifisert",                      color: "#D97706", icon: "star"   },
  ],
  summary: [
    { label: "Alder",         value: "0–12 måneder" },
    { label: "Energitetthet", value: "0,66 kcal/ml" },
    { label: "Protein",       value: "100 % frie aminosyrer" },
    { label: "Kostfiber",     value: "HMO (0,15 g/100 ml)" },
    { label: "Halal",         value: "Ja" },
    { label: "Laktose",       value: "Nei" },
  ],
  fordeler: [
    "Klinisk bevist hypoallergen spesialnæring.",
    "Basert på 100 % frie aminosyrer – helt fri for proteiner og peptider fra melk og soya.",
    "Oligosakkaridene 2’FL og LNnT er strukturelt identiske med tilsvarende HMO i morsmelk, og har vist seg å øke mengden bifidobakterier og produksjonen av korte fettsyrer.",
    "24 % lettabsorbert MCT-fett for god toleranse, og 4,5 % strukturerte lipider for godt fettopptak.",
    "LC-PUFA (DHA:ARA-forhold 1:1) for normal utvikling av hjerne, syn og immunforsvar.",
    "Nøytral og mild smak.",
  ],
  fordelerIcons: [ICON_SHIELD_STAR, ICON_DROP, ICON_GUT2, ICON_MILK_BOTTLE, ICON_DROP, ICON_MILK_BOTTLE],
  bruksomraader: [
    "Næringsmessig fullverdig næringsmiddel til spesielle medisinske formål for spedbarn 0–12 måneder med alvorlig matallergi.",
    "Egnet som eneste næringskilde fra fødselen og opptil 6 måneder. Fra 6 måneder suppleres Alfamino med melkefri kost i kombinasjon med introduksjon av fast føde.",
    "Over 1 års alder anbefales det å bytte til Alfamino Junior, som er spesielt tilpasset barn fra 1 år.",
  ],
  fodmap: { laktose: "<0,01 g", gos: false, fos: false },
  viktigAVite: [
    "Mødre skal oppmuntres til å fortsette amming selv om barnet har kumelkproteinallergi.",
    "Ukokt vann, usteriliserte flasker eller feilaktig blanding kan føre til sykdom.",
    "Skal brukes under medisinsk tilsyn.",
    "Kan foreskrives på blå resept.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",                icon: null },
    { label: "Laktosefri",               icon: null },
    { label: "Halalsertifisert",         icon: null },
    { label: "Med HMO",                  icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  kcalPer100ml: 66,
  pulverPer100ml: "13,2 g pulver",
  macros: [
    { label: "Fett (44 E%)",                value: 44, color: "#7C3AED", amount: "3,3 g" },
    { label: "Karbohydrat (44 E%)",         value: 44, color: "#F97316", amount: "7,3 g" },
    { label: "Proteinekvivalent (11 E%)",   value: 11, color: "#3B82F6", amount: "1,8 g" },
    { label: "Kostfiber (1 E%)",            value: 1,  color: "#22C55E", amount: "0,15 g" },
  ],
  nokkel: [
    { label: "Laktose",      value: "<0,01 g"    },
    { label: "MCT",          value: "0,80 g"     },
    { label: "HMO",          value: "0,15 g"     },
    { label: "DHA",          value: "18 mg"      },
    { label: "ARA",          value: "18 mg"      },
    { label: "Kalsium",      value: "70 mg"      },
    { label: "Osmolaritet",  value: "299 mOsm/l" },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml utblandet (13,2 g pulver)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                       unit: "kJ",   per100gPulver: "2083",   per100mlUtblandet: "277" },
          { label: "Energi (kcal)",                     unit: "kcal", per100gPulver: "497",    per100mlUtblandet: "66" },
          { label: "Fett (44 E%)",                      unit: "g",    per100gPulver: "24,6",   per100mlUtblandet: "3,3" },
          { label: "– hvorav mettet",                   unit: "g",    per100gPulver: "8,5",    per100mlUtblandet: "1,1" },
          { label: "– MCT",                             unit: "g",    per100gPulver: "6,0",    per100mlUtblandet: "0,80" },
          { label: "– palmitinsyre i sn-2-posisjon",    unit: "g",    per100gPulver: "0,55",   per100mlUtblandet: "0,070" },
          { label: "– hvorav enumettet",                unit: "g",    per100gPulver: "9,4",    per100mlUtblandet: "1,2" },
          { label: "– hvorav flerumettet",              unit: "g",    per100gPulver: "5,2",    per100mlUtblandet: "0,69" },
          { label: "– α-linolensyre",                   unit: "mg",   per100gPulver: "400",    per100mlUtblandet: "53" },
          { label: "– linolsyre",                       unit: "mg",   per100gPulver: "4000",   per100mlUtblandet: "532" },
          { label: "– DHA",                             unit: "mg",   per100gPulver: "135",    per100mlUtblandet: "18" },
          { label: "– ARA",                             unit: "mg",   per100gPulver: "135",    per100mlUtblandet: "18" },
          { label: "Forhold n6:n3",                     unit: "",     per100gPulver: "9:1",    per100mlUtblandet: "9:1" },
          { label: "Karbohydrat (44 E%)",               unit: "g",    per100gPulver: "55,2",   per100mlUtblandet: "7,3" },
          { label: "– hvorav sukkerarter",              unit: "g",    per100gPulver: "4,0",    per100mlUtblandet: "0,53" },
          { label: "– hvorav laktose",                  unit: "g",    per100gPulver: "<0,05",  per100mlUtblandet: "<0,01" },
          { label: "Kostfiber (1 E%)",                  unit: "g",    per100gPulver: "1,1",    per100mlUtblandet: "0,15" },
          { label: "– lakto-N-neotetraose",             unit: "g",    per100gPulver: "0,38",   per100mlUtblandet: "0,050" },
          { label: "– 2’-fukosyllaktose",               unit: "g",    per100gPulver: "0,75",   per100mlUtblandet: "0,10" },
          { label: "Proteinekvivalent (11 E%)",         unit: "g",    per100gPulver: "13,3*",  per100mlUtblandet: "1,8*" },
          { label: "Salt",                              unit: "g",    per100gPulver: "0,49",   per100mlUtblandet: "0,065" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg", per100gPulver: "195",   per100mlUtblandet: "26" },
          { label: "Kalium",    unit: "mg", per100gPulver: "570",   per100mlUtblandet: "76" },
          { label: "Klorid",    unit: "mg", per100gPulver: "420",   per100mlUtblandet: "56" },
          { label: "Kalsium",   unit: "mg", per100gPulver: "530",   per100mlUtblandet: "70" },
          { label: "Fosfor",    unit: "mg", per100gPulver: "350",   per100mlUtblandet: "47" },
          { label: "Magnesium", unit: "mg", per100gPulver: "45",    per100mlUtblandet: "6,0" },
          { label: "Jern",      unit: "mg", per100gPulver: "5,0",   per100mlUtblandet: "0,66" },
          { label: "Sink",      unit: "mg", per100gPulver: "5,0",   per100mlUtblandet: "0,66" },
          { label: "Kobber",    unit: "mg", per100gPulver: "0,43",  per100mlUtblandet: "0,057" },
          { label: "Mangan",    unit: "mg", per100gPulver: "0,068", per100mlUtblandet: "0,0090" },
          { label: "Selen",     unit: "µg", per100gPulver: "26",    per100mlUtblandet: "3,5" },
          { label: "Jod",       unit: "µg", per100gPulver: "110",   per100mlUtblandet: "15" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg",         per100gPulver: "500",       per100mlUtblandet: "66" },
          { label: "Vitamin D",    unit: "µg",         per100gPulver: "12",        per100mlUtblandet: "1,7" },
          { label: "Vitamin E",    unit: "mg",         per100gPulver: "11",        per100mlUtblandet: "1,5" },
          { label: "Vitamin K",    unit: "µg",         per100gPulver: "45",        per100mlUtblandet: "6,0" },
          { label: "Vitamin C",    unit: "mg",         per100gPulver: "80",        per100mlUtblandet: "11" },
          { label: "Niacin",       unit: "mg (mg NE)", per100gPulver: "7,0 (12)",  per100mlUtblandet: "0,93 (1,6)" },
          { label: "Tiamin",       unit: "mg",         per100gPulver: "0,51",      per100mlUtblandet: "0,068" },
          { label: "Riboflavin",   unit: "mg",         per100gPulver: "1,0",       per100mlUtblandet: "0,13" },
          { label: "Vitamin B6",   unit: "mg",         per100gPulver: "0,40",      per100mlUtblandet: "0,053" },
          { label: "Folsyre",      unit: "µg",         per100gPulver: "75",        per100mlUtblandet: "10" },
          { label: "Folat",        unit: "µg DFE",     per100gPulver: "125",       per100mlUtblandet: "17" },
          { label: "Vitamin B12",  unit: "µg",         per100gPulver: "1,5",       per100mlUtblandet: "0,20" },
          { label: "Biotin",       unit: "µg",         per100gPulver: "12",        per100mlUtblandet: "1,6" },
          { label: "Pantotensyre", unit: "mg",         per100gPulver: "3,3",       per100mlUtblandet: "0,44" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "Taurin",       unit: "mg",           per100gPulver: "40",  per100mlUtblandet: "5,3" },
          { label: "L-karnitin",   unit: "mg",           per100gPulver: "8,5", per100mlUtblandet: "1,1" },
          { label: "Kolin",        unit: "mg",           per100gPulver: "145", per100mlUtblandet: "19" },
          { label: "Inositol",     unit: "mg",           per100gPulver: "35",  per100mlUtblandet: "4,7" },
          { label: "Osmolaritet",  unit: "mOsm/l",       per100gPulver: "—",   per100mlUtblandet: "299" },
          { label: "Osmolalitet",  unit: "mOsm/kg H₂O",  per100gPulver: "—",   per100mlUtblandet: "333" },
        ],
      },
    ],
  },
  tilberedning: [
    "Bruk kokt vann og steriliserte flasker. Ukokt vann, usteriliserte flasker eller feilaktig blanding kan føre til sykdom.",
    "Mål opp vann i flasken etter doseringstabellen.",
    "Tilsett strøkne måleskjeer pulver. Bruk kun måleskjeen som medfølger i forpakningen – en strøken måleskje gir 4,4 g.",
    "90 ml vann + 3 strøkne måleskjeer pulver gir 100 ml ferdig blanding.",
    "Tilbered kun én flaske om gangen. Ikke spar på gjenværende blanding i flasken – kast innholdet.",
  ],
  dosering: "Doseringstabellen er ment som en veiledning. Ansvarlig lege/klinisk ernæringsfysiolog bør beregne egnet mengde som er tilpasset individuelt for hvert enkelt barn. En boks gir ca. 3,0 l ferdig blanding.",
  mixingInfo: { konsentrasjon: "13,2", scoopGram: "4,4" },
  mixingTable: [
    { skjeer: 3, pulver: "13,2", vann: 90, ferdig: 100, energi: 66 },
  ],
  doseringTabell: {
    tittel: "Dosering etter alder",
    kolonner: ["Alder", "Vann (ml)", "Måleskjeer", "Måltider/døgn", "Bokser/mnd"],
    rader: [
      ["0–2 uker", "90", "3", "6", "6"],
      ["2–4 uker", "120", "4", "5", "7"],
      ["1–2 måneder", "150", "5", "5", "8–9"],
      ["2–4 måneder", "180", "6", "5", "10"],
      ["4–6 måneder", "210", "7", "5", "12"],
      ["Over 6 måneder", "210", "7", "3–4", "7–10"],
    ],
  },
  holdbarhet: "Oppbevares svalt og tørt til best før dato. Åpnet forpakning brukes innen 3 uker. Tilbered kun 1 flaske om gangen. Ikke spar på gjenværende blanding i flasken. Kast innholdet.",
  ingredienser: "Glukosesirup, vegetabilske oljer (solsikke, raps, strukturert palmeolje), aminosyrer (L-lysinacetat, L-leucin, L-prolin, L-glutamin, L-arginin, L-valin, glycin, L-isoleucin, L-treonin, L-serin, L-fenylalanin, L-tyrosin, L-asparaginsyre, L-histidin, L-alanin, L-cystin, magnesium L-aspartat, L-tryptofan, L-metionin), MCT-olje, stivelse, mineraler (kalsiumglyserofosfat, kaliumklorid, natriumsitrat, kalsiumsitrat, kaliumsitrat, natriumfosfat, magnesiumoksid, jernsulfat, sinksulfat, kobbersulfat, mangansulfat, kaliumjodid, natriumselenat), emulgator (E472c), fiber (2’-fukosyllaktose, lakto-N-neotetraose), olje fra Mortierella alpina (ARA), olje fra mikroalgen Schizochytrium sp. (DHA), kolinbitartrat, vitaminer (C, E, niacin, pantotensyre, riboflavin, A, tiamin, B6, folsyre, K, D, biotin, B12), surhetsregulerende middel (E330), taurin, inositol, L-karnitin. Glutenfri. Laktosefri. Pakket i beskyttet atmosfære. Halal-sertifisert.",
  smaksvarianter: "Nøytral smak.",
  indikasjon: "Diettbehandling av spedbarn 0–12 måneder med alvorlig matallergi. Egnet som eneste næringskilde fra fødselen og opptil 6 måneder.",
  kontraindikasjon: "Galaktosemi og glukose-galaktose-malabsorpsjon.",
  forsiktighetsregler: "Mødre skal oppmuntres til å fortsette amming selv om barnet har kumelkproteinallergi. Ved bruk av spesialnæring er det viktig å gi korrekte tilberedningsinstruksjoner: ukokt vann, usteriliserte flasker eller feilaktig blanding kan føre til sykdom. Skal brukes under medisinsk tilsyn. Kun for helsepersonell.",
  bestilling: [
    { produktnavn: "Alfamino nøytral smak", bestillingsnr: "900693", varenr: "811637", salgsenhet: "1 x 400 g pulver" },
  ],
};

const ALFAMINO_JUNIOR: Product = {
  id: "alfamino-junior",
  manufacturer: "nestle",
  name: "Alfamino Junior",
  age: "Fra 1 år",
  tagline: "Hypoallergen aminosyrebasert spesialnæring med humane melkeoligosakkarider (HMO) for barn fra 1 år med alvorlig matallergi.",
  description: "Inneholder MCT-fett, strukturerte lipider samt 2’FL og LNnT (ikke fra morsmelk). Kan drikkes som kosttilskudd, brukes som berikning, eller gis som eneste ernæring/sondeløsning. Kan også brukes som erstatning i mat og ved baking.",
  image: "/nutrition/alfamino-junior.jpg",
  thumb: "/nutrition/thumbs/alfamino-junior.png",
  imageScale: 1,
  type: "Aminosyrebasert",
  badges: [
    { label: "Aminosyrebasert",                   color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett fra 1 år", color: "#4ADE80", icon: "shield" },
    { label: "Glutenfri",                         color: "#4ADE80", icon: "shield" },
    { label: "Med HMO",                           color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                     color: "#D97706", icon: "drop"   },
    { label: "Med MCT",                           color: "#D97706", icon: "drop"   },
    { label: "Med strukturerte lipider",          color: "#A78BFA", icon: "star"   },
    { label: "Halalsertifisert",                  color: "#D97706", icon: "star"   },
  ],
  summary: [
    { label: "Alder",         value: "Fra 1 år" },
    { label: "Energitetthet", value: "1,05 kcal/ml" },
    { label: "Protein",       value: "100 % frie aminosyrer" },
    { label: "Kostfiber",     value: "HMO (0,048 g/100 ml)" },
    { label: "Halal",         value: "Ja" },
    { label: "Laktose",       value: "<0,011 g/100 ml" },
  ],
  fordeler: [
    "Klinisk bevist hypoallergen spesialnæring.",
    "Basert på 100 % frie aminosyrer – helt fri for proteiner og peptider fra melk og soya.",
    "Balansert aminosyreprofil i konsentrasjoner som fremmer tilvekst og utvikling hos barn med kumelkproteinallergi.",
    "2’FL og LNnT er strukturelt identiske med HMO i morsmelk, og har vist seg å øke mengden bifidobakterier og produksjonen av korte fettsyrer.",
    "24 % lettabsorbert MCT-fett for god toleranse, og strukturerte lipider for godt fettopptak.",
    "LC-PUFA (DHA:ARA-forhold 1:1) for normal utvikling av hjerne, syn og immunforsvar.",
    "Nøytral og mild smak for økt compliance.",
  ],
  fordelerIcons: [ICON_SHIELD_STAR, ICON_DROP, ICON_MILK_BOTTLE, ICON_GUT2, ICON_MILK_BOTTLE, ICON_DROP, ICON_SHIELD_STAR],
  bruksomraader: [
    "Kostholdsbehandling for barn med kumelkproteinallergi, soyaallergi, multiple matallergier og andre tilstander der spesialnæring anbefales.",
    "Ernæringsmessig fullverdig og beregnet for barn fra 1 til 13 år. Egnet som eneste næringskilde.",
    "Kan drikkes som kosttilskudd, brukes som berikning, gis som eneste ernæring/sondeløsning, eller brukes som erstatning i mat og ved baking.",
  ],
  fodmap: { laktose: "<0,011 g", gos: false, fos: false },
  viktigAVite: [
    "Skal brukes under medisinsk tilsyn.",
    "Ikke for parenteralt (i.v.) bruk.",
    "Ikke tilsett annen type mat eller legemidler dersom produktet gis via sonde.",
    "Åpnet forpakning brukes innen 4 uker.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",                icon: null },
    { label: "Halalsertifisert",         icon: null },
    { label: "Med HMO",                  icon: null },
    { label: "Med DHA & ARA",            icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  kcalPer100ml: 105,
  pulverPer100ml: "21,8 g pulver",
  macros: [
    { label: "Fett (41 E%)",              value: 41, color: "#7C3AED", amount: "4,8 g" },
    { label: "Karbohydrat (48 E%)",       value: 48, color: "#F97316", amount: "13 g" },
    { label: "Proteinekvivalent (11 E%)", value: 11, color: "#3B82F6", amount: "3,0 g" },
    { label: "Kostfiber (0 E%)",          value: 0,  color: "#22C55E", amount: "0,048 g" },
  ],
  nokkel: [
    { label: "Laktose",      value: "<0,011 g"   },
    { label: "MCT",          value: "1,1 g"      },
    { label: "HMO",          value: "0,048 g"    },
    { label: "DHA",          value: "17 mg"      },
    { label: "ARA",          value: "17 mg"      },
    { label: "Kalsium",      value: "106 mg"     },
    { label: "Osmolaritet",  value: "474 mOsm/l" },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml tilberedt (21,8 g pulver + 84 ml vann)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                       unit: "kJ",   per100gPulver: "2031",    per100mlUtblandet: "443" },
          { label: "Energi (kcal)",                     unit: "kcal", per100gPulver: "485",     per100mlUtblandet: "105" },
          { label: "Fett (41 E%)",                      unit: "g",    per100gPulver: "22",      per100mlUtblandet: "4,8" },
          { label: "– hvorav mettet",                   unit: "g",    per100gPulver: "7,5",     per100mlUtblandet: "1,6" },
          { label: "– MCT",                             unit: "g",    per100gPulver: "5,3",     per100mlUtblandet: "1,1" },
          { label: "– palmitinsyre i sn-2-posisjon",    unit: "g",    per100gPulver: "0,50",    per100mlUtblandet: "0,11" },
          { label: "– hvorav enumettet",                unit: "g",    per100gPulver: "8,2",     per100mlUtblandet: "1,8" },
          { label: "– hvorav flerumettet",              unit: "g",    per100gPulver: "4,7",     per100mlUtblandet: "1,0" },
          { label: "– α-linolensyre",                   unit: "mg",   per100gPulver: "360",     per100mlUtblandet: "78" },
          { label: "– linolsyre",                       unit: "mg",   per100gPulver: "3600",    per100mlUtblandet: "785" },
          { label: "– DHA",                             unit: "mg",   per100gPulver: "80",      per100mlUtblandet: "17" },
          { label: "– ARA",                             unit: "mg",   per100gPulver: "80",      per100mlUtblandet: "17" },
          { label: "Karbohydrat (48 E%)",               unit: "g",    per100gPulver: "57,9",    per100mlUtblandet: "13" },
          { label: "– hvorav sukkerarter",              unit: "g",    per100gPulver: "4,5",     per100mlUtblandet: "0,98" },
          { label: "– hvorav laktose",                  unit: "g",    per100gPulver: "<0,050",  per100mlUtblandet: "<0,011" },
          { label: "Kostfiber (0 E%)",                  unit: "g",    per100gPulver: "0,22",    per100mlUtblandet: "0,048" },
          { label: "– lakto-N-neotetraose",             unit: "g",    per100gPulver: "0,075",   per100mlUtblandet: "0,016" },
          { label: "– 2’-fukosyllaktose",               unit: "g",    per100gPulver: "0,15",    per100mlUtblandet: "0,032" },
          { label: "Proteinekvivalent (11 E%)",         unit: "g",    per100gPulver: "13,8*",   per100mlUtblandet: "3,0*" },
          { label: "Salt",                              unit: "g",    per100gPulver: "0,50",    per100mlUtblandet: "0,11" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg", per100gPulver: "200",  per100mlUtblandet: "44" },
          { label: "Kalium",    unit: "mg", per100gPulver: "631",  per100mlUtblandet: "138" },
          { label: "Klorid",    unit: "mg", per100gPulver: "410",  per100mlUtblandet: "89" },
          { label: "Kalsium",   unit: "mg", per100gPulver: "485",  per100mlUtblandet: "106" },
          { label: "Fosfor",    unit: "mg", per100gPulver: "320",  per100mlUtblandet: "70" },
          { label: "Magnesium", unit: "mg", per100gPulver: "96",   per100mlUtblandet: "21" },
          { label: "Jern",      unit: "mg", per100gPulver: "7,7",  per100mlUtblandet: "1,7" },
          { label: "Sink",      unit: "mg", per100gPulver: "3,3",  per100mlUtblandet: "0,72" },
          { label: "Kobber",    unit: "mg", per100gPulver: "0,39", per100mlUtblandet: "0,085" },
          { label: "Mangan",    unit: "mg", per100gPulver: "0,41", per100mlUtblandet: "0,089" },
          { label: "Selen",     unit: "µg", per100gPulver: "25",   per100mlUtblandet: "5,4" },
          { label: "Jod",       unit: "µg", per100gPulver: "53",   per100mlUtblandet: "12" },
          { label: "Krom",      unit: "µg", per100gPulver: "18",   per100mlUtblandet: "3,9" },
          { label: "Molybden",  unit: "µg", per100gPulver: "27",   per100mlUtblandet: "5,9" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg RE",      per100gPulver: "275",       per100mlUtblandet: "60" },
          { label: "Vitamin D",    unit: "µg",         per100gPulver: "9,2",       per100mlUtblandet: "2,0" },
          { label: "Vitamin E",    unit: "mg",         per100gPulver: "6,9",       per100mlUtblandet: "1,5" },
          { label: "Vitamin K",    unit: "µg",         per100gPulver: "30",        per100mlUtblandet: "6,5" },
          { label: "Vitamin C",    unit: "mg",         per100gPulver: "27",        per100mlUtblandet: "5,9" },
          { label: "Niacin",       unit: "mg (mg NE)", per100gPulver: "3,8 (9,5)", per100mlUtblandet: "0,83 (2,1)" },
          { label: "Tiamin",       unit: "mg",         per100gPulver: "0,48",      per100mlUtblandet: "0,10" },
          { label: "Riboflavin",   unit: "mg",         per100gPulver: "0,80",      per100mlUtblandet: "0,17" },
          { label: "Vitamin B6",   unit: "mg",         per100gPulver: "0,48",      per100mlUtblandet: "0,10" },
          { label: "Folsyre",      unit: "µg",         per100gPulver: "99",        per100mlUtblandet: "21" },
          { label: "Vitamin B12",  unit: "µg",         per100gPulver: "1,4",       per100mlUtblandet: "0,30" },
          { label: "Biotin",       unit: "µg",         per100gPulver: "15",        per100mlUtblandet: "3,3" },
          { label: "Pantotensyre", unit: "mg",         per100gPulver: "2,2",       per100mlUtblandet: "0,48" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "Taurin",       unit: "mg",           per100gPulver: "17",  per100mlUtblandet: "3,7" },
          { label: "L-karnitin",   unit: "mg",           per100gPulver: "17",  per100mlUtblandet: "3,7" },
          { label: "Kolin",        unit: "mg",           per100gPulver: "165", per100mlUtblandet: "36" },
          { label: "Inositol",     unit: "mg",           per100gPulver: "21",  per100mlUtblandet: "4,6" },
          { label: "Osmolaritet",  unit: "mOsm/l",       per100gPulver: "—",   per100mlUtblandet: "474" },
          { label: "Osmolalitet",  unit: "mOsm/kg H₂O",  per100gPulver: "—",   per100mlUtblandet: "565" },
        ],
      },
    ],
  },
  tilberedning: [
    "Mål opp vann etter doseringstabellen.",
    "Tilsett strøkne måleskjeer pulver. Bruk kun måleskjeen som medfølger i forpakningen – en strøken måleskje gir 5,2 g.",
    "100 ml ferdig blanding tilsvarer 21,8 g pulver + 84 ml vann.",
    "Tilbered kun én flaske ad gangen. Ikke spar på gjenværende blanding i flasken – kast innholdet.",
    "Ikke tilsett annen type mat eller legemidler dersom produktet gis via sonde.",
  ],
  dosering: "Egnet som eneste næringskilde. Doseringstabellen er ment som en veiledning. Behandlende lege bør beregne egnet døgninntak individuelt for hvert enkelt barn. En boks tilsvarer ca. 1,8 l ferdig blanding.",
  mixingInfo: { konsentrasjon: "21,8", scoopGram: "5,2", anbefaltSkjeer: 8 },
  mixingTable: [
    { skjeer: 6,  pulver: "31,2", vann: 125, ferdig: 150,  energi: 150 },
    { skjeer: 8,  pulver: "41,6", vann: 170, ferdig: 200,  energi: 200 },
    { skjeer: 12, pulver: "62,4", vann: 250, ferdig: 300,  energi: 300 },
    { skjeer: 21, pulver: "109",  vann: 420, ferdig: 500,  energi: 500 },
    { skjeer: 42, pulver: "218",  vann: 840, ferdig: 1000, energi: 1000 },
  ],
  holdbarhet: "Oppbevares svalt og tørt og brukes innen best før dato. Åpnet forpakning brukes innen 4 uker. Tilbered kun én flaske ad gangen. Ikke spar på gjenværende blanding i flasken, kast innholdet.",
  ingredienser: "Glukosesirup, aminosyrer (L-lysin, L-leucin, L-glutamin, L-prolin, L-arginin, L-valin, glycin, L-isoleucin, L-treonin, L-serin, L-fenylalanin, L-tyrosin, L-asparaginsyre, L-histidin, L-alanin, L-cystin, magnesium-L-aspartat, L-tryptofan, L-metionin), vegetabilske oljer (solsikkeolje, rapsolje, strukturert palmeolje), mineraler (kalsiumglyserofosfat, kaliumsitrat, kaliumklorid, kalsiumsitrat, natriumsitrat, natriumfosfat, magnesiumoksid, jernsulfat, sinksulfat, mangansulfat, kobbersulfat, kaliumjodid, natriummolybdat, natriumselenat, kromklorid), MCT-olje, stivelse, emulgeringsmiddel (E472c), kolinbitartrat, fiber (2’-fukosyllaktose, lakto-N-neotetraose), olje fra Mortierella alpina (ARA), olje fra mikroalgen Schizochytrium sp. (DHA), surhetsregulerende middel (E330), vitaminer (C, E, niacin, pantotensyre, riboflavin, B6, tiamin, A, folsyre, K, biotin, D, B12), inositol, taurin, L-karnitin. Glutenfri. Pakket i beskyttet atmosfære. Halal-sertifisert.",
  smaksvarianter: "Nøytral smak.",
  indikasjon: "Kostholdsbehandling for barn fra 1 år med kumelkproteinallergi, soyaallergi, multiple matallergier og andre tilstander der spesialnæring anbefales.",
  kontraindikasjon: "Galaktosemi og glukose-galaktose-malabsorpsjon.",
  forsiktighetsregler: "Skal brukes under medisinsk tilsyn. Ikke for parenteralt (i.v.) bruk. Ikke tilsett annen type mat eller legemidler dersom produktet gis via sonde. Kun for helsepersonell.",
  bestilling: [
    { produktnavn: "Alfamino Junior nøytral smak", bestillingsnr: "999720", varenr: "917508", salgsenhet: "1 x 400 g pulver" },
  ],
};

const NUTRAMIGEN_1: Product = {
  id: "nutramigen-1",
  manufacturer: "mead",
  name: "Nutramigen 1",
  age: "0–6 måneder",
  tagline: "Hypoallergen spesialnæring til kostholdsbehandling av kumelkproteinallergi.",
  description: "Ernæringsmessig fullverdig og spesialutviklet for spedbarn med kumelkproteinallergi. Basert på høygradig hydrolysert kaseinprotein. Laktosefri.",
  image: "/nutrition/nutramigen-1.jpg",
  thumb: "/nutrition/thumbs/nutramigen-1.png",
  imageScale: 1,
  type: "Hydrolysert",
  badges: [
    { label: "Hydrolysert",                          color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett 0–6 måneder", color: "#4ADE80", icon: "shield" },
    { label: "Laktosefri",                           color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                        color: "#D97706", icon: "drop"   },
  ],
  summary: [
    { label: "Alder",         value: "0–6 måneder" },
    { label: "Energitetthet", value: "0,68 kcal/ml" },
    { label: "Protein",       value: "Høygradig hydrolysert kasein" },
    { label: "Laktose",       value: "Nei" },
  ],
  fordeler: [
    "Effektiv og veldokumentert.",
    "Laktosefri.",
    "Dekker daglig næringsbehov frem til ca. 6 måneders alder, før overgang til Nutramigen 2.",
  ],
  fordelerIcons: [ICON_SHIELD_STAR, ICON_GUT2, ICON_MILK_BOTTLE],
  bruksomraader: [
    "Ernæringsmessig fullverdig og spesialutviklet for spedbarn med kumelkproteinallergi.",
    "Ivaretar daglig næringsbehov frem til ca. 6 måneders alder. Da anbefales det å gå over til Nutramigen 2, som er tilpasset fra ca. 6 måneder og fremover.",
  ],
  fodmap: { laktose: "0 g", gos: false, fos: false },
  viktigAVite: [
    "Morsmelk er spedbarnets beste føde. Bruk av morsmelkerstatning kan minske tilgangen til morsmelk.",
    "Det er svært viktig å følge tilberedningsinstruksjonene. Feil håndtering kan påvirke barnets helse.",
    "Skal brukes under medisinsk tilsyn.",
    "Skal ikke gis parenteralt.",
  ],
  hurtiginfo: [
    { label: "Laktosefri",               icon: null },
    { label: "Med DHA & ARA",            icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  kcalPer100ml: 68,
  pulverPer100ml: "13,5 g pulver",
  macros: [
    { label: "Fett",         value: 45, color: "#7C3AED", amount: "3,4 g" },
    { label: "Karbohydrat",  value: 44, color: "#F97316", amount: "7,4 g" },
    { label: "Protein",      value: 11, color: "#3B82F6", amount: "1,88 g" },
  ],
  nokkel: [
    { label: "Laktose",      value: "Laktosefri" },
    { label: "DHA",          value: "15,5 mg"    },
    { label: "ARA",          value: "19,5 mg"    },
    { label: "Kalsium",      value: "76 mg"      },
    { label: "Jern",         value: "1,21 mg"    },
    { label: "Vitamin D",    value: "1,68 µg"    },
    { label: "Osmolaritet",  value: "270 mOsm/l" },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml ferdig blanding"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                unit: "kJ",   per100gPulver: "2098",  per100mlUtblandet: "284" },
          { label: "Energi (kcal)",              unit: "kcal", per100gPulver: "501",   per100mlUtblandet: "68" },
          { label: "Fett",                       unit: "g",    per100gPulver: "25",    per100mlUtblandet: "3,4" },
          { label: "– hvorav mettede fettsyrer", unit: "g",    per100gPulver: "10",    per100mlUtblandet: "1,35" },
          { label: "– linolsyre",                unit: "g",    per100gPulver: "4",     per100mlUtblandet: "0,54" },
          { label: "– α-linolensyre",            unit: "mg",   per100gPulver: "350",   per100mlUtblandet: "47" },
          { label: "– arakidonsyre (ARA)",       unit: "mg",   per100gPulver: "145",   per100mlUtblandet: "19,5" },
          { label: "– dokosaheksaensyre (DHA)",  unit: "mg",   per100gPulver: "115",   per100mlUtblandet: "15,5" },
          { label: "Karbohydrat",                unit: "g",    per100gPulver: "55",    per100mlUtblandet: "7,4" },
          { label: "– hvorav sukkerarter",       unit: "g",    per100gPulver: "5,7",   per100mlUtblandet: "0,77" },
          { label: "Protein",                    unit: "g",    per100gPulver: "14",    per100mlUtblandet: "1,88" },
          { label: "Salt",                       unit: "g",    per100gPulver: "0,6",   per100mlUtblandet: "0,08" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg", per100gPulver: "240",   per100mlUtblandet: "32" },
          { label: "Kalium",    unit: "mg", per100gPulver: "610",   per100mlUtblandet: "82" },
          { label: "Klorid",    unit: "mg", per100gPulver: "480",   per100mlUtblandet: "65" },
          { label: "Kalsium",   unit: "mg", per100gPulver: "570",   per100mlUtblandet: "76" },
          { label: "Fosfor",    unit: "mg", per100gPulver: "390",   per100mlUtblandet: "52" },
          { label: "Magnesium", unit: "mg", per100gPulver: "38",    per100mlUtblandet: "5" },
          { label: "Jern",      unit: "mg", per100gPulver: "9",     per100mlUtblandet: "1,21" },
          { label: "Sink",      unit: "mg", per100gPulver: "3,5",   per100mlUtblandet: "0,47" },
          { label: "Kobber",    unit: "mg", per100gPulver: "0,38",  per100mlUtblandet: "0,05" },
          { label: "Mangan",    unit: "mg", per100gPulver: "0,085", per100mlUtblandet: "0,011" },
          { label: "Selen",     unit: "µg", per100gPulver: "17,5",  per100mlUtblandet: "2,4" },
          { label: "Krom",      unit: "µg", per100gPulver: "11",    per100mlUtblandet: "1,48" },
          { label: "Molybden",  unit: "µg", per100gPulver: "28",    per100mlUtblandet: "3,8" },
          { label: "Jod",       unit: "µg", per100gPulver: "115",   per100mlUtblandet: "15,5" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg RE",     per100gPulver: "450",  per100mlUtblandet: "61" },
          { label: "Vitamin D",    unit: "µg",        per100gPulver: "12,5", per100mlUtblandet: "1,68" },
          { label: "Vitamin E",    unit: "mg α-TE",   per100gPulver: "4,5",  per100mlUtblandet: "0,61" },
          { label: "Vitamin K",    unit: "µg",        per100gPulver: "65",   per100mlUtblandet: "8,7" },
          { label: "Vitamin C",    unit: "mg",        per100gPulver: "60",   per100mlUtblandet: "8,1" },
          { label: "Tiamin",       unit: "mg",        per100gPulver: "0,4",  per100mlUtblandet: "0,054" },
          { label: "Riboflavin",   unit: "mg",        per100gPulver: "0,45", per100mlUtblandet: "0,061" },
          { label: "Niacin",       unit: "mg",        per100gPulver: "5",    per100mlUtblandet: "0,67" },
          { label: "Vitamin B6",   unit: "mg",        per100gPulver: "0,3",  per100mlUtblandet: "0,04" },
          { label: "Folat",        unit: "µg DFE",    per100gPulver: "135",  per100mlUtblandet: "18,2" },
          { label: "Folsyre",      unit: "µg",        per100gPulver: "80",   per100mlUtblandet: "10,8" },
          { label: "Vitamin B12",  unit: "µg",        per100gPulver: "1,5",  per100mlUtblandet: "0,2" },
          { label: "Biotin",       unit: "µg",        per100gPulver: "15",   per100mlUtblandet: "2" },
          { label: "Pantotensyre", unit: "mg",        per100gPulver: "2,5",  per100mlUtblandet: "0,34" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "Kolin",        unit: "mg",      per100gPulver: "165",  per100mlUtblandet: "22" },
          { label: "Inositol",     unit: "mg",      per100gPulver: "85",   per100mlUtblandet: "11,4" },
          { label: "L-karnitin",   unit: "mg",      per100gPulver: "12,5", per100mlUtblandet: "1,68" },
          { label: "Taurin",       unit: "mg",      per100gPulver: "30",   per100mlUtblandet: "4" },
          { label: "Osmolaritet",  unit: "mOsm/l",  per100gPulver: "—",    per100mlUtblandet: "270" },
        ],
      },
    ],
  },
  tilberedning: [
    "Vask hendene grundig. Vask og kok flasker, smokker, lokk og andre redskaper (minst 5 minutter i kokende vann).",
    "Kok opp rent vann og kjøl det ned til 70 °C. Hell ønsket mengde vann i en ren flaske.",
    "Fyll måleskjeen med pulver (måleskjeen skal kun brukes til å måle pulver). Ikke press pulveret ned. Stryk av med baksiden av en ren, tørr kniv. Ha riktig antall måleskjeer i flasken, og oppbevar måleskjeen tørr i boksen.",
    "Lukk flasken, snu den og rist godt til pulveret er helt oppløst (minst 1 minutt).",
    "Kjøl blandingen ned til spisetemperatur før du gir den til barnet. Kontroller temperaturen på innsiden av håndleddet.",
  ],
  dosering: "Tabellen er veiledende. Det er individuelt hvor mye et barn spiser. En strøken måleskje (4,5 g) per 30 ml vann.",
  mixingInfo: { konsentrasjon: "13,5", scoopGram: "4,5" },
  mixingTable: [
    { skjeer: 3, pulver: "13,5", vann: 90, ferdig: 100, energi: 68 },
  ],
  doseringTabell: {
    tittel: "Dosering etter alder",
    kolonner: ["Alder", "Vekt (kg)", "Måltider/døgn", "Vann (ml)", "Måleskjeer", "Ferdig (ml)"],
    rader: [
      ["0–2 uker",     "<3–3,5", "6",   "90",  "3", "100"],
      ["2–4 uker",     "3,5–4",  "5–6", "120", "4", "130"],
      ["1–2 måneder",  "4–5",    "5",   "150", "5", "170"],
      ["2–4 måneder",  "5–6,5",  "4–5", "180", "6", "200"],
      ["4–6 måneder",  ">6,5",   "4",   "210", "7", "230"],
    ],
  },
  holdbarhet: "Boksen oppbevares tørt i romtemperatur. Etter åpning oppbevares boksen tett lukket og tørt, og innholdet må brukes innen 1 måned. Ikke frys pulveret og unngå sterk varme.",
  ingredienser: "Glukosesirup, vegetabilske oljer (palmolein, kokosnøtt, soya, solsikke med høyt oljesyreinnhold), høygradig hydrolysert kasein (fra melk), modifisert maisstivelse, kalsiumsitrat, kaliumfosfat, kalsiumfosfat, olje fra Mortierella alpina, kaliumklorid, magnesiumfosfat, olje fra mikroalgen Schizochytrium sp., kolinklorid, natriumklorid, L-cystin, inositol, L-tyrosin, L-tryptofan, taurin, jernsulfat, L-karnitin, vitamin E (DL-alfa-tokoferylacetat), sinksulfat, vitamin C (askorbylpalmitat, askorbinsyre), niacin (nikotinamid), vitamin A (retinylpalmitat), pantotensyre (kalsiumpantotenat), kobbersulfat, tiamin (tiaminhydroklorid), riboflavin, vitamin B6 (pyridoksinhydroklorid), mangansulfat, natriumjodid, folat (folsyre), natriummolybdat, vitamin K (fytomenadion), kromklorid, natriumselenitt, biotin (D-biotin), vitamin D (kolekalsiferol), vitamin B12 (cyanokobalamin).",
  smaksvarianter: "",
  indikasjon: "Kostholdsbehandling av kumelkproteinallergi hos spedbarn, fra fødselen og frem til ca. 6 måneders alder.",
  kontraindikasjon: "",
  forsiktighetsregler: "Morsmelk er spedbarnets beste føde, og bruk av morsmelkerstatning kan minske tilgangen til morsmelk. Det er svært viktig å følge tilberedningsinstruksjonene – feil håndtering kan påvirke barnets helse. Skal brukes under medisinsk tilsyn og ikke gis parenteralt.",
  bestilling: [
    { produktnavn: "Nutramigen 1", bestillingsnr: "", varenr: "848981", salgsenhet: "Boks 400 g" },
  ],
};

const NUTRAMIGEN_2: Product = {
  id: "nutramigen-2",
  manufacturer: "mead",
  name: "Nutramigen 2",
  age: "Fra 6 måneder",
  tagline: "Hypoallergen spesialnæring til kostholdsbehandling av kumelkproteinallergi.",
  description: "Spesialutviklet for barn med kumelkproteinallergi. Basert på høygradig hydrolysert kaseinprotein, og gir barnet alle næringsstoffene det trenger som en del av et variert kosthold. Laktosefri.",
  image: "/nutrition/nutramigen-2.jpg",
  thumb: "/nutrition/thumbs/nutramigen-2.png",
  imageScale: 1,
  type: "Hydrolysert",
  badges: [
    { label: "Hydrolysert",                          color: "#3B82F6", icon: "drop"   },
    { label: "Egnet som del av variert kosthold",   color: "#4ADE80", icon: "shield" },
    { label: "Laktosefri",                           color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                        color: "#D97706", icon: "drop"   },
  ],
  summary: [
    { label: "Alder",         value: "Fra 6 måneder" },
    { label: "Energitetthet", value: "0,68 kcal/ml" },
    { label: "Protein",       value: "Høygradig hydrolysert kasein" },
    { label: "Laktose",       value: "Nei" },
  ],
  fordeler: [
    "Effektiv og veldokumentert.",
    "Laktosefri.",
    "Gir barnet alle næringsstoffene det trenger som en del av et variert kosthold.",
  ],
  fordelerIcons: [ICON_SHIELD_STAR, ICON_GUT2, ICON_MILK_BOTTLE],
  bruksomraader: [
    "Spesialutviklet for barn med kumelkproteinallergi, fra ca. 6 måneders alder og oppover.",
    "Gir alle næringsstoffene barnet trenger som en del av et variert kosthold.",
  ],
  fodmap: { laktose: "0 g", gos: false, fos: false },
  viktigAVite: [
    "Høygradig hydrolysert spesialnæring smaker og lukter annerledes enn vanlig erstatning. Det kan ta litt tid før barnet venner seg til den.",
    "Morsmelk er spedbarnets beste føde. Bruk av morsmelkerstatning kan minske tilgangen til morsmelk.",
    "Det er svært viktig å følge tilberedningsinstruksjonene. Feil håndtering kan påvirke barnets helse.",
    "Skal brukes under medisinsk tilsyn og ikke gis parenteralt.",
  ],
  hurtiginfo: [
    { label: "Laktosefri",               icon: null },
    { label: "Med DHA & ARA",            icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Del av variert kosthold",    icon: null },
  ],
  kcalPer100ml: 68,
  pulverPer100ml: "13,5 g pulver",
  macros: [
    { label: "Fett",         value: 45, color: "#7C3AED", amount: "3,4 g" },
    { label: "Karbohydrat",  value: 45, color: "#F97316", amount: "7,7 g" },
    { label: "Protein",      value: 10, color: "#3B82F6", amount: "1,68 g" },
  ],
  nokkel: [
    { label: "Laktose",      value: "Laktosefri" },
    { label: "DHA",          value: "15,5 mg"    },
    { label: "ARA",          value: "19,5 mg"    },
    { label: "Kalsium",      value: "81 mg"      },
    { label: "Jern",         value: "1,08 mg"    },
    { label: "Vitamin D",    value: "1,68 µg"    },
    { label: "Osmolaritet",  value: "351 mOsm/l" },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml ferdig blanding"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                unit: "kJ",   per100gPulver: "2107",  per100mlUtblandet: "285" },
          { label: "Energi (kcal)",              unit: "kcal", per100gPulver: "503",   per100mlUtblandet: "68" },
          { label: "Fett",                       unit: "g",    per100gPulver: "25",    per100mlUtblandet: "3,4" },
          { label: "– hvorav mettede fettsyrer", unit: "g",    per100gPulver: "10,5",  per100mlUtblandet: "1,41" },
          { label: "– linolsyre",                unit: "g",    per100gPulver: "4",     per100mlUtblandet: "0,54" },
          { label: "– α-linolensyre",            unit: "mg",   per100gPulver: "350",   per100mlUtblandet: "47" },
          { label: "– arakidonsyre (ARA)",       unit: "mg",   per100gPulver: "145",   per100mlUtblandet: "19,5" },
          { label: "– dokosaheksaensyre (DHA)",  unit: "mg",   per100gPulver: "115",   per100mlUtblandet: "15,5" },
          { label: "Karbohydrat",                unit: "g",    per100gPulver: "57",    per100mlUtblandet: "7,7" },
          { label: "– hvorav sukkerarter",       unit: "g",    per100gPulver: "26",    per100mlUtblandet: "3,5" },
          { label: "Protein",                    unit: "g",    per100gPulver: "12,5",  per100mlUtblandet: "1,68" },
          { label: "Salt",                       unit: "g",    per100gPulver: "0,44",  per100mlUtblandet: "0,06" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg", per100gPulver: "175",  per100mlUtblandet: "24" },
          { label: "Kalium",    unit: "mg", per100gPulver: "700",  per100mlUtblandet: "94" },
          { label: "Klorid",    unit: "mg", per100gPulver: "350",  per100mlUtblandet: "47" },
          { label: "Kalsium",   unit: "mg", per100gPulver: "600",  per100mlUtblandet: "81" },
          { label: "Fosfor",    unit: "mg", per100gPulver: "350",  per100mlUtblandet: "47" },
          { label: "Magnesium", unit: "mg", per100gPulver: "60",   per100mlUtblandet: "8,1" },
          { label: "Jern",      unit: "mg", per100gPulver: "8",    per100mlUtblandet: "1,08" },
          { label: "Sink",      unit: "mg", per100gPulver: "5,5",  per100mlUtblandet: "0,74" },
          { label: "Kobber",    unit: "mg", per100gPulver: "0,38", per100mlUtblandet: "0,05" },
          { label: "Mangan",    unit: "mg", per100gPulver: "0,11", per100mlUtblandet: "0,015" },
          { label: "Selen",     unit: "µg", per100gPulver: "17,5", per100mlUtblandet: "2,4" },
          { label: "Krom",      unit: "µg", per100gPulver: "15",   per100mlUtblandet: "2" },
          { label: "Molybden",  unit: "µg", per100gPulver: "15,5", per100mlUtblandet: "2,1" },
          { label: "Jod",       unit: "µg", per100gPulver: "115",  per100mlUtblandet: "15,5" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg RE",     per100gPulver: "480",   per100mlUtblandet: "65" },
          { label: "Vitamin D",    unit: "µg",        per100gPulver: "12,5",  per100mlUtblandet: "1,68" },
          { label: "Vitamin E",    unit: "mg α-TE",   per100gPulver: "5",     per100mlUtblandet: "0,67" },
          { label: "Vitamin K",    unit: "µg",        per100gPulver: "40",    per100mlUtblandet: "5,4" },
          { label: "Vitamin C",    unit: "mg",        per100gPulver: "55",    per100mlUtblandet: "7,4" },
          { label: "Tiamin",       unit: "mg",        per100gPulver: "0,48",  per100mlUtblandet: "0,065" },
          { label: "Riboflavin",   unit: "mg",        per100gPulver: "0,63",  per100mlUtblandet: "0,084" },
          { label: "Niacin",       unit: "mg",        per100gPulver: "7,7",   per100mlUtblandet: "1,04" },
          { label: "Vitamin B6",   unit: "mg",        per100gPulver: "0,65",  per100mlUtblandet: "0,087" },
          { label: "Folat",        unit: "µg DFE",    per100gPulver: "100",   per100mlUtblandet: "13,5" },
          { label: "Folsyre",      unit: "µg",        per100gPulver: "60",    per100mlUtblandet: "8,1" },
          { label: "Vitamin B12",  unit: "µg",        per100gPulver: "1,05",  per100mlUtblandet: "0,141" },
          { label: "Biotin",       unit: "µg",        per100gPulver: "10,5",  per100mlUtblandet: "1,41" },
          { label: "Pantotensyre", unit: "mg",        per100gPulver: "3,8",   per100mlUtblandet: "0,5" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "Kolin",        unit: "mg",      per100gPulver: "120", per100mlUtblandet: "16,1" },
          { label: "Inositol",     unit: "mg",      per100gPulver: "85",  per100mlUtblandet: "11,4" },
          { label: "L-karnitin",   unit: "mg",      per100gPulver: "11",  per100mlUtblandet: "1,48" },
          { label: "Taurin",       unit: "mg",      per100gPulver: "30",  per100mlUtblandet: "4" },
          { label: "Osmolaritet",  unit: "mOsm/l",  per100gPulver: "—",   per100mlUtblandet: "351" },
        ],
      },
    ],
  },
  tilberedning: [
    "Vask hendene grundig. Vask og kok flasker, smokker, lokk og andre redskaper (minst 5 minutter i kokende vann).",
    "Kok opp rent vann og kjøl det ned til 70 °C. Hell ønsket mengde vann i en ren flaske.",
    "Fyll måleskjeen med pulver (måleskjeen skal kun brukes til å måle pulver). Ikke press pulveret ned. Stryk av med baksiden av en ren, tørr kniv. Ha riktig antall måleskjeer i flasken, og oppbevar måleskjeen tørr i boksen.",
    "Lukk flasken, snu den og rist godt til pulveret er helt oppløst (minst 1 minutt).",
    "Kjøl blandingen ned til spisetemperatur før du gir den til barnet. Kontroller temperaturen på innsiden av håndleddet.",
  ],
  dosering: "Tabellen er veiledende. Hvert barn er unikt, og barnets matbehov kan være forskjellig fra det som er angitt. En strøken måleskje (4,5 g) per 30 ml vann.",
  mixingInfo: { konsentrasjon: "13,5", scoopGram: "4,5" },
  mixingTable: [
    { skjeer: 7, pulver: "31,5", vann: 210, ferdig: 230, energi: 156 },
  ],
  doseringTabell: {
    tittel: "Dosering etter alder",
    kolonner: ["Alder", "Måltider/døgn", "Vann (ml)", "Måleskjeer", "Ferdig (ml)"],
    rader: [
      ["6–12 måneder", "2–3", "210", "7", "230"],
      ["Over 1 år",    "2",   "210", "7", "230"],
    ],
  },
  holdbarhet: "Boksen oppbevares tørt i romtemperatur. Etter åpning oppbevares boksen tett lukket og tørt, og innholdet må brukes innen 1 måned. Ikke frys pulveret og unngå sterk varme.",
  ingredienser: "Glukosesirup, vegetabilske oljer (palmolein, kokosnøtt, soya, solsikke med høyt oljesyreinnhold), høygradig hydrolysert kasein (fra melk), fruktose, modifisert maisstivelse, kalsiumsitrat, kaliumsitrat, kalsiumfosfat, magnesiumfosfat, kaliumklorid, olje fra Mortierella alpina, olje fra mikroalgen Schizochytrium sp., L-cystin, kolinklorid, natriumsitrat, L-tyrosin, inositol, L-tryptofan, jernsulfat, taurin, sinksulfat, L-karnitin, niacin (nikotinamid), vitamin E (DL-alfa-tokoferylacetat), vitamin C (askorbylpalmitat, askorbinsyre), pantotensyre (kalsiumpantotenat), vitamin A (retinylpalmitat), kobbersulfat, vitamin B6 (pyridoksinhydroklorid), riboflavin, tiamin (tiaminhydroklorid), mangansulfat, natriumjodid, folat (folsyre), kromklorid, vitamin K (fytomenadion), natriummolybdat, natriumselenitt, biotin (D-biotin), vitamin D (kolekalsiferol), vitamin B12 (cyanokobalamin).",
  smaksvarianter: "",
  indikasjon: "Kostholdsbehandling av kumelkproteinallergi hos barn fra ca. 6 måneders alder, som en del av et variert kosthold.",
  kontraindikasjon: "",
  forsiktighetsregler: "Morsmelk er spedbarnets beste føde, og bruk av morsmelkerstatning kan minske tilgangen til morsmelk. Det er svært viktig å følge tilberedningsinstruksjonene – feil håndtering kan påvirke barnets helse. Skal brukes under medisinsk tilsyn og ikke gis parenteralt.",
  bestilling: [
    { produktnavn: "Nutramigen 2", bestillingsnr: "", varenr: "857931", salgsenhet: "Boks 400 g" },
  ],
};

const NUTRAMIGEN_PURAMINO: Product = {
  id: "nutramigen-puramino",
  manufacturer: "mead",
  name: "Nutramigen Puramino",
  age: "Fra fødselen",
  tagline: "Hypoallergen aminosyrebasert spesialnæring til kostbehandling av alvorlig kumelkproteinallergi og multiple matallergier.",
  description: "Ernæringsmessig fullverdig og sammensatt for å ivareta spedbarnets næringsbehov fra første leveuke. Basert på 100 % frie aminosyrer.",
  image: "/nutrition/nutramigen-puramino.jpg",
  thumb: "/nutrition/thumbs/nutramigen-puramino.png",
  imageScale: 1,
  type: "Aminosyrebasert",
  badges: [
    { label: "Aminosyrebasert",                     color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett fra fødselen", color: "#4ADE80", icon: "shield" },
    { label: "Laktosefri",                          color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                       color: "#D97706", icon: "drop"   },
    { label: "Med MCT",                             color: "#D97706", icon: "drop"   },
    { label: "Halalsertifisert",                    color: "#D97706", icon: "star"   },
    { label: "Koshersertifisert",                   color: "#D97706", icon: "star"   },
  ],
  summary: [
    { label: "Alder",         value: "Fra fødselen" },
    { label: "Energitetthet", value: "0,68 kcal/ml" },
    { label: "Protein",       value: "100 % frie aminosyrer" },
    { label: "Halal",         value: "Ja" },
    { label: "Laktose",       value: "Nei" },
  ],
  fordeler: [
    "33 % MCT-olje av totalt fett – en lett tilgjengelig kilde til fett og energi.",
    "Laktosefri og uten smakstilsetning.",
    "Kan brukes som eneste næringskilde frem til 6 måneders alder, og videre som en del av et variert kosthold.",
  ],
  fordelerIcons: [ICON_DROP, ICON_GUT2, ICON_MILK_BOTTLE],
  bruksomraader: [
    "Kostbehandling av alvorlig kumelkproteinallergi og multiple matallergier.",
    "Når et høygradig hydrolysat ikke har hatt effekt.",
    "Andre indikasjoner som krever elementaldiett, blant annet eosinofil øsofagitt og manglende vekst.",
  ],
  fodmap: { laktose: "0 g", gos: false, fos: false },
  viktigAVite: [
    "Tilberedt spesialnæring har svært kort holdbarhet: gi den innen to timer etter tilberedning, og bruk den innen én time etter at barnet har begynt å drikke, ellers kastes den.",
    "Tilbered kun ett måltid om gangen. Tilberedt spesialnæring må ikke fryses.",
    "Morsmelk er spedbarnets beste føde. Bruk av morsmelkerstatning kan minske tilgangen til morsmelk.",
    "Skal brukes under medisinsk tilsyn og ikke gis parenteralt.",
  ],
  hurtiginfo: [
    { label: "Laktosefri",               icon: null },
    { label: "Halalsertifisert",         icon: null },
    { label: "Koshersertifisert",        icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  kcalPer100ml: 68,
  pulverPer100ml: "13,2 g pulver",
  macros: [
    { label: "Fett",         value: 49, color: "#7C3AED", amount: "3,7 g" },
    { label: "Karbohydrat",  value: 40, color: "#F97316", amount: "6,9 g" },
    { label: "Protein",      value: 11, color: "#3B82F6", amount: "1,88 g" },
  ],
  nokkel: [
    { label: "Laktose",      value: "Laktosefri"        },
    { label: "MCT",          value: "33 % av fettet"    },
    { label: "DHA",          value: "15,5 mg"           },
    { label: "ARA",          value: "19,5 mg"           },
    { label: "Kalsium",      value: "76 mg"             },
    { label: "Jern",         value: "1,01 mg"           },
    { label: "Osmolaritet",  value: "314 mOsm/l"        },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml ferdig blanding"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                unit: "kJ",   per100gPulver: "2140",  per100mlUtblandet: "285" },
          { label: "Energi (kcal)",              unit: "kcal", per100gPulver: "510",   per100mlUtblandet: "68" },
          { label: "Fett",                       unit: "g",    per100gPulver: "28",    per100mlUtblandet: "3,7" },
          { label: "– hvorav mettede fettsyrer", unit: "g",    per100gPulver: "10,7",  per100mlUtblandet: "1,41" },
          { label: "– linolsyre",                unit: "g",    per100gPulver: "3,5",   per100mlUtblandet: "0,46" },
          { label: "– α-linolensyre",            unit: "mg",   per100gPulver: "370",   per100mlUtblandet: "49" },
          { label: "– arakidonsyre (ARA)",       unit: "mg",   per100gPulver: "148",   per100mlUtblandet: "19,5" },
          { label: "– dokosaheksaensyre (DHA)",  unit: "mg",   per100gPulver: "117",   per100mlUtblandet: "15,5" },
          { label: "Karbohydrat",                unit: "g",    per100gPulver: "52",    per100mlUtblandet: "6,9" },
          { label: "– hvorav sukkerarter",       unit: "g",    per100gPulver: "4,2",   per100mlUtblandet: "0,55" },
          { label: "Protein",                    unit: "g",    per100gPulver: "14,3",  per100mlUtblandet: "1,88" },
          { label: "Salt",                       unit: "g",    per100gPulver: "0,42",  per100mlUtblandet: "0,06" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg", per100gPulver: "168",   per100mlUtblandet: "22" },
          { label: "Kalium",    unit: "mg", per100gPulver: "730",   per100mlUtblandet: "96" },
          { label: "Klorid",    unit: "mg", per100gPulver: "450",   per100mlUtblandet: "60" },
          { label: "Kalsium",   unit: "mg", per100gPulver: "580",   per100mlUtblandet: "76" },
          { label: "Fosfor",    unit: "mg", per100gPulver: "330",   per100mlUtblandet: "44" },
          { label: "Magnesium", unit: "mg", per100gPulver: "61",    per100mlUtblandet: "8,1" },
          { label: "Jern",      unit: "mg", per100gPulver: "7,7",   per100mlUtblandet: "1,01" },
          { label: "Sink",      unit: "mg", per100gPulver: "4,6",   per100mlUtblandet: "0,61" },
          { label: "Kobber",    unit: "mg", per100gPulver: "0,38",  per100mlUtblandet: "0,05" },
          { label: "Mangan",    unit: "mg", per100gPulver: "0,087", per100mlUtblandet: "0,011" },
          { label: "Selen",     unit: "µg", per100gPulver: "18,4",  per100mlUtblandet: "2,4" },
          { label: "Krom",      unit: "µg", per100gPulver: "26",    per100mlUtblandet: "3,4" },
          { label: "Molybden",  unit: "µg", per100gPulver: "15,8",  per100mlUtblandet: "2,1" },
          { label: "Jod",       unit: "µg", per100gPulver: "102",   per100mlUtblandet: "13,5" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg RE",     per100gPulver: "430",   per100mlUtblandet: "57" },
          { label: "Vitamin D",    unit: "µg",        per100gPulver: "12,25", per100mlUtblandet: "1,63" },
          { label: "Vitamin E",    unit: "mg α-TE",   per100gPulver: "4,6",   per100mlUtblandet: "0,61" },
          { label: "Vitamin K",    unit: "µg",        per100gPulver: "46",    per100mlUtblandet: "6,1" },
          { label: "Vitamin C",    unit: "mg",        per100gPulver: "48",    per100mlUtblandet: "6,4" },
          { label: "Tiamin",       unit: "mg",        per100gPulver: "0,31",  per100mlUtblandet: "0,04" },
          { label: "Riboflavin",   unit: "mg",        per100gPulver: "0,41",  per100mlUtblandet: "0,054" },
          { label: "Niacin",       unit: "mg",        per100gPulver: "4,7",   per100mlUtblandet: "0,63" },
          { label: "Vitamin B6",   unit: "mg",        per100gPulver: "0,38",  per100mlUtblandet: "0,05" },
          { label: "Folat",        unit: "µg DFE",    per100gPulver: "87",    per100mlUtblandet: "11,4" },
          { label: "Folsyre",      unit: "µg",        per100gPulver: "52",    per100mlUtblandet: "6,9" },
          { label: "Vitamin B12",  unit: "µg",        per100gPulver: "0,92",  per100mlUtblandet: "0,121" },
          { label: "Biotin",       unit: "µg",        per100gPulver: "12,2",  per100mlUtblandet: "1,62" },
          { label: "Pantotensyre", unit: "mg",        per100gPulver: "2,9",   per100mlUtblandet: "0,38" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "Kolin",        unit: "mg",      per100gPulver: "163",  per100mlUtblandet: "22" },
          { label: "Inositol",     unit: "mg",      per100gPulver: "87",   per100mlUtblandet: "11,4" },
          { label: "L-karnitin",   unit: "mg",      per100gPulver: "10,2", per100mlUtblandet: "1,35" },
          { label: "Taurin",       unit: "mg",      per100gPulver: "31",   per100mlUtblandet: "4" },
          { label: "Osmolaritet",  unit: "mOsm/l",  per100gPulver: "—",    per100mlUtblandet: "314" },
        ],
      },
    ],
  },
  tilberedning: [
    "Vask hendene grundig. Vask og kok flasker, smokker, lokk og andre redskaper (minst 5 minutter i kokende vann).",
    "Kok opp rent vann og kjøl det ned til 70 °C. Hell ønsket mengde vann i en ren flaske.",
    "Fyll måleskjeen med pulver (kun til å måle pulver). Ikke press pulveret ned. Stryk av med baksiden av en ren, tørr kniv. Ha riktig antall måleskjeer i flasken, og oppbevar måleskjeen tørr i boksen.",
    "Lukk flasken, snu den og rist godt til pulveret er helt oppløst. Kjøl blandingen ned til spisetemperatur og kontroller temperaturen på innsiden av håndleddet.",
    "Gi spesialnæringen umiddelbart etter tilberedning, innen to timer. Tilbered kun ett måltid om gangen. Når barnet har begynt å drikke den, skal den brukes innen én time eller kastes. Den må ikke fryses.",
  ],
  dosering: "Tabellen er veiledende. Det er individuelt hvor mye et barn spiser. En strøken måleskje (4,4 g) per 30 ml vann.",
  mixingInfo: { konsentrasjon: "13,2", scoopGram: "4,4" },
  mixingTable: [
    { skjeer: 3, pulver: "13,2", vann: 90, ferdig: 100, energi: 68 },
  ],
  doseringTabell: {
    tittel: "Dosering etter alder",
    kolonner: ["Alder", "Vekt (kg)", "Flasker/døgn", "Vann (ml)", "Måleskjeer", "Ferdig (ml)"],
    rader: [
      ["0–2 uker",     "<3–3,5", "6–7", "90",  "3", "100"],
      ["2–4 uker",     "3,5–4",  "5–6", "120", "4", "130"],
      ["1–2 måneder",  "4–5",    "5",   "150", "5", "170"],
      ["2–4 måneder",  "5–6,5",  "4–5", "180", "6", "200"],
      ["4–6 måneder",  "6,5–7,5", "4",  "210", "7", "230"],
      ["6–12 måneder", "7,5–9,5", "2–3", "240", "8", "260"],
      ["Over 1 år",    ">9,5",   "2–3", "240", "8", "260"],
    ],
  },
  holdbarhet: "Uåpnet boks oppbevares tørt og kjølig – se «Best før»-dato på bunnen av boksen. Åpnet boks oppbevares tørt og tett lukket og brukes innen 1 måned. Pulveret bør ikke fryses og ikke utsettes for kraftig oppvarming.",
  ingredienser: "Glukosesirup, vegetabilske oljer (solsikkeolje med høyt oljesyreinnhold, mellomlange kjedede triglyserider fra kokosnøtt/palmekjerne (9,3 %), soya), modifisert tapiokastivelse, kaliumaspartat, L-leucin, L-lysinhydroklorid, kalsiumfosfat, L-prolin, L-alanin, L-valin, L-isoleucin, mononatriumglutamat, L-treonin, L-serin, L-tyrosin, L-aspartat, L-arginin, L-fenylalanin, magnesiumfosfat, L-histidin, L-cystin, glycin, L-tryptofan, olje fra Mortierella alpina, L-metionin, kaliumklorid, olje fra mikroalgen Schizochytrium sp., kalsiumsitrat, kolinklorid, natriumsitrat, inositol, vitamin C (askorbinsyre), jernsulfat, taurin, sinksulfat, L-karnitin, vitamin E (DL-alfa-tokoferylacetat), niacin (nikotinamid), pantotensyre (kalsiumpantotenat), vitamin A (retinylpalmitat), kobbersulfat, vitamin B6 (pyridoksinhydroklorid), tiamin (tiaminhydroklorid), riboflavin, mangansulfat, natriumjodid, kromklorid, folat (folsyre), vitamin K (fytomenadion), natriumselenitt, natriummolybdat, biotin (D-biotin), vitamin D (kolekalsiferol), vitamin B12 (cyanokobalamin).",
  smaksvarianter: "Uten smakstilsetning.",
  indikasjon: "Kostbehandling av alvorlig kumelkproteinallergi, multiple matallergier, når et høygradig hydrolysat ikke har hatt effekt, og andre indikasjoner som krever elementaldiett (blant annet eosinofil øsofagitt og manglende vekst).",
  kontraindikasjon: "",
  forsiktighetsregler: "Morsmelk er spedbarnets beste føde, og bruk av morsmelkerstatning kan minske tilgangen til morsmelk. Det er svært viktig å følge tilberedningsinstruksjonene – feil håndtering kan påvirke barnets helse. Skal brukes under medisinsk tilsyn og ikke gis parenteralt.",
  bestilling: [
    { produktnavn: "Nutramigen Puramino", bestillingsnr: "", varenr: "819408", salgsenhet: "Boks 400 g" },
  ],
};

const NUTRAMIGEN_PURAMINO_JUNIOR: Product = {
  id: "nutramigen-puramino-junior",
  manufacturer: "mead",
  name: "Nutramigen Puramino Junior",
  age: "Fra 1 år",
  tagline: "Hypoallergen spesialnæring basert på frie aminosyrer til kostbehandling av alvorlig kumelkproteinallergi og multiple matallergier hos barn fra 1 år.",
  description: "Ernæringsmessig fullverdig. Kan brukes som en del av en variert kost, som barnets melk, som berikning i barnets mat, eller som eneste næringskilde, for eksempel ved sonding.",
  image: "/nutrition/nutramigen-puramino-junior.jpg",
  thumb: "/nutrition/thumbs/nutramigen-puramino-junior.png",
  imageScale: 1,
  type: "Aminosyrebasert",
  badges: [
    { label: "Aminosyrebasert",                   color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett fra 1 år", color: "#4ADE80", icon: "shield" },
    { label: "Laktosefri",                        color: "#EA580C", icon: "gut"    },
    { label: "Med DHA",                           color: "#D97706", icon: "drop"   },
    { label: "Med MCT",                           color: "#D97706", icon: "drop"   },
    { label: "Halalsertifisert",                  color: "#D97706", icon: "star"   },
    { label: "Koshersertifisert",                 color: "#D97706", icon: "star"   },
  ],
  summary: [
    { label: "Alder",         value: "Fra 1 år" },
    { label: "Energitetthet", value: "1 kcal/ml" },
    { label: "Protein",       value: "100 % frie aminosyrer" },
    { label: "Halal",         value: "Ja" },
    { label: "Laktose",       value: "Nei" },
  ],
  fordeler: [
    "33 % MCT-olje av totalt fett, gunstig for barn med ulike malabsorpsjonstilstander.",
    "Inneholder DHA i mengder som anbefales av EFSA.",
    "Laktosefri og uten smakstilsetning.",
  ],
  fordelerIcons: [ICON_DROP, ICON_SHIELD_STAR, ICON_GUT2],
  bruksomraader: [
    "Kostbehandling av alvorlig kumelkproteinallergi og multiple matallergier, når et høygradig hydrolysat ikke har hatt effekt, og andre indikasjoner som krever elementaldiett, blant annet eosinofil øsofagitt og manglende vekst.",
    "Kan brukes fra 1-års alder, som del av en variert kost – som barnets melk og/eller som berikning i barnets mat.",
    "Kan også brukes som barnets eneste næringskilde, for eksempel ved sonding.",
  ],
  fodmap: { laktose: "0 g", gos: false, fos: false },
  viktigAVite: [
    "Tilberedt spesialnæring har svært kort holdbarhet: gi den innen to timer, eller dekk den til og sett den i kjøleskap (2–4 °C) i maks 24 timer. Når barnet har begynt å drikke, brukes den innen én time eller kastes.",
    "Tilberedt spesialnæring må ikke fryses.",
    "Skal brukes under medisinsk tilsyn og ikke gis parenteralt.",
    "Kan forskrives på blå resept av lege, eller kjøpes reseptfritt på apotek.",
  ],
  hurtiginfo: [
    { label: "Laktosefri",               icon: null },
    { label: "Halalsertifisert",         icon: null },
    { label: "Koshersertifisert",        icon: null },
    { label: "Hypoallergen",             icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  kcalPer100ml: 100,
  pulverPer100ml: "20,4 g pulver",
  macros: [
    { label: "Fett",         value: 41, color: "#7C3AED", amount: "4,5 g" },
    { label: "Karbohydrat",  value: 48, color: "#F97316", amount: "12,1 g" },
    { label: "Protein",      value: 11, color: "#3B82F6", amount: "2,8 g" },
  ],
  nokkel: [
    { label: "Laktose",      value: "Laktosefri"     },
    { label: "MCT",          value: "33 % av fettet" },
    { label: "DHA",          value: "23 mg"          },
    { label: "Kalsium",      value: "100 mg"         },
    { label: "Jern",         value: "1 mg"           },
    { label: "Vitamin D",    value: "1,4 µg"         },
    { label: "Osmolaritet",  value: "480 mOsm/l"     },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml ferdig blanding (20,4 g pulver + 90 ml vann)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                unit: "kJ",   per100gPulver: "2050",  per100mlUtblandet: "418" },
          { label: "Energi (kcal)",              unit: "kcal", per100gPulver: "490",   per100mlUtblandet: "100" },
          { label: "Fett",                       unit: "g",    per100gPulver: "22",    per100mlUtblandet: "4,5" },
          { label: "– hvorav mettede fettsyrer", unit: "g",    per100gPulver: "8,3",   per100mlUtblandet: "1,69" },
          { label: "– linolsyre",                unit: "g",    per100gPulver: "2,9",   per100mlUtblandet: "0,59" },
          { label: "– α-linolensyre",            unit: "mg",   per100gPulver: "310",   per100mlUtblandet: "63" },
          { label: "– dokosaheksaensyre (DHA)",  unit: "mg",   per100gPulver: "113",   per100mlUtblandet: "23" },
          { label: "Karbohydrat",                unit: "g",    per100gPulver: "59",    per100mlUtblandet: "12,1" },
          { label: "– hvorav sukkerarter",       unit: "g",    per100gPulver: "5,3",   per100mlUtblandet: "1,08" },
          { label: "Protein",                    unit: "g",    per100gPulver: "13,7",  per100mlUtblandet: "2,8" },
          { label: "Salt",                       unit: "g",    per100gPulver: "0,49",  per100mlUtblandet: "0,1" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg", per100gPulver: "196",  per100mlUtblandet: "40" },
          { label: "Kalium",    unit: "mg", per100gPulver: "490",  per100mlUtblandet: "100" },
          { label: "Klorid",    unit: "mg", per100gPulver: "300",  per100mlUtblandet: "61" },
          { label: "Kalsium",   unit: "mg", per100gPulver: "490",  per100mlUtblandet: "100" },
          { label: "Fosfor",    unit: "mg", per100gPulver: "290",  per100mlUtblandet: "60" },
          { label: "Magnesium", unit: "mg", per100gPulver: "78",   per100mlUtblandet: "16" },
          { label: "Jern",      unit: "mg", per100gPulver: "4,9",  per100mlUtblandet: "1" },
          { label: "Sink",      unit: "mg", per100gPulver: "4,4",  per100mlUtblandet: "0,9" },
          { label: "Kobber",    unit: "mg", per100gPulver: "0,54", per100mlUtblandet: "0,11" },
          { label: "Mangan",    unit: "mg", per100gPulver: "0,28", per100mlUtblandet: "0,057" },
          { label: "Selen",     unit: "µg", per100gPulver: "15,7", per100mlUtblandet: "3,2" },
          { label: "Krom",      unit: "µg", per100gPulver: "14,7", per100mlUtblandet: "3" },
          { label: "Molybden",  unit: "µg", per100gPulver: "22",   per100mlUtblandet: "4,5" },
          { label: "Jod",       unit: "µg", per100gPulver: "74",   per100mlUtblandet: "15" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg RE",     per100gPulver: "300",   per100mlUtblandet: "61" },
          { label: "Vitamin D",    unit: "µg",        per100gPulver: "6,75",  per100mlUtblandet: "1,4" },
          { label: "Vitamin E",    unit: "mg α-TE",   per100gPulver: "5,9",   per100mlUtblandet: "1,2" },
          { label: "Vitamin K",    unit: "µg",        per100gPulver: "19,6",  per100mlUtblandet: "4" },
          { label: "Vitamin C",    unit: "mg",        per100gPulver: "49",    per100mlUtblandet: "10" },
          { label: "Tiamin",       unit: "mg",        per100gPulver: "0,37",  per100mlUtblandet: "0,075" },
          { label: "Riboflavin",   unit: "mg",        per100gPulver: "0,49",  per100mlUtblandet: "0,1" },
          { label: "Niacin",       unit: "mg",        per100gPulver: "4,9",   per100mlUtblandet: "1" },
          { label: "Vitamin B6",   unit: "mg",        per100gPulver: "0,49",  per100mlUtblandet: "0,1" },
          { label: "Folsyre",      unit: "µg",        per100gPulver: "74",    per100mlUtblandet: "15" },
          { label: "Vitamin B12",  unit: "µg",        per100gPulver: "1,23",  per100mlUtblandet: "0,25" },
          { label: "Biotin",       unit: "µg",        per100gPulver: "10,8",  per100mlUtblandet: "2,2" },
          { label: "Pantotensyre", unit: "mg",        per100gPulver: "2,1",   per100mlUtblandet: "0,43" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "Kolin",        unit: "mg",      per100gPulver: "108", per100mlUtblandet: "22" },
          { label: "Inositol",     unit: "mg",      per100gPulver: "83",  per100mlUtblandet: "17" },
          { label: "L-karnitin",   unit: "mg",      per100gPulver: "9,8", per100mlUtblandet: "2" },
          { label: "Taurin",       unit: "mg",      per100gPulver: "29",  per100mlUtblandet: "6" },
          { label: "Osmolaritet",  unit: "mOsm/l",  per100gPulver: "—",   per100mlUtblandet: "480" },
        ],
      },
    ],
  },
  tilberedning: [
    "Vask hendene grundig. Vask og kok flasker, smokker, lokk og andre redskaper (minst 5 minutter i kokende vann).",
    "Kok opp rent vann og kjøl det ned til 70 °C. Hell ønsket mengde vann i en ren flaske.",
    "Fyll måleskjeen med pulver (kun til å måle pulver). Ikke press pulveret ned. Stryk av med baksiden av en ren, tørr kniv. Ha riktig antall måleskjeer i flasken, og oppbevar måleskjeen tørr i boksen.",
    "Lukk flasken, snu og rist godt til pulveret er helt oppløst – i en kopp røres det rundt til produktet er jevnt. Kjøl blandingen ned til spisetemperatur og kontroller temperaturen på innsiden av håndleddet.",
    "Gi spesialnæringen umiddelbart etter tilberedning, innen to timer, eller dekk den til og sett den i kjøleskap (2–4 °C) i maks 24 timer. Når barnet har begynt å drikke den, skal den brukes innen én time eller kastes. Den må ikke fryses.",
  ],
  dosering: "Anbefalt inntak bestemmes av lege eller dietetiker og avhenger av barnets alder, kroppsvekst, type medisinsk tilstand og inntaket av andre matvarer. 1 strøken måleskje (6,8 g) til 30 ml vann gir en konsentrasjon på ca. 1 kcal/ml.",
  mixingInfo: { konsentrasjon: "20,4", scoopGram: "6,8" },
  mixingTable: [
    { skjeer: 3, pulver: "20,4", vann: 90, ferdig: 100, energi: 100 },
  ],
  holdbarhet: "Boksen oppbevares tørt i romtemperatur. Etter åpning oppbevares boksen tett lukket og tørt, og innholdet må brukes innen 1 måned. Ikke frys pulveret og unngå sterk varme.",
  ingredienser: "Glukosesirup, vegetabilske oljer (solsikkeolje med høyt oljesyreinnhold, mellomlange kjedede triglyserider fra kokosnøtt/palmekjerne (7,3 %), soya), modifisert tapiokastivelse, kaliumaspartat, L-leucin, L-lysinhydroklorid, L-prolin, L-alanin, kalsiumfosfat, L-valin, L-isoleucin, mononatriumglutamat, L-treonin, L-serin, L-tyrosin, L-aspartat, L-arginin, L-fenylalanin, magnesiumfosfat, kalsiumsitrat, L-histidin, L-cystin, glycin, L-tryptofan, L-metionin, natriumsitrat, olje fra mikroalgen Schizochytrium sp., kolinklorid, inositol, vitamin C (askorbinsyre), taurin, jernsulfat, sinksulfat, L-karnitin, vitamin E (DL-alfa-tokoferylacetat), niacin (nikotinamid), pantotensyre (kalsiumpantotenat), kobbersulfat, vitamin A (retinylpalmitat), vitamin B6 (pyridoksinhydroklorid), mangansulfat, tiamin (tiaminhydroklorid), riboflavin, vitamin D (kolekalsiferol), natriumjodid, folsyre, natriummolybdat, natriumselenitt, kromklorid, vitamin K (fytomenadion), biotin (D-biotin), vitamin B12 (cyanokobalamin).",
  smaksvarianter: "Uten smakstilsetning.",
  indikasjon: "Kostbehandling av alvorlig kumelkproteinallergi, multiple matallergier, når et høygradig hydrolysat ikke har hatt effekt, og andre indikasjoner som krever elementaldiett (blant annet eosinofil øsofagitt og manglende vekst), fra 1 års alder.",
  kontraindikasjon: "",
  forsiktighetsregler: "Det er svært viktig å følge tilberedningsinstruksjonene – feil håndtering kan påvirke barnets helse. Skal brukes under medisinsk tilsyn og ikke gis parenteralt.",
  bestilling: [
    { produktnavn: "Nutramigen Puramino Junior", bestillingsnr: "", varenr: "830756", salgsenhet: "Boks 400 g" },
  ],
};

const PRODUCTS: Product[] = [PEPTICATE_1, PEPTICATE_PLUS_2, NEOCATE_LCP, NEOCATE_SPOON, NEOCATE_JUNIOR, ALTHERA, ALFARE, ALFAMINO, ALFAMINO_JUNIOR, NUTRAMIGEN_1, NUTRAMIGEN_2, NUTRAMIGEN_PURAMINO, NUTRAMIGEN_PURAMINO_JUNIOR];
const PRODUCT_GROUPS = (Object.keys(MANUFACTURERS) as ManufacturerId[])
  .map((id) => ({ id, label: MANUFACTURERS[id].label, short: MANUFACTURERS[id].short, products: PRODUCTS.filter((p) => p.manufacturer === id) }))
  .filter((group) => group.products.length > 0);

// ─── Sub-components ───────────────────────────────────────────────────────────
function ProductThumb({ product, width, height }: { product: Product; width: number; height: number }) {
  const src = product.thumb ?? product.image;
  return (
    <Box sx={{ width, height, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: MK.thumbBg, borderRadius: "6px", overflow: "hidden" }}>
      {src
        ? <Box component="img" src={src} alt="" sx={{ width, height, objectFit: "contain" }} />
        : <BottleIcon size={Math.min(width, height) - 4} color={D.purple} />}
    </Box>
  );
}

type ProductGroup = (typeof PRODUCT_GROUPS)[number];

/** Én nedtrekksknapp per produsent. Viser valgt produkt når det tilhører produsenten, ellers produsentens navn og antall produkter. */
function ManufacturerPicker({ group, selectedId, onSelect }: { group: ProductGroup; selectedId: string; onSelect: (id: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const active = group.products.find((p) => p.id === selectedId);
  const single = group.products.length === 1;

  // Fokus på valgt produkt når menyen åpnes, slik at piltaster og mellomrom virker med en gang.
  useEffect(() => {
    if (!anchor) return;
    const timer = setTimeout(() => (selectedRef.current ?? document.querySelector<HTMLElement>(".MuiPopover-paper [data-product-item]"))?.focus(), 80);
    return () => clearTimeout(timer);
  }, [anchor]);

  const moveFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
    if (!keys.includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-product-item]"));
    const current = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const next = items[(current + step + items.length) % items.length];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  return (
    <>
      <ButtonBase
        onClick={(event) => (single ? onSelect(group.products[0].id) : setAnchor(event.currentTarget))}
        aria-haspopup={single ? undefined : "true"}
        aria-expanded={anchor ? "true" : undefined}
        aria-pressed={single ? Boolean(active) : undefined}
        aria-label={active ? `${group.label}. Valgt: ${active.name}` : `${group.label}. ${group.products.length} ${group.products.length === 1 ? "produkt" : "produkter"}`}
        sx={{
          display: "flex", alignItems: "center", gap: 1.25, minWidth: single ? 0 : 230, height: 52, pl: 1.25, pr: single ? 2 : 1.25, borderRadius: "12px",
          border: `1.5px solid ${active || anchor ? D.purple : D.borderMed}`, bgcolor: active ? MK.sel : D.surface, textAlign: "left", justifyContent: "flex-start",
          transition: "border-color 120ms, background-color 120ms", "&:hover": { borderColor: D.purple },
        }}
      >
        {active ? (
          <ProductThumb product={active} width={30} height={38} />
        ) : (
          <Box aria-hidden sx={{ display: "flex", alignItems: "center", flexShrink: 0, pl: 1 }}>
            {group.products.slice(0, 3).map((p, i) => (
              <Box key={p.id} sx={{ ml: i === 0 ? 0 : -1.25, opacity: 0.9 }}>
                <ProductThumb product={p} width={22} height={28} />
              </Box>
            ))}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2, color: active ? D.purple : D.text }}>{active ? active.name : group.short}</Typography>
          <Typography noWrap sx={{ fontSize: 12.5, lineHeight: 1.3, color: D.textMuted }}>
            {active ? `${group.short} · ${active.age}` : `${group.products.length} ${group.products.length === 1 ? "produkt" : "produkter"}`}
          </Typography>
        </Box>
        {single ? null : (
          <ExpandMoreRoundedIcon sx={{ color: D.purple, transform: anchor ? "rotate(180deg)" : "none", transition: "transform 120ms" }} />
        )}
      </ButtonBase>

      {single ? null : (
        <Popover
          open={Boolean(anchor)}
          anchorEl={anchor}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{ root: { "data-no-space-search": "" } as object, paper: { onKeyDown: moveFocus, sx: { mt: 0.75, minWidth: 270, borderRadius: "14px", border: `1px solid ${D.border}`, boxShadow: `0 16px 40px ${MK.shadow}`, maxWidth: "calc(100vw - 32px)" } } }}
        >
          <Box role="group" aria-label={group.label} sx={{ p: 1.25, display: "grid", gap: 0.5 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: D.textMuted, px: 1, pb: 0.75, mb: 0.25, borderBottom: `1px solid ${D.border}` }}>
              {group.label}
            </Typography>
            {group.products.map((p) => {
              const selected = p.id === selectedId;
              return (
                <ButtonBase
                  key={p.id}
                  data-product-item
                  ref={selected ? selectedRef : undefined}
                  aria-pressed={selected}
                  onClick={() => { onSelect(p.id); setAnchor(null); }}
                  sx={{
                    display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 1.25, width: "100%", px: 1, py: 0.75, textAlign: "left",
                    borderRadius: "10px", border: `1.5px solid ${selected ? D.purple : "transparent"}`, bgcolor: selected ? MK.sel : "transparent",
                    "&:hover": { bgcolor: selected ? MK.sel : MK.hover },
                    "&.Mui-focusVisible": { outline: `2px solid ${D.purple}`, outlineOffset: 1 },
                  }}
                >
                  <ProductThumb product={p} width={30} height={38} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: selected ? 800 : 600, fontSize: 14.5, lineHeight: 1.25, color: selected ? D.purple : D.text }}>{p.name}</Typography>
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.3, color: D.textMuted }}>{p.age} · {p.type}</Typography>
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
        </Popover>
      )}
    </>
  );
}

/** Startsiden: alle produkter, gruppert på produsent. Fyller høyden uten å scrolle (kortene krymper om det trengs). */
function ProductStart({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <Box
      sx={{
        flex: 1, minHeight: 0, display: "grid", alignContent: "start", columnGap: 3, rowGap: 2.5, px: 3, py: 2.25,
        gridTemplateColumns: { xs: "minmax(0, 1fr)", md: `repeat(${PRODUCT_GROUPS.length}, minmax(0, 1fr))` },
        overflowX: "hidden", overflowY: { xs: "auto", md: "hidden" },
      }}
    >
      {PRODUCT_GROUPS.map((group) => (
        <Box key={group.id} role="group" aria-label={group.label} sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0, minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: D.textMuted, pb: 0.75, mb: 0.25, borderBottom: `1px solid ${D.border}` }}
          >
            {group.label}
          </Typography>
          {group.products.map((p) => (
            <ButtonBase
              key={p.id}
              onClick={() => onSelect(p.id)}
              aria-label={`${p.name}, ${p.age}`}
              sx={{
                display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 1.5, width: "100%", height: 88, minHeight: 56, flexShrink: 1, px: 1.75, textAlign: "left",
                borderRadius: "12px", border: `1px solid ${D.border}`, bgcolor: D.surface, overflow: "hidden",
                transition: "border-color 120ms, background-color 120ms",
                "&:hover": { borderColor: MK.hoverBorder, bgcolor: MK.soft },
                "&.Mui-focusVisible": { outline: `2px solid ${D.purple}`, outlineOffset: 1 },
              }}
            >
              <ProductThumb product={p} width={40} height={50} />
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25, color: D.text }}>{p.name}</Typography>
                <Typography noWrap sx={{ fontSize: 12.5, lineHeight: 1.3, color: D.textMuted }}>{p.age} · {p.type}</Typography>
              </Box>
            </ButtonBase>
          ))}
        </Box>
      ))}
    </Box>
  );
}

function OversiktTab({ product, terms }: { product: Product; terms: string[] }) {
  const fordeler = fordelerList(product);
  const card = { bgcolor: D.surfaceAlt, borderRadius: "12px", p: 2.25, display: "grid", gap: 1.25, alignContent: "start" } as const;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3.5, alignItems: "flex-start" }}>
      {/* Fordeler */}
      <Box sx={{ flex: "1.5 1 420px", minWidth: 0, display: "grid", gap: 1.75 }}>
        <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18, color: D.text }}>Fordeler med {product.name}</Typography>
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 1.75 }}>
          {fordeler.map((f, i) => (
            <Box component="li" key={i} sx={{ display: "flex", gap: 1.75, alignItems: "flex-start" }}>
              <Box aria-hidden sx={{ flex: "0 0 28px", height: 28, borderRadius: "50%", bgcolor: D.blueLight, color: D.purple, fontSize: 14, fontWeight: 800, display: "grid", placeItems: "center" }}>
                {i + 1}
              </Box>
              <Typography sx={{ fontSize: 15.5, color: D.text, lineHeight: 1.55, pt: "2px" }}><Hl text={f} terms={terms} /></Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ flex: "1 1 280px", minWidth: 0, display: "grid", gap: 2 }}>
        {/* Bruksområder */}
        <Box sx={card}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 16, color: D.text }}>Bruksområder</Typography>
          {product.bruksomraader.map((b, i) => (
            <Typography key={i} sx={{ fontSize: 14.5, color: D.text, lineHeight: 1.5 }}><Hl text={b} terms={terms} /></Typography>
          ))}
        </Box>

        {/* Viktig å vite */}
        <Box sx={{ ...card, bgcolor: MK.sel, border: `1px solid ${MK.pillBorder}` }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 16, color: MK.pillText }}>Viktig å vite</Typography>
          {product.viktigAVite.map((v, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <CheckIcon color={D.purple} size={14} />
              <Typography sx={{ fontSize: 14.5, color: D.text, lineHeight: 1.5 }}><Hl text={v} terms={terms} /></Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

const labelSx = {
  fontSize: 12.5,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: D.textMuted,
} as const;

function NæringsinnholdTab({ product, terms }: { product: Product; terms: string[] }) {
  // Åpner den delen av tabellen som har treff på søkeordene.
  const [sectionIndex, setSectionIndex] = useState(() => {
    const hit = product.nutrition.sections.findIndex((sec) => sec.rows.some((row) => countHits(row.label, terms) > 0));
    return hit >= 0 ? hit : 0;
  });
  const { macros, nokkel } = product;
  const sections = product.nutrition.sections;
  const section = sections[sectionIndex] ?? sections[0];
  const headers = product.nutrition.headers;
  const total = macros.reduce((sum, m) => sum + m.value, 0) || 1;
  const columns = "minmax(0, 1fr) 76px 92px";

  // Lange tabeller deles i to kolonner side om side, slik at de bruker halvparten av høyden.
  const rows = section?.rows ?? [];
  const isSub = (label: string) => label.startsWith("–") || label.startsWith("·");
  let split = rows.length;
  if (rows.length > 7) {
    split = Math.ceil(rows.length / 2);
    while (split < rows.length && isSub(rows[split].label)) split += 1;
  }
  const halves = split < rows.length ? [rows.slice(0, split), rows.slice(split)] : [rows];

  const headerCell = { fontSize: 11.5, fontWeight: 700, color: D.textSub, textAlign: "right", lineHeight: 1.2 } as const;

  return (
    <Box sx={{ display: "grid", gap: 1.75 }}>
      {/* Energi og makronæringsstoffer */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 3.5, rowGap: 1 }}>
        <Box sx={{ flex: "0 0 auto" }}>
          <Typography sx={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: D.text }}>
            {product.kcalPer100ml}{" "}
            <Box component="span" sx={{ fontSize: 17, fontWeight: 700, color: D.textMuted }}>kcal</Box>
          </Typography>
          <Typography sx={{ fontSize: 12.5, lineHeight: 1.3, color: D.textMuted, mt: 0.5 }}>
            pr. 100 ml utblandet ({product.pulverPer100ml})
          </Typography>
        </Box>
        <Box sx={{ flex: "1 1 380px", minWidth: 0, display: "grid", gap: 1 }}>
          <Box role="img" aria-label="Fordeling av energi mellom makronæringsstoffer" sx={{ display: "flex", height: 12, borderRadius: "6px", overflow: "hidden", gap: "2px" }}>
            {macros.map((m, i) => (
              <Box key={i} sx={{ flex: `${(m.value / total) * 100} 1 0`, minWidth: 3, bgcolor: macroColor(m.color) }} />
            ))}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2.5, rowGap: 0.25 }}>
            {macros.map((m, i) => (
              <Box key={i} sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.75 }}>
                <Box sx={{ flex: "0 0 9px", height: 9, borderRadius: "3px", bgcolor: macroColor(m.color), alignSelf: "center" }} />
                <Typography component="span" sx={{ fontSize: 13, fontWeight: 600, color: D.textSub }}><Hl text={m.label} terms={terms} /></Typography>
                <Typography component="span" sx={{ fontSize: 14, fontWeight: 800, color: D.text }}><Hl text={m.amount} terms={terms} /></Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Nøkkelnæringsstoffer og valg av tabelldel */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 2, rowGap: 1 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {nokkel.map((n, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "baseline", gap: 0.75, px: 1.25, py: 0.5, borderRadius: "8px", border: `1px solid ${D.border}`, bgcolor: MK.soft }}>
              <Typography sx={{ fontSize: 12.5, color: D.textMuted }}><Hl text={n.label} terms={terms} /></Typography>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: D.text }}><Hl text={n.value} terms={terms} /></Typography>
            </Box>
          ))}
        </Box>
        {sections.length > 1 ? (
          <Box role="group" aria-label="Velg del av næringstabellen" sx={{ display: "flex", flexWrap: "wrap", p: "3px", gap: "2px", bgcolor: D.surface, border: `1px solid ${D.borderMed}`, borderRadius: "10px" }}>
            {sections.map((sec, i) => {
              const active = i === sectionIndex;
              return (
                <ButtonBase
                  key={i}
                  onClick={() => setSectionIndex(i)}
                  aria-pressed={active}
                  sx={{ px: 1.5, minHeight: 30, borderRadius: "7px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", color: active ? MK.onAccent : D.textSub, bgcolor: active ? D.purpleBg : "transparent", "&:hover": { bgcolor: active ? D.purple : D.blueLight } }}
                >
                  {sec.title || "Næringsinnhold"}
                </ButtonBase>
              );
            })}
          </Box>
        ) : null}
      </Box>

      {/* Fullstendig næringstabell */}
      <Box sx={{ border: `1px solid ${D.border}`, borderRadius: "12px", overflow: "hidden" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: halves.length > 1 ? "1fr 1fr" : "1fr" } }}>
          {halves.map((half, h) => (
            <Box key={h} sx={{ borderLeft: { md: h > 0 ? `1px solid ${D.border}` : "none" } }}>
              <Box sx={{ display: "grid", gridTemplateColumns: columns, gap: 1, px: 1.75, py: 0.75, bgcolor: MK.hover }}>
                <Box />
                <Typography title={headers[2] || undefined} sx={headerCell}>Pr. 100 g</Typography>
                <Typography title={headers[3] || undefined} sx={headerCell}>Pr. 100 ml</Typography>
              </Box>
              {half.map((row, i) => {
                const sub = isSub(row.label);
                return (
                  <Box key={i} sx={{ display: "grid", gridTemplateColumns: columns, gap: 1, px: 1.75, py: 0.55, bgcolor: i % 2 === 1 ? D.surfaceAlt : "transparent" }}>
                    <Typography sx={{ fontSize: 13.5, lineHeight: 1.35, color: sub ? D.textSub : D.text, fontWeight: sub ? 400 : 600, pl: sub ? 2 : 0 }}>
                      <Hl text={row.label} terms={terms} />
                      {row.unit ? <Box component="span" sx={{ ml: 0.75, fontSize: 11.5, fontWeight: 400, color: D.textMuted }}>{row.unit}</Box> : null}
                    </Typography>
                    <Typography sx={{ fontSize: 13.5, lineHeight: 1.35, color: D.text, textAlign: "right" }}>{row.per100gPulver}</Typography>
                    <Typography sx={{ fontSize: 13.5, lineHeight: 1.35, color: D.text, textAlign: "right", fontWeight: 700 }}>{row.per100mlUtblandet}</Typography>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function TilberedningTab({ product, terms }: { product: Product; terms: string[] }) {
  const first = product.mixingTable.find((r) => r.skjeer === product.mixingInfo.anbefaltSkjeer) ?? product.mixingTable[0];
  const card = { bgcolor: D.surfaceAlt, borderRadius: "12px", p: 2, display: "grid", gap: 0.75, alignContent: "start" } as const;
  const columns = "repeat(5, minmax(0, 1fr))";
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "flex-start" }}>
      {/* Trinn for trinn */}
      <Box sx={{ flex: "1 1 320px", minWidth: 0, display: "grid", gap: 1.75 }}>
        <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18, color: D.text }}>Slik gjør du</Typography>
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 1.75 }}>
          {product.tilberedning.map((step, i) => (
            <Box component="li" key={i} sx={{ display: "flex", gap: 1.75, alignItems: "flex-start" }}>
              <Box aria-hidden sx={{ flex: "0 0 28px", height: 28, borderRadius: "50%", bgcolor: D.blueLight, color: D.purple, fontSize: 14, fontWeight: 800, display: "grid", placeItems: "center" }}>
                {i + 1}
              </Box>
              <Typography sx={{ fontSize: 15.5, color: D.text, lineHeight: 1.55, pt: "2px" }}><Hl text={step} terms={terms} /></Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ flex: "1.3 1 400px", minWidth: 0, display: "grid", gap: 2.5 }}>
        {/* Konsentrasjon som formel */}
        <Box sx={{ bgcolor: MK.sel, border: `1px solid ${MK.pillBorder}`, borderRadius: "12px", p: 2, display: "grid", gap: 1.5 }}>
          <Typography sx={{ ...labelSx, color: MK.pillText }}>Anbefalt konsentrasjon {product.mixingInfo.konsentrasjon} % vekt/volum</Typography>
          {first ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
              <Box sx={{ px: 1.75, py: 1.25, borderRadius: "10px", bgcolor: D.surface, border: `1px solid ${MK.pillBorder}` }}>
                <Typography sx={{ fontSize: 12.5, color: D.textMuted }}>{first.skjeer} {first.skjeer === 1 ? "måleskje" : "måleskjeer"}</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: D.text }}>{first.pulver} g pulver</Typography>
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: MK.pillText }}>+</Typography>
              <Box sx={{ px: 1.75, py: 1.25, borderRadius: "10px", bgcolor: D.surface, border: `1px solid ${MK.pillBorder}` }}>
                <Typography sx={{ fontSize: 12.5, color: D.textMuted }}>vann</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: D.text }}>{first.vann} ml</Typography>
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: MK.pillText }}>=</Typography>
              <Box sx={{ px: 1.75, py: 1.25, borderRadius: "10px", bgcolor: D.purpleBg, color: MK.onAccent }}>
                <Typography sx={{ fontSize: 12.5, opacity: 0.9 }}>ferdig</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{first.ferdig} ml · {first.energi} kcal</Typography>
              </Box>
            </Box>
          ) : null}
        </Box>

        {/* Utblandingstabell */}
        {product.mixingTable.length > 1 ? (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography component="h2" sx={{ fontWeight: 800, fontSize: 16, color: D.text }}>Utblandingstabell</Typography>
            <Box sx={{ border: `1px solid ${D.border}`, borderRadius: "12px", overflow: "hidden" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: columns, gap: 1, px: 2, py: 1.25, bgcolor: MK.hover }}>
                {["Måleskjeer", "Pulver (g)", "Vann (ml)", "Ferdig (ml)", "Energi (kcal)"].map((h, i) => (
                  <Typography key={h} sx={{ fontSize: 12.5, fontWeight: 700, color: D.textSub, textAlign: i === 0 ? "left" : "right" }}>{h}</Typography>
                ))}
              </Box>
              {product.mixingTable.map((row, i) => (
                <Box key={i} sx={{ display: "grid", gridTemplateColumns: columns, gap: 1, px: 2, py: 1.1, bgcolor: i % 2 === 1 ? D.surfaceAlt : "transparent" }}>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: D.text }}>{row.skjeer}</Typography>
                  {[row.pulver, row.vann, row.ferdig].map((val, j) => (
                    <Typography key={j} sx={{ fontSize: 14.5, color: D.text, textAlign: "right" }}>{val}</Typography>
                  ))}
                  <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: D.text, textAlign: "right" }}>{row.energi}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : null}

        {/* Dosering etter alder */}
        {product.doseringTabell ? (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography component="h2" sx={{ fontWeight: 800, fontSize: 16, color: D.text }}>{product.doseringTabell.tittel}</Typography>
            <Box sx={{ border: `1px solid ${D.border}`, borderRadius: "12px", overflow: "hidden" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: `1.5fr repeat(${product.doseringTabell.kolonner.length - 1}, minmax(0, 1fr))`, gap: 1, px: 2, py: 1.25, bgcolor: MK.hover }}>
                {product.doseringTabell.kolonner.map((h, i) => (
                  <Typography key={h} sx={{ fontSize: 12.5, fontWeight: 700, color: D.textSub, textAlign: i === 0 ? "left" : "right" }}>{h}</Typography>
                ))}
              </Box>
              {product.doseringTabell.rader.map((row, i) => (
                <Box key={i} sx={{ display: "grid", gridTemplateColumns: `1.5fr repeat(${row.length - 1}, minmax(0, 1fr))`, gap: 1, px: 2, py: 1.1, bgcolor: i % 2 === 1 ? D.surfaceAlt : "transparent" }}>
                  {row.map((val, j) => (
                    <Typography key={j} sx={{ fontSize: 14.5, color: D.text, textAlign: j === 0 ? "left" : "right", fontWeight: j === 0 ? 700 : 400 }}>{val}</Typography>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        ) : null}

        {/* Dosering og holdbarhet */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {product.dosering ? (
            <Box sx={{ ...card, flex: "1 1 220px" }}>
              <Typography component="h2" sx={{ fontWeight: 800, fontSize: 15, color: D.text }}>Dosering</Typography>
              <Typography sx={{ fontSize: 14, lineHeight: 1.55, color: D.text }}><Hl text={product.dosering} terms={terms} /></Typography>
            </Box>
          ) : null}
          {product.holdbarhet ? (
            <Box sx={{ ...card, flex: "1 1 220px" }}>
              <Typography component="h2" sx={{ fontWeight: 800, fontSize: 15, color: D.text }}>Holdbarhet</Typography>
              <Typography sx={{ fontSize: 14, lineHeight: 1.55, color: D.text }}><Hl text={product.holdbarhet} terms={terms} /></Typography>
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

type Dokument = { title: string; url: string; sizeLabel: string; color?: string };

const INGR_EGENSKAPER_STANDARD = ["Glutenfri", "Inneholder fiskolje", "Inneholder laktose"];
const INGR_EGENSKAPER_NEOCATE_LCP = ["Glutenfri", "Kostfiberfri", "Laktosefri"];
const INGR_EGENSKAPER_NEOCATE_SPOON = ["Glutenfri", "Laktosefri"];
const INGR_EGENSKAPER_NUTRAMIGEN = ["Laktosefri"];
const INGR_EGENSKAPER_ALFAMINO_JUNIOR = ["Glutenfri", "Halalsertifisert"];
const INGR_EGENSKAPER_ALFAMINO = ["Glutenfri", "Laktosefri", "Halalsertifisert"];
const INGR_EGENSKAPER_ALFARE = ["Glutenfri", "Laktosefri"];
const INGR_EGENSKAPER_ALTHERA = ["Glutenfri", "Inneholder laktose", "Halalsertifisert"];
const INGR_EGENSKAPER_NEOCATE_JUNIOR = ["Glutenfri", "Laktosefri", "Melkeproteinfri", "Kostfiberfri"];

function IngrediensTab({ product, terms }: { product: Product; terms: string[] }) {
  const egenskaper = ingrEgenskaper(product);
  return (
    <Box sx={{ display: "grid", gap: 2.5, maxWidth: 860 }}>
      <Box sx={{ display: "grid", gap: 1.25 }}>
        <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18, color: D.text }}>Ingredienser</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {egenskaper.map((label) => (
            <Box key={label} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.5, borderRadius: "6px", border: `1px solid ${D.borderMed}`, color: D.textSub, fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
              <CheckRoundedIcon sx={{ fontSize: 15, color: MK.ok }} />
              <Hl text={label} terms={terms} />
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ bgcolor: D.surfaceAlt, borderRadius: "12px", p: { xs: 2, md: 2.75 }, display: "grid", gap: 1.25 }}>
        <Typography sx={labelSx}>Ingrediensliste</Typography>
        <Typography sx={{ fontSize: 15, color: D.text, lineHeight: 1.75 }}><Hl text={product.ingredienser} terms={terms} /></Typography>
      </Box>

    </Box>
  );
}

function CopyRow({ label, value, terms }: { label: string; value: string; terms: string[] }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.1, borderTop: `1px solid ${D.border}` }}>
      <Typography sx={{ flex: "0 0 120px", fontSize: 14, color: D.textMuted }}>{label}</Typography>
      <Typography sx={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: D.text }}><Hl text={value} terms={terms} /></Typography>
      <ButtonBase
        onClick={copy}
        aria-label={`Kopier ${label.toLowerCase()} ${value}`}
        sx={{ gap: 0.5, px: 1.25, minHeight: 34, borderRadius: "8px", border: `1px solid ${D.borderMed}`, fontSize: 13, fontWeight: 600, color: copied ? MK.ok : D.textSub, "&:hover": { bgcolor: D.blueLight, borderColor: D.purple } }}
      >
        {copied ? <CheckRoundedIcon sx={{ fontSize: 16 }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 16, color: D.purple }} />}
        {copied ? "Kopiert" : "Kopier"}
      </ButtonBase>
    </Box>
  );
}

function BestillingOgDokumenterTab({ product, dokumenter, terms }: { product: Product; dokumenter: Dokument[]; terms: string[] }) {
  const maker = MANUFACTURERS[product.manufacturer];
  const card = { bgcolor: D.surfaceAlt, borderRadius: "12px", p: 2.25, display: "grid", gap: 1, alignContent: "start" } as const;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3.5, alignItems: "flex-start" }}>
      {/* Bestilling */}
      <Box sx={{ flex: "1.2 1 380px", minWidth: 0, display: "grid", gap: 1.75 }}>
        <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18, color: D.text }}>Bestilling</Typography>
        <Box sx={{ border: `1px solid ${D.border}`, borderRadius: "12px", px: 2.25, pt: 2, pb: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, pb: 1.75 }}>
            {product.image ? (
              <Box sx={{ width: 56, height: 64, flexShrink: 0, borderRadius: "10px", bgcolor: MK.tile, display: "grid", placeItems: "center" }}>
                <Box component="img" src={product.image} alt="" sx={{ width: 44, height: 52, objectFit: "contain" }} />
              </Box>
            ) : null}
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: D.text }}>{product.name}</Typography>
          </Box>
          {product.bestilling.map((row, i) => (
            <Box key={i} sx={{ pb: product.bestilling.length > 1 ? 1.5 : 0 }}>
              {product.bestilling.length > 1 ? (
                <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: D.purple, pt: i > 0 ? 1.25 : 0.25, pb: 0.5, borderTop: i > 0 ? `1px solid ${D.border}` : "none" }}>
                  <Hl text={row.produktnavn} terms={terms} />
                </Typography>
              ) : null}
              {row.bestillingsnr ? <CopyRow label="Bestillingsnr." value={row.bestillingsnr} terms={terms} /> : null}
              <CopyRow label="Varenr." value={row.varenr} terms={terms} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.1, borderTop: `1px solid ${D.border}` }}>
                <Typography sx={{ flex: "0 0 120px", fontSize: 14, color: D.textMuted }}>Salgsenhet</Typography>
                <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 700, color: D.text }}><Hl text={row.salgsenhet} terms={terms} /></Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {product.forsiktighetsregler || product.kontraindikasjon ? (
          <Box sx={{ ...card, bgcolor: MK.sel, border: `1px solid ${MK.pillBorder}` }}>
            <Typography component="h2" sx={{ fontWeight: 800, fontSize: 16, color: MK.pillText }}>Viktig informasjon</Typography>
            {product.forsiktighetsregler ? (
              <Typography sx={{ fontSize: 14.5, color: D.text, lineHeight: 1.6 }}><Hl text={product.forsiktighetsregler} terms={terms} /></Typography>
            ) : null}
            {product.kontraindikasjon ? (
              <Typography sx={{ fontSize: 14.5, color: D.text, lineHeight: 1.6 }}>
                <Box component="span" sx={{ fontWeight: 700 }}>Kontraindikasjon: </Box>
                <Hl text={product.kontraindikasjon} terms={terms} />
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Box>

      <Box sx={{ flex: "1 1 300px", minWidth: 0, display: "grid", gap: 2.5 }}>
        {/* Dokumenter */}
        <Box sx={{ display: "grid", gap: 1.25 }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18, color: D.text }}>Dokumenter</Typography>
          {dokumenter.length > 0 ? (
            dokumenter.map((doc, i) => (
              <Box
                key={i}
                component="a"
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5, p: 1.5, minHeight: 64,
                  bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: "12px",
                  textDecoration: "none", transition: "border-color 120ms, background-color 120ms",
                  "&:hover": { borderColor: MK.hoverBorder, bgcolor: MK.soft },
                }}
              >
                <Box sx={{ flex: "0 0 40px", height: 40, borderRadius: "10px", bgcolor: D.blueLight, color: D.purple, display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 800 }}>
                  PDF
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: D.text, lineHeight: 1.3 }}><Hl text={doc.title} terms={terms} /></Typography>
                  <Typography sx={{ fontSize: 12.5, color: D.textMuted }}>PDF · {doc.sizeLabel}</Typography>
                </Box>
                <OpenInNewRoundedIcon sx={{ fontSize: 18, color: D.textMuted }} />
              </Box>
            ))
          ) : (
            <Typography sx={{ fontSize: 14, color: D.textMuted }}>Ingen dokumenter registrert.</Typography>
          )}
        </Box>

        {/* Kontakt */}
        <Box sx={card}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 16, color: D.text }}>{maker.contactTitle}</Typography>
          <Typography sx={{ fontSize: 14, color: D.textSub, lineHeight: 1.6, fontStyle: "italic" }}>{maker.notice}</Typography>
          <Typography sx={{ fontSize: 14.5, color: D.text, lineHeight: 1.7 }}>
            {maker.address}<br />
            {maker.tel.title ?? "Tlf."} <Box component="a" href={maker.tel.href} sx={{ color: D.purple, fontWeight: 600 }}>{maker.tel.label}</Box>
            {maker.email ? (
              <>
                <br />
                E-post <Box component="a" href={`mailto:${maker.email}`} sx={{ color: D.purple, fontWeight: 600 }}>{maker.email}</Box>
              </>
            ) : null}
            {maker.extra.map((line) => (
              <span key={line.label}>
                <br />
                {line.label} <Box component="a" href={line.href} target={line.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" sx={{ color: D.purple, fontWeight: 600 }}>{line.value}</Box>
              </span>
            ))}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Søk: hva som vises og hva som kan søkes i ────────────────────────────────
const DOKUMENT_MAP: Record<string, Dokument[]> = {
  "pepticate-1": [{ title: "Produktark Pepticate", url: "/dokumenter/pepticate-1-produktark.pdf", sizeLabel: "344 KB" }],
  "pepticate-plus-2": [{ title: "Produktark Pepticate Plus", url: "/dokumenter/pepticate-plus-2-produktark.pdf", sizeLabel: "359 KB" }],
  "neocate-lcp": [{ title: "Produktark Neocate LCP", url: "/dokumenter/Neocate-LCP.pdf", sizeLabel: "530 KB" }],
  "neocate-spoon": [{ title: "Produktark Neocate Spoon", url: "/dokumenter/Neocate-spoon.pdf", sizeLabel: "493 KB" }],
  "nutramigen-puramino-junior": [{ title: "Produktark Nutramigen Puramino Junior", url: "/dokumenter/Nutramigen-Puramino-Junior.pdf", sizeLabel: "435 KB" }],
  "nutramigen-puramino": [{ title: "Produktark Nutramigen Puramino", url: "/dokumenter/Nutramigen-Puramino.pdf", sizeLabel: "458 KB" }],
  "nutramigen-2": [{ title: "Produktark Nutramigen 2", url: "/dokumenter/Nutramigen-2.pdf", sizeLabel: "418 KB" }],
  "nutramigen-1": [{ title: "Produktark Nutramigen 1", url: "/dokumenter/Nutramigen-1.pdf", sizeLabel: "415 KB" }],
  "alfamino-junior": [{ title: "Produktark Alfamino Junior", url: "/dokumenter/Alfamino-Junior.pdf", sizeLabel: "331 KB" }],
  "alfamino": [{ title: "Produktark Alfamino", url: "/dokumenter/Alfamino.pdf", sizeLabel: "272 KB" }],
  "alfare": [{ title: "Produktark Alfaré", url: "/dokumenter/Alfare.pdf", sizeLabel: "309 KB" }],
  "althera": [{ title: "Produktark Althéra", url: "/dokumenter/Althera.pdf", sizeLabel: "303 KB" }],
  "neocate-junior": [{ title: "Produktark Neocate Junior", url: "/dokumenter/Neocate-Junior-2026.pdf", sizeLabel: "1,1 MB" }],
};

/** Produktbeskrivelsen er første fordel (med mindre den allerede står i listen). */
function fordelerList(product: Product): string[] {
  const beskrivelse = `${product.tagline} ${product.description}`.trim();
  return product.fordeler.some((f) => f.includes(product.tagline)) ? product.fordeler : [beskrivelse, ...product.fordeler];
}

const ingrEgenskaper = (product: Product): string[] => {
  if (product.id === "neocate-lcp") return INGR_EGENSKAPER_NEOCATE_LCP;
  if (product.id === "neocate-spoon") return INGR_EGENSKAPER_NEOCATE_SPOON;
  if (product.id === "neocate-junior") return INGR_EGENSKAPER_NEOCATE_JUNIOR;
  if (product.id === "althera") return INGR_EGENSKAPER_ALTHERA;
  if (product.id === "alfare") return INGR_EGENSKAPER_ALFARE;
  if (product.id === "alfamino") return INGR_EGENSKAPER_ALFAMINO;
  if (product.id === "alfamino-junior") return INGR_EGENSKAPER_ALFAMINO_JUNIOR;
  if (product.id.startsWith("nutramigen-puramino")) return ["Laktosefri", "Halalsertifisert", "Koshersertifisert"];
  if (product.id.startsWith("nutramigen")) return INGR_EGENSKAPER_NUTRAMIGEN;
  return INGR_EGENSKAPER_STANDARD;
};

/** Det som vises i produkthodet. Brukes både til visning og til søk, så de alltid er like. */
function heroInfo(product: Product) {
  const g = groupBadges(product);
  const smak = product.smaksvarianter ? product.smaksvarianter.replace(/\.$/, "") : "";
  const tiles = [
    // Alderen står allerede ved siden av navnet, så den trenger ikke egen rute.
    // Har produktet både halal og kosher, slås de sammen til én «Sertifisert»-rute i stedet for kun «Halal».
    ...product.summary
      .filter((s) => s.label !== "Alder")
      .map((s) =>
        s.label === "Halal" && s.value === "Ja" && g.sertifisert.some((l) => /kosher/i.test(l))
          ? { label: "Sertifisert", value: g.sertifisert.join(" · "), span: 1 }
          : { label: s.label, value: s.value, span: 1 }
      ),
    // «Fri for» + «Gluten» leses som «Fri for gluten».
    { label: "Fri for", value: g.fri.filter((l) => l !== "Laktosefri").map((l) => l.replace(/fri$/i, "")).join(" · "), span: 1 },
  ].filter((t) => t.value);
  return { primary: g.primary, smak, tilsatt: g.tilsatt.join(" · "), tiles };
}

/** Alle tekster som vises for et produkt, gruppert etter hvor de står. `tab` -1 er produkthodet. */
function buildSearchFields(product: Product): SearchField[] {
  const fields: SearchField[] = [];
  const add = (tab: number, label: string, text: string) => {
    if (text) fields.push({ tab, label, text });
  };
  const hero = heroInfo(product);
  add(-1, "Produkt", product.name);
  add(-1, "Produsent", MANUFACTURERS[product.manufacturer].label);
  add(-1, "Alder", product.age);
  hero.primary.forEach((text) => add(-1, "Egenskaper", text));
  add(-1, "Smak", hero.smak);
  add(-1, "Tilsatt", hero.tilsatt);
  hero.tiles.forEach((t) => add(-1, "Nøkkeltall", `${t.label}: ${t.value}`));

  fordelerList(product).forEach((text) => add(0, "Fordeler", text));
  product.bruksomraader.forEach((text) => add(0, "Bruksområder", text));
  product.viktigAVite.forEach((text) => add(0, "Viktig å vite", text));

  product.macros.forEach((m) => add(1, "Næringsinnhold", `${m.label} ${m.amount}`));
  product.nokkel.forEach((n) => add(1, "Næringsinnhold", `${n.label} ${n.value}`));
  product.nutrition.sections.forEach((section) => section.rows.forEach((row) => add(1, "Næringsinnhold", row.label)));

  product.tilberedning.forEach((text) => add(2, "Tilberedning", text));
  add(2, "Dosering", product.dosering);
  add(2, "Holdbarhet", product.holdbarhet);

  ingrEgenskaper(product).forEach((text) => add(3, "Egenskaper", text));
  add(3, "Ingredienser", product.ingredienser);

  product.bestilling.forEach((order) => {
    if (product.bestilling.length > 1) add(4, "Bestilling", order.produktnavn);
    add(4, "Bestilling", order.bestillingsnr);
    add(4, "Bestilling", order.varenr);
    add(4, "Bestilling", order.salgsenhet);
  });
  add(4, "Viktig informasjon", product.forsiktighetsregler);
  add(4, "Viktig informasjon", product.kontraindikasjon);
  (DOKUMENT_MAP[product.id] ?? []).forEach((doc) => add(4, "Dokumenter", doc.title));
  return fields;
}

const PRODUCT_FIELDS: Record<string, SearchField[]> = Object.fromEntries(PRODUCTS.map((p) => [p.id, buildSearchFields(p)]));
const SEARCHABLE = PRODUCTS.map((p) => ({ id: p.id, fields: PRODUCT_FIELDS[p.id] }));
const PRODUCT_INFO: Record<string, SearchProductInfo> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, { id: p.id, name: p.name, meta: `${p.age} · ${p.type}`, image: p.image }])
);
const TAB_COUNT = 5;

// ─── Icon helpers ─────────────────────────────────────────────────────────────
function BottleIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 2h6v2.5l1.5 2V20a2 2 0 01-2 2H9.5a2 2 0 01-2-2V6.5L9 4.5V2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
      <path d="M8 9h8" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M9 2h6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CheckIcon({ size = 14, color = "#22C55E" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="8" cy="8" r="7" fill={color + "20"} stroke={color} strokeWidth="1.2"/>
      <path d="M5 8l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MelkeerstatningTab() {
  const muiTheme = useTheme();
  const mkVars = muiTheme.palette.mode === "dark" ? MK_DARK_VARS : MK_LIGHT_VARS;
  const [selectedId, setSelectedId] = useState<string>(PRODUCTS[0].id);
  // Startsiden viser alle produktene; et valgt produkt åpner produktvisningen.
  const [home, setHome] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Søk: lukket til brukeren åpner det (knapp eller «/»).
  const [searchOpen, setSearchOpen] = useState(false);
  const [tokens, setTokens] = useState<string[]>([]);
  const [pending, setPending] = useState("");
  const [mode, setMode] = useState<SearchMode>("all");
  const [view, setView] = useState<"results" | "product">("results");
  const [cur, setCur] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const product = PRODUCTS.find(p => p.id === selectedId) ?? PRODUCTS[0];
  const TABS = ["Oversikt", "Næringsinnhold", "Tilberedning & dosering", "Ingredienser", "Bestilling & dokumenter"];
  const aktiveDokumenter = DOKUMENT_MAP[product.id] ?? [];

  const terms = useMemo(() => (searchOpen ? [...tokens, ...parseTokens(pending)] : []), [searchOpen, tokens, pending]);
  const termsKey = terms.join("\u0001");
  const matches = useMemo(() => rankProducts(SEARCHABLE, terms), [terms]);
  const hasHit = (term: string) => SEARCHABLE.some((item) => item.fields.some((f) => countHits(f.text, [term]) > 0));

  // Mellomrom åpner søket når ingenting annet har tekstfokus (Ctrl/Cmd + mellomrom er globalt søk).
  // Fanges i capture-fasen og stoppes, slik at en fokusert knapp ikke også blir «klikket».
  useEffect(() => {
    if (searchOpen) return;
    const isSpace = (event: KeyboardEvent) => (event.key === " " || event.code === "Space") && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
    const typing = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);
    };
    let swallowKeyUp = false;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSpace(event) || typing(event.target)) return;
      if ((event.target as HTMLElement | null)?.closest?.("[data-no-space-search]")) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      swallowKeyUp = true;
      setSearchOpen(true);
      setView("results");
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!swallowKeyUp || (event.key !== " " && event.code !== "Space")) return;
      swallowKeyUp = false;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [searchOpen]);

  const addTokens = (list: string[]) =>
    setTokens((prev) => {
      const next = [...prev];
      for (const token of list) {
        if (!next.some((existing) => normalizeText(existing) === normalizeText(token))) next.push(token);
      }
      return next;
    });
  const commit = () => {
    addTokens(parseTokens(pending));
    setPending("");
  };
  const handlePendingChange = (value: string) => {
    // Mellomrom avslutter et ord (med mindre en «frase» er åpen).
    if (/\s$/.test(value) && (value.match(/"/g) ?? []).length % 2 === 0) {
      const list = parseTokens(value);
      if (list.length > 0) {
        addTokens(list);
        setPending("");
        return;
      }
    }
    setPending(value);
  };
  const clearSearch = () => {
    setTokens([]);
    setPending("");
    setView("results");
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setTokens([]);
    setPending("");
    setView("results");
  };
  const openProduct = (id: string) => {
    const firstTab = PRODUCT_FIELDS[id]
      .filter((f) => f.tab >= 0 && countHits(f.text, terms) > 0)
      .map((f) => f.tab)
      .sort((a, b) => a - b)[0];
    setSelectedId(id);
    setHome(false);
    setActiveTab(firstTab ?? 0);
    setView("product");
    setCur(0);
  };

  // Treff i valgt produkt: i produkthodet, og per undertab.
  const productFields = PRODUCT_FIELDS[product.id];
  const sumHits = (list: SearchField[]) => (terms.length ? list.reduce((sum, f) => sum + countHits(f.text, terms), 0) : 0);
  const heroCount = sumHits(productFields.filter((f) => f.tab === -1));
  const tabCounts = Array.from({ length: TAB_COUNT }, (_, t) => sumHits(productFields.filter((f) => f.tab === t)));
  const totalHits = heroCount + tabCounts.reduce((a, b) => a + b, 0);
  const termCounts = terms.map((term) => ({ term, count: productFields.reduce((sum, f) => sum + countHits(f.text, [term]), 0) }));
  const position =
    cur < heroCount
      ? cur + 1
      : heroCount + tabCounts.slice(0, activeTab).reduce((a, b) => a + b, 0) + (cur - heroCount) + 1;

  const nextHit = () => {
    if (cur + 1 < heroCount + tabCounts[activeTab]) {
      setCur(cur + 1);
      return;
    }
    const nextTab = tabCounts.findIndex((count, t) => t > activeTab && count > 0);
    if (nextTab !== -1) {
      setActiveTab(nextTab);
      setCur(heroCount);
      return;
    }
    const firstTab = tabCounts.findIndex((count) => count > 0);
    if (firstTab !== -1 && heroCount === 0) setActiveTab(firstTab);
    setCur(0);
  };
  const prevHit = () => {
    if (cur > 0) {
      setCur(cur - 1);
      return;
    }
    let prevTab = -1;
    tabCounts.forEach((count, t) => {
      if (t < activeTab && count > 0) prevTab = t;
    });
    if (prevTab === -1) {
      tabCounts.forEach((count, t) => {
        if (count > 0) prevTab = t;
      });
    }
    if (prevTab !== -1) {
      setActiveTab(prevTab);
      setCur(heroCount + tabCounts[prevTab] - 1);
    }
  };

  // Marker aktivt treff og rull til det.
  useEffect(() => {
    if (!searchOpen || view !== "product") return;
    const marks = [
      ...(heroRef.current?.querySelectorAll<HTMLElement>("mark[data-hit]") ?? []),
      ...(contentRef.current?.querySelectorAll<HTMLElement>("mark[data-hit]") ?? []),
    ];
    marks.forEach((mark, i) => {
      mark.style.background = i === cur ? HIT_NOW_BG : HIT_BG;
      mark.style.boxShadow = i === cur ? HIT_NOW_SHADOW : "none";
    });
    marks[cur]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [searchOpen, view, cur, activeTab, selectedId, termsKey]);

  const showResults = searchOpen && (view === "results" || terms.length === 0);
  const chooseProduct = (id: string) => {
    setSelectedId(id);
    setActiveTab(0);
    setHome(false);
  };
  const productGroup = PRODUCT_GROUPS.find((g) => g.id === product.manufacturer) ?? PRODUCT_GROUPS[0];
  const hero = heroInfo(product);

  return (
    <Box data-melke-root sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, bgcolor: D.surface, color: D.text, overflow: "hidden" }}>
      <CssVars styles={{ ":root": mkVars }} />
      {searchOpen ? (
        <SearchHeader
          tokens={tokens}
          pending={pending}
          mode={mode}
          inputRef={inputRef}
          onPendingChange={handlePendingChange}
          onCommit={commit}
          onRemoveToken={(index) => setTokens((prev) => prev.filter((_, i) => i !== index))}
          onBackspaceEmpty={() => setTokens((prev) => prev.slice(0, -1))}
          onClear={clearSearch}
          onClose={closeSearch}
          onModeChange={setMode}
          onBack={view === "product" && terms.length > 0 ? () => setView("results") : undefined}
          hint={terms.length === 0 ? "Søker i navn, egenskaper, fordeler, bruksområder, tilberedning, ingredienser, næringsinnhold og bestillingsinfo – også på varenr." : undefined}
        />
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.25, flexShrink: 0, bgcolor: MK.soft, borderBottom: `1px solid ${D.border}` }}>
          {home ? (
            <Typography component="h1" sx={{ fontWeight: 800, fontSize: 18, color: D.text, flex: 1 }}>Velg produkt</Typography>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "center", flex: 1, minWidth: 0 }}>
              <ButtonBase
                onClick={() => setHome(true)}
                sx={{
                  display: "flex", alignItems: "center", gap: 0.5, height: 52, pl: 1, pr: 1.75, borderRadius: "12px", border: `1.5px solid ${D.borderMed}`, bgcolor: D.surface,
                  fontSize: 14.5, fontWeight: 600, color: D.textSub, transition: "border-color 120ms", "&:hover": { borderColor: D.purple, color: D.purple },
                }}
              >
                <ChevronLeftRoundedIcon sx={{ color: D.purple }} />
                Alle produkter
              </ButtonBase>
              <ManufacturerPicker group={productGroup} selectedId={selectedId} onSelect={chooseProduct} />
            </Box>
          )}
          <SearchTrigger onClick={() => { setSearchOpen(true); setView("results"); }} />
        </Box>
      )}

      {home && !searchOpen ? (
        <ProductStart onSelect={chooseProduct} />
      ) : showResults ? (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {terms.length === 0 ? (
            <SuggestionsPanel hasHit={hasHit} onPick={(list) => { addTokens(list); inputRef.current?.focus(); }} />
          ) : (
            <SearchResults matches={matches} info={PRODUCT_INFO} terms={terms} mode={mode} onOpen={openProduct} />
          )}
        </Box>
      ) : (
        <>
          {searchOpen ? (
            <MatchBanner productName={product.name} total={totalHits} termCounts={termCounts} position={position} onPrev={prevHit} onNext={nextHit} />
          ) : null}

          {/* Produkthode */}
          <Box ref={heroRef} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2.5, px: 3, py: 1.5, flexShrink: 0, borderBottom: `1px solid ${D.border}` }}>
            <Box sx={{ width: 80, height: 92, flexShrink: 0, borderRadius: "10px", bgcolor: MK.tile, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {product.image
                ? <Box component="img" src={product.image} alt={product.name} sx={{ width: 70, height: 82, objectFit: "contain", transform: product.imageScale ? `scale(${product.imageScale})` : undefined }} />
                : <BottleIcon size={40} color={D.purple} />}
            </Box>

            <Box sx={{ flex: "1 1 300px", minWidth: 0, display: "grid", gap: 0.75 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 1.5 }}>
                <Typography component="h1" sx={{ fontWeight: 800, fontSize: 24, color: D.text, lineHeight: 1.15 }}><Hl text={product.name} terms={terms} /></Typography>
                <Typography sx={{ fontSize: 15, color: D.textMuted, fontWeight: 600 }}><Hl text={product.age} terms={terms} /></Typography>
              </Box>
              {hero.primary.length > 0 ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {hero.primary.map((label) => (
                    <Box key={label} sx={{ px: 1.25, py: 0.5, borderRadius: "6px", bgcolor: MK.pill, color: MK.pillText, fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
                      <Hl text={label} terms={terms} />
                    </Box>
                  ))}
                </Box>
              ) : null}
              {hero.smak || hero.tilsatt ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2.5, rowGap: 0.25, fontSize: 14, color: D.textSub }}>
                  {hero.smak ? (
                    <Typography component="span" sx={{ fontSize: "inherit" }}>
                      <Box component="span" sx={{ color: D.textMuted, fontWeight: 600, mr: 1 }}>Smak</Box>
                      <Hl text={hero.smak} terms={terms} />
                    </Typography>
                  ) : null}
                  {hero.tilsatt ? (
                    <Typography component="span" sx={{ fontSize: "inherit" }}>
                      <Box component="span" sx={{ color: D.textMuted, fontWeight: 600, mr: 1 }}>Tilsatt</Box>
                      <Hl text={hero.tilsatt} terms={terms} />
                    </Typography>
                  ) : null}
                </Box>
              ) : null}
            </Box>

            <Box sx={{ flex: "1.4 1 340px", maxWidth: 560, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridAutoFlow: "row dense", gap: 0.75 }}>
              {hero.tiles.map((t, i) => (
                <Box key={i} sx={{ gridColumn: `span ${t.span}`, bgcolor: D.surfaceAlt, borderRadius: "10px", px: 1.25, py: 0.75, display: "grid", gap: 0, alignContent: "start" }}>
                  <Typography sx={{ fontSize: 11.5, color: D.textMuted, fontWeight: 600 }}><Hl text={t.label} terms={terms} /></Typography>
                  <Typography sx={{ fontSize: 13.5, color: D.text, fontWeight: 700, lineHeight: 1.25 }}><Hl text={t.value} terms={terms} /></Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Undertabber */}
          <Box sx={{ px: 3, flexShrink: 0, borderBottom: `1px solid ${D.border}` }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => { setActiveTab(v); setCur(0); }}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Produktinformasjon"
              sx={{
                minHeight: 46,
                "& .MuiTabs-flexContainer": { gap: 3.25 },
                "& .MuiTabs-indicator": { bgcolor: D.purple, height: 3, borderRadius: "3px 3px 0 0" },
                "& .MuiTab-root": {
                  minHeight: 46, minWidth: 0, px: 0.25, py: 1.25, fontSize: 14.5, fontWeight: 600, color: D.textMuted, textTransform: "none",
                  "&:hover": { color: D.text },
                  "&.Mui-selected": { color: D.purple, fontWeight: 700 },
                },
              }}
            >
              {TABS.map((label, i) => (
                <Tab
                  key={i}
                  disableRipple
                  label={
                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.9 }}>
                      {label}
                      {searchOpen && tabCounts[i] > 0 ? (
                        <Box component="span" sx={{ minWidth: 20, height: 20, px: 0.75, boxSizing: "border-box", borderRadius: "10px", bgcolor: HIT_BG, color: MK.hitText, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          {tabCounts[i]}
                        </Box>
                      ) : null}
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Box>

          {/* Innhold – eneste rullefelt */}
          <Box ref={contentRef} sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 3, py: 2.75 }}>
            {activeTab === 0 && <OversiktTab product={product} terms={terms} />}
            {activeTab === 1 && <NæringsinnholdTab key={`${product.id}-${termsKey}`} product={product} terms={terms} />}
            {activeTab === 2 && <TilberedningTab product={product} terms={terms} />}
            {activeTab === 3 && <IngrediensTab product={product} terms={terms} />}
            {activeTab === 4 && <BestillingOgDokumenterTab product={product} dokumenter={aktiveDokumenter} terms={terms} />}

            <Typography sx={{ mt: 3, fontSize: 12, color: D.textMuted, textAlign: "center" }}>
              {MANUFACTURERS[product.manufacturer].footer}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}
