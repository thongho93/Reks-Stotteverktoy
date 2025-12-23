import * as React from "react";
import type { StandardtekstDoc } from "../utils/standardtekster";
import { fetchStandardtekster, linkInteractionToStandardtekst } from "../services/standardtekster";

export function useStandardtekstLinking() {
  const [stdOpen, setStdOpen] = React.useState(false);
  const [stdLoading, setStdLoading] = React.useState(false);
  const [stdError, setStdError] = React.useState<string | null>(null);
  const [standardtekster, setStandardtekster] = React.useState<StandardtekstDoc[]>([]);
  const [chosenStd, setChosenStd] = React.useState<StandardtekstDoc | null>(null);
  const [savingLink, setSavingLink] = React.useState(false);

  const loadStandardtekster = React.useCallback(async () => {
    setStdLoading(true);
    setStdError(null);
    try {
      const rows = await fetchStandardtekster();
      setStandardtekster(rows);
    } catch (e: any) {
      setStdError(e?.message ?? "Kunne ikke hente standardtekster.");
    } finally {
      setStdLoading(false);
    }
  }, []);

  const openLinkDialog = React.useCallback(() => {
    setStdError(null);
    setChosenStd(null);
    setStdOpen(true);
  }, []);

  const closeLinkDialog = React.useCallback(() => {
    setStdOpen(false);
    setStdError(null);
    setChosenStd(null);
  }, []);

  React.useEffect(() => {
    void loadStandardtekster();
  }, [loadStandardtekster]);

  React.useEffect(() => {
    if (!stdOpen) return;
    void loadStandardtekster();
  }, [stdOpen, loadStandardtekster]);

  const saveLink = React.useCallback(
    async (interactionId: string) => {
      if (!chosenStd) return;
      setSavingLink(true);
      setStdError(null);
      try {
        await linkInteractionToStandardtekst({
          standardtekstId: chosenStd.id,
          interactionId,
        });
        setStandardtekster((prev) =>
          prev.map((s) => {
            if (s.id !== chosenStd.id) return s;
            const nextIds = Array.from(
              new Set([...(s.interactionIds ?? []), interactionId])
            );
            return { ...s, interactionIds: nextIds };
          })
        );
        void loadStandardtekster();
        closeLinkDialog();
      } catch (e: any) {
        setStdError(e?.message ?? "Kunne ikke knytte standardtekst.");
      } finally {
        setSavingLink(false);
      }
    },
    [chosenStd, closeLinkDialog, loadStandardtekster]
  );

  return {
    stdOpen,
    stdLoading,
    stdError,
    standardtekster,
    chosenStd,
    savingLink,
    setChosenStd,
    openLinkDialog,
    closeLinkDialog,
    saveLink,
  };
}