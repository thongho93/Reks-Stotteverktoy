import { Box, Button, Paper, Typography, TextField } from "@mui/material";
import type { ReactNode } from "react";
import type { StandardTekst } from "../types";
import styles from "../../../styles/standardTekstPage.module.css";

type Props = {
  selected: StandardTekst | null;
  loading: boolean;
  isAdmin: boolean;

  isEditing: boolean;
  draftTitle: string;
  draftContent: string;
  saving: boolean;

  onDraftTitleChange: (value: string) => void;
  onDraftContentChange: (value: string) => void;

  onCancel: () => void;
  onSave: () => void;
  onStartEdit: () => void;

  onCopy: () => void;

  previewNode: ReactNode;
};

export default function StandardTekstContent({
  selected,
  loading,
  isAdmin,
  isEditing,
  draftTitle,
  draftContent,
  saving,
  onDraftTitleChange,
  onDraftContentChange,
  onCancel,
  onSave,
  onStartEdit,
  onCopy,
  previewNode,
}: Props) {
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
          <Typography variant="h5" className={styles.title}>
            {selected.title}
          </Typography>

          {selected.category && (
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
              <TextField
                fullWidth
                size="small"
                label="Overskrift"
                value={draftTitle}
                onChange={(e) => onDraftTitleChange(e.target.value)}
                className={styles.editorTitleField}
              />
              <TextField
                fullWidth
                multiline
                minRows={10}
                label="Tekst"
                value={draftContent}
                onChange={(e) => onDraftContentChange(e.target.value)}
              />

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

              {isAdmin && (
                <Box className={styles.editRowBottom}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEdit();
                    }}
                    className={styles.pillButton}
                  >
                    Endre
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
