import { standardTeksterApi } from "../services/standardTeksterApi";

type DeleteStandardTekstParams = {
  id: string;
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedId?: (id: string) => void;
  onError?: (message: string) => void;
};

export async function deleteStandardTekst({
  id,
  setItems,
  setSelectedId,
  onError,
}: DeleteStandardTekstParams) {
  try {
    await standardTeksterApi.remove(id);

    setItems((prev) => prev.filter((it) => it.id !== id));

    // Hvis du sletter den valgte, nullstill valgt (eller velg første i lista senere)
    if (setSelectedId) setSelectedId("");
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ukjent feil ved sletting";
    onError?.(message);
    throw e;
  }
}
