import ErrorLayout from "@/components/ErrorLayout";

const Forbidden = () => (
  <ErrorLayout
    code="403"
    emoji="🚫"
    title="Access not allowed"
    message="This area is off-limits for now. Let's head back somewhere fun!"
    primaryAction={{ label: "Back to Home", to: "/" }}
    secondaryAction={{ label: "Open Lessons", to: "/learn" }}
    accent="destructive"
  />
);

export default Forbidden;
