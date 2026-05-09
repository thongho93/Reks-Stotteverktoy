import React, { useState, useEffect } from "react";
import { Box, Typography, useTheme } from "@mui/material";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TabKey = "rad" | "lege" | "kilder";

interface Medicine {
  name: string;
  form: string;
  type: string;
  comment: string;
  priority?: "first" | "second" | "need" | "doctor";
  priorityLabel?: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const MEDICINES: Medicine[] = [
  // ── Alginat — Førstevalg ──
  {
    name: "Gaviscon tyggetabletter",
    form: "Tyggetablett",
    type: "Alginat",
    comment: "Danner et skumlag over mageinnholdet og hindrer det fra å stige opp. Trygt for gravide.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  {
    name: "Gaviscon mikstur* / Galieve*",
    form: "Mikstur",
    type: "Alginat + syrenøytraliserende",
    comment: "Inneholder alginat og syrenøytraliserende. Maks 4 ganger daglig pga. kalsiumkarbonat. Trygt for gravide.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  // ── Syrenøytraliserende — Førstevalg ──
  {
    name: "Novaluzid / Titralac*",
    form: "Tablett",
    type: "Syrenøytraliserende",
    comment: "Syrenøytraliserende middel. Titralac inneholder kalsiumkarbonat – maks 4 ganger daglig. Godt dokumentert i graviditet.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  {
    name: "Natron NAF",
    form: "Pulver/tablett",
    type: "Syrenøytraliserende",
    comment: "Natriumbikarbonat. Brukes som kortidsbehandling. Ikke anbefalt ved høyt blodtrykk eller ved stort inntak over tid.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  // ── H2-blokker — Ved behov ──
  {
    name: "Pepcid**",
    form: "Tablett",
    type: "H2-blokker (famotidin)",
    comment: "Famotidin reduserer syreproduksjonen. Brukes ved behov. Kontakt lege ved bruk i mer enn 2 uker sammenhengende.",
    priority: "second",
    priorityLabel: "Andrevalg",
  },
  {
    name: "Pepciduo**",
    form: "Tablett",
    type: "H2-blokker + syrenøytraliserende",
    comment: "Kombinasjon av famotidin og syrenøytraliserende. Kontakt lege ved bruk i mer enn 2 uker sammenhengende.",
    priority: "second",
    priorityLabel: "Andrevalg",
  },
  // ── PPI — Kontakt lege først ──
  {
    name: "Losec / Omeprazol",
    form: "Kapsel",
    type: "PPI",
    comment: "Syrehemmende middel. Mest erfaring av PPI-preparatene i graviditet. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
  {
    name: "Nexium / Esomeprazol",
    form: "Kapsel/tablett",
    type: "PPI",
    comment: "Syrehemmende middel. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
  {
    name: "Somac / Somac Control / Pantoprazol",
    form: "Tablett",
    type: "PPI",
    comment: "Syrehemmende middel. Anbefales ikke som rutinebehandling. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
  {
    name: "Lanzor Melt / Lansoprazol",
    form: "Smeltetablett",
    type: "PPI",
    comment: "Syrehemmende middel. Les mer i pakningsvedlegget. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
];

const BedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <g transform="matrix(0.4 0 0 0.4 12 12)">
      <path style={{ fill: "currentColor" }} transform="translate(-25, -25.5)" d="M 3 9 C 1.3545455 9 0 10.354545 0 12 L 0 42 L 6 42 L 6 37 L 44 37 L 44 42 L 50 42 L 50 28 L 50 23 C 50 20.254545 47.745455 18 45 18 L 19 18 C 18.44773812379154 18.00005521790535 18.00005521790535 18.44773812379154 18 19 L 18 28 L 12 28 L 6 28 L 6 12 C 6 10.354545 4.6454545 9 3 9 z M 12 28 C 14.749579 28 17 25.749579 17 23 C 17 20.250421 14.749579 18 12 18 C 9.2504209 18 7 20.250421 7 23 C 7 25.749579 9.2504209 28 12 28 z M 3 11 C 3.5545455 11 4 11.445455 4 12 L 4 30 L 5 30 L 48 30 L 48 40 L 46 40 L 46 35 L 4 35 L 4 40 L 2 40 L 2 12 C 2 11.445455 2.4454545 11 3 11 z M 12 20 C 13.668699 20 15 21.331301 15 23 C 15 24.668699 13.668699 26 12 26 C 10.331301 26 9 24.668699 9 23 C 9 21.331301 10.331301 20 12 20 z M 20 20 L 45 20 C 46.654545 20 48 21.345455 48 23 L 48 28 L 20 28 L 20 20 z" />
    </g>
  </svg>
);

const FlameIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, color: "currentColor" }}>
    <g transform="matrix(0.4 0 0 0.4 12 12)">
      <path style={{ fill: "currentColor" }} transform="translate(-25, -23.99)" d="M 34.984375 1.9863281 C 34.432858843006734 1.9949491731996494 33.9924473355562 2.448468177176025 34 2.9999999999999996 C 34 3.888391 33.814434 4.344325 33.558594 4.7070312 C 33.302754 5.0697375 32.918099 5.3617834 32.419922 5.7167969 C 31.921745 6.0718104 31.308325 6.488187 30.8125 7.1777344 C 30.316675 7.8672817 30 8.8105045 30 10 C 29.994899710454515 10.36063591657757 30.184375296169332 10.696081364571606 30.49587284971433 10.877887721486518 C 30.80737040325933 11.059694078401428 31.19262959674067 11.059694078401428 31.50412715028567 10.877887721486516 C 31.815624703830668 10.696081364571606 32.00510028954548 10.360635916577568 32 10 C 32 9.1349955 32.183325 8.699187 32.4375 8.3457031 C 32.691675 7.9922192 33.078255 7.7033146 33.580078 7.3457031 C 34.081901 6.9880916 34.697246 6.55995 35.191406 5.859375 C 35.685566 5.1588 36 4.206609 36 3 C 36.00370143373364 2.729699684396449 35.89782328543507 2.469413389385951 35.70649029658461 2.278448343881242 C 35.51515730773415 2.0874832983765335 35.25466768994374 1.9821063716760876 34.984375 1.9863281 z M 38.984375 4.9863281 C 38.432858843006734 4.994949173199649 37.9924473355562 5.448468177176025 38 5.999999999999999 C 38 6.5255038 37.890897 6.7662115 37.722656 6.9980469 C 37.554416 7.2298823 37.276827 7.4535546 36.904297 7.7304688 C 36.531767 8.0073829 36.064042 8.3345838 35.667969 8.8652344 C 35.271895 9.3958849 35 10.134898 35 11 C 34.99489971045452 11.36063591657757 35.184375296169335 11.696081364571606 35.49587284971433 11.877887721486518 C 35.80737040325933 12.059694078401428 36.19262959674067 12.059694078401428 36.50412715028567 11.877887721486516 C 36.81562470383067 11.696081364571606 37.00510028954548 11.360635916577568 37 11 C 37 10.501602 37.103105 10.285474 37.269531 10.0625 C 37.435958 9.8395255 37.718233 9.6145703 38.095703 9.3339844 C 38.473173 9.0533985 38.945584 8.7151646 39.339844 8.171875 C 39.734103 7.6285854 40 6.8809962 40 6 C 40.00370143373364 5.729699684396449 39.89782328543507 5.469413389385951 39.70649029658461 5.278448343881243 C 39.51515730773416 5.087483298376533 39.25466768994374 4.982106371676087 38.984375 4.9863281 z M 25 14 C 24.44773812379154 14.00005521790535 24.00005521790535 14.447738123791542 24 15 L 24 19.632812 C 23.422681 19.276093 22.780836 19.022603 22.056641 19.011719 C 21.243414 17.856947 20.01528 17 18.5 17 C 16.808088 17 15.347156 17.954489 14.580078 19.345703 C 14.092886 19.132703 13.563738 19 13 19 C 12.254309 19 11.593524 19.261337 11 19.617188 C 10.406476 19.261337 9.7456911 19 9 19 C 7.0963885 19 5.565638 20.379514 5.1699219 22.169922 C 3.7122176 22.492104 2.5867726 23.565495 2.203125 25 L 1 25 C 0.44773812379154077 25.00005521790535 0.00005521790534890325 25.44773812379154 1.1102230246251565e-16 26 L 0 28.908203 C 0 32.954759 2.1922529 36.47002 5.0292969 39 L 1 39 C 0.6684042193146984 39.00033433768462 0.35853437659685605 39.16500485481175 0.1727065084765036 39.439638933141126 C -0.013121359643848862 39.7142730114705 -0.05074235036141128 40.06315746181807 0.07226562500000011 40.371094 L 1.2089844 43.216797 C 1.8797968 44.895118 3.512226 46 5.3203125 46 L 44.679688 46 C 46.487774 46 48.119305 44.894139 48.791016 43.216797 L 49.927734 40.371094 C 50.050741950904836 40.063157523406176 50.01312100128273 39.71427314646984 49.82729322182213 39.439639088160305 C 49.64146544236154 39.16500502985076 49.33159571429387 39.00033446190376 49 39 L 42.837891 39 C 43.485102 37.79483 43.885268 36.396675 43.972656 34.894531 C 45.079037 34.662788 46.03188 34.053141 46.759766 33.244141 C 47.693581 32.206262 48.329487 30.86688 48.798828 29.427734 C 49.737511 26.549443 50 23.238947 50 21 C 50 19.35503 48.64497 18 47 18 L 44 18 L 44 15 C 43.99994478209465 14.447738123791542 43.55226187620846 14.000055217905349 43 14 L 25 14 z M 26 16 L 42 16 L 42 33.832031 C 41.982150951947155 33.940022437464606 41.982150951947155 34.050211562535395 42 34.158203 L 42 34.275391 C 42 36.161034 41.342591 37.797719 40.394531 39 L 27.611328 39 C 26.897816 38.098917 26.347401 36.953334 26.117188 35.640625 C 26.040742 35.203232 26 34.746801 26 34.275391 L 26 26 L 26 20.351562 L 26 16 z M 18.5 19 C 19.510885 19 20.364522 19.596468 20.761719 20.453125 C 20.94173864448833 20.84189256492183 21.349386640433686 21.07281462312581 21.775391 21.027344 C 21.942063 21.009325 22.008807 21 22 21 C 22.56837 21 23.067044 21.23328 23.433594 21.613281 C 23.585369855455752 21.770126083312636 23.784287887423275 21.873014853748494 24 21.90625 L 24 25 L 4.4101562 25 C 4.7611146 24.435884 5.2770463 24 6 24 C 6.552261876208459 23.99994478209465 6.9999447820946505 23.55226187620846 7 23 C 7 21.883334 7.8833339 21 9 21 C 9.5129326 21 9.9660877 21.193756 10.330078 21.521484 C 10.710691280299896 21.864862433636905 11.289308719700104 21.864862433636905 11.669922 21.521484 C 12.033912 21.193756 12.487067 21 13 21 C 13.53733 21 14.01396 21.20984 14.376953 21.556641 C 14.641533897068191 21.80889363979056 15.022665534688949 21.896691336458115 15.370942635115405 21.785617006870865 C 15.71921973554186 21.67454267728361 15.979145543729603 21.382295632861332 16.048828 21.023438 C 16.271642 19.870806 17.272028 19 18.5 19 z M 44 20 L 47 20 C 47.56503 20 48 20.43497 48 21 C 48 23.073053 47.726052 26.262932 46.896484 28.806641 C 46.481701 30.078495 45.926528 31.180379 45.273438 31.90625 C 44.87889 32.344765 44.465829 32.63552 44 32.810547 L 44 20 z M 2 27 L 3 27 L 24 27 L 24 34.275391 C 24 34.515445 24.011754 34.75029 24.03125 34.982422 C 24.128899 36.451507 24.527473 37.818245 25.162109 39 L 8.2734375 39 C 4.8992009 36.801012 2 33.027952 2 28.908203 L 2 27 z M 2.4765625 41 L 7.9394531 41 L 27.013672 41 L 27.064453 41 L 40.943359 41 L 47.523438 41 L 46.933594 42.472656 C 46.563304 43.397314 45.675601 44 44.679688 44 L 5.3203125 44 C 4.324399 44 3.4355939 43.398288 3.0664062 42.474609 C 3.0664068356380874 42.47395800015516 3.066406835638088 42.473306999844844 3.0664062000000003 42.472656 L 2.4765625 41 z" strokeLinecap="round" />
    </g>
  </svg>
);

const HeartburnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <g transform="matrix(0.83 0 0 0.83 12 12)">
      <g>
        <g transform="matrix(1 0 0 1 0 -0.06)">
          <path style={{ stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }} transform="translate(-12, -11.94)" d="M 17.411 23.132 C 20.630086794187932 20.986159603419956 22.54508870888669 17.357477453009245 22.5 13.489000000000004 C 22.50920524720246 11.208408370227334 21.85497315337247 8.974360381206171 20.617000000000004 7.059000000000003 L 17.617 10.585 C 16.737287142023987 7.695645607189019 16.731372631207297 4.610706347683555 17.6 1.7180000000000035 C 17.675439321249844 1.471259613667694 17.61857102274519 1.2030623430647815 17.449488347009314 1.008170172354799 C 17.280405671273435 0.8132780016448163 17.02291675280699 0.7191332397053155 16.768 0.759 C 12.478376719886917 1.4633972069265981 8.79560002533717 4.201814850273243 6.885999999999999 8.107000000000001 L 4.5 5.616 C 2.5515753837508317 7.77340474497978 1.4813465926902256 10.582041835653168 1.5000000000000018 13.489000000000004 C 1.4549112911133097 17.357477453009242 3.3699132058120673 20.986159603419956 6.588999999999999 23.132" strokeLinecap="round" />
        </g>
        <g transform="matrix(1 0 0 1 0 6)">
          <path style={{ stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }} transform="translate(-12, -18)" d="M 12 23.25 L 6.78 17.915 C 5.84137942417271 17.004363956216277 5.606158002100248 15.58816877366966 6.199999999999999 14.423000000000002 L 6.2 14.423 C 6.657910064176343 13.549114618633155 7.501827721717062 12.942991987048899 8.476194540130523 12.788180521661193 C 9.450561358543982 12.633369056273487 10.440784227328638 12.948075788587126 11.147000000000002 13.637 L 11.999 14.472000000000001 L 12.852 13.637 C 13.558027396814323 12.948075003638733 14.548116771578158 12.633354783562673 15.52234611760807 12.788175702685097 C 16.49657546363798 12.94299662180752 17.34032403792936 13.549143576205738 17.798000000000002 14.422999999999998 L 17.798000000000002 14.423 C 18.39209277029813 15.5879565426313 18.157281709832983 17.004122731136142 17.219 17.915 Z" strokeLinecap="round" />
        </g>
      </g>
    </g>
  </svg>
);

const BrokenBoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <g transform="matrix(0.83 0 0 0.83 12 12)">
      <g>
        <g transform="matrix(1 0 0 1 -5.95 6.09)">
          <path style={{ stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }} transform="translate(-6.05, -18.09)" d="M 11.247 14.729 C 11.418000938989163 14.784891211172784 11.54775694695757 14.925504137839397 11.589756901804822 15.100435988610963 C 11.631756856652075 15.275367839382529 11.579985383789289 15.459564287087867 11.453 15.587 L 9.015 18.024 C 9.035 18.004 9.248000000000001 18.164 9.372 18.29 C 9.945291995618442 18.864166353285793 10.265542377586469 19.64350823613063 10.261599148959316 20.454874469365457 C 10.257655920332162 21.266240702600285 9.929845663751848 22.042433019740535 9.350999999999999 22.610999999999997 C 8.136712207033167 23.803840011591685 6.187757004869248 23.79446574241041 4.984999999999999 22.589999999999996 C 4.258758356785598 21.862524831519174 3.947205970322173 20.81850489232087 4.155999999999999 19.811999999999998 C 2.8357282341644967 20.090098955974973 1.4904876336176556 19.462607816311305 0.8551530854332992 18.272310972301312 C 0.21981853724894274 17.08201412829132 0.4471657417052328 15.615136269592124 1.4129999999999994 14.672999999999998 C 2.648970859390623 13.487653860426448 4.607044345116568 13.512129778998023 5.812999999999999 14.727999999999998 C 5.972450932117092 14.884276845253108 6.114604230157865 15.057274726831032 6.237 15.243999999999998 L 8.653 12.828999999999997 C 8.782194465956344 12.699777261689283 8.970006459107232 12.648351075720159 9.147010277808539 12.693731405108776 C 9.324014096509844 12.739111734497394 9.463915807645106 12.874557327249859 9.515 13.049999999999997 L 9.873000000000001 14.278999999999996 Z" strokeLinecap="round" />
        </g>
        <g transform="matrix(1 0 0 1 6.23 -5.75)">
          <path style={{ stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }} transform="translate(-18.23, -6.25)" d="M 15.846 11.764 C 15.945949328131785 11.911202398099855 16.114454050987856 11.996805075975518 16.29227791840761 11.990715217502238 C 16.470101785827367 11.984625359028959 16.632355388968275 11.887695341221892 16.722 11.734 L 18.57 8.557 C 18.556 8.582 18.77 8.746 18.918 8.835 C 19.619619965364688 9.241782891726965 20.4546612557235 9.351452984310123 21.2375251676459 9.139634684322484 C 22.0203890795683 8.927816384334845 22.68620977081888 8.412060344221008 23.087 7.707000000000001 C 23.762128089727064 6.529829482321283 23.5893300677533 5.04980712853764 22.661179018275863 4.059825313257969 C 21.733027968798428 3.0698434979782974 20.267206846396384 2.802086591032216 19.049 3.3999999999999995 C 18.971516608129967 2.045746177289859 18.015537438129833 0.9023631462790895 16.69642008236417 0.5862358079191794 C 15.377302726598508 0.27010846955926926 14.006907898749205 0.8559744481596581 13.323999999999998 2.0280000000000005 C 12.521141913883948 3.553983673041235 13.069509998864426 5.441677838260091 14.565 6.3 C 14.7570781022785 6.414264586762646 14.960924522382633 6.507470680165522 15.173 6.577999999999999 L 13.339 9.731 C 13.247271095989163 9.887033219328845 13.24400290175617 10.079720479684816 13.330387565707628 10.238774706912974 C 13.416772229659086 10.397828934141133 13.580178419666957 10.499992912451228 13.761000000000001 10.508 L 15.036000000000001 10.569999999999999 Z" strokeLinecap="round" />
        </g>
        <g transform="matrix(1 0 0 1 -6.5 -3.5)">
          <path style={{ stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round", fill: "none" }} transform="translate(-5.5, -8.5)" d="M 6.5 8.5 L 4.5 8.5" strokeLinecap="round" />
        </g>
        <g transform="matrix(1 0 0 1 -5.33 -6.33)">
          <path style={{ stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round", fill: "none" }} transform="translate(-6.67, -5.67)" d="M 7.379 6.379 L 5.964 4.964" strokeLinecap="round" />
        </g>
        <g transform="matrix(1 0 0 1 -2.5 -7.5)">
          <path style={{ stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round", fill: "none" }} transform="translate(-9.5, -4.5)" d="M 9.5 5.5 L 9.5 3.5" strokeLinecap="round" />
        </g>
        <g transform="matrix(1 0 0 1 6.5 3.5)">
          <path style={{ stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round", fill: "none" }} transform="translate(-18.5, -15.5)" d="M 17.5 15.5 L 19.5 15.5" strokeLinecap="round" />
        </g>
        <g transform="matrix(1 0 0 1 5.33 6.33)">
          <path style={{ stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round", fill: "none" }} transform="translate(-17.33, -18.33)" d="M 16.621 17.621 L 18.036 19.036" strokeLinecap="round" />
        </g>
        <g transform="matrix(1 0 0 1 2.5 7.5)">
          <path style={{ stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round", fill: "none" }} transform="translate(-14.5, -19.5)" d="M 14.5 18.5 L 14.5 20.5" strokeLinecap="round" />
        </g>
      </g>
    </g>
  </svg>
);

const SYMPTOMS: { label: string; icon: React.ReactNode }[] = [
  { label: "Sure oppstøt",        icon: <HeartburnIcon /> },
  { label: "Svie bak brystbenet", icon: <BrokenBoneIcon /> },
  { label: "Verre etter måltid",  icon: <FlameIcon /> },
  { label: "Verre når du ligger", icon: <BedIcon /> },
];

const RAD_TIPS = [
  "Hev hodebunnen av sengen for å begrense plager om natten.",
  "Unngå å spise store måltider – spis sakte og rolig, særlig på kvelden.",
  "Unngå fet eller syrlig mat som forverrer plager.",
  "Unngå å legge deg rett etter et måltid – vent minst 2–3 timer.",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function priorityColor(p: Medicine["priority"]): string {
  if (p === "first")  return "#16a34a";
  if (p === "second") return "#2563eb";
  if (p === "need")   return "#d97706";
  return "#dc2626";
}


// ─── Sub-components ────────────────────────────────────────────────────────────
function TreatmentCard({ med }: { med: Medicine }) {
  const color = priorityColor(med.priority);

  return (
    <div style={{
      background: "#fff",
      borderRadius: 18,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.07)",
      transition: "box-shadow 160ms ease, transform 160ms ease",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.10), 0 16px 32px rgba(0,0,0,0.10)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.07)";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      {/* Top accent stripe */}
      <div style={{ height: 5, background: color, flexShrink: 0 }} />

      {/* Body */}
      <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>

        {/* Priority row */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{
            fontSize: 10, fontWeight: 800, color,
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            {med.priorityLabel}
          </span>
        </div>

        {/* Name */}
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a", lineHeight: 1.3, marginBottom: 8 }}>
          {med.name}
        </div>

        {/* Type tag */}
        <div style={{
          display: "inline-block",
          fontSize: 10, fontWeight: 600, color: "#64748b",
          background: "#f1f5f9", borderRadius: 6, padding: "2px 8px",
          border: "1px solid #e2e8f0", marginBottom: 10,
          wordBreak: "break-word", lineHeight: 1.5,
        }}>
          {med.type}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `${color}20`, marginBottom: 10 }} />

        {/* Description */}
        <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.65, flex: 1 }}>
          {med.comment}
        </div>


      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function GravidHalsbrannDetail({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const dk = theme.palette.mode === "dark";
  const [activeTab, setActiveTab] = useState<TabKey>("rad");

  const textMain  = dk ? "#f0e8f4" : "#0f172a";
  const textSub   = dk ? "#8e7d98" : "#64748b";
  const border    = dk ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const ACCENT    = "#06B6D4"; // halsbrann cyan

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onBack(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "rad",    label: "Ikke-medikamentelle råd", icon: "🌿" },
    { key: "lege",   label: "Når kontakte lege",       icon: "ℹ️" },
    { key: "kilder", label: "Kilder",                  icon: "📄" },
  ];

  return (
    <Box sx={{ bgcolor: dk ? "#0a0e1a" : "#f0f4f8", minHeight: "100%" }}>

      {/* ══ HERO BANNER ══════════════════════════════════════════════════════ */}
      <Box sx={{
        background: dk
          ? "linear-gradient(135deg, #0f2027 0%, #0c1a2e 60%, #0f172a 100%)"
          : "linear-gradient(135deg, #e0f7fa 0%, #e8eaf6 60%, #f3e5f5 100%)",
        pt: 4, pb: 5,
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)`, pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: "30%", width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, #a78bfa22 0%, transparent 70%)`, pointerEvents: "none" }} />

        {/* Inner wrapper — same max-width + padding as content section */}
        <Box sx={{ px: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto", position: "relative" }}>

          {/* Breadcrumb */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2.5, fontSize: 12, fontWeight: 600 }}>
            <span style={{ cursor: "pointer", color: ACCENT }} onClick={onBack}>Gravide</span>
            <span style={{ color: textSub, fontSize: 14 }}>›</span>
            <span style={{ color: textSub }}>Halsbrann</span>
          </Box>

          {/* Title row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
            <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 900, color: textMain, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Halsbrann hos gravide
            </Typography>
            <Box sx={{
              width: 48, height: 48, borderRadius: 3, flexShrink: 0,
              background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${ACCENT}30`,
            }}>
              <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: ACCENT }}>
                <path fillRule="evenodd" clipRule="evenodd" d="M39 8H9C8.44771 8 8 8.44772 8 9V39C8 39.5523 8.44772 40 9 40H39C39.5523 40 40 39.5523 40 39V9C40 8.44771 39.5523 8 39 8ZM9 6C7.34315 6 6 7.34315 6 9V39C6 40.6569 7.34315 42 9 42H39C40.6569 42 42 40.6569 42 39V9C42 7.34315 40.6569 6 39 6H9Z" fill="currentColor"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M20.0889 10C20.0889 15.1089 17.7658 18.9036 15.3041 23.3195C12.2373 28.8208 15.0904 33.5826 18.5926 38C18.5926 32.9306 19.3994 30.0689 23.1926 26.2587C25.5254 30.4353 25.7372 33.5009 25 38C34.6627 33.334 34.1463 25.6833 31.33 17C30.787 19 29.7752 20.8182 29.1179 22.0909C27.809 17.0219 24.076 13.3085 20.0889 10Z" fill="currentColor"/>
              </svg>
            </Box>
          </Box>

          <Typography sx={{ fontSize: 14.5, color: textSub, lineHeight: 1.75, mb: 2.5, maxWidth: 560 }}>
            Halsbrann er svært vanlig i graviditet. Det skyldes hormonelle endringer og økt trykk fra livmoren.
            Flere reseptfrie alternativer kan brukes trygt.
          </Typography>

          <span style={{
            fontSize: 11.5, fontWeight: 700, padding: "4px 12px",
            borderRadius: 999, background: dk ? "#1e293b" : "#f1f5f9",
            color: "#64748b", border: "1px solid #e2e8f0",
          }}>
            Sist oppdatert: Mai 2024
          </span>

        </Box>
      </Box>

      {/* ══ CONTENT ══════════════════════════════════════════════════════════ */}
      <Box sx={{ px: { xs: 2, md: 4 }, pt: 3, pb: 4, maxWidth: 1100, mx: "auto" }}>

        {/* ─── Symptoms ─────────────────────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.1em", mb: 1.5 }}>
            Kjenner du deg igjen?
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {SYMPTOMS.map(({ label, icon }) => (
              <span key={label} style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                fontSize: 13, fontWeight: 600,
                background: dk ? "#1e293b" : "#fff",
                borderRadius: 12, padding: "8px 16px",
                border: `1.5px solid ${dk ? "#334155" : "#e2e8f0"}`,
                color: dk ? "#94a3b8" : "#334155",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <span style={{ color: ACCENT, display: "inline-flex" }}>{icon}</span>
                {label}
              </span>
            ))}
          </Box>
        </Box>

        {/* ─── Treatment alternatives ───────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Behandlingsalternativer
            </Typography>
            <svg aria-label="Rangert etter anbefaling" width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ cursor: "help", flexShrink: 0, color: textSub, opacity: 0.7 }}>
              <g transform="matrix(0.43 0 0 0.43 12 12)">
                <path style={{ fill: "currentColor" }} transform="translate(-25, -25)" d="M 24.5 2 C 21.472656 2 19 4.472656 19 7.5 C 19 10.527344 21.472656 13 24.5 13 C 27.527344 13 30 10.527344 30 7.5 C 30 4.472656 27.527344 2 24.5 2 Z M 24.5 4 C 26.445313 4 28 5.554688 28 7.5 C 28 9.445313 26.445313 11 24.5 11 C 22.554688 11 21 9.445313 21 7.5 C 21 5.554688 22.554688 4 24.5 4 Z M 15 16 C 14.449219 16 14 16.449219 14 17 L 14 23 C 14 23.550781 14.449219 24 15 24 L 20 24 L 20 40 L 15 40 C 14.449219 40 14 40.449219 14 41 L 14 47 C 14 47.550781 14.449219 48 15 48 L 35 48 C 35.550781 48 36 47.550781 36 47 L 36 41 C 36 40.449219 35.550781 40 35 40 L 30 40 L 30 17 C 30 16.449219 29.550781 16 29 16 Z M 16 18 L 28 18 L 28 41 C 28 41.550781 28.449219 42 29 42 L 34 42 L 34 46 L 16 46 L 16 42 L 21 42 C 21.550781 42 22 41.550781 22 41 L 22 23 C 22 22.449219 21.550781 22 21 22 L 16 22 Z" />
              </g>
            </svg>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: 2 }}>
            {MEDICINES.filter(m => m.priority).map(med => (
              <TreatmentCard key={med.name} med={med} />
            ))}
          </Box>

          {/* Footnotes */}
          <Box sx={{
            background: dk ? "#161b27" : "#f8fafc",
            border: `1px solid ${border}`,
            borderRadius: 2, p: "10px 14px",
            display: "flex", flexDirection: "column", gap: 0.5,
          }}>
            <Typography sx={{ fontSize: 11, color: textSub, lineHeight: 1.7 }}>
              <strong style={{ color: textMain }}>*</strong> Medisiner som inneholder kalsiumkarbonat (Gaviscon mikstur, Galieve, Titralac) bør ikke brukes oftere enn høyst fire ganger om dagen.
            </Typography>
            <Typography sx={{ fontSize: 11, color: textSub, lineHeight: 1.7 }}>
              <strong style={{ color: textMain }}>**</strong> Kontakt lege hvis du har behov for å bruke famotidin (Pepcid, Pepcidduo) i mer enn to uker sammenhengende.
            </Typography>
          </Box>
        </Box>

        {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.1em", mb: 2 }}>
            Mer informasjon
          </Typography>

          {/* Tab pills */}
          <Box sx={{
            display: "inline-flex", gap: 0.5, mb: 0,
            background: dk ? "#1e293b" : "#f1f5f9",
            borderRadius: "14px 14px 0 0", p: "6px 6px 0",
          }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  border: "none", cursor: "pointer",
                  padding: "8px 18px",
                  borderRadius: "10px 10px 0 0",
                  background: activeTab === tab.key ? (dk ? "#0f172a" : "#fff") : "transparent",
                  fontSize: 12.5, fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? textMain : textSub,
                  boxShadow: activeTab === tab.key ? "0 -1px 0 0 rgba(0,0,0,0.06)" : "none",
                  transition: "all 150ms ease",
                  whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
                  borderBottom: activeTab === tab.key ? `2px solid ${ACCENT}` : "2px solid transparent",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </Box>

          {/* Tab panel */}
          <Box sx={{
            background: dk ? "#0f172a" : "#fff",
            border: `1px solid ${border}`,
            borderRadius: "0 14px 14px 14px",
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>

            {/* ── Ikke-medikamentelle råd ── */}
            {activeTab === "rad" && (
              <Box sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: textSub, mb: 2, lineHeight: 1.6 }}>
                  Selv om du bruker medisiner, bør du forsøke å følge disse generelle rådene mot halsbrann og sure oppstøt.
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                  {RAD_TIPS.map((tip, i) => (
                    <Box key={i} sx={{
                      display: "flex", gap: 1.5, alignItems: "flex-start",
                      background: dk ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${border}`,
                      borderRadius: 3, p: 2,
                    }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                        background: dk ? "#0f172a" : "#fff",
                        border: `1px solid ${border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 20, display: "inline-flex", alignItems: "center" }}>
                          {i === 0 ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <g transform="matrix(0.2 0 0 0.2 12 12)">
                                <g transform="matrix(1 0 0 1 13 -12)">
                                  <path style={{ fill: "rgb(254,253,239)" }} transform="translate(-63, -38)" d="M 74 25.5 L 75.391 28.133 L 78.5 28.556 L 76.25 30.606 L 76.781 33.5 L 74 32.133 L 71.219 33.5 L 71.75 30.606 L 69.5 28.556 L 72.609 28.133 z M 52 23.5 L 53.391 26.133 L 56.5 26.556 L 54.25 28.606 L 54.781 31.5 L 52 30.133 L 49.219 31.5 L 49.75 28.606 L 47.5 26.556 L 50.609 26.133 z M 63 44.5 L 64.391 47.133 L 67.5 47.556 L 65.25 49.606 L 65.781 52.5 L 63 51.133 L 60.219 52.5 L 60.75 49.606 L 58.5 47.556 L 61.609 47.133 z" />
                                </g>
                                <g transform="matrix(1 0 0 1 0 0)">
                                  <path style={{ fill: "rgb(249,230,92)" }} transform="translate(-50, -50)" d="M 61.5 64 C 47.417 64 36 52.583 36 38.5 C 36 28.774 40.992 20.3 49 16 C 30.566 16.4 16 31.474 16 50 C 16 68.778 31.222 84 50 84 C 68.526 84 83.6 69.434 84 51 C 79.7 59.008 71.226 64 61.5 64 z" />
                                </g>
                                <g transform="matrix(1 0 0 1 0 0)">
                                  <path style={{ fill: "rgb(31,33,43)" }} transform="translate(-50, -50)" d="M 50 85 C 30.701 85 15 69.299 15 50 C 15 30.787 29.925 15.414 48.979 15 C 49.474 15.004 49.85 15.299 49.967 15.746 C 50.085 16.193 49.881 16.663 49.473 16.881 C 41.663 21.075 37 29.157 37 38.5 C 37 52.009 47.99 63 61.5 63 C 70.843 63 78.925 58.337 83.119 50.527 C 83.337 50.12 83.805 49.917 84.255 50.033 C 84.701 50.15 85.01 50.56 85 51.021 C 84.586 70.075 69.212 85 50 85 z M 45.145 17.308 C 29.082 19.532 17 33.211 17 50 C 17 68.196 31.804 83 50 83 C 66.788 83 80.468 70.918 82.691 54.855 C 77.815 61.194 70.018 65 61.5 65 C 46.888 65 35 53.112 35 38.5 C 35 29.981 38.806 22.185 45.145 17.308 z" />
                                </g>
                              </g>
                            </svg>
                          ) : ["🍽️", "🥗", "⏰"][i - 1]}
                        </span>
                      </Box>
                      <Typography sx={{ fontSize: 13, color: textMain, lineHeight: 1.7 }}>{tip}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* ── Når kontakte lege ── */}
            {activeTab === "lege" && (
              <Box sx={{ p: 3 }}>
                <Box sx={{
                  background: dk ? "#1a0a0a" : "#fff5f5",
                  border: "1.5px solid #fca5a5",
                  borderRadius: 3, p: 2, mb: 2.5,
                  display: "flex", gap: 1.5, alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>🩺</span>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: "#dc2626", mb: 0.5 }}>
                      Når bør du kontakte lege?
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: dk ? "#f87171" : "#7f1d1d", lineHeight: 1.65 }}>
                      Verken alginat, syrenøytraliserende midler eller famotidin gir tilstrekkelig effekt? Kontakt lege
                      for å diskutere om andre alternativer kan være riktige for deg.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    "Sterke smerter i magen eller brystet",
                    "Vedvarende plager som ikke bedres med reseptfrie midler",
                    "Symptomer som forverrer seg over tid",
                    "Behov for bruk av famotidin i mer enn to uker sammenhengende",
                  ].map((item, i) => (
                    <Box key={i} sx={{
                      display: "flex", gap: 1.25, alignItems: "center",
                      background: dk ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${border}`, borderRadius: 2, p: "10px 14px",
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626", flexShrink: 0, display: "inline-block" }} />
                      <Typography sx={{ fontSize: 13, color: textMain, lineHeight: 1.5 }}>{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* ── Kilder ── */}
            {activeTab === "kilder" && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
                  {[
                    { name: "Trygg Mammamedisin", desc: "Nasjonal tjeneste for legemiddelinformasjon ved graviditet og amming, drevet av RELIS.", url: "https://www.tryggmammamedisin.no" },
                    { name: "RELIS", desc: "Avdeling for legemiddelinformasjon og farmakologi. Ansvarlig for tjenesten Trygg Mammamedisin.", url: "https://www.relis.no" },
                  ].map(src => (
                    <Box key={src.name} sx={{
                      p: 2, background: dk ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${border}`, borderRadius: 3,
                      display: "flex", flexDirection: "column", gap: 0.5,
                    }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: ACCENT }}>{src.name}</Typography>
                      <Typography sx={{ fontSize: 12.5, color: textSub, lineHeight: 1.6 }}>{src.desc}</Typography>
                      <a href={src.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: ACCENT, fontWeight: 600, textDecoration: "none", marginTop: 4 }}>
                        {src.url} ↗
                      </a>
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ fontSize: 11, color: textSub, lineHeight: 1.7, fontStyle: "italic" }}>
                  Sist oppdatert: Mai 2024. Informasjonen er skrevet av/godkjent av legespesialister og oppdateres
                  jevnlig basert på ny forskning og erfaring fra graviditetsomsorgen.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
