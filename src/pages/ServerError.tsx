import ErrorLayout from "@/components/ErrorLayout";

interface Props {
  error?: Error;
  onReset?: () => void;
}

const ServerError = ({ error, onReset }: Props) => {
  return (
    <ErrorLayout
      code="500"
      emoji="⚙️"
      title="Something went wrong"
      message={
        error?.message
          ? `Genie hit a snag: ${error.message.slice(0, 120)}`
          : "Genie tripped over a wire. Try again in a moment — your progress is safe."
      }
      primaryAction={{
        label: "Try Again",
        onClick: onReset ?? (() => window.location.reload()),
      }}
      secondaryAction={{ label: "Go Home", to: "/" }}
      accent="destructive"
    />
  );
};

export default ServerError;
