import MsalProviderWrapper from "../../../app/auth/MsalProviderWrapper";
import TeamsChatPage from "./TeamsChatPage";

export default function TeamsChatRoute() {
  return (
    <MsalProviderWrapper>
      <TeamsChatPage />
    </MsalProviderWrapper>
  );
}
