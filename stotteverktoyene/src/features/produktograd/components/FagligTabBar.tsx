import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type MouseEvent } from "react";
import { Box, ButtonBase, InputBase, Menu, MenuItem, Popover, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

export const PRODUCT_TAB_KEY = "__produkt__";
export const ROUTINES_TAB_KEY = "__rutiner__";

export type FagligTabItem = {
  id: string;
  label: string;
  emoji?: string | null;
  /** Egne dokumenter har valgmeny (⋯); faste faner har ikke det. */
  hasMenu: boolean;
};

export type FagligTabBarHandle = {
  /** Åpner «Alle faner»-listen med markøren i søkefeltet. */
  openAllTabs: () => void;
};

type Props = {
  items: FagligTabItem[];
  activeKey: string;
  /** Faner brukeren selv har flyttet til «Flere». */
  moreIds: string[];
  onSelect: (key: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onAddEmbedded: () => void;
  onAddText: () => void;
  onOpenMenu: (event: MouseEvent<HTMLElement>, id: string) => void;
  onPin: (id: string) => void;
};

const TAB_GAP = 20;
const PLUS_WIDTH = 40;
const MORE_WIDTH = 96;

const normalize = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

type Layout = { widths: Record<string, number>; slot: number };

const FagligTabBar = forwardRef<FagligTabBarHandle, Props>(function FagligTabBar(
  { items, activeKey, moreIds, onSelect, onReorder, onAddEmbedded, onAddText, onOpenMenu, onPin },
  ref
) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const slotRef = useRef<HTMLDivElement>(null);
  const measurerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>({ widths: {}, slot: 0 });
  const [allAnchor, setAllAnchor] = useState<HTMLElement | null>(null);
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [filter, setFilter] = useState("");

  const c = {
    ink: isDark ? "#F2EDF0" : "#2D1727",
    muted: isDark ? "#B79AAE" : "#6B5262",
    accent: isDark ? "#F09AC0" : "#A81F66",
    line: isDark ? "rgba(140,80,120,0.3)" : "#EAD2E1",
    surface: isDark ? "#161B22" : "#FFFFFF",
    hover: isDark ? "rgba(180,40,100,0.22)" : "#FCE7F2",
    softBg: isDark ? "rgba(180,40,100,0.22)" : "#FCE7F2",
    divider: isDark ? "rgba(160,90,130,0.4)" : "#E3C6D8",
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Aktiv fane skal alltid vises, selv om den er flyttet til «Flere».
  const candidates = useMemo(
    () => items.filter((item) => !moreIds.includes(item.id) || item.id === activeKey),
    [items, moreIds, activeKey]
  );
  const measureKey = candidates.map((item) => `${item.id}:${item.emoji ?? ""}:${item.label}`).join("|");

  // Mål bredden på fanene og plassen som er til rådighet, og vis så mange som mulig.
  useEffect(() => {
    const measure = () => {
      const slot = slotRef.current;
      const measurer = measurerRef.current;
      if (!slot || !measurer) return;
      const widths: Record<string, number> = {};
      measurer.querySelectorAll<HTMLElement>("[data-measure-id]").forEach((el) => {
        widths[el.dataset.measureId ?? ""] = Math.ceil(el.getBoundingClientRect().width);
      });
      const slotWidth = Math.floor(slot.clientWidth);
      setLayout((prev) => {
        const same =
          prev.slot === slotWidth &&
          Object.keys(widths).length === Object.keys(prev.widths).length &&
          Object.entries(widths).every(([id, width]) => prev.widths[id] === width);
        return same ? prev : { widths, slot: slotWidth };
      });
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => requestAnimationFrame(measure));
    if (slotRef.current) observer.observe(slotRef.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measureKey]);

  const visible = useMemo(() => {
    const measured = layout.slot > 0 && candidates.every((item) => layout.widths[item.id] !== undefined);
    if (!measured) return candidates;
    const used = (count: number) =>
      candidates.slice(0, count).reduce((sum, item) => sum + (layout.widths[item.id] ?? 0) + TAB_GAP, 0);
    let count = candidates.length;
    const hasHiddenByUser = items.length > candidates.length;
    if (used(count) + PLUS_WIDTH + (hasHiddenByUser ? MORE_WIDTH : 0) > layout.slot) {
      while (count > 0 && used(count) + PLUS_WIDTH + MORE_WIDTH > layout.slot) count -= 1;
    }
    let shown = candidates.slice(0, count);
    const active = candidates.find((item) => item.id === activeKey);
    if (active && !shown.includes(active)) {
      shown = shown.length > 0 ? [...shown.slice(0, -1), active] : [active];
    }
    return shown;
  }, [layout, candidates, items.length, activeKey]);

  const visibleIds = visible.map((item) => item.id);
  const hidden = items.filter((item) => !visibleIds.includes(item.id));

  useImperativeHandle(ref, () => ({
    openAllTabs: () => setAllAnchor(slotRef.current),
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  const tabSx = (selected: boolean) => ({
    px: 0.25,
    pt: 1.25,
    pb: 1.5,
    mb: "-1px",
    minHeight: 44,
    gap: 0.75,
    fontSize: { xs: 14, md: 15.5 },
    fontWeight: selected ? 700 : 600,
    whiteSpace: "nowrap",
    color: selected ? c.accent : c.muted,
    borderBottom: `3px solid ${selected ? c.accent : "transparent"}`,
    transition: "color 140ms ease",
    "&:hover": { color: selected ? c.accent : c.ink },
    "&.Mui-focusVisible": { outline: `2px solid ${c.accent}`, outlineOffset: -2, borderRadius: "6px" },
  });

  const renderLabel = (item: FagligTabItem) => (
    <>
      {item.emoji ? <Box component="span" sx={{ fontSize: 16, lineHeight: 1 }}>{item.emoji}</Box> : null}
      {item.label}
    </>
  );

  const divider = <Box aria-hidden sx={{ width: "1px", height: 20, mb: "2px", bgcolor: c.divider, flexShrink: 0 }} />;

  const closeAll = () => {
    setAllAnchor(null);
    setFilter("");
  };

  const normalizedFilter = normalize(filter.trim());
  const matches = (item: FagligTabItem) => !normalizedFilter || normalize(item.label).includes(normalizedFilter);
  const shownInBar = items.filter((item) => visibleIds.includes(item.id) && matches(item));
  const shownInMore = hidden.filter(matches);

  const menuRow = (item: FagligTabItem, canPin: boolean) => (
    <ButtonBase
      key={item.id}
      onClick={() => {
        onSelect(item.id);
        closeAll();
      }}
      sx={{
        width: "100%",
        justifyContent: "flex-start",
        gap: 1,
        minHeight: 40,
        px: 1.25,
        borderRadius: "8px",
        textAlign: "left",
        fontSize: 14.5,
        fontWeight: item.id === activeKey ? 700 : 600,
        color: item.id === activeKey ? c.accent : c.ink,
        bgcolor: item.id === activeKey ? c.softBg : "transparent",
        "&:hover": { bgcolor: c.hover },
      }}
    >
      <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.emoji ? `${item.emoji} ` : ""}
        {item.label}
      </Box>
      {item.id === activeKey ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : null}
      {canPin ? (
        <Box
          component="span"
          role="button"
          tabIndex={0}
          aria-label={`Fest ${item.label} i fanelinjen`}
          onClick={(event) => {
            event.stopPropagation();
            onPin(item.id);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onPin(item.id);
            }
          }}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 0.75,
            py: 0.25,
            borderRadius: "6px",
            fontSize: 12.5,
            fontWeight: 600,
            color: c.muted,
            "&:hover": { color: c.accent, bgcolor: c.surface },
          }}
        >
          <PushPinOutlinedIcon sx={{ fontSize: 15 }} />
          Fest
        </Box>
      ) : null}
    </ButtonBase>
  );

  const sectionLabel = (text: string) => (
    <Typography sx={{ px: 1.25, pt: 1, pb: 0.25, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: c.muted }}>
      {text}
    </Typography>
  );

  return (
    <Box
      role="tablist"
      aria-label="Produkt og råd, faglig innhold og rutiner"
      sx={{
        position: "relative",
        mx: "auto",
        width: "100%",
        maxWidth: 980,
        display: "flex",
        alignItems: "flex-end",
        gap: `${TAB_GAP}px`,
        borderBottom: `1px solid ${c.line}`,
      }}
    >
      <ButtonBase
        role="tab"
        aria-selected={activeKey === PRODUCT_TAB_KEY}
        onClick={() => onSelect(PRODUCT_TAB_KEY)}
        sx={{ ...tabSx(activeKey === PRODUCT_TAB_KEY), flexShrink: 0 }}
      >
        Produkt og råd
      </ButtonBase>
      {divider}

      <Box ref={slotRef} sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-end", gap: `${TAB_GAP}px` }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleIds} strategy={horizontalListSortingStrategy}>
            {visible.map((item) => (
              <SortableTab key={item.id} id={item.id}>
                <ButtonBase
                  role="tab"
                  aria-selected={activeKey === item.id}
                  onClick={() => onSelect(item.id)}
                  sx={tabSx(activeKey === item.id)}
                >
                  {renderLabel(item)}
                </ButtonBase>
                {item.hasMenu && activeKey === item.id ? (
                  <ButtonBase
                    aria-label={`Valg for fanen ${item.label}`}
                    onClick={(event) => onOpenMenu(event, item.id)}
                    sx={{ ml: -1.25, mb: "6px", width: 28, height: 28, borderRadius: "7px", color: c.accent, "&:hover": { bgcolor: c.hover } }}
                  >
                    <MoreHorizRoundedIcon sx={{ fontSize: 20 }} />
                  </ButtonBase>
                ) : null}
              </SortableTab>
            ))}
          </SortableContext>
        </DndContext>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: "6px", flexShrink: 0 }}>
          {hidden.length > 0 ? (
            <ButtonBase
              aria-haspopup="dialog"
              aria-expanded={Boolean(allAnchor)}
              onClick={(event) => setAllAnchor(event.currentTarget)}
              sx={{
                gap: 0.5,
                minHeight: 32,
                px: 1.25,
                borderRadius: "8px",
                fontSize: 13.5,
                fontWeight: allAnchor ? 700 : 600,
                color: allAnchor ? c.accent : isDark ? "#E2D0DC" : "#4A3342",
                bgcolor: allAnchor ? c.softBg : c.surface,
                border: `1px solid ${allAnchor ? c.accent : c.divider}`,
                "&:hover": { bgcolor: c.hover },
              }}
            >
              Flere
              <Box component="span" sx={{ fontWeight: 500, color: c.muted }}>{hidden.length}</Box>
              {allAnchor ? <KeyboardArrowUpRoundedIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />}
            </ButtonBase>
          ) : null}
          <ButtonBase
            aria-label="Legg til dokument"
            aria-haspopup="menu"
            aria-expanded={Boolean(addAnchor)}
            onClick={(event) => setAddAnchor(event.currentTarget)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              color: addAnchor ? "#FFFFFF" : c.accent,
              bgcolor: addAnchor ? (isDark ? "#B83A82" : "#A81F66") : "transparent",
              "&:hover": { bgcolor: addAnchor ? undefined : c.hover },
            }}
          >
            <AddRoundedIcon sx={{ fontSize: 20 }} />
          </ButtonBase>
        </Box>
      </Box>

      {divider}
      <ButtonBase
        role="tab"
        aria-selected={activeKey === ROUTINES_TAB_KEY}
        onClick={() => onSelect(ROUTINES_TAB_KEY)}
        sx={{ ...tabSx(activeKey === ROUTINES_TAB_KEY), flexShrink: 0 }}
      >
        Rutiner
      </ButtonBase>

      {/* Skjult rad som brukes til å måle bredden på fanene. */}
      <Box
        ref={measurerRef}
        aria-hidden
        sx={{ position: "absolute", visibility: "hidden", pointerEvents: "none", height: 0, overflow: "hidden", display: "flex", gap: `${TAB_GAP}px`, top: 0, left: 0 }}
      >
        {candidates.map((item) => (
          <Box
            key={item.id}
            data-measure-id={item.id}
            sx={{ display: "flex", gap: 0.75, px: 0.25, fontSize: { xs: 14, md: 15.5 }, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {renderLabel(item)}
            {/* Plass til ⋯-knappen på den valgte fanen. */}
            {item.hasMenu ? <Box component="span" sx={{ width: 16 }} /> : null}
          </Box>
        ))}
      </Box>

      <Popover
        open={Boolean(allAnchor)}
        anchorEl={allAnchor}
        onClose={closeAll}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 340,
              maxWidth: "calc(100vw - 32px)",
              p: 1.5,
              borderRadius: "14px",
              bgcolor: c.surface,
              border: `1px solid ${c.divider}`,
              boxShadow: isDark ? "0 18px 44px rgba(0,0,0,0.5)" : "0 18px 44px rgba(94,21,71,0.2)",
            },
          },
        }}
        TransitionProps={{ onExited: () => setFilter("") }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.5, height: 42, borderRadius: "10px", border: `1.5px solid ${isDark ? "rgba(160,90,130,0.5)" : "#D79BBB"}` }}>
          <SearchRoundedIcon sx={{ fontSize: 20, color: c.accent }} />
          <InputBase
            autoFocus
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Finn fane …"
            inputProps={{ "aria-label": "Finn fane" }}
            sx={{ flex: 1, fontSize: 14.5, color: c.ink }}
          />
        </Box>
        <Box sx={{ maxHeight: 360, overflowY: "auto", mt: 0.5 }}>
          {shownInBar.length > 0 ? sectionLabel("I fanelinjen") : null}
          {shownInBar.map((item) => menuRow(item, false))}
          {shownInMore.length > 0 ? sectionLabel("Flere") : null}
          {shownInMore.map((item) => menuRow(item, moreIds.includes(item.id)))}
          {shownInBar.length === 0 && shownInMore.length === 0 ? (
            <Typography sx={{ px: 1.25, py: 1.5, fontSize: 14, color: c.muted }}>Ingen faner funnet.</Typography>
          ) : null}
        </Box>
        <Typography sx={{ mt: 1, pt: 1, mx: 1.25, borderTop: `1px solid ${c.line}`, fontSize: 12.5, lineHeight: 1.45, color: c.muted }}>
          Dra i fanene for å endre rekkefølgen. Faner som ikke får plass samles her.
        </Typography>
      </Popover>

      <Menu
        anchorEl={addAnchor}
        open={Boolean(addAnchor)}
        onClose={() => setAddAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 340,
              p: 0.5,
              borderRadius: "14px",
              bgcolor: c.surface,
              border: `1px solid ${c.divider}`,
              boxShadow: isDark ? "0 18px 44px rgba(0,0,0,0.5)" : "0 18px 44px rgba(94,21,71,0.2)",
            },
          },
        }}
      >
        {[
          { icon: <LinkRoundedIcon />, title: "Bygg inn dokument", text: "Lim inn SharePoint-lenke eller embed-kode", action: onAddEmbedded },
          { icon: <DescriptionRoundedIcon />, title: "Tekstdokument", text: "Skriv eller lim inn tekst direkte", action: onAddText },
        ].map((option) => (
          <MenuItem
            key={option.title}
            onClick={() => {
              setAddAnchor(null);
              option.action();
            }}
            sx={{ gap: 1.75, py: 1.25, px: 1.5, borderRadius: "10px", "&:hover": { bgcolor: c.hover } }}
          >
            <Box sx={{ flex: "0 0 40px", height: 40, borderRadius: "10px", bgcolor: c.softBg, color: c.accent, display: "grid", placeItems: "center" }}>
              {option.icon}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: c.ink }}>{option.title}</Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.35, color: c.muted, whiteSpace: "normal" }}>{option.text}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
});

function SortableTab({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id });
  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        display: "flex",
        alignItems: "flex-end",
        flexShrink: 0,
        touchAction: "none",
      }}
    >
      {children}
    </Box>
  );
}

export default FagligTabBar;
