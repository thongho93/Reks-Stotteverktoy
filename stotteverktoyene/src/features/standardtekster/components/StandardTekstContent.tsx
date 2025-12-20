import { Box, Button, Paper, Typography, TextField, Stack, Autocomplete } from "@mui/material";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { StandardTekst } from "../types";
import styles from "../../../styles/standardTekstPage.module.css";

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

  useEffect(() => {
    if (!isEditing) return;

    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  }, [isEditing]);

  return (
    <Paper
      onClick={selected && !isEditing ? onCopy : undefined}
      className={
        selected && !isEditing
          ? `${styles.contentPaper} ${styles.contentPaperCopy}`
          : styles.contentPaper
      }
    >
      {!selected && !loading && (
        <Typography variant="body2" color="text.secondary">
          Velg en standardtekst fra listen.
        </Typography>
      )}

      {selected && (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h2" className={styles.title} sx={{ mb: 1 }}>
              {selected.title}
            </Typography>

            {headerRight ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {headerRight}
              </Box>
            ) : null}
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
                <Box className={styles.editRowBottom} display="flex" gap={1}>
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
                    Endre
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
