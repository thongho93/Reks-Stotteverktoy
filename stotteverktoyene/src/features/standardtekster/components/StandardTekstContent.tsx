import { Box, Button, Paper, Typography, TextField, Stack, Autocomplete } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { StandardTekst } from "../types";
import styles from "../../../styles/standardTekstPage.module.css";
import { logUsage } from "../../../shared/services/usage";

type Props = {
  selected: StandardTekst | null;
  loading: boolean;
  isAdmin: boolean;

  isEditing: boolean;
  draftTitle: string;
  draftCategory: string;
  draftContent: string;
  saving: boolean;

  onDraftTitleChange: (value: string) => void;
  onDraftCategoryChange: (value: string) => void;
  onDraftContentChange: (value: string) => void;

  onCancel: () => void;
  onSave: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  deleting: boolean;

  onCopy: () => void;

  editorTools?: ReactNode;
  belowContent?: ReactNode;
  headerRight?: ReactNode;

  previewNode: ReactNode;
  categoryOptions?: string[];
};

export default function StandardTekstContent({
  selected,
  loading,
  isAdmin,
  isEditing,
  draftTitle,
  draftCategory,
  draftContent,
  saving,
  onDraftTitleChange,
  onDraftCategoryChange,
  onDraftContentChange,
  onCancel,
  onSave,
  onStartEdit,
  onDelete,
  deleting,
  onCopy,
  editorTools,
  belowContent,
  headerRight,
  previewNode,
  categoryOptions = [],
}: Props) {
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const draftContentPlaceholder =
    "Bruk {{PREPARAT}} der preparatnavn skal settes inn.\n" +
    "Hvis ulike preparatnavn skal vises flere steder i teksten, bruk f.eks. {{PREPARAT}} og {{PREPARAT1}}.\n" +
    "Bruk {{TALL}} der tall skal settes inn.\n\n" +
    "På slutten av teksten: \n" +
    "Vennlig hilsen\n" +
    "XX, farmasøyt\n" +
    "Farmasiet";

  useEffect(() => {
    if (!isEditing) return;

    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  }, [isEditing]);

  const handleCopy = () => {
    // Log copy without storing sensitive text
    logUsage("standardtekst_copy");
    onCopy();
  };

  const lockBeforeEdit = Boolean(selected && !isEditing && selected.title === "Ny standardtekst");

  return (
    <Paper
      sx={{ position: "relative" }}
      onClick={selected && !isEditing && !lockBeforeEdit ? handleCopy : undefined}
      className={
        selected && !isEditing
          ? `${styles.contentPaper} ${styles.contentPaperCopy}`
          : styles.contentPaper
      }
    >
      {!selected && !loading && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minHeight: 360,
            px: 2,
          }}
        >
          <Box
            component="img"
            src="/img/checkthisout.gif"
            alt="Velg standardtekst"
            sx={{
              width: 400,
              maxWidth: "80%",
              mb: 2,
              opacity: 0.95,
            }}
          />

          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, fontSize: 25 }}>
            Velg eller søk etter en standardtekst fra listen.
          </Typography>
        </Box>
      )}

      {selected && (
        <>
          {lockBeforeEdit ? (
            <Box
              className={styles.contentLockOverlay}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          ) : null}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography variant="h2" className={styles.title} sx={{ mb: 1 }}>
              {selected.title}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {!isEditing && !lockBeforeEdit && (
                <Button
                  size="small"
                  variant="text"
                  onClick={handleCopy}
                  sx={{ minWidth: "auto", p: 0.5 }}
                  aria-label="Kopier standardtekst"
                >
                  <ContentCopyIcon fontSize="small" />
                </Button>
              )}

              {headerRight ? headerRight : null}
            </Box>
          </Box>

          {isAdmin && isEditing && (
            <Typography variant="body2" color="text.secondary" className={styles.category}>
              {selected.category}
            </Typography>
          )}

          {selected.updatedAt && (
            <Typography variant="caption" color="text.secondary" className={styles.updatedAt}>
              Sist oppdatert: {selected.updatedAt.toLocaleString("nb-NO")}
            </Typography>
          )}

          {isEditing ? (
            <>
              <Stack spacing={2}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Overskrift"
                    value={draftTitle}
                    onChange={(e) => onDraftTitleChange(e.target.value)}
                    inputRef={titleInputRef}
                    className={styles.editorTitleField}
                    sx={{ flex: 1, mt: 1 }}
                  />

                  {editorTools ? (
                    <Box sx={{ pb: 0.25, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      {editorTools}
                    </Box>
                  ) : null}
                </Box>

                {isAdmin ? (
                  <Autocomplete
                    freeSolo
                    options={categoryOptions}
                    value={draftCategory}
                    onInputChange={(_, value) => onDraftCategoryChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        size="small"
                        label="Kategori"
                        placeholder="F.eks. Vedtak, Restvare, Interaksjon"
                      />
                    )}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : null}

                <TextField
                  fullWidth
                  multiline
                  minRows={10}
                  label="Tekst"
                  value={draftContent}
                  placeholder={isEditing ? draftContentPlaceholder : undefined}
                  onChange={(e) => onDraftContentChange(e.target.value)}
                />

                {belowContent}
              </Stack>

              <Box display="flex" gap={1} className={styles.editorActions}>
                <Button
                  variant="text"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                  }}
                  disabled={saving}
                >
                  Avbryt
                </Button>
                <Button
                  variant="contained"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave();
                  }}
                  disabled={saving}
                >
                  {saving ? "Lagrer..." : "Lagre"}
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body1" component="div" className={styles.body}>
                {previewNode}
              </Typography>
              {belowContent}

              {isAdmin && (
                <Box
                  className={styles.editRowBottom}
                  display="flex"
                  gap={1}
                  sx={{ position: "relative", zIndex: 2 }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    sx={{ color: "#fff" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEdit();
                    }}
                    className={styles.pillButton}
                  >
                    Rediger
                  </Button>

                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className={styles.pillButton}
                    disabled={saving || deleting}
                  >
                    Slett
                  </Button>
                </Box>
              )}
            </>
          )}
        </>
      )}
    </Paper>
  );
}
