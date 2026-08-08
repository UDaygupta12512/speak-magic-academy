import ErrorLayout from "@/components/ErrorLayout";

const Offline = () => (
  <ErrorLayout
    code="📡"
    emoji="🌐"
    title="You're offline"
    message="Genie can't reach the internet right now. Check your connection and try again — your saved progress is still here."
    primaryAction={{
      label: "Retry Connection",
      onClick: () => window.location.reload(),
    }}
    secondaryAction={{ label: "Go Home", to: "/" }}
    accent="muted"
  />
);

export default Offline;
